import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { PageId, Artist, Tour, DisplaySettings, Status, GlobalSettings, SiteLink, TrackingStatus, TrackingErrorType, Concert } from './domain/types';
import { Layout } from './components/Layout';
import { ArtistListPage } from './pages/ArtistListPage';
import { ConcertListPage } from './pages/ConcertListPage';
import { CalendarPage } from './pages/CalendarPage';
import { ArtistDetailPage } from './pages/ArtistDetailPage';
import { ConcertHomePage } from './pages/ConcertHomePage';
import { ArtistEditorPage } from './pages/ArtistEditorPage';
import { ConcertEditorPage } from './pages/ConcertEditorPage';
import { GlassCard } from './ui/GlassCard';
import { theme } from './ui/theme';
import { shouldTriggerAutoTrack, getTrackTargetConcerts, getDueAction, autoAdvanceConcertStatus } from './domain/logic';

type NavContext = { 
  path: PageId; 
  artistId?: string; 
  tourId?: string; 
  concertId?: string; 
  from?: PageId;
};

const STORAGE_KEYS = {
  ARTISTS: 'livetrack_jp_artists',
  GLOBAL_SETTINGS: 'livetrack_jp_global_settings',
  DISPLAY_SETTINGS: 'livetrack_jp_display_settings',
  ARTIST_SORT: 'livetrack_jp_artist_sort',
  CONCERT_SORT: 'livetrack_jp_concert_sort'
};

/**
 * Robust Persistence Wrapper
 */
const safeSave = (key: string, data: any) => {
  try {
    // Basic Sanitation: Remove potential circular refs or functions
    const serialized = JSON.stringify(data);
    
    // Quota Awareness: LocalStorage on mobile is usually ~5MB.
    // If saving Artists, check if we're ballooning due to Base64
    if (key === STORAGE_KEYS.ARTISTS && serialized.length > 4 * 1024 * 1024) {
      console.warn("Storage warning: Data size is large. Images might be causing issues.");
    }
    
    localStorage.setItem(key, serialized);
  } catch (err: any) {
    console.error(`Persistence Error for key [${key}]:`, err);
    
    let userMsg = "データの保存に失敗しました。";
    if (err.name === 'QuotaExceededError' || err.code === 22) {
      userMsg += "\nストレージ容量が不足しています。アルバムの画像を削除するか、URLでの指定に切り替えてください。";
    } else if (err instanceof TypeError) {
      userMsg += "\nデータの形式に問題があります。";
    } else {
      userMsg += `\nエラー: ${err.message || "不明な理由"}`;
    }
    
    // UI Feedback is mandatory per requirement
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
    // NOTE: no-cors makes the response opaque, but it still tells us "reachable vs network error".
    await fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store', signal: controller.signal });
    return true;
  } finally {
    window.clearTimeout(t);
  }
};

export default function App() {
  const [nav, setNav] = useState<NavContext>({ path: 'ARTIST_LIST' });
  const [isArtistPickerOpen, setIsArtistPickerOpen] = useState(false);
  
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


  const trackingLockRef = useRef(false);
  const [isTracking, setIsTracking] = useState(false);

  // Effect-based persistence with error handling
  useEffect(() => {
    safeSave(STORAGE_KEYS.ARTISTS, artists);
  }, [artists]);

  useEffect(() => {
    safeSave(STORAGE_KEYS.GLOBAL_SETTINGS, globalSettings);
  }, [globalSettings]);

  useEffect(() => {
    safeSave(STORAGE_KEYS.DISPLAY_SETTINGS, displaySettings);
  }, [displaySettings]);

  useEffect(() => {
    safeSave(STORAGE_KEYS.ARTIST_SORT, artistSortMode);
  }, [artistSortMode]);

  useEffect(() => {
    safeSave(STORAGE_KEYS.CONCERT_SORT, concertSortMode);
  }, [concertSortMode]);

  const hasGlobalConcertAlert = useMemo(() => {
    const now = new Date();
    return artists.some(a => a.tours.some(t => t.concerts.some(c => !!getDueAction(c, now))));
  }, [artists]);

  // Modified runTrackingAll to respect trackCapability
  const runTrackingAll = useCallback(async (reason: 'manual' | 'auto' = 'manual') => {
    if (trackingLockRef.current) return;
    trackingLockRef.current = true;
    setIsTracking(true);

    const now = new Date();
    const nowIso = now.toISOString();

    try {
      const snapshot = artists;
      const targets: Array<{ artistId: string; linkIndex: number; url: string }> = [];
      // Set to track links that should be skipped silently (unsupported)
      const silentSkipped = new Set<string>(); // Format: "artistId::linkIndex"

      snapshot.forEach((artist) => {
        (artist.links || []).forEach((link, idx) => {
          if (!link?.autoTrack) return;
          if (reason === 'auto' && !shouldTriggerAutoTrack(link.lastCheckedAt, globalSettings, now)) return;
          
          // --- NEW LOGIC: Silent Skip for Unsupported URLs ---
          if (link.trackCapability === 'unsupported') {
            console.log(`[LiveTrack] Silent skip for unsupported URL: ${link.url}`);
            silentSkipped.add(`${artist.id}::${idx}`);
            return;
          }
          // ---------------------------------------------------

          const url = normalizeUrl(link.url);
          if (!url) return;
          targets.push({ artistId: artist.id, linkIndex: idx, url });
        });
      });

      // Prepare results map
      const results = new Map<string, { ok: boolean; error?: TrackingErrorType }>();

      if (targets.length > 0) {
        console.log(`[LiveTrack] Tracking started (${reason}). targets=`, targets.length);
        for (const t of targets) {
          const key = `${t.artistId}::${t.linkIndex}`;
          try {
            const ok = await fetchWithTimeout(t.url, 12000);
            results.set(key, { ok });
          } catch (e: any) {
            results.set(key, { ok: false, error: '接続できませんでした' });
          }
        }
      }

      setArtists((prev) =>
        prev.map((artist) => {
          const nextLinks = (artist.links || []).map((link, idx) => {
            const key = `${artist.id}::${idx}`;
            
            // Case 1: Real Fetch Result
            if (results.has(key)) {
              const r = results.get(key)!;
              const next: SiteLink = {
                ...link,
                lastCheckedAt: nowIso,
                trackingStatus: (r.ok ? 'success' : 'failed') as TrackingStatus,
                errorMessage: r.ok ? undefined : (r.error || '情報を取得できませんでした'),
              };
              if (r.ok) next.lastSuccessAt = nowIso;
              return next;
            }

            // Case 2: Silent Skip (Unsupported)
            if (silentSkipped.has(key)) {
              return {
                ...link,
                lastCheckedAt: nowIso,
                trackingStatus: 'success', // 1. 强制设为成功，消除红色感叹号
                errorMessage: undefined,   // 2. 彻底清除旧的报错文字
                lastSuccessAt: nowIso      // 3. 更新最后成功时间，让状态看起来是健康的
              };
            }

            return link;
          });
          return { ...artist, links: nextLinks };
        })
      );

      console.log(`[LiveTrack] Tracking finished. updated=${results.size + silentSkipped.size}`);
    } finally {
      setIsTracking(false);
      trackingLockRef.current = false;
    }
  }, [artists, globalSettings]);

  // Auto tracking: check once per minute and only run when due.
  useEffect(() => {
    const timer = window.setInterval(() => {
      runTrackingAll('auto');
    }, 60 * 1000);
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

  useEffect(() => {
    runAutoAdvance();
  }, [nav.path, runAutoAdvance]);

  const navigateToArtistList = () => setNav({ path: 'ARTIST_LIST' });
  const navigateToArtistDetail = (artistId: string, from?: PageId) => setNav({ path: 'ARTIST_DETAIL', artistId, from });
  const navigateToArtistEditor = (artistId?: string) => setNav({ path: 'ARTIST_EDITOR', artistId });
  const navigateToConcertEditor = (artistId: string, tourId?: string) => setNav({ path: 'CONCERT_EDITOR', artistId, tourId });
  const navigateToConcertHome = (artistId: string, tourId: string, concertId: string, from?: PageId) => setNav({ path: 'CONCERT_HOME', artistId, tourId, concertId, from });

  const upsertArtist = (updated: Artist) => {
    setArtists(prev => {
      const exists = prev.some(a => a.id === updated.id);
      return exists ? prev.map(a => a.id === updated.id ? updated : a) : [...prev, updated];
    });
    navigateToArtistDetail(updated.id, nav.from);
  };

  const handleUpdateArtistOrder = (newArtists: Artist[]) => {
    setArtists(newArtists.map((a, i) => ({ ...a, order: i })));
  };

  const updateConcert = (artistId: string, tourId: string, concertId: string, updates: Partial<Concert>) => {
    setArtists(prev => prev.map(a => {
      if (a.id !== artistId) return a;
      return {
        ...a,
        tours: a.tours.map(t => {
          if (t.id !== tourId) return t;
          return {
            ...t,
            concerts: t.concerts.map(c => c.id === concertId ? { ...c, ...updates } : c)
          };
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

  const deleteTour = (artistId: string, tourId: string) => {
    setArtists(prev => prev.map(artist => artist.id !== artistId ? artist : { ...artist, tours: artist.tours.filter(t => t.id !== tourId) }));
    navigateToArtistDetail(artistId, nav.from);
  };

  /**
   * Handlers for Tracking Notices
   */
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

  const renderPage = () => {
    switch (nav.path) {
      case 'ARTIST_LIST': 
        return (
          <ArtistListPage 
            artists={artists} 
            onOpenArtist={(id) => navigateToArtistDetail(id, 'ARTIST_LIST')} 
            onOpenArtistEditor={() => navigateToArtistEditor()} 
            onRefreshAll={handleRefreshAll} 
            onImportData={setArtists} 
            globalSettings={globalSettings} 
            onUpdateGlobalSettings={setGlobalSettings}
            sortMode={artistSortMode}
            onSetSort={setArtistSortMode}
            onUpdateOrder={handleUpdateArtistOrder}
            onAcknowledgeArtistTracking={handleAcknowledgeArtistTracking}
            onClearAllTrackingNotices={handleClearAllTrackingNotices}
          />
        );
      case 'CONCERT_LIST': 
        return (
          <ConcertListPage 
            artists={artists} 
            onOpenArtist={(id) => navigateToArtistDetail(id, 'CONCERT_LIST')} 
            onOpenConcert={(aid, tid, cid) => navigateToConcertHome(aid, tid, cid, 'CONCERT_LIST')} 
            onCreateConcert={() => setIsArtistPickerOpen(true)} 
            onRefreshAll={handleRefreshAll} 
            onUpdateConcert={updateConcert} 
            sortMode={concertSortMode}
            onSetSort={setConcertSortMode}
          />
        );
      case 'CALENDAR': 
        return (
          <CalendarPage 
            artists={artists} 
            onOpenArtist={(id) => navigateToArtistDetail(id, 'CALENDAR')} 
            onOpenConcert={(aid, tid, cid) => navigateToConcertHome(aid, tid, cid, 'CALENDAR')} 
            onRefreshAll={handleRefreshAll} 
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
              if (nav.from === 'CONCERT_LIST') setNav({ path: 'CONCERT_LIST' });
              else if (nav.from === 'CALENDAR') setNav({ path: 'CALENDAR' });
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
            onUpdateConcertAlbum={(aid, tid, cid, imgs) => updateConcert(aid, tid, cid, { images: imgs })} 
          />
        );
      }
      case 'ARTIST_EDITOR': return (
        <ArtistEditorPage 
          artistId={nav.artistId} 
          artist={artists.find(a => a.id === nav.artistId)} 
          onSave={upsertArtist} 
          onCancel={() => {
            if (nav.artistId) {
              navigateToArtistDetail(nav.artistId, nav.from);
            } else {
              navigateToArtistList();
            }
          }} 
          onDeleteArtist={id => { 
            setArtists(p => p.filter(a => a.id !== id)); 
            navigateToArtistList(); 
          }} 
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
            onDeleteTour={deleteTour} 
          />
        );
      }
      default: return null;
    }
  };

  return (
    <div className="app-root">
      <Layout currentPath={nav.path} onNavigate={p => setNav({ path: p })} hasConcertAlert={hasGlobalConcertAlert}>
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