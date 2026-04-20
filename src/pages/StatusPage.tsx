import React, { useMemo, useRef, useState } from 'react';
import { theme } from '../ui/theme';
import { GlassCard } from '../ui/GlassCard';
import { Artist, Concert, Exhibition, StatusItem, Movie } from '../domain/types';
import { generateStatusItems } from '../utils/statusGenerator';
import { TopCapsuleNav } from '../components/TopCapsuleNav';
import { applyMovieLotteryDecision, getDueAction, parseConcertDate } from '../domain/logic';
import { ConcertStatusCard } from '../components/ConcertStatusCard';
import { ExhibitionStatusCard } from '../components/ExhibitionStatusCard';
import { MovieStatusCard, MovieLotteryActionState } from '../components/MovieStatusCard';
import { fromDateTimeLocal, getMovieLotteryResultAt, getMovieSaleStart, parseMovieFlexibleDate, toDateTimeLocal } from '../domain/statusHelpers';

interface Props {
  artists: Artist[];
  exhibitions: Exhibition[];
  movies: Movie[];
  onOpenConcert: (aid: string, tid: string, cid: string) => void;
  onOpenConcertEditor: (aid: string, tid: string) => void;
  onUpdateConcert: (aid: string, tid: string, cid: string, updates: Partial<Concert>) => void;
  onOpenExhibitionDetail: (id: string) => void;
  onUpdateExhibitionStatus: (id: string, updates: Partial<Exhibition>) => void;
  onOpenMovieDetail: (id: string) => void;
  onUpdateMovieStatus: (id: string, updates: Partial<Movie>) => void;
  onExport: () => void;
  onImport: (data: any) => void;
}

type StatusTab = 'ALL' | 'CONCERT' | 'EXHIBITION' | 'MOVIE';
type SectionKey = 'all' | 'pending' | 'decided' | 'history';
type SortKey = 'date_asc' | 'date_desc' | 'type' | 'status';

type ExhibitionActionMode = 'reserve' | 'visit';
type MovieLotteryAction = MovieLotteryActionState;

const getSectionLabel = (key: SectionKey) => {
  switch (key) {
    case 'pending':
      return '未処理';
    case 'decided':
      return '決定済';
    case 'history':
      return '履歴';
    default:
      return '全部';
  }
};

const MENU_WIDTH = 300;

export const StatusPage: React.FC<Props> = ({
  artists,
  exhibitions,
  movies,
  onOpenConcert,
  onOpenConcertEditor,
  onUpdateConcert,
  onOpenExhibitionDetail,
  onUpdateExhibitionStatus,
  onOpenMovieDetail,
  onUpdateMovieStatus,
  onExport,
  onImport,
}) => {
  const [activeTab, setActiveTab] = useState<StatusTab>('ALL');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sectionFilter, setSectionFilter] = useState<SectionKey>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date_asc');
  const [exhibitionAction, setExhibitionAction] = useState<{ id: string; mode: ExhibitionActionMode; value: string; title: string } | null>(null);
  const [movieLotteryAction, setMovieLotteryAction] = useState<MovieLotteryAction | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const allItems = useMemo(() => generateStatusItems(artists, exhibitions, movies) || [], [artists, exhibitions, movies]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'ALL') return allItems;
    if (activeTab === 'CONCERT') return allItems.filter((item) => item.type === 'concert');
    if (activeTab === 'EXHIBITION') return allItems.filter((item) => item.type === 'exhibition');
    return allItems.filter((item) => item.type === 'movie');
  }, [allItems, activeTab]);

  const sections = useMemo(() => {
    const pending: StatusItem[] = [];
    const decided: StatusItem[] = [];
    const history: StatusItem[] = [];
    const now = new Date();

    filteredItems.forEach((item) => {
      if (item.type === 'exhibition') {
        if (item.status === 'PLANNED') pending.push(item);
        else if (item.status === 'RESERVED') decided.push(item);
        else history.push(item);
        return;
      }

      if (item.type === 'movie') {
        const saleStart = parseMovieFlexibleDate(getMovieSaleStart(item.raw));
        const resultAt = parseMovieFlexibleDate(getMovieLotteryResultAt(item.raw));
        const hasMovieAction =
          (item.status === '発売前' && !!saleStart && now >= saleStart) ||
          (item.status === '抽選中' && !!resultAt && now >= resultAt);
        if (item.status === '鑑賞済み' || item.status === '見送り' || item.status === '上映終了') {
          history.push(item);
        } else if (item.status === '鑑賞予定') {
          decided.push(item);
        } else if (hasMovieAction || item.status === '未上映' || item.status === '発売前' || item.status === '上映中' || item.status === '抽選中') {
          pending.push(item);
        } else {
          decided.push(item);
        }
        return;
      }

      const concertDate = parseConcertDate(item.date, 'CONCERT');
      const isPassed = concertDate && now >= concertDate;
      const due = getDueAction(item.raw, now);

      if (
  item.status === '参戦済み' ||
  item.status === '落選' ||
  item.status === '見送'
) {
  history.push(item);
}
      else if (due || ['発売前', '検討中', '抽選中'].includes(item.status)) {
  pending.push(item);
}
      else {
  decided.push(item);
}
    });

    return { pending, decided, history };
  }, [filteredItems]);

  const sortItems = (items: StatusItem[]) => {
    const list = [...(items || [])];
    return list.sort((a, b) => {
      const da = parseConcertDate(a.date, a.type === 'concert' ? 'CONCERT' : 'EXHIBITION');
      const db = parseConcertDate(b.date, b.type === 'concert' ? 'CONCERT' : 'EXHIBITION');
      const ta = da ? da.getTime() : Number.MAX_SAFE_INTEGER;
      const tb = db ? db.getTime() : Number.MAX_SAFE_INTEGER;
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
    pending: sectionFilter === 'all' || sectionFilter === 'pending' ? sortItems(sections.pending) : [],
    decided: sectionFilter === 'all' || sectionFilter === 'decided' ? sortItems(sections.decided) : [],
    history: sectionFilter === 'all' || sectionFilter === 'history' ? sortItems(sections.history) : [],
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
        window.alert('読み込みに失敗しました。JSONファイルを確認してください。');
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

  const renderItem = (item: StatusItem) => {
    if (item.type === 'concert') {
      return (
        <ConcertStatusCard
          key={item.id}
          concert={item.raw}
          onClick={() => onOpenConcert(item.raw.artistId, item.raw.tourId, item.raw.concertId)}
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
        />
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
    { key: 'ALL', label: '全部' },
    { key: 'CONCERT', label: '公演' },
    { key: 'EXHIBITION', label: '展覧' },
    { key: 'MOVIE', label: '映画' },
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
                  <MenuItem label="状態優先" active={sortKey === 'status'} onClick={() => setSortKey('status')} />
                </div>
              </section>

              <section style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)', paddingTop: 16 }}>
                <div style={sectionTitle}>セクション絞り込み</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(['all', 'pending', 'decided', 'history'] as SectionKey[]).map((key) => (
                    <SmallChip key={key} label={getSectionLabel(key)} active={sectionFilter === key} onClick={() => setSectionFilter(key)} />
                  ))}
                </div>
              </section>

              <section style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)', paddingTop: 16 }}>
                <div style={sectionTitle}>データ</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <MenuItem label="データを書き出す" onClick={() => { onExport(); setIsMenuOpen(false); }} />
                  <MenuItem label="データを読み込む" onClick={() => importInputRef.current?.click()} />
                </div>
                <input ref={importInputRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleImportFileChange} />
              </section>
            </div>
          </GlassCard>
        </div>
      )}

      {exhibitionAction && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setExhibitionAction(null)}>
          <GlassCard style={{ width: '100%', maxWidth: 420 }} onClick={(e: any) => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: theme.colors.text }}>{exhibitionAction.mode === 'reserve' ? '予約日時を入力' : '訪問日時を入力'}</div>
                <div style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 }}>{exhibitionAction.title}</div>
              </div>
              <input
                type="datetime-local"
                value={exhibitionAction.value}
                onChange={(e) => setExhibitionAction((prev) => prev ? { ...prev, value: e.target.value } : prev)}
                style={{
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

      {movieLotteryAction && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setMovieLotteryAction(null)}>
          <GlassCard style={{ width: '100%', maxWidth: 460 }} onClick={(e: any) => e.stopPropagation()}>
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
                  onChange={(e) => setMovieLotteryAction((prev) => prev ? { ...prev, value: e.target.value } : prev)}
                  style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', padding: '12px 14px', fontSize: 14, fontWeight: 700, color: theme.colors.text, background: 'rgba(255,255,255,0.9)' }}
                />
                <label style={{ fontSize: 12, fontWeight: 800, color: theme.colors.textSecondary }}>劇場名</label>
                <input value={movieLotteryAction.theaterName} onChange={(e) => setMovieLotteryAction((prev) => prev ? { ...prev, theaterName: e.target.value } : prev)} style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', padding: '12px 14px', fontSize: 14, fontWeight: 700, color: theme.colors.text, background: 'rgba(255,255,255,0.9)' }} />
                <label style={{ fontSize: 12, fontWeight: 800, color: theme.colors.textSecondary }}>スクリーン</label>
                <input value={movieLotteryAction.screenName} onChange={(e) => setMovieLotteryAction((prev) => prev ? { ...prev, screenName: e.target.value } : prev)} style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', padding: '12px 14px', fontSize: 14, fontWeight: 700, color: theme.colors.text, background: 'rgba(255,255,255,0.9)' }} />
                <label style={{ fontSize: 12, fontWeight: 800, color: theme.colors.textSecondary }}>座席</label>
                <input value={movieLotteryAction.seat} onChange={(e) => setMovieLotteryAction((prev) => prev ? { ...prev, seat: e.target.value } : prev)} style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', padding: '12px 14px', fontSize: 14, fontWeight: 700, color: theme.colors.text, background: 'rgba(255,255,255,0.9)' }} />
                <label style={{ fontSize: 12, fontWeight: 800, color: theme.colors.textSecondary }}>料金</label>
                <input value={movieLotteryAction.price} onChange={(e) => setMovieLotteryAction((prev) => prev ? { ...prev, price: e.target.value } : prev)} style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', padding: '12px 14px', fontSize: 14, fontWeight: 700, color: theme.colors.text, background: 'rgba(255,255,255,0.9)' }} />
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
