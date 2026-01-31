
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { PageId, Artist, Tour, DisplaySettings, Status, GlobalSettings, SiteLink, TrackingStatus, TrackingErrorType, Concert, Exhibition } from './domain/types';
import { Layout } from './components/Layout';
import { ArtistListPage } from './pages/ArtistListPage';
import { ConcertListPage } from './pages/ConcertListPage';
import { CalendarPage } from './pages/CalendarPage';
import { ArtistDetailPage } from './pages/ArtistDetailPage';
import { ConcertHomePage } from './pages/ConcertHomePage';
import { ArtistEditorPage } from './pages/ArtistEditorPage';
import { ConcertEditorPage } from './pages/ConcertEditorPage';
import { MusicPage } from './pages/MusicPage';
import { ExhibitionsPage } from './pages/ExhibitionsPage';
import { ExhibitionDetailPage } from './pages/ExhibitionDetailPage';
import { GlassCard } from './ui/GlassCard';
import { theme } from './ui/theme';
import { shouldTriggerAutoTrack, getTrackTargetConcerts, getDueAction, autoAdvanceConcertStatus, prepareFullDataForExport } from './domain/logic';
import dayjs from 'dayjs';

type NavContext = { 
  path: PageId; 
  artistId?: string; 
  tourId?: string; 
  concertId?: string; 
  exhibitionId?: string; 
  from?: PageId;
  edit?: boolean; // Navigation flag to start in edit mode
};

const STORAGE_KEYS = {
  ARTISTS: 'livetrack_jp_artists',
  EXHIBITIONS: 'livetrack_jp_exhibitions',
  GLOBAL_SETTINGS: 'livetrack_jp_global_settings',
  DISPLAY_SETTINGS: 'livetrack_jp_display_settings',
  ARTIST_SORT: 'livetrack_jp_artist_sort',
  CONCERT_SORT: 'livetrack_jp_concert_sort'
};

const safeSave = (key: string, data: any) => {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
  } catch (err: any) {
    console.error(`Persistence Error for key [${key}]:`, err);
    let userMsg = "データの保存に失敗しました。";
    if (err.name === 'QuotaExceededError' || err.code === 22) {
      userMsg += "\nストレージ容量が不足しています。";
    }
    window.alert(userMsg);
  }
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
  const [nav, setNav] = useState<NavContext>({ path: 'EXHIBITIONS' });
  const [isArtistPickerOpen, setIsArtistPickerOpen] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const trackingLockRef = useRef(false);
  
  const [isArtistMenuOpen, setIsArtistMenuOpen] = useState(false);
  const [isConcertMenuOpen, setIsConcertMenuOpen] = useState(false);
  const [isCalendarMenuOpen, setIsCalendarMenuOpen] = useState(false);
  const [isExhibitionMenuOpen, setIsExhibitionMenuOpen] = useState(false);

  const [musicActiveTab, setMusicActiveTab] = useState('artists');
  
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GLOBAL_SETTINGS);
      return saved ? JSON.parse(saved) : { autoTrackIntervalDays: 7 };
    } catch { return { autoTrackIntervalDays: 7 }; }
  });

  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DISPLAY_SETTINGS);
      return saved ? JSON.parse(saved) : { showAttended: true, showSkipped: true };
    } catch { return { showAttended: true, showSkipped: true }; }
  });

  const [artistSortMode, setArtistSortMode] = useState<'manual' | 'status'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ARTIST_SORT);
    return (saved as 'manual' | 'status') || 'status';
  });

  const [concertSortMode, setConcertSortMode] = useState<'status' | 'lottery'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CONCERT_SORT);
    return (saved as 'status' | 'lottery') || 'status';
  });

  const [artists, setArtists] = useState<Artist[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ARTISTS);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [exhibitions, setExhibitions] = useState<Exhibition[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXHIBITIONS);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => { safeSave(STORAGE_KEYS.ARTISTS, artists); }, [artists]);
  useEffect(() => { safeSave(STORAGE_KEYS.EXHIBITIONS, exhibitions); }, [exhibitions]);
  useEffect(() => { safeSave(STORAGE_KEYS.GLOBAL_SETTINGS, globalSettings); }, [globalSettings]);
  useEffect(() => { safeSave(STORAGE_KEYS.DISPLAY_SETTINGS, displaySettings); }, [displaySettings]);
  useEffect(() => { safeSave(STORAGE_KEYS.ARTIST_SORT, artistSortMode); }, [artistSortMode]);
  useEffect(() => { safeSave(STORAGE_KEYS.CONCERT_SORT, concertSortMode); }, [concertSortMode]);

  const hasGlobalConcertAlert = useMemo(() => {
    const now = new Date();
    return artists.some(a => a.tours.some(t => t.concerts.some(c => !!getDueAction(c, now))));
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
    setArtists(prev => prev.map(a => ({
      ...a,
      tours: a.tours.map(t => ({
        ...t,
        concerts: t.concerts.map(c => autoAdvanceConcertStatus(c, now))
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
      const fullData = await prepareFullDataForExport(artists, exhibitions);
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
    // Handle both old single-array format and new unified object format
    if (Array.isArray(importedData)) {
      setArtists(importedData);
    } else if (importedData && typeof importedData === 'object') {
      if (importedData.artists) setArtists(importedData.artists);
      if (importedData.exhibitions) setExhibitions(importedData.exhibitions);
    }
  };

  const navigateToArtistList = () => setNav({ path: 'MUSIC' });
  const navigateToArtistDetail = (artistId: string, from?: PageId) => setNav({ path: 'ARTIST_DETAIL', artistId, from });
  const navigateToArtistEditor = (artistId?: string) => setNav({ path: 'ARTIST_EDITOR', artistId });
  const navigateToConcertEditor = (artistId: string, tourId?: string) => setNav({ path: 'CONCERT_EDITOR', artistId, tourId });
  const navigateToConcertHome = (artistId: string, tourId: string, concertId: string, from?: PageId) => setNav({ path: 'CONCERT_HOME', artistId, tourId, concertId, from });
  
  const navigateToExhibitionDetail = (exhibitionId: string, edit?: boolean) => setNav({ path: 'EXHIBITION_DETAIL', exhibitionId, edit });

  const addNewExhibition = () => {
    const newEx: Exhibition = {
      id: Math.random().toString(36).substr(2, 9),
      title: '新規展覧会',
      startDate: dayjs().format('YYYY-MM-DD'),
      endDate: dayjs().add(1, 'month').format('YYYY-MM-DD'),
      exhibitionStatus: 'preparing',
      ticketSalesStatus: 'none',
      holidaySameAsWeekday: true,
      holidayPriceSameAsWeekday: true,
      needsReservation: false,
      imageIds: []
    };
    setExhibitions(prev => [...prev, newEx]);
    navigateToExhibitionDetail(newEx.id, true);
  };

  const upsertArtist = (updated: Artist) => {
    setArtists(prev => {
      const exists = prev.some(a => a.id === updated.id);
      return exists ? prev.map(a => a.id === updated.id ? updated : a) : [...prev, updated];
    });
    navigateToArtistDetail(updated.id, nav.from);
  };

  const updateConcert = (artistId: string, tourId: string, concertId: string, updates: Partial<Concert>) => {
    setArtists(prev => prev.map(a => {
      if (a.id !== artistId) return a;
      return {
        ...a,
        tours: a.tours.map(t => {
          if (t.id !== tourId) return t;
          return { ...t, concerts: t.concerts.map(c => c.id === concertId ? { ...c, ...updates } : c) };
        })
      };
    }));
  };

  const upsertTour = (artistId: string, updatedTour: Tour) => {
    setArtists(prev => prev.map(artist => {
      if (artist.id !== artistId) return artist;
      const tourExists = artist.tours.some(t => t.id === updatedTour.id);
      return { 
        ...artist, 
        tours: tourExists ? artist.tours.map(t => t.id === updatedTour.id ? updatedTour : t) : [...artist.tours, updatedTour] 
      };
    }));
    navigateToArtistDetail(artistId, nav.from);
  };

  const handleAcknowledgeArtistTracking = useCallback((artistId: string) => {
    const nowIso = new Date().toISOString();
    setArtists(prev => prev.map(artist => {
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
    setArtists(prev => prev.map(artist => ({
      ...artist,
      links: (artist.links || []).map(link => ({
        ...link,
        acknowledgedAt: link.lastHitAt ? nowIso : link.acknowledgedAt
      }))
    })));
  }, []);

  const handlePlusClick = useCallback(() => {
    if (nav.path === 'EXHIBITIONS') {
      setIsExhibitionMenuOpen(true);
    } else if (nav.path === 'MUSIC') {
      if (musicActiveTab === 'artists') {
        setIsArtistMenuOpen(true);
      } else {
        setIsConcertMenuOpen(true);
      }
    } else if (nav.path === 'CALENDAR') {
      setIsCalendarMenuOpen(true);
    }
  }, [nav.path, musicActiveTab]);

  const renderPage = () => {
    switch (nav.path) {
      case 'EXHIBITIONS':
        return (
          <ExhibitionsPage 
            exhibitions={exhibitions}
            onUpdateExhibitions={setExhibitions}
            onOpenDetail={navigateToExhibitionDetail}
            isMenuOpenExternally={isExhibitionMenuOpen}
            onMenuClose={() => setIsExhibitionMenuOpen(false)}
            onAddNew={addNewExhibition}
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
              setNav({ path: 'EXHIBITIONS' });
            }}
            onBack={() => setNav({ path: 'EXHIBITIONS' })}
            initialEditMode={nav.edit}
          />
        );
      }
      case 'MUSIC':
        return (
          <MusicPage 
            activeTab={musicActiveTab}
            onTabChange={setMusicActiveTab}
            artists={artists} 
            onOpenArtist={(id) => navigateToArtistDetail(id, 'MUSIC')} 
            onOpenArtistEditor={() => navigateToArtistEditor()} 
            onRefreshAll={handleRefreshAll} 
            onImportData={handleImportAll} // Updated to unified
            globalSettings={globalSettings} 
            onUpdateGlobalSettings={setGlobalSettings}
            artistSortMode={artistSortMode}
            onSetArtistSort={setArtistSortMode}
            onUpdateOrder={(newList) => setArtists(newList.map((a, i) => ({ ...a, order: i })))}
            onAcknowledgeArtistTracking={handleAcknowledgeArtistTracking}
            onClearAllTrackingNotices={handleClearAllTrackingNotices}
            onOpenConcert={(aid, tid, cid) => navigateToConcertHome(aid, tid, cid, 'MUSIC')} 
            onCreateConcert={() => setIsArtistPickerOpen(true)} 
            onUpdateConcert={updateConcert} 
            concertSortMode={concertSortMode}
            onSetSort={setConcertSortMode}
            isArtistMenuOpen={isArtistMenuOpen}
            onArtistMenuClose={() => setIsArtistMenuOpen(false)}
            isConcertMenuOpen={isConcertMenuOpen}
            onConcertMenuClose={() => setIsConcertMenuOpen(false)}
            onExport={handleExportAll} // Pass unified export
          />
        );
      case 'CALENDAR': 
        return (
          <CalendarPage 
            artists={artists} 
            exhibitions={exhibitions}
            onOpenArtist={(id) => navigateToArtistDetail(id, 'CALENDAR')} 
            onOpenConcert={(aid, tid, cid) => navigateToConcertHome(aid, tid, cid, 'CALENDAR')} 
            onOpenExhibition={(id) => navigateToExhibitionDetail(id)}
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
        onPlusClick={handlePlusClick}
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
