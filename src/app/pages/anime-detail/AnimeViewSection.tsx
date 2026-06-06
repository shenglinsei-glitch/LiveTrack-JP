import React from 'react';
import { DetailSection } from '@/components/detail/DetailSection';
import { theme } from '@/components/common/theme';

export const ViewSection: React.FC<{
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  countLabel?: string;
}> = ({ title, defaultOpen = false, children, countLabel }) => {
  return (
    <DetailSection
      title={title}
      collapsible
      defaultExpanded={defaultOpen}
      rightAction={countLabel ? (
        <span style={{ fontSize: 11, fontWeight: 800, color: theme.colors.textWeak, whiteSpace: 'nowrap' }}>
          {countLabel}
        </span>
      ) : null}
      style={{ padding: 20 }}
    >
      {children}
    </DetailSection>
  );
};
