import React from 'react';
import { theme } from '@/components/common/theme';

interface NativeDateTimePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  mode?: 'date' | 'time' | 'datetime';
  showTime?: boolean;
  timeOnly?: boolean;
  style?: React.CSSProperties;
}

const nativeInputStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  minHeight: 44,
  borderRadius: 14,
  border: '1px solid rgba(15,23,42,0.08)',
  background: 'rgba(255,255,255,0.9)',
  padding: '0 12px',
  fontSize: 14,
  fontWeight: 700,
  color: theme.colors.text,
  outline: 'none',
  colorScheme: 'light',
  WebkitAppearance: 'none',
  appearance: 'none',
};

const toNativeDateTimeValue = (value?: string) => (value ? value.replace(' ', 'T').slice(0, 16) : '');
const fromNativeDateTimeValue = (value: string) => (value ? value.replace('T', ' ') : '');

export const WheelDateTimePicker: React.FC<NativeDateTimePickerProps> = ({
  value,
  onChange,
  placeholder = '未設定',
  disabled = false,
  mode,
  showTime = false,
  timeOnly = false,
  style,
}) => {
  const inputType = timeOnly || mode === 'time' ? 'time' : showTime || mode === 'datetime' ? 'datetime-local' : 'date';
  const inputValue = inputType === 'datetime-local'
    ? toNativeDateTimeValue(value)
    : inputType === 'time'
      ? (value || '').slice(0, 5)
      : (value || '').slice(0, 10);

  return (
    <input
      type={inputType}
      value={inputValue}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(inputType === 'datetime-local' ? fromNativeDateTimeValue(e.target.value) : e.target.value)}
      style={{ ...nativeInputStyle, opacity: disabled ? 0.65 : 1, ...style }}
    />
  );
};

export const WheelDatePicker: React.FC<Omit<NativeDateTimePickerProps, 'mode' | 'showTime' | 'timeOnly'>> = (props) => (
  <WheelDateTimePicker {...props} mode="date" />
);

export const WheelTimePicker: React.FC<Omit<NativeDateTimePickerProps, 'mode' | 'showTime' | 'timeOnly'>> = (props) => (
  <WheelDateTimePicker {...props} mode="time" />
);
