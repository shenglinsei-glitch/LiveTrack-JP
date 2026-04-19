import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { theme } from '../ui/theme';
import { TEXT } from '../ui/constants';
import { GlobalSettings } from '../domain/types';
import { Icons } from '../ui/IconButton';

const ARTIST_LIST_PREFS_KEY = 'ltjp_artist_list_prefs_v2';

type ArtistSortKey = 'manual' | 'status' | 'name' | 'dateNear' | 'dateFar';
type ArtistFilterKey = string;

type ArtistPrefs = { sortKey: ArtistSortKey; filters: ArtistFilterKey[] };

const readArtistPrefs = (): ArtistPrefs => {
  try {
    const raw = localStorage.getItem(ARTIST_LIST_PREFS_KEY);
    if (!raw) return { sortKey: 'manual', filters: [] };
    const json = JSON.parse(raw);
    const allowed: ArtistSortKey[] = ['manual', 'status', 'name', 'dateNear', 'dateFar'];
    return {
      sortKey: allowed.includes(json?.sortKey) ? json.sortKey : 'manual',
      filters: Array.isArray(json?.filters) ? json.filters : [],
    };
  } catch {
    return { sortKey: 'manual', filters: [] };
  }
};

const writeArtistPrefs = (next: ArtistPrefs) => {
  try {
    localStorage.setItem(ARTIST_LIST_PREFS_KEY, JSON.stringify(next));
  } catch {}
  try {
    window.dispatchEvent(new Event('ltjp:artistPrefsChanged'));
  } catch {}
};

interface BottomMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  onImport: () => void;
  onAddArtist: () => void;
  onClearTrackingNotices?: () => void;
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
  globalSettings,
  onUpdateGlobalSettings,
}) => {
  if (!isOpen) return null;

  const intervals: (3 | 7 | 14 | 21 | 30)[] = [3, 7, 14, 21, 30];
  const artistPrefs = readArtistPrefs();

  const setArtistSortKey = (key: ArtistSortKey) => writeArtistPrefs({ ...artistPrefs, sortKey: key });
  const setArtistFilters = (filters: ArtistFilterKey[]) => writeArtistPrefs({ ...artistPrefs, filters });
  const toggleArtistFilter = (key: ArtistFilterKey) => {
    const set = new Set(artistPrefs.filters || []);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    setArtistFilters(Array.from(set));
  };

  const filterLabels: { key: ArtistFilterKey; label: string }[] = [
    { key: '発売前', label: '発売前' },
    { key: '検討中', label: '検討中' },
    { key: '抽選中', label: '抽選中' },
    { key: '参戦予定', label: '参戦予定' },
    { key: '参戦済み', label: '参戦済み' },
    { key: '見送り', label: '見送り' },
    { key: 'TRACKING', label: '追跡中' },
    { key: 'NONE', label: '未整理' },
  ];

  const isAllSelected = !artistPrefs.filters || artistPrefs.filters.length === 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(12px + env(safe-area-inset-top) + 52px)',
        left: '16px',
        zIndex: 1000,
        width: '300px',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <div style={{ position: 'fixed', inset: 0, background: 'transparent' }} onClick={onClose} />
      <GlassCard
        className="fade-in"
        style={{
          maxHeight: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 100px)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.md,
            maxHeight: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 132px)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
            paddingRight: '4px',
          }}
        >
          <section>
            <h4 style={sectionTitleStyle}>{TEXT.MENU.AUTO_TRACK_INTERVAL}</h4>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.05)', padding: '4px', borderRadius: '14px' }}>
              {intervals.map(days => (
                <button
                  key={days}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onUpdateGlobalSettings?.({ autoTrackIntervalDays: days }); }}
                  style={{
                    flex: 1,
                    border: 'none',
                    background: globalSettings?.autoTrackIntervalDays === days ? 'white' : 'transparent',
                    color: globalSettings?.autoTrackIntervalDays === days ? theme.colors.primary : theme.colors.textSecondary,
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '10px 0',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    boxShadow: globalSettings?.autoTrackIntervalDays === days ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  {days}日
                </button>
              ))}
            </div>
          </section>

          <section style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)', paddingTop: theme.spacing.md }}>
            <h4 style={sectionTitleStyle}>並び替え</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {([
                { key: 'manual', label: '手順' },
                { key: 'name', label: '名前' },
                { key: 'dateFar', label: '公演日遠' },
                { key: 'dateNear', label: '公演日近' },
                { key: 'status', label: '状態' },
              ] as { key: ArtistSortKey; label: string }[]).map(opt => (
                <MenuButton
                  key={opt.key}
                  label={opt.label}
                  active={artistPrefs.sortKey === opt.key}
                  onClick={() => setArtistSortKey(opt.key)}
                />
              ))}
            </div>
          </section>

          <section style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)', paddingTop: theme.spacing.md }}>
            <h4 style={sectionTitleStyle}>絞り込み</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <SmallChip label="全て" active={isAllSelected} onClick={() => setArtistFilters([])} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {filterLabels.map(item => (
                <SmallChip
                  key={item.key}
                  label={item.label}
                  active={artistPrefs.filters.includes(item.key)}
                  onClick={() => toggleArtistFilter(item.key)}
                />
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
