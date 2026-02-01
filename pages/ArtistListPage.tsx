import React, { useState, useMemo, useRef } from 'react';
import { BottomMenu } from '../components/BottomMenu';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icons } from '../ui/IconButton';
import { PageShell } from '../ui/PageShell';
import { theme } from '../ui/theme';
import { TEXT } from '../ui/constants';
import { Artist, GlobalSettings, Status } from '../domain/types';
import { calcArtistStatus, sortArtistsForDisplay, expandAlbumImagesForExport } from '../domain/logic';

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
  isMenuOpenExternally?: boolean;
  onMenuClose?: () => void;
  hideHeader?: boolean;
  onExport?: () => void;
}

// -------------------------------------------------------------------------
// 样式 B：网格卡片 (状态优先模式)
// -------------------------------------------------------------------------
const ArtistGridCard: React.FC<{ 
  artist: Artist; 
  onClick: () => void; 
}> = ({ artist, onClick }) => {
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'white',
        borderRadius: '24px',
        border: '1px solid rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        boxShadow: isHovered ? '0 12px 24px -8px rgba(0,0,0,0.12)' : '0 4px 12px -2px rgba(0,0,0,0.03)',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* 核心视觉：图片容器，设定 3:4 的纵横比 */}
      <div style={{ position: 'relative', paddingTop: '133%', background: '#F3F4F6' }}>
        {artist.imageUrl ? (
          <img 
            src={artist.imageUrl} 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover' 
            }} 
            alt={artist.name}
          />
        ) : (
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
            <span style={{ fontSize: '40px' }}>👤</span>
          </div>
        )}

        {/* 视觉过渡层：参照展览页，使用弱化的底部渐变，不使用模糊，高度约 25% */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '35%', 
          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.2) 60%, transparent 100%)',
          zIndex: 1,
          pointerEvents: 'none'
        }} />

        {/* 内容信息：自然浮动在渐变层之上 */}
        <div style={{ 
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 14px 12px', 
          zIndex: 2 
        }}>
          <div style={{
            fontWeight: '900',
            fontSize: '15px',
            color: 'white',
            marginBottom: '2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textShadow: '0 1px 4px rgba(0,0,0,0.4)'
          }}>
            {artist.name}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: dotColor,
              boxShadow: `0 0 8px ${dotColor}aa`,
              flexShrink: 0
            }} />
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              color: 'rgba(255, 255, 255, 0.85)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}>
              {status.main}{status.trackSuffix}
              {status.sub && ` / ${TEXT.STATUS[status.sub]}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------
// 样式 A：列表卡片 (手顺/列表模式)
// -------------------------------------------------------------------------
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
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        cursor: draggable ? 'grabbing' : 'pointer',
        boxShadow: isHovered ? '0 8px 16px -4px rgba(0, 0, 0, 0.05)' : '0 2px 8px -1px rgba(0, 0, 0, 0.02)',
        transform: isHovered ? 'scale(1.01)' : 'scale(1)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{
        width: '56px', height: '56px', borderRadius: '50%', background: '#F3F4F6', flexShrink: 0,
        border: '2px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        {artist.imageUrl ? <img src={artist.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '20px', opacity: 0.2 }}>👤</span>}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '800', fontSize: '17px', color: theme.colors.text, marginBottom: '2px' }}>{artist.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: dotColor, boxShadow: `0 0 8px ${dotColor}99` }} />
          <div style={{ fontSize: '11px', fontWeight: '600', color: theme.colors.textSecondary }}>
            {status.main}{status.trackSuffix}{status.sub && <span style={{ color: theme.colors.textWeak, marginLeft: '6px' }}>/ {TEXT.STATUS[status.sub]}</span>}
          </div>
        </div>
      </div>

      {draggable && (
        <div style={{ color: theme.colors.textLabel }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="9" x2="16" y2="9"></line><line x1="8" y1="15" x2="16" y2="15"></line></svg>
        </div>
      )}
    </div>
  );
};

export const ArtistListPage: React.FC<Props> = ({ 
  artists, onOpenArtist, onOpenArtistEditor, onRefreshAll, onImportData,
  globalSettings, onUpdateGlobalSettings, sortMode, onSetSort, onUpdateOrder,
  onAcknowledgeArtistTracking, onClearAllTrackingNotices, isMenuOpenExternally,
  onMenuClose, hideHeader, onExport
}) => {
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [stagedImportData, setStagedImportData] = useState<Artist[] | null>(null);
  const [refreshState, setRefreshState] = useState<'idle' | 'refreshing' | 'completed'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const sortedArtists = useMemo(() => {
    if (sortMode === 'manual') return [...artists].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
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
      setTimeout(() => setRefreshState('idle'), 1200);
    }, 800);
  };

  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOverItem.current = index; };
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

  const handleImportClick = () => { onMenuClose?.(); fileInputRef.current?.click(); };
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) { setStagedImportData(json); setIsImportConfirmOpen(true); }
      } catch (err) { console.error('Import failed:', err); }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <PageShell
      header={hideHeader ? null : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#111827', margin: 0 }}>
            {TEXT.GLOBAL.APP_TITLE} <span style={{ color: '#53BEE8' }}>JP</span>
          </h1>
          <button onClick={handleRefresh} disabled={refreshState !== 'idle'} style={{ padding: '12px', borderRadius: '9999px', background: 'white', border: '1px solid #F3F4F6', color: refreshState === 'completed' ? theme.colors.success : '#9CA3AF', cursor: refreshState === 'idle' ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {refreshState === 'completed' ? <Icons.Check /> : <Icons.Refresh className={refreshState === 'refreshing' ? 'animate-spin' : ''} />}
          </button>
        </div>
      )}
      disablePadding={hideHeader}
    >
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={handleFileChange} />

      <div style={{ paddingBottom: '120px' }}>
        {sortedArtists.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: theme.colors.textWeak, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
            <div style={{ fontSize: '48px', opacity: 0.5 }}>👤</div>
            <div style={{ fontSize: '15px', fontWeight: '600' }}>{TEXT.GLOBAL.APP_SUBTITLE}</div>
            <button onClick={onOpenArtistEditor} style={{ padding: '12px 24px', borderRadius: '12px', background: theme.colors.primary, color: 'white', border: 'none', fontWeight: 'bold' }}>＋ {TEXT.BUTTONS.ADD}</button>
          </div>
        ) : (
          <div style={
            sortMode === 'status' 
              ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }
              : { display: 'flex', flexDirection: 'column', gap: '12px' }
          }>
            {sortedArtists.map((artist, index) => (
              sortMode === 'status' ? (
                <ArtistGridCard key={artist.id} artist={artist} onClick={() => onOpenArtist(artist.id)} />
              ) : (
                <ArtistRowCard 
                  key={artist.id} artist={artist} onClick={() => onOpenArtist(artist.id)} 
                  draggable={sortMode === 'manual'} onDragStart={() => handleDragStart(index)} onDragEnter={() => handleDragEnter(index)} onDragEnd={handleDragEnd}
                  noticeKeywords={getNoticeKeywords(artist)} onAcknowledgeNotice={() => onAcknowledgeArtistTracking(artist.id)}
                />
              )
            ))}
          </div>
        )}
      </div>

      <BottomMenu 
        isOpen={!!isMenuOpenExternally} onClose={() => onMenuClose?.()} onAddArtist={onOpenArtistEditor}
        onExport={onExport || (() => {})} onImport={handleImportClick} currentSort={sortMode} onSetSort={onSetSort}
        globalSettings={globalSettings} onUpdateGlobalSettings={onUpdateGlobalSettings} onClearTrackingNotices={onClearAllTrackingNotices}
      />
      <ConfirmDialog isOpen={isImportConfirmOpen} title={TEXT.ALERTS.IMPORT_CONFIRM_TITLE} message={TEXT.ALERTS.IMPORT_CONFIRM_MSG} confirmLabel={TEXT.BUTTONS.IMPORT} isDestructive onClose={() => { setIsImportConfirmOpen(false); setStagedImportData(null); }} onConfirm={() => { if (stagedImportData) onImportData(stagedImportData); setIsImportConfirmOpen(false); }} />
    </PageShell>
  );
};
