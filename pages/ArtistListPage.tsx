import React, { useState, useMemo, useRef } from 'react';
import { BottomMenu } from '../components/BottomMenu';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { IconButton, Icons } from '../ui/IconButton';
import { PageShell } from '../ui/PageShell';
import { theme } from '../ui/theme';
import { TEXT } from '../ui/constants';
import { PageId, Artist, GlobalSettings, Status } from '../domain/types';
import { calcArtistStatus, sortArtistsForDisplay } from '../domain/logic';

interface Props {
  artists: Artist[];
  onOpenArtist: (artistId: string) => void;
  onOpenArtistEditor: () => void;
  onRefreshAll: () => void;
  onImportData: (data: Artist[]) => void;
  globalSettings: GlobalSettings;
  onUpdateGlobalSettings: (settings: GlobalSettings) => void;
  sortMode: 'manual' | 'status';
  onSetSort: (mode: 'manual' | 'status') => void;
  onUpdateOrder: (newArtists: Artist[]) => void;
  onAcknowledgeArtistTracking: (artistId: string) => void;
  onClearAllTrackingNotices: () => void;
}

const ArtistRowCard: React.FC<{ 
  artist: Artist; 
  onClick: () => void; 
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnter?: () => void;
  onDragEnd?: () => void;
  noticeKeywords?: string[];
  onAcknowledgeNotice?: () => void;
}> = ({ artist, onClick, draggable, onDragStart, onDragEnter, onDragEnd, noticeKeywords, onAcknowledgeNotice }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const status = calcArtistStatus(artist);
  
  const dotColor = useMemo(() => {
    if (status.main === TEXT.ARTIST_STATUS.MAIN_TOURING && status.sub) {
      return theme.colors.status[status.sub as Status] || theme.colors.primary;
    }
    if (status.main === TEXT.ARTIST_STATUS.MAIN_TRACKING) {
      return '#00E0FF';
    }
    return theme.colors.textLabel;
  }, [status]);

  return (
    <div
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => draggable && e.preventDefault()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'white',
        borderRadius: theme.radius.card,
        border: '1px solid rgba(0, 0, 0, 0.04)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        cursor: draggable ? 'grabbing' : 'pointer',
        boxShadow: isHovered 
          ? '0 10px 20px -5px rgba(0, 0, 0, 0.06)' 
          : '0 4px 12px -2px rgba(0, 0, 0, 0.03)',
        transform: isHovered ? 'scale(1.015)' : 'scale(1)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: draggable && isHovered ? 0.7 : 1
      }}
    >
      <div style={{
        width: '68px',
        height: '68px',
        borderRadius: '50%',
        background: '#F3F4F6',
        flexShrink: 0,
        border: '3px solid white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {artist.imageUrl ? (
          <img src={artist.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: '24px', opacity: 0.2 }}>👤</span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: '800',
          fontSize: '19px',
          color: isHovered ? theme.colors.primary : theme.colors.text,
          marginBottom: '6px',
          transition: 'color 0.2s ease'
        }}>
          {artist.name}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: dotColor,    
            boxShadow: status.main === TEXT.ARTIST_STATUS.MAIN_TRACKING
              ? `0 0 12px ${dotColor}99`
              : `0 0 12px ${dotColor}99`,
            filter: status.main === TEXT.ARTIST_STATUS.MAIN_TRACKING
              ? 'blur(1.5px)'
              : 'blur(1.5px)'
          }} />
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            color: theme.colors.textSecondary,
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>
            {/* 修改点：这里追加显示了 trackSuffix */}
            {status.main}{status.trackSuffix}
            {status.sub && (
              <span style={{ color: theme.colors.textWeak, marginLeft: '8px', fontWeight: '400' }}>
                / {TEXT.STATUS[status.sub]}
              </span>
            )}
          </div>

        {noticeKeywords && noticeKeywords.length > 0 && (
          <div style={{
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            minWidth: 0
          }}>
            <div style={{
              fontSize: '12px',
              color: theme.colors.textSecondary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0
            }}>
              検出キーワード：{noticeKeywords.join('・')}
            </div>
            {onAcknowledgeNotice && (
              <button
                onClick={(e) => { e.stopPropagation(); onAcknowledgeNotice(); }}
                style={{
                  flexShrink: 0,
                  border: 'none',
                  background: 'rgba(83, 190, 232, 0.12)',
                  color: theme.colors.primary,
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '6px 10px',
                  borderRadius: '9999px',
                  cursor: 'pointer'
                }}
              >
                確認
              </button>
            )}
          </div>
        )}

        </div>
      </div>

      <div style={{ color: theme.colors.textLabel, display: 'flex', alignItems: 'center', gap: '8px' }}>
        {draggable && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
            <line x1="8" y1="9" x2="16" y2="9"></line>
            <line x1="8" y1="15" x2="16" y2="15"></line>
          </svg>
        )}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </div>
    </div>
  );
};

export const ArtistListPage: React.FC<Props> = ({ 
  artists, 
  onOpenArtist, 
  onOpenArtistEditor, 
  onRefreshAll,
  onImportData,
  globalSettings,
  onUpdateGlobalSettings,
  sortMode,
  onSetSort,
  onUpdateOrder,
  onAcknowledgeArtistTracking,
  onClearAllTrackingNotices
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [stagedImportData, setStagedImportData] = useState<Artist[] | null>(null);
  const [refreshState, setRefreshState] = useState<'idle' | 'refreshing' | 'completed'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const sortedArtists = useMemo(() => {
    if (sortMode === 'manual') {
      return [...artists].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return sortArtistsForDisplay(artists, sortMode);
  }, [artists, sortMode]);


  const getNoticeKeywords = (artist: Artist): string[] => {
    const keywords = new Set<string>();
    for (const link of artist.links || []) {
      if (!link.matchedKeywords || link.matchedKeywords.length === 0) continue;
      if (!link.lastHitAt) continue;
      const ack = link.acknowledgedAt;
      if (ack && new Date(ack).getTime() >= new Date(link.lastHitAt).getTime()) continue;
      for (const k of link.matchedKeywords) keywords.add(k);
    }
    return Array.from(keywords);
  };

  const handleRefresh = () => {
    if (refreshState !== 'idle') return;
    
    setRefreshState('refreshing');
    onRefreshAll();
    
    setTimeout(() => {
      setRefreshState('completed');
      setTimeout(() => {
        setRefreshState('idle');
      }, 1200);
    }, 800);
  };

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const newList = [...sortedArtists];
      const draggedItemContent = newList[dragItem.current];
      newList.splice(dragItem.current, 1);
      newList.splice(dragOverItem.current, 0, draggedItemContent);
      onUpdateOrder(newList);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(artists, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `LiveTrack_JP_Backup_${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleImportClick = () => {
    setIsMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) {
          setStagedImportData(json);
          setIsImportConfirmOpen(true);
        }
      } catch (err) {
        console.error('Import failed:', err);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const executeImport = () => {
    if (stagedImportData) {
      onImportData(stagedImportData);
      setStagedImportData(null);
    }
    setIsImportConfirmOpen(false);
  };

  return (
    <PageShell
      header={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
            {TEXT.GLOBAL.APP_TITLE} <span style={{ color: '#53BEE8' }}>JP</span>
          </h1>
          <button 
            onClick={handleRefresh} 
            disabled={refreshState !== 'idle'}
            style={{ 
              padding: '12px', 
              borderRadius: '9999px', 
              background: 'white', 
              border: refreshState === 'completed' ? `1px solid ${theme.colors.success}` : '1px solid #F3F4F6', 
              color: refreshState === 'completed' ? theme.colors.success : (refreshState === 'refreshing' ? theme.colors.primary : '#9CA3AF'), 
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', 
              cursor: refreshState === 'idle' ? 'pointer' : 'default', 
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease'
            }}
          >
            {refreshState === 'completed' ? (
              <Icons.Check className="animate-pop-in" />
            ) : (
              <Icons.Refresh className={refreshState === 'refreshing' ? 'animate-spin' : ''} />
            )}
          </button>
        </div>
      }
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".json" 
        onChange={handleFileChange} 
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '120px' }}>
        {sortedArtists.length === 0 ? (
          <div style={{ 
            padding: '80px 20px', 
            textAlign: 'center', 
            color: theme.colors.textWeak,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px'
          }}>
            <div style={{ fontSize: '48px', opacity: 0.5 }}>👤</div>
            <div style={{ fontSize: '15px', fontWeight: '600' }}>{TEXT.GLOBAL.APP_SUBTITLE}</div>
            <button 
              onClick={onOpenArtistEditor}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                background: theme.colors.primary,
                color: 'white',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              ＋ {TEXT.BUTTONS.ADD}
            </button>
          </div>
        ) : (
          sortedArtists.map((artist, index) => (
            <ArtistRowCard 
              key={artist.id} 
              artist={artist} 
              onClick={() => onOpenArtist(artist.id)} 
              draggable={sortMode === 'manual'}
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              noticeKeywords={getNoticeKeywords(artist)}
              onAcknowledgeNotice={() => onAcknowledgeArtistTracking(artist.id)}
            />
          ))
        )}
      </div>

      <IconButton 
        icon={isMenuOpen ? <Icons.X /> : <Icons.Plus />} 
        primary 
        size={64} 
        onClick={() => setIsMenuOpen(!isMenuOpen)} 
        style={{ 
          position: 'fixed', 
          right: '16px', 
          bottom: 'calc(16px + env(safe-area-inset-bottom))', 
          zIndex: 110,
          boxShadow: '0 8px 24px -6px rgba(83, 190, 232, 0.5)'
        }} 
      />

      <BottomMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        onAddArtist={onOpenArtistEditor}
        onExport={handleExport} 
        onImport={handleImportClick}
        currentSort={sortMode}
        onSetSort={onSetSort}
        globalSettings={globalSettings}
        onUpdateGlobalSettings={onUpdateGlobalSettings}
        onClearTrackingNotices={onClearAllTrackingNotices}
      />
      <ConfirmDialog 
        isOpen={isImportConfirmOpen} 
        title={TEXT.ALERTS.IMPORT_CONFIRM_TITLE} 
        message={TEXT.ALERTS.IMPORT_CONFIRM_MSG} 
        confirmLabel={TEXT.BUTTONS.IMPORT} 
        isDestructive 
        onClose={() => { setIsImportConfirmOpen(false); setStagedImportData(null); }} 
        onConfirm={executeImport} 
      />
    </PageShell>
  );
};