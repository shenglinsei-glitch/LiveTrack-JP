import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { theme } from '../ui/theme';
import { TEXT } from '../ui/constants';
import { Status } from '../domain/types';

export type ConcertListSortKey = 'artist' | 'date_asc' | 'date_desc' | 'status_time';

interface ConcertMenuProps {
  isOpen: boolean;
  onClose: () => void;
  sortKey: ConcertListSortKey;
  onSetSort: (k: ConcertListSortKey) => void;
  filters?: { statuses?: Status[] };
  onToggleStatus: (s: Status) => void;
  onSelectAllStatuses: () => void;
  onSelectImportantStatuses: () => void;
  onExport?: () => void;
  onImport?: () => void;
}

const ALL_STATUSES: Status[] = ['発売前', '検討中', '抽選中', '参戦予定', '参戦済み', '見送'];

export const ConcertMenu: React.FC<ConcertMenuProps> = ({
  isOpen,
  onClose,
  sortKey,
  onSetSort,
  filters,
  onToggleStatus,
  onSelectAllStatuses,
  onSelectImportantStatuses,
  onExport,
  onImport,
}) => {
  if (!isOpen) return null;

  const selectedStatuses = filters?.statuses;
  const isAllSelected = !selectedStatuses || selectedStatuses.length === 0 || selectedStatuses.length === ALL_STATUSES.length;
  const current = new Set<Status>(isAllSelected ? ALL_STATUSES : selectedStatuses);

  return (
    <div style={{ position: 'fixed', top: '74px', left: '16px', zIndex: 1000, width: '320px', maxWidth: 'calc(100vw - 32px)' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'transparent' }} onClick={onClose} />
      <GlassCard className="fade-in">
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
          <section>
            <h4 style={sectionTitleStyle}>{TEXT.MENU.SORT}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <MenuButton label="アーティスト名前順" active={sortKey === 'artist'} onClick={() => onSetSort('artist')} />
              <MenuButton label="公演日遠" active={sortKey === 'date_desc'} onClick={() => onSetSort('date_desc')} />
              <MenuButton label="公演日近" active={sortKey === 'date_asc'} onClick={() => onSetSort('date_asc')} />
              <MenuButton label="状態 + 状態時間" active={sortKey === 'status_time'} onClick={() => onSetSort('status_time')} />
            </div>
          </section>

          <section style={{ borderTop: `0.5px solid rgba(0,0,0,0.1)`, paddingTop: theme.spacing.md }}>
            <h4 style={sectionTitleStyle}>絞り込み</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <SmallChip label="全て" active={isAllSelected} onClick={onSelectAllStatuses} />
              <SmallChip label="重要" active={!isAllSelected && selectedStatuses?.length === 4} onClick={onSelectImportantStatuses} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ALL_STATUSES.map((s) => (
                <SmallChip key={s} label={TEXT.STATUS?.[s as any] ?? String(s)} active={current.has(s)} onClick={() => onToggleStatus(s)} />
              ))}
            </div>
          </section>


          {(onExport || onImport) && (
            <section style={{ borderTop: `0.5px solid rgba(0,0,0,0.1)`, paddingTop: theme.spacing.md }}>
              <h4 style={sectionTitleStyle}>データ</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {onExport && <MenuButton label="書き出す" icon={<span style={{ display: 'flex', transform: 'scale(0.8)' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span>} onClick={() => { onExport(); onClose(); }} />}
                {onImport && <MenuButton label="読み込む" icon={<span style={{ display: 'flex', transform: 'scale(0.8)' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></span>} onClick={() => { onImport(); onClose(); }} />}
              </div>
            </section>
          )}
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

const MenuButton = ({ label, active, onClick }: any) => (
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
      transition: 'all 0.2s',
    }}
  >
    <span>{label}</span>
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
