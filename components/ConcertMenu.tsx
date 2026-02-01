
import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { theme } from '../ui/theme';
import { Icons } from '../ui/IconButton';
import { TEXT } from '../ui/constants';
import { ConcertViewMode } from '../domain/types';

interface ConcertMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAddConcert: () => void;
  showAttended: boolean;
  onToggleAttended: () => void;
  showSkipped: boolean;
  onToggleSkipped: () => void;
  sortMode: 'status' | 'lottery';
  onSetSort: (mode: 'status' | 'lottery') => void;
  viewMode: ConcertViewMode;
  onSetViewMode: (mode: ConcertViewMode) => void;
}

export const ConcertMenu: React.FC<ConcertMenuProps> = ({ 
  isOpen, 
  onClose,
  onAddConcert,
  showAttended,
  onToggleAttended,
  showSkipped,
  onToggleSkipped,
  sortMode,
  onSetSort,
  viewMode,
  onSetViewMode
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <MenuButton 
                label="公演を追加" 
                primary
                icon={<Icons.Plus />} 
                onClick={() => { onAddConcert(); onClose(); }}
              />
            </div>
          </section>

          <section style={{ borderTop: `0.5px solid rgba(0,0,0,0.1)`, paddingTop: theme.spacing.md }}>
            <h4 style={{ fontSize: '12px', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, fontWeight: 'bold' }}>表示モード</h4>
            <div style={{ 
              display: 'flex', 
              gap: '4px', 
              background: 'rgba(0,0,0,0.05)', 
              padding: '4px', 
              borderRadius: '10px' 
            }}>
              <button
                onClick={() => onSetViewMode('concert')}
                style={{
                  ...segmentedBtnStyle,
                  background: viewMode === 'concert' ? 'white' : 'transparent',
                  color: viewMode === 'concert' ? theme.colors.primary : theme.colors.textSecondary,
                  boxShadow: viewMode === 'concert' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                公演
              </button>
              <button
                onClick={() => onSetViewMode('deadline')}
                style={{
                  ...segmentedBtnStyle,
                  background: viewMode === 'deadline' ? 'white' : 'transparent',
                  color: viewMode === 'deadline' ? theme.colors.primary : theme.colors.textSecondary,
                  boxShadow: viewMode === 'deadline' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                }}
              >
                期限
              </button>
            </div>
          </section>

          <section style={{ borderTop: `0.5px solid rgba(0,0,0,0.1)`, paddingTop: theme.spacing.md }}>
            <h4 style={{ fontSize: '12px', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, fontWeight: 'bold' }}>{TEXT.MENU.SORT}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <MenuButton 
                label={TEXT.MENU.SORT_STATUS} 
                active={sortMode === 'status'} 
                onClick={() => onSetSort('status')}
              />
              <MenuButton 
                label={TEXT.MENU.SORT_LOTTERY} 
                active={sortMode === 'lottery'} 
                onClick={() => onSetSort('lottery')}
              />
            </div>
          </section>

          <section style={{ borderTop: `0.5px solid rgba(0,0,0,0.1)`, paddingTop: theme.spacing.md }}>
            <h4 style={{ fontSize: '12px', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, fontWeight: 'bold' }}>表示切替</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <MenuButton 
                label={TEXT.MENU.SHOW_ATTENDED} 
                toggle 
                active={showAttended} 
                onClick={onToggleAttended}
              />
              <MenuButton 
                label={TEXT.MENU.SHOW_SKIPPED} 
                toggle 
                active={showSkipped} 
                onClick={onToggleSkipped}
              />
            </div>
          </section>
        </div>
      </GlassCard>
    </div>
  );
};

const segmentedBtnStyle: React.CSSProperties = {
  flex: 1,
  border: 'none',
  fontSize: '11px',
  fontWeight: '800',
  padding: '8px 0',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s'
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
