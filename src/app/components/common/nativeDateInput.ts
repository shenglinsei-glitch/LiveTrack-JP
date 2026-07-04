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
