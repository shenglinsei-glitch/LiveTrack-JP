import React from 'react';
import { Artist, Concert, Status } from '@/domain/types';
import { Icons } from '@/components/common/IconButton';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PosterCard } from '@/components/common/PosterCard';

interface ConcertCardProps {
  artist?: Artist;
  tour?: { id: string; name: string; imageUrl: string };
  concert?: Concert;
  onClick: () => void;
  overrideTitle?: string;
  overrideSubtitle?: string;
  imageUrl?: string;
  imageId?: string;
  hideStatus?: boolean;
}

export const ConcertCard: React.FC<ConcertCardProps> = ({
  artist,
  tour,
  concert,
  onClick,
  overrideTitle,
  overrideSubtitle,
  imageUrl,
  imageId,
  hideStatus = false,
}) => {
  const displayImage = imageUrl || tour?.imageUrl || artist?.imageUrl;
  const displayTitle = overrideTitle || tour?.name || artist?.name || '';
  const displaySubtitle = overrideSubtitle || (artist ? artist.name : '');
  const status = concert?.status as Status;

  return (
    <PosterCard
      onClick={onClick}
      imageUrl={displayImage}
      imageId={imageId}
      title={displayTitle}
      subtitle={displaySubtitle}
      alt={displayTitle}
      statusNode={!hideStatus && status ? <StatusBadge domain="concert" status={status} /> : undefined}
      fallback={(
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.12 }}>
          <Icons.Exhibitions style={{ width: 64, height: 64 }} />
        </div>
      )}
    />
  );
};
