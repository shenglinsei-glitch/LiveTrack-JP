import { Artist, Exhibition, SiteLink, Tour, Concert, Movie } from '../domain/types';

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
