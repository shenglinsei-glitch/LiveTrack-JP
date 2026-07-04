
import React from 'react';
import { theme } from '@/components/common/theme';

interface PageShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  disablePadding?: boolean;
  horizontalPadding?: React.CSSProperties['paddingLeft'];
}

export const PageShell: React.FC<PageShellProps> = ({ children, header, disablePadding, horizontalPadding = theme.spacing.lg }) => {
  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      paddingLeft: horizontalPadding,
      paddingRight: horizontalPadding,
      paddingTop: disablePadding ? 0 : theme.spacing.pageTop,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {header && (
        <header style={{ marginBottom: theme.spacing.headerMargin }}>
          {header}
        </header>
      )}
      <main style={{ width: '100%' }}>
        {children}
      </main>
    </div>
  );
};
