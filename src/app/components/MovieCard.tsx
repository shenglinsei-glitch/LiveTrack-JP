import React from 'react';
import { Movie } from '@/domain/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PosterCard } from '@/components/common/PosterCard';
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
    <PosterCard
      onClick={onClick}
      imageUrl={displayImage}
      title={displayTitle}
      subtitle={displaySubtitle}
      meta={displayMeta || undefined}
      alt={displayTitle}
      statusNode={!hideStatus && movie ? <StatusBadge domain="movie" status={movie.status} /> : undefined}
      fallback={(
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
          <span style={{ fontSize: 48 }}>🎬</span>
        </div>
      )}
    />
  );
};
