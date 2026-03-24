
import React from 'react';
import { ArtistListPage } from './ArtistListPage';
import { ConcertListPage } from './ConcertListPage';
import { Artist, GlobalSettings, Concert } from '../domain/types';
import { theme } from '../ui/theme';
import { TopCapsuleNav } from '../components/TopCapsuleNav';

interface MusicPageProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  // Artist Props
  artists: Artist[];
  onOpenArtist: (artistId: string) => void;
  onOpenArtistEditor: () => void;
  onRefreshAll: () => void;
  onImportData: (data: Artist[]) => void;
  globalSettings: GlobalSettings;
  onUpdateGlobalSettings: (settings: GlobalSettings) => void;
  artistSortMode: 'manual' | 'status';
  onSetArtistSort: (mode: 'manual' | 'status') => void;
  onUpdateOrder: (newArtists: Artist[]) => void;
  onAcknowledgeArtistTracking: (artistId: string) => void;
  onClearAllTrackingNotices: () => void;
  isArtistMenuOpen: boolean;
  onArtistMenuClose: () => void;
  
  // Concert Props
  onOpenConcert: (artistId: string, tourId: string, concertId: string) => void;
  onCreateConcert: () => void;
  onUpdateConcert: (artistId: string, tourId: string, concertId: string, updates: Partial<Concert>) => void;
  concertSortMode: 'status' | 'lottery';
  onSetSort: (mode: 'status' | 'lottery') => void;
  isConcertMenuOpen: boolean;
  onConcertMenuClose: () => void;

  // Fix: Added missing onExport prop to fix assignability error in App.tsx
  onExport: () => void;
}

export const MusicPage: React.FC<MusicPageProps> = (props) => {
  return (
    <div style={{ 
      position: 'relative',
      paddingTop: 'calc(12px + env(safe-area-inset-top) + 44px + 16px)' 
    }}>
      <TopCapsuleNav 
        activeTab={props.activeTab}
        onTabChange={props.onTabChange}
        onRefresh={props.onRefreshAll}
      />
      
      <div className="music-content-area">
        {props.activeTab === 'artists' ? (
          <ArtistListPage 
            artists={props.artists}
            onOpenArtist={props.onOpenArtist}
            onOpenArtistEditor={props.onOpenArtistEditor}
            onRefreshAll={props.onRefreshAll}
            onImportData={props.onImportData}
            globalSettings={props.globalSettings}
            onUpdateGlobalSettings={props.onUpdateGlobalSettings}
            sortMode={props.artistSortMode}
            onSetSort={props.onSetArtistSort}
            onUpdateOrder={props.onUpdateOrder}
            onAcknowledgeArtistTracking={props.onAcknowledgeArtistTracking}
            onClearAllTrackingNotices={props.onClearAllTrackingNotices}
            isMenuOpenExternally={props.isArtistMenuOpen}
            onMenuClose={props.onArtistMenuClose}
            hideHeader={true}
            // Pass the unified onExport down to the list page
            onExport={props.onExport}
          />
        ) : (
          <ConcertListPage 
            artists={props.artists}
            onOpenArtist={props.onOpenArtist}
            onOpenConcert={props.onOpenConcert}
            onCreateConcert={props.onCreateConcert}
            onRefreshAll={props.onRefreshAll}
            onUpdateConcert={props.onUpdateConcert}
            sortMode={props.concertSortMode}
            onSetSort={props.onSetSort}
            isMenuOpenExternally={props.isConcertMenuOpen}
            onMenuClose={props.onConcertMenuClose}
            hideHeader={true}
          />
        )}
      </div>
    </div>
  );
};
