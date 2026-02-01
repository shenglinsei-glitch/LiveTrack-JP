import React, { useEffect, useState, useMemo, useRef } from 'react';
import { BottomMenu } from '../components/BottomMenu';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icons } from '../ui/IconButton';
import { PageShell } from '../ui/PageShell';
import { theme } from '../ui/theme';
import { TEXT } from '../ui/constants';
import { Artist, GlobalSettings, Status } from '../domain/types';
import { calcArtistStatus, sortArtistsForDisplay, parseConcertDate } from '../domain/logic';

type ArtistSortKey = 'manual' | 'status' | 'name' | 'nextDate';
type ArtistFilterKey = Status | 'TRACKING' | 'NONE';

const ARTIST_LIST_PREFS_KEY = 'ltjp_artist_list_prefs_v2';

const parsePrefs = (): { sortKey: ArtistSortKey; sortDir: 'asc' | 'desc'; filters: ArtistFilterKey[] } => {
  try {
    const raw = localStorage.getItem(ARTIST_LIST_PREFS_KEY);
    if (!raw) return { sortKey: 'manual', sortDir: 'asc', filters: [] };
    const json = JSON.parse(raw);
    const sortKey: ArtistSortKey = json?.sortKey ?? 'manual';
    const sortDir: 'asc' | 'desc' = json?.sortDir === 'desc' ? 'desc' : 'asc';
    const filters: ArtistFilterKey[] = Array.isArray(json?.filters) ? json.filters : [];
    return { sortKey, sortDir, filters };
  } catch {
    return { sortKey: 'manual', sortDir: 'asc', filters: [] };
  }
};

interface Props {
  artists: Artist[];
  onOpenArtist: (artistId: string) => void;
  onOpenArtistEditor: () => void;
  onRefreshAll: () => void;
  // NOTE: 为兼容旧/新导入格式（Artist[] 或 { artists: ... }），这里透传 any。
  onImportData: (data: any) => void;
  globalSettings: GlobalSettings;
  onUpdateGlobalSettings: (settings: GlobalSettings) => void;
  sortMode: 'manual' | 'status';
  onSetSort: (mode: 'manual' | 'status') => void;
  onUpdateOrder: (newArtists: Artist[]) => void;
  onAcknowledgeArtistTracking: (artistId: string) => void;
  onClearAllTrackingNotices: () => void;
  isMenuOpenExternally?: boolean;
  onMenuClose?: () => void;
  hideHeader?: boolean;
  onExport?: () => void;
}

// -------------------------------------------------------------------------
// 样式 B：网格卡片 (状态优先模式)
// -------------------------------------------------------------------------
const ArtistGridCard: React.FC<{ 
  artist: Artist; 
  onClick: () => void; 
}> = ({ artist, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const status = calcArtistStatus(artist);
  
  const dotColor = useMemo(() => {
    if (status.main === TEXT.ARTIST_STATUS.MAIN_TOURING && status.sub) {
      return theme.colors.status[status.sub as Status] || theme.colors.primary;
    }
    if (status.main === TEXT.ARTIST_STATUS.MAIN_TRACKING) {
      return '#00E0FF';
    }
    return theme.colors.textLabel;
  }, [status]);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'white',
        borderRadius: '24px',
        border: '1px solid rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        boxShadow: isHovered ? '0 12px 24px -8px rgba(0,0,0,0.12)' : '0 4px 12px -2px rgba(0,0,0,0.03)',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* 核心视觉：图片容器，设定 3:4 的纵横比 */}
      <div style={{ position: 'relative', paddingTop: '133%', background: '#F3F4F6' }}>
        {artist.imageUrl ? (
          <img 
            src={artist.imageUrl} 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover' 
            }} 
            alt={artist.name}
          />
        ) : (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
            <span style={{ fontSize: '40px' }}>👤</span>
          </div>
        )}

        {/* 视觉过渡层：参照展览页，使用弱化的底部渐变，不使用模糊，高度约 25% */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '35%', 
          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.2) 60%, transparent 100%)',
          zIndex: 1,
          pointerEvents: 'none'
        }} />

        {/* 内容信息：自然浮动在渐变层之上 */}
        <div style={{ 
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 14px 12px', 
          zIndex: 2 
        }}>
          <div style={{
            fontWeight: '900',
            fontSize: '15px',
            color: 'white',
            marginBottom: '2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textShadow: '0 1px 4px rgba(0,0,0,0.4)'
          }}>
            {artist.name}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: dotColor,
              boxShadow: `0 0 8px ${dotColor}aa`,
              flexShrink: 0
            }} />
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              color: 'rgba(255, 255, 255, 0.85)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}>
              {status.main}{status.trackSuffix}
              {status.sub && ` / ${TEXT.STATUS[status.sub]}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------
// 样式 A：列表卡片 (手顺/列表模式)
// -------------------------------------------------------------------------
const ArtistRowCard: React.FC<{ 
  artist: Artist; 
  onClick: () => void; 
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnter?: () => void;
  onDragEnd?: () => void;
  noticeKeywords?: string[];
  onAcknowledgeNotice?: () => void;
}> = ({ artist, onClick, draggable, onDragStart, onDragEnter, onDragEnd, noticeKeywords, onAcknowledgeNotice }) => {
  const [isHovered, setIsHovered] = useState(false);
  const status = calcArtistStatus(artist);
  
  const dotColor = useMemo(() => {
    if (status.main === TEXT.ARTIST_STATUS.MAIN_TOURING && status.sub) {
      return theme.colors.status[status.sub as Status] || theme.colors.primary;
    }
    if (status.main === TEXT.ARTIST_STATUS.MAIN_TRACKING) {
      return '#00E0FF';
    }
    return theme.colors.textLabel;
  }, [status]);

  return (
    <div
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => draggable && e.preventDefault()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'white',
        borderRadius: theme.radius.card,
        border: '1px solid rgba(0, 0, 0, 0.04)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        cursor: draggable ? 'grabbing' : 'pointer',
        boxShadow: isHovered ? '0 8px 16px -4px rgba(0, 0, 0, 0.05)' : '0 2px 8px -1px rgba(0, 0, 0, 0.02)',
        transform: isHovered ? 'scale(1.01)' : 'scale(1)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{
        width: '56px', height: '56px', borderRadius: '50%', background: '#F3F4F6', flexShrink: 0,
        border: '2px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {artist.imageUrl ? <img src={artist.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '20px', opacity: 0.2 }}>👤</span>}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '800', fontSize: '17px', color: theme.colors.text, marginBottom: '2px' }}>{artist.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: dotColor, boxShadow: `0 0 8px ${dotColor}99` }} />
          <div style={{ fontSize: '11px', fontWeight: '600', color: theme.colors.textSecondary }}>
            {status.main}{status.trackSuffix}{status.sub && <span style={{ color: theme.colors.textWeak, marginLeft: '6px' }}>/ {TEXT.STATUS[status.sub]}</span>}
          </div>
        </div>
      </div>

      {draggable && (
        <div style={{ color: theme.colors.textLabel }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="9" x2="16" y2="9"></line><line x1="8" y1="15" x2="16" y2="15"></line></svg>
        </div>
      )}
    </div>
  );
};

export const ArtistListPage: React.FC<Props> = ({ 
  artists, onOpenArtist, onOpenArtistEditor, onRefreshAll, onImportData,
  globalSettings, onUpdateGlobalSettings, sortMode, onSetSort, onUpdateOrder,
  onAcknowledgeArtistTracking, onClearAllTrackingNotices, isMenuOpenExternally,
  onMenuClose, hideHeader, onExport
}) => {
  // NOTE: Artist list sorting/filtering is intentionally independent from Concert list.
  // We keep Props.sortMode/onSetSort for backward compatibility, but the page uses its own local prefs.
  const [prefs, setPrefs] = useState(() => parsePrefs());
  const [isPrefsOpen, setIsPrefsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(ARTIST_LIST_PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }, [prefs]);

  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  // 兼容：既可能只导入 artists 数组，也可能导入完整备份对象
  const [stagedImportPayload, setStagedImportPayload] = useState<any>(null);
  const [refreshState, setRefreshState] = useState<'idle' | 'refreshing' | 'completed'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const baseManual = useMemo(() => {
    return [...artists].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [artists]);

  const getArtistFilterKey = (artist: Artist): ArtistFilterKey => {
    const st = calcArtistStatus(artist);
    if (st.main === TEXT.ARTIST_STATUS.MAIN_TOURING && st.sub) return st.sub;
    if (st.main === TEXT.ARTIST_STATUS.MAIN_TRACKING) return 'TRACKING';
    return 'NONE';
  };

  const displayArtists = useMemo(() => {
    const filterSet = new Set<ArtistFilterKey>(prefs.filters || []);
    const filtered = filterSet.size === 0 ? [...artists] : [...artists].filter(a => filterSet.has(getArtistFilterKey(a)));

    const dir = prefs.sortDir === 'desc' ? -1 : 1;

    const getNextDate = (artist: Artist): Date | null => {
      const dates: Date[] = [];
      for (const tour of artist.tours || []) {
        for (const c of tour.concerts || []) {
          const raw = c.concertAt || c.date;
          const d = parseConcertDate(raw, 'CONCERT');
          if (d) dates.push(d);
        }
      }
      if (dates.length === 0) return null;
      dates.sort((a, b) => a.getTime() - b.getTime());
      return dates[0];
    };

    const sortKey = prefs.sortKey;
    if (sortKey === 'manual') {
      // Keep manual order even when filtered
      const manualSorted = [...baseManual].filter(a => filtered.some(f => f.id === a.id));
      return manualSorted;
    }

    if (sortKey === 'status') {
      return sortArtistsForDisplay(filtered as Artist[], 'status');
    }

    if (sortKey === 'name') {
      return [...filtered].sort((a, b) => dir * a.name.localeCompare(b.name));
    }

    // nextDate
    return [...filtered].sort((a, b) => {
      const da = getNextDate(a);
      const db = getNextDate(b);
      if (da && !db) return -1;
      if (!da && db) return 1;
      if (da && db) {
        const diff = da.getTime() - db.getTime();
        if (diff !== 0) return dir * diff;
      }
      return a.name.localeCompare(b.name);
    });
  }, [artists, baseManual, prefs]);

  const getNoticeKeywords = (artist: Artist): string[] => {
    const keywords = new Set<string>();
    for (const link of artist.links || []) {
      if (!link.matchedKeywords || link.matchedKeywords.length === 0) continue;
      if (!link.lastHitAt) continue;
      const ack = link.acknowledgedAt;
      if (ack && new Date(ack).getTime() >= new Date(link.lastHitAt).getTime()) continue;
      for (const k of link.matchedKeywords) keywords.add(k);
    }
    return Array.from(keywords);
  };

  const handleRefresh = () => {
    if (refreshState !== 'idle') return;
    setRefreshState('refreshing');
    onRefreshAll();
    setTimeout(() => {
      setRefreshState('completed');
      setTimeout(() => setRefreshState('idle'), 1200);
    }, 800);
  };

  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOverItem.current = index; };
  const handleDragEnd = () => {
    const canDrag = prefs.sortKey === 'manual' && (prefs.filters?.length ?? 0) === 0;
    if (!canDrag) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const newList = [...displayArtists];
      const draggedItemContent = newList[dragItem.current];
      newList.splice(dragItem.current, 1);
      newList.splice(dragOverItem.current, 0, draggedItemContent);
      onUpdateOrder(newList);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleImportClick = () => { onMenuClose?.(); fileInputRef.current?.click(); };
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);

        // Support both formats:
        // 1) Full backup object: { schemaVersion, artists: [...], settings?, exportedAt? }
        // 2) Legacy: artists array only: [...]
        const rawArtists = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.artists) ? parsed.artists : null);

        if (!rawArtists) {
          alert('無効なデータです（artists が見つかりません）。');
          return;
        }

        // If user picked an empty backup, make it obvious (otherwise it looks like import did nothing).
        if (Array.isArray(rawArtists) && rawArtists.length === 0) {
          const ok = window.confirm('このファイルの artists は 0 件です。\nこのままインポートしますか？');
          if (!ok) return;
        }

        // Normalize ids to string and ensure performances exist.
        const normalizedArtists: Artist[] = rawArtists.map((a: any) => ({
          ...a,
          id: String(a.id),
          concerts: Array.isArray(a.concerts)
            ? a.concerts.map((c: any) => ({
                ...c,
                id: String(c.id),
                performances: Array.isArray(c.performances)
                  ? c.performances.map((p: any) => ({ ...p, id: String(p.id) }))
                  : [],
              }))
            : [],
        }));

        // 如果是完整备份对象，则保留其他字段（exhibitions/settings/...），仅替换 artists 为规范化版本
        const payload = Array.isArray(parsed)
          ? normalizedArtists
          : { ...parsed, artists: normalizedArtists };

        setStagedImportPayload(payload);
        setIsImportConfirmOpen(true);
      } catch (err) {
        console.error('Import failed:', err);
        alert('読み込みに失敗しました。JSON を確認してください。');
      } finally {
        // Reset input value so selecting the same file again still triggers onChange.
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <PageShell
      header={hideHeader ? null : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#111827', margin: 0 }}>
            {TEXT.GLOBAL.APP_TITLE} <span style={{ color: '#53BEE8' }}>JP</span>
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsPrefsOpen(v => !v)}
                style={{
                  padding: '12px',
                  borderRadius: '9999px',
                  background: 'white',
                  border: '1px solid #F3F4F6',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="並び替え・絞り込み"
              >
                {/* sliders icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="21" x2="4" y2="14" />
                  <line x1="4" y1="10" x2="4" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12" y2="3" />
                  <line x1="20" y1="21" x2="20" y2="16" />
                  <line x1="20" y1="12" x2="20" y2="3" />
                  <line x1="1" y1="14" x2="7" y2="14" />
                  <line x1="9" y1="8" x2="15" y2="8" />
                  <line x1="17" y1="16" x2="23" y2="16" />
                </svg>
              </button>

              {isPrefsOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '52px',
                    zIndex: 60,
                    width: '280px',
                    background: 'rgba(255,255,255,0.92)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    borderRadius: '18px',
                    boxShadow: '0 18px 40px -18px rgba(0,0,0,0.35)',
                    backdropFilter: 'blur(10px)',
                    padding: '12px',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 900, color: theme.colors.textLabel, marginBottom: '8px' }}>並び替え</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    {([
                      { key: 'manual', label: '手順' },
                      { key: 'status', label: '状態' },
                      { key: 'nextDate', label: '最近日' },
                      { key: 'name', label: '名前' },
                    ] as { key: ArtistSortKey; label: string }[]).map(opt => {
                      const active = prefs.sortKey === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => setPrefs(p => ({ ...p, sortKey: opt.key }))}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '9999px',
                            border: active ? '1px solid rgba(83,190,232,0.65)' : '1px solid rgba(0,0,0,0.08)',
                            background: active ? 'rgba(83,190,232,0.14)' : 'rgba(255,255,255,0.7)',
                            color: active ? '#0F172A' : theme.colors.textSecondary,
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                    {(['name', 'nextDate'] as ArtistSortKey[]).includes(prefs.sortKey) && (
                      <button
                        onClick={() => setPrefs(p => ({ ...p, sortDir: p.sortDir === 'asc' ? 'desc' : 'asc' }))}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '9999px',
                          border: '1px solid rgba(0,0,0,0.08)',
                          background: 'rgba(255,255,255,0.7)',
                          color: theme.colors.textSecondary,
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                        title="昇順/降順"
                      >
                        {prefs.sortDir === 'asc' ? '↑' : '↓'}
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 900, color: theme.colors.textLabel }}>絞り込み</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setPrefs(p => ({ ...p, filters: [] }))}
                        style={{ fontSize: '12px', fontWeight: 800, color: theme.colors.textSecondary, background: 'transparent', border: 'none', cursor: 'pointer' }}
                      >
                        全て
                      </button>
                      <button
                        onClick={() => setPrefs(p => ({ ...p, filters: ['発売前', '検討中', '抽選中', '参戦予定', 'TRACKING'] }))}
                        style={{ fontSize: '12px', fontWeight: 800, color: theme.colors.textSecondary, background: 'transparent', border: 'none', cursor: 'pointer' }}
                      >
                        重要
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {([
                      '発売前',
                      '検討中',
                      '抽選中',
                      '参戦予定',
                      '参戦済み',
                      '見送',
                    ] as Status[]).map(s => {
                      const active = prefs.filters?.includes(s as any);
                      return (
                        <button
                          key={s}
                          onClick={() => setPrefs(p => {
                            const next = new Set<ArtistFilterKey>(p.filters || []);
                            if (next.has(s)) next.delete(s);
                            else next.add(s);
                            return { ...p, filters: Array.from(next) };
                          })}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '9999px',
                            border: active ? '1px solid rgba(83,190,232,0.65)' : '1px solid rgba(0,0,0,0.08)',
                            background: active ? 'rgba(83,190,232,0.14)' : 'rgba(255,255,255,0.7)',
                            color: active ? '#0F172A' : theme.colors.textSecondary,
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          {TEXT.STATUS[s]}
                        </button>
                      );
                    })}
                    {([
                      { key: 'TRACKING', label: '追跡中' },
                      { key: 'NONE', label: '未整理' },
                    ] as { key: ArtistFilterKey; label: string }[]).map(opt => {
                      const active = prefs.filters?.includes(opt.key);
                      return (
                        <button
                          key={opt.key}
                          onClick={() => setPrefs(p => {
                            const next = new Set<ArtistFilterKey>(p.filters || []);
                            if (next.has(opt.key)) next.delete(opt.key);
                            else next.add(opt.key);
                            return { ...p, filters: Array.from(next) };
                          })}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '9999px',
                            border: active ? '1px solid rgba(83,190,232,0.65)' : '1px solid rgba(0,0,0,0.08)',
                            background: active ? 'rgba(83,190,232,0.14)' : 'rgba(255,255,255,0.7)',
                            color: active ? '#0F172A' : theme.colors.textSecondary,
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: '10px', fontSize: '11px', color: theme.colors.textWeak }}>
                    ※ 手順のドラッグ並び替えは「全て」かつ「手順」の時のみ有効
                  </div>
                </div>
              )}
            </div>

            <button onClick={handleRefresh} disabled={refreshState !== 'idle'} style={{ padding: '12px', borderRadius: '9999px', background: 'white', border: '1px solid #F3F4F6', color: refreshState === 'completed' ? theme.colors.success : '#9CA3AF', cursor: refreshState === 'idle' ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {refreshState === 'completed' ? <Icons.Check /> : <Icons.Refresh className={refreshState === 'refreshing' ? 'animate-spin' : ''} />}
            </button>
          </div>
        </div>
      )}
      disablePadding={hideHeader}
    >
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={handleFileChange} />

      <div style={{ paddingBottom: '120px' }}>
        {displayArtists.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: theme.colors.textWeak, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
            <div style={{ fontSize: '48px', opacity: 0.5 }}>👤</div>
            <div style={{ fontSize: '15px', fontWeight: '600' }}>{TEXT.GLOBAL.APP_SUBTITLE}</div>
            <button onClick={onOpenArtistEditor} style={{ padding: '12px 24px', borderRadius: '12px', background: theme.colors.primary, color: 'white', border: 'none', fontWeight: 'bold' }}>＋ {TEXT.BUTTONS.ADD}</button>
          </div>
        ) : (
          <div style={
            prefs.sortKey === 'status' 
              ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }
              : { display: 'flex', flexDirection: 'column', gap: '12px' }
          }>
            {displayArtists.map((artist, index) => (
              prefs.sortKey === 'status' ? (
                <ArtistGridCard key={artist.id} artist={artist} onClick={() => onOpenArtist(artist.id)} />
              ) : (
                <ArtistRowCard 
                  key={artist.id} artist={artist} onClick={() => onOpenArtist(artist.id)} 
                  draggable={prefs.sortKey === 'manual' && (prefs.filters?.length ?? 0) === 0}
                  onDragStart={() => handleDragStart(index)} onDragEnter={() => handleDragEnter(index)} onDragEnd={handleDragEnd}
                  noticeKeywords={getNoticeKeywords(artist)} onAcknowledgeNotice={() => onAcknowledgeArtistTracking(artist.id)}
                />
              )
            ))}
          </div>
        )}
      </div>

      <BottomMenu 
        isOpen={!!isMenuOpenExternally} onClose={() => onMenuClose?.()} onAddArtist={onOpenArtistEditor}
        onExport={onExport || (() => {})}
        onImport={handleImportClick}
        currentSort={prefs.sortKey === 'manual' ? 'manual' : 'status'}
        onSetSort={(mode) => setPrefs(p => ({ ...p, sortKey: mode }))}
        globalSettings={globalSettings} onUpdateGlobalSettings={onUpdateGlobalSettings} onClearTrackingNotices={onClearAllTrackingNotices}
      />
      <ConfirmDialog
        isOpen={isImportConfirmOpen}
        title={TEXT.ALERTS.IMPORT_CONFIRM_TITLE}
        message={TEXT.ALERTS.IMPORT_CONFIRM_MSG}
        confirmLabel={TEXT.BUTTONS.IMPORT}
        isDestructive
        onClose={() => { setIsImportConfirmOpen(false); setStagedImportPayload(null); }}
        onConfirm={() => {
          if (stagedImportPayload) onImportData(stagedImportPayload);
          setIsImportConfirmOpen(false);
        }}
      />
    </PageShell>
  );
};
