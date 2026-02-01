import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { theme } from '../ui/theme';
import { Icons } from '../ui/IconButton';
import { TEXT } from '../ui/constants';
import { ConcertViewMode, Status } from '../domain/types';

export type ConcertListSortKey = 'date' | 'artist' | 'status_group';

interface ConcertMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAddConcert: () => void;

  viewMode: ConcertViewMode;
  onSetViewMode: (mode: ConcertViewMode) => void;

  sortKey: ConcertListSortKey;
  onSetSortKey: (k: ConcertListSortKey) => void;

  allStatuses: Status[];
  selectedStatuses?: Status[]; // undefined = all
  onToggleStatus: (s: Status) => void;
  onSelectAllStatuses: () => void;
  onSelectImportantStatuses: () => void;
}

export const ConcertMenu: React.FC<ConcertMenuProps> = ({
  isOpen,
  onClose,
  onAddConcert,
  viewMode,
  onSetViewMode,
  sortKey,
  onSetSortKey,
  allStatuses,
  selectedStatuses,
  onToggleStatus,
  onSelectAllStatuses,
  onSelectImportantStatuses,
}) => {
  if (!isOpen) return null;

  const isAllSelected = !selectedStatuses || selectedStatuses.length === 0 || selectedStatuses.length === allStatuses.length;
  const current = new Set<Status>(isAllSelected ? allStatuses : selectedStatuses);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '100px',
        right: '16px',
        zIndex: 1000,
        width: '300px',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <div style={{ position: 'fixed', inset: 0, background: 'transparent' }} onClick={onClose} />
      <GlassCard className="fade-in">
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
          <section>
            <MenuButton label="公演を追加" primary icon={<Icons.Plus />} onClick={() => { onAddConcert(); onClose(); }} />
          </section>

          <section style={{ borderTop: `0.5px solid rgba(0,0,0,0.1)`, paddingTop: theme.spacing.md }}>
            <h4 style={sectionTitleStyle}>表示モード</h4>
            <div style={segmentedWrapStyle}>
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
            <h4 style={sectionTitleStyle}>{TEXT.MENU.SORT}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <MenuButton label="日付（公演/期限）" active={sortKey === 'date'} onClick={() => onSetSortKey('date')} />
              <MenuButton label="歌手名" active={sortKey === 'artist'} onClick={() => onSetSortKey('artist')} />
              <MenuButton label="状態でグループ + 日付" active={sortKey === 'status_group'} onClick={() => onSetSortKey('status_group')} />
            </div>
          </section>

          <section style={{ borderTop: `0.5px solid rgba(0,0,0,0.1)`, paddingTop: theme.spacing.md }}>
            <h4 style={sectionTitleStyle}>ステータス（複数選択）</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <SmallChip label="全て" active={isAllSelected} onClick={onSelectAllStatuses} />
              <SmallChip label="重要" active={!isAllSelected && selectedStatuses?.length === 4} onClick={onSelectImportantStatuses} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {allStatuses.map((s) => (
                <SmallChip
                  key={s}
                  label={TEXT.STATUS?.[s as any] ?? String(s)}
                  active={current.has(s)}
                  onClick={() => onToggleStatus(s)}
                />
              ))}
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

const segmentedWrapStyle: React.CSSProperties = {
  display: 'flex',
  gap: '4px',
  background: 'rgba(0,0,0,0.05)',
  padding: '4px',
  borderRadius: '10px',
};

const segmentedBtnStyle: React.CSSProperties = {
  flex: 1,
  border: 'none',
  fontSize: '11px',
  fontWeight: '800',
  padding: '8px 0',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const MenuButton = ({ label, active, primary, onClick, icon }: any) => (
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
