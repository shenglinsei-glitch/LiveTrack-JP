import React from 'react';
import { theme } from '../ui/theme';
import { PageId } from '../domain/types';
import { Icons } from '../ui/IconButton';

interface LayoutProps {
  children: React.ReactNode;
  currentPath: PageId;
  onNavigate: (path: PageId) => void;
  onPlusClick?: () => void;
  hasConcertAlert?: boolean;
}

const NavIcons = { 
  Content: (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2.4" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2.4" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2.4" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2.4" />
    </svg>
  ),
  Status: (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    {/* 增大了圆环半径到 8，并调整了起止点以留出右上角的缺口 */}
    <path d="M18.5 10.5 A 8 8 0 1 1 13.5 4.5" />
    {/* 调整圆点位置，使其看起来是被圆环的缺口“含”在里面 */}
    <circle cx="17.2" cy="6.8" r="2.6" fill="currentColor" stroke="none" />
  </svg>
),
  Calendar: Icons.Calendar,
};

export const Layout: React.FC<LayoutProps> = ({ children, currentPath, onNavigate, onPlusClick, hasConcertAlert }) => {
  const tabs: { id: PageId; label: string; icon: React.ReactNode; alert?: boolean }[] = [
    { id: 'CONTENT', label: '内容', icon: <NavIcons.Content /> },
    { id: 'STATUS', label: '状态', icon: <NavIcons.Status />, alert: hasConcertAlert },
    { id: 'CALENDAR', label: '日历', icon: <NavIcons.Calendar /> },
  ];

  const isMainTab = tabs.some(tab => tab.id === currentPath);
  const hasFab = Boolean(onPlusClick);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.colors.background,
      color: theme.colors.text,
      paddingBottom: isMainTab ? '100px' : '0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      WebkitFontSmoothing: 'antialiased',
    }}>
      <div className="layout-content">
        {children}
      </div>

      {isMainTab && (
        <>
          <nav style={{
            position: 'fixed',
            bottom: 'calc(16px + env(safe-area-inset-bottom))',
            left: '16px',
            right: hasFab ? 'calc(16px + 64px + 16px)' : '16px',
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
                  aria-label={tab.label}
                  style={{
                    border: 'none',
                    background: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isActive ? theme.colors.primary : '#9CA3AF',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    outline: 'none',
                    padding: '12px',
                    position: 'relative',
                    flex: 1,
                  }}
                >
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: isActive ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.2s ease',
                  }}>{tab.icon}</span>
                  {tab.alert && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '30%',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: theme.colors.error,
                      border: '2px solid white',
                    }} />
                  )}
                </button>
              );
            })}
          </nav>

          {onPlusClick && (
            <button
              onClick={onPlusClick}
              style={{
                position: 'fixed',
                right: '16px',
                bottom: 'calc(16px + env(safe-area-inset-bottom))',
                width: '64px',
                height: '64px',
                borderRadius: '9999px',
                background: theme.colors.primary,
                color: 'white',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px -6px rgba(83, 190, 232, 0.5)',
                cursor: 'pointer',
                zIndex: 110,
                transition: 'transform 0.15s ease, opacity 0.15s ease',
                outline: 'none',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Icons.Plus style={{ width: '28px', height: '28px' }} />
            </button>
          )}
        </>
      )}
    </div>
  );
};
