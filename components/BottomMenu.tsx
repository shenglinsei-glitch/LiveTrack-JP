
import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { theme } from '../ui/theme';
import { Icons } from '../ui/IconButton';
import { TEXT } from '../ui/constants';
import { GlobalSettings } from '../domain/types';

// Artist list preferences are intentionally independent from Concert list.
const ARTIST_LIST_PREFS_KEY = 'ltjp_artist_list_prefs_v2';

type ArtistSortKey = 'manual' | 'status' | 'name' | 'nextDate';
type ArtistSortDir = 'asc' | 'desc';
type ArtistFilterKey = string; // Status | 'TRACKING' | 'NONE' (keep as string for loose coupling)

const readArtistPrefs = (): { sortKey: ArtistSortKey; sortDir: ArtistSortDir; filters: ArtistFilterKey[] } => {
  try {
    const raw = localStorage.getItem(ARTIST_LIST_PREFS_KEY);
    if (!raw) return { sortKey: 'manual', sortDir: 'asc', filters: [] };
    const json = JSON.parse(raw);
    const sortKey: ArtistSortKey = (json?.sortKey as ArtistSortKey) ?? 'manual';
    const sortDir: ArtistSortDir = json?.sortDir === 'desc' ? 'desc' : 'asc';
    const filters: ArtistFilterKey[] = Array.isArray(json?.filters) ? json.filters : [];
    return { sortKey, sortDir, filters };
  } catch {
    return { sortKey: 'manual', sortDir: 'asc', filters: [] };
  }
};

const writeArtistPrefs = (next: { sortKey: ArtistSortKey; sortDir: ArtistSortDir; filters: ArtistFilterKey[] }) => {
  try {
    localStorage.setItem(ARTIST_LIST_PREFS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(new CustomEvent('ltjp:artistPrefsChanged'));
  } catch {
    // ignore
  }
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
  onAddArtist,
  onClearTrackingNotices,
  onSetSort,
  globalSettings,
  onUpdateGlobalSettings
}) => {
  if (!isOpen) return null;

  const intervals: (3 | 7 | 14 | 21 | 30)[] = [3, 7, 14, 21, 30];
  const artistPrefs = readArtistPrefs();

  const setArtistSortKey = (key: ArtistSortKey) => {
    const next = { ...artistPrefs, sortKey: key };
    // Maintain compatibility: existing Artist page layout switches on manual/status
    if (key === 'status') onSetSort('status');
    else onSetSort('manual');
    writeArtistPrefs(next);
    onClose();
  };

  const toggleArtistDir = () => {
    const nextDir: ArtistSortDir = artistPrefs.sortDir === 'asc' ? 'desc' : 'asc';
    const next = { ...artistPrefs, sortDir: nextDir };
    writeArtistPrefs(next);
  };

  const setArtistFilters = (filters: ArtistFilterKey[]) => {
    const next = { ...artistPrefs, filters };
    writeArtistPrefs(next);
  };

  const toggleArtistFilter = (key: ArtistFilterKey) => {
    const set = new Set(artistPrefs.filters || []);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    setArtistFilters(Array.from(set));
  };

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
        {/*
          This menu can become tall on small screens (especially when adding Artist filters).
          Keep the card within viewport and allow internal scrolling.
        */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.md,
            maxHeight: 'calc(100vh - 180px)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
          }}
        >
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
            <h4 style={{ fontSize: '12px', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, fontWeight: 'bold' }}>並び替え・絞り込み（歌手）</h4>

            {/* Sort */}
            <div style={{ fontSize: '11px', fontWeight: 900, color: theme.colors.textLabel, marginBottom: '6px' }}>並び替え</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              {([
                { key: 'manual', label: '手順' },
                { key: 'status', label: '状態' },
                { key: 'nextDate', label: '最近日' },
                { key: 'name', label: '名前' },
              ] as { key: ArtistSortKey; label: string }[]).map(opt => {
                const active = artistPrefs.sortKey === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setArtistSortKey(opt.key)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '9999px',
                      border: active ? '1px solid rgba(83,190,232,0.65)' : '1px solid rgba(0,0,0,0.08)',
                      background: active ? 'rgba(83,190,232,0.14)' : 'rgba(255,255,255,0.65)',
                      color: active ? '#0F172A' : theme.colors.textSecondary,
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
              {(['name', 'nextDate'] as ArtistSortKey[]).includes(artistPrefs.sortKey) && (
                <button
                  onClick={toggleArtistDir}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(0,0,0,0.08)',
                    background: 'rgba(255,255,255,0.65)',
                    color: theme.colors.textSecondary,
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                  title="昇順/降順"
                >
                  {artistPrefs.sortDir === 'asc' ? '↑' : '↓'}
                </button>
              )}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 900, color: theme.colors.textLabel }}>絞り込み</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setArtistFilters([])}
                  style={{ fontSize: '11px', fontWeight: 800, color: theme.colors.textSecondary, background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  全て
                </button>
                <button
                  onClick={() => setArtistFilters(['発売前', '検討中', '抽選中', '参戦予定', 'TRACKING'])}
                  style={{ fontSize: '11px', fontWeight: 800, color: theme.colors.textSecondary, background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  重要
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {([
                '発売前',
                '検討中',
                '抽選中',
                '参戦予定',
                '参戦済み',
                '見送',
              ] as string[]).map(s => {
                const active = (artistPrefs.filters || []).includes(s);
                const label = (TEXT as any).STATUS?.[s] ?? s;
                return (
                  <button
                    key={s}
                    onClick={() => toggleArtistFilter(s)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '9999px',
                      border: active ? '1px solid rgba(83,190,232,0.65)' : '1px solid rgba(0,0,0,0.08)',
                      background: active ? 'rgba(83,190,232,0.14)' : 'rgba(255,255,255,0.65)',
                      color: active ? '#0F172A' : theme.colors.textSecondary,
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
              {([
                { key: 'TRACKING', label: '追跡中' },
                { key: 'NONE', label: '未整理' },
              ] as { key: string; label: string }[]).map(opt => {
                const active = (artistPrefs.filters || []).includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    onClick={() => toggleArtistFilter(opt.key)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '9999px',
                      border: active ? '1px solid rgba(83,190,232,0.65)' : '1px solid rgba(0,0,0,0.08)',
                      background: active ? 'rgba(83,190,232,0.14)' : 'rgba(255,255,255,0.65)',
                      color: active ? '#0F172A' : theme.colors.textSecondary,
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: '8px', fontSize: '10px', color: theme.colors.textWeak }}>
              ※ 手順のドラッグ並び替えは「全て」かつ「手順」の時のみ有効
            </div>
          </section>

          <section style={{ borderTop: `0.5px solid rgba(0,0,0,0.1)`, paddingTop: theme.spacing.md }}>
            <h4 style={{ fontSize: '12px', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm, fontWeight: 'bold' }}>{TEXT.MENU.DATA_MANAGEMENT}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {onClearTrackingNotices && (
                <MenuButton label="追跡通知をすべてクリア" onClick={() => { onClearTrackingNotices(); onClose(); }} />
              )}
              <MenuButton label={TEXT.BUTTONS.EXPORT} icon={<Icons.Upload />} onClick={onExport} />
              <MenuButton label={TEXT.BUTTONS.IMPORT} icon={<Icons.Download />} onClick={onImport} />
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
