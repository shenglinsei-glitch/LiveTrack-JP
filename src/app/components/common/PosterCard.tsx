import React from 'react';
import { GlassCard } from '@/components/common/GlassCard';
import { RemoteImage } from '@/components/RemoteImage';

interface PosterCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  imageUrl?: string;
  imageId?: string;
  fallback?: React.ReactNode;
  statusNode?: React.ReactNode;
  rightTopNode?: React.ReactNode;
  onClick: () => void;
  alt?: string;
  compact?: boolean;
  extraContent?: React.ReactNode;
}

export const PosterCard: React.FC<PosterCardProps> = ({
  title,
  subtitle,
  meta,
  imageUrl,
  imageId,
  fallback,
  statusNode,
  rightTopNode,
  onClick,
  alt,
  compact = false,
  extraContent,
}) => {
  const imageStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'scale(1.045)',
    transformOrigin: 'center',
  };

  return (
    <div onClick={onClick} style={{ cursor: 'pointer', position: 'relative', height: '100%' }}>
      <GlassCard
        padding="0"
        style={{
          overflow: 'hidden',
          borderRadius: compact ? 22 : 24,
          height: '100%',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ position: 'relative', paddingTop: compact ? '133%' : '140%', background: '#F3F4F6', overflow: 'hidden' }}>
          {imageUrl || imageId ? (
            <RemoteImage imageUrl={imageUrl} imageId={imageId} alt={alt || String(title || '')} style={imageStyle} fallback={fallback} />
          ) : (
            fallback || null
          )}

          {statusNode ? <div style={{ position: 'absolute', top: compact ? 8 : 10, left: compact ? 8 : 10, zIndex: 10 }}>{statusNode}</div> : null}
          {rightTopNode ? <div style={{ position: 'absolute', top: compact ? 8 : 10, right: compact ? 8 : 10, zIndex: 10 }}>{rightTopNode}</div> : null}

          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              padding: compact ? '22px 10px 10px' : '24px 12px 12px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.44) 60%, transparent 100%)',
              color: '#fff',
            }}
          >
            {subtitle ? (
              <div style={{ fontSize: compact ? 10 : 12, fontWeight: 800, opacity: 0.86, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                {subtitle}
              </div>
            ) : null}
            <div style={{ fontSize: compact ? 14 : 16, fontWeight: 900, lineHeight: compact ? 1.35 : 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
              {title}
            </div>
            {meta ? (
              <div style={{ marginTop: compact ? 3 : 4, fontSize: compact ? 10 : 11, fontWeight: 700, opacity: 0.82, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {meta}
              </div>
            ) : null}
            {extraContent ? extraContent : null}
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
