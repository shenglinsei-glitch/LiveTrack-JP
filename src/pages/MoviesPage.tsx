import React, { useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Movie, MovieStatus } from '../domain/types';
import { PageShell } from '../ui/PageShell';
import { GlassCard } from '../ui/GlassCard';
import { theme } from '../ui/theme';

interface MoviesPageProps {
  movies: Movie[];
  onOpenDetail: (id: string) => void;
  onExport: () => void;
  onImport: (data: any) => void;
  isMenuOpenExternally?: boolean;
  onMenuClose?: () => void;
  hideHeader?: boolean;
}

type MovieSortKey = 'date_asc' | 'date_desc' | 'title';

const MOVIE_STATUSES: MovieStatus[] = ['未上映', '発売前', '抽選中', '上映中', '鑑賞予定', '鑑賞済み', '見送り', '上映終了'];

const statusTone = (status: MovieStatus) => {
  switch (status) {
    case '未上映':
      return { label: '未上映', color: '#9CA3AF' };
    case '発売前':
      return { label: '発売前', color: '#2AC69E' };
    case '抽選中':
      return { label: '抽選中', color: '#F59E0B' };
    case '上映中':
      return { label: '上映中', color: '#53BEE8' };
    case '鑑賞予定':
      return { label: '鑑賞予定', color: '#3B82F6' };
    case '鑑賞済み':
      return { label: '鑑賞済み', color: '#10B981' };
    case '見送り':
      return { label: '見送り', color: '#6B7280' };
    default:
      return { label: '上映終了', color: '#94A3B8' };
  }
};

const fmtDate = (date?: string) => (date ? dayjs(date).format('YYYY/MM/DD') : '未設定');

export const MoviesPage: React.FC<MoviesPageProps> = ({ movies, onOpenDetail, onExport, onImport, isMenuOpenExternally, onMenuClose, hideHeader = false }) => {
  const [sortKey, setSortKey] = useState<MovieSortKey>('date_asc');
  const [selectedStatuses, setSelectedStatuses] = useState<MovieStatus[] | undefined>(undefined);
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMenuOpen = isMenuOpenExternally ?? internalMenuOpen;
  const setIsMenuOpen = (value: boolean) => {
    if (onMenuClose && !value) onMenuClose();
    if (isMenuOpenExternally === undefined) setInternalMenuOpen(value);
  };

  const displayMovies = useMemo(() => {
    const allowed = new Set<MovieStatus>(selectedStatuses && selectedStatuses.length ? selectedStatuses : MOVIE_STATUSES);
    const base = (movies || []).filter((movie) => allowed.has(movie.status));
    const getDate = (movie: Movie) => dayjs(movie.watchDate || movie.lotteryResultAt || movie.releaseDate || '2999-12-31').valueOf();
    return [...base].sort((a, b) => {
      if (sortKey === 'date_desc') return getDate(b) - getDate(a);
      if (sortKey === 'title') return (a.title || '').localeCompare(b.title || '');
      return getDate(a) - getDate(b);
    });
  }, [movies, sortKey, selectedStatuses]);

  const toggleStatus = (status: MovieStatus) => {
    const base = selectedStatuses && selectedStatuses.length ? selectedStatuses : MOVIE_STATUSES;
    const next = new Set<MovieStatus>(base);
    if (next.has(status)) next.delete(status);
    else next.add(status);
    setSelectedStatuses(next.size === 0 || next.size === MOVIE_STATUSES.length ? undefined : Array.from(next));
  };

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

  return (
    <PageShell disablePadding>
      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />

      {isMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120 }} onClick={() => setIsMenuOpen(false)}>
          <GlassCard style={{ position: 'fixed', top: 'calc(12px + env(safe-area-inset-top) + 52px)', left: 16, width: 300, maxWidth: 'calc(100vw - 32px)' }} onClick={(e: any) => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <section>
                <div style={{ fontSize: 12, fontWeight: 800, color: theme.colors.textSecondary, marginBottom: 8 }}>並び替え</div>
                <MenuItem label="公開日近い順" active={sortKey === 'date_asc'} onClick={() => setSortKey('date_asc')} />
                <MenuItem label="公開日遠い順" active={sortKey === 'date_desc'} onClick={() => setSortKey('date_desc')} />
                <MenuItem label="タイトル順" active={sortKey === 'title'} onClick={() => setSortKey('title')} />
              </section>
              <section style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)', paddingTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: theme.colors.textSecondary, marginBottom: 8 }}>状態絞り込み</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {MOVIE_STATUSES.map((status) => (
                    <SmallChip key={status} label={status} active={!selectedStatuses || selectedStatuses.includes(status)} onClick={() => toggleStatus(status)} />
                  ))}
                </div>
              </section>
              <section style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)', paddingTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: theme.colors.textSecondary, marginBottom: 8 }}>データ</div>
                <MenuItem label="データを書き出す" onClick={() => { onExport(); setIsMenuOpen(false); }} />
                <MenuItem label="データを読み込む" onClick={() => fileInputRef.current?.click()} />
              </section>
            </div>
          </GlassCard>
        </div>
      )}

      <div style={{ padding: hideHeader ? '8px 16px 140px' : '24px 16px 140px', marginTop: hideHeader ? 0 : 'calc(env(safe-area-inset-top) + 20px)' }}>
        {!hideHeader && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ width: 44, height: 44, borderRadius: 9999, border: '1px solid rgba(15,23,42,0.06)', background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px)', color: '#9CA3AF', boxShadow: '0 6px 18px rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></svg>
            </button>
          </div>
        )}
        {displayMovies.length === 0 ? (
          <div style={{ padding: '120px 0', textAlign: 'center', color: '#9CA3AF', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <div style={{ fontSize: 48, opacity: 0.25 }}>🎬</div>
            <div style={{ fontWeight: 700 }}>映画情報がありません。</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {displayMovies.map((movie) => {
              const tone = statusTone(movie.status);
              return (
                <div key={movie.id} onClick={() => onOpenDetail(movie.id)} style={{ cursor: 'pointer' }}>
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
                      {movie.posterUrl ? (
                        <img src={movie.posterUrl} alt={movie.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}><span style={{ fontSize: 48 }}>🎬</span></div>
                      )}

                      <div style={{ position: 'absolute', top: 10, left: 10, padding: '2px 10px', borderRadius: 8, background: tone.color, color: '#fff', fontSize: 11, fontWeight: 900, boxShadow: '0 4px 12px rgba(0,0,0,0.10)', lineHeight: 1.6 }}>
                        {tone.label}
                      </div>

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
                        <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{movie.title}</div>
                        <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700, opacity: 0.88, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{movie.theaterName || '劇場未設定'}</div>
                        <div style={{ marginTop: 4, fontSize: 11, fontWeight: 700, opacity: 0.82 }}>{movie.status === '抽選中' ? `結果日：${fmtDate(movie.lotteryResultAt)}` : movie.status === '発売前' ? `発売日：${fmtDate(movie.saleAt)}` : movie.watchDate ? `鑑賞日：${fmtDate(movie.watchDate)}` : `公開日：${fmtDate(movie.releaseDate)}`}</div>
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
const SmallChip: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{ border: 'none', cursor: 'pointer', padding: '6px 10px', fontSize: 12, fontWeight: 800, borderRadius: 999, background: active ? 'rgba(83, 190, 232, 0.16)' : 'rgba(0,0,0,0.04)', color: active ? theme.colors.primary : theme.colors.textSecondary, whiteSpace: 'nowrap' }}>{label}</button>
);
