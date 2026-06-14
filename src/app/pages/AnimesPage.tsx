import React, { useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Anime, AnimeStatus } from '@/domain/types';
import { PageShell } from '@/components/common/PageShell';
import { GlassCard } from '@/components/common/GlassCard';
import { theme } from '@/components/common/theme';
import { AnimeCard } from '@/components/cards/AnimeCard';

interface AnimesPageProps {
  animes: Anime[];
  onOpenDetail: (id: string) => void;
  onExport: () => void;
  onImport: (data: any) => void;
  isMenuOpenExternally?: boolean;
  onMenuClose?: () => void;
  hideHeader?: boolean;
  menuOnly?: boolean;
}

type AnimeSortKey = 'date_asc' | 'date_desc' | 'title' | 'rating' | 'status';

const ANIME_STATUS_PRIORITY: AnimeStatus[] = ['視聴中', '視聴予定', '保留', '放送前', '視聴済み', '視聴中止', '見送り'];

const deriveAnimeStatus = (anime: Anime): AnimeStatus => {
  const statuses = (anime.seasons || []).map((season) => season.status).filter(Boolean) as AnimeStatus[];
  if (!statuses.length) return anime.status || '放送前';
  return ANIME_STATUS_PRIORITY.find((status) => statuses.includes(status)) || anime.status || '放送前';
};


export const AnimesPage: React.FC<AnimesPageProps> = ({ animes, onOpenDetail, onExport, onImport, isMenuOpenExternally, onMenuClose, hideHeader = false, menuOnly = false }) => {
  const [sortKey, setSortKey] = useState<AnimeSortKey>('status');
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMenuOpen = isMenuOpenExternally ?? internalMenuOpen;
  const setIsMenuOpen = (value: boolean) => {
    if (onMenuClose && !value) onMenuClose();
    if (isMenuOpenExternally === undefined) setInternalMenuOpen(value);
  };

  const displayAnimes = useMemo(() => {
    const base = [...(animes || [])];
    const getDate = (anime: Anime) => dayjs(anime.startDate || anime.createdAt || '2999-12-31').valueOf();
    const weekdayOrder: Record<string, number> = { 日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6 };
    const getBroadcastSortValue = (anime: Anime) => {
      const weekday = anime.broadcastWeekday || anime.seasons?.find(season => season.broadcastWeekday)?.broadcastWeekday || '';
      const weekdayValue = weekdayOrder[weekday];
      if (weekdayValue !== undefined) return weekdayValue * 24 * 60 + Number((anime.broadcastTime || '00:00').slice(0, 2)) * 60 + Number((anime.broadcastTime || '00:00').slice(3, 5));
      return getDate(anime);
    };

    return base.sort((a, b) => {
      if (sortKey === 'date_desc') return getDate(b) - getDate(a);
      if (sortKey === 'date_asc') return getDate(a) - getDate(b);
      if (sortKey === 'title') return (a.title || '').localeCompare(b.title || '');
      if (sortKey === 'status') {
        const ia = ANIME_STATUS_PRIORITY.indexOf(deriveAnimeStatus(a));
        const ib = ANIME_STATUS_PRIORITY.indexOf(deriveAnimeStatus(b));
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || getBroadcastSortValue(a) - getBroadcastSortValue(b) || getDate(a) - getDate(b);
      }
      if (sortKey === 'rating') {
        const ratingA = a.rating || 0;
        const ratingB = b.rating || 0;
        if (ratingA !== ratingB) return ratingB - ratingA;
        return getDate(b) - getDate(a);
      }
      return 0;
    });
  }, [animes, sortKey]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        onImport(JSON.parse(e.target?.result as string));
        setIsMenuOpen(false);
      } catch (err) {
        console.error('Import failed:', err);
        window.alert('ファイルの読み込みに失敗しました。');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const menuLayer = (
    <>
      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />
      {isMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120 }} onClick={() => setIsMenuOpen(false)}>
          <GlassCard style={{ position: 'fixed', top: 'calc(12px + env(safe-area-inset-top) + 52px)', left: 16, width: 300, maxWidth: 'calc(100vw - 32px)' }} onClick={(e: any) => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <section>
                <div style={{ fontSize: 12, fontWeight: 800, color: theme.colors.textSecondary, marginBottom: 8 }}>並び替え</div>
                <MenuItem label="放送日が新しい順" active={sortKey === 'date_desc'} onClick={() => setSortKey('date_desc')} />
                <MenuItem label="放送日が古い順" active={sortKey === 'date_asc'} onClick={() => setSortKey('date_asc')} />
                <MenuItem label="タイトル順" active={sortKey === 'title'} onClick={() => setSortKey('title')} />
                <MenuItem label="評価順" active={sortKey === 'rating'} onClick={() => setSortKey('rating')} />
                <MenuItem label="ステータス順" active={sortKey === 'status'} onClick={() => setSortKey('status')} />
              </section>
              <section style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)', paddingTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: theme.colors.textSecondary, marginBottom: 8 }}>データ</div>
                <MenuItem label="データ書き出し" onClick={() => { onExport(); setIsMenuOpen(false); }} />
                <MenuItem label="データ読み込み" onClick={() => fileInputRef.current?.click()} />
              </section>
            </div>
          </GlassCard>
        </div>
      )}
    </>
  );

  if (menuOnly) return menuLayer;

  return (
    <PageShell disablePadding>
      {menuLayer}

      <div style={{ padding: hideHeader ? '0 0 140px' : '24px 16px 140px', marginTop: hideHeader ? 0 : 'calc(env(safe-area-inset-top) + 20px)' }}>
        {!hideHeader && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ width: 44, height: 44, borderRadius: 9999, border: '1px solid rgba(15,23,42,0.06)', background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px)', color: '#9CA3AF', boxShadow: '0 6px 18px rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></svg>
            </button>
          </div>
        )}
        {displayAnimes.length === 0 ? (
          <div style={{ padding: '120px 0', textAlign: 'center', color: '#9CA3AF', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <div style={{ fontSize: 48, opacity: 0.25 }}>📺</div>
            <div style={{ fontWeight: 700 }}>アニメ情報がありません。</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
            {displayAnimes.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} onClick={() => onOpenDetail(anime.id)} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
};

const menuButtonBase: React.CSSProperties = {
  width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', background: 'transparent', color: theme.colors.text,
};
const MenuItem: React.FC<{ label: string; active?: boolean; onClick: () => void }> = ({ label, active = false, onClick }) => (
  <button onClick={onClick} style={{ ...menuButtonBase, background: active ? 'rgba(83, 190, 232, 0.10)' : 'transparent', color: active ? theme.colors.primary : theme.colors.text, fontWeight: active ? 800 : 600 }}>{label}</button>
);
