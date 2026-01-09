
import React from 'react';
import { theme } from './theme';
import { Status } from '../domain/types';

const getStatusStyles = (label: string) => {
  switch (label as Status) {
    case '発売前': return theme.colors.badges.processing;
    case '検討中': return theme.colors.badges.considering;
    case '抽選中': return theme.colors.badges.lottery;
    case '参戦予定': return theme.colors.badges.confirmed;
    case '参戦済み': return theme.colors.badges.completed;
    case '見送': return theme.colors.badges.skipped;
    default: return theme.colors.badges.skipped;
  }
};

interface StatusBadgeProps {
  label: string;
  subLabel?: string | null;
  isMainStatus?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, subLabel, isMainStatus }) => {
  if (isMainStatus) {
    const mainColor = theme.colors.status[label as Status] || theme.colors.primary;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ 
          fontSize: '15px', 
          fontWeight: '800', 
          color: mainColor 
        }}>
          {label}
        </span>
        {subLabel && (
          <span style={{ fontSize: '13px', color: theme.colors.textSecondary }}>
            {subLabel}
          </span>
        )}
      </div>
    );
  }

  const styles = getStatusStyles(label);
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <div style={{ 
        display: 'inline-flex',
        alignItems: 'center',
        background: styles.bg,
        color: styles.text,
        padding: '4px 12px',
        borderRadius: theme.radius.badge,
        fontSize: '11px',
        fontWeight: '700',
        width: 'fit-content',
        border: `1px solid ${styles.border}`
      }}>
        {label}
      </div>
      {subLabel && (
        <span style={{ fontSize: '10px', color: theme.colors.textSecondary, marginLeft: '4px' }}>
          {subLabel}
        </span>
      )}
    </div>
  );
};
