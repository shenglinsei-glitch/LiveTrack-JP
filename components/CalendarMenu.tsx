
import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { theme } from '../ui/theme';
import { Icons } from '../ui/IconButton';
import { TEXT } from '../ui/constants';

interface CalendarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  weekStart: 'sun' | 'mon';
  setWeekStart: (start: 'sun' | 'mon') => void;
  showAttended: boolean;
  setShowAttended: (show: boolean) => void;
  showSkipped: boolean;
  setShowSkipped: (show: boolean) => void;
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
      width: '260px',
    }}>
      <div 
        style={{ position: 'fixed', inset: 0, background: 'transparent' }} 
        onClick={onClose} 
      />
      <GlassCard className="fade-in">
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
          <section>
            <h4 style={{ fontSize: '12px', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, fontWeight: 'bold' }}>
              週の開始日
            </h4>
            <div style={{ 
              display: 'flex', 
              gap: '4px', 
              background: 'rgba(0,0,0,0.05)', 
              padding: '4px', 
              borderRadius: '10px' 
            }}>
              <button
                onClick={() => setWeekStart('sun')}
                style={{
                  flex: 1,
                  border: 'none',
                  background: weekStart === 'sun' ? 'white' : 'transparent',
                  color: weekStart === 'sun' ? theme.colors.primary : theme.colors.textSecondary,
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '8px 0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: weekStart === 'sun' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                日曜日
              </button>
              <button
                onClick={() => setWeekStart('mon')}
                style={{
                  flex: 1,
                  border: 'none',
                  background: weekStart === 'mon' ? 'white' : 'transparent',
                  color: weekStart === 'mon' ? theme.colors.primary : theme.colors.textSecondary,
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '8px 0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: weekStart === 'mon' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                月曜日
              </button>
            </div>
          </section>

          <section style={{ borderTop: `0.5px solid rgba(0,0,0,0.1)`, paddingTop: theme.spacing.md }}>
            <h4 style={{ fontSize: '12px', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, fontWeight: 'bold' }}>表示設定</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <MenuButton 
                label={TEXT.MENU.SHOW_ATTENDED} 
                toggle 
                active={showAttended} 
                onClick={() => setShowAttended(!showAttended)}
              />
              <MenuButton 
                label={TEXT.MENU.SHOW_SKIPPED} 
                toggle 
                active={showSkipped} 
                onClick={() => setShowSkipped(!showSkipped)}
              />
            </div>
          </section>
        </div>
      </GlassCard>
    </div>
  );
};

const MenuButton = ({ label, active, primary, toggle, onClick, icon }: any) => (
  <button 
    onClick={onClick}
    style={{
      width: '100%',
      textAlign: 'left',
      padding: '10px 12px',
      borderRadius: '12px',
      border: 'none',
      background: primary ? theme.colors.primary : (active ? 'rgba(83, 190, 232, 0.1)' : 'transparent'),
      color: primary ? 'white' : (active ? theme.colors.primary : theme.colors.text),
      fontSize: '14px',
      fontWeight: (primary || active) ? '800' : '600',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s'
    }}
  >
    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {icon && <span style={{ display: 'flex', transform: 'scale(0.8)' }}>{icon}</span>}
      {label}
    </span>
    {toggle && <span style={{ fontSize: '10px' }}>{active ? 'ON' : 'OFF'}</span>}
  </button>
);
