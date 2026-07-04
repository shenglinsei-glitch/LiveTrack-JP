import { Artist, StatusItem, Exhibition, Movie, Anime, AnimeStatus, Season } from '@/domain/types';
import { parseConcertDate, getEffectiveExhibitionStatus } from '@/domain/logic';
import dayjs from 'dayjs';

const ANIME_STATUS_PRIORITY: AnimeStatus[] = ['視聴中', '視聴予定', '保留', '放送前', '視聴済み', '視聴中止', '見送り'];
const WEEKDAY_TO_NUMBER: Record<string, number> = { '日': 0, '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6 };
const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

type AnimeStatusSection = 'pending' | 'decided' | 'upcoming' | 'history';

const toDateKey = (value?: string) => {
  if (!value) return '';
  const str = String(value).trim();
  const match = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getStartDatePlusOneWeekday = (startDate?: string): string => {
  const key = toDateKey(startDate);
  if (!key) return '';
  const d = parseConcertDate(key, 'NORMAL');
  if (!d) return '';
  d.setDate(d.getDate() + 1);
  return WEEKDAY_LABELS[d.getDay()] || '';
};

const getSeasonDisplayTitle = (anime: Anime, season?: Season): string => {
  if (!season) return anime.title;
  const looksLikeSeasonNumber = (value?: string) => /^第.+[期季]$|^Season\s*\d+$/i.test(String(value || '').trim());
  const number = String(season.seasonNumber || (looksLikeSeasonNumber(season.seasonTitle) ? season.seasonTitle : '') || '').trim();
  const title = (season.useAnimeTitle || !String(season.seasonTitle || '').trim() || looksLikeSeasonNumber(season.seasonTitle)) ? anime.title : String(season.seasonTitle || '').trim();
  return number ? `${number} ${title}` : title;
};

const deriveAnimeOverallStatus = (anime: Anime): AnimeStatus => {
  const statuses = (anime.seasons || []).map((season) => season.status).filter(Boolean) as AnimeStatus[];
  if (!statuses.length) return anime.status || '放送前';
  return ANIME_STATUS_PRIORITY.find((status) => statuses.includes(status)) || anime.status || '放送前';
};

const getSeasonNextBroadcastDate = (anime: Anime, season?: Season, now: Date = new Date()): string => {
  const startDate = season?.startDate || anime.startDate || '';
  const endDate = season?.endDate || anime.endDate || '';
  const weekday = getStartDatePlusOneWeekday(startDate) || season?.broadcastWeekday || anime.broadcastWeekday || '';
  const time = season?.broadcastTime || anime.broadcastTime || '';

  if (weekday && WEEKDAY_TO_NUMBER[weekday] !== undefined) {
    const target = WEEKDAY_TO_NUMBER[weekday];
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = (target - base.getDay() + 7) % 7;
    const next = new Date(base);
    next.setDate(base.getDate() + diff);
    if (endDate) {
      const end = parseConcertDate(toDateKey(endDate), 'NORMAL');
      if (end && next > end) return toDateKey(endDate);
    }
    const y = next.getFullYear();
    const m = String(next.getMonth() + 1).padStart(2, '0');
    const d = String(next.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}${time ? ` ${time}` : ''}`;
  }

  return toDateKey(startDate || endDate || anime.updatedAt || anime.createdAt);
};

const isDateReached = (value?: string, now: Date = new Date()) => {
  const key = toDateKey(value);
  if (!key) return false;
  const date = parseConcertDate(key, 'NORMAL');
  if (!date) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return today >= date;
};

const classifyAnimeSeason = (anime: Anime, season?: Season, now: Date = new Date()): AnimeStatusSection => {
  const status = season?.status || anime.status || '放送前';
  const startDate = season?.startDate || anime.startDate;
  const watchDecision = (season as any)?.watchDecision || (anime as any)?.watchDecision;
  if (status === '視聴済み' || status === '視聴中止' || status === '見送り') return 'history';
  if (status === '放送前' && !isDateReached(startDate, now)) return 'upcoming';
  if (status === '放送前') return 'pending';
  if (status === '視聴予定') return 'pending';
  if (status === '視聴中') {
    const nextDate = getSeasonNextBroadcastDate(anime, season, now);
    return isDateReached(nextDate, now) ? 'pending' : 'decided';
  }
  if (status === '保留') return 'decided';
  return 'decided';
};

export function generateStatusItems(artists: Artist[], exhibitions: Exhibition[], movies: Movie[] = [], animes: Anime[] = []): StatusItem[] {
  const items: StatusItem[] = [];
  const now = new Date();

  (artists || []).forEach((artist) => {
    (artist.tours || []).forEach((tour) => {
      (tour.concerts || []).forEach((concert) => {
        const concertDateStr = concert.concertAt || concert.date;
        const concertDate = parseConcertDate(concertDateStr, 'CONCERT');
        const isPassed = concertDate && now >= concertDate;

        let actionType: StatusItem['actionType'] = 'lottery';
        let displayStatus: string = concert.status;

        if (concert.status === '抽選中') {
          actionType = 'result';
        } else if (concert.status === '参戦予定' || concert.status === '参戦済み') {
          actionType = 'ticket';
        }

        if (concert.status === '見送' && concert.lotteryResult === 'LOST') {
          displayStatus = '落選';
        } else if (concert.status === '参戦予定' && concert.lotteryResult === 'WON') {
          displayStatus = '当選';
        } else if (concert.status === '見送' && isPassed) {
          displayStatus = '見送';
        }

        items.push({
          id: `${artist.id}-${tour.id}-${concert.id}`,
          type: 'concert',
          parentId: artist.id,
          title: `${artist.name} - ${tour.name}`,
          date: concertDateStr,
          status: concert.status,
          actionType,
          displayStatus,
          raw: {
            artistId: artist.id,
            artistName: artist.name,
            artistImageUrl: (artist as any).avatar || artist.imageUrl || '',
            artistImageId: (artist as any).imageId,
            tourId: tour.id,
            tourName: tour.name,
            tourImageUrl: tour.imageUrl || '',
            tourImageId: (tour as any).imageId,
            concertId: concert.id,
            ...concert,
          },
        });
      });
    });
  });

  (exhibitions || []).forEach((exhibition) => {
    const effectiveStatus = getEffectiveExhibitionStatus(exhibition, now);
    const baseRaw = { ...exhibition, effectiveStatus };
    const startDate = exhibition.startDate;
    const endDate = exhibition.endDate;
    const visitDate = exhibition.visitedAt || endDate || startDate;
    const reservedDate = exhibition.reservedAt || startDate;

    if (effectiveStatus === 'NONE') return;

    if (effectiveStatus === 'PLANNED') {
      items.push({ id: `exh-planned-${exhibition.id}`, type: 'exhibition', parentId: exhibition.id, title: exhibition.title, date: startDate, status: 'PLANNED', actionType: 'exhibition_start', displayStatus: '開催中', raw: baseRaw });
      return;
    }
    if (effectiveStatus === 'RESERVED') {
      items.push({ id: `exh-reserved-${exhibition.id}`, type: 'exhibition', parentId: exhibition.id, title: exhibition.title, date: reservedDate, status: 'RESERVED', actionType: 'exhibition_start', displayStatus: '予約済', raw: baseRaw });
      return;
    }
    if (effectiveStatus === 'VISITED') {
      items.push({ id: `exh-visited-${exhibition.id}`, type: 'exhibition', parentId: exhibition.id, title: exhibition.title, date: visitDate, status: 'VISITED', actionType: 'exhibition_end', displayStatus: '訪問済み', raw: baseRaw });
      return;
    }
    if (effectiveStatus === 'SKIPPED') {
      items.push({ id: `exh-skipped-${exhibition.id}`, type: 'exhibition', parentId: exhibition.id, title: exhibition.title, date: endDate || startDate, status: 'SKIPPED', actionType: 'exhibition_end', displayStatus: '見送り', raw: baseRaw });
      return;
    }

    items.push({ id: `exh-ended-${exhibition.id}`, type: 'exhibition', parentId: exhibition.id, title: exhibition.title, date: endDate || startDate, status: 'ENDED', actionType: 'exhibition_end', displayStatus: '終了', raw: baseRaw });
  });

  (movies || []).forEach((movie) => {
    const displayStatus = movie.status === '見送り' && movie.lotteryResult === 'LOST' ? '落選' : movie.status === '鑑賞予定' && movie.lotteryResult === 'WON' ? '当選' : movie.status;

    items.push({
      id: `movie-${movie.id}`,
      type: 'movie',
      parentId: movie.id,
      title: movie.title,
      date: movie.status === '抽選中' ? (movie.lotteryResultAt || movie.releaseDate || '') : movie.status === '発売前' ? (movie.saleAt || movie.deadlineAt || movie.releaseDate || '') : (movie.watchDate || movie.releaseDate || ''),
      status: movie.status,
      actionType: 'movie',
      displayStatus,
      raw: { ...movie, statusSection: movie.status === '未上映' ? 'upcoming' : undefined },
    });
  });

  (animes || []).forEach((anime) => {
    const seasons = anime.seasons && anime.seasons.length > 0
      ? anime.seasons
      : [{ id: 'default', seasonNumber: '', seasonTitle: '', startDate: anime.startDate, endDate: anime.endDate, broadcastWeekday: anime.broadcastWeekday, broadcastTime: anime.broadcastTime, status: anime.status || '放送前', useAnimeTitle: true, episodes: [] } as Season];
    const overallStatus = deriveAnimeOverallStatus(anime);

    seasons.forEach((season, index) => {
      const status = season.status || anime.status || '放送前';
      const nextDate = getSeasonNextBroadcastDate(anime, season, now);
      const totalEpisodes = season.totalEpisodes || season.episodes?.length || anime.totalEpisodes || 0;
      const watchedEpisodes = (season.episodes || []).filter((episode) => !!episode.watchedDate).length;
      const statusSection = classifyAnimeSeason(anime, season, now);
      const startDate = season.startDate || anime.startDate || '';
      const broadcastWeekday = getStartDatePlusOneWeekday(startDate) || season.broadcastWeekday || anime.broadcastWeekday || '';

      items.push({
        id: `anime-${anime.id}-${season.id || index}`,
        type: 'anime',
        parentId: anime.id,
        title: getSeasonDisplayTitle(anime, season),
        date: statusSection === 'upcoming' ? startDate : nextDate || startDate || anime.updatedAt || '',
        status,
        actionType: 'anime_update',
        displayStatus: status,
        raw: {
          ...anime,
          status: overallStatus,
          seasonId: season.id,
          seasonIndex: index,
          season,
          seasonStatus: status,
          statusSection,
          nextBroadcastAt: nextDate,
          totalEpisodes,
          watchedEpisodes,
          broadcastWeekday,
          watchDecision: (season as any).watchDecision,
        },
      });
    });
  });

  return items;
}
