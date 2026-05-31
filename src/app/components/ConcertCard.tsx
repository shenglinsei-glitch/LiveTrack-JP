import React from 'react';
import { Artist, Concert, Status } from '@/domain/types';
import { theme } from '@/components/common/theme';
import { TEXT } from '@/components/common/constants';
import { Icons } from '@/components/common/IconButton';
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
  const statusColor = status ? (theme.colors.status[status] || theme.colors.primary) : theme.colors.primary;

  const statusNode = !hideStatus && status ? (
    <div
      style={{
        background: statusColor,
        color: 'white',
        padding: '4px 12px',
        borderRadius: 10,
        fontSize: 11,
        fontWeight: 900,
        lineHeight: 1,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        whiteSpace: 'nowrap',
      }}
    >
      {TEXT.STATUS[status]}
    </div>
  ) : undefined;

  return (
    <PosterCard
      onClick={onClick}
      imageUrl={displayImage}
      imageId={imageId}
      title={displayTitle}
      subtitle={displaySubtitle}
      alt={displayTitle}
      statusNode={statusNode}
      fallback={(
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.12 }}>
          <Icons.Exhibitions style={{ width: 64, height: 64 }} />
        </div>
      )}
    />
  );
};
