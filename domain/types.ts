
export type Status = 
  | '発売前' 
  | '検討中' 
  | '抽選中' 
  | '参戦予定' 
  | '参戦済み' 
  | '見送';

export const TOUR_ACTIVE_STATUSES: Status[] = ['発売前', '検討中', '抽選中', '参戦予定', '見送'];
export const TICKET_TRACK_STATUSES: Status[] = ['発売前', '検討中', '抽選中'];

export type TrackingErrorType = 
  | '接続できませんでした'
  | 'ページの内容が変わりました'
  | 'アクセスが制限されています'
  | '情報を取得できませんでした';

export type TrackingStatus = 'success' | 'failed';

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
  | '申込締切';

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
  trackingStatus?: TrackingStatus;
  errorMessage?: TrackingErrorType;
}

export interface Concert {
  id: string;
  date: string; // Display Date (Legacy, keep for UI fallback)
  venue: string;
  price: number;
  saleLink: string;
  status: Status;
  isParticipated: boolean;
  images: string[]; 
  
  // New Fields for Status Progression
  saleAt?: string | null;        // YYYY-MM-DD or YYYY-MM-DD HH:mm
  deadlineAt?: string | null;    // YYYY-MM-DD or YYYY-MM-DD HH:mm
  resultAt?: string | null;      // YYYY-MM-DD or YYYY-MM-DD HH:mm
  concertAt?: string | null;     // YYYY-MM-DD or YYYY-MM-DD HH:mm
  
  lotteryName?: string | null;
  lotteryResult?: 'WON' | 'LOST' | null;
}

export interface Tour {
  id: string;
  name: string;
  imageUrl: string;
  memo?: string;
  concerts: Concert[];
  officialUrl?: string; // Tour official website
}

export interface Artist {
  id: string;
  name: string;
  imageUrl: string;
  links: SiteLink[];
  autoTrackConcerts: boolean;
  autoTrackTickets: boolean;
  tours: Tour[];
  order?: number; // Added for manual sorting
}

export interface GlobalSettings {
  autoTrackIntervalDays: 3 | 7 | 14 | 21 | 30;
}

export interface DisplaySettings {
  showAttended: boolean;
  showSkipped: boolean;
}

export type PageId = 
  | 'ARTIST_LIST' 
  | 'CONCERT_LIST' 
  | 'CALENDAR' 
  | 'ARTIST_DETAIL' 
  | 'CONCERT_HOME' 
  | 'ARTIST_EDITOR' 
  | 'CONCERT_EDITOR';
