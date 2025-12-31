
export const CONCERT_KEYWORDS = ['LIVE', 'TOUR', '公演', 'ライブ', 'ツアー'];
export const TICKET_KEYWORDS = ['会員限定', '一次先行', '二次先行', '一般販売'];

export const STATUS_COLORS = {
  PRE_SHOW: 'bg-[#53BEE8]', // Blue (開演前)
  AUTO_TRACKING: 'bg-[#4ADE80]', // Green (ライブ追跡中（自動）)
  TOURING_SKIPPED: 'bg-[#94A3B8]', // Slate 400 (ツアー中（見送ります）)
  NOT_FOLLOWING: 'bg-[#E2E8F0]', // Slate 200 (フォローしていません)
  ALERT: 'bg-orange-500', // Orange (公演情報を検出！)
  TICKET_PHASE: 'bg-amber-400', // Amber (チケット追跡中)
};

export const MOCK_AVATARS = [
  'https://picsum.photos/seed/artist1/200',
  'https://picsum.photos/seed/artist2/200',
  'https://picsum.photos/seed/artist3/200',
  'https://picsum.photos/seed/artist4/200'
];
