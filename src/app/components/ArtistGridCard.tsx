import React, { useState, useMemo } from 'react';
import { Artist, Status } from '@/domain/types';
import { calcArtistStatus } from '@/domain/logic';
import { RemoteImage } from '@/components/RemoteImage';
import { theme } from '@/components/common/theme';
import { TEXT } from '@/components/common/constants';

interface ArtistGridCardProps {
  artist?: Artist;
  onClick: () => void;
  overrideTitle?: string;
  overrideSubtitle?: string;
  imageUrl?: string;
  hideStatus?: boolean;
  asEntryCard?: boolean;
}

export const ArtistGridCard: React.FC<ArtistGridCardProps> = ({
  artist,
  onClick,
  overrideTitle,
  overrideSubtitle,
  imageUrl,
  hideStatus = false,
  asEntryCard = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const status = artist ? calcArtistStatus(artist) : null;

  const dotColor = useMemo(() => {
    if (!status) return theme.colors.textLabel;
    if (status.main === TEXT.ARTIST_STATUS.MAIN_TOURING && status.sub) {
      return theme.colors.status[status.sub as Status] || theme.colors.primary;
    }
    if (status.main === TEXT.ARTIST_STATUS.MAIN_TRACKING) {
      return '#00E0FF';
    }
    return theme.colors.textLabel;
  }, [status]);

  const displayImage = imageUrl || artist?.imageUrl;
  const displayTitle = overrideTitle || artist?.name || '';
  const displaySubtitle = overrideSubtitle || (status ? `${status.main}${status.trackSuffix || ''}${status.sub ? ` / ${TEXT.STATUS[status.sub]}` : ''}` : '');

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
      <div style={{ position: 'relative', paddingTop: '133%', background: '#F3F4F6' }}>
        <RemoteImage
          imageUrl={displayImage}
          imageId={(artist as any)?.imageId}
          alt={displayTitle}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          fallback={(
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
              <span style={{ fontSize: '40px' }}>🎵</span>
            </div>
          )}
        />

        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '35%',
            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.2) 60%, transparent 100%)',
            zIndex: 1,
            pointerEvents: 'none'
          }}
        />

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 14px 12px', zIndex: 2 }}>
          <div
            style={{
              fontWeight: '900',
              fontSize: '15px',
              color: 'white',
              marginBottom: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textShadow: '0 1px 4px rgba(0,0,0,0.4)'
            }}
          >
            {displayTitle}
          </div>

          {!hideStatus && displaySubtitle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: dotColor,
                  boxShadow: `0 0 8px ${dotColor}aa`,
                  flexShrink: 0
                }}
              />
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: 'rgba(255, 255, 255, 0.85)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                }}
              >
                {displaySubtitle}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
