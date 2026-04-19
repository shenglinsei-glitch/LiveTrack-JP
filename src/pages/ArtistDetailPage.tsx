import React, { useState, useMemo } from 'react';
import { PageShell } from '../ui/PageShell';
import { theme } from '../ui/theme';
import { IconButton, Icons } from '../ui/IconButton';
import { GlassCard } from '../ui/GlassCard';
import { Artist, Concert, DisplaySettings, Status } from '../domain/types';
import { calcArtistStatus, sortPerformancesForDisplay } from '../domain/logic';
import { TEXT } from '../ui/constants';

import { RemoteImage } from '../components/RemoteImage';

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
  isLast: boolean;
  onClick?: () => void;
  disabled?: boolean;
}> = ({ concert, isLast, onClick, disabled }) => {
  const [showHistory, setShowHistory] = useState(false);
  const isSpecial = concert.status === '参戦予定' || concert.status === '参戦済み';
  const dotColor = isSpecial ? theme.colors.primary : '#9CA3AF';

  const history = Array.isArray(concert.lotteryHistory) ? concert.lotteryHistory : [];
  const historyCount = history.length;

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (concert.saleLink) {
      window.open(concert.saleLink, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      style={{
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        borderBottom: isLast ? 'none' : '1px solid rgba(0, 0, 0, 0.05)',
        opacity: disabled ? 0.6 : 1,
      }}
      onClick={disabled ? undefined : onClick}
    >
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          cursor: (disabled || !onClick) ? 'default' : 'pointer',
          transition: 'background 0.2s',
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
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {concert.saleLink && (
          <button 
            onClick={handleLinkClick}
            style={{ 
              border: 'none', 
              background: 'rgba(83, 190, 232, 0.1)', 
              color: theme.colors.primary, 
              padding: '8px', 
              borderRadius: '10px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Icons.ExternalLink style={{ width: 16, height: 16 }} />
          </button>
        )}
        {onClick && !disabled && (
          <div style={{ color: '#D1D5DB' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        )}
      </div>

      </div>

      {historyCount > 0 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
        >
          <button
            onClick={() => setShowHistory(v => !v)}
            style={{
              border: 'none',
              background: 'rgba(0,0,0,0.04)',
              color: theme.colors.textSecondary,
              padding: '8px 10px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>抽選履歴（{historyCount}）</span>
            <span style={{ opacity: 0.6 }}>{showHistory ? '閉じる' : '見る'}</span>
          </button>

          {showHistory && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '2px' }}>
              {[...history].slice().reverse().map((h, idx) => (
                <div
                  key={`${h.at}_${idx}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '10px',
                    fontSize: '12px',
                    color: theme.colors.textSecondary,
                    background: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    borderRadius: '10px',
                    padding: '8px 10px',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, color: h.result === 'WON' ? theme.colors.primary : theme.colors.error }}>
                      {h.result === 'WON' ? '当選' : '落選'}
                    </div>
                    {(h.lotteryName || h.resultAt) && (
                      <div style={{ marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {h.lotteryName ? `${h.lotteryName}` : ''}{h.lotteryName && h.resultAt ? ' / ' : ''}{h.resultAt ? `結果：${h.resultAt}` : ''}
                      </div>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, opacity: 0.75 }}>
                    {new Date(h.at).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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
    return (artist.tours || [])
      .map(tour => ({
        ...tour,
        concerts: sortPerformancesForDisplay((tour.concerts || []).filter(c => {
          if (!settings.showAttended && c.status === '参戦済み') return false;
          if (!settings.showSkipped && c.status === '見送') return false;
          return true;
        }))
      }))
      .filter(tour => tour.concerts.length > 0 || isSelectionMode);
  }, [artist.tours, settings, isSelectionMode]);

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '44px' }}>
          {!isSelectionMode ? (
            <button 
              onClick={onBack} 
              style={{ border: 'none', background: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}
            >
              <Icons.ChevronLeft />
            </button>
          ) : (
            <div style={{ flex: 1, paddingRight: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: theme.colors.primary, margin: 0 }}>
                編集するツアーを選択してください
              </h2>
            </div>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isSelectionMode ? (
              <button 
                onClick={() => setIsSelectionMode(false)}
                style={{
                  border: 'none',
                  background: 'rgba(0,0,0,0.05)',
                  color: theme.colors.textSecondary,
                  padding: '8px 16px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                キャンセル
              </button>
            ) : (
              <div style={{ position: 'relative' }}>
                <IconButton 
                  icon={<Icons.Edit />} 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  size={40}
                  style={{ 
                    borderRadius: '16px', 
                    color: theme.colors.primary, 
                    borderColor: isMenuOpen ? theme.colors.primary : '#F3F4F6' 
                  }}
                />
                
                {isMenuOpen && (
                  <div style={{ position: 'absolute', top: '48px', right: 0, zIndex: 1000, width: '220px' }}>
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
            )}
          </div>
        </div>
      }
    >
      <div style={{ paddingBottom: '120px' }}>
        {/* Profile Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px', opacity: isSelectionMode ? 0.3 : 1, transition: 'opacity 0.3s' }}>
          <div style={{ 
            width: '96px', height: '96px', borderRadius: '50%', background: '#F3F4F6', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <RemoteImage 
              imageUrl={artist.imageUrl} 
              imageId={(artist as any).imageId}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              fallback={<span style={{ fontSize: '32px', opacity: 0.2 }}>👤</span>}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: '32px', fontWeight: '900', margin: 0, letterSpacing: '-0.02em', lineHeight: '1.2' }}>{artist.name}</h1>
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'white', padding: '6px 14px', borderRadius: '9999px', border: '1px solid #F1F5F9' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: dotColor,
                    boxShadow: `0 0 12px ${dotColor}99`,
                    filter: 'blur(1px)'
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: '800', color: theme.colors.textMain }}>
                  {/* 修改点：这里追加显示了 trackSuffix */}
                  {status.main}{status.trackSuffix}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Artist Links Section */}
        {artist.links && artist.links.length > 0 && !isSelectionMode && (
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            overflowX: 'auto', 
            paddingBottom: '8px', 
            marginBottom: '40px',
            msOverflowStyle: 'none',
            scrollbarWidth: 'none'
          }} className="hide-scrollbar">
            {artist.links.map((link, idx) => (
              <button
                key={idx}
                onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '8px 16px',
                  borderRadius: '14px',
                  background: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(0,0,0,0.04)',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: theme.colors.textSecondary,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = theme.colors.primary}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.04)'}
              >
                {link.name || '外部リンク'}
              </button>
            ))}
          </div>
        )}

        {/* Tours List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {processedTours.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 40px', color: theme.colors.textWeak }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🎪</div>
              <div style={{ fontWeight: '600' }}>表示可能な公演がありません</div>
            </div>
          ) : (
            processedTours.map(tour => (
              <div key={tour.id} style={{ transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', transform: isSelectionMode ? 'scale(1.02)' : 'scale(1)' }}>
                <GlassCard 
                  padding="0" 
                  onClick={isSelectionMode ? () => onOpenConcertEditor(artistId, tour.id) : undefined}
                  style={{ 
                    overflow: 'hidden',
                    border: isSelectionMode ? `2.5px solid ${theme.colors.primary}` : theme.glass.border,
                    boxShadow: isSelectionMode ? theme.shadows.pop : theme.shadows.card,
                    position: 'relative'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    gap: '16px', 
                    padding: '20px', 
                    background: isSelectionMode ? 'rgba(83, 190, 232, 0.05)' : 'linear-gradient(to bottom right, rgba(255,255,255,0.8), rgba(255,255,255,0.4))', 
                    borderBottom: '1px solid rgba(0,0,0,0.03)' 
                  }}>
                    <div style={{ width: '60px', height: '80px', borderRadius: '12px', background: '#F3F4F6', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <RemoteImage 
                        imageUrl={tour.imageUrl} 
                        imageId={(tour as any).imageId}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        fallback={<span style={{ fontSize: '24px', opacity: 0.2 }}>🎸</span>}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '900', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tour.name}</h3>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {tour.officialUrl && !isSelectionMode && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); window.open(tour.officialUrl, '_blank', 'noopener,noreferrer'); }}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: theme.colors.textWeak, padding: '4px' }}
                            >
                              <Icons.Globe style={{ width: 18, height: 18 }} />
                            </button>
                          )}
                          {isSelectionMode && (
                            <div style={{ background: theme.colors.primary, color: 'white', padding: '4px', borderRadius: '50%', display: 'flex' }}>
                              <Icons.Edit style={{ width: 14, height: 14 }} />
                            </div>
                          )}
                        </div>
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
                      {(tour.concerts || []).map((c, idx) => (
                        <InstanceRow 
                          key={c.id} 
                          concert={c} 
                          isLast={idx === (tour.concerts || []).length - 1}
                          onClick={(c.status === '参戦予定' || c.status === '参戦済み') ? () => onOpenConcertHome(artistId, tour.id, c.id) : undefined} 
                        />
                      ))}
                    </div>
                  )}
                </GlassCard>
              </div>
            ))
          )}
        </div>
      </div>

      {!isSelectionMode && (
        <IconButton 
          icon={<Icons.Plus />} 
          primary size={64} 
          onClick={() => onOpenConcertEditor(artistId)} 
          style={{ position: 'fixed', right: '16px', bottom: 'calc(16px + env(safe-area-inset-bottom))', zIndex: 110, boxShadow: theme.shadows.fab }} 
        />
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