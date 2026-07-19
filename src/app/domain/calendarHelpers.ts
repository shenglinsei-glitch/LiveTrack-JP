import dayjs from 'dayjs';
import { CalendarEvent, CalendarEventType, Exhibition, ExhibitionStatus } from '@/domain/types';
import { EVENT_PRIORITY, getEffectiveExhibitionStatus } from '@/domain/logic';
import { TEXT } from '@/components/common/constants';
import { theme } from '@/components/common/theme';
import { getAnimeStatusColor } from '@/utils/animeStatusHelpers';

export type CalendarMode = 'all' | 'concert' | 'exhibition' | 'movie' | 'anime' | 'gacha';

export const exhibitionPriorityMap: Record<ExhibitionStatus, number> = {
  PLANNED: 1,
  RESERVED: 2,
  NONE: 3,
  VISITED: 4,
  SKIPPED: 5,
  ENDED: 6,
};

export const typeColorMap: Record<CalendarEventType, string> = {
  [TEXT.CALENDAR.EVENT_CONCERT]: theme.colors.status['参戦予定'],
  [TEXT.CALENDAR.EVENT_RESULT]: theme.colors.status['抽選中'],
  [TEXT.CALENDAR.EVENT_DEADLINE]: theme.colors.status['検討中'],
  [TEXT.CALENDAR.EVENT_SALE]: theme.colors.status['発売前'],
  展覧: theme.colors.primary,
  映画: '#8B5CF6',
  アニメ: theme.colors.primary,
  ガチャ: theme.colors.status['抽選中'],
};

const CONCERT_DOT_COLOR_UNDECIDED = '#377D99';
const CONCERT_DOT_COLOR_SKIPPED = '#6B7280';

export const isConcertType = (t: CalendarEventType | string): boolean => t === TEXT.CALENDAR.EVENT_CONCERT || t === '公演';

export const getConcertDotColor = (status: string): string => {
  if (status === '参戦予定' || status === '参戦済み') return theme.colors.status['参戦予定'];
  if (status === '抽選中' || status === '発売前' || status === '検討中') return CONCERT_DOT_COLOR_UNDECIDED;
  if (status === '見送' || status === '見送り') return CONCERT_DOT_COLOR_SKIPPED;
  return CONCERT_DOT_COLOR_UNDECIDED;
};

export const getAnimeDotColor = (status: string): string => getAnimeStatusColor(status);

export const getMovieDotColor = (status: string): string => {
  switch (status) {
    case '未上映': return theme.colors.textWeak;
    case '発売前': return theme.colors.status['発売前'];
    case '抽選中': return theme.colors.status['抽選中'];
    case '上映中': return theme.colors.status['参戦予定'];
    case '鑑賞予定': return theme.colors.status['参戦予定'];
    case '鑑賞済み': return theme.colors.status['参戦済み'];
    case '見送り': return theme.colors.status['見送'];
    case '上映終了': return theme.colors.textWeak;
    default: return theme.colors.textWeak;
  }
};

export const isNonParticipatingStatus = (status: string | null | undefined): boolean => {
  const normalized = String(status || '').trim();
  return normalized === '見送'
    || normalized === '見送り'
    || normalized === '視聴中止'
    || normalized === 'SKIPPED'
    || normalized === '落選';
};

export const isNonParticipatingCalendarEvent = (event: Pick<CalendarEvent, 'status'>): boolean => {
  return isNonParticipatingStatus(event.status);
};

export const getExhibitionDotColor = (status: string): string => {
  if (isNonParticipatingStatus(status)) return theme.colors.status['見送'];

  switch (status) {
    case '鑑賞予定': return theme.colors.status['参戦予定'];
    case '鑑賞済み': return theme.colors.status['参戦済み'];
    case '開催終了': return theme.colors.textWeak;
    case '開催開始':
    default:
      return theme.colors.primary;
  }
};

export const getGachaDotColor = (status: string): string => {
  if (isNonParticipatingStatus(status)) return theme.colors.status['見送'];

  switch (status) {
    case '発売日':
    case '発売前':
      return theme.colors.status['発売前'];
    case '抽選予定':
      return theme.colors.status['参戦予定'];
    case '抽選済み':
      return theme.colors.primary;
    case '一部売却済み':
      return theme.colors.status['抽選中'];
    case '完了':
      return theme.colors.status['参戦済み'];
    default:
      return typeColorMap['ガチャ'];
  }
};

export const getCalendarEventDotColor = (event: Pick<CalendarEvent, 'type' | 'status'>): string => {
  if (isNonParticipatingCalendarEvent(event)) return theme.colors.status['見送'];
  if (event.type === '映画') return getMovieDotColor(event.status);
  if (event.type === 'アニメ') return getAnimeDotColor(event.status);
  if (event.type === '展覧') return getExhibitionDotColor(event.status);
  if (event.type === 'ガチャ') return getGachaDotColor(event.status);
  if (isConcertType(event.type)) return getConcertDotColor(event.status);
  return typeColorMap[event.type] || theme.colors.primary;
};

export const buildMusicEventMap = (events: CalendarEvent[]): Map<string, CalendarEvent[]> => {
  const map = new Map<string, CalendarEvent[]>();
  events.forEach((ev) => {
    const list = map.get(ev.dateKey) || [];
    list.push(ev);
    map.set(ev.dateKey, list);
  });
  return map;
};

const normalizeCalendarDateKey = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const match = String(raw).match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

const extractCalendarTimeLabel = (raw: string | null | undefined): string | undefined => {
  if (!raw) return undefined;
  const match = String(raw).match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : undefined;
};

export const buildExhibitionMilestoneEvents = (
  exhibitions: Exhibition[],
  settings: { showAttended?: boolean; showSkipped?: boolean } = {}
): CalendarEvent[] => {
  const events: CalendarEvent[] = [];

  const push = (exhibition: Exhibition, rawDate: string | null | undefined, status: string, suffix: string, timeLabel?: string) => {
    const dateKey = normalizeCalendarDateKey(rawDate);
    if (!dateKey) return;

    const effectiveStatus = getEffectiveExhibitionStatus(exhibition);
    const isSkipped = effectiveStatus === 'SKIPPED';
    const isVisited = effectiveStatus === 'VISITED';
    if (isSkipped && settings.showSkipped === false) return;
    if (isVisited && settings.showAttended === false) return;

    events.push({
      dateKey,
      timeLabel: timeLabel || extractCalendarTimeLabel(rawDate),
      type: '展覧',
      artistId: '',
      tourId: '',
      concertId: '',
      exhibitionId: exhibition.id,
      title: `${exhibition.title}${suffix}`,
      status: isSkipped ? '見送り' : status,
    });
  };

  exhibitions.forEach((exhibition) => {
    push(exhibition, exhibition.startDate, '開催開始', '（開始）');
    if (normalizeCalendarDateKey(exhibition.endDate) !== normalizeCalendarDateKey(exhibition.startDate)) {
      push(exhibition, exhibition.endDate, '開催終了', '（終了）');
    }

    const reservedAt = exhibition.reservedAt;
    if (reservedAt) {
      push(exhibition, reservedAt, '鑑賞予定', '（鑑賞予定）');
    }

    const visitedAt = exhibition.visitedAt || (exhibition.visitedAtDate && exhibition.visitTime ? `${exhibition.visitedAtDate} ${exhibition.visitTime}` : exhibition.visitedAtDate);
    if (visitedAt && normalizeCalendarDateKey(visitedAt) !== normalizeCalendarDateKey(reservedAt)) {
      push(exhibition, visitedAt, '鑑賞済み', '（鑑賞済み）', exhibition.visitTime);
    }
  });

  return events;
};

export const getVisibleCalendarEventsForMode = (events: CalendarEvent[], mode: CalendarMode): CalendarEvent[] => {
  if (mode === 'all') return events;
  if (mode === 'movie') return events.filter((ev) => ev.type === '映画');
  if (mode === 'anime') return events.filter((ev) => ev.type === 'アニメ');
  if (mode === 'gacha') return events.filter((ev) => ev.type === 'ガチャ');
  if (mode === 'concert') return events.filter((ev) => ev.type !== '映画' && ev.type !== 'アニメ' && ev.type !== '展覧' && ev.type !== 'ガチャ');
  return events.filter((ev) => ev.type === '展覧');
};

export const getExhibitionsForDay = (dateKey: string, exhibitions: Exhibition[]): Exhibition[] => {
  const day = dayjs(dateKey).startOf('day');
  return exhibitions
    .filter((ex) => {
      const start = dayjs(ex.startDate).startOf('day');
      const end = dayjs(ex.endDate).endOf('day');
      return (day.isAfter(start) || day.isSame(start)) && (day.isBefore(end) || day.isSame(end));
    })
    .sort((a, b) => {
      const prioA = exhibitionPriorityMap[getEffectiveExhibitionStatus(a)] || 99;
      const prioB = exhibitionPriorityMap[getEffectiveExhibitionStatus(b)] || 99;
      if (prioA !== prioB) return prioA - prioB;
      return dayjs(a.startDate).unix() - dayjs(b.startDate).unix();
    });
};

export const buildCalendarWeeks = (currentDate: Date, weekStart: 'sun' | 'mon') => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstOfMonth = dayjs(new Date(year, month, 1));
  const daysInMonth = firstOfMonth.daysInMonth();
  const firstDayIndex = firstOfMonth.day();
  const startOffset = weekStart === 'sun' ? firstDayIndex : firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const cells: Array<{ day: number | null; dateKey: string | null }> = [];
  for (let i = 0; i < startOffset; i++) cells.push({ day: null, dateKey: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, dateKey });
  }

  const weeks: Array<Array<{ day: number | null; dateKey: string | null }>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
};

export const getTodayKey = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

export const getSelectedDayEvents = (
  selectedDateKey: string | null,
  mode: CalendarMode,
  musicEventMap: Map<string, CalendarEvent[]>,
  exhibitions: Exhibition[]
) => {
  if (!selectedDateKey) return [] as Array<CalendarEvent | Exhibition>;
  if (mode === 'concert' || mode === 'movie' || mode === 'anime' || mode === 'all' || mode === 'gacha') {
    const list = getVisibleCalendarEventsForMode(musicEventMap.get(selectedDateKey) || [], mode);
    return [...list].sort((a, b) => {
      if (a.timeLabel && !b.timeLabel) return -1;
      if (!a.timeLabel && b.timeLabel) return 1;
      if (a.timeLabel && b.timeLabel) {
        const timeCmp = a.timeLabel.localeCompare(b.timeLabel);
        if (timeCmp !== 0) return timeCmp;
      }
      const priorityCmp = EVENT_PRIORITY[a.type] - EVENT_PRIORITY[b.type];
      if (priorityCmp !== 0) return priorityCmp;
      return a.title.localeCompare(b.title, 'ja');
    });
  }
  return getExhibitionsForDay(selectedDateKey, exhibitions);
};

export const getWeekLabels = (weekStart: 'sun' | 'mon') => (
  weekStart === 'sun'
    ? [TEXT.CALENDAR.WEEK_SUN, TEXT.CALENDAR.WEEK_MON, TEXT.CALENDAR.WEEK_TUE, TEXT.CALENDAR.WEEK_WED, TEXT.CALENDAR.WEEK_THU, TEXT.CALENDAR.WEEK_FRI, TEXT.CALENDAR.WEEK_SAT]
    : [TEXT.CALENDAR.WEEK_MON, TEXT.CALENDAR.WEEK_TUE, TEXT.CALENDAR.WEEK_WED, TEXT.CALENDAR.WEEK_THU, TEXT.CALENDAR.WEEK_FRI, TEXT.CALENDAR.WEEK_SAT, TEXT.CALENDAR.WEEK_SUN]
);
