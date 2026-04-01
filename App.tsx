
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { normalizeArtistData, normalizeExhibitionData, normalizeMovieData } from './utils/data';
import { safeSave, safeGet } from './utils/storage';
import { PageId, Artist, Tour, DisplaySettings, Status, GlobalSettings, SiteLink, TrackingStatus, TrackingErrorType, Concert, Exhibition, Movie } from './domain/types';
import { Layout } from './components/Layout';
import { ArtistListPage } from './pages/ArtistListPage';
import { ConcertListPage } from './pages/ConcertListPage';
import { CalendarPage } from './pages/CalendarPage';
import { ArtistDetailPage } from './pages/ArtistDetailPage';
import { ConcertHomePage } from './pages/ConcertHomePage';
import { ArtistEditorPage } from './pages/ArtistEditorPage';
import { ConcertEditorPage } from './pages/ConcertEditorPage';
import { ContentPage } from './pages/ContentPage';
import { StatusPage } from './pages/StatusPage';
import { ExhibitionDetailPage } from './pages/ExhibitionDetailPage';
import { MovieDetailPage } from './pages/MovieDetailPage';
import { GlassCard } from './ui/GlassCard';
import { theme } from './ui/theme';
import { shouldTriggerAutoTrack, getTrackTargetConcerts, getDueAction, autoAdvanceConcertStatus, prepareFullDataForExport, migrateAlbumImagesToIndexedDB, migrateExhibitionImagesToIndexedDB } from './domain/logic';
import dayjs from 'dayjs';

type NavContext = { 
  path: PageId; 
  artistId?: string; 
  tourId?: string; 
  concertId?: string; 
  exhibitionId?: string; 
  movieId?: string;
  from?: PageId;
  edit?: boolean; // Navigation flag to start in edit mode
};

const STORAGE_KEYS = {
  ARTISTS: 'livetrack_jp_artists',
  EXHIBITIONS: 'livetrack_jp_exhibitions',
  MOVIES: 'livetrack_jp_movies',
  GLOBAL_SETTINGS: 'livetrack_jp_global_settings',
  DISPLAY_SETTINGS: 'livetrack_jp_display_settings',
  ARTIST_SORT: 'livetrack_jp_artist_sort',
  CONCERT_SORT: 'livetrack_jp_concert_sort'
};

const normalizeUrl = (raw: string): string => {
  const v = (raw || '').trim();
  if (!v) return '';
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  return `https://${v}`;
};

const fetchWithTimeout = async (url: string, timeoutMs: number) => {
  const controller = new AbortController();
  const t = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store', signal: controller.signal });
    return true;
  } finally {
    window.clearTimeout(t);
  }
};

export default function App() {
  const [nav, setNav] = useState<NavContext>({ path: 'CONTENT' });
  const [isArtistPickerOpen, setIsArtistPickerOpen] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const trackingLockRef = useRef(false);
  
  const [isArtistMenuOpen, setIsArtistMenuOpen] = useState(false);
  const [isConcertMenuOpen, setIsConcertMenuOpen] = useState(false);
  const [isCalendarMenuOpen, setIsCalendarMenuOpen] = useState(false);
  const [isExhibitionMenuOpen, setIsExhibitionMenuOpen] = useState(false);

  const [contentActiveTab, setContentActiveTab] = useState('artists');
  
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(() => {
    return safeGet<GlobalSettings>(STORAGE_KEYS.GLOBAL_SETTINGS, { autoTrackIntervalDays: 7 });
  });

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

  useEffect(() => { safeSave(STORAGE_KEYS.ARTISTS, artists); }, [artists]);
  useEffect(() => { safeSave(STORAGE_KEYS.EXHIBITIONS, exhibitions); }, [exhibitions]);
  useEffect(() => { safeSave(STORAGE_KEYS.MOVIES, movies); }, [movies]);
  useEffect(() => { safeSave(STORAGE_KEYS.GLOBAL_SETTINGS, globalSettings); }, [globalSettings]);
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

  const runTrackingAll = useCallback(async (reason: 'manual' | 'auto' = 'manual') => {
    if (trackingLockRef.current) return;
    trackingLockRef.current = true;
    setIsTracking(true);
    const now = new Date();
    const nowIso = now.toISOString();

    try {
      const snapshot = artists;
      const targets: Array<{ artistId: string; linkIndex: number; url: string }> = [];

      snapshot.forEach((artist) => {
        (artist.links || []).forEach((link, idx) => {
          if (!link?.autoTrack) return;
          if (reason === 'auto' && !shouldTriggerAutoTrack(link.lastCheckedAt, globalSettings, now)) return;
          const url = normalizeUrl(link.url);
          if (url) targets.push({ artistId: artist.id, linkIndex: idx, url });
        });
      });

      if (targets.length === 0) return;

      const results = new Map<string, { ok: boolean; error?: TrackingErrorType }>();
      for (const t of targets) {
        const key = `${t.artistId}::${t.linkIndex}`;
        try {
          const ok = await fetchWithTimeout(t.url, 12000);
          results.set(key, { ok });
        } catch (e) {
          results.set(key, { ok: false, error: '接続できませんでした' });
        }
      }

      setArtists((prev) =>
        prev.map((artist) => {
          const nextLinks = (artist.links || []).map((link, idx) => {
            const key = `${artist.id}::${idx}`;
            if (!results.has(key)) return link;
            const r = results.get(key)!;
            const next: SiteLink = {
              ...link,
              lastCheckedAt: nowIso,
              trackingStatus: (r.ok ? 'success' : 'failed') as TrackingStatus,
              errorMessage: r.ok ? undefined : (r.error || '情報を取得できませんでした'),
            };
            if (r.ok) next.lastSuccessAt = nowIso;
            return next;
          });
          return { ...artist, links: nextLinks };
        })
      );
    } finally {
      setIsTracking(false);
      trackingLockRef.current = false;
    }
  }, [artists, globalSettings]);

  useEffect(() => {
    const timer = window.setInterval(() => runTrackingAll('auto'), 60 * 1000);
    return () => window.clearInterval(timer);
  }, [runTrackingAll]);

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
    runTrackingAll('manual');
  }, [runAutoAdvance, runTrackingAll]);

  useEffect(() => { runAutoAdvance(); }, [nav.path, runAutoAdvance]);

  // Unified Export Logic
  const handleExportAll = async () => {
    try {
      const fullData = await prepareFullDataForExport(artists, exhibitions, movies);
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
      window.alert('エクスポートに失敗しました。');
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

    // Guard: if payload shape is not recognized, do nothing but surface a clear message.
    if (!artistsRaw && !exhibitionsRaw && !moviesRaw) {
      window.alert('インポートに失敗しました：データ形式が不正です（artists / exhibitions / movies が見つかりません）。');
      return;
    }

    // Helpful guard: if the user accidentally picked an empty backup, make it obvious.
    const artistCount = Array.isArray(artistsRaw) ? artistsRaw.length : 0;
    const exhibitionCount = Array.isArray(exhibitionsRaw) ? exhibitionsRaw.length : 0;
    const movieCount = Array.isArray(moviesRaw) ? moviesRaw.length : 0;
    if (artistCount === 0 && exhibitionCount === 0 && movieCount === 0) {
      const ok = window.confirm('このバックアップには artists / exhibitions / movies が 0 件です。\nこのまま上書きインポートしますか？');
      if (!ok) return;
    }

    if (artistsRaw) setArtists((artistsRaw || []).map(normalizeArtistData));
    if (exhibitionsRaw) setExhibitions((exhibitionsRaw || []).map(normalizeExhibitionData));
    if (moviesRaw) setMovies((moviesRaw || []).map(normalizeMovieData));

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

  const navigateToExhibitionDetail = (exhibitionId: string, edit?: boolean) => setNav({ path: 'EXHIBITION_DETAIL', exhibitionId, edit });
  const navigateToMovieDetail = (movieId: string, edit?: boolean) => setNav({ path: 'MOVIE_DETAIL', movieId, edit, from: 'CONTENT' });

  const addNewExhibition = () => {
    const newEx: Exhibition = {
      id: Math.random().toString(36).substr(2, 9),
      title: '新規展覧会',
      startDate: dayjs().format('YYYY-MM-DD'),
      endDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
      status: 'NONE',
      ticketSalesStatus: 'none',
      holidaySameAsWeekday: true,
      holidayPriceSameAsWeekday: true,
      needsReservation: false,
      imageIds: []
    };
    setExhibitions(prev => [...prev, newEx]);
    navigateToExhibitionDetail(newEx.id, true);
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
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setMovies(prev => [...prev, newMovie]);
    setContentActiveTab('movies');
    navigateToMovieDetail(newMovie.id, true);
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

  const handleAcknowledgeArtistTracking = useCallback((artistId: string) => {
    const nowIso = new Date().toISOString();
    setArtists(prev => (prev || []).map(artist => {
      if (artist.id !== artistId) return artist;
      return {
        ...artist,
        links: (artist.links || []).map(link => ({
          ...link,
          acknowledgedAt: link.lastHitAt ? nowIso : link.acknowledgedAt
        }))
      };
    }));
  }, []);

  const handleClearAllTrackingNotices = useCallback(() => {
    const nowIso = new Date().toISOString();
    setArtists(prev => (prev || []).map(artist => ({
      ...artist,
      links: (artist.links || []).map(link => ({
        ...link,
        acknowledgedAt: link.lastHitAt ? nowIso : link.acknowledgedAt
      }))
    })));
  }, []);

  const handlePlusClick = useCallback(() => {
    if (nav.path !== 'CONTENT') return;
    if (contentActiveTab === 'artists') {
      navigateToArtistEditor();
    } else if (contentActiveTab === 'concerts') {
      setIsArtistPickerOpen(true);
    } else if (contentActiveTab === 'exhibitions') {
      addNewExhibition();
    } else if (contentActiveTab === 'movies') {
      addNewMovie();
    }
  }, [nav.path, contentActiveTab]);

  const renderPage = () => {
    switch (nav.path) {
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
            globalSettings={globalSettings} 
            onUpdateGlobalSettings={setGlobalSettings}
            artistSortMode={artistSortMode}
            onSetArtistSort={setArtistSortMode}
            onUpdateOrder={(newList) => setArtists(newList.map((a, i) => ({ ...a, order: i })))}
            onAcknowledgeArtistTracking={handleAcknowledgeArtistTracking}
            onClearAllTrackingNotices={handleClearAllTrackingNotices}
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
            onOpenMovieDetail={navigateToMovieDetail}
            onAddNewMovie={addNewMovie}
            onUpdateMovies={setMovies}
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
            onOpenConcert={(aid, tid, cid) => navigateToConcertHome(aid, tid, cid, 'STATUS')}
            onOpenConcertEditor={(aid, tid) => navigateToConcertEditor(aid, tid)}
            onUpdateConcert={updateConcert}
            onOpenExhibitionDetail={navigateToExhibitionDetail}
            onUpdateExhibitionStatus={(id, updates) => {
              setExhibitions(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
            }}
            onOpenMovieDetail={navigateToMovieDetail}
            onUpdateMovieStatus={(id, updates) => {
              setMovies(prev => prev.map(m => m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m));
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
          />
        );
      }

      case 'MOVIE_DETAIL': {
        const movie = movies.find(m => m.id === nav.movieId);
        if (!movie) return null;
        return (
          <MovieDetailPage
            movie={movie}
            onUpdateMovie={(updated) => {
              setMovies(prev => prev.map(m => m.id === updated.id ? normalizeMovieData(updated) : m));
            }}
            onDeleteMovie={(id) => {
              setMovies(prev => prev.filter(m => m.id !== id));
              setNav({ path: 'CONTENT' });
              setContentActiveTab('movies');
            }}
            onBack={() => {
              setNav({ path: 'CONTENT' });
              setContentActiveTab('movies');
            }}
            initialEditMode={!!nav.edit}
          />
        );
      }

      case 'CALENDAR': 
        return (
          <CalendarPage 
            artists={artists} 
            exhibitions={exhibitions}
            movies={movies}
            onOpenArtist={(id) => navigateToArtistDetail(id, 'CALENDAR')} 
            onOpenConcert={(aid, tid, cid) => navigateToConcertHome(aid, tid, cid, 'CALENDAR')} 
            onOpenExhibition={(id) => navigateToExhibitionDetail(id)}
            onOpenMovie={(id) => navigateToMovieDetail(id)}
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
            onBack={() => navigateToArtistDetail(artist.id, nav.from)} 
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
        onPlusClick={nav.path === 'CONTENT' ? handlePlusClick : undefined}
        hasConcertAlert={hasGlobalConcertAlert}
      >
        {renderPage()}
      </Layout>
      {isArtistPickerOpen && (
        <div style={overlayStyle}>
          <div style={backdropStyle} onClick={() => setIsArtistPickerOpen(false)} />
          <GlassCard padding="24px" style={pickerCardStyle}>
            <h3>アーティストを選択</h3>
            <div style={pickerListStyle}>
              {artists.map(a => (
                <button 
                  key={a.id} 
                  type="button"
                  onClick={() => { navigateToConcertEditor(a.id); setIsArtistPickerOpen(false); }} 
                  style={pickerButtonStyle}
                >
                  {a.name}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setIsArtistPickerOpen(false)} style={closeButtonStyle}>閉じる</button>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' };
const backdropStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' };
const pickerCardStyle: React.CSSProperties = { width: '100%', maxWidth: '360px', position: 'relative' };
const pickerListStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' };
const pickerButtonStyle: React.CSSProperties = { padding: '16px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)', background: 'white', textAlign: 'left', fontWeight: '700', fontSize: '15px', cursor: 'pointer' };
const closeButtonStyle: React.CSSProperties = { padding: '12px', borderRadius: '12px', border: 'none', background: 'rgba(0,0,0,0.05)', fontWeight: '700', cursor: 'pointer', marginTop: '16px', width: '100%' };
