import { Artist, Exhibition, Movie, Anime, Season, Status, MovieStatus, ExhibitionStatus, AnimeStatus } from '@/domain/types';
import dayjs from 'dayjs';
import { getEffectiveExhibitionStatus } from '@/domain/logic';
import { theme } from '@/components/common/theme';
import { getExhibitionStatusTone } from '@/domain/statusHelpers';
import { getAnimeDotColor } from '@/domain/calendarHelpers';

export type AppEventType =
  | '開演日'
  | '発売日'
  | '締切日'
  | '抽選結果日'
  | '公開日'
  | '鑑賞予定'
  | '開催開始'
  | '開催終了'
  | '放送開始'
  | '放送終了'
  | '更新日';

export type AppEventSourceType = 'concert' | 'movie' | 'exhibition' | 'anime';

export interface AppEvent {
  id: string;
  sourceType: AppEventSourceType;
  sourceId: string;
  artistId?: string;
  tourId?: string;
  concertId?: string;
  movieId?: string;
  exhibitionId?: string;
  animeId?: string;
  seasonId?: string;
  title: string;
  subtitle?: string;
  date: string;
  eventType: AppEventType;
  status?: Status | MovieStatus | ExhibitionStatus | AnimeStatus | string;
  posterUrl?: string;
  imageId?: string;
  color?: string;
}

const toDateKey = (value?: string) => {
  if (!value) return '';
  const d = dayjs(value);
  return d.isValid() ? d.format('YYYY-MM-DD') : '';
};

const WEEKDAY_TO_NUMBER: Record<string, number> = { 日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6 };

const getBroadcastWeekdayFromStart = (startDate?: string) => {
  const start = toDateKey(startDate);
  if (!start) return '';
  const labels = ['日', '月', '火', '水', '木', '金', '土'];
  return labels[dayjs(start).add(1, 'day').day()] || '';
};

const getSeasonNumberText = (season?: Season) => String(season?.seasonNumber || '').trim();
const looksLikeSeasonNumber = (value?: string) => /^第.+[期季]$|^Season\s*\d+$/i.test(String(value || '').trim());

const getSeasonTitleText = (anime: Anime, season?: Season) => {
  if (!season) return anime.title;
  const number = getSeasonNumberText(season) || (looksLikeSeasonNumber(season.seasonTitle) ? season.seasonTitle : '');
  const title = (season.useAnimeTitle || !String(season.seasonTitle || '').trim() || looksLikeSeasonNumber(season.seasonTitle))
    ? anime.title
    : String(season.seasonTitle || '').trim();
  return number ? `${number} ${title}` : title;
};

const getAnimeSeasonsForSchedule = (anime: Anime): Season[] => {
  if (anime.seasons && anime.seasons.length > 0) return anime.seasons;
  return [{
    id: 'default',
    seasonNumber: '',
    seasonTitle: anime.title,
    startDate: anime.startDate,
    endDate: anime.endDate,
    posterUrl: anime.posterUrl,
    status: anime.status,
    broadcastWeekday: anime.broadcastWeekday,
    broadcastTime: anime.broadcastTime,
    useAnimeTitle: true,
  } as Season];
};

const getAnimeDisplayStatus = (anime: Anime, season?: Season): AnimeStatus => {
  if (season?.status) return season.status;
  const order: AnimeStatus[] = ['視聴中', '視聴予定', '放送前', '保留', '視聴済み', '視聴中止', '見送り'];
  const statuses = (anime.seasons || []).map((s) => s.status).filter(Boolean) as AnimeStatus[];
  return order.find((status) => statuses.includes(status)) || anime.status || '放送前';
};

const getConcertStatusColor = (status: Status): string => {
  return theme.colors.status[status] || theme.colors.primary;
};

const getMovieStatusColor = (status: string): string => {
  switch (status) {
    case '未上映': return '#9CA3AF';
    case '発売前': return '#F59E0B';
    case '抽選中': return '#F59E0B';
    case '上映中': return '#53BEE8';
    case '鑑賞予定': return '#53BEE8';
    case '鑑賞済み': return '#A6DFF7';
    case '見送り': return '#9CA3AF';
    case '上映終了': return '#9CA3AF';
    default: return theme.colors.primary;
  }
};

interface BuildEventsOptions {
  filterDate?: string; // YYYY-MM-DD format - only return events on this date
  futureOnly?: boolean; // Only return future events (for countdown)
  includeToday?: boolean; // Include today's events when futureOnly=true
}

/**
 * Builds concert events from artists data
 */
export const buildConcertEvents = (artists: Artist[], options: BuildEventsOptions = {}): AppEvent[] => {
  const events: AppEvent[] = [];
  const { filterDate, futureOnly, includeToday } = options;
  const todayKey = dayjs().format('YYYY-MM-DD');

  artists.forEach(artist => {
    artist.tours?.forEach(tour => {
      tour.concerts?.forEach(concert => {
        const concertDateKey = toDateKey(concert.concertAt || concert.date);
        const saleDateKey = toDateKey(concert.saleAt);
        const resultDateKey = toDateKey(concert.resultAt);
        const deadlineDateKey = toDateKey(concert.deadlineAt);

        const imageUrl = tour.imageUrl || artist.imageUrl;
        const color = getConcertStatusColor(concert.status as Status);

        // 開演日
        if (concertDateKey) {
          if (filterDate && concertDateKey !== filterDate) {
            // skip
          } else if (futureOnly && !includeToday && concertDateKey < todayKey) {
            // skip
          } else if (futureOnly && includeToday && concertDateKey < todayKey) {
            // skip
          } else {
            events.push({
              id: `concert-perform-${artist.id}-${tour.id}-${concert.id}`,
              sourceType: 'concert',
              sourceId: concert.id,
              artistId: artist.id,
              tourId: tour.id,
              concertId: concert.id,
              title: artist.name,
              subtitle: concert.venue,
              date: concert.concertAt || concert.date,
              eventType: '開演日',
              status: concert.status,
              posterUrl: imageUrl,
              color,
            });
          }
        }

        // 発売日
        if (saleDateKey && concert.status === '発売前') {
          if (filterDate && saleDateKey !== filterDate) {
            // skip
          } else if (futureOnly && !includeToday && saleDateKey < todayKey) {
            // skip
          } else if (futureOnly && includeToday && saleDateKey < todayKey) {
            // skip
          } else {
            events.push({
              id: `concert-sale-${artist.id}-${tour.id}-${concert.id}`,
              sourceType: 'concert',
              sourceId: concert.id,
              artistId: artist.id,
              tourId: tour.id,
              concertId: concert.id,
              title: artist.name,
              subtitle: `${tour.name} - 発売開始`,
              date: concert.saleAt!,
              eventType: '発売日',
              status: concert.status,
              posterUrl: imageUrl,
              color,
            });
          }
        }

        // 抽選結果日
        if (resultDateKey && concert.status === '抽選中') {
          if (filterDate && resultDateKey !== filterDate) {
            // skip
          } else if (futureOnly && !includeToday && resultDateKey < todayKey) {
            // skip
          } else if (futureOnly && includeToday && resultDateKey < todayKey) {
            // skip
          } else {
            events.push({
              id: `concert-result-${artist.id}-${tour.id}-${concert.id}`,
              sourceType: 'concert',
              sourceId: concert.id,
              artistId: artist.id,
              tourId: tour.id,
              concertId: concert.id,
              title: artist.name,
              subtitle: `${concert.lotteryName || '抽選'} - 結果発表`,
              date: concert.resultAt!,
              eventType: '抽選結果日',
              status: concert.status,
              posterUrl: imageUrl,
              color,
            });
          }
        }

        // 締切日
        if (deadlineDateKey && concert.status === '検討中') {
          if (filterDate && deadlineDateKey !== filterDate) {
            // skip
          } else if (futureOnly && !includeToday && deadlineDateKey < todayKey) {
            // skip
          } else if (futureOnly && includeToday && deadlineDateKey < todayKey) {
            // skip
          } else {
            events.push({
              id: `concert-deadline-${artist.id}-${tour.id}-${concert.id}`,
              sourceType: 'concert',
              sourceId: concert.id,
              artistId: artist.id,
              tourId: tour.id,
              concertId: concert.id,
              title: artist.name,
              subtitle: `${tour.name} - 締切`,
              date: concert.deadlineAt!,
              eventType: '締切日',
              status: concert.status,
              posterUrl: imageUrl,
              color,
            });
          }
        }
      });
    });
  });

  return events;
};

/**
 * Builds movie events from movies data
 */
export const buildMovieEvents = (movies: Movie[], options: BuildEventsOptions = {}): AppEvent[] => {
  const events: AppEvent[] = [];
  const { filterDate, futureOnly, includeToday } = options;
  const todayKey = dayjs().format('YYYY-MM-DD');

  movies.forEach(movie => {
    const releaseDateKey = toDateKey(movie.releaseDate);
    const watchDateKey = toDateKey(movie.watchDate);
    const saleDateKey = toDateKey(movie.saleAt);
    const resultDateKey = toDateKey(movie.lotteryResultAt);
    const deadlineDateKey = toDateKey(movie.deadlineAt);

    const color = getMovieStatusColor(movie.status);

    // 公開日
    if (releaseDateKey) {
      if (filterDate && releaseDateKey !== filterDate) {
        // skip
      } else if (futureOnly && !includeToday && releaseDateKey < todayKey) {
        // skip
      } else if (futureOnly && includeToday && releaseDateKey < todayKey) {
        // skip
      } else {
        events.push({
          id: `movie-release-${movie.id}`,
          sourceType: 'movie',
          sourceId: movie.id,
          movieId: movie.id,
          title: movie.title,
          subtitle: movie.theaterName,
          date: movie.releaseDate!,
          eventType: '公開日',
          status: movie.status,
          posterUrl: movie.posterUrl,
          color,
        });
      }
    }

    // 鑑賞予定
    if (watchDateKey) {
      if (filterDate && watchDateKey !== filterDate) {
        // skip
      } else if (futureOnly && !includeToday && watchDateKey < todayKey) {
        // skip
      } else if (futureOnly && includeToday && watchDateKey < todayKey) {
        // skip
      } else {
        events.push({
          id: `movie-watch-${movie.id}`,
          sourceType: 'movie',
          sourceId: movie.id,
          movieId: movie.id,
          title: movie.title,
          subtitle: movie.theaterName,
          date: movie.watchDate!,
          eventType: '鑑賞予定',
          status: movie.status,
          posterUrl: movie.posterUrl,
          color,
        });
      }
    }

    // 発売日
    if (saleDateKey) {
      if (filterDate && saleDateKey !== filterDate) {
        // skip
      } else if (futureOnly && !includeToday && saleDateKey < todayKey) {
        // skip
      } else if (futureOnly && includeToday && saleDateKey < todayKey) {
        // skip
      } else {
        events.push({
          id: `movie-sale-${movie.id}`,
          sourceType: 'movie',
          sourceId: movie.id,
          movieId: movie.id,
          title: movie.title,
          subtitle: `${movie.theaterName || ''}${movie.theaterName ? ' - ' : ''}発売開始`,
          date: movie.saleAt!,
          eventType: '発売日',
          status: movie.status,
          posterUrl: movie.posterUrl,
          color,
        });
      }
    }

    // 抽選結果日
    if (resultDateKey) {
      if (filterDate && resultDateKey !== filterDate) {
        // skip
      } else if (futureOnly && !includeToday && resultDateKey < todayKey) {
        // skip
      } else if (futureOnly && includeToday && resultDateKey < todayKey) {
        // skip
      } else {
        events.push({
          id: `movie-result-${movie.id}`,
          sourceType: 'movie',
          sourceId: movie.id,
          movieId: movie.id,
          title: movie.title,
          subtitle: `${movie.lotteryName || '抽選'} - 結果発表`,
          date: movie.lotteryResultAt!,
          eventType: '抽選結果日',
          status: movie.status,
          posterUrl: movie.posterUrl,
          color,
        });
      }
    }

    // 締切日
    if (deadlineDateKey) {
      if (filterDate && deadlineDateKey !== filterDate) {
        // skip
      } else if (futureOnly && !includeToday && deadlineDateKey < todayKey) {
        // skip
      } else if (futureOnly && includeToday && deadlineDateKey < todayKey) {
        // skip
      } else {
        events.push({
          id: `movie-deadline-${movie.id}`,
          sourceType: 'movie',
          sourceId: movie.id,
          movieId: movie.id,
          title: movie.title,
          subtitle: `${movie.theaterName || ''}${movie.theaterName ? ' - ' : ''}締切`,
          date: movie.deadlineAt!,
          eventType: '締切日',
          status: movie.status,
          posterUrl: movie.posterUrl,
          color,
        });
      }
    }
  });

  return events;
};

/**
 * Builds exhibition events from exhibitions data
 * Only shows start and end dates, not daily "開催中" events
 */
export const buildExhibitionEvents = (exhibitions: Exhibition[], options: BuildEventsOptions = {}): AppEvent[] => {
  const events: AppEvent[] = [];
  const { filterDate, futureOnly, includeToday } = options;
  const todayKey = dayjs().format('YYYY-MM-DD');

  exhibitions.forEach(ex => {
    const startDateKey = toDateKey(ex.startDate);
    const endDateKey = toDateKey(ex.endDate);
    const status = getEffectiveExhibitionStatus(ex);
    const color = getExhibitionStatusTone(status).color;

    // 開催開始
    if (startDateKey) {
      if (filterDate && startDateKey !== filterDate) {
        // skip
      } else if (futureOnly && !includeToday && startDateKey < todayKey) {
        // skip
      } else if (futureOnly && includeToday && startDateKey < todayKey) {
        // skip
      } else {
        events.push({
          id: `exhibition-start-${ex.id}`,
          sourceType: 'exhibition',
          sourceId: ex.id,
          exhibitionId: ex.id,
          title: ex.title,
          subtitle: ex.venueName || ex.venue,
          date: ex.startDate!,
          eventType: '開催開始',
          status,
          posterUrl: ex.imageUrl,
          imageId: ex.imageIds?.[0],
          color,
        });
      }
    }

    // 開催終了
    if (endDateKey && endDateKey !== startDateKey) {
      if (filterDate && endDateKey !== filterDate) {
        // skip
      } else if (futureOnly && !includeToday && endDateKey < todayKey) {
        // skip
      } else if (futureOnly && includeToday && endDateKey < todayKey) {
        // skip
      } else {
        events.push({
          id: `exhibition-end-${ex.id}`,
          sourceType: 'exhibition',
          sourceId: ex.id,
          exhibitionId: ex.id,
          title: ex.title,
          subtitle: ex.venueName || ex.venue,
          date: ex.endDate!,
          eventType: '開催終了',
          status,
          posterUrl: ex.imageUrl,
          imageId: ex.imageIds?.[0],
          color,
        });
      }
    }
  });

  return events;
};

/**
 * Builds anime events from animes data
 * Includes start/end dates and weekly broadcast dates
 */
export const buildAnimeEvents = (animes: Anime[], options: BuildEventsOptions = {}): AppEvent[] => {
  const events: AppEvent[] = [];
  const { filterDate, futureOnly, includeToday } = options;
  const todayKey = dayjs().format('YYYY-MM-DD');

  animes.forEach(anime => {
    getAnimeSeasonsForSchedule(anime).forEach(season => {
      const startDateKey = toDateKey(season.startDate || anime.startDate);
      const endDateKey = toDateKey(season.endDate || anime.endDate);
      const status = getAnimeDisplayStatus(anime, season);
      const color = getAnimeDotColor(status);
      const title = getSeasonTitleText(anime, season);
      const imageUrl = season.posterUrl || anime.posterUrl;
      const time = season.broadcastTime || anime.broadcastTime || '';

      // 放送開始
      if (startDateKey) {
        if (filterDate && startDateKey !== filterDate) {
          // skip
        } else if (futureOnly && !includeToday && startDateKey < todayKey) {
          // skip
        } else if (futureOnly && includeToday && startDateKey < todayKey) {
          // skip
        } else {
          events.push({
            id: `anime-start-${anime.id}-${season.id}`,
            sourceType: 'anime',
            sourceId: anime.id,
            animeId: anime.id,
            seasonId: season.id,
            title,
            subtitle: '放送開始',
            date: time && startDateKey ? `${startDateKey} ${time}` : startDateKey,
            eventType: '放送開始',
            status,
            posterUrl: imageUrl,
            color,
          });
        }
      }

      // 放送終了
      if (endDateKey && endDateKey !== startDateKey) {
        if (filterDate && endDateKey !== filterDate) {
          // skip
        } else if (futureOnly && !includeToday && endDateKey < todayKey) {
          // skip
        } else if (futureOnly && includeToday && endDateKey < todayKey) {
          // skip
        } else {
          events.push({
            id: `anime-end-${anime.id}-${season.id}`,
            sourceType: 'anime',
            sourceId: anime.id,
            animeId: anime.id,
            seasonId: season.id,
            title,
            subtitle: '放送終了',
            date: time && endDateKey ? `${endDateKey} ${time}` : endDateKey,
            eventType: '放送終了',
            status,
            posterUrl: imageUrl,
            color,
          });
        }
      }

      // Weekly broadcast dates
      const weekday = getBroadcastWeekdayFromStart(season.startDate || anime.startDate) || season.broadcastWeekday || anime.broadcastWeekday || '';
      const weekdayNum = WEEKDAY_TO_NUMBER[weekday];
      if (!startDateKey || weekdayNum === undefined) return;

      const startDay = dayjs(startDateKey);
      const endDay = endDateKey ? dayjs(endDateKey) : dayjs().add(6, 'month');
      if (!startDay.isValid() || !endDay.isValid()) return;

      let cursor = startDay;
      while (cursor.day() !== weekdayNum) cursor = cursor.add(1, 'day');

      let guard = 0;
      while ((cursor.isBefore(endDay) || cursor.isSame(endDay, 'day')) && guard < 80) {
        const key = cursor.format('YYYY-MM-DD');

        // Don't duplicate start/end dates
        if (key !== startDateKey && key !== endDateKey) {
          if (filterDate && key !== filterDate) {
            // skip
          } else if (futureOnly && !includeToday && key < todayKey) {
            // skip
          } else if (futureOnly && includeToday && key < todayKey) {
            // skip
          } else {
            events.push({
              id: `anime-update-${anime.id}-${season.id}-${key}`,
              sourceType: 'anime',
              sourceId: anime.id,
              animeId: anime.id,
              seasonId: season.id,
              title,
              subtitle: '更新日',
              date: time ? `${key} ${time}` : key,
              eventType: '更新日',
              status,
              posterUrl: imageUrl,
              color,
            });
          }
        }

        cursor = cursor.add(7, 'day');
        guard += 1;
      }
    });
  });

  return events;
};

/**
 * Builds all app events from all data sources
 */
export const buildAllAppEvents = (
  artists: Artist[],
  movies: Movie[],
  exhibitions: Exhibition[],
  animes: Anime[],
  options: BuildEventsOptions = {}
): AppEvent[] => {
  const events: AppEvent[] = [
    ...buildConcertEvents(artists, options),
    ...buildMovieEvents(movies, options),
    ...buildExhibitionEvents(exhibitions, options),
    ...buildAnimeEvents(animes, options),
  ];

  return events.sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
};
