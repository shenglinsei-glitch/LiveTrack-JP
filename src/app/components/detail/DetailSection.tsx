import React, { useState } from 'react';
import { GlassCard } from '@/components/common/GlassCard';
import { theme } from '@/components/common/theme';

interface DetailSectionProps {
  title?: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
  defaultExpanded?: boolean;
  collapsible?: boolean;
  style?: React.CSSProperties;
}

export const DetailSection: React.FC<DetailSectionProps> = ({
  title,
  children,
  rightAction,
  defaultExpanded = true,
  collapsible = false,
  style,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <GlassCard style={{ marginBottom: 16, ...style }}>
      {title && (
        <div
          onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: isExpanded ? 16 : 0,
            cursor: collapsible ? 'pointer' : 'default',
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 900, color: theme.colors.text, margin: 0 }}>
            {collapsible && (
              <span style={{ marginRight: 8, display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                ▶
              </span>
            )}
            {title}
          </h3>
          {rightAction}
        </div>
      )}
      {isExpanded && children}
    </GlassCard>
  );
};
