import React, { useState, useMemo } from 'react';
import { PageShell } from '../ui/PageShell';
import { theme } from '../ui/theme';
import { IconButton, Icons } from '../ui/IconButton';
import { GlassCard } from '../ui/GlassCard';
import { Artist, Concert, DisplaySettings, Status } from '../domain/types';
import { ArtistDetailMenu } from '../components/ArtistDetailMenu';
import { calcArtistStatus, sortPerformancesForDisplay } from '../domain/logic';
import { TEXT } from '../ui/constants';

interface Props {
  artistId: string;
  artist: Artist;
  settings: DisplaySettings;
  onOpenArtistEditor: (artistId: string) => void;
  onOpenConcertEditor: (artistId: string, tourId?: string) => void;
  onOpenConcertHome: (artistId: string, tourId: string, concertId: string) => void;
  onChangeSettings: (settings: Partial<DisplaySettings>) => void;
  onBack: () => void;
}

const InstanceRow: React.FC<{ 
  concert: Concert; 
  tourOfficialUrl?: string; 
  onClick?: () => void;
  isLast: boolean;
  disabled?: boolean;
}> = ({ concert, tourOfficialUrl, onClick, isLast, disabled }) => {
  const isSpecial = concert.status === '参戦予定' || concert.status === '参戦済み';
  const dotColor = isSpecial ? theme.colors.primary : '#9CA3AF';
  const isLottery = concert.status === '抽選中';

  return (
    <div 
      onClick={disabled ? undefined : onClick}
      style={{
        padding: '16px 20px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        cursor: (disabled || !onClick) ? 'default' : 'pointer',
        borderBottom: isLast ? 'none' : '1px solid rgba(0, 0, 0, 0.05)',
        transition: 'background 0.2s',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: '800', fontSize: '15px' }}>{concert.date}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor }} />
            <span style={{ fontSize: '11px', fontWeight: '700', color: theme.colors.textSecondary }}>{concert.status}</span>
          </div>
        </div>
        <div style={{ fontSize: '13px', color: theme.colors.textSecondary, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {concert.venue || '会場未定'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {onClick && !disabled && (
          <div style={{ color: '#D1D5DB', paddingLeft: '4px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export const ArtistDetailPage: React.FC<Props> = ({ 
  artistId, 
  artist, 
  settings, 
  onOpenArtistEditor, 
  onOpenConcertEditor, 
  onOpenConcertHome,
  onChangeSettings,
  onBack 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  
  const status = calcArtistStatus(artist);

  const dotColor = useMemo(() => {
    if (status.main === TEXT.ARTIST_STATUS.MAIN_TOURING && status.sub) {
      return theme.colors.status[status.sub as Status] || theme.colors.primary;
    }
    if (status.main === TEXT.ARTIST_STATUS.MAIN_TRACKING) {
      return '#00E0FF';
    }
    return '#E2E8F0';
  }, [status]);

  const processedTours = useMemo(() => {
    return artist.tours
      .map(tour => ({
        ...tour,
        concerts: sortPerformancesForDisplay(tour.concerts.filter(c => {
          if (!settings.showAttended && c.status === '参戦済み') return false;
          if (!settings.showSkipped && c.status === '見送') return false;
          return true;
        }))
      }))
      .filter(tour => tour.concerts.length > 0);
  }, [artist.tours, settings]);

  const handleEditConcertClick = () => {
    setIsMenuOpen(false);
    if (artist.tours.length === 0) {
      onOpenConcertEditor(artistId);
    } else if (artist.tours.length === 1) {
      onOpenConcertEditor(artistId, artist.tours[0].id);
    } else {
      setIsSelectionMode(true);
    }
  };

  return (
    <PageShell
      header={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={isSelectionMode ? () => setIsSelectionMode(false) : onBack} 
            style={{ border: 'none', background: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isSelectionMode ? <Icons.X /> : <Icons.ChevronLeft />}
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isSelectionMode && (
              <span style={{ fontSize: '13px', fontWeight: '800', color: theme.colors.primary, marginRight: '8px' }}>
                ツアーを選択
              </span>
            )}
            <div style={{ position: 'relative' }}>
              <IconButton 
                icon={isSelectionMode ? <Icons.Plus /> : <Icons.Edit />} 
                onClick={isSelectionMode ? () => onOpenConcertEditor(artistId) : () => setIsMenuOpen(!isMenuOpen)}
                size={40}
                style={{ 
                  borderRadius: '16px', 
                  color: theme.colors.primary, 
                  borderColor: isMenuOpen ? theme.colors.primary : '#F3F4F6' 
                }}
              />
              
              {isMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '48px',
                  right: 0,
                  zIndex: 1000,
                  width: '220px',
                }}>
                  <div style={{ position: 'fixed', inset: 0 }} onClick={() => setIsMenuOpen(false)} />
                  <GlassCard padding="8px" className="fade-in" style={{ boxShadow: theme.shadows.pop }}>
                    <MenuOption 
                      label="アーティスト編集" 
                      icon={<Icons.Edit style={{ width: 16 }} />} 
                      onClick={() => { onOpenArtistEditor(artistId); setIsMenuOpen(false); }} 
                    />
                    <MenuOption 
                      label="ツアー・公演編集" 
                      icon={<Icons.Calendar style={{ width: 16 }} />} 
                      onClick={handleEditConcertClick} 
                    />
                  </GlassCard>
                </div>
              )}
            </div>
          </div>
        </div>
      }
    >
      <div style={{ paddingBottom: '120px' }}>
        {/* Profile Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '40px', opacity: isSelectionMode ? 0.4 : 1, transition: 'opacity 0.3s' }}>
          <div style={{ 
            width: '96px', height: '96px', borderRadius: '50%', background: '#F3F4F6', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {artist.imageUrl ? (
              <img src={artist.imageUrl} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '32px', opacity: 0.2 }}>👤</span>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: '32px', fontWeight: '900', margin: 0, letterSpacing: '-0.02em', lineHeight: '1.2' }}>{artist.name}</h1>
            <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'white', padding: '6px 16px', borderRadius: '9999px', border: '1px solid #F1F5F9' }}>
              <div
  style={{
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: dotColor,
    boxShadow:
      status.main === TEXT.ARTIST_STATUS.MAIN_TRACKING
        ? `0 0 12px ${dotColor}99`
        : `0 0 12px ${dotColor}99`,
    filter:
      status.main === TEXT.ARTIST_STATUS.MAIN_TRACKING
        ? 'blur(1.5px)'
        : 'blur(1.5px)'
  }}
/>
              <span style={{ fontSize: '13px', fontWeight: '800', color: theme.colors.textMain }}>{status.main}</span>
            </div>
          </div>
        </div>

        {/* Tours List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {processedTours.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 40px', color: theme.colors.textWeak }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🎪</div>
              <div style={{ fontWeight: '600' }}>表示可能な公演がありません</div>
            </div>
          ) : (
            processedTours.map(tour => (
              <GlassCard 
                key={tour.id} 
                padding="0" 
                onClick={isSelectionMode ? () => onOpenConcertEditor(artistId, tour.id) : undefined}
                style={{ 
                  overflow: 'hidden',
                  border: isSelectionMode ? `2px solid ${theme.colors.primary}` : theme.glass.border,
                  transform: isSelectionMode ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isSelectionMode ? theme.shadows.pop : theme.shadows.card,
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <div style={{ display: 'flex', gap: '16px', padding: '20px', background: 'linear-gradient(to bottom right, rgba(255,255,255,0.8), rgba(255,255,255,0.4))', borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                  <div style={{ width: '60px', height: '80px', borderRadius: '12px', background: '#F3F4F6', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {tour.imageUrl && !imgErrors[tour.id] ? (
                      <img src={tour.imageUrl} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgErrors(p => ({ ...p, [tour.id]: true }))} />
                    ) : (
                      <span style={{ fontSize: '24px', opacity: 0.2 }}>🎸</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '900', margin: 0 }}>{tour.name}</h3>
                      {isSelectionMode && <Icons.Edit style={{ color: theme.colors.primary }} />}
                    </div>
                    <div style={{ marginTop: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: theme.colors.textWeak, background: '#F1F5F9', padding: '2px 8px', borderRadius: '6px' }}>
                        {tour.concerts.length}公演
                      </span>
                    </div>
                  </div>
                </div>

                {!isSelectionMode && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {tour.concerts.map((c, idx) => (
                      <InstanceRow 
                        key={c.id} 
                        concert={c} 
                        isLast={idx === tour.concerts.length - 1}
                        onClick={(c.status === '参戦予定' || c.status === '参戦済み') ? () => onOpenConcertHome(artistId, tour.id, c.id) : undefined} 
                      />
                    ))}
                  </div>
                )}
              </GlassCard>
            ))
          )}
        </div>
      </div>

      {!isSelectionMode && (
        <>
          <IconButton 
            icon={<Icons.Plus />} 
            primary size={64} 
            onClick={() => onOpenConcertEditor(artistId)} 
            style={{ position: 'fixed', right: '16px', bottom: 'calc(16px + env(safe-area-inset-bottom))', zIndex: 110, boxShadow: theme.shadows.fab }} 
          />
        </>
      )}
    </PageShell>
  );
};

const MenuOption = ({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) => (
  <button 
    onClick={onClick}
    style={{
      width: '100%',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      textAlign: 'left',
      borderRadius: '12px',
      color: theme.colors.text,
      fontSize: '14px',
      fontWeight: '600',
      transition: 'background 0.2s',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
  >
    <span style={{ opacity: 0.6 }}>{icon}</span>
    {label}
  </button>
);
