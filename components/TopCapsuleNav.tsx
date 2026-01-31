
import React from 'react';
import { theme } from '../ui/theme';
import { Icons } from '../ui/IconButton';

interface TopCapsuleNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const TopCapsuleNav: React.FC<TopCapsuleNavProps> = ({ 
  activeTab, 
  onTabChange, 
  onRefresh,
  isRefreshing 
}) => {
  const tabs = [
    { key: 'artists', label: 'アーティスト' },
    { key: 'concerts', label: '公演' }
  ];

  const glassStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.72)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(15, 23, 42, 0.06)',
    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.06)',
    display: 'flex',
    alignItems: 'center',
  };

  return (
    <div style={{
      position: 'fixed',
      top: 'calc(12px + env(safe-area-inset-top))',
      left: '16px',
      right: '16px',
      height: '44px',
      zIndex: 120,
      pointerEvents: 'none',
    }}>
      {/* Container to allow relative positioning of children */}
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        
        {/* Centered Capsule: Tabs Segmented Control */}
        <div style={{
          ...glassStyle,
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          height: '44px',
          padding: '4px',
          borderRadius: '9999px',
          pointerEvents: 'auto',
        }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                style={{
                  border: 'none',
                  height: '100%',
                  background: isActive ? 'rgba(83, 190, 232, 0.12)' : 'transparent',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: '800',
                  color: isActive ? theme.colors.primary : '#9CA3AF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  outline: 'none',
                  padding: '0 16px',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Positioned Capsule: Independent Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{
            ...glassStyle,
            position: 'absolute',
            right: 0,
            width: '44px',
            height: '44px',
            borderRadius: '9999px',
            justifyContent: 'center',
            cursor: isRefreshing ? 'default' : 'pointer',
            outline: 'none',
            padding: 0,
            pointerEvents: 'auto',
            color: isRefreshing ? theme.colors.primary : '#9CA3AF',
            transition: 'transform 0.15s ease',
          }}
          onMouseDown={(e) => !isRefreshing && (e.currentTarget.style.transform = 'scale(0.92)')}
          onMouseUp={(e) => !isRefreshing && (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={(e) => !isRefreshing && (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Icons.Refresh 
            style={{ 
              width: '18px', 
              height: '18px',
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
            }} 
          />
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </button>
      </div>
    </div>
  );
};
