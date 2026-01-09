
import { Artist, Concert, Status, TICKET_TRACK_STATUSES, TOUR_ACTIVE_STATUSES, PageId, GlobalSettings, DueAction, CalendarEvent, CalendarEventType } from './types';
import { TEXT } from '../ui/constants';

/**
 * ===== Date Parsing Rules =====
 */
export const parseConcertDate = (dateStr: string | null | undefined, type: 'CONCERT' | 'NORMAL'): Date | null => {
  if (!dateStr || dateStr === TEXT.GLOBAL.TBD) return null;
  
  // If it has a time part
  if (dateStr.includes(' ')) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  
  // Date only YYYY-MM-DD
  const [y, m, d] = dateStr.split('-').map(Number);
  if (type === 'CONCERT') {
    return new Date(y, m - 1, d, 21, 0, 0); // Rule: 21:00 for concert
  }
  return new Date(y, m - 1, d, 12, 0, 0); // Rule: 12:00 for sale/deadline/result
};

/**
 * ===== Calendar Logic (New Specification) =====
 */

export const EVENT_PRIORITY: Record<CalendarEventType, number> = {
  [TEXT.CALENDAR.EVENT_CONCERT]: 1,
  [TEXT.CALENDAR.EVENT_RESULT]: 2,
  [TEXT.CALENDAR.EVENT_DEADLINE]: 3,
  [TEXT.CALENDAR.EVENT_SALE]: 4,
};

const extractDateAndTime = (str: string | null | undefined): { date: string; time?: string } | null => {
  if (!str || str === TEXT.GLOBAL.TBD) return null;
  const [date, time] = str.split(' ');
  return { date, time: time ? time.substring(0, 5) : undefined };
};

export const buildCalendarEvents = (artists: Artist[], settings: { showAttended: boolean; showSkipped: boolean }): CalendarEvent[] => {
  const events: CalendarEvent[] = [];

  artists.forEach(artist => {
    artist.tours.forEach(tour => {
      tour.concerts.forEach(concert => {
        // Skip based on global visibility settings
        if (!settings.showAttended && concert.status === '参戦済み') return;
        if (!settings.showSkipped && concert.status === '見送') return;

        const title = `${artist.name} / ${tour.name}`;

        // A) 公演
        const cInfo = extractDateAndTime(concert.concertAt || concert.date);
        if (cInfo) {
          events.push({
            dateKey: cInfo.date,
            timeLabel: cInfo.time,
            type: TEXT.CALENDAR.EVENT_CONCERT as CalendarEventType,
            artistId: artist.id,
            tourId: tour.id,
            concertId: concert.id,
            title,
            status: concert.status,
          });
        }

        // B) 抽選結果
        if (concert.status === '抽選中') {
          const rInfo = extractDateAndTime(concert.resultAt);
          if (rInfo) {
            events.push({
              dateKey: rInfo.date,
              timeLabel: rInfo.time,
              type: TEXT.CALENDAR.EVENT_RESULT as CalendarEventType,
              artistId: artist.id,
              tourId: tour.id,
              concertId: concert.id,
              title,
              status: concert.status,
            });
          }
        }

        // C) 発売開始
        if (concert.status === '発売前') {
          const sInfo = extractDateAndTime(concert.saleAt);
          if (sInfo) {
            events.push({
              dateKey: sInfo.date,
              timeLabel: sInfo.time,
              type: TEXT.CALENDAR.EVENT_SALE as CalendarEventType,
              artistId: artist.id,
              tourId: tour.id,
              concertId: concert.id,
              title,
              status: concert.status,
            });
          }
        }

        // D) 申込締切
        if (concert.status === '検討中') {
          const dInfo = extractDateAndTime(concert.deadlineAt);
          if (dInfo) {
            events.push({
              dateKey: dInfo.date,
              timeLabel: dInfo.time,
              type: TEXT.CALENDAR.EVENT_DEADLINE as CalendarEventType,
              artistId: artist.id,
              tourId: tour.id,
              concertId: concert.id,
              title,
              status: concert.status,
            });
          }
        }
      });
    });
  });

  return events;
};

/**
 * ===== DueAction Determination Logic =====
 */
export const getDueAction = (concert: Concert, now: Date = new Date()): DueAction | null => {
  const saleTime = parseConcertDate(concert.saleAt, 'NORMAL');
  const deadlineTime = parseConcertDate(concert.deadlineAt, 'NORMAL');
  const resultTime = parseConcertDate(concert.resultAt, 'NORMAL');
  const concertTime = parseConcertDate(concert.concertAt, 'CONCERT');

  switch (concert.status) {
    case '発売前':
      if (saleTime && now >= saleTime) return 'ASK_BUY_AT_SALE';
      return null;
    
    case '検討中':
      if (deadlineTime && now >= deadlineTime) return 'ASK_BUY_AT_DEADLINE';
      if (!deadlineTime) return 'NEED_SET_DEADLINE_AT';
      return null;
    
    case '抽選中':
      if (resultTime && now >= resultTime) return 'ASK_RESULT';
      if (!resultTime) return 'NEED_SET_RESULT_AT';
      return null;
    
    case '参戦予定':
      if (!concertTime) return 'NEED_SET_CONCERT_AT';
      return null;
    
    default:
      return null;
  }
};

/**
 * ===== Automatic Advancement (Requirement 6) =====
 */
export const autoAdvanceConcertStatus = (concert: Concert, now: Date = new Date()): Concert => {
  if (concert.status === '参戦予定') {
    const concertTime = parseConcertDate(concert.concertAt, 'CONCERT');
    if (concertTime && now >= concertTime) {
      return { ...concert, status: '参戦済み' };
    }
  }
  return concert;
};

/**
 * ===== Decision Application (Requirement 5) =====
 */
export const applyDecision = (
  concert: Concert, 
  decision: 'BUY' | 'CONSIDER' | 'SKIP' | 'WON' | 'LOST', 
  payload?: { lotteryName?: string; resultAt?: string; concertAt?: string }
): Concert => {
  switch (decision) {
    case 'BUY':
      return { 
        ...concert, 
        status: '抽選中', 
        lotteryName: payload?.lotteryName ?? concert.lotteryName,
        resultAt: payload?.resultAt ?? concert.resultAt 
      };
    case 'CONSIDER':
      return { ...concert, status: '検討中' };
    case 'SKIP':
      return { ...concert, status: '見送', lotteryResult: null };
    case 'WON':
      return { 
        ...concert, 
        status: '参戦予定', 
        lotteryResult: 'WON',
        concertAt: payload?.concertAt ?? (concert.concertAt || concert.date)
      };
    case 'LOST':
      return { ...concert, status: '見送', lotteryResult: 'LOST' };
    default:
      return concert;
  }
};

/**
 * ===== Artist status logic =====
 */
const ARTIST_SUB_STATUS_ORDER: Status[] = ['発売前', '検討中', '抽選中', '参戦予定', '参戦済み', '見送'];
const ARTIST_SUB_STATUS_PRIORITY: Record<Status, number> = {
  '発売前': 0, '検討中': 1, '抽選中': 2, '参戦予定': 3, '参戦済み': 4, '見送': 5,
};

const pickArtistSubStatus = (concerts: Concert[]): Status | null => {
  const candidates = concerts
    .map(c => c.status)
    .filter((s): s is Status => ARTIST_SUB_STATUS_ORDER.includes(s));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => ARTIST_SUB_STATUS_PRIORITY[a] - ARTIST_SUB_STATUS_PRIORITY[b]);
  return candidates[0] ?? null;
};

export const calcArtistStatus = (artist: Artist): {
  main: string;
  sub: Status | null;
} => {
  const allConcerts = artist.tours.flatMap(t => t.concerts);
  const hasActiveTour = allConcerts.some(c => TOUR_ACTIVE_STATUSES.includes(c.status));
  let main: string = TEXT.ARTIST_STATUS.MAIN_NONE;
  if (hasActiveTour) main = TEXT.ARTIST_STATUS.MAIN_TOURING;
  else if (artist.autoTrackConcerts) main = TEXT.ARTIST_STATUS.MAIN_TRACKING;
  const sub = main === TEXT.ARTIST_STATUS.MAIN_TOURING ? pickArtistSubStatus(allConcerts) : null;
  return { main, sub };
};

export const sortArtistsForDisplay = (artists: Artist[], sortMode: 'manual' | 'status'): Artist[] => {
  if (sortMode === 'manual') return [...artists];
  return [...artists].sort((a, b) => {
    const prioA = getArtistPriority(a);
    const prioB = getArtistPriority(b);
    if (prioA.main !== prioB.main) return prioA.main - prioB.main;
    if (prioA.sub !== prioB.sub) return prioA.sub - prioB.sub;
    return a.name.localeCompare(b.name);
  });
};

const getArtistPriority = (artist: Artist) => {
  const status = calcArtistStatus(artist);
  if (status.main === TEXT.ARTIST_STATUS.MAIN_TOURING) return { main: 1, sub: status.sub ? ARTIST_SUB_STATUS_PRIORITY[status.sub] : 99 };
  if (status.main === TEXT.ARTIST_STATUS.MAIN_TRACKING) return { main: 2, sub: 0 };
  return { main: 3, sub: 0 };
};

/**
 * ===== Concert sorting logic =====
 */
const getConcertStatusPriority = (status: Status): number => {
  if (TICKET_TRACK_STATUSES.includes(status)) return 1;
  if (status === '参戦予定') return 2;
  if (status === '参戦済み') return 3;
  if (status === '見送') return 4;
  return 99;
};

export const getBestStatusForDay = (concerts: Concert[]): Status | null => {
  const dated = concerts.filter(c => c.date !== TEXT.GLOBAL.TBD || c.concertAt);
  if (dated.length === 0) return null;
  return [...dated].sort((a, b) => getCalendarStatusWeight(b.status) - getCalendarStatusWeight(a.status))[0].status;
};

const getCalendarStatusWeight = (status: Status): number => {
  switch (status) {
    case '参戦予定': return 100;
    case '抽選中': return 90;
    case '検討中': return 80;
    case '発売前': return 70;
    case '参戦済み': return 60;
    case '見送': return 50;
    default: return 0;
  }
};

export const sortPerformancesForDisplay = (concerts: Concert[]): Concert[] => {
  return [...concerts].sort((a, b) => {
    const prioA = getConcertStatusPriority(a.status);
    const prioB = getConcertStatusPriority(b.status);
    if (prioA !== prioB) return prioA - prioB;
    const dateA = a.concertAt || a.date;
    const dateB = b.concertAt || b.date;
    if (dateA !== TEXT.GLOBAL.TBD && dateB === TEXT.GLOBAL.TBD) return -1;
    if (dateA === TEXT.GLOBAL.TBD && dateB !== TEXT.GLOBAL.TBD) return 1;
    if (dateA !== TEXT.GLOBAL.TBD && dateB !== TEXT.GLOBAL.TBD) return dateA.localeCompare(dateB);
    return 0;
  });
};

export const sortPerformancesByLotteryDate = (concerts: Concert[]): Concert[] => {
  const getMilestoneDate = (c: Concert) => {
    if (c.status === '抽選中') return c.resultAt;
    if (c.status === '検討中') return c.deadlineAt;
    if (c.status === '発売前') return c.saleAt;
    return null;
  };

  return [...concerts].sort((a, b) => {
    const dateA = getMilestoneDate(a);
    const dateB = getMilestoneDate(b);
    
    // Items with milestone dates come first
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;
    if (dateA && dateB) return dateA.localeCompare(dateB);
    
    // Fallback to concert date
    const cA = a.concertAt || a.date;
    const cB = b.concertAt || b.date;
    if (cA !== TEXT.GLOBAL.TBD && cB !== TEXT.GLOBAL.TBD) return cA.localeCompare(cB);
    if (cA !== TEXT.GLOBAL.TBD) return -1;
    if (cB !== TEXT.GLOBAL.TBD) return 1;
    return 0;
  });
};

export const checkGlobalDateConflicts = (allArtists: Artist[], currentTourId: string, formConcerts: Concert[]): string[] => {
  const otherDates = new Set<string>();
  allArtists.forEach(artist => artist.tours.forEach(tour => {
    if (tour.id === currentTourId) return;
    tour.concerts.forEach(concert => {
      const d = concert.concertAt || concert.date;
      if (d !== TEXT.GLOBAL.TBD && d) otherDates.add(d.split(' ')[0]);
    });
  }));
  const conflicts = new Set<string>();
  const currentDatesInForm = new Set<string>();
  formConcerts.forEach(c => {
    const d = c.concertAt || c.date;
    if (d === TEXT.GLOBAL.TBD || !d) return;
    const dateOnly = d.split(' ')[0];
    if (otherDates.has(dateOnly) || currentDatesInForm.has(dateOnly)) conflicts.add(dateOnly);
    currentDatesInForm.add(dateOnly);
  });
  return Array.from(conflicts);
};

export const getTrackTargetConcerts = (artist: Artist, settings: GlobalSettings, now: Date = new Date()): Concert[] => {
  const n = settings.autoTrackIntervalDays;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const limitStart = new Date(todayStart.getTime() - n * 24 * 60 * 60 * 1000);
  return artist.tours.flatMap(tour => tour.concerts).filter(concert => {
    if (!TICKET_TRACK_STATUSES.includes(concert.status)) return false;
    const d = concert.concertAt || concert.date;
    if (d === TEXT.GLOBAL.TBD || !d) return false;
    const concertDate = new Date(d);
    return concertDate >= limitStart && concertDate <= todayStart;
  });
};

export const shouldTriggerAutoTrack = (lastCheckedAt: string | undefined, settings: GlobalSettings, now: Date = new Date()): boolean => {
  if (!lastCheckedAt) return true;
  const diffDays = (now.getTime() - new Date(lastCheckedAt).getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= settings.autoTrackIntervalDays;
};
