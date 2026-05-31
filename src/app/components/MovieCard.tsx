import React from 'react';
import { Movie } from '@/domain/types';
import { GlassCard } from '@/components/common/GlassCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import dayjs from 'dayjs';

interface MovieCardProps {
  movie?: Movie;
  onClick: () => void;
  overrideTitle?: string;
  overrideSubtitle?: string;
  imageUrl?: string;
  hideStatus?: boolean;
  hideMeta?: boolean;
  asEntryCard?: boolean;
}

const fmtDate = (date?: string) => (date ? dayjs(date).format('YYYY/MM/DD') : '未設定');

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  onClick,
  overrideTitle,
  overrideSubtitle,
  imageUrl,
  hideStatus = false,
  hideMeta = false,
  asEntryCard = false,
}) => {
  const displayImage = imageUrl || movie?.posterUrl;
  const displayTitle = overrideTitle || movie?.title || '';
  const displaySubtitle = overrideSubtitle || '';

  const displayMeta = movie && !hideMeta
    ? movie.status === '抽選中'
      ? `結果日：${fmtDate(movie.lotteryResultAt)}`
      : movie.status === '発売前'
      ? `発売日：${fmtDate(movie.saleAt)}`
      : movie.watchDate
      ? `鑑賞日：${fmtDate(movie.watchDate)}`
      : `公開日：${fmtDate(movie.releaseDate)}`
    : null;

  return (
    <div onClick={onClick} style={{ cursor: 'pointer' }}>
      <GlassCard
        padding="0"
        style={{
          overflow: 'hidden',
          borderRadius: 24,
          height: '100%',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
        }}
      >
        <div style={{ position: 'relative', paddingTop: '140%', background: '#F3F4F6' }}>
          {displayImage ? (
            <img src={displayImage} alt={displayTitle} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.18)', transformOrigin: 'center center', willChange: 'transform'  }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
              <span style={{ fontSize: 48 }}>🎬</span>
            </div>
          )}

          {!hideStatus && movie && (
            <StatusBadge domain="movie" status={movie.status} style={{ position: 'absolute', top: 10, left: 10 }} />
          )}

          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              padding: '24px 12px 12px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.42) 60%, transparent 100%)',
              color: '#fff'
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayTitle}
            </div>
            {displaySubtitle && (
              <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700, opacity: 0.88, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displaySubtitle}
              </div>
            )}
            {displayMeta && (
              <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, opacity: 0.82 }}>
                {displayMeta}
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
