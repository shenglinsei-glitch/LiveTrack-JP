
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
  onOpenConcertEditor: (artistId: string) => void;
  onOpenConcertHome: (artistId: string, tourId: string, concertId: string) => void;
  onChangeSettings: (settings: Partial<DisplaySettings>) => void;
  onBack: () => void;
}

/**
 * 单场次行组件 (InstanceRow)
 * 用于展示 Tour 内部的每一个具体场次
 */
const InstanceRow: React.FC<{ 
  concert: Concert; 
  tourOfficialUrl?: string; 
  onClick?: () => void;
  isLast: boolean;
}> = ({ concert, tourOfficialUrl, onClick, isLast }) => {
  const isSpecial = concert.status === '参戦予定' || concert.status === '参戦済み';
  const dotColor = isSpecial ? theme.colors.primary : '#9CA3AF';
  const isLottery = concert.status === '抽選中';

  return (
    <div 
      onClick={onClick}
      style={{
        padding: '16px 20px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        cursor: onClick ? 'pointer' : 'default',
        borderBottom: isLast ? 'none' : '1px solid rgba(0, 0, 0, 0.05)',
        transition: 'background 0.2s',
      }}
      onMouseEnter={(e) => onClick && (e.currentTarget.style.background = 'rgba(0,0,0,0.01)')}
      onMouseLeave={(e) => onClick && (e.currentTarget.style.background = 'transparent')}
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

        {isLottery && (
          <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {concert.lotteryName && (
              <div style={{ fontSize: '11px', fontWeight: '800', color: theme.colors.primary }}>{concert.lotteryName}</div>
            )}
            <div style={{ fontSize: '11px', color: theme.colors.textSecondary }}>
              {/* Corrected lotteryResultDate to resultAt */}
              {concert.resultAt && <span>結果発表: {concert.resultAt}</span>}
              {concert.price > 0 && <span style={{ marginLeft: '8px' }}>¥{concert.price.toLocaleString()}</span>}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {concert.saleLink && (
          <a 
            href={concert.saleLink} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              display: 'flex', 
              color: theme.colors.textWeak, 
              padding: '8px',
              borderRadius: '10px',
              transition: 'color 0.2s'
            }}
            title="チケット販売ページ"
          >
            <Icons.Globe />
          </a>
        )}
        {onClick && (
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
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  
  const status = calcArtistStatus(artist);

  const dotColor = useMemo(() => {
    if (status.main === TEXT.ARTIST_STATUS.MAIN_TOURING && status.sub) {
      return theme.colors.status[status.sub as Status] || theme.colors.primary;
    }
    if (status.main === TEXT.ARTIST_STATUS.MAIN_TRACKING) {
      return '#00ffff';
    }
    return '#E2E8F0';
  }, [status]);

  const processedTours = useMemo(() => {
    return artist.tours
      .map(tour => {
        const filteredConcerts = tour.concerts.filter(c => {
          if (!settings.showAttended && c.status === '参戦済み') return false;
          if (!settings.showSkipped && c.status === '見送') return false;
          return true;
        });
        
        return {
          ...tour,
          concerts: sortPerformancesForDisplay(filteredConcerts)
        };
      })
      .filter(tour => tour.concerts.length > 0);
  }, [artist.tours, settings]);

  return (
    <PageShell
      header={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onBack} style={{ border: 'none', background: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icons.ChevronLeft />
          </button>
          <IconButton 
            icon={<Icons.Edit />} 
            onClick={() => onOpenArtistEditor(artistId)}
            size={40}
            style={{ 
              borderRadius: '16px', 
              color: theme.colors.primary, 
              borderColor: '#F3F4F6' 
            }}
          />
        </div>
      }
    >
      <div style={{ paddingBottom: '120px' }}>
        {/* 歌手基本信息区 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '40px' }}>
          <div style={{ 
            width: '96px', 
            height: '96px', 
            borderRadius: '50%', 
            background: '#F3F4F6', 
            border: '3px solid white', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {artist.imageUrl ? (
              <img src={artist.imageUrl} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '32px', opacity: 0.2 }}>👤</span>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: '900', 
              margin: 0, 
              letterSpacing: '-0.02em', 
              whiteSpace: 'normal', 
              wordBreak: 'break-word',
              lineHeight: '1.2'
            }}>
              {artist.name}
            </h1>
            
            <div style={{ 
              marginTop: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'white',
              padding: '6px 16px',
              borderRadius: '9999px',
              border: '1px solid #F1F5F9',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: dotColor 
              }} />
              <span style={{ fontSize: '13px', fontWeight: '800', color: theme.colors.textMain }}>{status.main}</span>
              {status.sub && (
                <>
                  <div style={{ width: '1px', height: '12px', background: '#E2E8F0' }} />
                  <span style={{ fontSize: '12px', fontWeight: '600', color: theme.colors.textSecondary }}>{status.sub}</span>
                </>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
              {artist.links.map(l => (
                <a 
                  key={l.name} 
                  href={l.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    fontSize: '11px', 
                    fontWeight: '700', 
                    color: theme.colors.primary, 
                    background: 'rgba(83, 190, 232, 0.08)', 
                    padding: '5px 12px', 
                    borderRadius: '10px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {l.name}
                  <Icons.ExternalLink />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* 聚合的主题卡片列表 */}
        {processedTours.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 40px', color: theme.colors.textWeak }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🎪</div>
            <div style={{ fontWeight: '600' }}>表示可能な公演がありません</div>
          </div>
        ) : (
          processedTours.map(tour => (
            <GlassCard key={tour.id} padding="0" style={{ marginBottom: '32px', overflow: 'hidden' }}>
              {/* 卡片头部：Tour海报与标题 */}
              <div style={{ 
                display: 'flex', 
                gap: '16px', 
                padding: '20px', 
                background: 'linear-gradient(to bottom right, rgba(255,255,255,0.8), rgba(255,255,255,0.4))',
                borderBottom: '1px solid rgba(0,0,0,0.03)'
              }}>
                <div style={{ 
                  width: '60px', 
                  height: '80px', 
                  borderRadius: '12px', 
                  background: '#F3F4F6', 
                  flexShrink: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(0,0,0,0.05)'
                }}>
                  {tour.imageUrl && !imgErrors[tour.id] ? (
                    <img 
                      src={tour.imageUrl} 
                      referrerPolicy="no-referrer"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      onError={() => setImgErrors(prev => ({ ...prev, [tour.id]: true }))}
                    />
                  ) : (
                    <span style={{ fontSize: '24px', opacity: 0.2 }}>🎸</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '900', margin: 0, lineHeight: '1.2' }}>{tour.name}</h3>
                    {tour.officialUrl && (
                      <a 
                        href={tour.officialUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                          display: 'flex', 
                          color: theme.colors.primary, 
                          padding: '6px',
                          borderRadius: '8px',
                          background: 'rgba(83, 190, 232, 0.08)',
                          marginLeft: '8px'
                        }}
                        title="ツアー公式サイト"
                      >
                        <Icons.Globe />
                      </a>
                    )}
                  </div>
                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: theme.colors.textWeak, background: '#F1F5F9', padding: '2px 8px', borderRadius: '6px' }}>
                      {tour.concerts.length}公演
                    </span>
                  </div>
                </div>
              </div>

              {/* 场次列表 */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {tour.concerts.map((c, idx) => {
                  const isNavigable = c.status === '参戦予定' || c.status === '参戦済み';
                  return (
                    <InstanceRow 
                      key={c.id} 
                      concert={c} 
                      tourOfficialUrl={tour.officialUrl}
                      isLast={idx === tour.concerts.length - 1}
                      onClick={isNavigable ? () => onOpenConcertHome(artistId, tour.id, c.id) : undefined} 
                    />
                  );
                })}
              </div>
            </GlassCard>
          ))
        )}
      </div>

      {/* 浮动操作按钮 */}
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

      <ArtistDetailMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)}
        onAddConcert={() => onOpenConcertEditor(artistId)}
        settings={settings}
        onChangeSettings={onChangeSettings}
      />
    </PageShell>
  );
};
