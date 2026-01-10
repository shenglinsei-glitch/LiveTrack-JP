import React, { useState, useMemo } from 'react';
import { PageShell } from '../ui/PageShell';
import { IconButton, Icons } from '../ui/IconButton';
import { theme } from '../ui/theme';
import { TEXT } from '../ui/constants';
import { PageId, Concert, Status, Artist, DueAction } from '../domain/types';
import { ConcertMenu } from '../components/ConcertMenu';
import { sortPerformancesForDisplay, sortPerformancesByLotteryDate, getDueAction, applyDecision } from '../domain/logic';
import { GlassCard } from '../ui/GlassCard';

interface Props {
  artists: Artist[];
  onOpenArtist: (artistId: string) => void;
  onOpenConcert: (artistId: string, tourId: string, concertId: string) => void;
  onCreateConcert: () => void;
  onRefreshAll: () => void;
  onUpdateConcert: (artistId: string, tourId: string, concertId: string, updates: Partial<Concert>) => void;
  sortMode: 'status' | 'lottery';
  onSetSort: (mode: 'status' | 'lottery') => void;
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
    if (hh && min) return `${prefix}${mm}/${dd} ${String(parseInt(hh,10)).padStart(2,'0')}:${min}`;
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

const badgeBgFromColor = (color: string) => {
  if (typeof color === 'string' && color.startsWith('#') && color.length === 7) return `${color}22`;
  return 'rgba(0,0,0,0.06)';
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
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: theme.colors.error }}>{TEXT.ALERTS.TICKET_SALE_PERIOD}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <input type="text" placeholder="抽選名 (FC先行等)" value={lotteryName} onChange={e => setLotteryName(e.target.value)} style={smallInputStyle} />
              <input type="date" value={resultAt} onChange={e => setResultAt(e.target.value)} style={smallInputStyle} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => onAction('BUY', { lotteryName, resultAt })} style={primaryBtnStyle}>購入・申込</button>
              {dueAction === 'ASK_BUY_AT_SALE' && <button onClick={() => onAction('CONSIDER')} style={secondaryBtnStyle}>検討</button>}
              <button onClick={() => onAction('SKIP')} style={dangerBtnStyle}>見送</button>
            </div>
          </div>
        );
      case 'ASK_RESULT':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: theme.colors.error }}>{TEXT.ALERTS.RESULT_ANNOUNCED}</div>
            {!concert.concertAt && <input type="date" value={concertAt} onChange={e => setConcertAt(e.target.value)} style={smallInputStyle} placeholder="公演日時" />}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => onAction('WON', { concertAt: concertAt || concert.date })} style={primaryBtnStyle}>{TEXT.BUTTONS.WON}</button>
              <button onClick={() => onAction('LOST')} style={dangerBtnStyle}>{TEXT.BUTTONS.LOST}</button>
            </div>
          </div>
        );
      case 'NEED_SET_DEADLINE_AT':
      case 'NEED_SET_RESULT_AT':
      case 'NEED_SET_CONCERT_AT':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: theme.colors.textSecondary }}>{TEXT.ALERTS.NEED_DATE_SETTING}</div>
            <button onClick={onOpenEditor} style={secondaryBtnStyle}>詳細編集を開く</button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.05)' }} onClick={e => e.stopPropagation()}>
      {renderContent()}
    </div>
  );
};

const smallInputStyle = { padding: '8px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', fontSize: '13px', outline: 'none' };
const primaryBtnStyle = { flex: 1, padding: '10px', borderRadius: '10px', background: theme.colors.primary, color: 'white', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' };
const secondaryBtnStyle = { flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(0,0,0,0.05)', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' };
const dangerBtnStyle = { flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(247, 137, 63, 0.1)', color: theme.colors.error, border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' };

const ConcertRowCard: React.FC<{ 
  concert: ConcertWithMetadata; 
  onClick: () => void;
  onUpdate: (updates: Partial<Concert>) => void;
  onOpenEditor: () => void;
  sortMode: 'status' | 'lottery';
}> = ({ concert, onClick, onUpdate, onOpenEditor, sortMode }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const dueAction = getDueAction(concert);
  
  const statusColor = theme.colors.status[concert.status as Status] || theme.colors.primary;
  const displayImage = concert.tourImageUrl || (concert.images && concert.images.length > 0 ? concert.images[0] : null) || concert.artistImageUrl;

  const handleAction = (decision: any, payload: any) => {
    const updated = applyDecision(concert, decision, payload);
    onUpdate(updated);
  };

  const displayMeta = useMemo(() => {
    let actionType = '公演日';
    let rawValue: string = concert.concertAt || concert.date || '';
    const includeYear = true;

    if (sortMode === 'lottery') {
      switch (concert.status) {
        case '抽選中':
          actionType = '抽選結果';
          rawValue = concert.resultAt || TEXT.GLOBAL.COMMON_NOT_REGISTERED;
          break;
        case '検討中':
          actionType = '申込締切';
          rawValue = concert.deadlineAt || TEXT.GLOBAL.COMMON_NOT_REGISTERED;
          break;
        case '発売前':
          actionType = '発売開始';
          rawValue = concert.saleAt || TEXT.GLOBAL.COMMON_NOT_REGISTERED;
          break;
        default:
          actionType = '公演日';
          rawValue = concert.concertAt || concert.date || TEXT.GLOBAL.COMMON_NOT_REGISTERED;
          break;
      }
    }

    const normalized = normalizeDateTimeText(rawValue);
    const value =
      normalized === TEXT.GLOBAL.COMMON_NOT_REGISTERED
        ? normalized
        : (formatCompactDateTime(normalized, includeYear) || normalized);

    return { actionType, value };
  }, [concert, sortMode]);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'white',
        borderRadius: theme.radius.card,
        border: dueAction ? `2px solid ${theme.colors.error}` : '1px solid rgba(0, 0, 0, 0.04)',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        boxShadow: isHovered 
          ? '0 10px 20px -5px rgba(0, 0, 0, 0.06)' 
          : '0 4px 12px -2px rgba(0, 0, 0, 0.03)',
        transform: isHovered ? 'scale(1.01)' : 'scale(1)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{
          width: '68px', height: '68px', borderRadius: '50%', background: '#F3F4F6', flexShrink: 0, border: '3px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {displayImage && !imgError ? (
            <img src={displayImage} referrerPolicy="no-referrer" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgError(true)} />
          ) : (
            <span style={{ fontSize: '24px', opacity: 0.2 }}>🎟️</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', minWidth: 0, marginBottom: '2px' }}>
            <div style={{ fontSize: '12px', color: theme.colors.textSecondary, fontWeight: '700', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
              {concert.artistName}
            </div>
            <div style={{
              flexShrink: 0,
              fontSize: '11px',
              fontWeight: '800',
              color: statusColor,
              background: badgeBgFromColor(statusColor),
              border: '1px solid rgba(0,0,0,0.06)',
              padding: '4px 10px',
              borderRadius: '9999px',
              lineHeight: 1,
              whiteSpace: 'nowrap',
            }}>
              {concert.status === '見送' && concert.lotteryResult === 'LOST' ? TEXT.BUTTONS.LOST : TEXT.STATUS[concert.status]}
            </div>
          </div>

          <div style={{ fontWeight: '800', fontSize: '18px', color: isHovered ? theme.colors.primary : theme.colors.text, transition: 'color 0.2s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>
            {concert.tourName}
          </div>

          <div
            style={{
              fontSize: '12px',
              color: theme.colors.textSecondary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={`${displayMeta.actionType}：${displayMeta.value}`}
          >
            <span style={{ fontWeight: '800', color: theme.colors.textMain }}>{displayMeta.actionType}：</span>{' '}
            <span>{displayMeta.value}</span>
          </div>
        </div>
      </div>

      {dueAction && (
        <ActionPanel 
          concert={concert} 
          dueAction={dueAction} 
          onAction={handleAction} 
          onOpenEditor={onOpenEditor} 
        />
      )}
    </div>
  );
};

export const ConcertListPage: React.FC<Props> = ({ 
  artists, 
  onOpenArtist, 
  onOpenConcert, 
  onCreateConcert, 
  onRefreshAll, 
  onUpdateConcert,
  sortMode,
  onSetSort
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAttended, setShowAttended] = useState(true);
  const [showSkipped, setShowSkipped] = useState(true);

  const allConcerts = useMemo(() => {
    const list: ConcertWithMetadata[] = [];
    artists.forEach(artist => artist.tours.forEach(tour => tour.concerts.forEach(concert => {
      list.push({ ...concert, artistName: artist.name, artistId: artist.id, artistImageUrl: artist.imageUrl || '', tourName: tour.name, tourId: tour.id, tourImageUrl: tour.imageUrl || '', tourOfficialUrl: tour.officialUrl });
    })));
    return list;
  }, [artists]);

  const processedConcerts = useMemo(() => {
    let list = allConcerts.filter(c => {
      if (!showAttended && c.status === '参戦済み') return false;
      if (!showSkipped && c.status === '見送') return false;
      return true;
    });
    return sortMode === 'lottery' ? sortPerformancesByLotteryDate(list as any) as ConcertWithMetadata[] : sortPerformancesForDisplay(list as any) as ConcertWithMetadata[];
  }, [allConcerts, showAttended, showSkipped, sortMode]);

  return (
    <PageShell header={
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>{TEXT.GLOBAL.APP_TITLE} <span style={{ color: '#53BEE8' }}>JP</span></h1>
        <button onClick={onRefreshAll} style={{ padding: '12px', borderRadius: '9999px', background: 'white', border: '1px solid #F3F4F6', color: '#9CA3AF', cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icons.Refresh /></button>
      </div>
    }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '120px' }}>
        {processedConcerts.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: theme.colors.textWeak, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
            <div style={{ fontSize: '48px', opacity: 0.5 }}>🎟️</div>
            <div style={{ fontSize: '15px', fontWeight: '600' }}>{TEXT.LABELS.SCHEDULE_EMPTY}</div>
            <button onClick={onCreateConcert} style={{ padding: '12px 24px', borderRadius: '12px', background: theme.colors.primary, color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>＋ {TEXT.BUTTONS.ADD}</button>
          </div>
        ) : (
          processedConcerts.map((concert) => (
            <ConcertRowCard 
              key={concert.id} 
              concert={concert} 
              sortMode={sortMode}
              onClick={() => {
                if (concert.status === '参戦予定' || concert.status === '参戦済み') {
                  onOpenConcert(concert.artistId, concert.tourId, concert.id);
                } else {
                  onOpenArtist(concert.artistId);
                }
              }} 
              onUpdate={(updates) => onUpdateConcert(concert.artistId, concert.tourId, concert.id, updates)}
              onOpenEditor={() => onOpenArtist(concert.artistId)}
            />
          ))
        )}
      </div>
      <IconButton icon={isMenuOpen ? <Icons.X /> : <Icons.Plus />} primary size={64} onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ position: 'fixed', right: '16px', bottom: 'calc(16px + env(safe-area-inset-bottom))', zIndex: 110, boxShadow: '0 8px 24px -6px rgba(83, 190, 232, 0.5)' }} />
      <ConcertMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} onAddConcert={onCreateConcert} showAttended={showAttended} onToggleAttended={() => setShowAttended(!showAttended)} showSkipped={showSkipped} onToggleSkipped={() => setShowSkipped(!showSkipped)} sortMode={sortMode} onSetSort={onSetSort} />
    </PageShell>
  );
};
