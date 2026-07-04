
import { Artist, Concert, Status, TICKET_TRACK_STATUSES, TOUR_ACTIVE_STATUSES, GlobalSettings, DueAction, CalendarEvent, CalendarEventType, Exhibition, LotteryHistoryItem, Movie, Anime, AnimeStatus } from '@/domain/types';
import { TEXT } from '@/components/common/constants';
import { bulkPutImageUrls, bulkGetImageUrls, putImageUrl } from '@/domain/imageStore';

/**
 * ===== Date Parsing Rules =====
 * iOS Safari compatibility: replaces '-' with '/' for broad support
 */
export const parseConcertDate = (dateStr: string | null | undefined, type: 'CONCERT' | 'NORMAL' | 'EXHIBITION'): Date | null => {
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
      if (type === 'EXHIBITION') {
        return new Date(dateParts[0], dateParts[1] - 1, dateParts[2], 10, 0, 0);
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
    if (type === 'EXHIBITION') {
      return new Date(y, m, day, 10, 0, 0);
    }
    return new Date(y, m, day, 12, 0, 0);
  }

  return d;
};


const combineDateAndTimeText = (dateValue: string | null | undefined, timeValue: string | null | undefined): string | null => {
  if (!dateValue || dateValue === TEXT.GLOBAL.TBD) return null;
  const normalized = String(dateValue).trim().replace('T', ' ');
  if (/\d{1,2}:\d{2}/.test(normalized)) return normalized;
  const datePart = normalized.split(' ')[0];
  const time = (timeValue || '').trim();
  return time ? `${datePart} ${time}` : datePart;
};

export const parseConcertEventDateTime = (concert: Pick<Concert, 'concertAt' | 'date' | 'startTime'>): Date | null => {
  const combined = combineDateAndTimeText(concert.concertAt || concert.date, concert.startTime);
  return parseConcertDate(combined, 'CONCERT');
};

export const parseMovieWatchDateTime = (movie: Pick<Movie, 'watchDate' | 'startTime'>): Date | null => {
  const combined = combineDateAndTimeText(movie.watchDate, movie.startTime);
  return parseConcertDate(combined, movie.startTime ? 'NORMAL' : 'CONCERT');
};

export const getEffectiveExhibitionStatus = (exhibition: Exhibition, now: Date = new Date()) => {
  const rawStatus = exhibition.status || 'NONE';
  const start = parseConcertDate(exhibition.startDate, 'EXHIBITION');
  const end = parseConcertDate(exhibition.endDate, 'EXHIBITION');
  const visitedAt = parseConcertDate(exhibition.visitedAt, 'NORMAL');

  if (visitedAt) return 'VISITED' as const;
  if (rawStatus === 'VISITED') return 'VISITED' as const;
  if (rawStatus === 'ENDED') return 'ENDED' as const;

  if (rawStatus === 'SKIPPED') {
    if (end && now > end) return 'ENDED' as const;
    return 'SKIPPED' as const;
  }

  if (rawStatus === 'RESERVED') {
    if (end && now > end) return 'ENDED' as const;
    return 'RESERVED' as const;
  }

  if (start && now < start) return 'NONE' as const;
  if (end && now > end) return 'ENDED' as const;

  return 'PLANNED' as const;
};

export const applyAutoExhibitionStatus = (exhibition: Exhibition, now: Date = new Date()): Exhibition => {
  const nextStatus = getEffectiveExhibitionStatus(exhibition, now);
  if (exhibition.status === nextStatus) return exhibition;
  return { ...exhibition, status: nextStatus };
};

export const EVENT_PRIORITY: Record<CalendarEventType, number> = {
  [TEXT.CALENDAR.EVENT_CONCERT]: 1,
  [TEXT.CALENDAR.EVENT_RESULT]: 2,
  [TEXT.CALENDAR.EVENT_DEADLINE]: 3,
  [TEXT.CALENDAR.EVENT_SALE]: 4,
  // Fix: Added missing '展覧' property to Record
  ['展覧']: 5,
  ['映画']: 6,
  ['アニメ']: 7,
};

const normalizeCalendarDateKey = (raw: string | null | undefined): string | null => {
  if (!raw || raw === TEXT.GLOBAL.TBD) return null;
  const match = raw.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

const extractDateAndTime = (str: string | null | undefined): { date: string; time?: string } | null => {
  if (!str || str === TEXT.GLOBAL.TBD) return null;
  const date = normalizeCalendarDateKey(str);
  if (!date) return null;
  const timeMatch = str.match(/(\d{1,2}:\d{2})/);
  return { date, time: timeMatch ? timeMatch[1] : undefined };
};


const ANIME_STATUS_PRIORITY: Record<AnimeStatus, number> = {
  '視聴中': 1,
  '視聴予定': 2,
  '放送前': 3,
  '保留': 4,
  '視聴済み': 5,
  '視聴中止': 6,
  '見送り': 7,
};

const weekdayToNumber: Record<string, number> = { '日': 0, '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6 };

const deriveAnimeStatus = (anime: Anime): AnimeStatus => {
  const statuses = (anime.seasons || []).map((season: any) => season.status).filter(Boolean) as AnimeStatus[];
  if (!statuses.length) return anime.status || '放送前';
  const order: AnimeStatus[] = ['視聴中', '視聴予定', '保留', '放送前', '視聴済み', '視聴中止', '見送り'];
  return order.find((status) => statuses.includes(status)) || anime.status || '放送前';
};

const looksLikeSeasonNumber = (value?: string) => /^第.+[期季]$|^Season\s*\d+$/i.test(String(value || '').trim());

const getSeasonDisplayTitle = (anime: Anime, season: any): string => {
  if (!season) return anime.title;
  const number = String(season.seasonNumber || (looksLikeSeasonNumber(season.seasonTitle) ? season.seasonTitle : '') || '').trim();
  const title = (season.useAnimeTitle || !String(season.seasonTitle || '').trim() || looksLikeSeasonNumber(season.seasonTitle)) ? anime.title : String(season.seasonTitle || '').trim();
  return number ? `${number} ${title}` : title;
};

const getBroadcastWeekdayFromStart = (startDate?: string): string => {
  const dateKey = normalizeCalendarDateKey(startDate);
  if (!dateKey) return '';
  const d = parseConcertDate(dateKey, 'NORMAL');
  if (!d) return '';
  d.setDate(d.getDate() + 1);
  const labels = ['日', '月', '火', '水', '木', '金', '土'];
  return labels[d.getDay()] || '';
};

export const getAnimeDotColor = (status: string): string => {
  switch (status) {
    case '放送前': return '#2AC69E';
    case '視聴予定': return '#53BEE8';
    case '視聴中': return '#53BEE8';
    case '視聴済み': return '#A6DFF7';
    case '保留': return '#F59E0B';
    case '視聴中止': return '#9CA3AF';
    case '見送り': return '#9CA3AF';
    default: return '#9CA3AF';
  }
};

export const getAnimeNextBroadcastDate = (anime: Anime, now: Date = new Date()): string => {
  const seasons = anime.seasons || [];
  const activeSeason = seasons.find((season: any) => season.status === '視聴中') || seasons.find((season) => season.broadcastWeekday || season.startDate || season.endDate) || seasons[0];
  const weekday = getBroadcastWeekdayFromStart(activeSeason?.startDate || anime.startDate) || activeSeason?.broadcastWeekday || anime.broadcastWeekday || '';
  const time = activeSeason?.broadcastTime || anime.broadcastTime || '';
  const startDate = activeSeason?.startDate || anime.startDate || '';
  const endDate = activeSeason?.endDate || anime.endDate || '';

  if (weekday && weekdayToNumber[weekday] !== undefined) {
    const target = weekdayToNumber[weekday];
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = (target - base.getDay() + 7) % 7;
    const next = new Date(base);
    next.setDate(base.getDate() + diff);
    if (endDate) {
      const end = parseConcertDate(endDate, 'NORMAL');
      if (end && next > end) return endDate;
    }
    const y = next.getFullYear();
    const m = String(next.getMonth() + 1).padStart(2, '0');
    const d = String(next.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}${time ? ` ${time}` : ''}`;
  }

  const status = activeSeason?.status || deriveAnimeStatus(anime);
  if (status === '視聴済み' || status === '視聴中止') return endDate || anime.updatedAt || anime.createdAt || '';
  if (status === '視聴中' || status === '視聴予定') return startDate || endDate || anime.updatedAt || '';
  return startDate || anime.createdAt || '';
};

export const buildCalendarEvents = (artists: Artist[], settings: { showAttended: boolean; showSkipped: boolean }, movies: Movie[] = [], animes: Anime[] = []): CalendarEvent[] => {
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

  (movies || []).forEach(movie => {
    const resolvedStatus = autoAdvanceMovieStatus(movie);

    let info: { date: string; time?: string } | null = null;

    switch (resolvedStatus.status) {
      case '発売前':
        info = extractDateAndTime(resolvedStatus.saleAt || resolvedStatus.deadlineAt);
        break;
      case '抽選中':
        info = extractDateAndTime(resolvedStatus.lotteryResultAt);
        break;
      case '鑑賞予定':
      case '鑑賞済み': {
        const watchSource = resolvedStatus.watchDate
          ? `${resolvedStatus.watchDate}${resolvedStatus.startTime ? ` ${resolvedStatus.startTime}` : ''}`
          : null;
        info = extractDateAndTime(watchSource);
        if (info && resolvedStatus.startTime) info.time = resolvedStatus.startTime;
        break;
      }
      case '見送り':
      case '上映終了':
        info = extractDateAndTime(resolvedStatus.updatedAt || resolvedStatus.releaseDate);
        break;
      case '未上映':
      case '上映中':
      default:
        info = extractDateAndTime(resolvedStatus.releaseDate);
        break;
    }

    if (!info) return;

    events.push({
      dateKey: info.date,
      timeLabel: info.time,
      type: '映画',
      artistId: '',
      tourId: '',
      concertId: '',
      movieId: resolvedStatus.id,
      title: resolvedStatus.title,
      status: resolvedStatus.status,
    });
  });

  (animes || []).forEach(anime => {
    const seasons = anime.seasons && anime.seasons.length > 0 ? anime.seasons : [{ id: 'default', seasonNumber: '', seasonTitle: '', startDate: anime.startDate, endDate: anime.endDate, broadcastWeekday: anime.broadcastWeekday, broadcastTime: anime.broadcastTime, status: anime.status, useAnimeTitle: true } as any];

    seasons.forEach((season) => {
      const start = normalizeCalendarDateKey(season.startDate || anime.startDate);
      const end = normalizeCalendarDateKey(season.endDate || anime.endDate);
      const weekday = getBroadcastWeekdayFromStart(season.startDate || anime.startDate) || season.broadcastWeekday || anime.broadcastWeekday || '';
      const time = season.broadcastTime || anime.broadcastTime || '';
      const status = season.status || deriveAnimeStatus(anime);
      const baseTitle = getSeasonDisplayTitle(anime, season);

      const pushAnimeEvent = (dateKey: string, titleSuffix: string, timeLabel?: string) => {
        if (!dateKey) return;
        events.push({
          dateKey,
          timeLabel: timeLabel || undefined,
          type: 'アニメ',
          artistId: '',
          tourId: '',
          concertId: '',
          animeId: anime.id,
          seasonId: season.id,
          title: titleSuffix ? `${baseTitle} ${titleSuffix}` : baseTitle,
          status,
        });
      };

      // アニメは日历上也和其他类目一样用圆点表示。
      // 显示对象：放送開始日、放送終了日、每周更新日。
      pushAnimeEvent(start, '（放送開始）');
      if (end && end !== start) pushAnimeEvent(end, '（放送終了）');

      if (weekday && weekdayToNumber[weekday] !== undefined && start) {
        const startDay = parseConcertDate(start, 'NORMAL');
        const endDay = parseConcertDate(end || start, 'NORMAL') || startDay;
        if (!startDay || !endDay) return;
        const cursor = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate());
        const target = weekdayToNumber[weekday];
        while (cursor.getDay() !== target) cursor.setDate(cursor.getDate() + 1);
        let count = 0;
        while (cursor <= endDay && count < 80) {
          const y = cursor.getFullYear();
          const m = String(cursor.getMonth() + 1).padStart(2, '0');
          const d = String(cursor.getDate()).padStart(2, '0');
          const dateKey = `${y}-${m}-${d}`;
          // 开始日/完结日已经单独显示，重复日期时不再追加第二个动画更新点。
          if (dateKey !== start && dateKey !== end) {
            pushAnimeEvent(dateKey, '（更新）', time);
          }
          cursor.setDate(cursor.getDate() + 7);
          count++;
        }
      }
    });
  });

  return events;
};

export const getDueAction = (concert: Concert, now: Date = new Date()): DueAction | null => {
  const saleTime = parseConcertDate(concert.saleAt, 'NORMAL');
  const deadlineTime = parseConcertDate(concert.deadlineAt, 'NORMAL');
  const resultTime = parseConcertDate(concert.resultAt, 'NORMAL');
  const concertTime = parseConcertEventDateTime(concert);

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
    const concertTime = parseConcertEventDateTime(concert);
    if (concertTime && now >= concertTime) {
      return { ...concert, status: '参戦済み' };
    }
  }
  return concert;
};

export type MovieDueAction = 'ASK_MOVIE_BUY' | 'ASK_MOVIE_LOTTERY_RESULT';

export const getMovieDueAction = (movie: Movie, now: Date = new Date()): MovieDueAction | null => {
  if (movie.status === '発売前') {
    const saleTime = parseConcertDate(movie.saleAt, 'NORMAL');
    const deadlineTime = parseConcertDate(movie.deadlineAt, 'NORMAL');
    if ((saleTime && now >= saleTime) || (deadlineTime && now >= deadlineTime)) return 'ASK_MOVIE_BUY';
  }
  if (movie.status !== '抽選中') return null;
  const resultTime = parseConcertDate(movie.lotteryResultAt, 'NORMAL');
  if (resultTime && now >= resultTime) return 'ASK_MOVIE_LOTTERY_RESULT';
  return null;
};

export const autoAdvanceMovieStatus = (movie: Movie, now: Date = new Date()): Movie => {
  const nowIso = new Date().toISOString();
  const releaseTime = parseConcertDate(movie.releaseDate, 'NORMAL');
  const watchTime = parseMovieWatchDateTime(movie);

  if (watchTime && now >= watchTime && movie.status !== '見送り' && movie.status !== '上映終了') {
    return { ...movie, status: '鑑賞済み', updatedAt: nowIso };
  }

  const hasPendingLottery =
    movie.ticketType === '舞台挨拶' &&
    !!movie.lotteryResultAt &&
    !movie.lotteryResult;

  if (
    hasPendingLottery &&
    !['抽選中', '鑑賞予定', '鑑賞済み', '見送り', '上映終了'].includes(movie.status)
  ) {
    return { ...movie, status: '抽選中', updatedAt: nowIso };
  }

  if (movie.ticketType === '舞台挨拶' && movie.status === '未上映' && (movie.saleAt || movie.deadlineAt || movie.saleLink)) {
    return { ...movie, status: '発売前', updatedAt: nowIso };
  }

  if ((movie.status === '未上映' || movie.status === '発売前') && releaseTime && now >= releaseTime) {
    return { ...movie, status: '上映中', updatedAt: nowIso };
  }

  return movie;
};

export const applyMovieLotteryDecision = (
  movie: Movie,
  decision: 'WON' | 'LOST',
  payload?: {
    watchDate?: string;
    startTime?: string;
    endTime?: string;
    theaterName?: string;
    seat?: string;
    screenName?: string;
    price?: number;
  }
): Movie => {
  const historyItem = {
    at: new Date().toISOString(),
    result: decision,
    lotteryName: movie.lotteryName || '',
    lotteryResultAt: movie.lotteryResultAt || '',
  };

  if (decision === 'WON') {
    return {
      ...movie,
      status: '鑑賞予定',
      lotteryResult: 'WON',
      watchDate: payload?.watchDate ?? movie.watchDate,
      startTime: payload?.startTime ?? movie.startTime,
      endTime: payload?.endTime ?? movie.endTime,
      theaterName: payload?.theaterName ?? movie.theaterName,
      seat: payload?.seat ?? movie.seat,
      screenName: payload?.screenName ?? movie.screenName,
      price: payload?.price ?? movie.price ?? movie.lotteryPrice,
      lotteryHistory: [...(movie.lotteryHistory || []), historyItem],
      updatedAt: new Date().toISOString(),
    };
  }

  const releaseTime = parseConcertDate(movie.releaseDate, 'NORMAL');
  const now = new Date();

  return {
    ...movie,
    status: releaseTime && now >= releaseTime ? '上映中' : '未上映',
    lotteryResult: 'LOST',
    lotteryHistory: [...(movie.lotteryHistory || []), historyItem],
    updatedAt: now.toISOString(),
  };
};

export const applyDecision = (
  concert: Concert, 
  decision: 'BUY' | 'CONSIDER' | 'SKIP' | 'WON' | 'LOST', 
  payload?: { lotteryName?: string; resultAt?: string; concertAt?: string; price?: number; saleLink?: string }
): Concert => {
  const withLotteryHistory = (result: 'WON' | 'LOST'): Concert => {
    const item: LotteryHistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      at: new Date().toISOString(),
      result,
      lotteryName: payload?.lotteryName ?? concert.lotteryName ?? null,
      resultAt: payload?.resultAt ?? concert.resultAt ?? null,
    };
    const prev = concert.lotteryHistory ?? [];
    return { ...concert, lotteryHistory: [...prev, item] };
  };

  switch (decision) {
    case 'BUY':
      return { 
        ...concert, 
        status: '抽選中', 
        lotteryName: payload?.lotteryName ?? concert.lotteryName,
        resultAt: payload?.resultAt ?? concert.resultAt,
        price: payload?.price ?? concert.price,
        saleLink: payload?.saleLink ?? concert.saleLink 
      };
    case 'CONSIDER':
      return { ...concert, status: '検討中' };
    case 'SKIP':
      return { ...concert, status: '見送', lotteryResult: null };
    case 'WON':
      return { 
        ...withLotteryHistory('WON'),
        status: '参戦予定', 
        lotteryResult: 'WON',
        concertAt: payload?.concertAt ?? (concert.concertAt || concert.date)
      };
    case 'LOST':
      return { ...withLotteryHistory('LOST'), status: '見送', lotteryResult: 'LOST' };
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
  const allConcerts = (artist.tours || []).flatMap(t => t.concerts || []);
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
  (allArtists || []).forEach(artist => (artist.tours || []).forEach(tour => {
    if (tour.id === currentTourId) return;
    (tour.concerts || []).forEach(concert => {
      const d = concert.concertAt || concert.date;
      if (d !== TEXT.GLOBAL.TBD && d) otherDates.add(d.split(' ')[0]);
    });
  }));
  const conflicts = new Set<string>();
  const currentDatesInForm = new Set<string>();
  (formConcerts || []).forEach(c => {
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
  return (artist.tours || []).flatMap(tour => tour.concerts || []).filter(concert => {
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
  if (!Array.isArray(artists)) return [];
  const nextArtists: Artist[] = (artists || []).map(a => ({ 
    ...a, 
    tours: (a.tours || []).map(t => ({ 
      ...t, 
      concerts: (t.concerts || []).map(c => ({ ...c })) 
    })) 
  }));
  for (const artist of nextArtists) {
    // Also migrate artist profile image if it's base64
    if (artist.imageUrl && (artist.imageUrl.startsWith('data:image') || artist.imageUrl.startsWith('blob:'))) {
      const id = await putImageUrl(artist.imageUrl);
      (artist as any).imageId = id;
      delete (artist as any).imageUrl;
    }

    for (const tour of (artist.tours || [])) {
      // Also migrate tour image if it's base64
      if (tour.imageUrl && (tour.imageUrl.startsWith('data:image') || tour.imageUrl.startsWith('blob:'))) {
        const id = await putImageUrl(tour.imageUrl);
        (tour as any).imageId = id;
        delete (tour as any).imageUrl;
      }

      for (const concert of (tour.concerts || [])) {
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
  (artists || []).forEach(a => (a.tours || []).forEach(t => (t.concerts || []).forEach(c => {
    const ids = (c as any).imageIds as string[] | undefined;
    if (ids && ids.length) allIds.push(...ids);
  })));

  const map = await bulkGetImageUrls(allIds);

  return (artists || []).map(a => ({
    ...a,
    tours: (a.tours || []).map(t => ({
      ...t,
      concerts: (t.concerts || []).map(c => {
        const ids = (c as any).imageIds as string[] | undefined;
        const legacyUrls = Array.isArray((c as any).images) ? ((c as any).images as string[]) : [];

        // Prefer IndexedDB-resolved urls when ids exist, but never overwrite legacy urls with an empty array.
        const resolved = ids ? ids.map(id => map[id]).filter(Boolean) : [];
        const images = (resolved.length > 0)
          ? resolved
          : legacyUrls;

        const out: any = { ...c, images };
        delete out.imageIds;
        return out;
      })
    }))
  }));
};

/**
 * Import-time helper: migrate Exhibition legacy `images` (url[]) into IndexedDB and store `imageIds`.
 * Also removes the legacy `images` field to keep localStorage small.
 */
export const migrateExhibitionImagesToIndexedDB = async (exhibitions: Exhibition[]): Promise<Exhibition[]> => {
  if (!Array.isArray(exhibitions)) return [];
  const next: Exhibition[] = (exhibitions || []).map(ex => {
    let updated = { ...ex };
    // Migrate legacy status if needed
    if ((ex as any).exhibitionStatus && !ex.status) {
      const oldStatus = (ex as any).exhibitionStatus;
      if (oldStatus === 'visited') updated.status = 'VISITED';
      else if (oldStatus === 'running') updated.status = 'PLANNED';
      else if (oldStatus === 'ended_not_visited') updated.status = 'ENDED';
      else updated.status = 'NONE';
    } else if (!ex.status) {
      updated.status = 'NONE';
    }
    return updated;
  });

  for (const ex of next) {
    // Also migrate exhibition main image if it's base64
    if (ex.imageUrl && (ex.imageUrl.startsWith('data:image') || ex.imageUrl.startsWith('blob:'))) {
      const id = await putImageUrl(ex.imageUrl);
      (ex as any).imageId = id;
      delete (ex as any).imageUrl;
    }

    const hasIds = Array.isArray((ex as any).imageIds) && (ex as any).imageIds.length > 0;
    const legacyUrls = Array.isArray((ex as any).images) ? ((ex as any).images as string[]) : [];
    if (!hasIds && legacyUrls.length > 0) {
      const ids = await bulkPutImageUrls(legacyUrls);
      (ex as any).imageIds = ids;
    }
    delete (ex as any).images;
  }
  return next;
};

/**
 * Prepares a unified data object containing both artists and exhibitions
 * with all image data expanded for backup.
 */
export const prepareFullDataForExport = async (artists: Artist[], exhibitions: Exhibition[], movies: Movie[] = []): Promise<any> => {
  // 1. Expand Artist Images
  const artistsExpanded = await expandAlbumImagesForExport(artists);

  // 2. Expand Exhibition Images
  const exIds: string[] = [];
  (exhibitions || []).forEach(ex => {
    if (ex.imageIds && ex.imageIds.length) exIds.push(...ex.imageIds);
  });
  
  const exImageMap = await bulkGetImageUrls(exIds);
  
  const exhibitionsExpanded = (exhibitions || []).map(ex => {
    const ids = (ex as any).imageIds as string[] | undefined;
    const legacyUrls = Array.isArray((ex as any).images) ? ((ex as any).images as string[]) : [];
    const resolved = ids ? ids.map(id => exImageMap[id]).filter(Boolean) : [];
    const images = (resolved.length > 0) ? resolved : legacyUrls;
    const out: any = { ...ex, images };
    delete out.imageIds;
    return out;
  });

  return {
    artists: artistsExpanded,
    exhibitions: exhibitionsExpanded,
    movies,
    version: '1.1',
    exportedAt: new Date().toISOString()
  };
};
