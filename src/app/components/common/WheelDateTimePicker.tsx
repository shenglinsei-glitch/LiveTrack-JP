import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '@/components/common/IconButton';
import { theme } from '@/components/common/theme';

type PickerMode = 'date' | 'time' | 'datetime';

interface WheelDateTimePickerProps {
  value?: string | null;
  onChange: (value: string) => void;
  mode?: PickerMode;
  showTime?: boolean;
  timeOnly?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  disabled?: boolean;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const isValidDateParts = (year: number, month: number, day: number) => {
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
};
const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

const parsePickerValue = (value: string | null | undefined, mode: PickerMode) => {
  const now = new Date();
  const fallback = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: 12,
    minute: 0,
  };

  const raw = (value || '').trim();
  if (!raw) return fallback;

  if (mode === 'time') {
    const match = raw.match(/^(\d{1,2}):(\d{1,2})/);
    if (!match) return fallback;
    return {
      ...fallback,
      hour: clamp(Number(match[1]), 0, 23),
      minute: clamp(Math.round(Number(match[2]) / 5) * 5, 0, 55),
    };
  }

  const [datePart, timePart] = raw.replace('T', ' ').split(' ');
  const dateMatch = datePart?.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  const timeMatch = timePart?.match(/^(\d{1,2}):(\d{1,2})/);

  if (!dateMatch) return fallback;

  const year = Number(dateMatch[1]);
  const month = clamp(Number(dateMatch[2]), 1, 12);
  const maxDay = daysInMonth(year, month);
  const day = clamp(Number(dateMatch[3]), 1, maxDay);

  return {
    year,
    month,
    day,
    hour: timeMatch ? clamp(Number(timeMatch[1]), 0, 23) : fallback.hour,
    minute: timeMatch ? clamp(Math.round(Number(timeMatch[2]) / 5) * 5, 0, 55) : fallback.minute,
  };
};

const formatValue = (parts: ReturnType<typeof parsePickerValue>, mode: PickerMode) => {
  const date = `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
  const time = `${pad2(parts.hour)}:${pad2(parts.minute)}`;
  if (mode === 'time') return time;
  if (mode === 'datetime') return `${date} ${time}`;
  return date;
};

const formatDisplay = (value: string | null | undefined, mode: PickerMode, placeholder = '未設定') => {
  const raw = (value || '').trim();
  if (!raw) return placeholder;
  if (mode === 'time') return raw.slice(0, 5);
  const [datePart, timePart] = raw.replace('T', ' ').split(' ');
  const match = datePart?.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!match) return raw;
  const dateLabel = `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
  return mode === 'datetime' && timePart ? `${dateLabel} ${timePart.slice(0, 5)}` : dateLabel;
};

const optionStyle = (selected: boolean): React.CSSProperties => ({
  height: 42,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  background: 'transparent',
  color: selected ? theme.colors.text : theme.colors.textWeak,
  fontSize: selected ? 23 : 18,
  fontWeight: selected ? 900 : 700,
  opacity: selected ? 1 : 0.45,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});

const WheelColumn = ({
  values,
  value,
  suffix,
  onChange,
  ariaLabel,
}: {
  values: number[];
  value: number;
  suffix: string;
  onChange: (value: number) => void;
  ariaLabel: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const index = values.indexOf(value);
    if (index >= 0 && ref.current) {
      ref.current.scrollTo({ top: Math.max(0, index * 42), behavior: 'smooth' });
    }
  }, [value, values]);

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={ariaLabel}
      style={{
        position: 'relative',
        flex: 1,
        minWidth: 0,
        height: 210,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        scrollSnapType: 'y mandatory',
        WebkitOverflowScrolling: 'touch',
        padding: '84px 0',
        scrollbarWidth: 'none',
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)',
      }}
    >
      {values.map((item) => {
        const selected = item === value;
        return (
          <button
            key={item}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onChange(item)}
            style={{ ...optionStyle(selected), width: '100%', scrollSnapAlign: 'center' }}
          >
            {item}{suffix}
          </button>
        );
      })}
    </div>
  );
};

export const WheelDateTimePicker: React.FC<WheelDateTimePickerProps> = ({
  value,
  onChange,
  mode,
  showTime = false,
  timeOnly = false,
  placeholder = '未設定',
  readOnly = false,
  disabled = false,
}) => {
  const resolvedMode: PickerMode = mode || (timeOnly ? 'time' : showTime ? 'datetime' : 'date');
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(() => parsePickerValue(value, resolvedMode));
  const isInactive = readOnly || disabled;

  useEffect(() => {
    if (isOpen) setDraft(parsePickerValue(value, resolvedMode));
  }, [isOpen, value, resolvedMode]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, [isOpen]);

  const thisYear = new Date().getFullYear();
  const parsedYear = parsePickerValue(value, resolvedMode).year;
  const minYear = Math.min(thisYear - 10, parsedYear - 2);
  const maxYear = Math.max(thisYear + 10, parsedYear + 2);
  const years = useMemo(() => Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i), [minYear, maxYear]);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const days = useMemo(() => Array.from({ length: daysInMonth(draft.year, draft.month) }, (_, i) => i + 1), [draft.year, draft.month]);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 12 }, (_, i) => i * 5), []);

  const updateDraft = (updates: Partial<typeof draft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...updates };
      const maxDay = daysInMonth(next.year, next.month);
      if (!isValidDateParts(next.year, next.month, next.day) || next.day > maxDay) next.day = maxDay;
      return next;
    });
  };

  const confirm = () => {
    onChange(formatValue(draft, resolvedMode));
    setIsOpen(false);
  };

  const clear = () => {
    onChange('');
    setIsOpen(false);
  };

  const hasValue = !!(value || '').trim();

  return (
    <>
      <button
        type="button"
        disabled={isInactive}
        onClick={() => !isInactive && setIsOpen(true)}
        style={{
          width: '100%',
          minWidth: 0,
          minHeight: 44,
          boxSizing: 'border-box',
          padding: '10px 12px',
          borderRadius: 14,
          border: '1px solid rgba(0,0,0,0.08)',
          background: isInactive ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.92)',
          color: hasValue ? theme.colors.text : theme.colors.textWeak,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          fontSize: 14,
          fontWeight: 800,
          textAlign: 'left',
          cursor: isInactive ? 'default' : 'pointer',
        }}
      >
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {formatDisplay(value, resolvedMode, placeholder)}
        </span>
        {resolvedMode === 'date' ? <Icons.Calendar style={{ width: 16, height: 16, opacity: 0.72 }} /> : <Icons.Clock style={{ width: 16, height: 16, opacity: 0.72 }} />}
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setIsOpen(false)}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.34)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: 'min(430px, calc(100vw - 32px))',
              maxWidth: 'calc(100vw - 32px)',
              borderRadius: 28,
              background: 'rgba(255,255,255,0.96)',
              border: '1px solid rgba(255,255,255,0.7)',
              boxShadow: '0 28px 90px rgba(15,23,42,0.24)',
              padding: 18,
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <button type="button" onClick={clear} style={topButtonStyle}>クリア</button>
              <div style={{ fontSize: 13, fontWeight: 900, color: theme.colors.textSecondary }}>
                {resolvedMode === 'time' ? '時間を選択' : resolvedMode === 'datetime' ? '日時を選択' : '日付を選択'}
              </div>
              <button type="button" onClick={confirm} style={{ ...topButtonStyle, color: theme.colors.primary }}>確定</button>
            </div>

            <div style={{ position: 'relative', borderRadius: 22, background: 'rgba(248,250,252,0.62)', padding: resolvedMode === 'datetime' ? '4px 0 12px' : '10px 0' }}>
              <div style={{ position: 'absolute', left: 10, right: 10, top: 94, height: 42, borderRadius: 999, background: 'rgba(83,190,232,0.12)', border: '1px solid rgba(83,190,232,0.16)', pointerEvents: 'none' }} />
              {resolvedMode !== 'time' && (
                <div style={{ display: 'flex', gap: 2, position: 'relative', zIndex: 1 }}>
                  <WheelColumn ariaLabel="年" values={years} value={draft.year} suffix="年" onChange={(year) => updateDraft({ year })} />
                  <WheelColumn ariaLabel="月" values={months} value={draft.month} suffix="月" onChange={(month) => updateDraft({ month })} />
                  <WheelColumn ariaLabel="日" values={days} value={draft.day} suffix="日" onChange={(day) => updateDraft({ day })} />
                </div>
              )}

              {resolvedMode === 'datetime' && (
                <div style={{ height: 1, background: 'rgba(15,23,42,0.08)', margin: '8px 18px 2px' }} />
              )}

              {resolvedMode !== 'date' && (
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 2, maxWidth: 260, margin: resolvedMode === 'datetime' ? '0 auto' : '0 auto' }}>
                  <WheelColumn ariaLabel="時" values={hours} value={draft.hour} suffix="時" onChange={(hour) => updateDraft({ hour })} />
                  <WheelColumn ariaLabel="分" values={minutes} value={draft.minute} suffix="分" onChange={(minute) => updateDraft({ minute })} />
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

const topButtonStyle: React.CSSProperties = {
  border: 'none',
  background: 'rgba(255,255,255,0.74)',
  borderRadius: 999,
  padding: '9px 14px',
  color: theme.colors.textSecondary,
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
  boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
};

export const WheelDatePicker: React.FC<Omit<WheelDateTimePickerProps, 'mode' | 'showTime' | 'timeOnly'>> = (props) => (
  <WheelDateTimePicker {...props} mode="date" />
);

export const WheelTimePicker: React.FC<Omit<WheelDateTimePickerProps, 'mode' | 'showTime' | 'timeOnly'>> = (props) => (
  <WheelDateTimePicker {...props} mode="time" />
);
