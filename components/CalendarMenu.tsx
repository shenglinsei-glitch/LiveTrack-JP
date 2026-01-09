
import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { theme } from '../ui/theme';

interface CalendarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  weekStart: 'sun' | 'mon';
  setWeekStart: (val: 'sun' | 'mon') => void;
  showAttended: boolean;
  setShowAttended: (val: boolean) => void;
  showSkipped: boolean;
  setShowSkipped: (val: boolean) => void;
}

export const CalendarMenu: React.FC<CalendarMenuProps> = ({ 
  isOpen, 
  onClose, 
  weekStart, 
  setWeekStart,
  showAttended,
  setShowAttended,
  showSkipped,
  setShowSkipped
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '100px',
      right: '16px',
      zIndex: 1000,
      width: '240px',
    }}>
      <div 
        style={{ position: 'fixed', inset: 0, background: 'transparent' }} 
        onClick={onClose} 
      />
      <GlassCard className="fade-in">
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
          <section>
            <h4 style={{ fontSize: '12px', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, fontWeight: 'bold' }}>表示切替</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <MenuButton 
                label="参戦済みを表示" 
                toggle 
                active={showAttended} 
                onClick={() => setShowAttended(!showAttended)}
              />
              <MenuButton 
                label="見送を表示" 
                toggle 
                active={showSkipped} 
                onClick={() => setShowSkipped(!showSkipped)}
              />
            </div>
          </section>

          <section style={{ borderTop: `0.5px solid rgba(0,0,0,0.1)`, paddingTop: theme.spacing.md }}>
            <h4 style={{ fontSize: '12px', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, fontWeight: 'bold' }}>カレンダー設定</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <MenuButton 
                label="日曜始まり" 
                active={weekStart === 'sun'} 
                onClick={() => setWeekStart('sun')} 
              />
              <MenuButton 
                label="月曜始まり" 
                active={weekStart === 'mon'} 
                onClick={() => setWeekStart('mon')} 
              />
            </div>
          </section>
        </div>
      </GlassCard>
    </div>
  );
};

const MenuButton = ({ label, active, toggle, onClick }: any) => (
  <button 
    onClick={onClick}
    style={{
      width: '100%',
      textAlign: 'left',
      padding: '10px 12px',
      borderRadius: '12px',
      border: 'none',
      background: active ? 'rgba(83, 190, 232, 0.1)' : 'transparent',
      color: active ? theme.colors.primary : theme.colors.text,
      fontSize: '14px',
      fontWeight: active ? '800' : '600',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s'
    }}
  >
    <span>{label}</span>
    {toggle && <span style={{ fontSize: '10px' }}>{active ? 'ON' : 'OFF'}</span>}
  </button>
);
