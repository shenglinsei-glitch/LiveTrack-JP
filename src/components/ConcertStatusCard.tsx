
import React, { useCallback, useMemo, useState } from 'react';
import { theme } from '../ui/theme';
import { TEXT } from '../ui/constants';
import { Icons } from '../ui/IconButton';
import { Concert, DueAction, Status } from '../domain/types';
import { applyDecision, getDueAction } from '../domain/logic';

import { RemoteImage } from './RemoteImage';

interface ConcertWithMetadata extends Concert {
  artistName: string;
  artistId: string;
  artistImageUrl: string;
  artistImageId?: string;
  tourName: string;
  tourId: string;
  tourImageUrl: string;
  tourImageId?: string;
}

interface Props {
  concert: ConcertWithMetadata;
  onClick: () => void;
  onUpdate: (artistId: string, tourId: string, concertId: string, updates: Partial<Concert>) => void;
  onOpenEditor: () => void;
}

// --- Helpers copied from ConcertListPage.tsx ---
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

const badgeBgFromColor = (color: string) => {
  if (typeof color === 'string' && color.startsWith('#') && color.length === 7) return `${color}22`;
  return 'rgba(0,0,0,0.06)';
};

const smallInputStyle: React.CSSProperties = {
  padding: '8px',
  borderRadius: '8px',
  border: '1px solid rgba(0,0,0,0.1)',
  fontSize: '13px',
  outline: 'none',
  background: 'white',
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

export const ConcertStatusCard: React.FC<Props> = ({ concert, onClick, onUpdate, onOpenEditor }) => {
  const statusColor = theme.colors.status[concert.status as Status] || theme.colors.primary;
  const displayImage = concert.tourImageUrl || concert.artistImageUrl;
  const displayImageId = concert.tourImageId || concert.artistImageId;

  const dueAction = useMemo(() => {
    return getDueAction(concert);
  }, [concert]);

  const handleAction = useCallback(
    (decision: any, payload: any) => {
      const updated = applyDecision(concert, decision, payload);
      onUpdate(concert.artistId, concert.tourId, concert.concertId, {
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
    if (concert.status === '抽選中') return { type: '抽選結果', val: concert.resultAt || TEXT.GLOBAL.COMMON_NOT_REGISTERED };
    if (concert.status === '検討中') return { type: '申込締切', val: concert.deadlineAt || TEXT.GLOBAL.COMMON_NOT_REGISTERED };
    if (concert.status === '発売前') return { type: '発売開始', val: concert.saleAt || TEXT.GLOBAL.COMMON_NOT_REGISTERED };
    return { type: '公演日', val: concert.concertAt || concert.date || '' };
  }, [concert]);

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
        marginBottom: '12px',
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
            imageUrl={displayImage} 
            imageId={displayImageId}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            fallback={<span style={{ fontSize: '18px', opacity: 0.2 }}>🎟️</span>}
          />
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

      {dueAction && (
        <ActionPanel concert={concert} dueAction={dueAction} onAction={handleAction} onOpenEditor={onOpenEditor} />
      )}
    </div>
  );
};
