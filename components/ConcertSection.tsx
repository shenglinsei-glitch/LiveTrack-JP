import React, { useMemo, useState } from 'react';
import { Concert } from '../domain/types';

type LotteryResult = 'WON' | 'LOST';

const isValidDateTime = (d?: string | null) => !!d && !isNaN(new Date(d).getTime());

interface ConcertSectionProps {
  concert: Concert;
  now: Date;

  /**
   * Click the card to open detail/summary (optional).
   */
  onSummaryClick?: (concertId: string) => void;

  /**
   * Record lottery result (WON / LOST) for THIS concert.
   * The caller should persist the updated data.
   */
  onRecordLotteryResult?: (concertId: string, result: LotteryResult) => void;
}

/**
 * ConcertSection (single concert card)
 *
 * NOTE:
 * - This project data model has no `performances[]`. One Concert = one instance.
 * - `resultAt` is used as "抽選結果時間" (if present).
 * - `lotteryHistory` is optional (added by our patch); keep UI defensive if it's missing.
 */
export const ConcertSection: React.FC<ConcertSectionProps> = ({
  concert,
  now,
  onSummaryClick,
  onRecordLotteryResult,
}) => {
  const [historyOpen, setHistoryOpen] = useState(false);

  const isExpired = useMemo(() => {
    if (!isValidDateTime(concert.concertAt)) return false;
    return now.getTime() > new Date(concert.concertAt as string).getTime();
  }, [concert.concertAt, now]);

  const canDecideLottery = useMemo(() => {
    if (!onRecordLotteryResult) return false;
    // Only allow when we are still in lottery-ish state and haven't recorded a result yet.
    if (concert.lotteryResult) return false;
    if (!concert.resultAt || !isValidDateTime(concert.resultAt)) return false;

    // Usually the concert is in '抽選中' until result; but we keep it permissive:
    // if resultAt has arrived and status isn't already final, allow decision.
    const isStatusFinal = concert.status === '参戦予定' || concert.status === '参戦済み' || concert.status === '見送';
    if (isStatusFinal) return false;

    return now.getTime() >= new Date(concert.resultAt).getTime();
  }, [concert, now, onRecordLotteryResult]);

  const historyItems = useMemo(() => {
    const items = (concert as any).lotteryHistory as
      | { id: string; recordedAt: string; result: LotteryResult; note?: string }[]
      | undefined;

    return (items || [])
      .slice()
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  }, [concert]);

  const statusText = useMemo(() => {
    // If we have a recorded lottery result, show it prominently.
    if (concert.lotteryResult === 'WON') return isExpired ? '参戦済み' : '参戦予定';
    if (concert.lotteryResult === 'LOST') return '落選';

    // Fall back to existing status labels.
    return concert.status;
  }, [concert.lotteryResult, concert.status, isExpired]);

  const badgeStyle = useMemo<React.CSSProperties>(() => {
    // Small iOS-ish badge
    const base: React.CSSProperties = {
      fontSize: 10,
      fontWeight: 900,
      padding: '4px 10px',
      borderRadius: 10,
      letterSpacing: 0.2,
      whiteSpace: 'nowrap',
    };

    if (concert.lotteryResult === 'WON') {
      return { ...base, background: isExpired ? 'rgba(166,223,247,1)' : 'rgba(83,190,232,1)', color: '#fff' };
    }
    if (concert.lotteryResult === 'LOST') {
      return { ...base, background: 'rgba(100,116,139,1)', color: '#fff' };
    }
    if (concert.status === '見送') return { ...base, background: 'rgba(156,163,175,1)', color: '#fff' };
    if (concert.status === '抽選中') return { ...base, background: 'rgba(252,211,77,1)', color: '#7C2D12' };
    if (concert.status === '検討中') return { ...base, background: 'rgba(251,191,36,0.35)', color: '#92400E' };

    return { ...base, background: 'rgba(156,163,175,1)', color: '#fff' };
  }, [concert.lotteryResult, concert.status, isExpired]);

  const cardBg = useMemo(() => {
    if (concert.lotteryResult === 'WON') {
      return isExpired ? 'rgba(83,190,232,0.06)' : 'rgba(16,185,129,0.08)';
    }
    if (concert.lotteryResult === 'LOST') return 'rgba(241,245,249,0.9)';
    if (concert.status === '見送') return 'rgba(243,244,246,0.7)';
    if (concert.status === '抽選中') return 'rgba(252,211,77,0.12)';
    return 'rgba(255,255,255,0.85)';
  }, [concert.lotteryResult, concert.status, isExpired]);

  return (
    <div
      onClick={() => onSummaryClick?.(concert.id)}
      style={{
        background: cardBg,
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 28,
        padding: 16,
        marginBottom: 12,
        boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
        cursor: onSummaryClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 18,
            background: 'rgba(0,0,0,0.06)',
            overflow: 'hidden',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* The new model stores images in IndexedDB via imageIds.
              If you want a thumbnail here, you need an image resolver.
              For now, show a placeholder. */}
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="rgba(148,163,184,1)" strokeWidth="2">
            <path d="M3 7h18M3 7v13h18V7M7 7V4h10v3" />
            <path d="M8 12l3 3 5-6" />
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#111827', lineHeight: 1.25 }}>
                {concert.date || '日付未定'}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  fontWeight: 800,
                  color: 'rgba(100,116,139,1)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {concert.venue || '会場未定'}
              </div>

              {/* resultAt label */}
              {concert.resultAt && isValidDateTime(concert.resultAt) && !concert.lotteryResult && (
                <div style={{ marginTop: 6, fontSize: 11, fontWeight: 900, color: 'rgba(217,119,6,1)' }}>
                  抽選発表：{new Date(concert.resultAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}

              {/* history toggle */}
              {historyItems.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHistoryOpen(v => !v);
                  }}
                  style={{
                    marginTop: 6,
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    fontSize: 11,
                    fontWeight: 900,
                    color: 'rgba(148,163,184,1)',
                    textDecoration: 'underline',
                    textUnderlineOffset: 4,
                    cursor: 'pointer',
                  }}
                >
                  抽選履歴（{historyItems.length}）{historyOpen ? 'を閉じる' : 'を見る'}
                </button>
              )}
            </div>

            <div style={badgeStyle}>{statusText}</div>
          </div>

          {/* action: decide lottery */}
          {canDecideLottery && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRecordLotteryResult?.(concert.id, 'WON');
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 14,
                    border: '1px solid rgba(83,190,232,0.5)',
                    background: 'rgba(83,190,232,1)',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  当選
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRecordLotteryResult?.(concert.id, 'LOST');
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 14,
                    border: '1px solid rgba(148,163,184,0.45)',
                    background: 'rgba(226,232,240,1)',
                    color: 'rgba(51,65,85,1)',
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  落選
                </button>
              </div>
              <div style={{ marginTop: 6, fontSize: 11, fontWeight: 800, color: 'rgba(148,163,184,1)' }}>
                選択すると、この公演に抽選結果が保存されます。
              </div>
            </div>
          )}

          {/* history list */}
          {historyItems.length > 0 && historyOpen && (
            <div style={{ marginTop: 10, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>
              {historyItems.map((h) => (
                <div
                  key={h.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.7)',
                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(100,116,139,1)' }}>
                    {new Date(h.recordedAt).toLocaleString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      padding: '4px 10px',
                      borderRadius: 10,
                      background: h.result === 'WON' ? 'rgba(83,190,232,0.16)' : 'rgba(226,232,240,1)',
                      color: h.result === 'WON' ? 'rgba(42,155,196,1)' : 'rgba(71,85,105,1)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h.result === 'WON' ? '当選' : '落選'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
