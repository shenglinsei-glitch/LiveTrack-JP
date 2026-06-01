import React from 'react';
import { Exhibition } from '@/domain/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Icons } from '@/components/common/IconButton';
import { getEffectiveExhibitionStatus } from '@/domain/logic';
import { PosterCard } from '@/components/common/PosterCard';

interface ExhibitionCardProps {
  exhibition?: Exhibition;
  onClick: () => void;
  overrideTitle?: string;
  overrideSubtitle?: string;
  imageUrl?: string;
  imageId?: string;
  hideStatus?: boolean;
  asEntryCard?: boolean;
}

export const ExhibitionCard: React.FC<ExhibitionCardProps> = ({
  exhibition,
  onClick,
  overrideTitle,
  overrideSubtitle,
  imageUrl,
  imageId,
  hideStatus = false,
}) => {
  const displayImage = imageUrl || exhibition?.imageUrl;
  const displayImageId = imageId || exhibition?.imageIds?.[0];
  const displayTitle = overrideTitle || exhibition?.title || '';
  const displaySubtitle = overrideSubtitle || (exhibition ? `${exhibition.startDate?.replace(/-/g, '.')} - ${exhibition.endDate?.replace(/-/g, '.')}` : '');

  return (
    <PosterCard
      onClick={onClick}
      imageUrl={displayImage}
      imageId={displayImageId}
      title={displayTitle}
      subtitle={displaySubtitle}
      alt={displayTitle}
      statusNode={!hideStatus && exhibition ? <StatusBadge domain="exhibition" status={getEffectiveExhibitionStatus(exhibition)} style={{ minHeight: 20, padding: '2px 8px', fontSize: 10, borderRadius: 8 }} /> : undefined}
      rightTopNode={exhibition && (exhibition.advanceTicketPurchased || exhibition.ticketSalesStatus === 'purchased') ? (
        <div style={{ background: '#10B981', color: 'white', padding: '3px 8px', borderRadius: 8, fontSize: 10, fontWeight: 900, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
          購入済
        </div>
      ) : undefined}
      compact
      fallback={(
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
          <Icons.Exhibitions style={{ width: 48, height: 48 }} />
        </div>
      )}
    />
  );
};
