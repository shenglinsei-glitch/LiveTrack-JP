export enum MonitoringStage {
  MONITORING_CONCERT = 'MONITORING_CONCERT', // フェーズ 1: 公演追跡
  CONCERT_DETECTED = 'CONCERT_DETECTED',     // フェーズ 2: 公演検出済み
  MONITORING_TICKETS = 'MONITORING_TICKETS'  // フェーズ 4: チケット追跡
}

export enum ConcertStatus {
  PENDING = 'PENDING', // 検討中
  SKIPPED = 'SKIPPED', // 見送り
  LOST = 'LOST',       // 落選
  JOINED = 'JOINED'    // 参戦
}

export enum HomeViewMode {
  REGULAR = 'REGULAR',       // 通常モード
  TRACKING = 'TRACKING',     // 追跡モード
  HISTORY = 'HISTORY'        // 参戦履歴
}

export enum SortMode {
  ALPHABETICAL = 'ALPHABETICAL',
  MANUAL = 'MANUAL'
}

export interface Performance {
  id: string;
  date: string; // ISO string or empty if undetermined
  isUndetermined: boolean;
  status: ConcertStatus;
  venue?: string;
  price?: string;
  ticketUrl?: string;
  lotteryResultDate?: string; // 抽選結果発表日時
}

export interface Concert {
  id: string;
  name: string;
  imageUrl?: string;
  websiteUrl?: string; // 公演公式サイト
  performances: Performance[];
  album?: string[]; // 相アルバム: URLの配列
}

export interface MonitoringUrl {
  name: string;
  url: string;
}

export interface Artist {
  id: string;
  name: string;
  avatar?: string;
  websiteUrls: MonitoringUrl[];
  isAutoMonitoring: boolean;
  monitoringInterval: number; // 1-14 days
  monitoringTime: string;      // "HH:mm"
  lastChecked?: string;       // ISO string
  stage: MonitoringStage;
  latestKeyword?: string;     // 最新の検出キーワード
  hasUpdate: boolean;
  concerts: Concert[];
}

export interface GlobalSettings {
  homeViewMode: HomeViewMode;
  sortMode: SortMode;
  autoUpdateTime: string; 
}

export type Page = 'HOME' | 'DETAIL' | 'SETTINGS' | 'CONCERT_SUMMARY';