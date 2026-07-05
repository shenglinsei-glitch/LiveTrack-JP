import React, { useState } from 'react';
import { GlassCard } from '@/components/common/GlassCard';
import { theme } from '@/components/common/theme';
import { Icons } from '@/components/common/IconButton';
import { SectionTitle } from '@/components/detail/DetailText';

interface DetailSectionProps {
  title?: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
  defaultExpanded?: boolean;
  defaultOpen?: boolean;
  collapsible?: boolean;
  countLabel?: string;
  style?: React.CSSProperties;
  padding?: string;
}

export const DetailSection: React.FC<DetailSectionProps> = ({
  title,
  children,
  rightAction,
  defaultExpanded,
  defaultOpen,
  collapsible = true,
  countLabel,
  style,
  padding = '20px',
}) => {
  const initialOpen = defaultOpen ?? defaultExpanded ?? true;
  const [isExpanded, setIsExpanded] = useState(initialOpen);

  return (
    <GlassCard
      padding={padding}
      style={{
        marginBottom: 14,
        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        ...style,
      }}
    >
      {title && (
        <div
          role={collapsible ? 'button' : undefined}
          tabIndex={collapsible ? 0 : undefined}
          onClick={collapsible ? () => setIsExpanded((v) => !v) : undefined}
          onKeyDown={collapsible ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsExpanded((v) => !v);
            }
          } : undefined}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            cursor: collapsible ? 'pointer' : 'default',
            textAlign: 'left',
            outline: 'none',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <SectionTitle
              title={title}
              style={{ marginTop: 0, marginBottom: isExpanded ? 12 : 0 }}
              dividerStyle={{ opacity: isExpanded ? 1 : 0 }}
            />
          </div>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 2, flexShrink: 0 }}
          >
            {countLabel ? (
              <span style={{ fontSize: 11, fontWeight: 800, color: theme.colors.textWeak, whiteSpace: 'nowrap' }}>
                {countLabel}
              </span>
            ) : null}
            {rightAction ? (
              <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center' }}>
                {rightAction}
              </span>
            ) : null}
            {collapsible ? (
              <Icons.ChevronLeft
                style={{
                  width: 18,
                  height: 18,
                  color: theme.colors.textWeak,
                  transform: isExpanded ? 'rotate(-90deg)' : 'rotate(180deg)',
                  transition: 'transform 0.2s ease',
                }}
              />
            ) : null}
          </div>
        </div>
      )}
      {(!title || isExpanded || !collapsible) ? children : null}
    </GlassCard>
  );
};
