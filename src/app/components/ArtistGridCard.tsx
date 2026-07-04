import React, { useMemo } from 'react';
import { Artist, Status } from '@/domain/types';
import { calcArtistStatus } from '@/domain/logic';
import { PosterCard } from '@/components/common/PosterCard';
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
}) => {
  const status = artist ? calcArtistStatus(artist) : null;

  const dotColor = useMemo(() => {
    if (!status) return theme.colors.textLabel;
    if (status.main === TEXT.ARTIST_STATUS.MAIN_TOURING && status.sub) {
      return theme.colors.status[status.sub as Status] || theme.colors.primary;
    }
    return theme.colors.textLabel;
  }, [status]);

  const displayImage = imageUrl || artist?.imageUrl;
  const displayTitle = overrideTitle || artist?.name || '';
  const displaySubtitle = overrideSubtitle || (status ? `${status.main}${status.sub ? ` / ${TEXT.STATUS[status.sub]}` : ''}` : '');

  const meta = !hideStatus && displaySubtitle ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, boxShadow: `0 0 8px ${dotColor}aa`, flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displaySubtitle}</span>
    </span>
  ) : undefined;

  return (
    <PosterCard
      onClick={onClick}
      imageUrl={displayImage}
      imageId={(artist as any)?.imageId}
      title={displayTitle}
      meta={meta}
      alt={displayTitle}
      compact
      fallback={(
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
          <span style={{ fontSize: 48 }}>🎵</span>
        </div>
      )}
    />
  );
};
