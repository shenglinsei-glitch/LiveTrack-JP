import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { ArtistListPage } from '@/pages/ArtistListPage';
import { ConcertListPage } from '@/pages/ConcertListPage';
import { ExhibitionsPage } from '@/pages/ExhibitionsPage';
import { MoviesPage } from '@/pages/MoviesPage';
import { ActorListPage } from '@/pages/ActorListPage';
import { AnimesPage } from '@/pages/AnimesPage';
import { GachasPage } from '@/pages/GachasPage';
import { Artist, Concert, Exhibition, Movie, Actor, Anime, Gacha, AnimeStatus } from '@/domain/types';
import { TopCapsuleNav } from '@/components/TopCapsuleNav';
import { theme } from '@/components/common/theme';
import { RemoteImage } from '@/components/RemoteImage';
import { calcArtistStatus, getEffectiveExhibitionStatus } from '@/domain/logic';
import { deriveGachaStatus } from '@/utils/gacha';

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


type SearchableResult = {
  id: string;
  type: LeafTab;
  title: string;
  subtitle?: string;
  meta?: string;
  imageUrl?: string;
  imageId?: string;
  fallbackIcon: string;
  keywords: string;
  onOpen: () => void;
};

type SearchContext = {
  label: string;
  placeholder: string;
  emptyHint: string;
  results: SearchableResult[];
};

const SEARCH_CONTEXT_LABELS: Record<LeafTab, string> = {
  artists: 'アーティスト',
  concerts: '公演',
  exhibitions: '展覧',
  movies: '映画',
  actors: '出演者',
  animes: 'アニメ',
  gachas: 'ガチャ',
};

const normalizeForSearch = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(normalizeForSearch).join(' ');
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map(normalizeForSearch).join(' ');
  return String(value).normalize('NFKC').toLowerCase().trim();
};

const makeKeywords = (...parts: unknown[]) => normalizeForSearch(parts).replace(/\s+/g, ' ').trim();

const joinText = (...parts: Array<string | undefined | null | false>) => parts.filter(Boolean).join(' · ');

const formatDisplayDate = (value?: string | null) => {
  if (!value) return '';
  const parsed = dayjs(value);
  if (!parsed.isValid()) return String(value);
  return parsed.format('YYYY.MM.DD');
};

const formatSearchDate = (value?: string | null) => {
  if (!value) return '';
  const parsed = dayjs(value);
  if (!parsed.isValid()) return String(value);
  return [String(value), parsed.format('YYYY/MM/DD'), parsed.format('YYYY.MM.DD'), parsed.format('YYYY年MM月DD日')].join(' ');
};

const getAnimeStatus = (anime: Anime): AnimeStatus => {
  const priority: AnimeStatus[] = ['視聴中', '視聴予定', '保留', '放送前', '視聴済み', '視聴中止', '見送り'];
  const statuses = (anime.seasons || []).map((season) => season.status).filter(Boolean) as AnimeStatus[];
  if (!statuses.length) return anime.status || '放送前';
  return priority.find((status) => statuses.includes(status)) || anime.status || '放送前';
};

const getExhibitionStatusLabel = (exhibition: Exhibition) => {
  const status = getEffectiveExhibitionStatus(exhibition);
  const labels: Record<string, string> = {
    NONE: '準備中',
    PLANNED: '開催中',
    RESERVED: '予約済',
    SKIPPED: '見送り',
    VISITED: '訪問済み',
    ENDED: '終了',
  };
  return labels[status] || status;
};

const getArtistStatusLabel = (artist: Artist) => {
  const status = calcArtistStatus(artist);
  return `${status.main}${status.sub ? ` / ${status.sub}` : ''}`;
};

const buildSearchContext = (args: {
  leafTab: LeafTab;
  artists: Artist[];
  exhibitions: Exhibition[];
  movies: Movie[];
  actors: Actor[];
  animes: Anime[];
  gachas: Gacha[];
  onOpenArtist: (artistId: string) => void;
  onOpenConcert: (artistId: string, tourId: string, concertId: string) => void;
  onOpenExhibitionDetail: (exhibitionId: string) => void;
  onOpenMovieDetail: (movieId: string) => void;
  onOpenActorDetail: (actorId: string) => void;
  onOpenAnimeDetail: (animeId: string) => void;
  onOpenGachaDetail: (gachaId: string) => void;
}): SearchContext => {
  const label = SEARCH_CONTEXT_LABELS[args.leafTab];
  const base = {
    label,
    placeholder: `${label}を検索`,
    emptyHint: 'タイトル・会場・人物名などを入力してください。',
  };

  if (args.leafTab === 'artists') {
    return {
      ...base,
      results: (args.artists || []).map((artist) => {
        const statusLabel = getArtistStatusLabel(artist);
        const tourCount = (artist.tours || []).length;
        return {
          id: artist.id,
          type: 'artists',
          title: artist.name || '名称未設定',
          subtitle: joinText('音楽', statusLabel),
          meta: tourCount ? `${tourCount}件の公演情報` : '公演情報なし',
          imageUrl: artist.imageUrl,
          imageId: (artist as any).imageId,
          fallbackIcon: '🎵',
          keywords: makeKeywords(
            artist.name,
            statusLabel,
            artist.links,
            (artist.tours || []).map((tour) => [
              tour.name,
              tour.memo,
              tour.officialUrl,
              tour.concerts?.map((concert) => [
                concert.venue,
                concert.status,
                concert.lotteryName,
                formatSearchDate(concert.concertAt || concert.date),
                concert.setlist,
                concert.goods,
              ]),
            ]),
          ),
          onOpen: () => args.onOpenArtist(artist.id),
        };
      }),
    };
  }

  if (args.leafTab === 'concerts') {
    const results: SearchableResult[] = [];
    (args.artists || []).forEach((artist) => {
      (artist.tours || []).forEach((tour) => {
        (tour.concerts || []).forEach((concert) => {
          const date = concert.concertAt || concert.date;
          results.push({
            id: `${artist.id}:${tour.id}:${concert.id}`,
            type: 'concerts',
            title: tour.name || '公演名未設定',
            subtitle: joinText(artist.name, concert.venue || '会場未設定'),
            meta: joinText(formatDisplayDate(date), concert.status),
            imageUrl: tour.imageUrl || artist.imageUrl,
            imageId: (tour as any).imageId || (artist as any).imageId,
            fallbackIcon: '🎤',
            keywords: makeKeywords(
              artist.name,
              tour.name,
              tour.memo,
              tour.officialUrl,
              concert.venue,
              concert.status,
              concert.lotteryName,
              concert.seatType,
              concert.seatLocation,
              concert.saleLink,
              formatSearchDate(date),
              formatSearchDate(concert.saleAt),
              formatSearchDate(concert.deadlineAt),
              formatSearchDate(concert.resultAt),
              concert.setlist,
              concert.goods,
              concert.lotteryHistory,
            ),
            onOpen: () => args.onOpenConcert(artist.id, tour.id, concert.id),
          });
        });
      });
    });
    return { ...base, results };
  }

  if (args.leafTab === 'exhibitions') {
    return {
      ...base,
      results: (args.exhibitions || []).map((exhibition) => {
        const venue = exhibition.venueTags?.join(' / ') || exhibition.venueName || exhibition.venue || exhibition.area || '';
        const statusLabel = getExhibitionStatusLabel(exhibition);
        return {
          id: exhibition.id,
          type: 'exhibitions',
          title: exhibition.title || '展覧名未設定',
          subtitle: joinText(venue || '会場未設定', statusLabel),
          meta: joinText(formatDisplayDate(exhibition.startDate), exhibition.endDate ? `〜 ${formatDisplayDate(exhibition.endDate)}` : ''),
          imageUrl: exhibition.imageUrl,
          imageId: exhibition.imageIds?.[0],
          fallbackIcon: '🖼️',
          keywords: makeKeywords(
            exhibition.title,
            venue,
            statusLabel,
            exhibition.description,
            exhibition.comment,
            exhibition.artists,
            exhibition.urls,
            exhibition.websiteUrl,
            exhibition.goods,
            formatSearchDate(exhibition.startDate),
            formatSearchDate(exhibition.endDate),
            formatSearchDate(exhibition.reservedAt),
            formatSearchDate(exhibition.visitedAt),
          ),
          onOpen: () => args.onOpenExhibitionDetail(exhibition.id),
        };
      }),
    };
  }

  if (args.leafTab === 'movies') {
    return {
      ...base,
      results: (args.movies || []).map((movie) => {
        const date = movie.watchDate || movie.releaseDate;
        return {
          id: movie.id,
          type: 'movies',
          title: movie.title || '映画名未設定',
          subtitle: joinText(movie.theaterName || '劇場未設定', movie.status),
          meta: joinText(formatDisplayDate(date), movie.genres?.join(' / ')),
          imageUrl: movie.posterUrl,
          fallbackIcon: '🎬',
          keywords: makeKeywords(
            movie.title,
            movie.status,
            movie.theaterName,
            movie.screenName,
            movie.seat,
            movie.memo,
            movie.actors,
            movie.directors,
            movie.genres,
            movie.websiteUrl,
            movie.lotteryName,
            movie.lotteryUrl,
            movie.lotteryHistory,
            formatSearchDate(movie.releaseDate),
            formatSearchDate(movie.watchDate),
            formatSearchDate(movie.saleAt),
            formatSearchDate(movie.deadlineAt),
            formatSearchDate(movie.lotteryResultAt),
          ),
          onOpen: () => args.onOpenMovieDetail(movie.id),
        };
      }),
    };
  }

  if (args.leafTab === 'actors') {
    return {
      ...base,
      results: (args.actors || []).map((actor) => {
        const relatedMovies = (args.movies || []).filter((movie) => (movie.actors || []).some((name) => normalizeForSearch(name) === normalizeForSearch(actor.name)));
        return {
          id: actor.id,
          type: 'actors',
          title: actor.name || '出演者名未設定',
          subtitle: '出演者',
          meta: relatedMovies.length ? `${relatedMovies.length}件の映画` : '映画情報なし',
          imageUrl: actor.avatar,
          fallbackIcon: '👤',
          keywords: makeKeywords(actor.name, relatedMovies.map((movie) => [movie.title, movie.directors, movie.genres, formatSearchDate(movie.releaseDate)])),
          onOpen: () => args.onOpenActorDetail(actor.id),
        };
      }),
    };
  }

  if (args.leafTab === 'animes') {
    return {
      ...base,
      results: (args.animes || []).map((anime) => {
        const status = getAnimeStatus(anime);
        const seasonTitles = (anime.seasons || []).map((season) => joinText(season.seasonNumber, season.seasonTitle));
        const songs = [anime.openingSongs, anime.endingSongs, ...(anime.seasons || []).map((season) => [season.openingSongs, season.endingSongs])];
        return {
          id: anime.id,
          type: 'animes',
          title: anime.title || 'アニメ名未設定',
          subtitle: joinText(anime.studio || '制作会社未設定', status),
          meta: joinText(formatDisplayDate(anime.startDate), anime.broadcastWeekday ? `毎週${anime.broadcastWeekday}` : ''),
          imageUrl: anime.posterUrl || anime.seasons?.find((season) => !!season.posterUrl)?.posterUrl,
          fallbackIcon: '📺',
          keywords: makeKeywords(
            anime.title,
            status,
            anime.studio,
            anime.director,
            anime.originalType,
            anime.originalTitle,
            anime.genres,
            anime.summary,
            anime.review,
            anime.websiteUrl,
            anime.broadcastWeekday,
            anime.broadcastTime,
            seasonTitles,
            anime.seasons,
            songs,
            formatSearchDate(anime.startDate),
            formatSearchDate(anime.endDate),
          ),
          onOpen: () => args.onOpenAnimeDetail(anime.id),
        };
      }),
    };
  }

  return {
    ...base,
    results: (args.gachas || []).map((gacha) => {
      const status = deriveGachaStatus(gacha);
      return {
        id: gacha.id,
        type: 'gachas',
        title: gacha.name || 'ガチャ名未設定',
        subtitle: joinText(gacha.kind, status),
        meta: joinText(formatDisplayDate(gacha.drawDateTime || gacha.releaseDate), gacha.drawPlace),
        imageUrl: gacha.posterUrl,
        fallbackIcon: '🎁',
        keywords: makeKeywords(
          gacha.name,
          gacha.kind,
          status,
          gacha.drawPlace,
          gacha.memo,
          gacha.prizes,
          formatSearchDate(gacha.releaseDate),
          formatSearchDate(gacha.drawDateTime),
        ),
        onOpen: () => args.onOpenGachaDetail(gacha.id),
      };
    }),
  };
};

const filterSearchResults = (results: SearchableResult[], query: string) => {
  const normalizedQuery = normalizeForSearch(query).trim();
  if (!normalizedQuery) return [];
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  return results
    .filter((item) => tokens.every((token) => item.keywords.includes(token) || normalizeForSearch(item.title).includes(token)))
    .sort((a, b) => {
      const titleA = normalizeForSearch(a.title);
      const titleB = normalizeForSearch(b.title);
      const scoreA = titleA.startsWith(normalizedQuery) ? 0 : titleA.includes(normalizedQuery) ? 1 : 2;
      const scoreB = titleB.startsWith(normalizedQuery) ? 0 : titleB.includes(normalizedQuery) ? 1 : 2;
      if (scoreA !== scoreB) return scoreA - scoreB;
      return a.title.localeCompare(b.title, 'ja');
    });
};

const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const searchContext = useMemo(() => buildSearchContext({
    leafTab,
    artists: props.artists,
    exhibitions: props.exhibitions,
    movies: props.movies,
    actors: leafTab === 'actors' ? followedActors : props.actors,
    animes: props.animes,
    gachas: props.gachas,
    onOpenArtist: props.onOpenArtist,
    onOpenConcert: props.onOpenConcert,
    onOpenExhibitionDetail: props.onOpenExhibitionDetail,
    onOpenMovieDetail: props.onOpenMovieDetail,
    onOpenActorDetail: props.onOpenActorDetail,
    onOpenAnimeDetail: props.onOpenAnimeDetail,
    onOpenGachaDetail: props.onOpenGachaDetail,
  }), [
    leafTab,
    props.artists,
    props.exhibitions,
    props.movies,
    props.actors,
    props.animes,
    props.gachas,
    props.onOpenArtist,
    props.onOpenConcert,
    props.onOpenExhibitionDetail,
    props.onOpenMovieDetail,
    props.onOpenActorDetail,
    props.onOpenAnimeDetail,
    props.onOpenGachaDetail,
    followedActors,
  ]);

  const searchResults = useMemo(() => filterSearchResults(searchContext.results, searchQuery), [searchContext.results, searchQuery]);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  const openSearch = () => {
    closeAllMenus();
    setIsSearchOpen(true);
  };

  const rightControl = (
    <button
      type="button"
      onClick={openSearch}
      aria-label="search"
      style={{
        position: 'absolute',
        right: 0,
        width: 44,
        height: 44,
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
        outline: 'none',
        padding: 0,
        pointerEvents: 'auto',
        transition: 'transform 0.15s ease, color 0.16s ease',
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.92)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <SearchIcon />
    </button>
  );

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
        rightControl={rightControl}
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

      <SearchBottomSheet
        isOpen={isSearchOpen}
        label={searchContext.label}
        placeholder={searchContext.placeholder}
        emptyHint={searchContext.emptyHint}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        results={searchResults}
        totalCount={searchContext.results.length}
        onClose={closeSearch}
      />
    </div>
  );
};

const SearchBottomSheet: React.FC<{
  isOpen: boolean;
  label: string;
  placeholder: string;
  emptyHint: string;
  query: string;
  onQueryChange: (value: string) => void;
  results: SearchableResult[];
  totalCount: number;
  onClose: () => void;
}> = ({ isOpen, label, placeholder, emptyHint, query, onQueryChange, results, totalCount, onClose }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const showResults = trimmedQuery.length > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, pointerEvents: 'auto' }}>
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.24)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${label}検索`}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '0 12px calc(12px + env(safe-area-inset-bottom))',
        }}
      >
        <div
          onClick={(event) => event.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 560,
            margin: '0 auto',
            borderRadius: '28px 28px 24px 24px',
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            border: '1px solid rgba(255, 255, 255, 0.72)',
            boxShadow: '0 -18px 50px rgba(15, 23, 42, 0.18)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '10px 18px 0', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 42, height: 4, borderRadius: 999, background: 'rgba(148, 163, 184, 0.42)' }} />
          </div>

          <div style={{ padding: '14px 18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: theme.colors.text, lineHeight: 1.2 }}>{label}検索</div>
              <div style={{ marginTop: 3, fontSize: 12, fontWeight: 700, color: theme.colors.textSecondary }}>
                {totalCount}件から検索
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                border: '1px solid rgba(15, 23, 42, 0.06)',
                background: 'rgba(255, 255, 255, 0.72)',
                color: theme.colors.textSecondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-label="閉じる"
            >
              ×
            </button>
          </div>

          <div style={{ padding: '0 18px 14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                height: 46,
                padding: '0 14px',
                borderRadius: 18,
                background: 'rgba(255, 255, 255, 0.72)',
                border: '1px solid rgba(15, 23, 42, 0.06)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
              }}
            >
              <SearchIcon style={{ width: 18, height: 18, color: theme.colors.primary, flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={placeholder}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 15,
                  fontWeight: 700,
                  color: theme.colors.text,
                }}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => onQueryChange('')}
                  style={{
                    border: 'none',
                    background: 'rgba(15, 23, 42, 0.06)',
                    color: theme.colors.textSecondary,
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    cursor: 'pointer',
                    fontSize: 16,
                    lineHeight: '24px',
                    flexShrink: 0,
                  }}
                  aria-label="検索語をクリア"
                >
                  ×
                </button>
              ) : null}
            </div>
          </div>

          <div style={{ maxHeight: 'min(56vh, 440px)', overflowY: 'auto', padding: '0 12px 14px' }}>
            {!showResults ? (
              <SearchEmptyState icon="⌕" title={emptyHint} description="検索結果をタップすると詳細ページへ移動します。" />
            ) : results.length === 0 ? (
              <SearchEmptyState icon="—" title="一致する項目がありません。" description="別のキーワードで検索してください。" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {results.map((item) => (
                  <SearchResultRow
                    key={`${item.type}:${item.id}`}
                    item={item}
                    onSelect={() => {
                      item.onOpen();
                      onClose();
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SearchEmptyState: React.FC<{ icon: string; title: string; description: string }> = ({ icon, title, description }) => (
  <div style={{ padding: '42px 16px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
    <div style={{ width: 48, height: 48, borderRadius: 18, background: 'rgba(83, 190, 232, 0.10)', color: theme.colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900 }}>
      {icon}
    </div>
    <div style={{ fontSize: 14, fontWeight: 800, color: theme.colors.text }}>{title}</div>
    <div style={{ fontSize: 12, fontWeight: 600, color: theme.colors.textSecondary, lineHeight: 1.6 }}>{description}</div>
  </div>
);

const SearchResultRow: React.FC<{ item: SearchableResult; onSelect: () => void }> = ({ item, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    style={{
      width: '100%',
      border: 'none',
      background: 'rgba(255, 255, 255, 0.64)',
      borderRadius: 18,
      padding: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      cursor: 'pointer',
      textAlign: 'left',
      boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)',
    }}
  >
    <div style={{ width: 54, height: 54, borderRadius: 15, overflow: 'hidden', background: '#F3F4F6', flexShrink: 0, position: 'relative' }}>
      {item.imageUrl || item.imageId ? (
        <RemoteImage
          imageUrl={item.imageUrl}
          imageId={item.imageId}
          alt={item.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          fallback={(
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, opacity: 0.48 }}>
              {item.fallbackIcon}
            </div>
          )}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, opacity: 0.48 }}>
          {item.fallbackIcon}
        </div>
      )}
    </div>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 900, color: theme.colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.title}
      </div>
      {item.subtitle ? (
        <div style={{ marginTop: 4, fontSize: 12, fontWeight: 700, color: theme.colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.subtitle}
        </div>
      ) : null}
      {item.meta ? (
        <div style={{ marginTop: 3, fontSize: 11, fontWeight: 700, color: theme.colors.textWeak, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.meta}
        </div>
      ) : null}
    </div>
    <div style={{ width: 26, height: 26, borderRadius: 999, background: 'rgba(83,190,232,0.12)', color: theme.colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 900 }}>
      ›
    </div>
  </button>
);
