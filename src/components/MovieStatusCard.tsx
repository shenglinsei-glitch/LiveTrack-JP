import React from 'react';
import dayjs from 'dayjs';
import { Movie, StatusItem } from '../domain/types';
import { theme } from '../ui/theme';
import {
  fromDateTimeLocal,
  getMovieActionKind,
  getMovieLotteryResultAt,
  getMovieMetaLabel,
  getMovieMetaValue,
  getMovieSaleStart,
  getMovieStatusTone,
  parseMovieFlexibleDate,
} from '../domain/statusHelpers';

export interface MovieLotteryActionState {
  id: string;
  title: string;
  value: string;
  theaterName: string;
  screenName: string;
  seat: string;
  price: string;
}

interface Props {
  item: StatusItem;
  now: Date;
  onOpenMovieDetail: (id: string) => void;
  onUpdateMovieStatus: (id: string, updates: Partial<Movie>) => void;
  onOpenMovieLotteryWinModal: (item: StatusItem) => void;
}

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

const buildLostMovieUpdate = (movie: Movie, now: Date): Partial<Movie> => {
  const releaseTime = parseMovieFlexibleDate(movie.releaseDate);
  const nextStatus = releaseTime && now >= releaseTime ? '上映中' : '未上映';

  return {
    status: nextStatus,
    lotteryResult: 'LOST',
    lotteryHistory: [
      ...(movie.lotteryHistory || []),
      {
        at: now.toISOString(),
        result: 'LOST',
        lotteryName: movie.lotteryName || '',
        lotteryResultAt: movie.lotteryResultAt || '',
      },
    ],
    updatedAt: now.toISOString(),
  };
};

export const MovieStatusCard: React.FC<Props> = ({
  item,
  now,
  onOpenMovieDetail,
  onUpdateMovieStatus,
  onOpenMovieLotteryWinModal,
}) => {
  const movie = item.raw as Movie;
  const statusTone = getMovieStatusTone(item.status, item.displayStatus);
  const actionKind = getMovieActionKind(movie, now);

  const cardBottomMargin = actionKind ? '4px' : '12px';

  return (
    <div>
      <div
        onClick={() => onOpenMovieDetail(item.parentId)}
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
          marginBottom: cardBottomMargin,
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
            {movie.posterUrl ? (
              <img src={movie.posterUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '18px', opacity: 0.2 }}>🎬</span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ fontSize: '12px', color: theme.colors.textSecondary, fontWeight: '700', minWidth: 0 }}>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {movie.theaterName || '映画'}
                </div>
              </div>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  color: statusTone.color,
                  background: statusTone.bg,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(0,0,0,0.06)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {statusTone.label}
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
            >
              <span style={{ fontWeight: '800', color: theme.colors.textMain }}>{getMovieMetaLabel(movie)}：</span> {getMovieMetaValue(movie) || ''}
            </div>
          </div>
        </div>
      </div>

      {actionKind === 'sale' && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', padding: '0 4px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const nextStatus = movie.ticketType === '舞台挨拶' ? '抽選中' : '上映中';
              onUpdateMovieStatus(item.parentId, { status: nextStatus, updatedAt: now.toISOString() });
            }}
            style={actionPrimaryBtn}
          >
            購入・申込
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateMovieStatus(item.parentId, { status: '上映中', updatedAt: now.toISOString() });
            }}
            style={actionGhostBtn}
          >
            検討
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateMovieStatus(item.parentId, { status: '見送り', updatedAt: now.toISOString() });
            }}
            style={actionGhostBtn}
          >
            見送り
          </button>
        </div>
      )}

      {actionKind === 'lottery' && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', padding: '0 4px' }}>
          <button onClick={(e) => { e.stopPropagation(); onOpenMovieLotteryWinModal(item); }} style={actionPrimaryBtn}>当選</button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateMovieStatus(item.parentId, buildLostMovieUpdate(movie, now));
            }}
            style={actionGhostBtn}
          >
            落選
          </button>
        </div>
      )}

      {actionKind === 'screening' && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', padding: '0 4px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateMovieStatus(item.parentId, {
                status: '鑑賞済み',
                watchDate: movie.watchDate || dayjs().format('YYYY-MM-DD'),
                updatedAt: now.toISOString(),
              });
            }}
            style={actionPrimaryBtn}
          >
            鑑賞済み
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateMovieStatus(item.parentId, { status: '見送り', updatedAt: now.toISOString() });
            }}
            style={actionGhostBtn}
          >
            見送り
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateMovieStatus(item.parentId, { status: '上映終了', updatedAt: now.toISOString() });
            }}
            style={actionGhostBtn}
          >
            上映終了
          </button>
        </div>
      )}
    </div>
  );
};
