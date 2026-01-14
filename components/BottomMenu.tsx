
import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { theme } from '../ui/theme';
import { Icons } from '../ui/IconButton';
import { TEXT } from '../ui/constants';
import { GlobalSettings } from '../domain/types';

interface BottomMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  onImport: () => void;
  onAddArtist: () => void;
  onClearAllTrackingNotices?: () => void;
  currentSort: 'manual' | 'status';
  onSetSort: (mode: 'manual' | 'status') => void;
  globalSettings?: GlobalSettings;
  onUpdateGlobalSettings?: (settings: GlobalSettings) => void;
}

export const BottomMenu: React.FC<BottomMenuProps> = ({ 
  isOpen, 
  onClose, 
  onExport, 
  onImport,
  onAddArtist,
  onClearAllTrackingNotices,
  currentSort,
  onSetSort,
  globalSettings,
  onUpdateGlobalSettings
}) => {
  if (!isOpen) return null;

  const intervals: (3 | 7 | 14 | 21 | 30)[] = [3, 7, 14, 21, 30];

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
                label="アーティストを追加" 
                primary
                icon={<Icons.Plus />} 
                onClick={() => { onAddArtist(); onClose(); }}
              />
            </div>
          </section>

          <section style={{ borderTop: `0.5px solid rgba(0,0,0,0.1)`, paddingTop: theme.spacing.md }}>
            <h4 style={{ fontSize: '12px', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, fontWeight: 'bold' }}>{TEXT.MENU.AUTO_TRACK_INTERVAL}</h4>
            <div style={{ 
              display: 'flex', 
              gap: '4px', 
              background: 'rgba(0,0,0,0.05)', 
              padding: '4px', 
              borderRadius: '10px' 
            }}>
              {intervals.map(days => (
                <button
                  key={days}
                  onClick={() => onUpdateGlobalSettings?.({ autoTrackIntervalDays: days })}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: globalSettings?.autoTrackIntervalDays === days ? 'white' : 'transparent',
                    color: globalSettings?.autoTrackIntervalDays === days ? theme.colors.primary : theme.colors.textSecondary,
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '8px 0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: globalSettings?.autoTrackIntervalDays === days ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {days}日
                </button>
              ))}
            </div>
          </section>

          <section style={{ borderTop: `0.5px solid rgba(0,0,0,0.1)`, paddingTop: theme.spacing.md }}>
            <h4 style={{ fontSize: '12px', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, fontWeight: 'bold' }}>{TEXT.MENU.SORT}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <MenuButton 
                label={TEXT.MENU.SORT_MANUAL} 
                active={currentSort === 'manual'} 
                onClick={() => onSetSort('manual')}
              />
              <MenuButton 
                label={TEXT.MENU.SORT_STATUS} 
                active={currentSort === 'status'} 
                onClick={() => onSetSort('status')}
              />
            </div>
          </section>

          <section style={{ borderTop: `0.5px solid rgba(0,0,0,0.1)`, paddingTop: theme.spacing.md }}>
            <h4 style={{ fontSize: '12px', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, fontWeight: 'bold' }}>{TEXT.MENU.DATA_MANAGEMENT}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <MenuButton label={TEXT.BUTTONS.EXPORT} icon={<Icons.Upload />} onClick={onExport} />
              <MenuButton label={TEXT.BUTTONS.IMPORT} icon={<Icons.Download />} onClick={onImport} />
              <MenuButton
                label="追跡通知をすべてクリア"
                onClick={() => { onClearAllTrackingNotices?.(); onClose(); }}
              />
            </div>
          </section>
        </div>
      </GlassCard>
    </div>
  );
};

const MenuButton = ({ label, active, primary, toggle, icon, onClick }: any) => (
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
