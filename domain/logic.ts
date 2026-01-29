
import { Artist, Concert, Status, TICKET_TRACK_STATUSES, TOUR_ACTIVE_STATUSES, GlobalSettings, DueAction, CalendarEvent, CalendarEventType } from './types';
import { TEXT } from '../ui/constants';
import { bulkPutImageUrls, bulkGetImageUrls } from './imageStore';

/**
 * ===== Date Parsing Rules =====
 * iOS Safari compatibility: replaces '-' with '/' for broad support
 */
export const parseConcertDate = (dateStr: string | null | undefined, type: 'CONCERT' | 'NORMAL'): Date | null => {
  if (!dateStr || dateStr === TEXT.GLOBAL.TBD) return null;
  
  // Standardize format for iOS: "2023-10-27" -> "2023/10/27"
  const standardizedStr = dateStr.replace(/-/g, '/');
  
  const d = new Date(standardizedStr);
  if (isNaN(d.getTime())) {
    try {
      const parts = dateStr.split(' ');
      const dateParts = parts[0].split('-').map(Number);
      if (parts.length > 1) {
        const timeParts = parts[1].split(':').map(Number);
        return new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1] || 0);
      }
      if (type === 'CONCERT') {
        return new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 21, 0, 0);
      }
      return new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 12, 0, 0);
    } catch (e) {
      return null;
    }
  }

  if (!dateStr.includes(' ')) {
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();
    if (type === 'CONCERT') {
      return new Date(y, m, day, 21, 0, 0);
    }
    return new Date(y, m, day, 12, 0, 0);
  }

  return d;
};

export const EVENT_PRIORITY: Record<CalendarEventType, number> = {
  [TEXT.CALENDAR.EVENT_CONCERT]: 1,
  [TEXT.CALENDAR.EVENT_RESULT]: 2,
  [TEXT.CALENDAR.EVENT_DEADLINE]: 3,
  [TEXT.CALENDAR.EVENT_SALE]: 4,
};

const extractDateAndTime = (str: string | null | undefined): { date: string; time?: string } | null => {
  if (!str || str === TEXT.GLOBAL.TBD) return null;
  const parts = str.split(' ');
  return { date: parts[0], time: parts[1] ? parts[1].substring(0, 5) : undefined };
};

export const buildCalendarEvents = (artists: Artist[], settings: { showAttended: boolean; showSkipped: boolean }): CalendarEvent[] => {
  const events: CalendarEvent[] = [];

  artists.forEach(artist => {
    artist.tours.forEach(tour => {
      tour.concerts.forEach(concert => {
        if (!settings.showAttended && concert.status === '参戦済み') return;
        if (!settings.showSkipped && concert.status === '見送') return;

        const title = `${artist.name} / ${tour.name}`;

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

export const autoAdvanceConcertStatus = (concert: Concert, now: Date = new Date()): Concert => {
  if (concert.status === '参戦予定') {
    const concertTime = parseConcertDate(concert.concertAt, 'CONCERT');
    if (concertTime && now >= concertTime) {
      return { ...concert, status: '参戦済み' };
    }
  }
  return concert;
};

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

const getTrackSuffix = (artist: Artist): string => {
  const activeLinks = (artist.links || []).filter(l => l.autoTrack);
  if (activeLinks.length === 0) return "";
  
  const hasSupported = activeLinks.some(l => l.trackCapability === 'supported');
  if (hasSupported) return "（可）";
  
  const hasUnsupported = activeLinks.some(l => l.trackCapability === 'unsupported');
  if (hasUnsupported) return "（不可）";
  
  return "";
};

export const calcArtistStatus = (artist: Artist): {
  main: string;
  sub: Status | null;
  trackSuffix: string;
} => {
  const allConcerts = artist.tours.flatMap(t => t.concerts);
  const hasActiveTour = allConcerts.some(c => TOUR_ACTIVE_STATUSES.includes(c.status));
  let main: string = TEXT.ARTIST_STATUS.MAIN_NONE;

  if (hasActiveTour) {
    main = TEXT.ARTIST_STATUS.MAIN_TOURING;
  } else if (artist.autoTrackConcerts || artist.autoTrackTickets || (artist.links || []).some(l => l.autoTrack)) {
    main = TEXT.ARTIST_STATUS.MAIN_TRACKING;
  }
  
  const sub = main === TEXT.ARTIST_STATUS.MAIN_TOURING ? pickArtistSubStatus(allConcerts) : null;
  const trackSuffix = (main === TEXT.ARTIST_STATUS.MAIN_TRACKING || main === TEXT.ARTIST_STATUS.MAIN_TOURING) 
    ? getTrackSuffix(artist) 
    : "";

  return { main, sub, trackSuffix };
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
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;
    if (dateA && dateB) return dateA.localeCompare(dateB);
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
    const standardized = d.replace(/-/g, '/');
    const concertDate = new Date(standardized);
    return concertDate >= limitStart && concertDate <= todayStart;
  });
};

export const shouldTriggerAutoTrack = (lastCheckedAt: string | undefined, settings: GlobalSettings, now: Date = new Date()): boolean => {
  if (!lastCheckedAt) return true;
  const diffDays = (now.getTime() - new Date(lastCheckedAt.replace(/-/g, '/')).getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= settings.autoTrackIntervalDays;
};

export const migrateAlbumImagesToIndexedDB = async (artists: Artist[]): Promise<Artist[]> => {
  const nextArtists: Artist[] = artists.map(a => ({ ...a, tours: a.tours.map(t => ({ ...t, concerts: t.concerts.map(c => ({ ...c })) })) }));
  for (const artist of nextArtists) {
    for (const tour of artist.tours) {
      for (const concert of tour.concerts) {
        const hasIds = Array.isArray((concert as any).imageIds) && (concert as any).imageIds.length > 0;
        const legacyUrls = Array.isArray((concert as any).images) ? (concert as any).images as string[] : [];
        if (!hasIds && legacyUrls.length > 0) {
          const ids = await bulkPutImageUrls(legacyUrls);
          (concert as any).imageIds = ids;
        }
        delete (concert as any).images;
      }
    }
  }
  return nextArtists;
};

export const expandAlbumImagesForExport = async (artists: Artist[]): Promise<any> => {
  const allIds: string[] = [];
  artists.forEach(a => a.tours.forEach(t => t.concerts.forEach(c => {
    const ids = (c as any).imageIds as string[] | undefined;
    if (ids && ids.length) allIds.push(...ids);
  })));

  const map = await bulkGetImageUrls(allIds);

  return artists.map(a => ({
    ...a,
    tours: a.tours.map(t => ({
      ...t,
      concerts: t.concerts.map(c => {
        const ids = (c as any).imageIds as string[] | undefined;
        const images = ids ? ids.map(id => map[id]).filter(Boolean) : [];
        const out: any = { ...c, images };
        delete out.imageIds;
        return out;
      })
    }))
  }));
};
