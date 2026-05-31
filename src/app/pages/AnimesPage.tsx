import React, { useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Anime, AnimeStatus, Season } from '@/domain/types';
import { PageShell } from '@/components/common/PageShell';
import { GlassCard } from '@/components/common/GlassCard';
import { theme } from '@/components/common/theme';

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

const fmtDate = (date?: string) => (date ? dayjs(date).format('YYYY/MM/DD') : '未設定');

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
const ANIME_STATUS_PRIORITY: AnimeStatus[] = ['視聴中', '視聴予定', '放送前', '保留', '視聴済み', '視聴中止', '見送り'];
const deriveAnimeStatus = (anime: Anime): AnimeStatus => {
  const statuses = (anime.seasons || []).map((season) => season.status).filter(Boolean) as AnimeStatus[];
  if (!statuses.length) return anime.status || '放送前';
  return ANIME_STATUS_PRIORITY.find((status) => statuses.includes(status)) || anime.status || '放送前';
};

const getAnimeStatusTone = (status: AnimeStatus) => {
  const solid = (bg: string) => ({ color: '#fff', bg });
  switch (status) {
    case '放送前':
      return solid(theme.colors.status['発売前']);
    case '視聴予定':
      return solid(theme.colors.status['参戦予定']);
    case '視聴中':
      return solid(theme.colors.primary);
    case '保留':
      return solid(theme.colors.status['検討中']);
    case '視聴済み':
      return solid(theme.colors.status['参戦済み']);
    case '視聴中止':
      return solid(theme.colors.textWeak);
    case '見送り':
      return solid(theme.colors.status['見送']);
    default:
      return solid(theme.colors.textWeak);
  }
};
const getCurrentWatchingSeason = (anime: Anime): Season | undefined => (anime.seasons || []).find((season) => season.status === '視聴中');
const looksLikeSeasonNumber = (value?: string) => /^第.+[期季]$|^Season\s*\d+$/i.test(String(value || '').trim());
const getSeasonNumber = (season?: Season) => {
  if (!season) return '';
  if (season.seasonNumber?.trim()) return season.seasonNumber.trim();
  if (looksLikeSeasonNumber(season.seasonTitle)) return season.seasonTitle.trim();
  return '';
};
const getEffectiveSeasonTitle = (anime: Anime, season?: Season) => {
  if (!season) return anime.title || '';
  if (season.useAnimeTitle || !season.seasonTitle?.trim() || looksLikeSeasonNumber(season.seasonTitle)) return anime.title || '';
  return season.seasonTitle.trim();
};
const getSeasonDisplayTitle = (anime: Anime, season?: Season) => {
  const number = getSeasonNumber(season);
  const title = getEffectiveSeasonTitle(anime, season);
  return number ? `${number} ${title}` : title;
};
const getNextDayWeekday = (date?: string) => {
  if (!date) return '';
  const d = dayjs(date);
  if (!d.isValid()) return '';
  return WEEK[d.add(1, 'day').day()];
};
const getBroadcastText = (anime: Anime) => {
  const watching = getCurrentWatchingSeason(anime);
  const startDate = watching?.startDate || anime.startDate;
  const weekday = getNextDayWeekday(startDate) || watching?.broadcastWeekday || anime.broadcastWeekday;
  if (!weekday) return '';
  return `毎週${weekday}曜更新`;
};


export const AnimesPage: React.FC<AnimesPageProps> = ({ animes, onOpenDetail, onExport, onImport, isMenuOpenExternally, onMenuClose, hideHeader = false, menuOnly = false }) => {
  const [sortKey, setSortKey] = useState<AnimeSortKey>('date_desc');
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

    return base.sort((a, b) => {
      if (sortKey === 'date_desc') return getDate(b) - getDate(a);
      if (sortKey === 'date_asc') return getDate(a) - getDate(b);
      if (sortKey === 'title') return (a.title || '').localeCompare(b.title || '');
      if (sortKey === 'status') {
        const order = ['視聴中', '視聴予定', '放送前', '保留', '視聴済み', '視聴中止', '見送り'];
        const ia = order.indexOf(deriveAnimeStatus(a));
        const ib = order.indexOf(deriveAnimeStatus(b));
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || getDate(b) - getDate(a);
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

      <div style={{ padding: hideHeader ? '8px 16px 140px' : '24px 16px 140px', marginTop: hideHeader ? 0 : 'calc(env(safe-area-inset-top) + 20px)' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {displayAnimes.map((anime) => {
              const watchingSeason = getCurrentWatchingSeason(anime);
              const displayTitle = getSeasonDisplayTitle(anime, watchingSeason);
              const broadcastText = getBroadcastText(anime);
              const displayStatus = deriveAnimeStatus(anime);
              const statusTone = getAnimeStatusTone(displayStatus);
              return (
                <div key={anime.id} onClick={() => onOpenDetail(anime.id)} style={{ cursor: 'pointer' }}>
                  <GlassCard
                    padding="0"
                    style={{
                      overflow: 'hidden',
                      borderRadius: 24,
                      height: '100%',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
                    }}
                  >
                    <div style={{ position: 'relative', paddingTop: '140%', background: '#F3F4F6' }}>
                      {anime.posterUrl ? (
                        <img src={anime.posterUrl} alt={anime.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.06)', transformOrigin: 'center' }} />
                      ) : (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}><span style={{ fontSize: 48 }}>📺</span></div>
                      )}

                      {anime.rating && (
                        <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', borderRadius: 8, fontSize: 12, fontWeight: 900 }}>
                          ★ {anime.rating.toFixed(1)}
                        </div>
                      )}

                      {displayStatus && (
                        <div style={{ position: 'absolute', top: 10, right: 10, background: statusTone.bg, color: statusTone.color, padding: '4px 8px', borderRadius: 999, fontSize: 11, fontWeight: 900, boxShadow: '0 4px 12px rgba(0,0,0,0.10)' }}>
                          {displayStatus}
                        </div>
                      )}

                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: 0,
                          padding: '24px 12px 12px',
                          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.42) 60%, transparent 100%)',
                          color: '#fff'
                        }}
                      >
                        <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayTitle}</div>
                        <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700, opacity: 0.88, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {broadcastText || (anime.startDate && anime.endDate ? `${fmtDate(anime.startDate)} ～ ${fmtDate(anime.endDate)}` : anime.startDate ? `${fmtDate(anime.startDate)} ～` : anime.studio || '制作未設定')}{anime.totalEpisodes ? `・全${anime.totalEpisodes}話` : ''}
                        </div>
                        {anime.genres && anime.genres.length > 0 && (
                          <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {anime.genres.slice(0, 3).map((genre, idx) => (
                              <span key={idx} style={{ fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: 4 }}>{genre}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                </div>
              );
            })}
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
