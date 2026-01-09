
import React from 'react';
import { theme } from '../ui/theme';
import { PageId } from '../domain/types';

interface LayoutProps {
  children: React.ReactNode;
  currentPath: PageId;
  onNavigate: (path: PageId) => void;
  hasConcertAlert?: boolean;
}

const NavIcons = {
  Artists: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  ),
  Concerts: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
      <path d="M13 5v2"></path>
      <path d="M13 17v2"></path>
      <path d="M13 11v2"></path>
    </svg>
  ),
  Calendar: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  )
};

export const Layout: React.FC<LayoutProps> = ({ children, currentPath, onNavigate, hasConcertAlert }) => {
  const tabs: { id: PageId; label: string; icon: React.ReactNode; alert?: boolean }[] = [
    { id: 'ARTIST_LIST', label: 'アーティスト', icon: <NavIcons.Artists /> },
    { id: 'CONCERT_LIST', label: '公演', icon: <NavIcons.Concerts />, alert: hasConcertAlert },
    { id: 'CALENDAR', label: 'カレンダー', icon: <NavIcons.Calendar /> },
  ];

  const isMainTab = tabs.some(tab => tab.id === currentPath);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: theme.colors.background,
      color: theme.colors.text,
      paddingBottom: isMainTab ? '64px' : '0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      WebkitFontSmoothing: 'antialiased',
    }}>
      <div className="layout-content">
        {children}
      </div>

      {isMainTab && (
        <nav style={{
          position: 'fixed',
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
          left: '16px',
          right: '92px',
          height: '64px',
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(15, 23, 42, 0.05)',
          borderRadius: '32px',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 100,
        }}>
          {tabs.map((tab) => {
            const isActive = currentPath === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onNavigate(tab.id)}
                style={{
                  border: 'none',
                  background: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? theme.colors.primary : '#9CA3AF',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  outline: 'none',
                  padding: '12px',
                  position: 'relative'
                }}
              >
                <span style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.2s ease',
                  fontWeight: isActive ? 'bold' : 'normal',
                }}>{tab.icon}</span>
                {tab.alert && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: theme.colors.error,
                    border: '2px solid white'
                  }} />
                )}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
};
