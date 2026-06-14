import React, { useState, useMemo } from 'react';
import { DetailPageLayout } from '@/components/detail/DetailPageLayout';
import { DetailHeader, DetailChip } from '@/components/detail/DetailHeader';
import { theme } from '@/components/common/theme';
import { IconButton, Icons } from '@/components/common/IconButton';
import { GlassCard } from '@/components/common/GlassCard';
import { DetailSection } from '@/components/detail/DetailSection';
import { Artist, Concert, DisplaySettings, Status } from '@/domain/types';
import { calcArtistStatus, sortPerformancesForDisplay } from '@/domain/logic';
import { TEXT } from '@/components/common/constants';
import { RemoteImage } from '@/components/RemoteImage';

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

const formatConcertDateTime = (concert: Concert) => {
  const raw = concert.concertAt || concert.date;
  if (!raw || raw === TEXT.GLOBAL.TBD) return concert.date || TEXT.GLOBAL.TBD;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return concert.date || raw;

  const hasTime = /T\d{2}:\d{2}|\s\d{1,2}:\d{2}/.test(raw);
  const dateText = date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });

  if (!hasTime) return dateText;

  const timeText = date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${dateText} ${timeText}`;
};

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
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        borderBottom: isLast ? 'none' : '1px solid rgba(15,23,42,0.06)',
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
        <div style={{ flex: '1 1 0', minWidth: 0, maxWidth: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 900, fontSize: 15, color: theme.colors.text }}>{formatConcertDateTime(concert)}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor }} />
              <span style={{ fontSize: 11, fontWeight: 800, color: theme.colors.textSecondary }}>{concert.status}</span>
            </div>
          </div>
          <div style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {concert.venue || '会場未定'}
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {concert.saleLink && (
            <button 
              onClick={handleLinkClick}
              style={{ 
                border: 'none', 
                background: 'rgba(83, 190, 232, 0.12)', 
                color: theme.colors.primary, 
                padding: 8, 
                borderRadius: 10, 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Icons.ExternalLink style={{ width: 16, height: 16 }} />
            </button>
          )}
          {onClick && !disabled && (
            <div style={{ color: theme.colors.primary, fontWeight: 900, fontSize: 20 }}>›</div>
          )}
        </div>
      </div>

      {historyCount > 0 && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <button
            onClick={() => setShowHistory(v => !v)}
            style={{
              border: 'none',
              background: 'rgba(0,0,0,0.04)',
              color: theme.colors.textSecondary,
              padding: '8px 10px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 800,
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 2 }}>
              {[...history].slice().reverse().map((h, idx) => (
                <div
                  key={`${h.at}_${idx}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    fontSize: 12,
                    color: theme.colors.textSecondary,
                    background: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(0,0,0,0.05)',
                    borderRadius: 10,
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

  const backgroundUrl = artist.imageUrl || (artist.tours || []).find(tour => tour.imageUrl)?.imageUrl || '';
  const tourCount = (artist.tours || []).length;
  const concertCount = (artist.tours || []).reduce((sum, tour) => sum + (tour.concerts || []).length, 0);

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
    <DetailPageLayout backgroundUrl={backgroundUrl} bottomPadding={120}>
      <div style={{ opacity: isSelectionMode ? 0.3 : 1, transition: 'opacity 0.3s' }}>
        <DetailHeader
          title={artist.name}
          posterUrl={artist.imageUrl || backgroundUrl}
          posterAlt={artist.name}
          posterFallback={<span style={{ fontSize: 46, opacity: 0.25 }}>🎤</span>}
          onBack={onBack}
          actions={
            <>
              <div style={{ position: 'relative' }}>
                <IconButton
                  icon={<Icons.Edit />}
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  style={{ background: 'rgba(255,255,255,0.82)', border: 'none', color: theme.colors.primary }}
                />
                {isMenuOpen && (
                  <div style={{ position: 'absolute', top: 48, right: 0, zIndex: 1000, width: 220 }}>
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
            </>
          }
          tags={
            <>
              <DetailChip label={`${status.main}${status.trackSuffix}`} bg={dotColor} textColor={dotColor === '#E2E8F0' ? theme.colors.text : '#fff'} />
              <DetailChip label={`${concertCount || tourCount}公演`} subtle />
            </>
          }
        />
      </div>

      {isSelectionMode && (
        <GlassCard padding="16px" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 900, color: theme.colors.primary, margin: 0 }}>
            編集するツアーを選択してください
          </h2>
          <button
            onClick={() => setIsSelectionMode(false)}
            style={{
              border: 'none',
              background: 'rgba(0,0,0,0.05)',
              color: theme.colors.textSecondary,
              padding: '8px 16px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            キャンセル
          </button>
        </GlassCard>
      )}

      {artist.links && artist.links.length > 0 && !isSelectionMode && (
        <div style={{ 
          display: 'flex', 
          gap: 8, 
          overflowX: 'auto', 
          paddingBottom: 8, 
          marginBottom: 14,
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
                borderRadius: 999,
                background: 'rgba(255,255,255,0.72)',
                border: '1px solid rgba(255,255,255,0.48)',
                fontSize: 13,
                fontWeight: 800,
                color: theme.colors.textSecondary,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(15,23,42,0.06)',
                transition: 'all 0.2s'
              }}
            >
              {link.name || '外部リンク'}
            </button>
          ))}
        </div>
      )}

      <DetailSection title="公演スケジュール" defaultOpen style={{ marginBottom: 120 }}>
        {processedTours.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '44px 24px', color: theme.colors.textWeak }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🎪</div>
            <div style={{ fontWeight: 600 }}>表示可能な公演がありません</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
            {processedTours.map(tour => (
              <div key={tour.id} style={{ minWidth: 0, transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', transform: isSelectionMode ? 'scale(1.01)' : 'scale(1)' }}>
                <div
                  onClick={isSelectionMode ? () => onOpenConcertEditor(artistId, tour.id) : undefined}
                  style={{
                    width: '100%',
                    border: isSelectionMode ? `2.5px solid ${theme.colors.primary}` : '1px solid rgba(15,23,42,0.06)',
                    background: 'rgba(255,255,255,0.72)',
                    borderRadius: 22,
                    overflow: 'hidden',
                    cursor: isSelectionMode ? 'pointer' : 'default',
                    boxShadow: '0 8px 24px rgba(15,23,42,0.04)',
                    minWidth: 0,
                    maxWidth: '100%',
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    gap: 12, 
                    padding: 12, 
                    borderBottom: '1px solid rgba(15,23,42,0.05)',
                    alignItems: 'center',
                  }}>
                    <div style={{ width: 58, height: 82, borderRadius: 16, background: '#F3F4F6', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <RemoteImage 
                        imageUrl={tour.imageUrl} 
                        imageId={(tour as any).imageId}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        fallback={<span style={{ fontSize: 24, opacity: 0.2 }}>🎸</span>}
                      />
                    </div>
                    <div style={{ flex: '1 1 0', minWidth: 0, maxWidth: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <h3 style={{ flex: '1 1 auto', minWidth: 0, maxWidth: '100%', fontSize: 16, fontWeight: 900, color: theme.colors.text, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tour.name}</h3>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                          {tour.officialUrl && !isSelectionMode && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); window.open(tour.officialUrl, '_blank', 'noopener,noreferrer'); }}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: theme.colors.textWeak, padding: 4 }}
                            >
                              <Icons.Globe style={{ width: 18, height: 18 }} />
                            </button>
                          )}
                          {isSelectionMode && (
                            <div style={{ background: theme.colors.primary, color: 'white', padding: 4, borderRadius: '50%', display: 'flex' }}>
                              <Icons.Edit style={{ width: 14, height: 14 }} />
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: theme.colors.textWeak, background: '#F1F5F9', padding: '2px 8px', borderRadius: 6 }}>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      {!isSelectionMode && (
        <IconButton 
          icon={<Icons.Plus />} 
          primary size={64} 
          onClick={() => onOpenConcertEditor(artistId)} 
          style={{ position: 'fixed', right: 16, bottom: 'calc(16px + env(safe-area-inset-bottom))', zIndex: 110, boxShadow: theme.shadows.fab }} 
        />
      )}
    </DetailPageLayout>
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
      gap: 12,
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      textAlign: 'left',
      borderRadius: 12,
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: 600,
      transition: 'background 0.2s',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
  >
    <span style={{ opacity: 0.6 }}>{icon}</span>
    {label}
  </button>
);
