
export const theme = {
  glass: {
    background: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    blur: 'blur(20px)',
  },
  colors: {
    primary: '#53BEE8',
    text: '#111827',          // gray-900
    textMain: '#374151',      // gray-700
    textSecondary: '#6B7280', // gray-500
    textWeak: '#9CA3AF',      // gray-400
    textLabel: '#D1D5DB',     // gray-300
    background: '#F9FAFB',    // gray-50
    backgroundAlt: 'rgba(249, 250, 251, 0.5)',
    success: '#047857',       // emerald-700
    warning: '#B45309',       // amber-700
    error: '#F7893F',         // updated from #BE123C to match request
    status: {
      '発売前': '#2AC69E',
      '検討中': '#F59E0B',
      '抽選中': '#F7893F',
      '参戦予定': '#53BEE8',
      '参戦済み': '#A6DFF7',
      '見送': '#9CA3AF',
    },
    badges: {
      processing: { bg: '#F0FDF4', text: '#2AC69E', border: '#DCFCE7' }, // Adjusted for 発売前
      considering: { bg: '#FFFBEB', text: '#F59E0B', border: '#FEF3C7' }, // Adjusted for 検討中
      lottery: { bg: '#FFF7ED', text: '#F7893F', border: '#FFEDD5' },    // Adjusted for 抽選中
      confirmed: { bg: '#F0F9FF', text: '#53BEE8', border: '#E0F2FE' },  // Adjusted for 参戦予定
      completed: { bg: '#F8FAFC', text: '#A6DFF7', border: '#F1F5F9' },  // Adjusted for 参戦済み
      skipped: { bg: '#F9FAFB', text: '#9CA3AF', border: '#F3F4F6' },    // Adjusted for 見送
    }
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px', 
    xl: '32px',
    pageTop: '40px',
    pageTopMd: '64px',
    headerMargin: '40px',
  },
  radius: {
    card: '32px',
    panel: '32px',
    fab: '9999px',
    dialog: '32px',
    button: '16px',
    badge: '9999px',
  },
  shadows: {
    card: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
    pop: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    fab: '0 10px 15px -3px rgba(83, 190, 232, 0.3), 0 4px 6px -2px rgba(83, 190, 232, 0.15)',
  }
};
