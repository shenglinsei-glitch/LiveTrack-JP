import React from 'react';

export type NativeDateTimeInputType = 'date' | 'time' | 'datetime-local';

export const centeredNativeDateTimeInputStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 'normal',
  fontVariantNumeric: 'tabular-nums',
};

export const toNativeDateTimeValue = (value?: string | null) => (value ? value.replace(' ', 'T').slice(0, 16) : '');
export const fromNativeDateTimeValue = (value: string) => (value ? value.replace('T', ' ') : '');

export const getNativeDateTimeValue = (type: NativeDateTimeInputType, value?: string | null) => {
  if (type === 'datetime-local') return toNativeDateTimeValue(value);
  if (type === 'time') return (value || '').slice(0, 5);
  return (value || '').slice(0, 10);
};

export const parseNativeDateTimeValue = (type: NativeDateTimeInputType, value: string) => (
  type === 'datetime-local' ? fromNativeDateTimeValue(value) : value
);

export const createNativeDateTimeChangeHandler = (
  type: NativeDateTimeInputType,
  onChange: (value: string) => void,
) => (event: React.ChangeEvent<HTMLInputElement> | React.FormEvent<HTMLInputElement>) => {
  onChange(parseNativeDateTimeValue(type, event.currentTarget.value));
};

type NativeDateTimeInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'onInput'
> & {
  type: NativeDateTimeInputType;
  value?: string | null;
  onChange: (value: string) => void;
  containerStyle?: React.CSSProperties;
  allowClear?: boolean;
  clearLabel?: string;
};

const nativeDateTimeContainerStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
};

const clearButtonStyle: React.CSSProperties = {
  position: 'absolute',
  right: 8,
  top: '50%',
  transform: 'translateY(-50%)',
  height: 28,
  minWidth: 54,
  border: 'none',
  borderRadius: 999,
  padding: '0 10px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(83, 190, 232, 0.18)',
  color: '#53BEE8',
  fontSize: 12,
  fontWeight: 900,
  lineHeight: 1,
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
  zIndex: 2,
};

export const NativeDateTimeInput: React.FC<NativeDateTimeInputProps> = ({
  type,
  value,
  onChange,
  style,
  containerStyle,
  allowClear = true,
  clearLabel = 'リセット',
  disabled,
  readOnly,
  onBlur,
  ...inputProps
}) => {
  const inputValue = getNativeDateTimeValue(type, value);
  const handleDateTimeChange = createNativeDateTimeChangeHandler(type, onChange);
  const canClear = Boolean(allowClear && inputValue && !disabled && !readOnly);

  const handleBlur: React.FocusEventHandler<HTMLInputElement> = (event) => {
    onChange(parseNativeDateTimeValue(type, event.currentTarget.value));
    onBlur?.(event);
  };

  const handleClear: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onChange('');
  };

  const mergedInputStyle: React.CSSProperties = {
    ...centeredNativeDateTimeInputStyle,
    ...style,
    paddingRight: canClear ? 76 : style?.paddingRight,
  };

  return React.createElement(
    'div',
    { style: { ...nativeDateTimeContainerStyle, ...containerStyle } },
    React.createElement('input', {
      ...inputProps,
      type,
      value: inputValue,
      disabled,
      readOnly,
      onInput: handleDateTimeChange,
      onChange: handleDateTimeChange,
      onBlur: handleBlur,
      style: mergedInputStyle,
    }),
    canClear
      ? React.createElement(
          'button',
          {
            type: 'button',
            'aria-label': '日時をリセット',
            onMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault(),
            onClick: handleClear,
            style: clearButtonStyle,
          },
          clearLabel,
        )
      : null,
  );
};
