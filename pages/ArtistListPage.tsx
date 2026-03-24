import React, { useEffect, useState, useMemo, useRef } from 'react';
import { normalizeArtistData } from '../utils/data';
import { safeSave, safeGet } from '../utils/storage';
import { BottomMenu } from '../components/BottomMenu';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icons } from '../ui/IconButton';
import { PageShell } from '../ui/PageShell';
import { theme } from '../ui/theme';
import { TEXT } from '../ui/constants';
import { Artist, GlobalSettings, Status } from '../domain/types';
import { calcArtistStatus, parseConcertDate } from '../domain/logic';
import { RemoteImage } from '../components/RemoteImage';

type ArtistSortKey = 'manual' | 'status' | 'name' | 'dateNear' | 'dateFar';
type ArtistFilterKey = Status | 'TRACKING' | 'NONE';

const ARTIST_LIST_PREFS_KEY = 'ltjp_artist_list_prefs_v2';

type ArtistPrefs = { sortKey: ArtistSortKey; filters: ArtistFilterKey[] };

const sanitizePrefs = (raw: any): ArtistPrefs => {
  const allowed: ArtistSortKey[] = ['manual', 'status', 'name', 'dateNear', 'dateFar'];
  const sortKey: ArtistSortKey = allowed.includes(raw?.sortKey) ? raw.sortKey : 'manual';
  const filters: ArtistFilterKey[] = Array.isArray(raw?.filters) ? raw.filters : [];
  return { sortKey, filters };
};

const parsePrefs = (): ArtistPrefs => sanitizePrefs(safeGet(ARTIST_LIST_PREFS_KEY, { sortKey: 'manual', filters: [] }));

interface Props {
  artists: Artist[];
  onOpenArtist: (artistId: string) => void;
  onOpenArtistEditor: () => void;
  onRefreshAll: () => void;
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

const ArtistGridCard: React.FC<{ artist: Artist; onClick: () => void }> = ({ artist, onClick }) => {
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
      <div style={{ position: 'relative', paddingTop: '133%', background: '#F3F4F6' }}>
        <RemoteImage
          imageUrl={artist.imageUrl}
          imageId={(artist as any).imageId}
          alt={artist.name}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          fallback={(
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
              <span style={{ fontSize: '40px' }}>👤</span>
            </div>
          )}
        />

        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '35%',
            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.2) 60%, transparent 100%)',
            zIndex: 1,
            pointerEvents: 'none'
          }}
        />

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 14px 12px', zIndex: 2 }}>
          <div
            style={{
              fontWeight: '900',
              fontSize: '15px',
              color: 'white',
              marginBottom: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textShadow: '0 1px 4px rgba(0,0,0,0.4)'
            }}
          >
            {artist.name}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: dotColor,
                boxShadow: `0 0 8px ${dotColor}aa`,
                flexShrink: 0
              }}
            />
            <div
              style={{
                fontSize: '11px',
                fontWeight: '700',
                color: 'rgba(255, 255, 255, 0.85)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}
            >
              {status.main}
              {status.trackSuffix}
              {status.sub && ` / ${TEXT.STATUS[status.sub]}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ArtistListPage: React.FC<Props> = ({
  artists,
  onOpenArtist,
  onOpenArtistEditor,
  onRefreshAll,
  onImportData,
  globalSettings,
  onUpdateGlobalSettings,
  onSetSort,
  onUpdateOrder,
  onAcknowledgeArtistTracking,
  onClearAllTrackingNotices,
  isMenuOpenExternally,
  onMenuClose,
  hideHeader,
  onExport,
}) => {
  const [prefs, setPrefs] = useState<ArtistPrefs>(() => parsePrefs());
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [stagedImportPayload, setStagedImportPayload] = useState<any>(null);
  const [refreshState, setRefreshState] = useState<'idle' | 'refreshing' | 'completed'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    safeSave(ARTIST_LIST_PREFS_KEY, prefs);
    onSetSort(prefs.sortKey === 'status' ? 'status' : 'manual');
  }, [prefs, onSetSort]);

  useEffect(() => {
    const syncPrefs = () => setPrefs(parsePrefs());
    window.addEventListener('ltjp:artistPrefsChanged', syncPrefs as EventListener);
    window.addEventListener('storage', syncPrefs);
    return () => {
      window.removeEventListener('ltjp:artistPrefsChanged', syncPrefs as EventListener);
      window.removeEventListener('storage', syncPrefs);
    };
  }, []);

  const baseManual = useMemo(() => [...(artists || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [artists]);

  const getArtistFilterKey = (artist: Artist): ArtistFilterKey => {
    const st = calcArtistStatus(artist);
    if (st.main === TEXT.ARTIST_STATUS.MAIN_TOURING && st.sub) return st.sub;
    if (st.main === TEXT.ARTIST_STATUS.MAIN_TRACKING) return 'TRACKING';
    return 'NONE';
  };

  const getRelevantConcertDate = (artist: Artist, direction: 'near' | 'far' = 'near'): Date | null => {
    const activeStatusFilters = new Set<Status>((prefs.filters || []).filter((key): key is Status => (
      key === '発売前' || key === '検討中' || key === '抽選中' || key === '参戦予定' || key === '参戦済み' || key === '見送り'
    )));

    const dates: Date[] = [];
    for (const tour of artist.tours || []) {
      for (const concert of tour.concerts || []) {
        if (activeStatusFilters.size > 0 && !activeStatusFilters.has(concert.status)) continue;
        const candidates = [concert.concertAt, concert.date];
        for (const value of candidates) {
          const d = parseConcertDate(value, 'CONCERT');
          if (d) dates.push(d);
        }
      }
    }

    if (dates.length === 0) return null;
    dates.sort((a, b) => a.getTime() - b.getTime());
    return direction === 'far' ? dates[dates.length - 1] : dates[0];
  };

  const compareArtistName = (a: Artist, b: Artist) => {
    return (a.name || '').localeCompare((b.name || ''), 'en', { sensitivity: 'base', numeric: true });
  };

  const displayArtists = useMemo(() => {
    const safeArtists = artists || [];
    const filterSet = new Set<ArtistFilterKey>(prefs.filters || []);
    const filtered = filterSet.size === 0 ? [...safeArtists] : [...safeArtists].filter(a => filterSet.has(getArtistFilterKey(a)));

    switch (prefs.sortKey) {
      case 'manual':
        return [...baseManual].filter(a => filtered.some(f => f.id === a.id));
      case 'status': {
        const rank = (artist: Artist) => {
          const key = getArtistFilterKey(artist);
          const map: Record<string, number> = {
            '発売前': 0,
            '検討中': 1,
            '抽選中': 2,
            '参戦予定': 3,
            '参戦済み': 4,
            '見送り': 5,
            'TRACKING': 6,
            'NONE': 7,
          };
          return map[key] ?? 99;
        };
        return [...filtered].sort((a, b) => {
          const r = rank(a) - rank(b);
          if (r !== 0) return r;
          const da = getRelevantConcertDate(a, 'near')?.getTime() ?? Number.MAX_SAFE_INTEGER;
          const db = getRelevantConcertDate(b, 'near')?.getTime() ?? Number.MAX_SAFE_INTEGER;
          if (da !== db) return da - db;
          return compareArtistName(a, b);
        });
      }
      case 'name':
        return [...filtered].sort((a, b) => compareArtistName(a, b));
      case 'dateNear':
        return [...filtered].sort((a, b) => {
          const da = getRelevantConcertDate(a, 'near')?.getTime() ?? Number.MAX_SAFE_INTEGER;
          const db = getRelevantConcertDate(b, 'near')?.getTime() ?? Number.MAX_SAFE_INTEGER;
          if (da !== db) return da - db;
          return compareArtistName(a, b);
        });
      case 'dateFar':
        return [...filtered].sort((a, b) => {
          const da = getRelevantConcertDate(a, 'far')?.getTime() ?? Number.MIN_SAFE_INTEGER;
          const db = getRelevantConcertDate(b, 'far')?.getTime() ?? Number.MIN_SAFE_INTEGER;
          if (da !== db) return db - da;
          return compareArtistName(a, b);
        });
      default:
        return filtered;
    }
  }, [artists, baseManual, prefs]);

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

  const handleImportClick = () => {
    onMenuClose?.();
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        const rawArtists = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.artists) ? parsed.artists : null);
        if (!rawArtists) {
          alert('無効なデータです（artists が見つかりません）。');
          return;
        }
        if (Array.isArray(rawArtists) && rawArtists.length === 0) {
          const ok = window.confirm('このファイルの artists は 0 件です。\nこのままインポートしますか？');
          if (!ok) return;
        }
        const normalizedArtists: Artist[] = rawArtists.map(normalizeArtistData);
        const payload = Array.isArray(parsed) ? normalizedArtists : { ...parsed, artists: normalizedArtists };
        setStagedImportPayload(payload);
        setIsImportConfirmOpen(true);
      } catch (err) {
        console.error('Import failed:', err);
        alert('読み込みに失敗しました。JSON を確認してください。');
      } finally {
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
            {displayArtists.map((artist, index) => (
              <div key={artist.id} draggable={prefs.sortKey === 'manual' && (prefs.filters?.length ?? 0) === 0} onDragStart={() => handleDragStart(index)} onDragEnter={() => handleDragEnter(index)} onDragEnd={handleDragEnd} onDragOver={(e) => { if (prefs.sortKey === 'manual' && (prefs.filters?.length ?? 0) === 0) e.preventDefault(); }}>
                <ArtistGridCard artist={artist} onClick={() => onOpenArtist(artist.id)} />
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomMenu
        isOpen={!!isMenuOpenExternally}
        onClose={() => onMenuClose?.()}
        onAddArtist={onOpenArtistEditor}
        onExport={onExport || (() => {})}
        onImport={handleImportClick}
        currentSort={prefs.sortKey === 'status' ? 'status' : 'manual'}
        onSetSort={() => {}}
        globalSettings={globalSettings}
        onUpdateGlobalSettings={onUpdateGlobalSettings}
        onClearTrackingNotices={onClearAllTrackingNotices}
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
