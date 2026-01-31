
import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { theme } from '../ui/theme';
import { Icons } from '../ui/IconButton';
import { TEXT } from '../ui/constants';

interface ExhibitionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNew: () => void;
  onExport: () => void;
  onImport: () => void;
}

export const ExhibitionMenu: React.FC<ExhibitionMenuProps> = ({ 
  isOpen, 
  onClose,
  onAddNew,
  onExport,
  onImport
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
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.18)', zIndex: -1 }} 
        onClick={onClose} 
      />
      <GlassCard className="fade-in">
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
          <section>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <MenuButton 
                label="新規展覧を追加" 
                primary
                icon={<Icons.Plus />} 
                onClick={() => { onAddNew(); onClose(); }}
              />
            </div>
          </section>

          <section style={{ borderTop: `0.5px solid rgba(0,0,0,0.1)`, paddingTop: theme.spacing.md }}>
            <h4 style={{ fontSize: '12px', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, fontWeight: 'bold' }}>{TEXT.MENU.DATA_MANAGEMENT}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <MenuButton 
                label="データをエクスポート" 
                icon={<Icons.Upload />} 
                onClick={() => { onExport(); onClose(); }} 
              />
              <MenuButton 
                label="データをインポート" 
                icon={<Icons.Download />} 
                onClick={() => { onImport(); onClose(); }} 
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
