import { Artist, Exhibition, SiteLink, Tour, Concert } from '../domain/types';

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
    needsReservation: !!ex.needsReservation,
    holidaySameAsWeekday: !!ex.holidaySameAsWeekday,
    holidayPriceSameAsWeekday: !!ex.holidayPriceSameAsWeekday,
    imageIds: Array.isArray(ex.imageIds) ? ex.imageIds : [],
    artists: Array.isArray(ex.artists) ? ex.artists : []
  };
};
