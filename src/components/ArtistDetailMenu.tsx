
import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { theme } from '../ui/theme';
import { Icons } from '../ui/IconButton';
import { DisplaySettings } from '../domain/types';
import { TEXT } from '../ui/constants';

interface ArtistDetailMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAddConcert: () => void;
  settings: DisplaySettings;
  onChangeSettings: (settings: Partial<DisplaySettings>) => void;
}

export const ArtistDetailMenu: React.FC<ArtistDetailMenuProps> = ({ 
  isOpen, 
  onClose,
  onAddConcert,
  settings,
  onChangeSettings
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
            <h4 style={{ fontSize: '12px', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, fontWeight: 'bold' }}>表示切替</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <MenuButton 
                label="参戦済みを表示" 
                toggle 
                active={settings.showAttended} 
                onClick={() => onChangeSettings({ showAttended: !settings.showAttended })}
              />
              <MenuButton 
                label="見送を表示" 
                toggle 
                active={settings.showSkipped} 
                onClick={() => onChangeSettings({ showSkipped: !settings.showSkipped })}
              />
            </div>
          </section>

          <section style={{ borderTop: `0.5px solid rgba(0,0,0,0.1)`, paddingTop: theme.spacing.md }}>
            <h4 style={{ fontSize: '12px', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, fontWeight: 'bold' }}>並び替え</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <MenuButton label={TEXT.MENU.SORT_STATUS} active />
              <MenuButton label="日付順" />
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
