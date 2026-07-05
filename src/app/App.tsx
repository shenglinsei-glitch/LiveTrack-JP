
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { normalizeArtistData, normalizeExhibitionData, normalizeMovieData, normalizeActorData, normalizeAnimeData, normalizeGachaData } from '@/utils/data';
import { safeSave, safeGet } from '@/utils/storage';
import { PageId, Artist, Tour, DisplaySettings, Status, Concert, Exhibition, Movie, Actor, Anime, Gacha, TagMasters } from '@/domain/types';
import { Layout } from '@/components/Layout';
import { HomePage } from '@/pages/HomePage';
import { ArtistListPage } from '@/pages/ArtistListPage';
import { ConcertListPage } from '@/pages/ConcertListPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { ArtistDetailPage } from '@/pages/ArtistDetailPage';
import { ConcertHomePage } from '@/pages/ConcertHomePage';
import { ArtistEditorPage } from '@/pages/ArtistEditorPage';
import { ConcertEditorPage } from '@/pages/ConcertEditorPage';
import { ContentPage } from '@/pages/ContentPage';
import { StatusPage } from '@/pages/StatusPage';
import { ExhibitionDetailPage } from '@/pages/ExhibitionDetailPage';
import { MovieDetailPage } from '@/pages/MovieDetailPage';
import { ActorDetailPage } from '@/pages/ActorDetailPage';
import { AnimesPage } from '@/pages/AnimesPage';
import { GachasPage } from '@/pages/GachasPage';
import { GachaDetailPage } from '@/pages/GachaDetailPage';
import { AnimeDetailPage } from '@/pages/AnimeDetailPage';
import { TagManagementPage } from '@/pages/TagManagementPage';
import { GlassCard } from '@/components/common/GlassCard';
import { MenuButton, sectionTitleStyle } from '@/components/BottomMenu';
import { theme } from '@/components/common/theme';
import { getDueAction, autoAdvanceConcertStatus, autoAdvanceMovieStatus, prepareFullDataForExport, migrateAlbumImagesToIndexedDB, migrateExhibitionImagesToIndexedDB } from '@/domain/logic';
import dayjs from 'dayjs';
import { deriveGachaStatus } from '@/utils/gacha';

type NavContext = {
  path: PageId;
  artistId?: string;
  tourId?: string;
  concertId?: string;
  exhibitionId?: string;
  movieId?: string;
  actorId?: string;
  animeId?: string;
  gachaId?: string;
  fromActorId?: string;
  from?: PageId;
  edit?: boolean; // Navigation flag to start in edit mode
  isNew?: boolean; // New draft flag for unsaved/discard behavior
};

const STORAGE_KEYS = {
  ARTISTS: 'livetrack_jp_artists',
  EXHIBITIONS: 'livetrack_jp_exhibitions',
  MOVIES: 'livetrack_jp_movies',
  ACTORS: 'livetrack_jp_actors',
  ANIMES: 'livetrack_jp_animes',
  GACHAS: 'livetrack_jp_gachas',
  TAG_MASTERS: 'livetrack_jp_tag_masters',
  FAVE_ARCHIVE_TAGS: 'fave-archive-tags',
  DISPLAY_SETTINGS: 'livetrack_jp_display_settings',
  ARTIST_SORT: 'livetrack_jp_artist_sort',
  CONCERT_SORT: 'livetrack_jp_concert_sort'
};


const DEFAULT_TAG_MASTERS: TagMasters = {
  venues: [],
  cinemas: [],
  exhibitionVenues: [],
  movieGenres: [],
  animeGenres: [],
  animeStudios: [],
  directors: [],
  artists: [],
  general: [],
};

const normalizeTagMasters = (raw?: Partial<TagMasters> | null): TagMasters => ({
  venues: Array.isArray(raw?.venues) ? raw!.venues : [],
  cinemas: Array.isArray(raw?.cinemas) ? raw!.cinemas : [],
  exhibitionVenues: Array.isArray(raw?.exhibitionVenues) ? raw!.exhibitionVenues : [],
  movieGenres: Array.isArray(raw?.movieGenres) ? raw!.movieGenres : [],
  animeGenres: Array.isArray(raw?.animeGenres) ? raw!.animeGenres : [],
  animeStudios: Array.isArray(raw?.animeStudios) ? raw!.animeStudios : [],
  directors: Array.isArray(raw?.directors) ? raw!.directors : [],
  artists: Array.isArray(raw?.artists) ? raw!.artists : [],
  general: Array.isArray(raw?.general) ? raw!.general : [],
});

export default function App() {
  const [nav, setNav] = useState<NavContext>({ path: 'HOME' });
  const [isArtistPickerOpen, setIsArtistPickerOpen] = useState(false);
  const [isHomeAddMenuOpen, setIsHomeAddMenuOpen] = useState(false);
  const [isArtistMenuOpen, setIsArtistMenuOpen] = useState(false);
  const [isConcertMenuOpen, setIsConcertMenuOpen] = useState(false);
  const [isCalendarMenuOpen, setIsCalendarMenuOpen] = useState(false);
  const [isExhibitionMenuOpen, setIsExhibitionMenuOpen] = useState(false);

  const [contentActiveTab, setContentActiveTab] = useState('artists');

  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(() => {
    return safeGet<DisplaySettings>(STORAGE_KEYS.DISPLAY_SETTINGS, { showAttended: true, showSkipped: true });
  });

  const [artistSortMode, setArtistSortMode] = useState<'manual' | 'status'>(() => {
    return safeGet<'manual' | 'status'>(STORAGE_KEYS.ARTIST_SORT, 'status');
  });

  const [concertSortMode, setConcertSortMode] = useState<'status' | 'lottery'>(() => {
    return safeGet<'status' | 'lottery'>(STORAGE_KEYS.CONCERT_SORT, 'status');
  });

  const [artists, setArtists] = useState<Artist[]>(() => {
    const raw = safeGet<any[]>(STORAGE_KEYS.ARTISTS, []);
    return (raw || []).map(normalizeArtistData);
  });

  const [exhibitions, setExhibitions] = useState<Exhibition[]>(() => {
    const raw = safeGet<any[]>(STORAGE_KEYS.EXHIBITIONS, []);
    return (raw || []).map(normalizeExhibitionData);
  });

  const [movies, setMovies] = useState<Movie[]>(() => {
    const raw = safeGet<any[]>(STORAGE_KEYS.MOVIES, []);
    return (raw || []).map(normalizeMovieData);
  });

  const [actors, setActors] = useState<Actor[]>(() => {
    const raw = safeGet<any[]>(STORAGE_KEYS.ACTORS, []);
    return (raw || []).map(normalizeActorData);
  });

  const [animes, setAnimes] = useState<Anime[]>(() => {
    const raw = safeGet<any[]>(STORAGE_KEYS.ANIMES, []);
    return (raw || []).map(normalizeAnimeData);
  });

  const [gachas, setGachas] = useState<Gacha[]>(() => {
    const raw = safeGet<any[]>(STORAGE_KEYS.GACHAS, []);
    return (raw || []).map(normalizeGachaData);
  });

  const [tagMasters, setTagMasters] = useState<TagMasters>(() => {
    const saved = safeGet<Partial<TagMasters> | null>(STORAGE_KEYS.TAG_MASTERS, null) || safeGet<Partial<TagMasters> | null>(STORAGE_KEYS.FAVE_ARCHIVE_TAGS, null);
    return normalizeTagMasters(saved || DEFAULT_TAG_MASTERS);
  });

  useEffect(() => { safeSave(STORAGE_KEYS.ARTISTS, artists); }, [artists]);
  useEffect(() => { safeSave(STORAGE_KEYS.EXHIBITIONS, exhibitions); }, [exhibitions]);
  useEffect(() => { safeSave(STORAGE_KEYS.MOVIES, movies); }, [movies]);
  useEffect(() => { safeSave(STORAGE_KEYS.ACTORS, actors); }, [actors]);
  useEffect(() => { safeSave(STORAGE_KEYS.ANIMES, animes); }, [animes]);
  useEffect(() => { safeSave(STORAGE_KEYS.GACHAS, gachas); }, [gachas]);
  useEffect(() => {
    safeSave(STORAGE_KEYS.TAG_MASTERS, tagMasters);
    safeSave(STORAGE_KEYS.FAVE_ARCHIVE_TAGS, tagMasters);
  }, [tagMasters]);

  const availableAnimeGenres = useMemo(() => {
    const set = new Set<string>();
    (animes || []).forEach((anime) => {
      (anime.genres || []).forEach((genre) => { if (genre?.trim()) set.add(genre.trim()); });
      (anime.seasons || []).forEach((season) => (season.genres || []).forEach((genre) => { if (genre?.trim()) set.add(genre.trim()); }));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ja'));
  }, [animes]);
  useEffect(() => { safeSave(STORAGE_KEYS.DISPLAY_SETTINGS, displaySettings); }, [displaySettings]);
  useEffect(() => { safeSave(STORAGE_KEYS.ARTIST_SORT, artistSortMode); }, [artistSortMode]);
  useEffect(() => { safeSave(STORAGE_KEYS.CONCERT_SORT, concertSortMode); }, [concertSortMode]);

  useEffect(() => {
    // One-time migration on startup to move images to IndexedDB
    const runMigration = async () => {
      try {
        const migratedArtists = await migrateAlbumImagesToIndexedDB(artists);
        const migratedExhibitions = await migrateExhibitionImagesToIndexedDB(exhibitions);

        // Only update if something actually changed (to avoid infinite loops)
        // We check if the stringified version changed, which is a bit heavy but safe.
        if (JSON.stringify(migratedArtists) !== JSON.stringify(artists)) {
          setArtists(migratedArtists);
        }
        if (JSON.stringify(migratedExhibitions) !== JSON.stringify(exhibitions)) {
          setExhibitions(migratedExhibitions);
        }
      } catch (e) {
        console.error('Startup image migration failed:', e);
      }
    };
    runMigration();
  }, []);

  const hasGlobalConcertAlert = useMemo(() => {
    const now = new Date();
    return (artists || []).some(a => (a.tours || []).some(t => (t.concerts || []).some(c => !!getDueAction(c, now))));
  }, [artists]);

  const runAutoAdvance = useCallback(() => {
    const now = new Date();
    setArtists(prev => (prev || []).map(a => ({
      ...a,
      tours: (a.tours || []).map(t => ({
        ...t,
        concerts: (t.concerts || []).map(c => autoAdvanceConcertStatus(c, now))
      }))
    })));
  }, []);

  const handleRefreshAll = useCallback(() => {
    runAutoAdvance();
    setMovies(prev => prev.map(movie => autoAdvanceMovieStatus(movie, new Date())));
  }, [runAutoAdvance]);

  useEffect(() => { runAutoAdvance(); }, [nav.path, runAutoAdvance]);
  useEffect(() => {
    setMovies(prev => prev.map(movie => autoAdvanceMovieStatus(movie, new Date())));
  }, [nav.path]);

  // Unified Export Logic
  const handleExportAll = async () => {
    try {
      const fullData = { ...(await prepareFullDataForExport(artists, exhibitions, movies)), actors, animes, gachas, tagMasters };
      const dataStr = JSON.stringify(fullData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `LiveTrack_JP_Full_Backup_${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Unified Export failed:', error);
      window.alert('書き出しに失敗しました。');
    }
  };

  // Unified Import Logic
  const handleImportAll = (importedData: any) => {
    // Handle both old single-array format and new unified object format.
    // Important: imported backups may contain legacy `images: string[]` (urls).
    // We migrate those urls into IndexedDB and restore `imageIds` so the detail pages can render albums.

    const artistsRaw: Artist[] | null = Array.isArray(importedData)
      ? importedData
      : (importedData?.artists ?? null);
    const exhibitionsRaw: Exhibition[] | null = (!Array.isArray(importedData) && importedData?.exhibitions)
      ? importedData.exhibitions
      : null;
    const moviesRaw: Movie[] | null = (!Array.isArray(importedData) && importedData?.movies)
      ? importedData.movies
      : null;
    const actorsRaw: Actor[] | null = (!Array.isArray(importedData) && importedData?.actors)
      ? importedData.actors
      : null;
    const animesRaw: Anime[] | null = (!Array.isArray(importedData) && importedData?.animes)
      ? importedData.animes
      : null;
    const gachasRaw: Gacha[] | null = (!Array.isArray(importedData) && importedData?.gachas)
      ? importedData.gachas
      : null;
    const tagMastersRaw: TagMasters | null = (!Array.isArray(importedData) && importedData?.tagMasters)
      ? importedData.tagMasters
      : null;

    // Guard: if payload shape is not recognized, do nothing but surface a clear message.
    if (!artistsRaw && !exhibitionsRaw && !moviesRaw && !actorsRaw && !animesRaw && !gachasRaw && !tagMastersRaw) {
      window.alert('読み込みに失敗しました。データ形式が正しくありません。');
      return;
    }

    // Helpful guard: if the user accidentally picked an empty backup, make it obvious.
    const artistCount = Array.isArray(artistsRaw) ? artistsRaw.length : 0;
    const exhibitionCount = Array.isArray(exhibitionsRaw) ? exhibitionsRaw.length : 0;
    const movieCount = Array.isArray(moviesRaw) ? moviesRaw.length : 0;
    const actorCount = Array.isArray(actorsRaw) ? actorsRaw.length : 0;
    const animeCount = Array.isArray(animesRaw) ? animesRaw.length : 0;
    const gachaCount = Array.isArray(gachasRaw) ? gachasRaw.length : 0;
    if (artistCount === 0 && exhibitionCount === 0 && movieCount === 0 && actorCount === 0 && animeCount === 0 && gachaCount === 0) {
      const ok = window.confirm('このバックアップにはデータがありません。\nこのまま上書き読み込みしますか？');
      if (!ok) return;
    }

    if (artistsRaw) setArtists((artistsRaw || []).map(normalizeArtistData));
    if (exhibitionsRaw) setExhibitions((exhibitionsRaw || []).map(normalizeExhibitionData));
    if (moviesRaw) setMovies((moviesRaw || []).map(normalizeMovieData));
    if (actorsRaw) setActors((actorsRaw || []).map(normalizeActorData));
    if (animesRaw) setAnimes((animesRaw || []).map(normalizeAnimeData));
    if (gachasRaw) setGachas((gachasRaw || []).map(normalizeGachaData));
    if (tagMastersRaw) setTagMasters(normalizeTagMasters(tagMastersRaw));

    // Post-migrate in background (still on the main thread), then update state again.
    (async () => {
      try {
        if (artistsRaw) {
          const migratedArtists = await migrateAlbumImagesToIndexedDB(artistsRaw);
          setArtists((migratedArtists || []).map(normalizeArtistData));
        }
        if (exhibitionsRaw) {
          const migratedExhibitions = await migrateExhibitionImagesToIndexedDB(exhibitionsRaw);
          setExhibitions((migratedExhibitions || []).map(normalizeExhibitionData));
        }
        if (moviesRaw) {
          setMovies((moviesRaw || []).map(normalizeMovieData));
        }
      } catch (e) {
        console.error('Import image migration failed:', e);
        // Keep the import successful even if image migration fails.
        // (The user can still re-open pages; images may be missing.)
      }
    })();
  };

  const navigateToArtistList = () => {
    setNav({ path: 'CONTENT' });
    setContentActiveTab('artists');
  };
  const navigateToArtistDetail = (artistId: string, from?: PageId) => setNav({ path: 'ARTIST_DETAIL', artistId, from });
  const navigateToArtistEditor = (artistId?: string) => setNav({ path: 'ARTIST_EDITOR', artistId });
  const navigateToConcertEditor = (artistId: string, tourId?: string) => setNav({ path: 'CONCERT_EDITOR', artistId, tourId });
  const navigateToConcertHome = (artistId: string, tourId: string, concertId: string, from?: PageId) => setNav({ path: 'CONCERT_HOME', artistId, tourId, concertId, from });

  const navigateToExhibitionList = () => {
    setNav({ path: 'CONTENT' });
    setContentActiveTab('exhibitions');
  };

  const navigateToExhibitionDetail = (exhibitionId: string, edit?: boolean, isNew?: boolean) => setNav({ path: 'EXHIBITION_DETAIL', exhibitionId, edit, isNew });
  const navigateToMovieDetail = (movieId: string, edit?: boolean, isNew?: boolean) => setNav({ path: 'MOVIE_DETAIL', movieId, edit, isNew, from: 'CONTENT' });
  const navigateToActorDetail = (actorId: string) => setNav({ path: 'ACTOR_DETAIL', actorId, from: 'CONTENT' });
  const navigateToAnimeDetail = (animeId: string, edit?: boolean, isNew?: boolean) => setNav({ path: 'ANIME_DETAIL', animeId: animeId, edit, isNew, from: 'CONTENT' });
  const navigateToGachaDetail = (gachaId: string, edit?: boolean, isNew?: boolean) => setNav({ path: 'GACHA_DETAIL', gachaId, edit, isNew, from: 'CONTENT' });
  const navigateToTagManagement = () => setNav({ path: 'TAG_MANAGEMENT' });

  const normalizeActorName = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

  const followActorByName = (name: string) => {
    const actorName = name.trim();
    if (!actorName) return;
    const nowIso = new Date().toISOString();
    setActors(prev => {
      const idx = prev.findIndex(a => normalizeActorName(a.name) === normalizeActorName(actorName));
      if (idx >= 0) {
        return prev.map((a, i) => i === idx ? { ...a, name: a.name || actorName, isFollowed: true, updatedAt: nowIso } : a);
      }
      return [...prev, { id: Math.random().toString(36).substr(2, 9), name: actorName, avatar: '', isFollowed: true, createdAt: nowIso, updatedAt: nowIso }];
    });
  };

  const updateActor = (updated: Actor) => {
    const oldActor = actors.find(a => a.id === updated.id);
    const normalized = normalizeActorData({ ...updated, updatedAt: new Date().toISOString() });
    setActors(prev => prev.map(a => a.id === updated.id ? normalized : a));
    if (oldActor && normalizeActorName(oldActor.name) !== normalizeActorName(normalized.name)) {
      setMovies(prev => prev.map(movie => ({
        ...movie,
        actors: (movie.actors || []).map(name => normalizeActorName(name) === normalizeActorName(oldActor.name) ? normalized.name : name),
        updatedAt: new Date().toISOString(),
      })));
    }
  };

  const unfollowActor = (actorId: string) => {
    setActors(prev => prev.map(a => a.id === actorId ? { ...a, isFollowed: false, updatedAt: new Date().toISOString() } : a));
    setContentActiveTab('actors');
    setNav({ path: 'CONTENT' });
  };

  const addNewExhibition = () => {
    const newEx: Exhibition = {
      id: Math.random().toString(36).substr(2, 9),
      title: '新規展覧',
      startDate: dayjs().format('YYYY-MM-DD'),
      endDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
      status: 'NONE',
      ticketSalesStatus: 'none',
      hasAdvanceTicket: false,
      advanceSaleAt: '',
      advanceTicketPurchased: false,
      holidaySameAsWeekday: true,
      holidayPriceSameAsWeekday: true,
      needsReservation: false,
      imageIds: []
    };
    setExhibitions(prev => [...prev, newEx]);
    navigateToExhibitionDetail(newEx.id, true, true);
  };

  const addNewMovie = () => {
    const nowIso = new Date().toISOString();
    const newMovie: Movie = {
      id: Math.random().toString(36).substr(2, 9),
      title: '新規映画',
      posterUrl: '',
      theaterName: '',
      screenName: '',
      seat: '',
      releaseDate: dayjs().format('YYYY-MM-DD'),
      watchDate: '',
      startTime: '',
      endTime: '',
      memo: '',
      actors: [''],
      directors: [''],
      price: undefined,
      ticketType: '通常',
      status: '未上映',
      websiteUrl: '',
      lotteryName: '',
      lotteryUrl: '',
      lotteryResultAt: '',
      lotteryPrice: undefined,
      lotteryResult: null,
      lotteryHistory: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setMovies(prev => [...prev, newMovie]);
    setContentActiveTab('movies');
    navigateToMovieDetail(newMovie.id, true, true);
  };

  const addNewAnime = () => {
    const nowIso = new Date().toISOString();
    const newAnime: Anime = {
      id: Math.random().toString(36).substr(2, 9),
      title: '新規アニメ',
      posterUrl: '',
      startDate: '',
      endDate: '',
      studio: '',
      director: '',
      originalType: undefined,
      originalTitle: '',
      openingSongs: [],
      endingSongs: [],
      genres: [],
      summary: '',
      rating: undefined,
      status: '放送前',
      review: '',
      totalEpisodes: undefined,
      broadcastWeekday: '',
      broadcastTime: '',
      // シーズンは必要になった時だけ追加する。
      // 単独作品では総ステータスを手動管理し、不要な「第1期」カードを作らない。
      seasons: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setAnimes(prev => [...prev, newAnime]);
    setContentActiveTab('animes');
    navigateToAnimeDetail(newAnime.id, true, true);
  };

  const addNewGacha = () => {
    const nowIso = new Date().toISOString();
    const newGacha: Gacha = {
      id: Math.random().toString(36).substr(2, 9),
      name: '新規ガチャ',
      posterUrl: '',
      kind: 'ガチャ',
      releaseDate: dayjs().format('YYYY-MM-DD'),
      drawDateTime: '',
      drawCount: undefined,
      drawPlace: '',
      pricePerDraw: undefined,
      otherCosts: undefined,
      status: '抽選予定',
      prizes: [],
      memo: '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setGachas(prev => [...prev, newGacha]);
    setContentActiveTab('gachas');
    navigateToGachaDetail(newGacha.id, true, true);
  };

  const addTagToMasters = (key: keyof TagMasters, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if ((tagMasters[key] || []).includes(trimmed)) return;
    setTagMasters(prev => ({
      ...normalizeTagMasters(prev),
      [key]: [...(prev[key] || []), trimmed],
    }));
  };

  const upsertArtist = (updated: Artist) => {
    setArtists(prev => {
      const exists = prev.some(a => a.id === updated.id);
      return exists ? prev.map(a => a.id === updated.id ? updated : a) : [...prev, updated];
    });
    navigateToArtistDetail(updated.id, nav.from);
  };

  const updateConcert = (artistId: string, tourId: string, concertId: string, updates: Partial<Concert>) => {
    setArtists(prev => (prev || []).map(a => {
      if (a.id !== artistId) return a;
      return {
        ...a,
        tours: (a.tours || []).map(t => {
          if (t.id !== tourId) return t;
          return { ...t, concerts: (t.concerts || []).map(c => c.id === concertId ? { ...c, ...updates } : c) };
        })
      };
    }));
  };

  const upsertTour = (artistId: string, updatedTour: Tour) => {
    setArtists(prev => (prev || []).map(artist => {
      if (artist.id !== artistId) return artist;
      const tourExists = (artist.tours || []).some(t => t.id === updatedTour.id);
      return {
        ...artist,
        tours: tourExists ? (artist.tours || []).map(t => t.id === updatedTour.id ? updatedTour : t) : [...(artist.tours || []), updatedTour]
      };
    }));
    navigateToArtistDetail(artistId, nav.from);
  };

  const handlePlusClick = useCallback(() => {
    if (nav.path === 'HOME') {
      // 在首页弹出选择器
      setIsHomeAddMenuOpen(true);
      return;
    }
    if (nav.path !== 'CONTENT') return;
    if (contentActiveTab === 'artists') {
      navigateToArtistEditor();
    } else if (contentActiveTab === 'concerts') {
      setIsArtistPickerOpen(true);
    } else if (contentActiveTab === 'exhibitions') {
      addNewExhibition();
    } else if (contentActiveTab === 'movies' || contentActiveTab === 'actors') {
      addNewMovie();
    } else if (contentActiveTab === 'animes') {
      addNewAnime();
    } else if (contentActiveTab === 'gachas') {
      addNewGacha();
    }
  }, [nav.path, contentActiveTab]);

  const renderPage = () => {
    switch (nav.path) {
      case 'HOME':
        return (
          <HomePage
            artists={artists}
            exhibitions={exhibitions}
            movies={movies}
            animes={animes}
            gachas={gachas}
            onNavigateToMusic={() => {
              setNav({ path: 'CONTENT' });
              setContentActiveTab('artists');
            }}
            onNavigateToExhibitions={() => {
              setNav({ path: 'CONTENT' });
              setContentActiveTab('exhibitions');
            }}
            onNavigateToMovies={() => {
              setNav({ path: 'CONTENT' });
              setContentActiveTab('movies');
            }}
            onNavigateToAnime={() => {
              setNav({ path: 'CONTENT' });
              setContentActiveTab('animes');
            }}
            onNavigateToGacha={() => {
              setNav({ path: 'CONTENT' });
              setContentActiveTab('gachas');
            }}
            onOpenConcert={(aid, tid, cid) => navigateToConcertHome(aid, tid, cid, 'HOME')}
            onOpenExhibition={(id) => navigateToExhibitionDetail(id)}
            onOpenMovie={(id) => navigateToMovieDetail(id)}
            onOpenAnime={(id) => navigateToAnimeDetail(id)}
            onExport={handleExportAll}
            onImport={handleImportAll}
            onNavigateToTagManagement={navigateToTagManagement}
          />
        );
      case 'CONTENT':
        return (
          <ContentPage
            activeTab={contentActiveTab}
            onTabChange={setContentActiveTab}
            artists={artists}
            onOpenArtist={(id) => navigateToArtistDetail(id, 'CONTENT')}
            onOpenArtistEditor={() => navigateToArtistEditor()}
            onRefreshAll={handleRefreshAll}
            onImportData={handleImportAll}
            artistSortMode={artistSortMode}
            onSetArtistSort={setArtistSortMode}
            onUpdateOrder={(newList) => setArtists(newList.map((a, i) => ({ ...a, order: i })))}
            onOpenConcert={(aid, tid, cid) => navigateToConcertHome(aid, tid, cid, 'CONTENT')}
            onCreateConcert={() => setIsArtistPickerOpen(true)}
            onUpdateConcert={updateConcert}
            concertSortMode={concertSortMode}
            onSetSort={setConcertSortMode}
            isArtistMenuOpen={isArtistMenuOpen}
            onArtistMenuClose={() => setIsArtistMenuOpen(false)}
            isConcertMenuOpen={isConcertMenuOpen}
            onConcertMenuClose={() => setIsConcertMenuOpen(false)}
            exhibitions={exhibitions}
            onUpdateExhibitions={setExhibitions}
            onOpenExhibitionDetail={navigateToExhibitionDetail}
            isExhibitionMenuOpen={isExhibitionMenuOpen}
            onExhibitionMenuClose={() => setIsExhibitionMenuOpen(false)}
            onAddNewExhibition={addNewExhibition}
            movies={movies}
            actors={actors}
            onOpenActorDetail={navigateToActorDetail}
            onOpenMovieDetail={navigateToMovieDetail}
            onAddNewMovie={addNewMovie}
            onUpdateMovies={setMovies}
            animes={animes}
            onOpenAnimeDetail={navigateToAnimeDetail}
            onAddNewAnime={addNewAnime}
            gachas={gachas}
            onOpenGachaDetail={navigateToGachaDetail}
            onAddNewGacha={addNewGacha}
            onExport={handleExportAll}
            onImport={handleImportAll}
          />
        );
      case 'STATUS':
        return (
          <StatusPage
            artists={artists}
            exhibitions={exhibitions}
            movies={movies}
            animes={animes}
            onOpenConcert={(aid, tid, cid) => navigateToConcertHome(aid, tid, cid, 'STATUS')}
            onOpenArtist={(id) => navigateToArtistDetail(id, 'STATUS')}
            onOpenConcertEditor={(aid, tid) => navigateToConcertEditor(aid, tid)}
            onUpdateConcert={updateConcert}
            onOpenExhibitionDetail={navigateToExhibitionDetail}
            onUpdateExhibitionStatus={(id, updates) => {
              setExhibitions(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
            }}
            onOpenMovieDetail={navigateToMovieDetail}
            onUpdateMovieStatus={(id, updates) => {
              setMovies(prev => prev.map(m => m.id === id ? normalizeMovieData({ ...m, ...updates, updatedAt: new Date().toISOString() }) : m));
            }}
            onOpenAnimeDetail={navigateToAnimeDetail}
            onUpdateAnimeStatus={(id, updates) => {
              setAnimes(prev => prev.map(a => a.id === id ? normalizeAnimeData({ ...a, ...updates, updatedAt: new Date().toISOString() }) : a));
            }}
            onExport={handleExportAll}
            onImport={handleImportAll}
          />
        );
      case 'EXHIBITION_DETAIL': {
        const exhibition = exhibitions.find(e => e.id === nav.exhibitionId);
        if (!exhibition) return null;
        return (
          <ExhibitionDetailPage
            exhibition={exhibition}
            allExhibitions={exhibitions}
            onUpdateExhibition={(updated) => {
              setExhibitions(prev => prev.map(e => e.id === updated.id ? updated : e));
            }}
            onDeleteExhibition={(id) => {
              setExhibitions(prev => prev.filter(e => e.id !== id));
              navigateToExhibitionList();
            }}
            onBack={navigateToExhibitionList}
            initialEditMode={nav.edit}
            initialIsNew={nav.isNew}
            exhibitionVenues={tagMasters.exhibitionVenues}
            onAddExhibitionVenue={(v) => addTagToMasters('exhibitionVenues', v)}
          />
        );
      }

      case 'MOVIE_DETAIL': {
        const movie = movies.find(m => m.id === nav.movieId);
        if (!movie) return null;
        return (
          <MovieDetailPage
            movie={movie}
            actors={actors}
            onFollowActor={followActorByName}
            onOpenActorDetail={navigateToActorDetail}
            onUpdateMovie={(updated) => {
              setMovies(prev => prev.map(m => m.id === updated.id ? normalizeMovieData(updated) : m));
            }}
            onDeleteMovie={(id) => {
              setMovies(prev => prev.filter(m => m.id !== id));
              setNav({ path: 'CONTENT' });
              setContentActiveTab('movies');
            }}
            onBack={() => {
              if (nav.from === 'ACTOR_DETAIL' && nav.fromActorId) setNav({ path: 'ACTOR_DETAIL', actorId: nav.fromActorId });
              else { setNav({ path: 'CONTENT' }); setContentActiveTab('movies'); }
            }}
            initialEditMode={!!nav.edit}
            initialIsNew={!!nav.isNew}
            cinemas={tagMasters.cinemas}
            movieGenres={tagMasters.movieGenres}
            onAddCinema={(v) => addTagToMasters('cinemas', v)}
            onAddMovieGenre={(v) => addTagToMasters('movieGenres', v)}
          />
        );
      }

      case 'ACTOR_DETAIL': {
        const actor = actors.find(a => a.id === nav.actorId);
        if (!actor) return null;
        return (
          <ActorDetailPage
            actor={actor}
            movies={movies}
            onBack={() => { setContentActiveTab('actors'); setNav({ path: 'CONTENT' }); }}
            onOpenMovieDetail={(movieId) => setNav({ path: 'MOVIE_DETAIL', movieId, from: 'ACTOR_DETAIL', fromActorId: actor.id })}
            onUpdateActor={updateActor}
            onUnfollowActor={unfollowActor}
          />
        );
      }

      case 'ANIME_DETAIL': {
        const anime = animes.find(a => a.id === nav.animeId);
        if (!anime) return null;
        return (
          <AnimeDetailPage
            anime={anime}
            availableGenres={tagMasters.animeGenres}
            availableStudios={tagMasters.animeStudios}
            onUpdateAnime={(updated) => {
              setAnimes(prev => prev.map(a => a.id === updated.id ? normalizeAnimeData(updated) : a));
            }}
            onDeleteAnime={(id) => {
              setAnimes(prev => prev.filter(a => a.id !== id));
              setNav({ path: 'CONTENT' });
              setContentActiveTab('animes');
            }}
            onBack={() => {
              setNav({ path: 'CONTENT' });
              setContentActiveTab('animes');
            }}
            initialEditMode={!!nav.edit}
            initialIsNew={!!nav.isNew}
            onAddAnimeGenre={(v) => addTagToMasters('animeGenres', v)}
            onAddAnimeStudio={(v) => addTagToMasters('animeStudios', v)}
          />
        );
      }

      case 'GACHA_DETAIL': {
        const gacha = gachas.find(g => g.id === nav.gachaId);
        if (!gacha) return null;
        return (
          <GachaDetailPage
            gacha={gacha}
            onUpdateGacha={(updated) => {
              const normalized = normalizeGachaData({ ...updated, status: deriveGachaStatus(updated), updatedAt: new Date().toISOString() });
              setGachas(prev => prev.map(g => g.id === normalized.id ? normalized : g));
            }}
            onDeleteGacha={(id) => {
              setGachas(prev => prev.filter(g => g.id !== id));
              setNav({ path: 'CONTENT' });
              setContentActiveTab('gachas');
            }}
            onBack={() => {
              setNav({ path: 'CONTENT' });
              setContentActiveTab('gachas');
            }}
            initialEditMode={!!nav.edit}
            initialIsNew={!!nav.isNew}
          />
        );
      }

      case 'TAG_MANAGEMENT':
        return (
          <TagManagementPage
            tagMasters={tagMasters}
            onUpdateTagMasters={setTagMasters}
            artists={artists}
            exhibitions={exhibitions}
            movies={movies}
            animes={animes}
            onUpdateArtists={setArtists}
            onUpdateExhibitions={setExhibitions}
            onUpdateMovies={setMovies}
            onUpdateAnimes={setAnimes}
            onBack={() => setNav({ path: 'HOME' })}
          />
        );

      case 'CALENDAR':
        return (
          <CalendarPage
            artists={artists}
            exhibitions={exhibitions}
            movies={movies}
            animes={animes}
            onOpenArtist={(id) => navigateToArtistDetail(id, 'CALENDAR')}
            onOpenConcert={(aid, tid, cid) => navigateToConcertHome(aid, tid, cid, 'CALENDAR')}
            onOpenExhibition={(id) => navigateToExhibitionDetail(id)}
            onOpenMovie={(id) => navigateToMovieDetail(id)}
            onOpenAnime={(id) => navigateToAnimeDetail(id)}
            onRefreshAll={handleRefreshAll}
            isMenuOpenExternally={isCalendarMenuOpen}
            onMenuClose={() => setIsCalendarMenuOpen(false)}
          />
        );
      case 'ARTIST_DETAIL': {
        const artist = artists.find(a => a.id === nav.artistId);
        if (!artist) return null;
        return (
          <ArtistDetailPage
            artistId={nav.artistId!}
            artist={artist}
            settings={displaySettings}
            onOpenArtistEditor={navigateToArtistEditor}
            onOpenConcertEditor={navigateToConcertEditor}
            onOpenConcertHome={(aid, tid, cid) => navigateToConcertHome(aid, tid, cid, nav.from)}
            onChangeSettings={s => setDisplaySettings(p => ({...p, ...s}))}
            onBack={() => {
              if (nav.from === 'CALENDAR') setNav({ path: 'CALENDAR' });
              else if (nav.from === 'STATUS') setNav({ path: 'STATUS' });
              else if (nav.from === 'CONCERT_LIST' || nav.from === 'CONTENT') { setContentActiveTab('concerts'); setNav({ path: 'CONTENT' }); }
              else navigateToArtistList();
            }}
          />
        );
      }
      case 'CONCERT_HOME': {
        const artist = artists.find(a => a.id === nav.artistId);
        const tour = artist?.tours.find(t => t.id === nav.tourId);
        const concert = tour?.concerts.find(c => c.id === nav.concertId);
        if (!artist || !tour || !concert) return null;
        return (
          <ConcertHomePage
            artistId={artist.id}
            concertId={concert.id}
            artist={artist}
            tour={tour}
            concert={concert}
            onBack={() => {
              if (nav.from === 'CALENDAR') setNav({ path: 'CALENDAR' });
              else if (nav.from === 'STATUS') setNav({ path: 'STATUS' });
              else { setContentActiveTab('concerts'); setNav({ path: 'CONTENT' }); }
            }}
            onOpenArtistDetail={(aid) => navigateToArtistDetail(aid, 'CONCERT_LIST')}
            onOpenConcertEditor={navigateToConcertEditor}
            onUpdateConcertAlbum={(aid, tid, cid, imgs) => updateConcert(aid, tid, cid, { imageIds: imgs })}
          />
        );
      }
      case 'ARTIST_EDITOR': return (
        <ArtistEditorPage
          artistId={nav.artistId}
          artist={artists.find(a => a.id === nav.artistId)}
          onSave={upsertArtist}
          onCancel={() => nav.artistId ? navigateToArtistDetail(nav.artistId, nav.from) : navigateToArtistList()}
          onDeleteArtist={id => { setArtists(p => p.filter(a => a.id !== id)); navigateToArtistList(); }}
        />
      );
      case 'CONCERT_EDITOR': {
        const artist = artists.find(a => a.id === nav.artistId);
        if (!artist) return null;
        return (
          <ConcertEditorPage
            artistId={artist.id}
            tourId={nav.tourId}
            tour={artist.tours.find(t => t.id === nav.tourId)}
            allArtists={artists}
            onSave={t => upsertTour(artist.id, t)}
            onCancel={() => navigateToArtistDetail(artist.id, nav.from)}
            onDeleteTour={(aid, tid) => { setArtists(p => p.map(a => a.id !== aid ? a : { ...a, tours: a.tours.filter(tour => tour.id !== tid) })); navigateToArtistDetail(aid, nav.from); }}
            venues={tagMasters.venues}
            onAddVenue={(v) => addTagToMasters('venues', v)}
          />
        );
      }
      default: return null;
    }
  };

  return (
    <div className="app-root">
      <Layout
        currentPath={nav.path}
        onNavigate={p => setNav({ path: p })}
        onPlusClick={nav.path === 'CONTENT' || nav.path === 'HOME' ? handlePlusClick : undefined}
        hasConcertAlert={hasGlobalConcertAlert}
      >
        {renderPage()}
      </Layout>
      {isArtistPickerOpen && (
        <div style={overlayStyle}>
          <div style={backdropStyle} onClick={() => setIsArtistPickerOpen(false)} />
          <GlassCard padding="24px" style={pickerCardStyle}>
            <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 16 }}>アーティストを選択</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
              {artists.map(a => (
                <MenuButton
                  key={a.id}
                  label={a.name}
                  onClick={() => { navigateToConcertEditor(a.id); setIsArtistPickerOpen(false); }}
                />
              ))}
            </div>
            <MenuButton label="閉じる" onClick={() => setIsArtistPickerOpen(false)} style={{ marginTop: 16 }} />
          </GlassCard>
        </div>
      )}
      {isHomeAddMenuOpen && (
        <div style={overlayStyle}>
          <div style={backdropStyle} onClick={() => setIsHomeAddMenuOpen(false)} />
          <GlassCard padding="24px" style={pickerCardStyle}>
            <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 16 }}>追加する内容</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <MenuButton
                label="アーティスト（音楽）"
                onClick={() => { navigateToArtistEditor(); setIsHomeAddMenuOpen(false); }}
              />
              <MenuButton
                label="展覧"
                onClick={() => { addNewExhibition(); setIsHomeAddMenuOpen(false); }}
              />
              <MenuButton
                label="映画"
                onClick={() => { addNewMovie(); setIsHomeAddMenuOpen(false); }}
              />
              <MenuButton
                label="アニメ"
                onClick={() => { addNewAnime(); setIsHomeAddMenuOpen(false); }}
              />
              <MenuButton
                label="ガチャ"
                onClick={() => { addNewGacha(); setIsHomeAddMenuOpen(false); }}
              />
            </div>
            <MenuButton label="閉じる" onClick={() => setIsHomeAddMenuOpen(false)} style={{ marginTop: 16 }} />
          </GlassCard>
        </div>
      )}
    </div>
  );
}

const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' };
const backdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' };
const pickerCardStyle: React.CSSProperties = { width: '100%', maxWidth: '360px', position: 'relative' };
