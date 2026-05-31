import { Artist, Exhibition, SiteLink, Tour, Concert, Movie, Actor, Anime, Season, Episode, OpeningSong, EndingSong, AnimeStatus } from '@/domain/types';

export const normalizeArtistData = (artist: any): Artist => {
  return {
    ...artist,
    id: String(artist.id || Math.random().toString(36).substr(2, 9)),
    name: artist.name || '名称未設定',
    imageUrl: artist.imageUrl || '',
    links: Array.isArray(artist.links) ? artist.links : [],
    autoTrackConcerts: !!artist.autoTrackConcerts,
    autoTrackTickets: !!artist.autoTrackTickets,
    tours: Array.isArray(artist.tours) ? artist.tours.map((t: any) => ({
      ...t,
      id: String(t.id || Math.random().toString(36).substr(2, 9)),
      name: t.name || '名称未設定',
      imageUrl: t.imageUrl || '',
      concerts: Array.isArray(t.concerts) ? t.concerts.map((c: any) => ({
        ...c,
        id: String(c.id || Math.random().toString(36).substr(2, 9)),
        date: c.date || 'TBD',
        venue: c.venue || '',
        status: c.status || '発売前',
        performances: Array.isArray(c.performances) ? c.performances : [],
        imageIds: Array.isArray(c.imageIds) ? c.imageIds : []
      })) : []
    })) : []
  };
};

export const normalizeExhibitionData = (ex: any): Exhibition => {
  return {
    ...ex,
    id: String(ex.id || Math.random().toString(36).substr(2, 9)),
    title: ex.title || '名称未設定',
    startDate: ex.startDate || '',
    endDate: ex.endDate || '',
    status: ex.status || 'NONE',
    ticketSalesStatus: ex.ticketSalesStatus || 'none',
    hasAdvanceTicket: !!ex.hasAdvanceTicket,
    advanceSaleAt: ex.advanceSaleAt || ex.saleStartAt || '',
    advanceTicketPurchased: !!ex.advanceTicketPurchased || ex.ticketSalesStatus === 'purchased',
    needsReservation: !!ex.needsReservation,
    holidaySameAsWeekday: !!ex.holidaySameAsWeekday,
    holidayPriceSameAsWeekday: !!ex.holidayPriceSameAsWeekday,
    imageIds: Array.isArray(ex.imageIds) ? ex.imageIds : [],
    artists: Array.isArray(ex.artists) ? ex.artists : []
  };
};


export const normalizeMovieData = (movie: any): Movie => {
  const now = new Date().toISOString();
  return {
    ...movie,
    id: String(movie.id || Math.random().toString(36).substr(2, 9)),
    title: movie.title || '新規映画',
    posterUrl: movie.posterUrl || '',
    theaterName: movie.theaterName || '',
    screenName: movie.screenName || '',
    seat: movie.seat || '',
    releaseDate: movie.releaseDate || '',
    watchDate: movie.watchDate || '',
    startTime: movie.startTime || '',
    endTime: movie.endTime || '',
    memo: movie.memo || '',
    actors: Array.isArray(movie.actors) ? movie.actors : [],
    directors: Array.isArray(movie.directors) ? movie.directors : [],
    price: typeof movie.price === 'number' ? movie.price : (movie.price === '' || movie.price == null ? undefined : Number(movie.price) || undefined),
    ticketType: movie.ticketType || '通常',
    status: movie.status || '未上映',
    websiteUrl: movie.websiteUrl || '',
    saleAt: movie.saleAt || '',
    deadlineAt: movie.deadlineAt || '',
    saleLink: movie.saleLink || '',
    lotteryName: movie.lotteryName || '',
    lotteryUrl: movie.lotteryUrl || '',
    lotteryResultAt: movie.lotteryResultAt || '',
    lotteryPrice: typeof movie.lotteryPrice === 'number' ? movie.lotteryPrice : (movie.lotteryPrice === '' || movie.lotteryPrice == null ? undefined : Number(movie.lotteryPrice) || undefined),
    lotteryResult: movie.lotteryResult === 'WON' || movie.lotteryResult === 'LOST' ? movie.lotteryResult : null,
    lotteryHistory: Array.isArray(movie.lotteryHistory) ? movie.lotteryHistory : [],
    createdAt: movie.createdAt || now,
    updatedAt: movie.updatedAt || movie.createdAt || now,
  };
};


export const normalizeActorData = (actor: any): Actor => {
  const now = new Date().toISOString();
  return {
    ...actor,
    id: String(actor?.id || Math.random().toString(36).substr(2, 9)),
    name: String(actor?.name || '').trim() || '名前未設定',
    avatar: actor?.avatar || '',
    isFollowed: actor?.isFollowed !== false,
    createdAt: actor?.createdAt || now,
    updatedAt: actor?.updatedAt || actor?.createdAt || now,
  };
};


const normalizeAnimeStatus = (status?: string, watchDecision?: string): AnimeStatus => {
  const raw = String(status || '').trim();
  if (raw === '放送前') return '放送前';
  if (raw === '視聴予定') return '視聴予定';
  if (raw === '視聴中') return '視聴中';
  if (raw === '保留') return '保留';
  if (raw === '視聴済み') return '視聴済み';
  if (raw === '視聴中止') return '視聴中止';
  if (raw === '見送り' || raw === '未視聴') return '見送り';

  const decision = String(watchDecision || '').trim();
  if (decision === 'watch' || decision === '視聴' || decision === '見る') return '視聴予定';
  if (decision === 'skip' || decision === '見送り' || decision === '見ない') return '見送り';

  return '放送前';
};

const normalizeSong = (song: any): OpeningSong | EndingSong => ({
  songTitle: song?.songTitle || '',
  artistName: song?.artistName || '',
  coverUrl: song?.coverUrl || '',
  musicUrl: song?.musicUrl || '',
});

const normalizeEpisode = (episode: any, idx: number): Episode => ({
  ...episode,
  id: String(episode?.id || Math.random().toString(36).substr(2, 9)),
  episodeNumber: typeof episode?.episodeNumber === 'number' ? episode.episodeNumber : idx + 1,
  title: episode?.title || '',
  summary: episode?.summary || '',
  review: episode?.review || '',
  watchedDate: episode?.watchedDate || '',
});

const looksLikeSeasonNumber = (value?: string) => /^第.+[期季]$|^Season\s*\d+$/i.test(String(value || '').trim());

const normalizeSeason = (season: any, idx: number, anime?: any): Season => ({
  ...season,
  id: String(season?.id || Math.random().toString(36).substr(2, 9)),
  seasonNumber: season?.seasonNumber || (looksLikeSeasonNumber(season?.seasonTitle) ? season.seasonTitle : `第${idx + 1}期`),
  seasonTitle: looksLikeSeasonNumber(season?.seasonTitle) ? '' : (season?.seasonTitle || ''),
  posterUrl: season?.posterUrl || '',
  startDate: season?.startDate || (idx === 0 ? anime?.startDate || '' : ''),
  endDate: season?.endDate || (idx === 0 ? anime?.endDate || '' : ''),
  studio: season?.studio || (idx === 0 ? anime?.studio || '' : ''),
  director: season?.director || (idx === 0 ? anime?.director || '' : ''),
  originalType: season?.originalType || (idx === 0 ? anime?.originalType : undefined),
  originalTitle: season?.originalTitle || (idx === 0 ? anime?.originalTitle || '' : ''),
  openingSongs: Array.isArray(season?.openingSongs) ? season.openingSongs.map(normalizeSong) : [],
  endingSongs: Array.isArray(season?.endingSongs) ? season.endingSongs.map(normalizeSong) : [],
  genres: Array.from(new Set((Array.isArray(season?.genres) ? season.genres : []).map((g: any) => String(g || '').trim()).filter(Boolean))),
  summary: season?.summary || '',
  rating: typeof season?.rating === 'number' ? season.rating : (season?.rating ? Number(season.rating) : undefined),
  review: season?.review || '',
  totalEpisodes: typeof season?.totalEpisodes === 'number' ? season.totalEpisodes : (season?.totalEpisodes ? Number(season.totalEpisodes) : undefined),
  broadcastWeekday: season?.broadcastWeekday || '',
  broadcastTime: '',
  episodes: Array.isArray(season?.episodes) ? season.episodes.map(normalizeEpisode) : [],
  status: normalizeAnimeStatus(season?.status, season?.watchDecision),
  watchDecision: season?.watchDecision,
  collapsed: idx === 0 ? season?.collapsed === true : season?.collapsed !== false,
});

export const normalizeAnimeData = (anime: any): Anime => {
  const now = new Date().toISOString();
  const baseSeasons = Array.isArray(anime?.seasons) && anime.seasons.length > 0
    ? anime.seasons
    : [{ seasonNumber: '第1期', seasonTitle: '' }];
  const normalizedSeasons = baseSeasons.map((season: any, idx: number) => normalizeSeason(season, idx, anime));
  const latestSeasonPosterUrl = [...normalizedSeasons].reverse().find((season) => season.posterUrl?.trim())?.posterUrl || anime?.posterUrl || '';

  return {
    ...anime,
    id: String(anime?.id || Math.random().toString(36).substr(2, 9)),
    title: String(anime?.title || '').trim() || 'タイトル未設定',
    posterUrl: latestSeasonPosterUrl,
    status: normalizeAnimeStatus(anime?.status, anime?.watchDecision),
    startDate: anime?.startDate || '',
    endDate: anime?.endDate || '',
    studio: anime?.studio || '',
    director: anime?.director || '',
    originalType: anime?.originalType || undefined,
    originalTitle: anime?.originalTitle || '',
    openingSongs: Array.isArray(anime?.openingSongs) ? anime.openingSongs.map(normalizeSong) : [],
    endingSongs: Array.isArray(anime?.endingSongs) ? anime.endingSongs.map(normalizeSong) : [],
    genres: Array.from(new Set((Array.isArray(anime?.genres) ? anime.genres : []).map((g: any) => String(g || '').trim()).filter(Boolean))),
    summary: anime?.summary || '',
    rating: typeof anime?.rating === 'number' ? anime.rating : (anime?.rating ? Number(anime.rating) : undefined),
    review: anime?.review || '',
    totalEpisodes: typeof anime?.totalEpisodes === 'number' ? anime.totalEpisodes : (anime?.totalEpisodes ? Number(anime.totalEpisodes) : undefined),
    broadcastWeekday: anime?.broadcastWeekday || '',
    broadcastTime: '',
    seasons: normalizedSeasons,
    createdAt: anime?.createdAt || now,
    updatedAt: anime?.updatedAt || anime?.createdAt || now,
  };
};
