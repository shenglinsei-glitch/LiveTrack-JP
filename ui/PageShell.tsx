
import React from 'react';
import { theme } from './theme';

interface PageShellProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  disablePadding?: boolean;
}

export const PageShell: React.FC<PageShellProps> = ({ children, header, disablePadding }) => {
  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      paddingLeft: theme.spacing.lg,
      paddingRight: theme.spacing.lg,
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
