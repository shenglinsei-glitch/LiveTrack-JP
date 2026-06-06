import React from 'react';
import { theme } from '@/components/common/theme';
import { Icons } from '@/components/common/IconButton';

interface InfoRowProps {
  label: string;
  value?: React.ReactNode;
  link?: string;
  onLinkClick?: () => void;
  hideIfEmpty?: boolean;
}

export const InfoRow: React.FC<InfoRowProps> = ({ label, value, link, onLinkClick, hideIfEmpty = true }) => {
  // 空值检查
  const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
  if (hideIfEmpty && isEmpty) return null;

  const displayValue = isEmpty ? '未設定' : value;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.colors.textSecondary, minWidth: 100, flexShrink: 0 }}>
        {label}
      </div>
      <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: theme.colors.text, wordBreak: 'break-word' }}>
        {displayValue}
        {link && (
          <button
            onClick={onLinkClick}
            style={{
              marginLeft: 8,
              background: 'none',
              border: 'none',
              color: theme.colors.primary,
              cursor: 'pointer',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Icons.ExternalLink />
          </button>
        )}
      </div>
    </div>
  );
};

interface InfoGridProps {
  items: Array<{
    label: string;
    value?: React.ReactNode;
    link?: string;
    onLinkClick?: () => void;
  }>;
  columns?: 1 | 2;
}

export const InfoGrid: React.FC<InfoGridProps> = ({ items, columns = 1 }) => {
  const validItems = items.filter(item => item.value && (typeof item.value !== 'string' || item.value.trim() !== ''));

  if (validItems.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: columns === 2 ? 'repeat(2, 1fr)' : '1fr', gap: 12 }}>
      {validItems.map((item, idx) => (
        <InfoRow key={idx} {...item} hideIfEmpty={false} />
      ))}
    </div>
  );
};
