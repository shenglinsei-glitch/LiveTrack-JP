
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
  | '页面的内容が変わりました'
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
  | '展覧会';

export interface CalendarEvent {
  dateKey: string;        // YYYY-MM-DD
  timeLabel?: string;     // HH:mm
  type: CalendarEventType;
  artistId: string;
  tourId: string;
  concertId: string;
  title: string;          // Artist Name + Tour Name
  status: Status;
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
export type ExhibitionOverallStatus = 'preparing' | 'running' | 'visited' | 'ended_not_visited';

export interface ExhibitionArtist {
  name: string;
  note?: string;
}

export interface Exhibition {
  id: string;
  title: string;
  imageUrl?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  
  // Basic & Venue
  websiteUrl?: string;
  area?: string;      // e.g. 新宿区
  venueName?: string; // e.g. 森美術館
  venue?: string;     // legacy backup
  
  // Opening Hours
  weekdayStartTime?: string; // HH:mm
  weekdayEndTime?: string;   // HH:mm
  holidaySameAsWeekday: boolean;
  holidayStartTime?: string;
  holidayEndTime?: string;

  // Pricing
  weekdayPrice?: number;
  holidayPrice?: number;
  holidayPriceSameAsWeekday: boolean;

  // Ticket & Status
  ticketSalesStatus: ExhibitionTicketSalesStatus;
  saleStartAt?: string;
  needsReservation: boolean;
  reservationStartAt?: string;
  reservationEndAt?: string;
  
  // Visit Tracking
  visitedAt?: string; // YYYY-MM-DD HH:mm
  exhibitionStatus: ExhibitionOverallStatus;

  // Content
  description?: string;
  artists?: ExhibitionArtist[];
  imageIds?: string[];
}

export interface GlobalSettings {
  autoTrackIntervalDays: 3 | 7 | 14 | 21 | 30;
}

export interface DisplaySettings {
  showAttended: boolean;
  showSkipped: boolean;
}

export type ConcertViewMode = 'concert' | 'deadline';

// Concert list page (local UI state)
// NOTE: These types are additive and do not affect existing persisted data.
export type ConcertListSortKey = 'date' | 'artist' | 'status_group';

export interface ConcertListFilters {
  // If empty / undefined => show all statuses.
  statuses?: Status[];
}

export type PageId = 
  | 'EXHIBITIONS'  
  | 'EXHIBITION_DETAIL'
  | 'MUSIC'        
  | 'ARTIST_LIST'  
  | 'CONCERT_LIST' 
  | 'CALENDAR' 
  | 'ARTIST_DETAIL' 
  | 'CONCERT_HOME' 
  | 'ARTIST_EDITOR' 
  | 'CONCERT_EDITOR';
