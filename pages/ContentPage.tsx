
import React, { useState } from 'react';
import { ArtistListPage } from './ArtistListPage';
import { ConcertListPage } from './ConcertListPage';
import { ExhibitionsPage } from './ExhibitionsPage';
import { Artist, GlobalSettings, Concert, Exhibition } from '../domain/types';
import { TopCapsuleNav } from '../components/TopCapsuleNav';

interface ContentPageProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  
  // Artist Props
  artists: Artist[];
  onOpenArtist: (artistId: string) => void;
  onOpenArtistEditor: () => void;
  onRefreshAll: () => void;
  onImportData: (data: any) => void;
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

  // Exhibition Props
  exhibitions: Exhibition[];
  onUpdateExhibitions: (exhibitions: Exhibition[]) => void;
  onOpenExhibitionDetail: (exhibitionId: string) => void;
  isExhibitionMenuOpen: boolean;
  onExhibitionMenuClose: () => void;
  onAddNewExhibition: () => void;

  onExport: () => void;
}

export const ContentPage: React.FC<ContentPageProps> = (props) => {

  const [isArtistToolsOpen, setIsArtistToolsOpen] = useState(false);
  const [isConcertToolsOpen, setIsConcertToolsOpen] = useState(false);
  const [isExhibitionToolsOpen, setIsExhibitionToolsOpen] = useState(false);

  const closeAllMenus = () => {
    setIsArtistToolsOpen(false);
    setIsConcertToolsOpen(false);
    setIsExhibitionToolsOpen(false);
  };

  const leftControl = (
    <button
      onClick={() => {
        if (props.activeTab === 'artists') {
          setIsArtistToolsOpen(v => !v);
          setIsConcertToolsOpen(false);
          setIsExhibitionToolsOpen(false);
        } else if (props.activeTab === 'concerts') {
          setIsConcertToolsOpen(v => !v);
          setIsArtistToolsOpen(false);
          setIsExhibitionToolsOpen(false);
        } else {
          setIsExhibitionToolsOpen(v => !v);
          setIsArtistToolsOpen(false);
          setIsConcertToolsOpen(false);
        }
      }}
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
    { key: 'artists', label: 'アーティスト' },
    { key: 'concerts', label: '公演' },
    { key: 'exhibitions', label: '展覧' }
  ];

  return (
    <div style={{ 
      position: 'relative',
      paddingTop: 'calc(12px + env(safe-area-inset-top) + 44px + 16px)' 
    }}>
      <TopCapsuleNav 
        activeTab={props.activeTab}
        onTabChange={(tab) => { closeAllMenus(); props.onTabChange(tab); }}
        onRefresh={props.onRefreshAll}
        tabs={tabs}
        leftControl={leftControl}
      />
      
      <div className="content-area">
        {props.activeTab === 'artists' && (
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
            isMenuOpenExternally={isArtistToolsOpen}
            onMenuClose={() => setIsArtistToolsOpen(false)}
            hideHeader={true}
            onExport={props.onExport}
          />
        )}
        {props.activeTab === 'concerts' && (
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
        {props.activeTab === 'exhibitions' && (
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
      </div>
    </div>
  );
};
