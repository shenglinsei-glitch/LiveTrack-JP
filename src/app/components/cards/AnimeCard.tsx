import React from 'react';
import dayjs from 'dayjs';
import { Anime, AnimeStatus, Season } from '@/domain/types';
import { PosterCard } from '@/components/common/PosterCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { theme } from '@/components/common/theme';

interface AnimeCardProps {
  anime: Anime;
  onClick: () => void;
}

const fmtDate = (date?: string) => (date ? dayjs(date).format('YYYY/MM/DD') : '未設定');

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
const ANIME_STATUS_PRIORITY: AnimeStatus[] = ['視聴中', '視聴予定', '放送前', '保留', '視聴済み', '視聴中止', '見送り'];

const deriveAnimeStatus = (anime: Anime): AnimeStatus => {
  const statuses = (anime.seasons || []).map((season) => season.status).filter(Boolean) as AnimeStatus[];
  if (!statuses.length) return anime.status || '放送前';
  return ANIME_STATUS_PRIORITY.find((status) => statuses.includes(status)) || anime.status || '放送前';
};

const getAnimeStatusColor = (status: AnimeStatus): string => {
  switch (status) {
    case '放送前': return theme.colors.status['発売前'];
    case '視聴予定': return theme.colors.status['参戦予定'];
    case '視聴中': return theme.colors.primary;
    case '保留': return theme.colors.status['検討中'];
    case '視聴済み': return theme.colors.status['参戦済み'];
    case '視聴中止': return theme.colors.textWeak;
    case '見送り': return theme.colors.status['見送'];
    default: return theme.colors.textWeak;
  }
};

const getCurrentWatchingSeason = (anime: Anime): Season | undefined =>
  (anime.seasons || []).find((season) => season.status === '視聴中');

const looksLikeSeasonNumber = (value?: string) =>
  /^第.+[期季]$|^Season\s*\d+$/i.test(String(value || '').trim());

const getSeasonNumber = (season?: Season) => {
  if (!season) return '';
  if (season.seasonNumber?.trim()) return season.seasonNumber.trim();
  if (looksLikeSeasonNumber(season.seasonTitle)) return season.seasonTitle.trim();
  return '';
};

const getEffectiveSeasonTitle = (anime: Anime, season?: Season) => {
  if (!season) return anime.title || '';
  if (season.useAnimeTitle || !season.seasonTitle?.trim() || looksLikeSeasonNumber(season.seasonTitle))
    return anime.title || '';
  return season.seasonTitle.trim();
};

const getSeasonDisplayTitle = (anime: Anime, season?: Season) => {
  const number = getSeasonNumber(season);
  const title = getEffectiveSeasonTitle(anime, season);
  return number ? `${number} ${title}` : title;
};

const getNextDayWeekday = (date?: string) => {
  if (!date) return '';
  const d = dayjs(date);
  if (!d.isValid()) return '';
  return WEEK[d.add(1, 'day').day()];
};

const getBroadcastText = (anime: Anime) => {
  const watching = getCurrentWatchingSeason(anime);
  const startDate = watching?.startDate || anime.startDate;
  const weekday = getNextDayWeekday(startDate) || watching?.broadcastWeekday || anime.broadcastWeekday;
  if (!weekday) return '';
  return `毎週${weekday}曜更新`;
};

export const AnimeCard: React.FC<AnimeCardProps> = ({ anime, onClick }) => {
  const watchingSeason = getCurrentWatchingSeason(anime);
  const displayTitle = getSeasonDisplayTitle(anime, watchingSeason);
  const broadcastText = getBroadcastText(anime);
  const displayStatus = deriveAnimeStatus(anime);
  const statusColor = getAnimeStatusColor(displayStatus);

  const infoText =
    broadcastText ||
    (anime.startDate && anime.endDate
      ? `${fmtDate(anime.startDate)} ～ ${fmtDate(anime.endDate)}`
      : anime.startDate
      ? `${fmtDate(anime.startDate)} ～`
      : anime.studio || '制作未設定');

  const meta = anime.totalEpisodes ? `${infoText}・全${anime.totalEpisodes}話` : infoText;

  const statusNode = displayStatus ? (
    <StatusBadge
      domain="concert"
      status={displayStatus}
      style={{
        background: statusColor,
        color: '#fff',
        padding: '3px 7px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 900,
        boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
        minHeight: 'auto',
      }}
    />
  ) : undefined;

  const rightTopNode = anime.rating ? (
    <div
      style={{
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '3px 7px',
        borderRadius: 8,
        fontSize: 10,
        fontWeight: 900,
      }}
    >
      ★ {anime.rating.toFixed(1)}
    </div>
  ) : undefined;

  const genreTags =
    anime.genres && anime.genres.length > 0 ? (
      <div style={{ marginTop: 5, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {anime.genres.slice(0, 3).map((genre, idx) => (
          <span
            key={idx}
            style={{
              fontSize: 9,
              fontWeight: 700,
              background: 'rgba(255,255,255,0.2)',
              padding: '2px 5px',
              borderRadius: 4,
            }}
          >
            {genre}
          </span>
        ))}
      </div>
    ) : undefined;

  return (
    <PosterCard
      onClick={onClick}
      imageUrl={anime.posterUrl}
      title={displayTitle}
      meta={meta}
      alt={anime.title}
      statusNode={statusNode}
      rightTopNode={rightTopNode}
      fallback={
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
          <span style={{ fontSize: 48 }}>📺</span>
        </div>
      }
      extraContent={genreTags}
      compact
    />
  );
};
