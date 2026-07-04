import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PageShell } from '@/components/common/PageShell';
import { GlassCard } from '@/components/common/GlassCard';
import { theme } from '@/components/common/theme';
import { Artist, Exhibition, Movie, Anime, Season, AnimeStatus } from '@/domain/types';
import { Icons } from '@/components/common/IconButton';
import { PosterCard } from '@/components/common/PosterCard';
import { MenuButton, sectionTitleStyle } from '@/components/BottomMenu';
import { RemoteImage } from '@/components/RemoteImage';
import dayjs from 'dayjs';
import { safeSave, safeGet } from '@/utils/storage';
import { getAnimeDotColor, getMovieDotColor } from '@/domain/calendarHelpers';
import { getEffectiveExhibitionStatus } from '@/domain/logic';
import { getExhibitionStatusTone } from '@/domain/statusHelpers';

interface HomePageProps {
  artists: Artist[];
  exhibitions: Exhibition[];
  movies: Movie[];
  animes: Anime[];
  onNavigateToMusic: () => void;
  onNavigateToExhibitions: () => void;
  onNavigateToMovies: () => void;
  onNavigateToAnime: () => void;
  onOpenConcert?: (artistId: string, tourId: string, concertId: string) => void;
  onOpenExhibition?: (exhibitionId: string) => void;
  onOpenMovie?: (movieId: string) => void;
  onOpenAnime?: (animeId: string) => void;
  onExport: () => void;
  onImport: (data: any) => void;
  onNavigateToTagManagement?: () => void;
}

type CountdownTarget = {
  type: 'concert' | 'exhibition' | 'movie' | 'anime';
  id: string;
  artistId?: string;
  tourId?: string;
  concertId?: string;
  exhibitionId?: string;
  movieId?: string;
  animeId?: string;
  title: string;
  subtitle?: string;
  date: string;
  imageUrl?: string;
  imageId?: string;
};

type TodayEvent = CountdownTarget & {
  eventLabel: string;
  status?: AnimeStatus | string;
};

const COUNTDOWN_KEY = 'livetrack_jp_countdown_target';


const HomeEntryFallback: React.FC<{ icon: React.ReactNode }> = ({ icon }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.18,
      background: 'linear-gradient(135deg, rgba(83,190,232,0.18), rgba(255,255,255,0.9))',
    }}
  >
    {icon}
  </div>
);

const HomeEntryCard: React.FC<{
  title: string;
  subtitle: string;
  imageUrl?: string;
  imageId?: string;
  fallback: React.ReactNode;
  onClick: () => void;
}> = ({ title, subtitle, imageUrl, imageId, fallback, onClick }) => (
  <PosterCard
    onClick={onClick}
    imageUrl={imageUrl}
    imageId={imageId}
    title={title}
    subtitle={subtitle}
    alt={title}
    compact
    fallback={fallback}
  />
);

const ACTIVE_ANIME_STATUSES: AnimeStatus[] = ['放送前', '視聴予定', '視聴中', '保留'];
const ACTIVE_MOVIE_STATUSES = ['未上映', '発売前', '抽選中', '上映中', '鑑賞予定'];
const ACTIVE_EXHIBITION_STATUSES = ['NONE', 'PLANNED', 'RESERVED'];
const WEEKDAY_TO_NUMBER: Record<string, number> = { 日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6 };
const toDateKey = (value?: string) => {
  if (!value) return '';
  const d = dayjs(value);
  return d.isValid() ? d.format('YYYY-MM-DD') : '';
};
const isSameDateKey = (value: string | undefined, dateKey: string) => toDateKey(value) === dateKey;
const isTodayOrFutureDate = (value?: string) => {
  const key = toDateKey(value);
  if (!key) return false;
  return dayjs(key).isSame(dayjs().startOf('day'), 'day') || dayjs(key).isAfter(dayjs().startOf('day'));
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

const getAnimeDisplayStatus = (anime: Anime, season?: Season): AnimeStatus => {
  if (season?.status) return season.status;
  const order: AnimeStatus[] = ['視聴中', '視聴予定', '保留', '放送前', '視聴済み', '視聴中止', '見送り'];
  const statuses = (anime.seasons || []).map((s) => s.status).filter(Boolean) as AnimeStatus[];
  return order.find((status) => statuses.includes(status)) || anime.status || '放送前';
};

const getTodayEventDotColor = (event: TodayEvent): string => {
  if (event.type === 'anime') return getAnimeDotColor(String(event.status || '放送前'));
  if (event.type === 'movie') return getMovieDotColor(String(event.status || '未上映'));
  if (event.type === 'exhibition') return getExhibitionStatusTone(String(event.status || 'NONE')).color;
  return theme.colors.primary;
};

const getBroadcastWeekdayFromStart = (startDate?: string) => {
  const start = toDateKey(startDate);
  if (!start) return '';
  const labels = ['日', '月', '火', '水', '木', '金', '土'];
  return labels[dayjs(start).add(1, 'day').day()] || '';
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

const buildAnimeScheduleEvents = (animes: Anime[], onlyTodayKey?: string): TodayEvent[] => {
  const events: TodayEvent[] = [];
  const today = onlyTodayKey || dayjs().format('YYYY-MM-DD');

  animes.forEach((anime) => {
    getAnimeSeasonsForSchedule(anime).forEach((season) => {
      const status = getAnimeDisplayStatus(anime, season);
      if (!ACTIVE_ANIME_STATUSES.includes(status)) return;
      const title = getSeasonTitleText(anime, season);
      const start = toDateKey(season.startDate || anime.startDate);
      const end = toDateKey(season.endDate || anime.endDate);
      const time = season.broadcastTime || anime.broadcastTime || '';
      const imageUrl = season.posterUrl || anime.posterUrl;
      const push = (date: string, label: string, idPrefix: string) => {
        if (!date || (onlyTodayKey && date !== today)) return;
        events.push({
          type: 'anime',
          id: `${idPrefix}-${anime.id}-${season.id}-${date}`,
          animeId: anime.id,
          title,
          subtitle: label,
          date: time ? `${date} ${time}` : date,
          eventLabel: label,
          imageUrl,
          status,
        });
      };

      push(start, '放送開始', 'anime-start');
      if (end && end !== start) push(end, '放送終了', 'anime-end');

      const weekday = getBroadcastWeekdayFromStart(season.startDate || anime.startDate) || season.broadcastWeekday || anime.broadcastWeekday || '';
      const weekdayNum = WEEKDAY_TO_NUMBER[weekday];
      if (!start || weekdayNum === undefined) return;
      const startDay = dayjs(start);
      const endDay = end ? dayjs(end) : dayjs().add(6, 'month');
      if (!startDay.isValid() || !endDay.isValid()) return;
      let cursor = startDay;
      while (cursor.day() !== weekdayNum) cursor = cursor.add(1, 'day');
      let guard = 0;
      while ((cursor.isBefore(endDay) || cursor.isSame(endDay, 'day')) && guard < 80) {
        const key = cursor.format('YYYY-MM-DD');
        if (key !== start && key !== end) push(key, '更新日', 'anime-update');
        cursor = cursor.add(7, 'day');
        guard += 1;
      }
    });
  });

  return events;
};

const getFutureAnimeCountdownEvents = (animes: Anime[]): CountdownTarget[] => {
  const today = dayjs().startOf('day');
  return buildAnimeScheduleEvents(animes)
    .filter((event) => dayjs(event.date).isSame(today, 'day') || dayjs(event.date).isAfter(today))
    .map((event) => ({ ...event, subtitle: event.subtitle || event.eventLabel }))
    .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
};

export const HomePage: React.FC<HomePageProps> = ({
  artists,
  exhibitions,
  movies,
  animes,
  onNavigateToMusic,
  onNavigateToExhibitions,
  onNavigateToMovies,
  onNavigateToAnime,
  onOpenConcert,
  onOpenExhibition,
  onOpenMovie,
  onOpenAnime,
  onExport,
  onImport,
  onNavigateToTagManagement,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditCountdownOpen, setIsEditCountdownOpen] = useState(false);
  const [countdownStep, setCountdownStep] = useState<'type' | 'select'>('type');
  const [selectedType, setSelectedType] = useState<'concert' | 'exhibition' | 'movie' | 'anime' | null>(null);
  const [countdownTarget, setCountdownTarget] = useState<CountdownTarget | null>(() =>
    safeGet<CountdownTarget | null>(COUNTDOWN_KEY, null)
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    safeSave(COUNTDOWN_KEY, countdownTarget);
  }, [countdownTarget]);

  // 获取所有未来事件（用于倒计时）
  const upcomingEvents = useMemo((): CountdownTarget[] => {
    const events: CountdownTarget[] = [];
    const todayStart = dayjs().startOf('day');

    artists.forEach(artist => {
      artist.tours?.forEach(tour => {
        tour.concerts?.forEach(concert => {
          const concertDateKey = toDateKey(concert.concertAt || concert.date);
          if (!concertDateKey) return;
          const concertDate = dayjs(concertDateKey);
          if ((concertDate.isSame(todayStart, 'day') || concertDate.isAfter(todayStart)) && ['発売前', '検討中', '抽選中', '参戦予定'].includes(concert.status)) {
            events.push({
              type: 'concert',
              id: `${artist.id}-${tour.id}-${concert.id}`,
              artistId: artist.id,
              tourId: tour.id,
              concertId: concert.id,
              title: artist.name,
              subtitle: tour.name,
              date: concert.concertAt || concert.date,
              imageUrl: tour.imageUrl || artist.imageUrl,
            });
          }
        });
      });
    });

    exhibitions.forEach(ex => {
      if (!ACTIVE_EXHIBITION_STATUSES.includes(ex.status || 'NONE')) return;
      if (isTodayOrFutureDate(ex.startDate)) {
        events.push({
          type: 'exhibition',
          id: `exhibition-start-${ex.id}`,
          exhibitionId: ex.id,
          title: ex.title,
          subtitle: '開催開始',
          date: ex.startDate,
          imageUrl: ex.imageUrl,
          imageId: ex.imageIds?.[0],
        });
      }
      if (ex.endDate && ex.endDate !== ex.startDate && isTodayOrFutureDate(ex.endDate)) {
        events.push({
          type: 'exhibition',
          id: `exhibition-end-${ex.id}`,
          exhibitionId: ex.id,
          title: ex.title,
          subtitle: '開催終了',
          date: ex.endDate,
          imageUrl: ex.imageUrl,
          imageId: ex.imageIds?.[0],
        });
      }
    });

    movies.forEach(movie => {
      if (!ACTIVE_MOVIE_STATUSES.includes(movie.status)) return;
      if (isTodayOrFutureDate(movie.releaseDate)) {
        events.push({
          type: 'movie',
          id: `movie-release-${movie.id}`,
          movieId: movie.id,
          title: movie.title,
          subtitle: '公開日',
          date: movie.releaseDate!,
          imageUrl: movie.posterUrl,
        });
      }
      if (movie.watchDate && isTodayOrFutureDate(movie.watchDate)) {
        events.push({
          type: 'movie',
          id: `movie-watch-${movie.id}`,
          movieId: movie.id,
          title: movie.title,
          subtitle: movie.theaterName ? `${movie.theaterName} ・ 鑑賞予定` : '鑑賞予定',
          date: movie.watchDate,
          imageUrl: movie.posterUrl,
        });
      }
    });

    events.push(...getFutureAnimeCountdownEvents(animes));

    return events.sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
  }, [artists, exhibitions, movies, animes]);

  // 自动设置最近的事件作为倒计时目标，并过滤掉已过期的事件
  useEffect(() => {
    const todayStart = dayjs().startOf('day');

    // 过滤出所有今日或未来的有效事件
    const validEvents = upcomingEvents.filter(event => {
      const eventDateKey = toDateKey(event.date);
      if (!eventDateKey) return false;
      const eventDate = dayjs(eventDateKey);
      return eventDate.isSame(todayStart, 'day') || eventDate.isAfter(todayStart);
    });

    // 检查当前倒计时目标是否有效
    if (countdownTarget) {
      const targetDateKey = toDateKey(countdownTarget.date);
      if (targetDateKey) {
        const targetDate = dayjs(targetDateKey);
        // 如果倒计时目标已过期，替换为最新的有效事件
        if (targetDate.isBefore(todayStart)) {
          setCountdownTarget(validEvents.length > 0 ? validEvents[0] : null);
          return;
        }
        // 如果倒计时目标仍在未来，但已不在有效事件列表中（例如状态改变），也替换
        const targetStillValid = validEvents.some(event => event.id === countdownTarget.id);
        if (!targetStillValid && validEvents.length > 0) {
          setCountdownTarget(validEvents[0]);
          return;
        }
        if (!targetStillValid && validEvents.length === 0) {
          setCountdownTarget(null);
          return;
        }
      }
    } else {
      // 如果没有倒计时目标，自动设置第一个有效事件
      if (validEvents.length > 0) {
        setCountdownTarget(validEvents[0]);
      }
    }
  }, [upcomingEvents, countdownTarget]);

  // 今日の予定
  const todayEvents = useMemo((): TodayEvent[] => {
    const today = dayjs().format('YYYY-MM-DD');
    const events: TodayEvent[] = [];

    // 公演：今天开演、今天发售、今天抽选结果
    artists.forEach(artist => {
      artist.tours?.forEach(tour => {
        tour.concerts?.forEach(concert => {
          // 开演日
          if (concert.concertAt && dayjs(concert.concertAt).format('YYYY-MM-DD') === today) {
            events.push({
              type: 'concert',
              id: `concert-${artist.id}-${tour.id}-${concert.id}`,
              artistId: artist.id,
              tourId: tour.id,
              concertId: concert.id,
              title: artist.name,
              subtitle: concert.venue,
              date: concert.concertAt,
              eventLabel: '開演日',
            });
          }
          // 发售日
          if (concert.saleAt && dayjs(concert.saleAt).format('YYYY-MM-DD') === today) {
            events.push({
              type: 'concert',
              id: `sale-${artist.id}-${tour.id}-${concert.id}`,
              artistId: artist.id,
              tourId: tour.id,
              concertId: concert.id,
              title: artist.name,
              subtitle: `${tour.name} - 発売開始`,
              date: concert.saleAt,
              eventLabel: '発売日',
            });
          }
          // 抽选结果日
          if (concert.resultAt && dayjs(concert.resultAt).format('YYYY-MM-DD') === today) {
            events.push({
              type: 'concert',
              id: `result-${artist.id}-${tour.id}-${concert.id}`,
              artistId: artist.id,
              tourId: tour.id,
              concertId: concert.id,
              title: artist.name,
              subtitle: `${concert.lotteryName || '抽選'} - 結果発表`,
              date: concert.resultAt,
              eventLabel: '抽選結果',
            });
          }
        });
      });
    });

    // 映画：公開日、鑑賞予定、発売日、抽選結果日
    movies.forEach(movie => {
      if (isSameDateKey(movie.releaseDate, today)) {
        events.push({
          type: 'movie',
          id: `release-${movie.id}`,
          movieId: movie.id,
          title: movie.title,
          subtitle: movie.theaterName,
          date: movie.releaseDate!,
          eventLabel: '公開日',
          status: movie.status,
        });
      }
      if (movie.watchDate && isSameDateKey(movie.watchDate, today)) {
        events.push({
          type: 'movie',
          id: `watch-${movie.id}`,
          movieId: movie.id,
          title: movie.title,
          subtitle: movie.theaterName,
          date: movie.watchDate,
          eventLabel: '鑑賞予定',
          status: movie.status,
        });
      }
      if (movie.saleAt && isSameDateKey(movie.saleAt, today)) {
        events.push({
          type: 'movie',
          id: `sale-${movie.id}`,
          movieId: movie.id,
          title: movie.title,
          subtitle: `${movie.theaterName || ''}${movie.theaterName ? ' - ' : ''}発売開始`,
          date: movie.saleAt,
          eventLabel: '発売日',
          status: movie.status,
        });
      }
      if (movie.lotteryResultAt && isSameDateKey(movie.lotteryResultAt, today)) {
        events.push({
          type: 'movie',
          id: `result-${movie.id}`,
          movieId: movie.id,
          title: movie.title,
          subtitle: `${movie.lotteryName || '抽選'} - 結果発表`,
          date: movie.lotteryResultAt,
          eventLabel: '抽選結果',
          status: movie.status,
        });
      }
    });

    // 展覧会：開催初日と最終日のみ提醒として表示
    exhibitions.forEach(ex => {
      if (isSameDateKey(ex.startDate, today)) {
        events.push({
          type: 'exhibition',
          id: `exhibition-start-${ex.id}`,
          exhibitionId: ex.id,
          title: ex.title,
          subtitle: ex.venueName || ex.venue,
          date: ex.startDate,
          eventLabel: '開催開始',
          status: getEffectiveExhibitionStatus(ex),
        });
      }
      if (ex.endDate && ex.endDate !== ex.startDate && isSameDateKey(ex.endDate, today)) {
        events.push({
          type: 'exhibition',
          id: `exhibition-end-${ex.id}`,
          exhibitionId: ex.id,
          title: ex.title,
          subtitle: ex.venueName || ex.venue,
          date: ex.endDate,
          eventLabel: '開催終了',
          status: getEffectiveExhibitionStatus(ex),
        });
      }
    });

    // アニメ：放送開始日、放送終了日、毎週更新日
    events.push(...buildAnimeScheduleEvents(animes, today));

    return events.sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf()).slice(0, 3);
  }, [artists, exhibitions, movies, animes]);

  const getDaysUntil = (date: string) => {
    return dayjs(toDateKey(date)).diff(dayjs().startOf('day'), 'day');
  };

  const handleCountdownClick = () => {
    if (!countdownTarget) return;
    if (countdownTarget.type === 'concert' && onOpenConcert) {
      onOpenConcert(countdownTarget.artistId!, countdownTarget.tourId!, countdownTarget.concertId!);
    } else if (countdownTarget.type === 'exhibition' && onOpenExhibition) {
      onOpenExhibition(countdownTarget.exhibitionId!);
    } else if (countdownTarget.type === 'movie' && onOpenMovie) {
      onOpenMovie(countdownTarget.movieId!);
    } else if (countdownTarget.type === 'anime' && onOpenAnime) {
      onOpenAnime(countdownTarget.animeId!);
    }
  };

  const handleTodayEventClick = (event: TodayEvent) => {
    if (event.type === 'concert' && onOpenConcert) {
      onOpenConcert(event.artistId!, event.tourId!, event.concertId!);
    } else if (event.type === 'exhibition' && onOpenExhibition) {
      onOpenExhibition(event.exhibitionId!);
    } else if (event.type === 'movie' && onOpenMovie) {
      onOpenMovie(event.movieId!);
    } else if (event.type === 'anime' && onOpenAnime) {
      onOpenAnime(event.animeId!);
    }
  };

  // 获取可选择的事件（用于编辑倒计时）
  const selectableEvents = useMemo(() => {
    const events: CountdownTarget[] = [];

    if (selectedType === 'concert' || !selectedType) {
      artists.forEach(artist => {
        artist.tours?.forEach(tour => {
          tour.concerts?.forEach(concert => {
            if (['発売前', '検討中', '抽選中', '参戦予定'].includes(concert.status)) {
              events.push({
                type: 'concert',
                id: `${artist.id}-${tour.id}-${concert.id}`,
                artistId: artist.id,
                tourId: tour.id,
                concertId: concert.id,
                title: artist.name,
                subtitle: `${tour.name} - ${concert.venue}`,
                date: concert.concertAt || concert.date,
                imageUrl: tour.imageUrl || artist.imageUrl,
              });
            }
          });
        });
      });
    }

    if (selectedType === 'exhibition' || !selectedType) {
      exhibitions.forEach(ex => {
        if (!ACTIVE_EXHIBITION_STATUSES.includes(ex.status || 'NONE')) return;
        if (isTodayOrFutureDate(ex.startDate)) {
          events.push({
            type: 'exhibition',
            id: `exhibition-start-${ex.id}`,
            exhibitionId: ex.id,
            title: ex.title,
            subtitle: ex.venueName || ex.venue ? `${ex.venueName || ex.venue} ・ 開催開始` : '開催開始',
            date: ex.startDate,
            imageUrl: ex.imageUrl,
            imageId: ex.imageIds?.[0],
          });
        }
        if (ex.endDate && ex.endDate !== ex.startDate && isTodayOrFutureDate(ex.endDate)) {
          events.push({
            type: 'exhibition',
            id: `exhibition-end-${ex.id}`,
            exhibitionId: ex.id,
            title: ex.title,
            subtitle: ex.venueName || ex.venue ? `${ex.venueName || ex.venue} ・ 開催終了` : '開催終了',
            date: ex.endDate,
            imageUrl: ex.imageUrl,
            imageId: ex.imageIds?.[0],
          });
        }
      });
    }

    if (selectedType === 'movie' || !selectedType) {
      movies.forEach(movie => {
        if (!ACTIVE_MOVIE_STATUSES.includes(movie.status)) return;
        if (isTodayOrFutureDate(movie.releaseDate)) {
          events.push({
            type: 'movie',
            id: `movie-release-${movie.id}`,
            movieId: movie.id,
            title: movie.title,
            subtitle: '公開日',
            date: movie.releaseDate!,
            imageUrl: movie.posterUrl,
          });
        }
        if (movie.watchDate && isTodayOrFutureDate(movie.watchDate)) {
          events.push({
            type: 'movie',
            id: `movie-watch-${movie.id}`,
            movieId: movie.id,
            title: movie.title,
            subtitle: movie.theaterName ? `${movie.theaterName} ・ 鑑賞予定` : '鑑賞予定',
            date: movie.watchDate,
            imageUrl: movie.posterUrl,
          });
        }
      });
    }

    if (selectedType === 'anime' || !selectedType) {
      events.push(...getFutureAnimeCountdownEvents(animes));
    }

    return events.sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
  }, [artists, exhibitions, movies, animes, selectedType]);

  // 获取最近未来公演用于入口卡片
  const latestConcert = useMemo(() => {
    const now = dayjs();
    const futureConcerts: Array<{ artist: Artist; tour: any; concert: any }> = [];

    artists.forEach(artist => {
      artist.tours?.forEach(tour => {
        tour.concerts?.forEach(concert => {
          const concertDate = dayjs(concert.concertAt || concert.date);
          if (concertDate.isAfter(now) && ['発売前', '検討中', '抽選中', '参戦予定'].includes(concert.status)) {
            futureConcerts.push({ artist, tour, concert });
          }
        });
      });
    });

    // 按日期排序，找最近的
    futureConcerts.sort((a, b) => {
      const dateA = dayjs(a.concert.concertAt || a.concert.date);
      const dateB = dayjs(b.concert.concertAt || b.concert.date);
      return dateA.valueOf() - dateB.valueOf();
    });

    return futureConcerts[0] || null;
  }, [artists]);

  const latestExhibition = useMemo(() => {
    const today = dayjs().startOf('day');
    const scored = exhibitions.map(ex => {
      const start = dayjs(ex.startDate || '2999-12-31');
      const end = dayjs(ex.endDate || ex.startDate || '2999-12-31');
      const isOngoing = start.isValid() && end.isValid() && (start.isBefore(today) || start.isSame(today, 'day')) && (end.isAfter(today) || end.isSame(today, 'day'));
      const baseDate = isOngoing ? today : (start.isValid() && (start.isAfter(today) || start.isSame(today, 'day')) ? start : end);
      const group = isOngoing ? 0 : (baseDate.isValid() && baseDate.isAfter(today) ? 1 : 2);
      return { item: ex, group, time: baseDate.isValid() ? baseDate.valueOf() : Number.MAX_SAFE_INTEGER };
    });
    return scored.sort((a, b) => a.group - b.group || (a.group === 2 ? b.time - a.time : a.time - b.time))[0]?.item || exhibitions[0];
  }, [exhibitions]);

  const latestMovie = useMemo(() => {
    const today = dayjs().startOf('day');
    const scored = movies.map(movie => {
      const date = dayjs(movie.watchDate || movie.releaseDate || movie.updatedAt || movie.createdAt || '2999-12-31');
      const active = ACTIVE_MOVIE_STATUSES.includes(movie.status);
      const future = date.isValid() && (date.isAfter(today) || date.isSame(today, 'day'));
      return { item: movie, group: active && future ? 0 : active ? 1 : 2, time: date.isValid() ? date.valueOf() : 0 };
    });
    return scored.sort((a, b) => a.group - b.group || (a.group === 0 ? a.time - b.time : b.time - a.time))[0]?.item || movies[0];
  }, [movies]);

  const latestAnime = useMemo(() => {
    const today = dayjs().startOf('day');
    const schedule = buildAnimeScheduleEvents(animes)
      .filter(event => dayjs(event.date).isSame(today, 'day') || dayjs(event.date).isAfter(today))
      .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf())[0];
    if (schedule?.animeId) return animes.find(anime => anime.id === schedule.animeId) || animes[0];
    return [...animes].sort((a, b) => dayjs(b.updatedAt || b.createdAt || b.startDate).valueOf() - dayjs(a.updatedAt || a.createdAt || a.startDate).valueOf())[0] || animes[0];
  }, [animes]);

  const latestAnimeImageUrl = useMemo(() => {
    if (!latestAnime) return '';
    return latestAnime.posterUrl || latestAnime.seasons?.find(season => season.posterUrl)?.posterUrl || '';
  }, [latestAnime]);

  return (
    <PageShell disablePadding>
      <div style={{ padding: '22px 0 140px', marginTop: 'calc(env(safe-area-inset-top) + 18px)' }}>
        {/* 顶部菜单按钮 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '850', color: '#111827', margin: 0, letterSpacing: '-0.04em' }}>
            <span style={{ color: '#53BEE8' }}>F</span>ave<span style={{ color: '#53BEE8' }}>A</span>rchive
          </h1>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 9999,
              border: '1px solid rgba(15,23,42,0.06)',
              background: 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(16px)',
              color: '#9CA3AF',
              boxShadow: '0 6px 18px rgba(15,23,42,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
          </button>
        </div>

        {/* NEXT EVENT 倒计时卡片 */}
        {(() => {
          // 在渲染前再次验证倒计时目标是否有效
          if (!countdownTarget) return null;
          const targetDateKey = toDateKey(countdownTarget.date);
          if (!targetDateKey) return null;
          const targetDate = dayjs(targetDateKey);
          const todayStart = dayjs().startOf('day');
          const isValid = targetDate.isSame(todayStart, 'day') || targetDate.isAfter(todayStart);

          if (!isValid) return null;

          return (
          <GlassCard
            padding="0"
            onClick={handleCountdownClick}
            style={{
              marginBottom: '20px',
              borderRadius: '28px',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(83, 190, 232, 0.2)',
            }}
          >
            <div style={{ position: 'relative', minHeight: '220px' }}>
              {countdownTarget.imageUrl || countdownTarget.imageId ? (
                <RemoteImage
                  imageUrl={countdownTarget.imageUrl}
                  imageId={countdownTarget.imageId}
                  alt={countdownTarget.title}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #53BEE8 0%, #667eea 100%)' }} />
              )}

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
                }}
              />

              <div style={{ position: 'relative', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: '220px' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: '1px', marginBottom: '8px' }}>
                  NEXT EVENT
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: 'white', marginBottom: '4px', lineHeight: 1.2 }}>
                  {countdownTarget.title}
                </div>
                {countdownTarget.subtitle && (
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.85)', marginBottom: '12px' }}>
                    {countdownTarget.subtitle}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  {(() => {
                    const daysUntil = getDaysUntil(countdownTarget.date);
                    if (daysUntil === 0) {
                      return (
                        <div style={{ fontSize: '48px', fontWeight: '900', color: '#53BEE8', lineHeight: 1 }}>
                          本日
                        </div>
                      );
                    } else if (daysUntil > 0) {
                      return (
                        <>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>
                            あと
                          </div>
                          <div style={{ fontSize: '48px', fontWeight: '900', color: '#53BEE8', lineHeight: 1 }}>
                            {daysUntil}
                          </div>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>
                            日
                          </div>
                        </>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginTop: '8px' }}>
                  {dayjs(countdownTarget.date).format('YYYY年MM月DD日')}
                </div>
              </div>
            </div>
          </GlassCard>
          );
        })() || (
          <GlassCard
            padding="32px 24px"
            style={{
              marginBottom: '20px',
              borderRadius: '28px',
              textAlign: 'center',
              border: '2px dashed rgba(83, 190, 232, 0.3)',
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}>📅</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: theme.colors.textSecondary }}>
              次の予定はありません
            </div>
          </GlassCard>
        )}

        {/* 今日の予定 */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#111827', marginBottom: '12px', paddingLeft: '4px' }}>
            今日の予定
          </h2>
          {todayEvents.length > 0 ? (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.52)',
                backdropFilter: 'blur(20px) saturate(1.25)',
                WebkitBackdropFilter: 'blur(20px) saturate(1.25)',
                border: '1px solid rgba(255, 255, 255, 0.55)',
                borderRadius: '22px',
                boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              {todayEvents.map(event => {
                const dotColor = getTodayEventDotColor(event);
                return (
                <div
                  key={event.id}
                  onClick={() => handleTodayEventClick(event)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    padding: '6px 8px',
                    borderRadius: '12px',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: dotColor,
                      boxShadow: `0 0 12px ${dotColor}aa`,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {event.title}
                      <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: '700', color: dotColor }}>
                        {event.eventLabel}
                      </span>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.52)',
                backdropFilter: 'blur(20px) saturate(1.25)',
                WebkitBackdropFilter: 'blur(20px) saturate(1.25)',
                border: '1px solid rgba(255, 255, 255, 0.55)',
                borderRadius: '22px',
                boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)',
                padding: '20px 16px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: '600', color: theme.colors.textSecondary }}>
                今日の予定はありません
              </div>
            </div>
          )}
        </div>

        {/* 内容入口カード */}
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 4px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#111827', margin: 0 }}>ライブラリ</h2>
          <span style={{ fontSize: 11, fontWeight: 800, color: theme.colors.textLabel, letterSpacing: '0.08em' }}>すべての記録</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <HomeEntryCard
            title="音楽"
            subtitle={latestConcert ? `${latestConcert.artist.name}・${artists.length}組` : `${artists.length}組`}
            imageUrl={latestConcert?.tour?.imageUrl || latestConcert?.artist?.imageUrl}
            onClick={onNavigateToMusic}
            fallback={<HomeEntryFallback icon={<span style={{ fontSize: 46 }}>🎵</span>} />}
          />

          <HomeEntryCard
            title="展覧"
            subtitle={`${exhibitions.length}件`}
            imageUrl={latestExhibition?.imageUrl}
            imageId={latestExhibition?.imageIds?.[0]}
            onClick={onNavigateToExhibitions}
            fallback={<HomeEntryFallback icon={<Icons.Exhibitions style={{ width: 50, height: 50 }} />} />}
          />

          <HomeEntryCard
            title="映画"
            subtitle={`${movies.length}本`}
            imageUrl={latestMovie?.posterUrl}
            onClick={onNavigateToMovies}
            fallback={<HomeEntryFallback icon={<span style={{ fontSize: 46 }}>🎬</span>} />}
          />

          <HomeEntryCard
            title="アニメ"
            subtitle={`${animes.length}本`}
            imageUrl={latestAnimeImageUrl}
            onClick={onNavigateToAnime}
            fallback={<HomeEntryFallback icon={<span style={{ fontSize: 46 }}>📺</span>} />}
          />
        </div>
      </div>

      {/* 菜单弹出层 */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (evt) => {
            try {
              const data = JSON.parse(evt.target?.result as string);
              onImport(data);
            } catch (err) {
              console.error('Import failed:', err);
              alert('ファイルの読み込みに失敗しました。');
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
          };
          reader.readAsText(file);
          setIsMenuOpen(false);
        }}
      />
      {isMenuOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex: 119 }} onClick={() => setIsMenuOpen(false)} />
          <div
            style={{
              position: 'fixed',
              top: 'calc(12px + env(safe-area-inset-top) + 52px)',
              right: 16,
              zIndex: 120,
              width: 300,
              maxWidth: 'calc(100vw - 32px)',
            }}
          >
            <GlassCard>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              <section>
                <h4 style={sectionTitleStyle}>NEXT EVENT</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <MenuButton
                    label="カウントダウンを修正"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsEditCountdownOpen(true);
                      setCountdownStep('type');
                      setSelectedType(null);
                    }}
                  />
                </div>
              </section>

              <section style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)', paddingTop: theme.spacing.md }}>
                <h4 style={sectionTitleStyle}>データ</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <MenuButton
                    label="タグ管理"
                    icon={<Icons.Tag />}
                    onClick={() => {
                      onNavigateToTagManagement?.();
                      setIsMenuOpen(false);
                    }}
                  />
                  <MenuButton
                    label="書き出す"
                    icon={<Icons.Upload />}
                    onClick={() => {
                      onExport();
                      setIsMenuOpen(false);
                    }}
                  />
                  <MenuButton
                    label="読み込む"
                    icon={<Icons.Download />}
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                  />
                </div>
              </section>
            </div>
            </GlassCard>
          </div>
        </>
      )}

      {/* 编辑倒计时弹窗 */}
      {isEditCountdownOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
          onClick={() => {
            setIsEditCountdownOpen(false);
            setCountdownStep('type');
            setSelectedType(null);
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)'
            }}
          />
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '360px',
              maxHeight: '500px',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <GlassCard padding="24px">
              <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 16 }}>
                {countdownStep === 'type' ? 'イベントタイプを選択' : 'イベントを選択'}
              </h3>

              {countdownStep === 'type' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <MenuButton label="公演" onClick={() => { setSelectedType('concert'); setCountdownStep('select'); }} />
                  <MenuButton label="展覧" onClick={() => { setSelectedType('exhibition'); setCountdownStep('select'); }} />
                  <MenuButton label="映画" onClick={() => { setSelectedType('movie'); setCountdownStep('select'); }} />
                  <MenuButton label="アニメ" onClick={() => { setSelectedType('anime'); setCountdownStep('select'); }} />
                </div>
              ) : (
                <>
                  <MenuButton
                    label="← 戻る"
                    onClick={() => {
                      setCountdownStep('type');
                      setSelectedType(null);
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '350px', overflowY: 'auto', marginTop: 12 }}>
                    {selectableEvents.length === 0 ? (
                      <div style={{ padding: '40px 20px', textAlign: 'center', color: theme.colors.textSecondary, fontSize: 14 }}>
                        選択可能なイベントがありません
                      </div>
                    ) : (
                      selectableEvents.map(event => (
                        <button
                          key={event.id}
                          onClick={() => {
                            setCountdownTarget(event);
                            setIsEditCountdownOpen(false);
                            setCountdownStep('type');
                            setSelectedType(null);
                          }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '10px 12px',
                            borderRadius: 12,
                            border: 'none',
                            background: countdownTarget?.id === event.id ? 'rgba(83, 190, 232, 0.1)' : 'transparent',
                            color: countdownTarget?.id === event.id ? theme.colors.primary : theme.colors.text,
                            fontSize: 14,
                            fontWeight: countdownTarget?.id === event.id ? 800 : 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ fontSize: 14, fontWeight: 800 }}>
                            {event.title}
                          </div>
                          {event.subtitle && (
                            <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginTop: 2 }}>
                              {event.subtitle}
                            </div>
                          )}
                          <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, marginTop: 2 }}>
                            {dayjs(event.date).format('YYYY年MM月DD日')}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}

              <MenuButton
                label="閉じる"
                onClick={() => {
                  setIsEditCountdownOpen(false);
                  setCountdownStep('type');
                  setSelectedType(null);
                }}
                style={{ marginTop: 16 }}
              />
            </GlassCard>
          </div>
        </div>
      )}
    </PageShell>
  );
};
