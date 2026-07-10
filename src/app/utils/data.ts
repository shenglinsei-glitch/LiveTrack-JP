import {
  Actor,
  Anime,
  AnimeStatus,
  Gacha,
  GachaKind,
  GachaPrize,
  GachaStatus,
  Artist,
  Concert,
  Exhibition,
  ExhibitionArtist,
  ExhibitionClosedDay,
  ExhibitionGoods,
  ExhibitionSpecialHours,
  ExhibitionUrl,
  Movie,
  Tour,
} from '@/domain/types';

const makeId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const asArray = <T,>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : []);
const asString = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
const asNumber = (value: unknown, fallback = 0): number => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const asBoolean = (value: unknown, fallback = false): boolean => (typeof value === 'boolean' ? value : fallback);

const normalizeConcert = (raw: any): Concert => {
  const lotteryHistory = asArray<any>(raw?.lotteryHistory).map((item, index) => ({
    id: asString(item?.id, makeId(`lottery-${index}`)),
    at: asString(item?.at, new Date().toISOString()),
    result: (item?.result === 'WON' ? 'WON' : 'LOST') as 'WON' | 'LOST',
    lotteryName: item?.lotteryName ?? raw?.lotteryName ?? null,
    resultAt: item?.resultAt ?? raw?.resultAt ?? null,
  }));

  const setlist = asArray<any>(raw?.setlist).map((item, index) => ({
    id: asString(item?.id, makeId(`setlist-${index}`)),
    song: asString(item?.song ?? item?.songName),
    order: asNumber(item?.order, index + 1),
  }));

  return {
    id: asString(raw?.id, makeId('concert')),
    date: asString(raw?.date),
    venue: asString(raw?.venue),
    price: asNumber(raw?.price, 0),
    saleLink: asString(raw?.saleLink),
    status: raw?.status || '検討中',
    isParticipated: asBoolean(raw?.isParticipated, raw?.status === '参戦予定' || raw?.status === '参戦済み'),
    imageIds: asArray<string>(raw?.imageIds),
    images: asArray<string>(raw?.images),
    saleAt: raw?.saleAt ?? null,
    deadlineAt: raw?.deadlineAt ?? null,
    resultAt: raw?.resultAt ?? null,
    concertAt: raw?.concertAt ?? null,
    lotteryName: raw?.lotteryName ?? null,
    lotteryResult: raw?.lotteryResult ?? null,
    lotteryHistory,
    doorTime: asString(raw?.doorTime),
    startTime: asString(raw?.startTime),
    seatType: asString(raw?.seatType),
    seatLocation: asString(raw?.seatLocation),
    setlist,
    goods: asArray<any>(raw?.goods).map(normalizeGoods),
  };
};

const normalizeTour = (raw: any): Tour => ({
  id: asString(raw?.id, makeId('tour')),
  name: asString(raw?.name, '名称未設定'),
  imageUrl: asString(raw?.imageUrl),
  memo: raw?.memo,
  officialUrl: raw?.officialUrl,
  concerts: asArray<any>(raw?.concerts).map(normalizeConcert),
});

export const normalizeArtistData = (raw: any): Artist => ({
  id: asString(raw?.id, makeId('artist')),
  name: asString(raw?.name, '名称未設定'),
  imageUrl: asString(raw?.imageUrl),
  links: asArray<any>(raw?.links).map((link) => ({
    name: asString(link?.name),
    url: asString(link?.url),
  })),
  tours: asArray<any>(raw?.tours).map(normalizeTour),
  order: raw?.order,
});

const normalizeExhibitionArtist = (raw: any, index: number): ExhibitionArtist => ({
  id: asString(raw?.id, makeId(`exhibition-artist-${index}`)),
  name: asString(raw?.name),
  note: raw?.note,
});

const normalizeSpecialHours = (raw: any, index: number): ExhibitionSpecialHours => ({
  id: asString(raw?.id, makeId(`special-hours-${index}`)),
  type: raw?.type === 'weekday' ? 'weekday' : 'date',
  dateOrWeekday: asString(raw?.dateOrWeekday ?? raw?.date ?? raw?.weekday),
  startTime: asString(raw?.startTime ?? raw?.openTime),
  endTime: asString(raw?.endTime ?? raw?.closeTime),
});

const normalizeClosedDay = (raw: any, index: number): ExhibitionClosedDay => ({
  id: asString(raw?.id, makeId(`closed-day-${index}`)),
  type: raw?.type === 'weekday' ? 'weekday' : 'date',
  dateOrWeekday: asString(raw?.dateOrWeekday ?? raw?.date ?? raw?.weekday ?? raw),
});

const normalizeUrlItem = (raw: any, index: number): ExhibitionUrl => ({
  id: asString(raw?.id, makeId(`url-${index}`)),
  name: asString(raw?.name, index === 0 ? '公式サイト' : ''),
  url: asString(raw?.url ?? raw),
});

const normalizeGoods = (raw: any, index: number): ExhibitionGoods => ({
  id: asString(raw?.id, makeId(`goods-${index}`)),
  imageUrl: asString(raw?.imageUrl),
  name: asString(raw?.name),
  price: typeof raw?.price === 'number' ? raw.price : undefined,
  quantity: typeof raw?.quantity === 'number' ? raw.quantity : undefined,
});

export const normalizeExhibitionData = (raw: any): Exhibition => {
  const websiteUrl = asString(raw?.websiteUrl ?? raw?.officialUrl);
  const urls = asArray<any>(raw?.urls).map(normalizeUrlItem);
  if (websiteUrl && urls.length === 0) {
    urls.push({ id: makeId('url'), name: '公式サイト', url: websiteUrl });
  }

  const venueName = asString(raw?.venueName ?? raw?.venue);
  const venueTags = asArray<string>(raw?.venueTags).filter(Boolean);
  if (venueName && venueTags.length === 0) venueTags.push(venueName);

  const migratedReservedAt = raw?.reservedAt ?? (raw?.status === 'RESERVED' ? raw?.visitedAt : undefined);
  const visitedDate = asString(raw?.visitedAtDate ?? (typeof raw?.visitedAt === 'string' && raw?.status !== 'RESERVED' ? raw.visitedAt.slice(0, 10) : ''));
  const visitedTime = asString(raw?.visitTime ?? (typeof raw?.visitedAt === 'string' && raw?.status !== 'RESERVED' && raw.visitedAt.length >= 16 ? raw.visitedAt.slice(11, 16) : ''));
  const migratedVisitedAt = raw?.status === 'RESERVED' && !raw?.reservedAt
    ? undefined
    : (raw?.visitedAt ?? (visitedDate ? `${visitedDate}${visitedTime ? ` ${visitedTime}` : ''}` : undefined));

  return {
    id: asString(raw?.id, makeId('exhibition')),
    title: asString(raw?.title, '名称未設定'),
    imageUrl: asString(raw?.imageUrl),
    startDate: asString(raw?.startDate),
    endDate: asString(raw?.endDate),
    websiteUrl,
    area: asString(raw?.area),
    venueName,
    venue: asString(raw?.venue),
    venueTags,
    weekdayStartTime: asString(raw?.weekdayStartTime ?? raw?.regularOpenTime),
    weekdayEndTime: asString(raw?.weekdayEndTime ?? raw?.regularCloseTime),
    holidaySameAsWeekday: asBoolean(raw?.holidaySameAsWeekday, true),
    holidayStartTime: asString(raw?.holidayStartTime),
    holidayEndTime: asString(raw?.holidayEndTime),
    regularOpenTime: asString(raw?.regularOpenTime ?? raw?.weekdayStartTime),
    regularCloseTime: asString(raw?.regularCloseTime ?? raw?.weekdayEndTime),
    specialHours: asArray<any>(raw?.specialHours).map(normalizeSpecialHours),
    closedDates: asArray<string>(raw?.closedDates),
    closedDays: asArray<any>(raw?.closedDays).map(normalizeClosedDay),
    noClosedDays: asBoolean(raw?.noClosedDays),
    weekdayPrice: raw?.weekdayPrice,
    holidayPrice: raw?.holidayPrice,
    holidayPriceSameAsWeekday: asBoolean(raw?.holidayPriceSameAsWeekday, true),
    isFree: asBoolean(raw?.isFree),
    admissionFee: typeof raw?.admissionFee === 'number' ? raw.admissionFee : raw?.weekdayPrice,
    ticketSalesStatus: raw?.ticketSalesStatus || 'none',
    saleStartAt: raw?.saleStartAt,
    hasAdvanceTicket: raw?.hasAdvanceTicket,
    advanceSaleAt: raw?.advanceSaleAt,
    advanceTicketPurchased: raw?.advanceTicketPurchased,
    needsReservation: asBoolean(raw?.needsReservation ?? raw?.reservationRequired),
    reservationRequired: asBoolean(raw?.reservationRequired ?? raw?.needsReservation),
    reservationStartAt: raw?.reservationStartAt,
    reservationEndAt: raw?.reservationEndAt,
    reservedAt: migratedReservedAt,
    visitedAt: migratedVisitedAt,
    visitedAtDate: visitedDate,
    visitTime: visitedTime,
    status: raw?.status || 'NONE',
    description: asString(raw?.description),
    artists: asArray<any>(raw?.artists).map(normalizeExhibitionArtist),
    imageIds: asArray<string>(raw?.imageIds),
    goods: asArray<any>(raw?.goods).map(normalizeGoods),
    comment: asString(raw?.comment),
    urls,
  };
};

export const normalizeMovieData = (raw: any): Movie => ({
  id: asString(raw?.id, makeId('movie')),
  title: asString(raw?.title, '名称未設定'),
  posterUrl: asString(raw?.posterUrl),
  theaterName: asString(raw?.theaterName),
  screenName: asString(raw?.screenName),
  seat: asString(raw?.seat),
  releaseDate: raw?.releaseDate,
  watchDate: raw?.watchDate,
  startTime: raw?.startTime,
  endTime: raw?.endTime,
  memo: raw?.memo,
  actors: asArray<string>(raw?.actors),
  directors: asArray<string>(raw?.directors),
  genres: asArray<string>(raw?.genres ?? (raw?.genre ? [raw.genre] : [])),
  price: raw?.price,
  ticketType: raw?.ticketType || '通常',
  status: raw?.status || '未上映',
  websiteUrl: raw?.websiteUrl,
  saleAt: raw?.saleAt,
  deadlineAt: raw?.deadlineAt,
  saleLink: raw?.saleLink,
  lotteryName: raw?.lotteryName,
  lotteryUrl: raw?.lotteryUrl,
  lotteryResultAt: raw?.lotteryResultAt,
  lotteryPrice: raw?.lotteryPrice,
  lotteryResult: raw?.lotteryResult ?? null,
  lotteryHistory: asArray<any>(raw?.lotteryHistory).map((item) => ({
    at: asString(item?.at, new Date().toISOString()),
    result: item?.result === 'WON' ? 'WON' : 'LOST',
    lotteryName: item?.lotteryName,
    lotteryResultAt: item?.lotteryResultAt,
  })),
  createdAt: asString(raw?.createdAt, new Date().toISOString()),
  updatedAt: asString(raw?.updatedAt, new Date().toISOString()),
});

export const normalizeActorData = (raw: any): Actor => ({
  id: asString(raw?.id, makeId('actor')),
  name: asString(raw?.name, '名称未設定'),
  avatar: asString(raw?.avatar),
  isFollowed: asBoolean(raw?.isFollowed, true),
  createdAt: asString(raw?.createdAt, new Date().toISOString()),
  updatedAt: asString(raw?.updatedAt, new Date().toISOString()),
});

const normalizeSong = (raw: any) => ({
  songTitle: asString(raw?.songTitle),
  artistName: asString(raw?.artistName),
  coverUrl: asString(raw?.coverUrl),
  musicUrl: asString(raw?.musicUrl),
});

const normalizeEpisode = (raw: any, index: number) => ({
  id: asString(raw?.id, makeId(`episode-${index}`)),
  episodeNumber: asNumber(raw?.episodeNumber, index + 1),
  title: asString(raw?.title),
  summary: asString(raw?.summary),
  review: asString(raw?.review),
  watchedDate: asString(raw?.watchedDate),
});

const normalizeSeason = (raw: any, index: number) => ({
  id: asString(raw?.id, makeId(`season-${index}`)),
  seasonNumber: asString(raw?.seasonNumber),
  seasonTitle: asString(raw?.seasonTitle),
  posterUrl: asString(raw?.posterUrl),
  websiteUrl: asString(raw?.websiteUrl),
  startDate: asString(raw?.startDate),
  endDate: asString(raw?.endDate),
  studio: asString(raw?.studio),
  director: asString(raw?.director),
  originalType: raw?.originalType,
  originalTitle: asString(raw?.originalTitle),
  openingSongs: asArray<any>(raw?.openingSongs).map(normalizeSong),
  endingSongs: asArray<any>(raw?.endingSongs).map(normalizeSong),
  genres: asArray<string>(raw?.genres),
  summary: asString(raw?.summary),
  rating: typeof raw?.rating === 'number' ? raw.rating : undefined,
  review: asString(raw?.review),
  totalEpisodes: typeof raw?.totalEpisodes === 'number' ? raw.totalEpisodes : undefined,
  broadcastWeekday: raw?.broadcastWeekday || '',
  broadcastTime: asString(raw?.broadcastTime),
  episodes: asArray<any>(raw?.episodes).map(normalizeEpisode),
  collapsed: asBoolean(raw?.collapsed, false),
  status: (raw?.status || '放送前') as AnimeStatus,
  watchDecision: raw?.watchDecision,
  useAnimeTitle: asBoolean(raw?.useAnimeTitle, true),
});

export const normalizeAnimeData = (raw: any): Anime => ({
  id: asString(raw?.id, makeId('anime')),
  title: asString(raw?.title, '名称未設定'),
  posterUrl: asString(raw?.posterUrl),
  websiteUrl: asString(raw?.websiteUrl),
  status: (raw?.status || '放送前') as AnimeStatus,
  startDate: asString(raw?.startDate),
  endDate: asString(raw?.endDate),
  studio: asString(raw?.studio),
  director: asString(raw?.director),
  originalType: raw?.originalType,
  originalTitle: asString(raw?.originalTitle),
  openingSongs: asArray<any>(raw?.openingSongs).map(normalizeSong),
  endingSongs: asArray<any>(raw?.endingSongs).map(normalizeSong),
  genres: asArray<string>(raw?.genres),
  summary: asString(raw?.summary),
  rating: typeof raw?.rating === 'number' ? raw.rating : undefined,
  review: asString(raw?.review),
  totalEpisodes: typeof raw?.totalEpisodes === 'number' ? raw.totalEpisodes : undefined,
  broadcastWeekday: raw?.broadcastWeekday || '',
  broadcastTime: asString(raw?.broadcastTime),
  watchDecision: raw?.watchDecision,
  seasons: asArray<any>(raw?.seasons).map(normalizeSeason),
  createdAt: asString(raw?.createdAt, new Date().toISOString()),
  updatedAt: asString(raw?.updatedAt, new Date().toISOString()),
});


const GACHA_KINDS: GachaKind[] = ['ガチャ', '一番くじ', 'ブラインド商品', 'ランダム特典', 'その他'];
const GACHA_STATUSES: GachaStatus[] = ['発売前', '抽選予定', '抽選済み', '一部売却済み', '完了', '見送り'];

const normalizeGachaPrize = (raw: any, index: number): GachaPrize => ({
  id: asString(raw?.id, makeId(`gacha-prize-${index}`)),
  name: asString(raw?.name, '名称未設定'),
  imageUrl: asString(raw?.imageUrl),
  imageData: asString(raw?.imageData),
  rank: asString(raw?.rank),
  wanted: asBoolean(raw?.wanted, false),
  wonCount: typeof raw?.wonCount === 'number' ? raw.wonCount : 0,
  keepCount: typeof raw?.keepCount === 'number' ? raw.keepCount : 0,
  soldCount: typeof raw?.soldCount === 'number' ? raw.soldCount : 0,
  salePrice: typeof raw?.salePrice === 'number' ? raw.salePrice : undefined,
  soldTotal: typeof raw?.soldTotal === 'number' ? raw.soldTotal : undefined,
  soldAt: asString(raw?.soldAt),
  memo: asString(raw?.memo),
});

export const normalizeGachaData = (raw: any): Gacha => {
  const nowIso = new Date().toISOString();
  const kind = GACHA_KINDS.includes(raw?.kind) ? raw.kind : 'ガチャ';
  const status = GACHA_STATUSES.includes(raw?.status) ? raw.status : '抽選予定';
  return {
    id: asString(raw?.id, makeId('gacha')),
    name: asString(raw?.name ?? raw?.title, '新規ガチャ'),
    posterUrl: asString(raw?.posterUrl ?? raw?.imageUrl),
    kind,
    releaseDate: asString(raw?.releaseDate),
    drawDateTime: asString(raw?.drawDateTime ?? raw?.drawAt),
    drawCount: typeof raw?.drawCount === 'number' ? raw.drawCount : undefined,
    drawPlace: asString(raw?.drawPlace ?? raw?.location),
    pricePerDraw: typeof raw?.pricePerDraw === 'number' ? raw.pricePerDraw : undefined,
    otherCosts: typeof raw?.otherCosts === 'number' ? raw.otherCosts : undefined,
    status,
    prizes: asArray<any>(raw?.prizes ?? raw?.items).map(normalizeGachaPrize),
    memo: asString(raw?.memo),
    createdAt: asString(raw?.createdAt, nowIso),
    updatedAt: asString(raw?.updatedAt, nowIso),
  };
};
