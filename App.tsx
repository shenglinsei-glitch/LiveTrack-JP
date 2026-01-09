
import React, { useState, useMemo, useCallback, useEffect } from 'react';
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

type NavContext = { path: PageId; artistId?: string; tourId?: string; concertId?: string; };

export default function App() {
  const [nav, setNav] = useState<NavContext>({ path: 'ARTIST_LIST' });
  const [isArtistPickerOpen, setIsArtistPickerOpen] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({ autoTrackIntervalDays: 7 });
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({ showAttended: true, showSkipped: true });

  // Persistence: Elevated sort modes
  const [artistSortMode, setArtistSortMode] = useState<'manual' | 'status'>('status');
  const [concertSortMode, setConcertSortMode] = useState<'status' | 'lottery'>('status');

  const [artists, setArtists] = useState<Artist[]>([]);

  // Requirement: Global Alert calculation for Nav Red Dot
  const hasGlobalConcertAlert = useMemo(() => {
    const now = new Date();
    return artists.some(a => a.tours.some(t => t.concerts.some(c => !!getDueAction(c, now))));
  }, [artists]);

  // Requirement 6: Automatic advancement runner
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

  useEffect(() => {
    runAutoAdvance();
  }, [nav.path, runAutoAdvance]); // Run when switching pages

  const navigateToArtistList = () => setNav({ path: 'ARTIST_LIST' });
  const navigateToArtistDetail = (artistId: string) => setNav({ path: 'ARTIST_DETAIL', artistId });
  const navigateToArtistEditor = (artistId?: string) => setNav({ path: 'ARTIST_EDITOR', artistId });
  const navigateToConcertEditor = (artistId: string, tourId?: string) => setNav({ path: 'CONCERT_EDITOR', artistId, tourId });
  const navigateToConcertHome = (artistId: string, tourId: string, concertId: string) => setNav({ path: 'CONCERT_HOME', artistId, tourId, concertId });

  const upsertArtist = (updated: Artist) => {
    setArtists(prev => {
      const exists = prev.some(a => a.id === updated.id);
      return exists ? prev.map(a => a.id === updated.id ? updated : a) : [...prev, updated];
    });
    navigateToArtistDetail(updated.id);
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
      return { ...artist, tours: tourExists ? artist.tours.map(t => t.id === updatedTour.id ? updatedTour : t) : [...artist.tours, updatedTour] };
    }));
    navigateToArtistDetail(artistId);
  };

  const deleteTour = (artistId: string, tourId: string) => {
    setArtists(prev => prev.map(artist => artist.id !== artistId ? artist : { ...artist, tours: artist.tours.filter(t => t.id !== tourId) }));
    navigateToArtistDetail(artistId);
  };

  const renderPage = () => {
    switch (nav.path) {
      case 'ARTIST_LIST': 
        return (
          <ArtistListPage 
            artists={artists} 
            onOpenArtist={navigateToArtistDetail} 
            onOpenArtistEditor={() => navigateToArtistEditor()} 
            onRefreshAll={runAutoAdvance} 
            onImportData={setArtists} 
            globalSettings={globalSettings} 
            onUpdateGlobalSettings={setGlobalSettings}
            sortMode={artistSortMode}
            onSetSort={setArtistSortMode}
            onUpdateOrder={handleUpdateArtistOrder}
          />
        );
      case 'CONCERT_LIST': 
        return (
          <ConcertListPage 
            artists={artists} 
            onOpenArtist={navigateToArtistDetail} 
            onOpenConcert={navigateToConcertHome} 
            onCreateConcert={() => setIsArtistPickerOpen(true)} 
            onRefreshAll={runAutoAdvance} 
            onUpdateConcert={updateConcert} 
            sortMode={concertSortMode}
            onSetSort={setConcertSortMode}
          />
        );
      case 'CALENDAR': 
        return <CalendarPage artists={artists} onOpenArtist={navigateToArtistDetail} onOpenConcert={navigateToConcertHome} onRefreshAll={runAutoAdvance} />;
      case 'ARTIST_DETAIL': {
        const artist = artists.find(a => a.id === nav.artistId);
        if (!artist) return null;
        return <ArtistDetailPage artistId={nav.artistId!} artist={artist} settings={displaySettings} onOpenArtistEditor={navigateToArtistEditor} onOpenConcertEditor={navigateToConcertEditor} onOpenConcertHome={navigateToConcertHome} onChangeSettings={s => setDisplaySettings(p => ({...p, ...s}))} onBack={navigateToArtistList} />;
      }
      case 'CONCERT_HOME': {
        const artist = artists.find(a => a.id === nav.artistId);
        const tour = artist?.tours.find(t => t.id === nav.tourId);
        const concert = tour?.concerts.find(c => c.id === nav.concertId);
        if (!artist || !tour || !concert) return null;
        return <ConcertHomePage artistId={artist.id} concertId={concert.id} artist={artist} tour={tour} concert={concert} onBack={() => navigateToArtistDetail(artist.id)} onOpenConcertEditor={navigateToConcertEditor} onUpdateConcertAlbum={(aid, tid, cid, imgs) => updateConcert(aid, tid, cid, { images: imgs })} />;
      }
      case 'ARTIST_EDITOR': return (
        <ArtistEditorPage 
          artistId={nav.artistId} 
          artist={artists.find(a => a.id === nav.artistId)} 
          onSave={upsertArtist} 
          onCancel={() => {
            if (nav.artistId) {
              navigateToArtistDetail(nav.artistId);
            } else {
              navigateToArtistList();
            }
          }} 
          onOpenConcertEditor={navigateToConcertEditor} 
          onDeleteArtist={id => { 
            setArtists(p => p.filter(a => a.id !== id)); 
            navigateToArtistList(); 
          }} 
        />
      );
      case 'CONCERT_EDITOR': {
        const artist = artists.find(a => a.id === nav.artistId);
        if (!artist) return null;
        return <ConcertEditorPage artistId={artist.id} tourId={nav.tourId} tour={artist.tours.find(t => t.id === nav.tourId)} allArtists={artists} onSave={t => upsertTour(artist.id, t)} onCancel={() => navigateToArtistDetail(artist.id)} onDeleteTour={deleteTour} />;
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
            <div style={pickerListStyle}>{artists.map(a => <button key={a.id} onClick={() => { navigateToConcertEditor(a.id); setIsArtistPickerOpen(false); }} style={pickerButtonStyle}>{a.name}</button>)}</div>
            <button onClick={() => setIsArtistPickerOpen(false)} style={closeButtonStyle}>閉じる</button>
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
