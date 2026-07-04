import React from 'react';
import { theme } from '@/components/common/theme';
import { Icons } from '@/components/common/IconButton';
import { getAnimeStatusColor } from '@/utils/animeStatusHelpers';
import { NativeDateTimeInput, centeredNativeDateTimeInputStyle } from '@/components/common/nativeDateInput';

export const inputStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  minHeight: 54,
  borderRadius: 18,
  border: '1px solid rgba(15,23,42,0.08)',
  background: 'rgba(255,255,255,0.85)',
  padding: '0 16px',
  fontSize: 15,
  color: theme.colors.text,
  outline: 'none',
};

export const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  paddingRight: 44,
  appearance: 'auto',
  WebkitAppearance: 'menulist',
};

export const nativeDateInputStyle: React.CSSProperties = {
  ...inputStyle,
  ...centeredNativeDateTimeInputStyle,
  colorScheme: 'light',
  WebkitAppearance: 'none',
  appearance: 'none',
};

export const sectionCardStyle: React.CSSProperties = {
  marginBottom: 14,
  minWidth: 0,
  maxWidth: '100%',
  boxSizing: 'border-box',
  overflow: 'hidden',
};

export const infoGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))',
  gap: 16,
  minWidth: 0,
  maxWidth: '100%',
};

export const infoItemStyle: React.CSSProperties = {
  minWidth: 0,
  wordBreak: 'break-word',
};

export const chipWrapStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
};

export const responsiveTwoColumnStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 10,
  marginBottom: 14,
};

export const CollapseChevron: React.FC<{ open: boolean }> = ({ open }) => (
  <Icons.ChevronLeft
    style={{
      width: 18,
      height: 18,
      color: theme.colors.textWeak,
      transform: open ? 'rotate(-90deg)' : 'rotate(180deg)',
      transition: 'transform 0.2s ease',
    }}
  />
);

export const Input: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  type?: string;
}> = ({ value, onChange, placeholder, readOnly, type = 'text' }) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    readOnly={readOnly}
    type={type}
    style={inputStyle}
  />
);

export const TextArea: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  rows?: number;
}> = ({ value, onChange, placeholder, readOnly, rows = 4 }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    readOnly={readOnly}
    rows={rows}
    style={{ ...inputStyle, padding: '16px', resize: 'vertical', fontFamily: 'inherit' }}
  />
);

export const DateField: React.FC<{
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = '未設定' }) => (
  <NativeDateTimeInput
    type="date"
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    style={nativeDateInputStyle}
  />
);

export const StatusPill: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) return null;
  const color = getAnimeStatusColor(status);
  return (
    <span style={{
      display: 'inline-flex',
      marginTop: 6,
      background: `${color}22`,
      color,
      padding: '5px 10px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 900
    }}>
      {status}
    </span>
  );
};
