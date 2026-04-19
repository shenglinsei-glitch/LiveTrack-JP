import React from 'react';
import { theme } from '../../ui/theme';

interface DetailPageLayoutProps {
  backgroundUrl?: string;
  children: React.ReactNode;
  bottomPadding?: number;
}

export const DetailPageLayout: React.FC<DetailPageLayoutProps> = ({
  backgroundUrl,
  children,
  bottomPadding = 140,
}) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflowX: 'hidden',
        background: theme.colors.background,
      }}
    >
      {backgroundUrl ? (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundImage: `url(${backgroundUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: 'scale(1.02)',
              opacity: 0.94,
            }}
          />
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              background: 'rgba(0,0,0,0.06)',
              maskImage:
                'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.92) 12%, rgba(0,0,0,0.75) 28%, rgba(0,0,0,0.50) 48%, rgba(0,0,0,0.28) 65%, rgba(0,0,0,0.12) 78%, rgba(0,0,0,0) 88%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.92) 12%, rgba(0,0,0,0.75) 28%, rgba(0,0,0,0.50) 48%, rgba(0,0,0,0.28) 65%, rgba(0,0,0,0.12) 78%, rgba(0,0,0,0) 88%)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.42) 18%, rgba(0,0,0,0.28) 38%, rgba(0,0,0,0.16) 58%, rgba(0,0,0,0.10) 78%, rgba(0,0,0,0.04) 100%)',
              pointerEvents: 'none',
            }}
          />
        </>
      ) : null}

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 1080,
          margin: '0 auto',
          boxSizing: 'border-box',
          padding: `calc(env(safe-area-inset-top) + 16px) max(16px, env(safe-area-inset-right)) ${bottomPadding}px max(16px, env(safe-area-inset-left))`,
        }}
      >
        {children}
      </div>
    </div>
  );
};
