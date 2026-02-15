import React, { useCallback, useMemo, useState } from 'react';
import { PageShell } from '../ui/PageShell';
import { Icons } from '../ui/IconButton';
import { theme } from '../ui/theme';
import { TEXT } from '../ui/constants';
import { Artist, Concert, ConcertListSortKey, ConcertViewMode, DueAction, Status } from '../domain/types';
import { applyDecision, getDueAction } from '../domain/logic';
import { ConcertMenu } from '../components/ConcertMenu';

interface Props {
  artists: Artist[];
  onOpenArtist: (artistId: string) => void;
  onOpenConcert: (artistId: string, tourId: string, concertId: string) => void;
  onCreateConcert: () => void;
  onRefreshAll: () => void;
  onUpdateConcert: (artistId: string, tourId: string, concertId: string, updates: Partial<Concert>) => void;

  // legacy props (kept for parent compatibility)
  sortMode: 'status' | 'lottery';
  onSetSort: (mode: 'status' | 'lottery') => void;

  viewMode: ConcertViewMode;
  onSetViewMode: (mode: ConcertViewMode) => void;

  isMenuOpenExternally?: boolean;
  onMenuClose?: () => void;
  hideHeader?: boolean;
}

interface ConcertWithMetadata extends Concert {
  artistName: string;
  artistId: string;
  artistImageUrl: string;
  tourName: string;
  tourId: string;
  tourImageUrl: string;
  tourOfficialUrl?: string;
}

type TourGroupItem = {
  type: 'tour_group';
  tourId: string;
  status: Status;
  concerts: ConcertWithMetadata[];
};

type StatusGroupItem = {
  type: 'status_group';
  status: Status;
  items: TourGroupItem[] | ConcertWithMetadata[];
};

// --- Helpers for compact single-line date/time display (mobile-friendly) ---
const normalizeDateTimeText = (v?: string) => (v || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

const formatCompactDateTime = (v?: string, includeYear: boolean = false) => {
  const s = normalizeDateTimeText(v);
  if (!s) return '';

  const mDate = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (mDate) {
    const yy = mDate[1];
    const mm = String(parseInt(mDate[2], 10));
    const dd = String(parseInt(mDate[3], 10));
    const hh = mDate[4];
    const min = mDate[5];
    const prefix = includeYear ? `${yy}/` : '';
    if (hh && min) return `${prefix}${mm}/${dd} ${hh}:${min}`;
    return `${prefix}${mm}/${dd}`;
  }

  const mSlash = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (mSlash) {
    const yy = mSlash[1];
    const mm = String(parseInt(mSlash[2], 10));
    const dd = String(parseInt(mSlash[3], 10));
    const hh = mSlash[4];
    const min = mSlash[5];
    const prefix = includeYear ? `${yy}/` : '';
    if (hh && min) return `${prefix}${mm}/${dd} ${String(parseInt(hh, 10)).padStart(2, '0')}:${min}`;
    return `${prefix}${mm}/${dd}`;
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const mm = String(d.getMonth() + 1);
    const dd = String(d.getDate());
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${includeYear ? d.getFullYear() + '/' : ''}${mm}/${dd} ${hh}:${min}`;
  }

  return s;
};

const parseDateLoose = (v?: string): Date | null => {
  const s = normalizeDateTimeText(v);
  if (!s || s === TEXT?.GLOBAL?.TBD) return null;

  // iOS safer
  const standardized = s.replace(/-/g, '/');
  const d = new Date(standardized);
  if (!isNaN(d.getTime())) return d;

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const da = parseInt(m[3], 10);
  const hh = m[4] ? parseInt(m[4], 10) : 12;
  const mm = m[5] ? parseInt(m[5], 10) : 0;
  const dd = new Date(y, mo, da, hh, mm, 0);
  return isNaN(dd.getTime()) ? null : dd;
};

const badgeBgFromColor = (color: string) => {
  if (typeof color === 'string' && color.startsWith('#') && color.length === 7) return `${color}22`;
  return 'rgba(0,0,0,0.06)';
};

const ALL_STATUSES: Status[] = ['発売前', '検討中', '抽選中', '参戦予定', '参戦済み', '見送'] as Status[];
const IMPORTANT_STATUSES: Status[] = ['発売前', '検討中', '抽選中', '参戦予定'] as Status[];

const STATUS_GROUP_ORDER: Status[] = ['発売前', '検討中', '抽選中', '参戦予定', '参戦済み', '見送'] as Status[];
const STATUS_GROUP_PRIORITY: Record<string, number> = STATUS_GROUP_ORDER.reduce((acc, s, idx) => {
  acc[s] = idx;
  return acc;
}, {} as Record<string, number>);

const getPrimaryDateStr = (c: ConcertWithMetadata, viewMode: ConcertViewMode) => {
  if (viewMode === 'deadline') {
    if (c.status === '抽選中') return c.resultAt || '';
    if (c.status === '検討中') return c.deadlineAt || '';
    if (c.status === '発売前') return c.saleAt || '';
    return c.concertAt || c.date || '';
  }
  return c.concertAt || c.date || '';
};

const compareByDate = (a: ConcertWithMetadata, b: ConcertWithMetadata, viewMode: ConcertViewMode) => {
  const da = parseDateLoose(getPrimaryDateStr(a, viewMode));
  const db = parseDateLoose(getPrimaryDateStr(b, viewMode));
  const ta = da ? da.getTime() : Number.POSITIVE_INFINITY;
  const tb = db ? db.getTime() : Number.POSITIVE_INFINITY;
  if (ta !== tb) return ta - tb;
  const byArtist = a.artistName.localeCompare(b.artistName);
  if (byArtist !== 0) return byArtist;
  return (a.tourName || '').localeCompare(b.tourName || '');
};

const compareByArtist = (a: ConcertWithMetadata, b: ConcertWithMetadata, viewMode: ConcertViewMode) => {
  const byArtist = a.artistName.localeCompare(b.artistName);
  if (byArtist !== 0) return byArtist;
  return compareByDate(a, b, viewMode);
};

const groupTours = (concerts: ConcertWithMetadata[], viewMode: ConcertViewMode, status?: Status): TourGroupItem[] => {
  const map = new Map<string, ConcertWithMetadata[]>();
  concerts.forEach((c) => {
    const key = c.tourId || c.tourName || c.id;
    const arr = map.get(key) || [];
    arr.push(c);
    map.set(key, arr);
  });
  const groups: TourGroupItem[] = [];
  map.forEach((arr, tourKey) => {
    const sorted = [...arr].sort((a, b) => compareByDate(a, b, viewMode));
    groups.push({ type: 'tour_group', tourId: tourKey, status: (status || sorted[0].status) as Status, concerts: sorted });
  });
  groups.sort((g1, g2) => compareByDate(g1.concerts[0], g2.concerts[0], viewMode));
  return groups;
};

// -------------------------------------------------------------------------
// ActionPanel (restored from old ConcertListPage.tsx)
// -------------------------------------------------------------------------
const smallInputStyle: React.CSSProperties = {
  padding: '8px',
  borderRadius: '8px',
  border: '1px solid rgba(0,0,0,0.1)',
  fontSize: '13px',
  outline: 'none',
};

const primaryBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px',
  borderRadius: '10px',
  background: theme.colors.primary,
  color: 'white',
  border: 'none',
  fontWeight: 'bold',
  fontSize: '13px',
  cursor: 'pointer',
};

const secondaryBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px',
  borderRadius: '10px',
  background: 'rgba(0,0,0,0.05)',
  border: 'none',
  fontWeight: 'bold',
  fontSize: '13px',
  cursor: 'pointer',
};

const dangerBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px',
  borderRadius: '10px',
  background: 'rgba(247, 137, 63, 0.1)',
  color: theme.colors.error,
  border: 'none',
  fontWeight: 'bold',
  fontSize: '13px',
  cursor: 'pointer',
};

const ActionPanel: React.FC<{
  concert: ConcertWithMetadata;
  dueAction: DueAction;
  onAction: (decision: 'BUY' | 'CONSIDER' | 'SKIP' | 'WON' | 'LOST', payload?: any) => void;
  onOpenEditor: () => void;
}> = ({ concert, dueAction, onAction, onOpenEditor }) => {
  const [lotteryName, setLotteryName] = useState(concert.lotteryName || '');
  const [resultAt, setResultAt] = useState(concert.resultAt || '');
  const [concertAt, setConcertAt] = useState(concert.concertAt || '');

  const renderContent = () => {
    switch (dueAction) {
      case 'ASK_BUY_AT_SALE':
      case 'ASK_BUY_AT_DEADLINE':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: theme.colors.error }}>
              {TEXT?.ALERTS?.TICKET_SALE_PERIOD ?? 'チケット申込の時期です'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input
                type="text"
                placeholder="抽選名 (FC先行等)"
                value={lotteryName}
                onChange={(e) => setLotteryName(e.target.value)}
                style={smallInputStyle}
              />
              {/* old behavior: date input (even if stored string includes time) */}
              <input type="date" value={resultAt} onChange={(e) => setResultAt(e.target.value)} style={smallInputStyle} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => onAction('BUY', { lotteryName, resultAt })} style={primaryBtnStyle}>
                購入・申込
              </button>
              {dueAction === 'ASK_BUY_AT_SALE' && (
                <button onClick={() => onAction('CONSIDER')} style={secondaryBtnStyle}>
                  検討
                </button>
              )}
              <button onClick={() => onAction('SKIP')} style={dangerBtnStyle}>
                見送
              </button>
            </div>
          </div>
        );

      case 'ASK_RESULT':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: theme.colors.error }}>
              {TEXT?.ALERTS?.RESULT_ANNOUNCED ?? '抽選結果が出ました'}
            </div>
            {!concert.concertAt && (
              <input
                type="date"
                value={concertAt}
                onChange={(e) => setConcertAt(e.target.value)}
                style={smallInputStyle}
                placeholder="公演日時"
              />
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onAction('WON', { concertAt: concertAt || concert.date })}
                style={primaryBtnStyle}
              >
                {TEXT?.BUTTONS?.WON ?? '当選'}
              </button>
              <button onClick={() => onAction('LOST')} style={dangerBtnStyle}>
                {TEXT?.BUTTONS?.LOST ?? '落選'}
              </button>
            </div>
          </div>
        );

      case 'NEED_SET_DEADLINE_AT':
      case 'NEED_SET_RESULT_AT':
      case 'NEED_SET_CONCERT_AT':
      case 'NEED_SET_SALE_AT':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: theme.colors.textSecondary }}>
              {TEXT?.ALERTS?.NEED_DATE_SETTING ?? '日付設定が必要です'}
            </div>
            <button onClick={onOpenEditor} style={secondaryBtnStyle}>
              詳細編集を開く
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.05)' }}
      onClick={(e) => e.stopPropagation()}
    >
      {renderContent()}
    </div>
  );
};

// -------------------------------------------------------------------------
// Cards
// -------------------------------------------------------------------------
const MilestoneRowCard: React.FC<{
  concert: ConcertWithMetadata;
  onClick: () => void;
  viewMode: ConcertViewMode;
  onUpdate: (updates: Partial<Concert>) => void;
  onOpenEditor: () => void;
}> = ({ concert, onClick, viewMode, onUpdate, onOpenEditor }) => {
  const statusColor = theme.colors.status[concert.status as Status] || theme.colors.primary;
  const displayImage = concert.tourImageUrl || concert.artistImageUrl;

  const dueAction = useMemo(() => {
    if (viewMode !== 'deadline') return null;
    return getDueAction(concert);
  }, [concert, viewMode]);

  const handleAction = useCallback(
    (decision: any, payload: any) => {
      const updated = applyDecision(concert, decision, payload);
      // pass back as Partial (we forward to onUpdateConcert)
      onUpdate({
        status: updated.status,
        saleAt: updated.saleAt ?? null,
        deadlineAt: updated.deadlineAt ?? null,
        resultAt: updated.resultAt ?? null,
        concertAt: updated.concertAt ?? null,
        lotteryName: updated.lotteryName ?? null,
        lotteryResult: updated.lotteryResult ?? null,
        lotteryHistory: updated.lotteryHistory,
        isParticipated: updated.isParticipated,
      });
    },
    [concert, onUpdate]
  );

  const displayMeta = useMemo(() => {
    if (viewMode === 'deadline') {
      if (concert.status === '抽選中') return { type: '抽選結果', val: concert.resultAt || TEXT.GLOBAL.COMMON_NOT_REGISTERED };
      if (concert.status === '検討中') return { type: '申込締切', val: concert.deadlineAt || TEXT.GLOBAL.COMMON_NOT_REGISTERED };
      if (concert.status === '発売前') return { type: '発売開始', val: concert.saleAt || TEXT.GLOBAL.COMMON_NOT_REGISTERED };
    }
    return { type: '公演日', val: concert.concertAt || concert.date || '' };
  }, [concert, viewMode]);

  const normalized = normalizeDateTimeText(displayMeta.val);
  const value =
    normalized === TEXT.GLOBAL.COMMON_NOT_REGISTERED ? normalized : formatCompactDateTime(normalized, true) || normalized;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: '24px',
        border: dueAction ? `2px solid ${theme.colors.error}` : '1px solid rgba(0, 0, 0, 0.04)',
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        transition: 'all 0.2s',
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
          {displayImage ? (
            <img src={displayImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '18px', opacity: 0.2 }}>🎟️</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ fontSize: '12px', color: theme.colors.textSecondary, fontWeight: '700', minWidth: 0 }}>
              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{concert.artistName}</div>
            </div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: '800',
                color: statusColor,
                background: badgeBgFromColor(statusColor),
                padding: '2px 8px',
                borderRadius: '9999px',
                border: '1px solid rgba(0,0,0,0.06)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {concert.status === '見送' && concert.lotteryResult === 'LOST' ? (TEXT?.BUTTONS?.LOST ?? '落選') : TEXT.STATUS[concert.status]}
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
            {concert.tourName}
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
            title={`${displayMeta.type}：${value}`}
          >
            <span style={{ fontWeight: '800', color: theme.colors.textMain }}>{displayMeta.type}：</span> {value}
          </div>
        </div>
      </div>

      {/* Restored: dueAction panel in deadline view */}
      {dueAction && (
        <ActionPanel concert={concert} dueAction={dueAction} onAction={handleAction} onOpenEditor={onOpenEditor} />
      )}
    </div>
  );
};

const TourGroupCard: React.FC<{
  artistId: string;
  tourName: string;
  artistName: string;
  imageUrl: string;
  status: Status;
  concerts: ConcertWithMetadata[];
  onOpenArtist: (artistId: string) => void;
  onOpenConcert: (aid: string, tid: string, cid: string) => void;
}> = ({ artistId, tourName, artistName, imageUrl, status, concerts, onOpenArtist, onOpenConcert }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusColor = theme.colors.status[status] || theme.colors.primary;
  const visibleConcerts = isExpanded ? concerts : concerts.slice(0, 2);
  const hasMore = concerts.length > 2;

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '28px',
        border: '1px solid rgba(0, 0, 0, 0.04)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        transition: 'all 0.3s ease-in-out',
        position: 'relative',
        height: 'auto',
      }}
    >
      <div
        onClick={() => onOpenArtist(artistId)}
        style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#F3F4F6',
          cursor: 'pointer',
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div style={{ minHeight: 180, position: 'relative' }}>
          {!imageUrl && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.12,
              }}
            >
              <Icons.Exhibitions style={{ width: 64, height: 64 }} />
            </div>
          )}
        </div>

        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
          <div
            style={{
              background: statusColor,
              color: 'white',
              padding: '4px 12px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 900,
              lineHeight: 1,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              whiteSpace: 'nowrap',
            }}
          >
            {TEXT.STATUS[status]}
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 5,
            padding: '56px 16px 12px',
            background:
              'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.62) 28%, rgba(0,0,0,0.28) 55%, transparent 78%)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ marginBottom: 4 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                opacity: 0.85,
                marginBottom: 2,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              {artistName}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                lineHeight: '1.2',
                textShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}
            >
              {tourName}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '-2px' }}>
            {visibleConcerts.map((c) => {
              const isParticipated = c.status === '参戦済み';
              return (
                <div
                  key={c.id}
                  onClick={
                    isParticipated
                      ? (e) => {
                          e.stopPropagation();
                          onOpenConcert(c.artistId, c.tourId, c.id);
                        }
                      : undefined
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    padding: '2px 0',
                    cursor: isParticipated ? 'pointer' : 'default',
                    opacity: isParticipated ? 1 : 0.75,
                    transition: 'opacity 0.2s',
                    lineHeight: 1.2,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 900, minWidth: 74, color: 'white' }}>
                    {formatCompactDateTime(c.concertAt || c.date, true)}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'white',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      flex: 1,
                      textAlign: 'center',
                      padding: '0 8px',
                      fontWeight: '600',
                    }}
                  >
                    {c.venue || '会場未定'}
                  </div>
                  {isParticipated ? (
                    <Icons.ChevronLeft
                      style={{
                        transform: 'rotate(180deg)',
                        width: 14,
                        color: 'rgba(255,255,255,0.6)',
                        alignSelf: 'center',
                      }}
                    />
                  ) : (
                    <div style={{ width: 14 }} />
                  )}
                </div>
              );
            })}
          </div>

          {hasMore && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              style={{
                width: '100%',
                border: 'none',
                background: 'none',
                padding: '6px 0 0',
                marginTop: 2,
                color: 'rgba(255,255,255,0.9)',
                fontSize: 12,
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                textShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}
            >
              {isExpanded ? '折りたたむ' : `＋ ${concerts.length - 2} 件の他公演を表示`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------
// Page
// -------------------------------------------------------------------------
export const ConcertListPage: React.FC<Props> = ({
  artists,
  onOpenArtist,
  onOpenConcert,
  onCreateConcert,
  onRefreshAll,
  onUpdateConcert,
  sortMode,
  onSetSort,
  viewMode,
  onSetViewMode,
  isMenuOpenExternally,
  onMenuClose,
  hideHeader,
}) => {
  // legacy props kept (not used here)
  void sortMode;
  void onSetSort;

  const STORAGE_KEY = 'ltjp_concert_list_prefs_v3';

  const [filters, setFilters] = useState<{ statuses?: Status[] }>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { statuses: undefined };
      const parsed = JSON.parse(raw);
      return { statuses: Array.isArray(parsed?.statuses) ? parsed.statuses : undefined };
    } catch {
      return { statuses: undefined };
    }
  });

  const [sortKey, setSortKey] = useState<ConcertListSortKey>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return 'date';
      const parsed = JSON.parse(raw);
      const k = parsed?.sortKey;
      return k === 'artist' || k === 'status_group' || k === 'date' ? k : 'date';
    } catch {
      return 'date';
    }
  });

  const persistPrefs = useCallback(
    (next: { statuses?: Status[]; sortKey?: ConcertListSortKey }) => {
      try {
        const merged = { statuses: filters.statuses, sortKey, ...next };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // ignore
      }
    },
    [filters.statuses, sortKey]
  );

  const onToggleStatus = useCallback(
    (status: Status) => {
      const base = filters.statuses && filters.statuses.length ? filters.statuses : ALL_STATUSES;
      const nextSet = new Set<Status>(base);
      if (nextSet.has(status)) nextSet.delete(status);
      else nextSet.add(status);

      const next = nextSet.size === 0 || nextSet.size === ALL_STATUSES.length ? undefined : Array.from(nextSet);
      setFilters({ statuses: next });
      persistPrefs({ statuses: next });
    },
    [filters.statuses, persistPrefs]
  );

  const onSelectAllStatuses = useCallback(() => {
    setFilters({ statuses: undefined });
    persistPrefs({ statuses: undefined });
  }, [persistPrefs]);

  const onSelectImportantStatuses = useCallback(() => {
    setFilters({ statuses: IMPORTANT_STATUSES });
    persistPrefs({ statuses: IMPORTANT_STATUSES });
  }, [persistPrefs]);

  const onSetSortKey = useCallback(
    (k: ConcertListSortKey) => {
      setSortKey(k);
      persistPrefs({ sortKey: k });
    },
    [persistPrefs]
  );

  const allConcerts = useMemo(() => {
    const list: ConcertWithMetadata[] = [];
    artists.forEach((artist) =>
      artist.tours.forEach((tour) =>
        tour.concerts.forEach((concert) => {
          list.push({
            ...concert,
            artistName: artist.name,
            artistId: artist.id,
            artistImageUrl: (artist as any).avatar || artist.imageUrl || '',
            tourName: tour.name,
            tourId: tour.id,
            tourImageUrl: tour.imageUrl || '',
            tourOfficialUrl: tour.officialUrl,
          });
        })
      )
    );
    return list;
  }, [artists]);

  const filteredConcerts = useMemo(() => {
    const allowed = new Set<Status>(filters.statuses && filters.statuses.length ? filters.statuses : ALL_STATUSES);
    return allConcerts.filter((c) => allowed.has(c.status as Status));
  }, [allConcerts, filters.statuses]);

  const statusGrouped = useMemo<StatusGroupItem[] | null>(() => {
    if (sortKey !== 'status_group') return null;

    const byStatus = new Map<Status, ConcertWithMetadata[]>();
    filteredConcerts.forEach((c) => {
      const s = c.status as Status;
      const arr = byStatus.get(s) || [];
      arr.push(c);
      byStatus.set(s, arr);
    });

    const statuses = Array.from(byStatus.keys()).sort(
      (a, b) => (STATUS_GROUP_PRIORITY[a] ?? 999) - (STATUS_GROUP_PRIORITY[b] ?? 999)
    );

    return statuses.map((s) => {
      const arr = [...(byStatus.get(s) || [])];
      arr.sort((a, b) => compareByDate(a, b, viewMode));

      if (viewMode === 'concert') {
        const tours = groupTours(arr, viewMode, s);
        return { type: 'status_group', status: s, items: tours };
      }
      return { type: 'status_group', status: s, items: arr };
    });
  }, [filteredConcerts, sortKey, viewMode]);

  const flatList = useMemo<(TourGroupItem | ConcertWithMetadata)[]>(() => {
    if (sortKey === 'status_group') return [];

    if (viewMode === 'concert') {
      const tours = groupTours(filteredConcerts, viewMode);
      if (sortKey === 'artist') {
        tours.sort((a, b) => compareByArtist(a.concerts[0], b.concerts[0], viewMode));
        return tours;
      }
      tours.sort((a, b) => compareByDate(a.concerts[0], b.concerts[0], viewMode));
      return tours;
    }

    const arr = [...filteredConcerts];
    if (sortKey === 'artist') arr.sort((a, b) => compareByArtist(a, b, viewMode));
    else arr.sort((a, b) => compareByDate(a, b, viewMode));
    return arr;
  }, [filteredConcerts, sortKey, viewMode]);

  const hasAny = (statusGrouped && statusGrouped.length > 0) || flatList.length > 0;

  return (
    <PageShell
      header={
        hideHeader ? undefined : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: theme.colors.text }}>
              {TEXT.LABELS.CONCERT_SCHEDULE}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={onRefreshAll}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  border: 'none',
                  background: 'rgba(0,0,0,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                aria-label="refresh"
              >
                <Icons.Refresh style={{ width: 18, height: 18 }} />
              </button>
            </div>
          </div>
        )
      }
    >
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!hasAny ? (
          <div
            style={{
              padding: '80px 20px',
              textAlign: 'center',
              color: theme.colors.textWeak,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
            }}
          >
            <div style={{ fontSize: '48px', opacity: 0.5 }}>🎟️</div>
            <div style={{ fontSize: '15px', fontWeight: '600' }}>{TEXT.LABELS.SCHEDULE_EMPTY}</div>
            <button
              onClick={onCreateConcert}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                background: theme.colors.primary,
                color: 'white',
                border: 'none',
                fontWeight: 'bold',
              }}
            >
              ＋ {TEXT.BUTTONS.ADD}
            </button>
          </div>
        ) : statusGrouped ? (
          statusGrouped.map((group) => (
            <div key={`status-${group.status}`} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 4px',
                  marginTop: 6,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 900, color: theme.colors.textSecondary }}>
                  {TEXT.STATUS[group.status]} <span style={{ opacity: 0.6 }}>({(group.items as any[]).length})</span>
                </div>
              </div>

              {(group.items as any[]).map((item: any) => {
                if (item?.type === 'tour_group') {
                  const tg = item as TourGroupItem;
                  const main = tg.concerts[0];
                  return (
                    <TourGroupCard
                      key={`tg-${group.status}-${tg.tourId}`}
                      artistId={main.artistId}
                      tourName={main.tourName}
                      artistName={main.artistName}
                      imageUrl={main.tourImageUrl || main.artistImageUrl}
                      status={group.status}
                      concerts={tg.concerts}
                      onOpenArtist={onOpenArtist}
                      onOpenConcert={onOpenConcert}
                    />
                  );
                }

                const c = item as ConcertWithMetadata;
                return (
                  <MilestoneRowCard
                    key={`${group.status}-${c.id}`}
                    concert={c}
                    viewMode={viewMode}
                    onClick={() => {
                      // preserve old behavior: participated => open concert; otherwise open artist
                      if (c.status === '参戦予定' || c.status === '参戦済み') onOpenConcert(c.artistId, c.tourId, c.id);
                      else onOpenArtist(c.artistId);
                    }}
                    onUpdate={(updates) => onUpdateConcert(c.artistId, c.tourId, c.id, updates)}
                    onOpenEditor={() => onOpenConcert(c.artistId, c.tourId, c.id)}
                  />
                );
              })}
            </div>
          ))
        ) : (
          flatList.map((item) => {
            if ((item as any).type === 'tour_group') {
              const tg = item as TourGroupItem;
              const main = tg.concerts[0];
              return (
                <TourGroupCard
                  key={`tg-${tg.tourId}`}
                  artistId={main.artistId}
                  tourName={main.tourName}
                  artistName={main.artistName}
                  imageUrl={main.tourImageUrl || main.artistImageUrl}
                  status={tg.status}
                  concerts={tg.concerts}
                  onOpenArtist={onOpenArtist}
                  onOpenConcert={onOpenConcert}
                />
              );
            }

            const c = item as ConcertWithMetadata;
            return (
              <MilestoneRowCard
                key={c.id}
                concert={c}
                viewMode={viewMode}
                onClick={() => {
                  if (c.status === '参戦予定' || c.status === '参戦済み') onOpenConcert(c.artistId, c.tourId, c.id);
                  else onOpenArtist(c.artistId);
                }}
                onUpdate={(updates) => onUpdateConcert(c.artistId, c.tourId, c.id, updates)}
                onOpenEditor={() => onOpenConcert(c.artistId, c.tourId, c.id)}
              />
            );
          })
        )}
      </div>

      <ConcertMenu
        isOpen={!!isMenuOpenExternally}
        onClose={() => onMenuClose?.()}
        onAddConcert={onCreateConcert}
        viewMode={viewMode}
        onSetViewMode={onSetViewMode}
        sortKey={sortKey}
        onSetSortKey={onSetSortKey}
        allStatuses={ALL_STATUSES}
        selectedStatuses={filters.statuses}
        onToggleStatus={onToggleStatus}
        onSelectAllStatuses={onSelectAllStatuses}
        onSelectImportantStatuses={onSelectImportantStatuses}
      />
    </PageShell>
  );
};
