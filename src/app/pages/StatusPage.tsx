import React, { useMemo, useRef, useState } from 'react';
import { theme } from '@/components/common/theme';
import { GlassCard } from '@/components/common/GlassCard';
import { Artist, Concert, Exhibition, StatusItem, Movie, Anime, AnimeStatus, Season } from '@/domain/types';
import { generateStatusItems } from '@/utils/statusGenerator';
import { TopCapsuleNav } from '@/components/TopCapsuleNav';
import { applyMovieLotteryDecision, getDueAction, getAnimeDotColor, parseConcertDate } from '@/domain/logic';
import { ConcertStatusCard } from '@/components/ConcertStatusCard';
import { ExhibitionStatusCard } from '@/components/ExhibitionStatusCard';
import { MovieStatusCard, MovieLotteryActionState } from '@/components/MovieStatusCard';
import { fromDateTimeLocal, getMovieLotteryResultAt, getMovieSaleStart, parseMovieFlexibleDate, toDateTimeLocal } from '@/domain/statusHelpers';
import { centeredNativeDateTimeInputStyle } from '@/components/common/nativeDateInput';

interface Props {
  artists: Artist[];
  exhibitions: Exhibition[];
  movies: Movie[];
  animes: Anime[];
  onOpenConcert: (aid: string, tid: string, cid: string) => void;
  onOpenArtist: (artistId: string) => void;
  onOpenConcertEditor: (aid: string, tid: string) => void;
  onUpdateConcert: (aid: string, tid: string, cid: string, updates: Partial<Concert>) => void;
  onOpenExhibitionDetail: (id: string) => void;
  onUpdateExhibitionStatus: (id: string, updates: Partial<Exhibition>) => void;
  onOpenMovieDetail: (id: string) => void;
  onUpdateMovieStatus: (id: string, updates: Partial<Movie>) => void;
  onOpenAnimeDetail: (id: string) => void;
  onUpdateAnimeStatus: (id: string, updates: Partial<Anime>) => void;
  onExport: () => void;
  onImport: (data: any) => void;
}

type StatusTab = 'ALL' | 'CONCERT' | 'EXHIBITION' | 'MOVIE' | 'ANIME';
type SectionKey = 'all' | 'pending' | 'decided' | 'upcoming' | 'history';
type SortKey = 'date_asc' | 'date_desc' | 'type' | 'status';

type ExhibitionActionMode = 'reserve' | 'visit';
type MovieLotteryAction = MovieLotteryActionState;
type MovieWatchedAction = { id: string; title: string; watchDate: string; startTime: string; endTime: string };

const getSectionLabel = (key: SectionKey) => {
  switch (key) {
    case 'pending':
      return '未処理';
    case 'decided':
      return '決定済';
    case 'upcoming':
      return '未上映';
    case 'history':
      return '履歴';
    default:
      return 'すべて';
  }
};

const MENU_WIDTH = 300;

export const StatusPage: React.FC<Props> = ({
  artists,
  exhibitions,
  movies,
  animes,
  onOpenConcert,
  onOpenArtist,
  onOpenConcertEditor,
  onUpdateConcert,
  onOpenExhibitionDetail,
  onUpdateExhibitionStatus,
  onOpenMovieDetail,
  onUpdateMovieStatus,
  onOpenAnimeDetail,
  onUpdateAnimeStatus,
  onExport,
  onImport,
}) => {
  const [activeTab, setActiveTab] = useState<StatusTab>('ALL');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sectionFilter, setSectionFilter] = useState<SectionKey>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date_asc');
  const [exhibitionAction, setExhibitionAction] = useState<{ id: string; mode: ExhibitionActionMode; value: string; title: string } | null>(null);
  const [movieLotteryAction, setMovieLotteryAction] = useState<MovieLotteryAction | null>(null);
  const [movieWatchedAction, setMovieWatchedAction] = useState<MovieWatchedAction | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const allItems = useMemo(() => generateStatusItems(artists, exhibitions, movies, animes) || [], [artists, exhibitions, movies, animes]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'ALL') return allItems;
    if (activeTab === 'CONCERT') return allItems.filter((item) => item.type === 'concert');
    if (activeTab === 'EXHIBITION') return allItems.filter((item) => item.type === 'exhibition');
    if (activeTab === 'MOVIE') return allItems.filter((item) => item.type === 'movie');
    return allItems.filter((item) => item.type === 'anime');
  }, [allItems, activeTab]);

  const sections = useMemo(() => {
    const pending: StatusItem[] = [];
    const decided: StatusItem[] = [];
    const upcoming: StatusItem[] = [];
    const history: StatusItem[] = [];
    const now = new Date();

    filteredItems.forEach((item) => {
      if (item.type === 'exhibition') {
        if (item.status === 'PLANNED') pending.push(item);
        else if (item.status === 'RESERVED') decided.push(item);
        else history.push(item);
        return;
      }

      if (item.type === 'anime') {
        if (item.raw?.statusSection === 'upcoming') upcoming.push(item);
        else if (item.raw?.statusSection === 'history' || item.status === '視聴済み' || item.status === '視聴中止' || item.status === '見送り') history.push(item);
        else if (item.raw?.statusSection === 'pending') pending.push(item);
        else decided.push(item);
        return;
      }

      if (item.type === 'movie') {
        const saleStart = parseMovieFlexibleDate(getMovieSaleStart(item.raw));
        const resultAt = parseMovieFlexibleDate(getMovieLotteryResultAt(item.raw));
        const hasMovieAction =
          (item.status === '発売前' && !!saleStart && now >= saleStart) ||
          (item.status === '抽選中' && !!resultAt && now >= resultAt) ||
          item.status === '上映中';
        if (item.status === '鑑賞済み' || item.status === '見送り' || item.status === '上映終了') {
          history.push(item);
        } else if (item.status === '鑑賞予定') {
          decided.push(item);
        } else if (item.status === '未上映') {
          upcoming.push(item);
        } else if (hasMovieAction || item.status === '発売前' || item.status === '抽選中') {
          pending.push(item);
        } else {
          decided.push(item);
        }
        return;
      }

      const concertDate = parseConcertDate(item.date, 'CONCERT');
      const isPassed = concertDate && now >= concertDate;
      const due = getDueAction(item.raw, now);

      if (item.status === '参戦済み' || item.status === '落選' || item.status === '見送') {
        history.push(item);
      } else if (due || ['発売前', '検討中', '抽選中'].includes(item.status)) {
        pending.push(item);
      } else {
        decided.push(item);
      }
    });

    return { pending, decided, upcoming, history };
  }, [filteredItems]);

  const getPendingRank = (item: StatusItem) => {
    const statusRank: Record<string, number> = { '抽選中': 0, '発売前': 1, '上映中': 2 };
    return statusRank[item.status] ?? 50;
  };

  const sortItems = (items: StatusItem[], section?: SectionKey) => {
    const list = [...(items || [])];
    return list.sort((a, b) => {
      const da = parseConcertDate(a.date, a.type === 'concert' ? 'CONCERT' : 'EXHIBITION');
      const db = parseConcertDate(b.date, b.type === 'concert' ? 'CONCERT' : 'EXHIBITION');
      const ta = da ? da.getTime() : Number.MAX_SAFE_INTEGER;
      const tb = db ? db.getTime() : Number.MAX_SAFE_INTEGER;
      if (section === 'pending' && sortKey === 'date_asc') {
        const ra = getPendingRank(a);
        const rb = getPendingRank(b);
        if (ra !== rb) return ra - rb;
      }
      if (sortKey === 'date_desc') return tb - ta;
      if (sortKey === 'type') {
        if (a.type !== b.type) return a.type === 'concert' ? -1 : 1;
        return ta - tb;
      }
      if (sortKey === 'status') {
        const sa = `${a.type}-${a.status}`;
        const sb = `${b.type}-${b.status}`;
        return sa.localeCompare(sb) || ta - tb;
      }
      return ta - tb;
    });
  };

  const visibleSections = {
    pending: sectionFilter === 'all' || sectionFilter === 'pending' ? sortItems(sections.pending, 'pending') : [],
    decided: sectionFilter === 'all' || sectionFilter === 'decided' ? sortItems(sections.decided, 'decided') : [],
    upcoming: sectionFilter === 'all' || sectionFilter === 'upcoming' ? sortItems(sections.upcoming, 'upcoming') : [],
    history: sectionFilter === 'all' || sectionFilter === 'history' ? sortItems(sections.history, 'history') : [],
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        onImport(data);
        setIsMenuOpen(false);
      } catch (err) {
        console.error('Import parse failed:', err);
        window.alert('ファイルの読み込みに失敗しました。JSONを確認してください。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const openExhibitionDateModal = (item: StatusItem, mode: ExhibitionActionMode) => {
    const baseValue = item.raw.visitedAt ? toDateTimeLocal(item.raw.visitedAt) : '';
    setExhibitionAction({ id: item.parentId, mode, value: baseValue, title: item.title });
  };

  const saveExhibitionDateAction = () => {
    if (!exhibitionAction || !exhibitionAction.value) {
      window.alert('日時を入力してください。');
      return;
    }
    onUpdateExhibitionStatus(exhibitionAction.id, {
      status: exhibitionAction.mode === 'reserve' ? 'RESERVED' : 'VISITED',
      visitedAt: fromDateTimeLocal(exhibitionAction.value),
    });
    setExhibitionAction(null);
  };

  const openMovieLotteryWinModal = (item: StatusItem) => {
    setMovieLotteryAction({
      id: item.parentId,
      title: item.title,
      value: item.raw.watchDate
        ? `${item.raw.watchDate}${item.raw.startTime ? `T${item.raw.startTime}` : 'T18:00'}`.slice(0, 16)
        : '',
      theaterName: item.raw.theaterName || '',
      screenName: item.raw.screenName || '',
      seat: item.raw.seat || '',
      price: item.raw.price != null ? String(item.raw.price) : (item.raw.lotteryPrice != null ? String(item.raw.lotteryPrice) : ''),
    });
  };

  const saveMovieLotteryWinAction = () => {
    if (!movieLotteryAction || !movieLotteryAction.value) {
      window.alert('鑑賞予定日時を入力してください。');
      return;
    }
    const movie = movies.find((m) => m.id === movieLotteryAction.id);
    if (!movie) return;

    const [watchDate, startTimeRaw] = movieLotteryAction.value.split('T');
    const updated = applyMovieLotteryDecision(movie, 'WON', {
      watchDate,
      startTime: startTimeRaw?.slice(0, 5) || '',
      theaterName: movieLotteryAction.theaterName,
      screenName: movieLotteryAction.screenName,
      seat: movieLotteryAction.seat,
      price: movieLotteryAction.price === '' ? undefined : Number(movieLotteryAction.price),
    });

    onUpdateMovieStatus(movie.id, updated);
    setMovieLotteryAction(null);
  };
  const openMovieWatchedModal = (item: StatusItem) => {
    const movie = item.raw as Movie;
    setMovieWatchedAction({
      id: item.parentId,
      title: item.title,
      watchDate: movie.watchDate || new Date().toISOString().slice(0, 10),
      startTime: movie.startTime || '',
      endTime: movie.endTime || '',
    });
  };

  const saveMovieWatchedAction = () => {
    if (!movieWatchedAction?.watchDate) {
      window.alert('鑑賞日を入力してください。');
      return;
    }
    onUpdateMovieStatus(movieWatchedAction.id, {
      status: '鑑賞済み',
      watchDate: movieWatchedAction.watchDate,
      startTime: movieWatchedAction.startTime,
      endTime: movieWatchedAction.endTime,
      updatedAt: new Date().toISOString(),
    });
    setMovieWatchedAction(null);
  };

  const deriveOverallAnimeStatus = (seasons: Season[] = [], fallback: AnimeStatus = '放送前'): AnimeStatus => {
    const order: AnimeStatus[] = ['視聴中', '視聴予定', '放送前', '保留', '視聴済み', '視聴中止', '見送り'];
    const statuses = seasons.map((season) => season.status).filter(Boolean) as AnimeStatus[];
    if (!statuses.length) return fallback;
    return order.find((status) => statuses.includes(status)) || fallback;
  };

  const updateAnimeSeason = (raw: Anime & { seasonId?: string; seasonIndex?: number; season?: Season }, seasonPatch: Partial<Season>) => {
    const nowIso = new Date().toISOString();
    const seasons = raw.seasons && raw.seasons.length > 0 ? [...raw.seasons] : raw.season ? [raw.season] : [];
    if (!seasons.length) {
      const nextStatus = (seasonPatch.status as AnimeStatus) || raw.status || '放送前';
      onUpdateAnimeStatus(raw.id, { status: nextStatus, updatedAt: nowIso, watchDecision: (seasonPatch as any).watchDecision });
      return;
    }
    const targetIndex = seasons.findIndex((season, index) => (raw.seasonId && season.id === raw.seasonId) || index === raw.seasonIndex);
    const index = targetIndex >= 0 ? targetIndex : 0;
    const nextSeasons = seasons.map((season, idx) => idx === index ? { ...season, ...seasonPatch } : season);
    const nextStatus = deriveOverallAnimeStatus(nextSeasons, (seasonPatch.status as AnimeStatus) || raw.status || '放送前');
    onUpdateAnimeStatus(raw.id, { seasons: nextSeasons, status: nextStatus, updatedAt: nowIso });
  };

  const markAnimeEpisodeWatched = (raw: Anime & { seasonId?: string; seasonIndex?: number; season?: Season }) => {
    const today = new Date().toISOString().slice(0, 10);
    const season = raw.season || (raw.seasons || [])[raw.seasonIndex || 0];
    const episodes = [...(season?.episodes || [])];
    const targetIndex = episodes.findIndex((episode) => !episode.watchedDate);
    if (targetIndex >= 0) {
      episodes[targetIndex] = { ...episodes[targetIndex], watchedDate: today };
      updateAnimeSeason(raw, { status: '視聴中', episodes });
    } else {
      updateAnimeSeason(raw, { status: '視聴中' });
    }
  };

  const renderAnimeActions = (raw: Anime & { seasonStatus?: AnimeStatus; seasonId?: string; seasonIndex?: number; season?: Season; statusSection?: string }) => {
    const seasonStatus = raw.seasonStatus || raw.season?.status || raw.status || '放送前';
    const button = (label: string, onClick: () => void, primary = false) => (
      <button
        style={primary ? actionPrimaryBtn : actionGhostBtn}
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
      >
        {label}
      </button>
    );

    if (seasonStatus === '放送前' && raw.statusSection === 'pending') {
      return <>
        {button('視聴', () => updateAnimeSeason(raw, { status: '視聴予定', watchDecision: 'WILL_WATCH' } as any), true)}
        {button('見送り', () => updateAnimeSeason(raw, { status: '見送り', watchDecision: 'SKIPPED' } as any))}
      </>;
    }

    if (seasonStatus === '視聴予定') {
      return <>
        {button('視聴開始', () => updateAnimeSeason(raw, { status: '視聴中', watchDecision: 'WILL_WATCH' } as any), true)}
        {button('保留', () => updateAnimeSeason(raw, { status: '保留', watchDecision: 'WILL_WATCH' } as any))}
      </>;
    }

    if (seasonStatus === '保留') {
      return <>
        {button('再開', () => updateAnimeSeason(raw, { status: '視聴中', watchDecision: 'WILL_WATCH' } as any), true)}
        {button('中止', () => updateAnimeSeason(raw, { status: '視聴中止', watchDecision: 'SKIPPED' } as any))}
      </>;
    }

    if (seasonStatus === '視聴中') {
      return <>
        {button('視聴済', () => markAnimeEpisodeWatched(raw), true)}
        {button('中止', () => updateAnimeSeason(raw, { status: '視聴中止', watchDecision: 'SKIPPED' } as any))}
        {button('完結', () => updateAnimeSeason(raw, { status: '視聴済み', watchDecision: 'WILL_WATCH' } as any))}
      </>;
    }

    return null;
  };


  const renderItem = (item: StatusItem) => {
    if (item.type === 'concert') {
      return (
        <ConcertStatusCard
          key={item.id}
          concert={item.raw}
          onClick={() => {
            if (item.raw.status === '参戦予定' || item.raw.status === '参戦済み') onOpenConcert(item.raw.artistId, item.raw.tourId, item.raw.concertId);
            else onOpenArtist(item.raw.artistId);
          }}
          onUpdate={onUpdateConcert}
          onOpenEditor={() => onOpenConcertEditor(item.raw.artistId, item.raw.tourId)}
        />
      );
    }

    if (item.type === 'movie') {
      return (
        <MovieStatusCard
          key={item.id}
          item={item}
          now={new Date()}
          onOpenMovieDetail={onOpenMovieDetail}
          onUpdateMovieStatus={onUpdateMovieStatus}
          onOpenMovieLotteryWinModal={openMovieLotteryWinModal}
          onOpenMovieWatchedModal={openMovieWatchedModal}
        />
      );
    }
    if (item.type === 'anime') {
      const raw = item.raw as Anime & { nextBroadcastAt?: string; totalEpisodes?: number; watchedEpisodes?: number; seasonStatus?: AnimeStatus; seasonId?: string; seasonIndex?: number; season?: Season; statusSection?: string };
      const color = getAnimeDotColor(raw.seasonStatus || item.status);
      const total = raw.totalEpisodes || 0;
      const watched = raw.watchedEpisodes || 0;
      const actions = renderAnimeActions(raw);
      return (
        <div key={item.id}>
          <GlassCard style={{ marginBottom: actions ? 4 : 12, cursor: 'pointer' }} onClick={() => onOpenAnimeDetail(item.parentId)}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 58, height: 76, borderRadius: 14, overflow: 'hidden', background: 'rgba(0,0,0,0.04)', flexShrink: 0 }}>
                {raw.season?.posterUrl || raw.posterUrl ? <img src={raw.season?.posterUrl || raw.posterUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.35 }}>📺</div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: theme.colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ background: `${color}22`, color, borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 900 }}>{item.displayStatus}</span>
                  {raw.nextBroadcastAt && <span style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: 800 }}>次回: {raw.nextBroadcastAt.replace(/-/g, '/')}</span>}
                  {total > 0 && <span style={{ color: theme.colors.textWeak, fontSize: 11, fontWeight: 800 }}>{watched}/{total}話</span>}
                </div>
              </div>
            </div>
          </GlassCard>
          {actions && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, padding: '0 4px' }}>
              {actions}
            </div>
          )}
        </div>
      );
    }

    return (
      <ExhibitionStatusCard
        key={item.id}
        item={item}
        onOpenExhibitionDetail={onOpenExhibitionDetail}
        onOpenExhibitionDateModal={openExhibitionDateModal}
        onUpdateExhibitionStatus={onUpdateExhibitionStatus}
      />
    );
  };

  const renderSection = (title: string, items: StatusItem[]) => {
    if (!items.length) return null;
    return (
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '900', color: theme.colors.textSecondary, marginBottom: '12px', paddingLeft: '4px', letterSpacing: '0.02em' }}>
          {title} ({items.length})
        </h3>
        {items.map(renderItem)}
      </div>
    );
  };

  const tabs = [
    { key: 'ALL', label: 'すべて' },
    { key: 'CONCERT', label: '公演' },
    { key: 'EXHIBITION', label: '展覧' },
    { key: 'MOVIE', label: '映画' },
    { key: 'ANIME', label: 'アニメ' },
  ];

  const leftControl = (
    <button
      onClick={() => setIsMenuOpen((v) => !v)}
      style={{ width: '44px', height: '44px', borderRadius: '9999px', background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(15, 23, 42, 0.06)', boxShadow: '0 6px 18px rgba(15, 23, 42, 0.06)', color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      aria-label="status tools"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    </button>
  );

  return (
    <div style={{ paddingTop: 'calc(12px + env(safe-area-inset-top) + 44px + 16px)', minHeight: '100vh', background: theme.colors.background }}>
      <TopCapsuleNav activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as StatusTab)} onRefresh={() => {}} tabs={tabs} leftControl={leftControl} rightControl={<div />} />

      {isMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120 }} onClick={() => setIsMenuOpen(false)}>
          <GlassCard
            className="fade-in"
            style={{
              position: 'fixed',
              top: 'calc(12px + env(safe-area-inset-top) + 52px)',
              left: '16px',
              width: `${MENU_WIDTH}px`,
              maxWidth: 'calc(100vw - 32px)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} onClick={(e) => e.stopPropagation()}>
              <section>
                <div style={sectionTitle}>並び替え</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <MenuItem label="日付近い順" active={sortKey === 'date_asc'} onClick={() => setSortKey('date_asc')} />
                  <MenuItem label="日付遠い順" active={sortKey === 'date_desc'} onClick={() => setSortKey('date_desc')} />
                  <MenuItem label="種別優先" active={sortKey === 'type'} onClick={() => setSortKey('type')} />
                  <MenuItem label="ステータス優先" active={sortKey === 'status'} onClick={() => setSortKey('status')} />
                </div>
              </section>

              <section style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)', paddingTop: 16 }}>
                <div style={sectionTitle}>セクション絞り込み</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(['all', 'pending', 'decided', 'upcoming', 'history'] as SectionKey[]).map((key) => (
                    <SmallChip key={key} label={getSectionLabel(key)} active={sectionFilter === key} onClick={() => setSectionFilter(key)} />
                  ))}
                </div>
              </section>

              <section style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)', paddingTop: 16 }}>
                <div style={sectionTitle}>データ</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <MenuItem label="データ書き出し" onClick={() => { onExport(); setIsMenuOpen(false); }} />
                  <MenuItem label="データ読み込み" onClick={() => importInputRef.current?.click()} />
                </div>
                <input ref={importInputRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleImportFileChange} />
              </section>
            </div>
          </GlassCard>
        </div>
      )}

      {exhibitionAction && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setExhibitionAction(null)}>
          <GlassCard style={{ width: '100%', maxWidth: 420, minWidth: 0, boxSizing: 'border-box', overflow: 'hidden' }} onClick={(e: any) => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: theme.colors.text }}>{exhibitionAction.mode === 'reserve' ? '予約日時を入力' : '訪問日時を入力'}</div>
                <div style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 }}>{exhibitionAction.title}</div>
              </div>
              <input
                type="datetime-local"
                value={exhibitionAction.value}
                onInput={(e) => setExhibitionAction((prev) => prev ? { ...prev, value: e.currentTarget.value } : prev)}
                onChange={(e) => setExhibitionAction((prev) => prev ? { ...prev, value: e.target.value } : prev)}
                style={{
                  ...centeredNativeDateTimeInputStyle,
                  width: '100%',
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.08)',
                  padding: '12px 14px',
                  fontSize: 14,
                  fontWeight: 700,
                  color: theme.colors.text,
                  background: 'rgba(255,255,255,0.9)',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setExhibitionAction(null)} style={actionGhostBtn}>キャンセル</button>
                <button onClick={saveExhibitionDateAction} style={actionPrimaryBtn}>保存</button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {movieWatchedAction && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setMovieWatchedAction(null)}>
          <GlassCard style={{ width: '100%', maxWidth: 420, minWidth: 0, boxSizing: 'border-box', overflow: 'hidden' }} onClick={(e: any) => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: theme.colors.text }}>鑑賞情報を入力</div>
                <div style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 }}>{movieWatchedAction.title}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: theme.colors.textSecondary }}>鑑賞日</label>
                <input type="date" value={movieWatchedAction.watchDate} onInput={(e) => setMovieWatchedAction((prev) => prev ? { ...prev, watchDate: e.currentTarget.value } : prev)} onChange={(e) => setMovieWatchedAction((prev) => prev ? { ...prev, watchDate: e.target.value } : prev)} style={{ ...centeredNativeDateTimeInputStyle, width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', padding: '12px 14px', fontSize: 14, fontWeight: 700, color: theme.colors.text, background: 'rgba(255,255,255,0.9)' }} />
                <label style={{ fontSize: 12, fontWeight: 800, color: theme.colors.textSecondary }}>開演</label>
                <input type="time" value={movieWatchedAction.startTime} onInput={(e) => setMovieWatchedAction((prev) => prev ? { ...prev, startTime: e.currentTarget.value } : prev)} onChange={(e) => setMovieWatchedAction((prev) => prev ? { ...prev, startTime: e.target.value } : prev)} style={{ ...centeredNativeDateTimeInputStyle, width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', padding: '12px 14px', fontSize: 14, fontWeight: 700, color: theme.colors.text, background: 'rgba(255,255,255,0.9)' }} />
                <label style={{ fontSize: 12, fontWeight: 800, color: theme.colors.textSecondary }}>終演</label>
                <input type="time" value={movieWatchedAction.endTime} onInput={(e) => setMovieWatchedAction((prev) => prev ? { ...prev, endTime: e.currentTarget.value } : prev)} onChange={(e) => setMovieWatchedAction((prev) => prev ? { ...prev, endTime: e.target.value } : prev)} style={{ ...centeredNativeDateTimeInputStyle, width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', padding: '12px 14px', fontSize: 14, fontWeight: 700, color: theme.colors.text, background: 'rgba(255,255,255,0.9)' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setMovieWatchedAction(null)} style={actionGhostBtn}>キャンセル</button>
                <button onClick={saveMovieWatchedAction} style={actionPrimaryBtn}>保存</button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {movieLotteryAction && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setMovieLotteryAction(null)}>
          <GlassCard style={{ width: '100%', maxWidth: 460, minWidth: 0, boxSizing: 'border-box', overflow: 'hidden' }} onClick={(e: any) => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: theme.colors.text }}>当選内容を入力</div>
                <div style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 }}>{movieLotteryAction.title}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: theme.colors.textSecondary }}>鑑賞予定日時</label>
                <input
                  type="datetime-local"
                  value={movieLotteryAction.value}
                  onInput={(e) => setMovieLotteryAction((prev) => prev ? { ...prev, value: e.currentTarget.value } : prev)}
                  onChange={(e) => setMovieLotteryAction((prev) => prev ? { ...prev, value: e.target.value } : prev)}
                  style={{ ...centeredNativeDateTimeInputStyle, width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', padding: '12px 14px', fontSize: 14, fontWeight: 700, color: theme.colors.text, background: 'rgba(255,255,255,0.9)' }}
                />
                <label style={{ fontSize: 12, fontWeight: 800, color: theme.colors.textSecondary }}>劇場名</label>
                <input value={movieLotteryAction.theaterName} onChange={(e) => setMovieLotteryAction((prev) => prev ? { ...prev, theaterName: e.target.value } : prev)} style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', padding: '12px 14px', fontSize: 14, fontWeight: 700, color: theme.colors.text, background: 'rgba(255,255,255,0.9)' }} />
                <label style={{ fontSize: 12, fontWeight: 800, color: theme.colors.textSecondary }}>スクリーン</label>
                <input value={movieLotteryAction.screenName} onChange={(e) => setMovieLotteryAction((prev) => prev ? { ...prev, screenName: e.target.value } : prev)} style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', padding: '12px 14px', fontSize: 14, fontWeight: 700, color: theme.colors.text, background: 'rgba(255,255,255,0.9)' }} />
                <label style={{ fontSize: 12, fontWeight: 800, color: theme.colors.textSecondary }}>座席</label>
                <input value={movieLotteryAction.seat} onChange={(e) => setMovieLotteryAction((prev) => prev ? { ...prev, seat: e.target.value } : prev)} style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', padding: '12px 14px', fontSize: 14, fontWeight: 700, color: theme.colors.text, background: 'rgba(255,255,255,0.9)' }} />
                <label style={{ fontSize: 12, fontWeight: 800, color: theme.colors.textSecondary }}>料金</label>
                <input value={movieLotteryAction.price} onChange={(e) => setMovieLotteryAction((prev) => prev ? { ...prev, price: e.target.value } : prev)} style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', padding: '12px 14px', fontSize: 14, fontWeight: 700, color: theme.colors.text, background: 'rgba(255,255,255,0.9)' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setMovieLotteryAction(null)} style={actionGhostBtn}>キャンセル</button>
                <button onClick={saveMovieLotteryWinAction} style={actionPrimaryBtn}>保存</button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      <div style={{ padding: '0 16px 140px' }}>
        {renderSection(getSectionLabel('pending'), visibleSections.pending)}
        {renderSection(getSectionLabel('decided'), visibleSections.decided)}
        {renderSection(getSectionLabel('upcoming'), visibleSections.upcoming)}
        {renderSection(getSectionLabel('history'), visibleSections.history)}
      </div>
    </div>
  );
};

const sectionTitle: React.CSSProperties = {
  fontSize: '12px',
  color: theme.colors.textSecondary,
  marginBottom: 8,
  fontWeight: 'bold',
};

const menuButtonBase: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  padding: '10px 12px',
  borderRadius: '12px',
  border: 'none',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  background: 'transparent',
  color: theme.colors.text,
};

const MenuItem: React.FC<{ label: string; active?: boolean; onClick: () => void }> = ({ label, active = false, onClick }) => (
  <button onClick={onClick} style={{ ...menuButtonBase, background: active ? 'rgba(83, 190, 232, 0.10)' : 'transparent', color: active ? theme.colors.primary : theme.colors.text, fontWeight: active ? 800 : 600 }}>
    {label}
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

const actionPrimaryBtn: React.CSSProperties = {
  flex: 1,
  border: 'none',
  borderRadius: 12,
  background: theme.colors.primary,
  color: 'white',
  padding: '12px 16px',
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
};

const actionGhostBtn: React.CSSProperties = {
  ...actionPrimaryBtn,
  background: 'rgba(0,0,0,0.06)',
  color: theme.colors.text,
};

