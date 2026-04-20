import dayjs from 'dayjs';
import { CalendarEvent, CalendarEventType, Exhibition, ExhibitionStatus } from './types';
import { EVENT_PRIORITY, getEffectiveExhibitionStatus } from './logic';
import { TEXT } from '../ui/constants';
import { theme } from '../ui/theme';

export type CalendarMode = 'concert' | 'exhibition' | 'movie';

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
  展覧会: theme.colors.primary,
  映画: '#8B5CF6',
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

export const getMovieDotColor = (status: string): string => {
  switch (status) {
    case '未上映': return '#9CA3AF';
    case '発売前': return theme.colors.status['発売前'];
    case '抽選中': return theme.colors.status['抽選中'];
    case '上映中': return '#53BEE8';
    case '鑑賞予定': return '#3B82F6';
    case '鑑賞済み': return '#A6DFF7';
    case '見送り':
    case '上映終了': return '#6B7280';
    default: return '#94A3B8';
  }
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
  if (mode === 'concert' || mode === 'movie') {
    const list = musicEventMap.get(selectedDateKey) || [];
    return [...list].sort((a, b) => {
      if (a.timeLabel && !b.timeLabel) return -1;
      if (!a.timeLabel && b.timeLabel) return 1;
      if (a.timeLabel && b.timeLabel) {
        const timeCmp = a.timeLabel.localeCompare(b.timeLabel);
        if (timeCmp !== 0) return timeCmp;
      }
      return EVENT_PRIORITY[a.type] - EVENT_PRIORITY[b.type];
    });
  }
  return getExhibitionsForDay(selectedDateKey, exhibitions);
};

export const getWeekLabels = (weekStart: 'sun' | 'mon') => (
  weekStart === 'sun'
    ? [TEXT.CALENDAR.WEEK_SUN, TEXT.CALENDAR.WEEK_MON, TEXT.CALENDAR.WEEK_TUE, TEXT.CALENDAR.WEEK_WED, TEXT.CALENDAR.WEEK_THU, TEXT.CALENDAR.WEEK_FRI, TEXT.CALENDAR.WEEK_SAT]
    : [TEXT.CALENDAR.WEEK_MON, TEXT.CALENDAR.WEEK_TUE, TEXT.CALENDAR.WEEK_WED, TEXT.CALENDAR.WEEK_THU, TEXT.CALENDAR.WEEK_FRI, TEXT.CALENDAR.WEEK_SAT, TEXT.CALENDAR.WEEK_SUN]
);
