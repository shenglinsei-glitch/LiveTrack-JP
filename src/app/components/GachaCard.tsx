import React from 'react';
import { Gacha } from '@/domain/types';
import { PosterCard } from '@/components/common/PosterCard';
import { getGachaStats, deriveGachaStatus, getGachaStatusTone, formatCurrency, formatDate } from '@/utils/gacha';

interface GachaCardProps {
  gacha: Gacha;
  onClick: () => void;
}

export const GachaCard: React.FC<GachaCardProps> = ({ gacha, onClick }) => {
  const stats = getGachaStats(gacha);
  const status = deriveGachaStatus(gacha);
  const tone = getGachaStatusTone(status);
  const meta = stats.drawCount > 0
    ? `${stats.drawCount}回 / ${formatCurrency(stats.finalCost)}`
    : `発売日：${formatDate(gacha.releaseDate)}`;

  return (
    <PosterCard
      onClick={onClick}
      imageUrl={gacha.posterUrl}
      title={gacha.name}
      subtitle={gacha.kind}
      meta={meta}
      alt={gacha.name}
      compact
      statusNode={(
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 22,
            padding: '2px 9px',
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 900,
            lineHeight: 1.4,
            color: '#fff',
            background: tone.color,
            boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
            whiteSpace: 'nowrap',
          }}
        >
          {tone.label}
        </span>
      )}
      fallback={(
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
          <span style={{ fontSize: 48 }}>🎁</span>
        </div>
      )}
    />
  );
};
