import React from 'react';
import { theme } from '../../ui/theme';
import { Icons, IconButton } from '../../ui/IconButton';

export const DetailChip: React.FC<{ label: React.ReactNode; bg?: string; subtle?: boolean; textColor?: string }> = ({ label, bg = theme.colors.primary, subtle = false, textColor }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 28,
      padding: '0 12px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 800,
      color: subtle ? (textColor || theme.colors.text) : (textColor || '#fff'),
      background: subtle ? 'rgba(255,255,255,0.72)' : bg,
      boxShadow: subtle ? '0 4px 12px rgba(15,23,42,0.06)' : 'none',
      whiteSpace: 'nowrap',
      lineHeight: 1,
      flexShrink: 0,
    }}
  >
    {label}
  </span>
);

export const DetailLinkIconButton: React.FC<{ onClick: () => void; title: string }> = ({ onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    style={{
      width: 30,
      height: 30,
      borderRadius: 999,
      border: 'none',
      background: 'rgba(255,255,255,0.72)',
      color: theme.colors.primary,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
      padding: 0,
      flexShrink: 0,
    }}
  >
    <Icons.Globe style={{ width: 16, height: 16 }} />
  </button>
);

interface DetailHeaderProps {
  title: string;
  onTitleChange?: (value: string) => void;
  titlePlaceholder?: string;
  isEditMode?: boolean;
  posterUrl?: string;
  posterAlt?: string;
  posterFallback?: React.ReactNode;
  subtitle?: React.ReactNode;
  tags?: React.ReactNode;
  onBack: () => void;
  actions?: React.ReactNode;
}

export const DetailHeader: React.FC<DetailHeaderProps> = ({
  title,
  onTitleChange,
  titlePlaceholder = '',
  isEditMode = false,
  posterUrl,
  posterAlt = '',
  posterFallback,
  subtitle,
  tags,
  onBack,
  actions,
}) => {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, width: '100%' }}>
        <IconButton icon={<Icons.ChevronLeft />} onClick={() => onBack()} style={{ background: 'rgba(255,255,255,0.82)', border: 'none' }} />
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{actions}</div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'flex-end', gap: 'clamp(10px, 2.4vw, 18px)', marginBottom: 18, width: '100%', minWidth: 0 }}>
        <div style={{ width: 'clamp(92px, 24vw, 140px)', aspectRatio: '150 / 214', borderRadius: 'clamp(18px, 4vw, 26px)', overflow: 'hidden', background: '#F3F4F6', boxShadow: '0 12px 30px rgba(15,23,42,0.24)', flexShrink: 0 }}>
          {posterUrl ? (
            <img src={posterUrl} alt={posterAlt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{posterFallback}</div>
          )}
        </div>

        <div style={{ flex: '1 1 0%', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 10, paddingBottom: 6 }}>
          {isEditMode ? (
            <input
              value={title}
              onChange={(e) => onTitleChange?.(e.target.value)}
              placeholder={titlePlaceholder}
              style={{ width: '100%', fontSize: 24, fontWeight: 800, color: '#fff', textAlign: 'left', background: 'transparent', border: 'none', outline: 'none', padding: 0 }}
            />
          ) : (
            <div style={{ fontSize: 'clamp(17px, 4.8vw, 34px)', lineHeight: 1.08, fontWeight: 800, color: '#fff', textShadow: '0 8px 24px rgba(15,23,42,0.35)', wordBreak: 'break-word' }}>
              {title || titlePlaceholder}
            </div>
          )}

          {subtitle ? <div>{subtitle}</div> : null}

          {tags ? (
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              {tags}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};
