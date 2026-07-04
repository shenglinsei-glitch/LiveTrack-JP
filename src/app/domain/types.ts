
export type Status = 
  | '発売前' 
  | '検討中' 
  | '抽選中' 
  | '参戦予定' 
  | '参戦済み' 
  | '見送'; 

// Fix: Corrected typo '见送' to '見送' to match the Status union type.
export const TOUR_ACTIVE_STATUSES: Status[] = ['発売前', '検討中', '抽選中', '参戦予定', '見送'];
export const TICKET_TRACK_STATUSES: Status[] = ['発売前', '検討中', '抽選中'];

export type TrackingErrorType = 
  | '接続できませんでした'
  | 'ページ内容が変更されました'
  | 'アクセスが制限されています'
  | '情報を取得できませんでした';

export type TrackingStatus = 'success' | 'failed' | 'hit';

export type DueAction = 
  | 'ASK_BUY_AT_SALE'
  | 'ASK_BUY_AT_DEADLINE'
  | 'ASK_RESULT'
  | 'NEED_SET_SALE_AT'
  | 'NEED_SET_DEADLINE_AT'
  | 'NEED_SET_RESULT_AT'
  | 'NEED_SET_CONCERT_AT';

export type CalendarEventType = 
  | '公演' 
  | '抽選結果' 
  | '発売開始' 
  | '申込締切'
  | '展覧'
  | '映画'
  | 'アニメ';

export interface CalendarEvent {
  dateKey: string;        // YYYY-MM-DD
  timeLabel?: string;     // HH:mm
  type: CalendarEventType;
  artistId: string;
  tourId: string;
  concertId: string;
  title: string;          // Artist Name + Tour Name
  status: string;
  movieId?: string;
  animeId?: string;
  seasonId?: string;
}

export interface SiteLink {
  name: string;
  url: string;
  autoTrack: boolean;
  lastCheckedAt?: string;
  lastSuccessAt?: string;
  matchedKeywords?: string[];
  lastHitAt?: string;
  acknowledgedAt?: string;
  trackingStatus?: TrackingStatus;
  errorMessage?: TrackingErrorType;
  trackCapability?: 'supported' | 'unsupported' | 'unjudged';
  trackCapabilityCheckedAt?: string;
}

export interface ConcertSetlistItem {
  id: string;
  song: string;
  order: number;
}

export interface GoodsItem {
  id: string;
  imageUrl?: string;
  name: string;
  price?: number;
  quantity?: number;
}

export interface Concert {
  id: string;
  date: string;
  venue: string;
  price: number;
  saleLink: string;
  status: Status;
  isParticipated: boolean;
  imageIds: string[];
  images?: string[];
  saleAt?: string | null;
  deadlineAt?: string | null;
  resultAt?: string | null;
  concertAt?: string | null;
  lotteryName?: string | null;
  lotteryResult?: 'WON' | 'LOST' | null;

  /**
   * 抽選結果の履歴（当選/落選）。
   * 1回の抽選につき複数回記録される可能性があるため append-only。
   */
  lotteryHistory?: LotteryHistoryItem[];

  // Concert Detail Fields (参戦予定/参戦済み用)
  doorTime?: string; // 開場 HH:mm
  startTime?: string; // 開演 HH:mm
  seatType?: string; // 座席種類
  seatLocation?: string; // 座席
  setlist?: ConcertSetlistItem[]; // セットリスト
  goods?: GoodsItem[]; // グッズ
}

export interface LotteryHistoryItem {
  id: string;
  /** 記録した時刻（ISO） */
  at: string;
  /** 結果 */
  result: 'WON' | 'LOST';
  /** 抽選名（例：FC先行） */
  lotteryName?: string | null;
  /** 結果発表日時（保存されている resultAt のスナップショット） */
  resultAt?: string | null;
}

export interface Tour {
  id: string;
  name: string;
  imageUrl: string;
  memo?: string;
  concerts: Concert[];
  officialUrl?: string;
}

export interface Artist {
  id: string;
  name: string;
  imageUrl: string;
  links: SiteLink[];
  autoTrackConcerts: boolean;
  autoTrackTickets: boolean;
  tours: Tour[];
  order?: number;
}

// --- Exhibition Types ---
export type ExhibitionTicketStatus = 'none' | 'reserved' | 'bought' | 'visited';
export type ExhibitionTicketSalesStatus = 'none' | 'before_sale' | 'not_purchased' | 'purchased';
export type ExhibitionStatus = 'NONE' | 'PLANNED' | 'RESERVED' | 'SKIPPED' | 'VISITED' | 'ENDED';

export interface ExhibitionArtist {
  id: string;
  name: string;
  note?: string;
}

export interface ExhibitionSpecialHours {
  id: string;
  type: 'date' | 'weekday'; // date specific or weekday recurring
  dateOrWeekday: string; // YYYY-MM-DD or 日/月/火/水/木/金/土
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface ExhibitionClosedDay {
  id: string;
  type: 'date' | 'weekday';
  dateOrWeekday: string; // YYYY-MM-DD or 日/月/火/水/木/金/土
}

export interface ExhibitionUrl {
  id: string;
  name: string; // e.g. 公式サイト, チケット, SNS
  url: string;
}

export interface ExhibitionGoods extends GoodsItem {}

export interface Exhibition {
  id: string;
  title: string;
  imageUrl?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD

  // Basic & Venue
  websiteUrl?: string;
  area?: string;      // e.g. 新宿区 (legacy)
  venueName?: string; // e.g. 森美術館 (legacy)
  venue?: string;     // legacy backup
  venueTags?: string[]; // NEW: 会場タグ（推奨）

  // Opening Hours
  weekdayStartTime?: string; // HH:mm (legacy: regularOpenTime)
  weekdayEndTime?: string;   // HH:mm (legacy: regularCloseTime)
  holidaySameAsWeekday: boolean;
  holidayStartTime?: string;
  holidayEndTime?: string;
  regularOpenTime?: string; // HH:mm 通常開館
  regularCloseTime?: string; // HH:mm 通常閉館
  specialHours?: ExhibitionSpecialHours[]; // 特別時間
  closedDates?: string[]; // 休館日 YYYY-MM-DD or 曜日 (legacy)
  closedDays?: ExhibitionClosedDay[]; // NEW: 休館日（推奨）
  noClosedDays?: boolean; // NEW: 会期中無休

  // Pricing
  weekdayPrice?: number; // legacy
  holidayPrice?: number; // legacy
  holidayPriceSameAsWeekday: boolean; // legacy
  isFree?: boolean; // 入場無料
  admissionFee?: number; // 入場料（統一）

  // Ticket & Status
  ticketSalesStatus: ExhibitionTicketSalesStatus;
  saleStartAt?: string;
  hasAdvanceTicket?: boolean;
  advanceSaleAt?: string;
  advanceTicketPurchased?: boolean;
  needsReservation: boolean;
  reservationRequired?: boolean; // NEW: 予約必須（推奨）
  reservationStartAt?: string;
  reservationEndAt?: string;

  // Visit Tracking
  reservedAt?: string; // YYYY-MM-DD HH:mm 予約した訪問予定日時
  visitedAt?: string; // YYYY-MM-DD HH:mm 実際の訪問日時（legacy）
  visitedAtDate?: string; // NEW: YYYY-MM-DD（推奨）
  visitTime?: string; // HH:mm 観覧時間

  status: ExhibitionStatus;

  // Content
  description?: string;
  artists?: ExhibitionArtist[];
  imageIds?: string[];
  goods?: ExhibitionGoods[]; // グッズ
  comment?: string; // コメント
  urls?: ExhibitionUrl[]; // NEW: 複数URL対応
}



export type MovieStatus = '未上映' | '発売前' | '抽選中' | '上映中' | '鑑賞予定' | '鑑賞済み' | '見送り' | '上映終了';
export type MovieTicketType = '通常' | '舞台挨拶';

export interface MovieLotteryHistoryItem {
  at: string;
  result: 'WON' | 'LOST';
  lotteryName?: string;
  lotteryResultAt?: string;
}

export interface Movie {
  id: string;
  title: string;
  posterUrl: string;
  theaterName: string;
  screenName: string;
  seat: string;
  releaseDate?: string;
  watchDate?: string;
  startTime?: string;
  endTime?: string;
  memo?: string;
  actors: string[];
  directors: string[];
  genres?: string[];
  price?: number;
  ticketType: MovieTicketType;
  status: MovieStatus;
  websiteUrl?: string;

  saleAt?: string;
  deadlineAt?: string;
  saleLink?: string;

  lotteryName?: string;
  lotteryUrl?: string;
  lotteryResultAt?: string;
  lotteryPrice?: number;
  lotteryResult?: 'WON' | 'LOST' | null;
  lotteryHistory?: MovieLotteryHistoryItem[];

  createdAt: string;
  updatedAt: string;
}


export interface Actor {
  id: string;
  name: string;
  avatar?: string;
  isFollowed: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Anime Types ---
export type OriginalType = '漫画' | '小説' | 'オリジナル' | 'その他';

export type AnimeStatus = '放送前' | '視聴予定' | '視聴中' | '保留' | '視聴済み' | '視聴中止' | '見送り';
export type AnimeBroadcastWeekday = '' | '日' | '月' | '火' | '水' | '木' | '金' | '土';

export interface OpeningSong {
  songTitle: string;
  artistName: string;
  coverUrl?: string;
  musicUrl?: string;
}

export interface EndingSong {
  songTitle: string;
  artistName: string;
  coverUrl?: string;
  musicUrl?: string;
}

export interface Episode {
  id: string;
  episodeNumber: number;
  title?: string;
  summary?: string;
  review?: string;
  watchedDate?: string;
}

export interface Season {
  id: string;
  seasonNumber?: string;
  seasonTitle: string;
  posterUrl?: string;
  websiteUrl?: string;
  startDate?: string;
  endDate?: string;
  studio?: string;
  director?: string;
  originalType?: OriginalType;
  originalTitle?: string;
  openingSongs?: OpeningSong[];
  endingSongs?: EndingSong[];
  genres?: string[];
  summary?: string;
  rating?: number;
  review?: string;
  totalEpisodes?: number;
  broadcastWeekday?: AnimeBroadcastWeekday;
  broadcastTime?: string;
  episodes?: Episode[];
  collapsed?: boolean;
  status?: AnimeStatus;
  watchDecision?: 'SKIPPED' | 'WILL_WATCH';
  useAnimeTitle?: boolean;
}

export interface Anime {
  id: string;
  title: string;
  posterUrl?: string;
  websiteUrl?: string;
  status: AnimeStatus;
  startDate?: string;
  endDate?: string;
  studio?: string;
  director?: string;
  originalType?: OriginalType;
  originalTitle?: string;
  openingSongs?: OpeningSong[];
  endingSongs?: EndingSong[];
  genres?: string[];
  summary?: string;
  rating?: number;
  review?: string;
  totalEpisodes?: number;
  broadcastWeekday?: AnimeBroadcastWeekday;
  broadcastTime?: string;
  watchDecision?: 'SKIPPED' | 'WILL_WATCH';
  seasons?: Season[];
  createdAt: string;
  updatedAt: string;
}

export interface GlobalSettings {
  autoTrackIntervalDays: 3 | 7 | 14 | 21 | 30;
}

export interface DisplaySettings {
  showAttended: boolean;
  showSkipped: boolean;
}

// Concert list page (local UI state)
// NOTE: These types are additive and do not affect existing persisted data.
export type ConcertListSortKey = 'date' | 'artist' | 'status_group';

export interface ConcertListFilters {
  // If empty / undefined => show all statuses.
  statuses?: Status[];
}

export type StatusItem = {
  id: string;
  type: 'concert' | 'exhibition' | 'movie' | 'anime';
  parentId: string;
  title: string;
  date: string;
  status: string;
  actionType: 'lottery' | 'result' | 'ticket' | 'exhibition_start' | 'exhibition_end' | 'movie' | 'anime_update';
  displayStatus: string;
  raw: any;
};

export type PageId =
  | 'HOME'
  | 'CONTENT'
  | 'STATUS'
  | 'EXHIBITIONS'
  | 'EXHIBITION_DETAIL'
  | 'MUSIC'
  | 'ARTIST_LIST'
  | 'CONCERT_LIST'
  | 'CALENDAR'
  | 'ARTIST_DETAIL'
  | 'CONCERT_HOME'
  | 'ARTIST_EDITOR'
  | 'CONCERT_EDITOR'
  | 'MOVIE_DETAIL'
  | 'ACTOR_DETAIL'
  | 'ANIME_DETAIL'
  | 'ANIME_EDITOR'
  | 'TAG_MANAGEMENT';

export interface TagMasters {
  venues: string[]; // 公演会場
  cinemas: string[]; // 映画館
  exhibitionVenues: string[]; // 展覧会場
  movieGenres: string[]; // 映画ジャンル
  animeGenres: string[]; // アニメジャンル
  animeStudios: string[]; // アニメ制作会社
  directors: string[]; // 監督
  artists: string[]; // アーティスト
  general: string[]; // その他
}

export type TagMasterKey = keyof TagMasters;
