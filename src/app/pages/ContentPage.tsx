import React, { useMemo, useState } from 'react';
import { ArtistListPage } from '@/pages/ArtistListPage';
import { ConcertListPage } from '@/pages/ConcertListPage';
import { ExhibitionsPage } from '@/pages/ExhibitionsPage';
import { MoviesPage } from '@/pages/MoviesPage';
import { ActorListPage } from '@/pages/ActorListPage';
import { AnimesPage } from '@/pages/AnimesPage';
import { GachasPage } from '@/pages/GachasPage';
import { Artist, Concert, Exhibition, Movie, Actor, Anime, Gacha } from '@/domain/types';
import { TopCapsuleNav } from '@/components/TopCapsuleNav';
import { theme } from '@/components/common/theme';

interface ContentPageProps {
  activeTab: string;
  onTabChange: (tab: string) => void;

  artists: Artist[];
  onOpenArtist: (artistId: string) => void;
  onOpenArtistEditor: () => void;
  onRefreshAll: () => void;
  onImportData: (data: any) => void;
  artistSortMode: 'manual' | 'status';
  onSetArtistSort: (mode: 'manual' | 'status') => void;
  onUpdateOrder: (newArtists: Artist[]) => void;
  isArtistMenuOpen: boolean;
  onArtistMenuClose: () => void;

  onOpenConcert: (artistId: string, tourId: string, concertId: string) => void;
  onCreateConcert: () => void;
  onUpdateConcert: (artistId: string, tourId: string, concertId: string, updates: Partial<Concert>) => void;
  concertSortMode: 'status' | 'lottery';
  onSetSort: (mode: 'status' | 'lottery') => void;
  isConcertMenuOpen: boolean;
  onConcertMenuClose: () => void;

  exhibitions: Exhibition[];
  onUpdateExhibitions: (exhibitions: Exhibition[]) => void;
  onOpenExhibitionDetail: (exhibitionId: string) => void;
  isExhibitionMenuOpen: boolean;
  onExhibitionMenuClose: () => void;
  onAddNewExhibition: () => void;

  movies: Movie[];
  actors: Actor[];
  onOpenMovieDetail: (movieId: string) => void;
  onOpenActorDetail: (actorId: string) => void;
  onAddNewMovie: () => void;
  onUpdateMovies: (movies: Movie[]) => void;

  animes: Anime[];
  onOpenAnimeDetail: (animeId: string) => void;
  onAddNewAnime: () => void;

  gachas: Gacha[];
  onOpenGachaDetail: (gachaId: string) => void;
  onAddNewGacha: () => void;

  onExport: () => void;
  onImport: (data: any) => void;
}

type LeafTab = 'artists' | 'concerts' | 'exhibitions' | 'movies' | 'actors' | 'animes' | 'gachas';
type TopTab = 'music' | 'exhibitions' | 'movies' | 'animes' | 'gachas';

const getTopTab = (leaf: string): TopTab => {
  if (leaf === 'exhibitions') return 'exhibitions';
  if (leaf === 'movies' || leaf === 'actors') return 'movies';
  if (leaf === 'animes') return 'animes';
  if (leaf === 'gachas') return 'gachas';
  return 'music';
};

const secondaryTabsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 10,
  width: 'fit-content',
  margin: '0 auto',
  padding: '0 4px',
};

const SegmentButton: React.FC<{ active: boolean; children: React.ReactNode; onClick: () => void }> = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      border: 'none',
      background: 'transparent',
      color: active ? theme.colors.primary : '#8F98A7',
      fontSize: 12,
      fontWeight: 900,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      padding: '2px 0',
      lineHeight: 1,
      textShadow: active ? '0 1px 8px rgba(255,255,255,0.80)' : '0 1px 8px rgba(255,255,255,0.72)',
      transition: 'color 0.16s ease, opacity 0.16s ease',
    }}
  >
    {children}
  </button>
);

const SecondaryDivider = () => (
  <span
    aria-hidden="true"
    style={{
      color: 'rgba(143,152,167,0.54)',
      fontSize: 12,
      fontWeight: 900,
      lineHeight: 1,
      transform: 'translateY(-1px)',
    }}
  >
    ・
  </span>
);

export const ContentPage: React.FC<ContentPageProps> = (props) => {
  const [isArtistToolsOpen, setIsArtistToolsOpen] = useState(false);
  const [isConcertToolsOpen, setIsConcertToolsOpen] = useState(false);
  const [isExhibitionToolsOpen, setIsExhibitionToolsOpen] = useState(false);
  const [isMovieToolsOpen, setIsMovieToolsOpen] = useState(false);
  const [isAnimeToolsOpen, setIsAnimeToolsOpen] = useState(false);
  const [isGachaToolsOpen, setIsGachaToolsOpen] = useState(false);

  const isCompact = typeof window !== 'undefined' && window.innerWidth <= 480;
  const topNavHeight = isCompact ? 40 : 44;
  const secondaryGap = isCompact ? 16 : 9;
  const contentReservedHeight = topNavHeight + secondaryGap + 26;

  const leafTab = (['artists', 'concerts', 'exhibitions', 'movies', 'actors', 'animes', 'gachas'].includes(props.activeTab) ? props.activeTab : 'artists') as LeafTab;
  const topTab = getTopTab(leafTab);

  const closeAllMenus = () => {
    setIsArtistToolsOpen(false);
    setIsConcertToolsOpen(false);
    setIsExhibitionToolsOpen(false);
    setIsMovieToolsOpen(false);
    setIsAnimeToolsOpen(false);
    setIsGachaToolsOpen(false);
  };

  const openCurrentMenu = () => {
    if (leafTab === 'artists') {
      setIsArtistToolsOpen(v => !v);
      setIsConcertToolsOpen(false);
      setIsExhibitionToolsOpen(false);
      setIsMovieToolsOpen(false);
      setIsAnimeToolsOpen(false);
      setIsGachaToolsOpen(false);
    } else if (leafTab === 'concerts') {
      setIsConcertToolsOpen(v => !v);
      setIsArtistToolsOpen(false);
      setIsExhibitionToolsOpen(false);
      setIsMovieToolsOpen(false);
      setIsAnimeToolsOpen(false);
      setIsGachaToolsOpen(false);
    } else if (leafTab === 'exhibitions') {
      setIsExhibitionToolsOpen(v => !v);
      setIsArtistToolsOpen(false);
      setIsConcertToolsOpen(false);
      setIsMovieToolsOpen(false);
      setIsAnimeToolsOpen(false);
      setIsGachaToolsOpen(false);
    } else if (leafTab === 'movies' || leafTab === 'actors') {
      setIsMovieToolsOpen(v => !v);
      setIsArtistToolsOpen(false);
      setIsConcertToolsOpen(false);
      setIsExhibitionToolsOpen(false);
      setIsAnimeToolsOpen(false);
      setIsGachaToolsOpen(false);
    } else if (leafTab === 'animes') {
      setIsAnimeToolsOpen(v => !v);
      setIsArtistToolsOpen(false);
      setIsConcertToolsOpen(false);
      setIsExhibitionToolsOpen(false);
      setIsMovieToolsOpen(false);
      setIsGachaToolsOpen(false);
    } else if (leafTab === 'gachas') {
      setIsGachaToolsOpen(v => !v);
      setIsArtistToolsOpen(false);
      setIsConcertToolsOpen(false);
      setIsExhibitionToolsOpen(false);
      setIsMovieToolsOpen(false);
      setIsAnimeToolsOpen(false);
    }
  };

  const leftControl = (
    <button
      onClick={openCurrentMenu}
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '9999px',
        background: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(15, 23, 42, 0.06)',
        boxShadow: '0 6px 18px rgba(15, 23, 42, 0.06)',
        color: '#9CA3AF',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-label="tools"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    </button>
  );

  const tabs = [
    { key: 'music', label: '音楽' },
    { key: 'exhibitions', label: '展覧' },
    { key: 'movies', label: '映画' },
    { key: 'animes', label: 'アニメ' },
    { key: 'gachas', label: 'ガチャ' },
  ];

  const setTopTab = (tab: string) => {
    closeAllMenus();
    if (tab === 'music') props.onTabChange('artists');
    else if (tab === 'movies') props.onTabChange('movies');
    else if (tab === 'animes') props.onTabChange('animes');
    else if (tab === 'gachas') props.onTabChange('gachas');
    else props.onTabChange('exhibitions');
  };

  const followedActors = useMemo(() => (props.actors || []).filter(actor => actor.isFollowed), [props.actors]);


  const secondaryTabs = topTab === 'music' ? (
    <div style={secondaryTabsStyle}>
      <SegmentButton active={leafTab === 'artists'} onClick={() => { closeAllMenus(); props.onTabChange('artists'); }}>アーティスト</SegmentButton>
      <SecondaryDivider />
      <SegmentButton active={leafTab === 'concerts'} onClick={() => { closeAllMenus(); props.onTabChange('concerts'); }}>公演</SegmentButton>
    </div>
  ) : topTab === 'movies' ? (
    <div style={secondaryTabsStyle}>
      <SegmentButton active={leafTab === 'movies'} onClick={() => { closeAllMenus(); props.onTabChange('movies'); }}>映画</SegmentButton>
      <SecondaryDivider />
      <SegmentButton active={leafTab === 'actors'} onClick={() => { closeAllMenus(); props.onTabChange('actors'); }}>出演者</SegmentButton>
    </div>
  ) : null;

  return (
    <div style={{ position: 'relative', paddingTop: `calc(12px + env(safe-area-inset-top) + ${contentReservedHeight}px)` }}>
      <TopCapsuleNav
        activeTab={topTab}
        onTabChange={setTopTab}
        onRefresh={props.onRefreshAll}
        tabs={tabs}
        leftControl={leftControl}
      />

      {secondaryTabs && (
        <div
          style={{
            position: 'fixed',
            top: `calc(12px + env(safe-area-inset-top) + ${topNavHeight + secondaryGap}px)`,
            left: 0,
            right: 0,
            height: 18,
            zIndex: 121,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'none',
            background: 'transparent',
          }}
        >
          <div style={{ pointerEvents: 'auto', width: 'fit-content' }}>
            {secondaryTabs}
          </div>
        </div>
      )}

      <div className="content-area">

        {leafTab === 'artists' && (
          <ArtistListPage
            artists={props.artists}
            onOpenArtist={props.onOpenArtist}
            onOpenArtistEditor={props.onOpenArtistEditor}
            onRefreshAll={props.onRefreshAll}
            onImportData={props.onImportData}
            sortMode={props.artistSortMode}
            onSetSort={props.onSetArtistSort}
            onUpdateOrder={props.onUpdateOrder}
            isMenuOpenExternally={isArtistToolsOpen}
            onMenuClose={() => setIsArtistToolsOpen(false)}
            hideHeader={true}
            onExport={props.onExport}
          />
        )}
        {leafTab === 'concerts' && (
          <ConcertListPage
            artists={props.artists}
            onOpenArtist={props.onOpenArtist}
            onOpenConcert={props.onOpenConcert}
            onCreateConcert={props.onCreateConcert}
            onRefreshAll={props.onRefreshAll}
            onUpdateConcert={props.onUpdateConcert}
            sortMode={props.concertSortMode}
            onSetSort={props.onSetSort}
            isMenuOpenExternally={isConcertToolsOpen}
            onMenuClose={() => setIsConcertToolsOpen(false)}
            hideHeader={true}
            onExport={props.onExport}
            onImportData={props.onImportData}
          />
        )}
        {leafTab === 'exhibitions' && (
          <ExhibitionsPage
            exhibitions={props.exhibitions}
            onUpdateExhibitions={props.onUpdateExhibitions}
            onOpenDetail={props.onOpenExhibitionDetail}
            isMenuOpenExternally={isExhibitionToolsOpen}
            onMenuClose={() => setIsExhibitionToolsOpen(false)}
            onAddNew={props.onAddNewExhibition}
            onExport={props.onExport}
            onImport={props.onImportData}
            hideHeader={true}
          />
        )}
        {leafTab === 'movies' && (
          <MoviesPage
            movies={props.movies}
            onOpenDetail={props.onOpenMovieDetail}
            onExport={props.onExport}
            onImport={props.onImportData}
            isMenuOpenExternally={isMovieToolsOpen}
            onMenuClose={() => setIsMovieToolsOpen(false)}
            hideHeader={true}
          />
        )}
        {leafTab === 'actors' && (
          <>
            <MoviesPage
              movies={props.movies}
              onOpenDetail={props.onOpenMovieDetail}
              onExport={props.onExport}
              onImport={props.onImportData}
              isMenuOpenExternally={isMovieToolsOpen}
              onMenuClose={() => setIsMovieToolsOpen(false)}
              hideHeader={true}
              menuOnly={true}
            />
            <ActorListPage
              actors={followedActors}
              movies={props.movies}
              onOpenActor={props.onOpenActorDetail}
            />
          </>
        )}
        {leafTab === 'animes' && (
          <AnimesPage
            animes={props.animes}
            onOpenDetail={props.onOpenAnimeDetail}
            onExport={props.onExport}
            onImport={props.onImportData}
            isMenuOpenExternally={isAnimeToolsOpen}
            onMenuClose={() => setIsAnimeToolsOpen(false)}
            hideHeader={true}
          />
        )}
        {leafTab === 'gachas' && (
          <GachasPage
            gachas={props.gachas}
            onOpenDetail={props.onOpenGachaDetail}
            onExport={props.onExport}
            onImport={props.onImportData}
            isMenuOpenExternally={isGachaToolsOpen}
            onMenuClose={() => setIsGachaToolsOpen(false)}
            hideHeader={true}
          />
        )}
      </div>
    </div>
  );
};
