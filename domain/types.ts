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

// --- 已经更新 SiteLink 接口，增加判定相关字段 ---
export interface SiteLink {
  name: string;
  url: string;
  autoTrack: boolean;
  lastCheckedAt?: string;
  lastSuccessAt?: string;
  matchedKeywords?: string[]; // merged global keyword hits
  lastHitAt?: string; // ISO
  acknowledgedAt?: string; // ISO; show notice only when lastHitAt > acknowledgedAt
  trackingStatus?: TrackingStatus;
  errorMessage?: TrackingErrorType;
  
  /** * URL 判定结果
   * supported: 可判定 (详情页/详情文章)
   * unsupported: 不可判定 (分页列表页/社交媒体)
   * unjudged: 未判定
   */
  trackCapability?: 'supported' | 'unsupported' | 'unjudged';
  /** ISO 格式的判定执行时间 */
  trackCapabilityCheckedAt?: string;
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