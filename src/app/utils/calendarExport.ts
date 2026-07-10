import { Artist, Exhibition, Movie } from '@/domain/types';

export type CalendarExportMode = 'concert' | 'exhibition' | 'movie' | 'anime';

export interface CalendarExportItem {
  id: string;
  title: string;
  location: string;
  startAt: string; // local datetime: YYYY-MM-DDTHH:mm:ss
  endAt: string;   // local datetime: YYYY-MM-DDTHH:mm:ss
  category: string;
}

export const CALENDAR_EXPORT_FILE_NAME = 'FaveArchive_calendar.ics';
const CALENDAR_EXPORT_HISTORY_STORAGE_KEY = 'favearchive.calendarExport.history.v1';
const DEFAULT_EXHIBITION_TIME = '14:00';

const pad2 = (value: number | string) => String(value).padStart(2, '0');

const normalizeDateKey = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const match = String(raw).match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  return `${y}-${pad2(m)}-${pad2(d)}`;
};

const normalizeTime = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const match = String(raw).match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${pad2(hour)}:${pad2(minute)}`;
};

const makeLocalDateTime = (dateKey: string, time: string): string => {
  const safeTime = normalizeTime(time) || '00:00';
  return `${dateKey}T${safeTime}:00`;
};

const parseLocalDateTime = (value: string): Date => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return new Date(value);
  const [, y, m, d, hh, mm, ss] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss || 0));
};

const toLocalDateTimeString = (date: Date): string => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
};

const addMinutes = (startAt: string, minutes: number): string => {
  const date = parseLocalDateTime(startAt);
  date.setMinutes(date.getMinutes() + minutes);
  return toLocalDateTimeString(date);
};

const formatIcsLocalDateTime = (value: string): string => {
  const date = parseLocalDateTime(value);
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}T${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
};

const formatIcsUtcDateTime = (date: Date): string => {
  return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`;
};

const escapeIcsText = (text: string): string => {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
};

const getOnlineLocation = (url?: string | null, fallback?: string | null): string => {
  const fallbackText = (fallback || '').trim();
  if (fallbackText) return fallbackText;
  if (url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return 'オンライン';
    }
  }
  return 'オンライン';
};

const makeItem = (input: {
  id: string;
  title: string;
  location?: string | null;
  dateKey: string;
  time: string;
  durationMinutes: number;
  category: string;
  endTime?: string | null;
}): CalendarExportItem | null => {
  const time = normalizeTime(input.time);
  if (!time) return null;
  const startAt = makeLocalDateTime(input.dateKey, time);
  const endTime = normalizeTime(input.endTime);
  let endAt = endTime ? makeLocalDateTime(input.dateKey, endTime) : addMinutes(startAt, input.durationMinutes);
  if (parseLocalDateTime(endAt).getTime() <= parseLocalDateTime(startAt).getTime()) {
    endAt = addMinutes(endAt, 24 * 60);
  }
  return {
    id: input.id,
    title: input.title,
    location: input.location?.trim() || '',
    startAt,
    endAt,
    category: input.category,
  };
};

export const getCalendarExportItemDateKey = (item: CalendarExportItem): string => normalizeDateKey(item.startAt) || '';
export const getCalendarExportItemTimeLabel = (item: CalendarExportItem): string => normalizeTime(item.startAt) || '';

export const buildCalendarExportCandidates = (params: {
  dateKey: string | null;
  mode: CalendarExportMode;
  artists: Artist[];
  movies: Movie[];
  selectedExhibitions: Exhibition[];
}): CalendarExportItem[] => {
  const { dateKey, mode, artists, movies, selectedExhibitions } = params;
  if (!dateKey) return [];

  const items: CalendarExportItem[] = [];

  if (mode === 'concert') {
    artists.forEach((artist) => {
      (artist.tours || []).forEach((tour) => {
        (tour.concerts || []).forEach((concert) => {
          const baseTitle = `${artist.name}${tour.name ? ` / ${tour.name}` : ''}`;
          const concertDateKey = normalizeDateKey(concert.concertAt || concert.date);
          const doorTime = normalizeTime(concert.doorTime);
          if (concertDateKey === dateKey && doorTime && concert.status !== '見送') {
            const item = makeItem({
              id: `concert-performance-${artist.id}-${tour.id}-${concert.id}`,
              title: `公演：${baseTitle}`,
              location: concert.venue,
              dateKey,
              time: doorTime,
              durationMinutes: 180,
              category: '公演',
            });
            if (item) items.push(item);
          }

          const resultDateKey = normalizeDateKey(concert.resultAt);
          const resultTime = normalizeTime(concert.resultAt);
          if (resultDateKey === dateKey && resultTime) {
            const item = makeItem({
              id: `concert-result-${artist.id}-${tour.id}-${concert.id}`,
              title: `抽選結果：${baseTitle}`,
              location: getOnlineLocation(concert.saleLink, concert.lotteryName),
              dateKey,
              time: resultTime,
              durationMinutes: 30,
              category: '抽選結果',
            });
            if (item) items.push(item);
          }

          const saleDateKey = normalizeDateKey(concert.saleAt);
          const saleTime = normalizeTime(concert.saleAt);
          if (saleDateKey === dateKey && saleTime) {
            const item = makeItem({
              id: `concert-sale-${artist.id}-${tour.id}-${concert.id}`,
              title: `発売開始：${baseTitle}`,
              location: getOnlineLocation(concert.saleLink),
              dateKey,
              time: saleTime,
              durationMinutes: 30,
              category: '発売開始',
            });
            if (item) items.push(item);
          }
        });
      });
    });
  }

  if (mode === 'movie') {
    movies.forEach((movie) => {
      const location = [movie.theaterName, movie.screenName].filter(Boolean).join(' ');

      const watchDateKey = normalizeDateKey(movie.watchDate);
      const startTime = normalizeTime(movie.startTime);
      if (watchDateKey === dateKey && startTime) {
        const item = makeItem({
          id: `movie-watch-${movie.id}`,
          title: `映画鑑賞：${movie.title}`,
          location,
          dateKey,
          time: startTime,
          endTime: movie.endTime,
          durationMinutes: 120,
          category: '映画鑑賞',
        });
        if (item) items.push(item);
      }

      const resultDateKey = normalizeDateKey(movie.lotteryResultAt);
      const resultTime = normalizeTime(movie.lotteryResultAt);
      if (resultDateKey === dateKey && resultTime) {
        const item = makeItem({
          id: `movie-result-${movie.id}`,
          title: `抽選結果：${movie.title}`,
          location: getOnlineLocation(movie.lotteryUrl, movie.lotteryName),
          dateKey,
          time: resultTime,
          durationMinutes: 30,
          category: '抽選結果',
        });
        if (item) items.push(item);
      }

      const saleDateKey = normalizeDateKey(movie.saleAt);
      const saleTime = normalizeTime(movie.saleAt);
      if (saleDateKey === dateKey && saleTime) {
        const item = makeItem({
          id: `movie-sale-${movie.id}`,
          title: `発売開始：${movie.title}`,
          location: getOnlineLocation(movie.saleLink),
          dateKey,
          time: saleTime,
          durationMinutes: 30,
          category: '発売開始',
        });
        if (item) items.push(item);
      }
    });
  }

  if (mode === 'exhibition') {
    selectedExhibitions.forEach((exhibition) => {
      const item = makeItem({
        id: `exhibition-visit-${exhibition.id}-${dateKey}`,
        title: `展覧鑑賞：${exhibition.title}`,
        location: exhibition.venueName || exhibition.venue || (exhibition.venueTags || []).join('、'),
        dateKey,
        time: DEFAULT_EXHIBITION_TIME,
        durationMinutes: 120,
        category: '展覧鑑賞',
      });
      if (item) items.push(item);
    });
  }

  return items.sort((a, b) => a.startAt.localeCompare(b.startAt) || a.title.localeCompare(b.title));
};

export const readCalendarExportHistory = (): CalendarExportItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CALENDAR_EXPORT_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CalendarExportItem => (
      typeof item?.id === 'string' &&
      typeof item?.title === 'string' &&
      typeof item?.startAt === 'string' &&
      typeof item?.endAt === 'string'
    ));
  } catch {
    return [];
  }
};

export const saveCalendarExportHistory = (items: CalendarExportItem[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CALENDAR_EXPORT_HISTORY_STORAGE_KEY, JSON.stringify(items));
};

export const clearCalendarExportHistory = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CALENDAR_EXPORT_HISTORY_STORAGE_KEY);
};

export const buildMergedCalendarExportItems = (newItems: CalendarExportItem[]): CalendarExportItem[] => {
  const map = new Map<string, CalendarExportItem>();
  readCalendarExportHistory().forEach((item) => map.set(item.id, item));
  newItems.forEach((item) => map.set(item.id, item));
  return Array.from(map.values()).sort((a, b) => a.startAt.localeCompare(b.startAt) || a.title.localeCompare(b.title));
};

export const mergeCalendarExportHistory = (newItems: CalendarExportItem[]): CalendarExportItem[] => {
  const merged = buildMergedCalendarExportItems(newItems);
  saveCalendarExportHistory(merged);
  return merged;
};

export const createCalendarIcsText = (items: CalendarExportItem[]): string => {
  const dtstamp = formatIcsUtcDateTime(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FaveArchive//Calendar Export//JP',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  items.forEach((item) => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${escapeIcsText(item.id)}@favearchive.local`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`SUMMARY:${escapeIcsText(item.title)}`);
    lines.push(`DTSTART;TZID=Asia/Tokyo:${formatIcsLocalDateTime(item.startAt)}`);
    lines.push(`DTEND;TZID=Asia/Tokyo:${formatIcsLocalDateTime(item.endAt)}`);
    if (item.location) lines.push(`LOCATION:${escapeIcsText(item.location)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(item.category)}`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};

export const downloadCalendarIcs = async (items: CalendarExportItem[]) => {
  const icsText = createCalendarIcsText(items);
  const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' });

  // iOS/Safari の PWA では Blob URL を download させると、
  // 共有先側がファイル本体を読み込む前に参照が切れて「読み込み中」のままになることがあります。
  // File 共有が使える環境では、実体を持った File として共有シートに渡します。
  if (typeof navigator !== 'undefined' && typeof File !== 'undefined' && typeof navigator.share === 'function') {
    const file = new File([blob], CALENDAR_EXPORT_FILE_NAME, { type: 'text/calendar' });
    const shareData: ShareData = {
      title: 'FaveArchive Calendar',
      text: CALENDAR_EXPORT_FILE_NAME,
      files: [file],
    };

    if (typeof navigator.canShare !== 'function' || navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if ((error as { name?: string })?.name === 'AbortError') throw error;
        // 共有に失敗した環境では、下の通常ダウンロードへフォールバックします。
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = CALENDAR_EXPORT_FILE_NAME;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // すぐ revoke すると、iOS の「ファイルに保存」や共有先アプリが
  // Blob の読み込みに失敗することがあるため、十分遅らせます。
  window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
};
