import React, { useMemo, useRef, useState } from 'react';
import { theme } from '../ui/theme';
import { GlassCard } from '../ui/GlassCard';
import { Artist, Concert, Exhibition, StatusItem } from '../domain/types';
import { generateStatusItems } from '../utils/statusGenerator';
import { TopCapsuleNav } from '../components/TopCapsuleNav';
import { getDueAction, parseConcertDate } from '../domain/logic';
import { TEXT } from '../ui/constants';
import { ConcertStatusCard } from '../components/ConcertStatusCard';
import { RemoteImage } from '../components/RemoteImage';

interface Props {
  artists: Artist[];
  exhibitions: Exhibition[];
  onOpenConcert: (aid: string, tid: string, cid: string) => void;
  onOpenConcertEditor: (aid: string, tid: string) => void;
  onUpdateConcert: (aid: string, tid: string, cid: string, updates: Partial<Concert>) => void;
  onOpenExhibitionDetail: (id: string) => void;
  onUpdateExhibitionStatus: (id: string, updates: Partial<Exhibition>) => void;
  onExport: () => void;
  onImport: (data: any) => void;
}

type StatusTab = 'ALL' | 'CONCERT' | 'EXHIBITION';
type SectionKey = 'all' | 'pending' | 'decided' | 'history';
type SortKey = 'date_asc' | 'date_desc' | 'type' | 'status';

type ExhibitionActionMode = 'reserve' | 'visit';

const formatCompactDate = (dateStr: string) => {
  if (!dateStr || dateStr === TEXT.GLOBAL.TBD) return '';
  const normalized = dateStr.replace('T', ' ');
  const parts = normalized.split(' ')[0].split('-');
  if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
  return normalized;
};

const formatTimeLabel = (dateStr: string) => {
  if (!dateStr) return '';
  const normalized = dateStr.replace('T', ' ');
  return normalized.split(' ')[1] || '';
};

const toDateTimeLocal = (value?: string) => (value ? value.replace(' ', 'T').slice(0, 16) : '');
const fromDateTimeLocal = (value: string) => value.replace('T', ' ');

const getSectionLabel = (key: SectionKey) => {
  switch (key) {
    case 'pending':
      return '未処理';
    case 'decided':
      return '決定済';
    case 'history':
      return '履歴';
    default:
      return '全部';
  }
};

const MENU_WIDTH = 300;

const badgeBgFromColor = (color: string) => {
  const normalized = color.toLowerCase();
  if (normalized === theme.colors.status['発売前'].toLowerCase()) return theme.colors.badges.processing.bg;
  if (normalized === theme.colors.status['検討中'].toLowerCase()) return theme.colors.badges.considering.bg;
  if (normalized === theme.colors.status['抽選中'].toLowerCase()) return theme.colors.badges.lottery.bg;
  if (normalized === theme.colors.status['参戦予定'].toLowerCase()) return theme.colors.badges.confirmed.bg;
  if (normalized === theme.colors.status['参戦済み'].toLowerCase()) return theme.colors.badges.completed.bg;
  if (normalized === theme.colors.status['見送'].toLowerCase()) return theme.colors.badges.skipped.bg;
  return 'rgba(83, 190, 232, 0.12)';
};

const getExhibitionStatusTone = (status: string) => {
  switch (status) {
    case 'PLANNED':
      return { color: theme.colors.status['参戦予定'], bg: theme.colors.badges.confirmed.bg, label: '開催中' };
    case 'RESERVED':
      return { color: theme.colors.status['抽選中'], bg: theme.colors.badges.lottery.bg, label: '予約済' };
    case 'VISITED':
      return { color: theme.colors.status['参戦済み'], bg: theme.colors.badges.completed.bg, label: '訪問済' };
    case 'SKIPPED':
      return { color: theme.colors.status['見送'], bg: theme.colors.badges.skipped.bg, label: '見送る' };
    case 'ENDED':
      return { color: theme.colors.textWeak, bg: 'rgba(0,0,0,0.04)', label: '終了' };
    default:
      return { color: theme.colors.primary, bg: 'rgba(83, 190, 232, 0.12)', label: '開催中' };
  }
};

const getExhibitionMeta = (item: StatusItem) => {
  if (item.status === 'RESERVED') {
    return {
      type: '訪問予定',
      value: item.raw.visitedAt || item.date || '',
    };
  }

  if (item.status === 'VISITED') {
    return {
      type: '訪問日時',
      value: item.raw.visitedAt || item.date || '',
    };
  }

  return {
    type: '会期',
    value: item.raw.endDate ? `${formatCompactDate(item.raw.startDate)} - ${formatCompactDate(item.raw.endDate)}` : formatCompactDate(item.date),
  };
};

export const StatusPage: React.FC<Props> = ({
  artists,
  exhibitions,
  onOpenConcert,
  onOpenConcertEditor,
  onUpdateConcert,
  onOpenExhibitionDetail,
  onUpdateExhibitionStatus,
  onExport,
  onImport,
}) => {
  const [activeTab, setActiveTab] = useState<StatusTab>('ALL');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sectionFilter, setSectionFilter] = useState<SectionKey>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date_asc');
  const [exhibitionAction, setExhibitionAction] = useState<{ id: string; mode: ExhibitionActionMode; value: string; title: string } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const allItems = useMemo(() => generateStatusItems(artists, exhibitions) || [], [artists, exhibitions]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'ALL') return allItems;
    if (activeTab === 'CONCERT') return allItems.filter((item) => item.type === 'concert');
    return allItems.filter((item) => item.type === 'exhibition');
  }, [allItems, activeTab]);

  const sections = useMemo(() => {
    const pending: StatusItem[] = [];
    const decided: StatusItem[] = [];
    const history: StatusItem[] = [];
    const now = new Date();

    filteredItems.forEach((item) => {
      if (item.type === 'exhibition') {
        if (item.status === 'PLANNED') pending.push(item);
        else if (item.status === 'RESERVED') decided.push(item);
        else history.push(item);
        return;
      }

      const concertDate = parseConcertDate(item.date, 'CONCERT');
      const isPassed = concertDate && now >= concertDate;
      const due = getDueAction(item.raw, now);

      if (
  item.status === '参戦済み' ||
  item.status === '落選' ||
  item.status === '見送'
) {
  history.push(item);
}
      else if (due || ['発売前', '検討中', '抽選中'].includes(item.status)) {
  pending.push(item);
}
      else {
  decided.push(item);
}
    });

    return { pending, decided, history };
  }, [filteredItems]);

  const sortItems = (items: StatusItem[]) => {
    const list = [...(items || [])];
    return list.sort((a, b) => {
      const da = parseConcertDate(a.date, a.type === 'concert' ? 'CONCERT' : 'EXHIBITION');
      const db = parseConcertDate(b.date, b.type === 'concert' ? 'CONCERT' : 'EXHIBITION');
      const ta = da ? da.getTime() : Number.MAX_SAFE_INTEGER;
      const tb = db ? db.getTime() : Number.MAX_SAFE_INTEGER;
      if (sortKey === 'date_desc') return tb - ta;
      if (sortKey === 'type') {
        if (a.type !== b.type) return a.type === 'concert' ? -1 : 1;
        return ta - tb;
      }
      if (sortKey === 'status') {
        const sa = `${a.type}-${a.status}`;
        const sb = `${b.type}-${b.status}`;
        return sa.localeCompare(sb) || ta - tb;
      }
      return ta - tb;
    });
  };

  const visibleSections = {
    pending: sectionFilter === 'all' || sectionFilter === 'pending' ? sortItems(sections.pending) : [],
    decided: sectionFilter === 'all' || sectionFilter === 'decided' ? sortItems(sections.decided) : [],
    history: sectionFilter === 'all' || sectionFilter === 'history' ? sortItems(sections.history) : [],
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        onImport(data);
        setIsMenuOpen(false);
      } catch (err) {
        console.error('Import parse failed:', err);
        window.alert('読み込みに失敗しました。JSONファイルを確認してください。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const openExhibitionDateModal = (item: StatusItem, mode: ExhibitionActionMode) => {
    const baseValue = item.raw.visitedAt ? toDateTimeLocal(item.raw.visitedAt) : '';
    setExhibitionAction({ id: item.parentId, mode, value: baseValue, title: item.title });
  };

  const saveExhibitionDateAction = () => {
    if (!exhibitionAction || !exhibitionAction.value) {
      window.alert('日時を入力してください。');
      return;
    }
    onUpdateExhibitionStatus(exhibitionAction.id, {
      status: exhibitionAction.mode === 'reserve' ? 'RESERVED' : 'VISITED',
      visitedAt: fromDateTimeLocal(exhibitionAction.value),
    });
    setExhibitionAction(null);
  };

  const renderExhibitionActions = (item: StatusItem) => {
    if (item.status === 'PLANNED') {
      return (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', padding: '0 4px' }}>
          <button onClick={(e) => { e.stopPropagation(); openExhibitionDateModal(item, 'reserve'); }} style={actionPrimaryBtn}>予約済</button>
          <button onClick={(e) => { e.stopPropagation(); openExhibitionDateModal(item, 'visit'); }} style={actionGhostBtn}>訪問済</button>
          <button onClick={(e) => { e.stopPropagation(); onUpdateExhibitionStatus(item.parentId, { status: 'SKIPPED', visitedAt: undefined }); }} style={actionGhostBtn}>見送る</button>
        </div>
      );
    }

    if (item.status === 'RESERVED') {
      const reservedAt = item.raw.visitedAt ? parseConcertDate(item.raw.visitedAt, 'NORMAL') : null;
      const canActOnReserved = !reservedAt || new Date() >= reservedAt;
      if (!canActOnReserved) return null;
      return (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', padding: '0 4px' }}>
          <button onClick={(e) => { e.stopPropagation(); onUpdateExhibitionStatus(item.parentId, { status: 'VISITED' }); }} style={actionPrimaryBtn}>訪問済</button>
          <button onClick={(e) => { e.stopPropagation(); onUpdateExhibitionStatus(item.parentId, { status: 'SKIPPED', visitedAt: undefined }); }} style={actionGhostBtn}>見送る</button>
        </div>
      );
    }

    return null;
  };

  const renderItem = (item: StatusItem) => {
    if (item.type === 'concert') {
      return (
        <ConcertStatusCard
          key={item.id}
          concert={item.raw}
          onClick={() => onOpenConcert(item.raw.artistId, item.raw.tourId, item.raw.concertId)}
          onUpdate={onUpdateConcert}
          onOpenEditor={() => onOpenConcertEditor(item.raw.artistId, item.raw.tourId)}
        />
      );
    }

    const statusTone = getExhibitionStatusTone(item.status);
    const imageId = Array.isArray(item.raw.imageIds) && item.raw.imageIds.length > 0 ? item.raw.imageIds[0] : undefined;
    const meta = getExhibitionMeta(item);

    return (
      <div key={item.id}>
        <div
          onClick={() => onOpenExhibitionDetail(item.parentId)}
          style={{
            background: 'white',
            borderRadius: '24px',
            border: '1px solid rgba(0, 0, 0, 0.04)',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            transition: 'all 0.2s',
            marginBottom: item.status === 'PLANNED' || item.status === 'RESERVED' ? '4px' : '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#F3F4F6',
                flexShrink: 0,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RemoteImage
                imageUrl={item.raw.imageUrl}
                imageId={imageId}
                alt={item.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                fallback={<span style={{ fontSize: '18px', opacity: 0.2 }}>🖼️</span>}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ fontSize: '12px', color: theme.colors.textSecondary, fontWeight: '700', minWidth: 0 }}>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.raw.venueName || item.raw.venue || '展覧会'}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    color: statusTone.color,
                    background: statusTone.bg || badgeBgFromColor(statusTone.color),
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(0,0,0,0.06)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {item.displayStatus || statusTone.label}
                </div>
              </div>

              <div
                style={{
                  fontWeight: '800',
                  fontSize: '15px',
                  color: theme.colors.text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: 2,
                }}
              >
                {item.title}
              </div>

              <div
                style={{
                  fontSize: '12px',
                  color: theme.colors.textSecondary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: 2,
                }}
                title={`${meta.type}：${meta.value}`}
              >
                <span style={{ fontWeight: '800', color: theme.colors.textMain }}>{meta.type}：</span> {meta.value}
              </div>
            </div>
          </div>
        </div>

        {renderExhibitionActions(item)}
      </div>
    );
  };

  const renderSection = (title: string, items: StatusItem[]) => {
    if (!items.length) return null;
    return (
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '900', color: theme.colors.textSecondary, marginBottom: '12px', paddingLeft: '4px', letterSpacing: '0.02em' }}>
          {title} ({items.length})
        </h3>
        {items.map(renderItem)}
      </div>
    );
  };

  const tabs = [
    { key: 'ALL', label: '全部' },
    { key: 'CONCERT', label: '公演' },
    { key: 'EXHIBITION', label: '展覧' },
  ];

  const leftControl = (
    <button
      onClick={() => setIsMenuOpen((v) => !v)}
      style={{ width: '44px', height: '44px', borderRadius: '9999px', background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(15, 23, 42, 0.06)', boxShadow: '0 6px 18px rgba(15, 23, 42, 0.06)', color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      aria-label="status tools"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    </button>
  );

  return (
    <div style={{ paddingTop: 'calc(12px + env(safe-area-inset-top) + 44px + 16px)', minHeight: '100vh', background: theme.colors.background }}>
      <TopCapsuleNav activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as StatusTab)} onRefresh={() => {}} tabs={tabs} leftControl={leftControl} rightControl={<div />} />

      {isMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120 }} onClick={() => setIsMenuOpen(false)}>
          <GlassCard
            className="fade-in"
            style={{
              position: 'fixed',
              top: 'calc(12px + env(safe-area-inset-top) + 52px)',
              left: '16px',
              width: `${MENU_WIDTH}px`,
              maxWidth: 'calc(100vw - 32px)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} onClick={(e) => e.stopPropagation()}>
              <section>
                <div style={sectionTitle}>並び替え</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <MenuItem label="日付近い順" active={sortKey === 'date_asc'} onClick={() => setSortKey('date_asc')} />
                  <MenuItem label="日付遠い順" active={sortKey === 'date_desc'} onClick={() => setSortKey('date_desc')} />
                  <MenuItem label="種別優先" active={sortKey === 'type'} onClick={() => setSortKey('type')} />
                  <MenuItem label="状態優先" active={sortKey === 'status'} onClick={() => setSortKey('status')} />
                </div>
              </section>

              <section style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)', paddingTop: 16 }}>
                <div style={sectionTitle}>セクション絞り込み</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(['all', 'pending', 'decided', 'history'] as SectionKey[]).map((key) => (
                    <SmallChip key={key} label={getSectionLabel(key)} active={sectionFilter === key} onClick={() => setSectionFilter(key)} />
                  ))}
                </div>
              </section>

              <section style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)', paddingTop: 16 }}>
                <div style={sectionTitle}>データ</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <MenuItem label="データを書き出す" onClick={() => { onExport(); setIsMenuOpen(false); }} />
                  <MenuItem label="データを読み込む" onClick={() => importInputRef.current?.click()} />
                </div>
                <input ref={importInputRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleImportFileChange} />
              </section>
            </div>
          </GlassCard>
        </div>
      )}

      {exhibitionAction && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setExhibitionAction(null)}>
          <GlassCard style={{ width: '100%', maxWidth: 420 }} onClick={(e: any) => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: theme.colors.text }}>{exhibitionAction.mode === 'reserve' ? '予約日時を入力' : '訪問日時を入力'}</div>
                <div style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 }}>{exhibitionAction.title}</div>
              </div>
              <input
                type="datetime-local"
                value={exhibitionAction.value}
                onChange={(e) => setExhibitionAction((prev) => prev ? { ...prev, value: e.target.value } : prev)}
                style={{
                  width: '100%',
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.08)',
                  padding: '12px 14px',
                  fontSize: 14,
                  fontWeight: 700,
                  color: theme.colors.text,
                  background: 'rgba(255,255,255,0.9)',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setExhibitionAction(null)} style={actionGhostBtn}>キャンセル</button>
                <button onClick={saveExhibitionDateAction} style={actionPrimaryBtn}>保存</button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      <div style={{ padding: '0 16px 140px' }}>
        {renderSection(getSectionLabel('pending'), visibleSections.pending)}
        {renderSection(getSectionLabel('decided'), visibleSections.decided)}
        {renderSection(getSectionLabel('history'), visibleSections.history)}
      </div>
    </div>
  );
};

const sectionTitle: React.CSSProperties = {
  fontSize: '12px',
  color: theme.colors.textSecondary,
  marginBottom: 8,
  fontWeight: 'bold',
};

const menuButtonBase: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  padding: '10px 12px',
  borderRadius: '12px',
  border: 'none',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  background: 'transparent',
  color: theme.colors.text,
};

const MenuItem: React.FC<{ label: string; active?: boolean; onClick: () => void }> = ({ label, active = false, onClick }) => (
  <button onClick={onClick} style={{ ...menuButtonBase, background: active ? 'rgba(83, 190, 232, 0.10)' : 'transparent', color: active ? theme.colors.primary : theme.colors.text, fontWeight: active ? 800 : 600 }}>
    {label}
  </button>
);

const SmallChip: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      border: 'none',
      cursor: 'pointer',
      padding: '6px 10px',
      fontSize: 12,
      fontWeight: 800,
      borderRadius: 999,
      background: active ? 'rgba(83, 190, 232, 0.16)' : 'rgba(0,0,0,0.04)',
      color: active ? theme.colors.primary : theme.colors.textSecondary,
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </button>
);

const actionPrimaryBtn: React.CSSProperties = {
  flex: 1,
  border: 'none',
  borderRadius: 12,
  background: theme.colors.primary,
  color: 'white',
  padding: '12px 16px',
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
};

const actionGhostBtn: React.CSSProperties = {
  ...actionPrimaryBtn,
  background: 'rgba(0,0,0,0.06)',
  color: theme.colors.text,
};
