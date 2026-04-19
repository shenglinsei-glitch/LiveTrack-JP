import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { theme } from '../ui/theme';
import { Icons } from '../ui/IconButton';
import { ExhibitionStatus } from '../domain/types';

export type ExhibitionSortKey = 'date_asc' | 'date_desc' | 'name_asc' | 'name_desc';

interface ExhibitionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNew?: () => void;
  showAddAction?: boolean;
  position?: 'bottom-right' | 'top-left';
  onExport: () => void;
  onImport: () => void;
  sortKey: ExhibitionSortKey;
  onSetSortKey: (key: ExhibitionSortKey) => void;
  selectedStatuses?: ExhibitionStatus[];
  onToggleStatus: (status: ExhibitionStatus) => void;
  onSelectAllStatuses: () => void;
}

const ALL_STATUSES: ExhibitionStatus[] = ['NONE', 'PLANNED', 'RESERVED', 'VISITED', 'SKIPPED', 'ENDED'];
const STATUS_LABELS: Record<ExhibitionStatus, string> = {
  NONE: '準備中',
  PLANNED: '開催中',
  RESERVED: '予約済',
  VISITED: '参戦済み',
  SKIPPED: '見送る',
  ENDED: '終了',
};

export const ExhibitionMenu: React.FC<ExhibitionMenuProps> = ({
  isOpen,
  onClose,
  onAddNew,
  showAddAction = true,
  position = 'bottom-right',
  onExport,
  onImport,
  sortKey,
  onSetSortKey,
  selectedStatuses,
  onToggleStatus,
  onSelectAllStatuses,
}) => {
  if (!isOpen) return null;

  const current = new Set<ExhibitionStatus>(selectedStatuses && selectedStatuses.length ? selectedStatuses : ALL_STATUSES);
  const isAllSelected = !selectedStatuses || selectedStatuses.length === 0 || selectedStatuses.length === ALL_STATUSES.length;

  return (
    <div
      style={{
        position: 'fixed',
        ...(position === 'top-left' ? { top: 'calc(12px + env(safe-area-inset-top) + 52px)', left: '16px' } : { bottom: '100px', right: '16px' }),
        zIndex: 1000,
        width: '280px',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <div style={{ position: 'fixed', inset: 0, background: 'transparent' }} onClick={onClose} />
      <GlassCard className="fade-in">
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
          {showAddAction && onAddNew && (
            <section>
              <MenuButton label="新規展覧を追加" primary icon={<Icons.Plus />} onClick={() => { onAddNew(); onClose(); }} />
            </section>
          )}

          <section style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)', paddingTop: theme.spacing.md }}>
            <h4 style={sectionTitleStyle}>並び替え</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <MenuButton label="開始日順" active={sortKey === 'date_asc'} onClick={() => onSetSortKey('date_asc')} />
              <MenuButton label="開始日逆順" active={sortKey === 'date_desc'} onClick={() => onSetSortKey('date_desc')} />
              <MenuButton label="名前順" active={sortKey === 'name_asc'} onClick={() => onSetSortKey('name_asc')} />
              <MenuButton label="名前逆順" active={sortKey === 'name_desc'} onClick={() => onSetSortKey('name_desc')} />
            </div>
          </section>

          <section style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)', paddingTop: theme.spacing.md }}>
            <h4 style={sectionTitleStyle}>絞り込み</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <SmallChip label="全部" active={isAllSelected} onClick={onSelectAllStatuses} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ALL_STATUSES.map((status) => (
                <SmallChip key={status} label={STATUS_LABELS[status]} active={current.has(status)} onClick={() => onToggleStatus(status)} />
              ))}
            </div>
          </section>

          <section style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)', paddingTop: theme.spacing.md }}>
            <h4 style={sectionTitleStyle}>データ</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <MenuButton label="書き出す" icon={<Icons.Upload />} onClick={() => { onExport(); onClose(); }} />
              <MenuButton label="読み込む" icon={<Icons.Download />} onClick={() => { onImport(); onClose(); }} />
            </div>
          </section>
        </div>
      </GlassCard>
    </div>
  );
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '12px',
  color: theme.colors.textSecondary,
  marginBottom: theme.spacing.sm,
  fontWeight: 'bold',
};

const MenuButton = ({ label, active, primary, icon, onClick }: any) => (
  <button
    onClick={onClick}
    style={{
      width: '100%',
      textAlign: 'left',
      padding: '10px 12px',
      borderRadius: '12px',
      border: 'none',
      background: primary ? theme.colors.primary : active ? 'rgba(83, 190, 232, 0.1)' : 'transparent',
      color: primary ? 'white' : active ? theme.colors.primary : theme.colors.text,
      fontSize: '14px',
      fontWeight: primary || active ? '800' : '600',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
    }}
  >
    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {icon && <span style={{ display: 'flex', transform: 'scale(0.8)' }}>{icon}</span>}
      {label}
    </span>
  </button>
);

const SmallChip: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      border: 'none',
      cursor: 'pointer',
      padding: '6px 10px',
      fontSize: 12,
      fontWeight: 800,
      borderRadius: 999,
      background: active ? 'rgba(83, 190, 232, 0.16)' : 'rgba(0,0,0,0.04)',
      color: active ? theme.colors.primary : theme.colors.textSecondary,
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </button>
);
