import dayjs from 'dayjs';
import { Anime, Season, AnimeStatus, AnimeBroadcastWeekday } from '@/domain/types';
import { theme } from '@/components/common/theme';

export const asArray = <T,>(value: T[] | undefined | null): T[] => Array.isArray(value) ? value : [];

export const getAnimeStatusColor = (status?: string) => {
  switch (status) {
    case '放送前': return theme.colors.status['発売前'];
    case '視聴予定': return theme.colors.status['参戦予定'];
    case '視聴中': return theme.colors.primary;
    case '視聴済み': return theme.colors.status['参戦済み'];
    case '保留': return theme.colors.status['検討中'];
    case '視聴中止': return theme.colors.textWeak;
    case '見送り': return theme.colors.status['見送'];
    default: return theme.colors.textWeak;
  }
};

const week = ['日', '月', '火', '水', '木', '金', '土'];

export const formatDateWithWeek = (date?: string) => {
  if (!date) return '';
  const d = dayjs(date);
  if (!d.isValid()) return '';
  return `${d.format('YYYY/MM/DD')}（${week[d.day()]}）`;
};

export const openExternalUrl = (url?: string) => {
  const value = url?.trim();
  if (!value) return;
  window.open(value.startsWith('http') ? value : `https://${value}`, '_blank', 'noopener,noreferrer');
};

const ANIME_STATUS_PRIORITY: AnimeStatus[] = ['視聴中', '視聴予定', '保留', '放送前', '視聴済み', '視聴中止', '見送り'];

export const deriveAnimeStatus = (anime: Pick<Anime, 'status' | 'seasons'>): AnimeStatus => {
  const statuses = asArray(anime.seasons).map((s) => s.status).filter(Boolean) as AnimeStatus[];
  if (!statuses.length) return anime.status || '放送前';
  return ANIME_STATUS_PRIORITY.find((status) => statuses.includes(status)) || anime.status || '放送前';
};

export const getNextDayWeekday = (date?: string): AnimeBroadcastWeekday => {
  if (!date) return '';
  const d = dayjs(date);
  if (!d.isValid()) return '';
  return week[(d.add(1, 'day').day())] as AnimeBroadcastWeekday;
};

export const getBroadcastText = (startDate?: string, broadcastWeekday?: AnimeBroadcastWeekday) => {
  const weekday = getNextDayWeekday(startDate) || broadcastWeekday;
  if (!weekday) return '';
  return `毎週${weekday}曜`;
};

export const looksLikeSeasonNumber = (value?: string) => /^第.+[シリーズ]$|^Season\s*\d+$/i.test(String(value || '').trim());

export const getSeasonNumber = (season?: Season) => {
  if (!season) return '';
  if (season.seasonNumber?.trim()) return season.seasonNumber.trim();
  if (looksLikeSeasonNumber(season.seasonTitle)) return season.seasonTitle.trim();
  return '';
};

export const getEffectiveSeasonTitle = (animeTitle: string, season?: Season) => {
  if (!season) return animeTitle;
  if (season.useAnimeTitle || !season.seasonTitle?.trim() || looksLikeSeasonNumber(season.seasonTitle)) return animeTitle;
  return season.seasonTitle.trim();
};

export const getSeasonDisplayTitle = (animeTitle: string, season?: Season) => {
  const number = getSeasonNumber(season);
  const title = getEffectiveSeasonTitle(animeTitle, season);
  return number ? `${number} ${title}` : title;
};

export const getCurrentWatchingSeason = (anime: Anime) => {
  return asArray(anime.seasons).find((season) => season.status === '視聴中');
};

export const getLatestSeasonPosterUrl = (anime: Pick<Anime, 'posterUrl' | 'seasons'>) => {
  const seasons = [...asArray(anime.seasons)];
  for (let i = seasons.length - 1; i >= 0; i--) {
    const url = seasons[i]?.posterUrl?.trim();
    if (url) return url;
  }
  return anime.posterUrl || '';
};

export const normalizeAnimeDraft = (value: Anime): Anime => ({
  ...value,
  openingSongs: asArray(value.openingSongs),
  endingSongs: asArray(value.endingSongs),
  genres: asArray(value.genres),
  seasons: asArray(value.seasons).map((season, idx) => ({
    ...season,
    id: String(season.id || `season-${idx}-${Date.now()}`),
    seasonTitle: season.seasonTitle || '',
    openingSongs: asArray(season.openingSongs),
    endingSongs: asArray(season.endingSongs),
    genres: asArray(season.genres),
    episodes: asArray(season.episodes),
  })),
});
