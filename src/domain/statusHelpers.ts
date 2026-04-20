import { Movie } from './types';
import { theme } from '../ui/theme';

export const formatCompactDate = (dateStr: string) => {
  if (!dateStr) return '';
  const normalized = dateStr.replace('T', ' ');
  const parts = normalized.split(' ')[0].split('-');
  if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
  return normalized;
};

export const toDateTimeLocal = (value?: string) => (value ? value.replace(' ', 'T').slice(0, 16) : '');
export const fromDateTimeLocal = (value: string) => value.replace('T', ' ');

export const parseMovieFlexibleDate = (value?: string): Date | null => {
  if (!value) return null;

  const normalized = String(value)
    .trim()
    .replace(/T/g, ' ')
    .replace(/\./g, '/')
    .replace(/-/g, '/');

  const full = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (full) {
    const [, y, m, d, hh = '0', mm = '0'] = full;
    const dt = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const partial = normalized.match(/^(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (partial) {
    const [, m, d, hh = '0', mm = '0'] = partial;
    const year = new Date().getFullYear();
    const dt = new Date(year, Number(m) - 1, Number(d), Number(hh), Number(mm), 0, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const fallback = new Date(normalized);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

export const getMovieSaleStart = (movie: Movie): string => movie.saleAt || movie.releaseDate || '';
export const getMovieLotteryResultAt = (movie: Movie): string => movie.lotteryResultAt || '';

export const getMovieStatusTone = (status: string, displayStatus?: string) => {
  switch (status) {
    case '未上映':
      return { color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', label: displayStatus || '未上映' };
    case '発売前':
      return { color: theme.colors.status['発売前'], bg: theme.colors.badges.processing.bg, label: displayStatus || '発売前' };
    case '抽選中':
      return { color: theme.colors.status['抽選中'], bg: theme.colors.badges.lottery.bg, label: displayStatus || '抽選中' };
    case '上映中':
      return { color: theme.colors.primary, bg: 'rgba(83,190,232,0.12)', label: displayStatus || '上映中' };
    case '鑑賞予定':
      return { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', label: displayStatus || '鑑賞予定' };
    case '鑑賞済み':
      return { color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: displayStatus || '鑑賞済み' };
    case '見送り':
      return { color: theme.colors.textSecondary, bg: 'rgba(107,114,128,0.10)', label: displayStatus || '見送り' };
    default:
      return { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', label: displayStatus || '上映終了' };
  }
};

export const getMovieMetaLabel = (movie: Movie) => {
  if (movie.status === '抽選中') return '結果日';
  if (movie.status === '発売前') return '発売日';
  if (movie.status === '鑑賞予定') return '鑑賞予定';
  if (movie.watchDate) return '鑑賞日';
  return '公開日';
};

export const getMovieMetaValue = (movie: Movie) => {
  if (movie.status === '抽選中') return formatCompactDate(getMovieLotteryResultAt(movie) || '');
  if (movie.status === '発売前') return formatCompactDate(getMovieSaleStart(movie) || '');
  return formatCompactDate(movie.watchDate || movie.releaseDate || '');
};

export type MovieActionKind = 'sale' | 'lottery' | 'screening' | null;

export const getMovieActionKind = (movie: Movie, now: Date = new Date()): MovieActionKind => {
  if (movie.status === '発売前') {
    const saleStart = parseMovieFlexibleDate(getMovieSaleStart(movie));
    if (saleStart && now >= saleStart) return 'sale';
    return null;
  }

  if (movie.status === '抽選中') {
    const resultAt = parseMovieFlexibleDate(getMovieLotteryResultAt(movie));
    if (resultAt && now >= resultAt) return 'lottery';
    return null;
  }

  if (movie.status === '上映中' || movie.status === '鑑賞予定') {
    return 'screening';
  }

  return null;
};
