import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';

import { theme } from '../../ui/theme';
import { GlassCard } from '../../ui/GlassCard';
import { Exhibition, ExhibitionTicketSalesStatus } from '../../domain/types';
import { Icons } from '../../ui/IconButton';

// --- Fixed Modal Style Date Picker for Exhibition Detail Page ---
const CustomExhibitionDatePicker = ({
  value,
  onChange,
  showTime = false,
  placeholder = '未設定',
}: {
  value: string | null | undefined;
  onChange: (val: string) => void;
  showTime?: boolean;
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const valStr = value || '';
  const initialDateStr = valStr === 'TBD' || !valStr ? '' : valStr.split(' ')[0];
  const initialTimeStr = showTime && valStr && valStr.includes(' ') ? valStr.split(' ')[1] : '12:00';

  const [viewDate, setViewDate] = useState(initialDateStr ? dayjs(initialDateStr) : dayjs());
  const [selectedTime, setSelectedTime] = useState(initialTimeStr);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const calendarDays = useMemo(() => {
    const first = viewDate.startOf('month').day();
    const count = viewDate.daysInMonth();
    const days: Array<number | null> = [];
    for (let i = 0; i < first; i++) days.push(null);
    for (let i = 1; i <= count; i++) days.push(i);
    return days;
  }, [viewDate]);

  const handleSelectDay = (day: number) => {
    const datePart = viewDate.date(day).format('YYYY-MM-DD');
    if (showTime) {
      onChange(`${datePart} ${selectedTime}`);
    } else {
      onChange(datePart);
      setIsOpen(false);
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minuteOptions = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => setIsOpen(true)}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: '10px',
          border: '1px solid rgba(0,0,0,0.08)',
          background: 'white',
          fontSize: '14px',
          outline: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '40px',
        }}
      >
        <span style={{ color: !valStr ? theme.colors.textWeak : 'inherit' }}>
          {valStr ? valStr.replace(/-/g, '/') : placeholder}
        </span>
        {showTime ? <Icons.Clock style={{ width: 16 }} /> : <Icons.Calendar style={{ width: 16 }} />}
      </div>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 5000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
              }}
              onClick={() => setIsOpen(false)}
            />

            <GlassCard
              padding="20px"
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '340px',
                zIndex: 5001,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                borderRadius: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <button type="button" onClick={() => setViewDate(viewDate.subtract(1, 'month'))} style={navBtnStyle}>
                  ◀
                </button>
                <div style={{ fontWeight: 900, fontSize: '15px' }}>{viewDate.format('YYYY年 M月')}</div>
                <button type="button" onClick={() => setViewDate(viewDate.add(1, 'month'))} style={navBtnStyle}>
                  ▶
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
                {['日', '月', '火', '水', '木', '金', '土'].map((d) => (
                  <div
                    key={d}
                    style={{ fontSize: '11px', fontWeight: 800, color: theme.colors.textWeak, paddingBottom: '8px' }}
                  >
                    {d}
                  </div>
                ))}
                {calendarDays.map((day, i) => {
                  const isSelected = day && initialDateStr === viewDate.date(day).format('YYYY-MM-DD');
                  return (
                    <div
                      key={i}
                      onClick={() => day && handleSelectDay(day)}
                      style={{
                        padding: '10px 0',
                        fontSize: '14px',
                        borderRadius: '10px',
                        cursor: day ? 'pointer' : 'default',
                        background: isSelected ? theme.colors.primary : 'transparent',
                        color: isSelected ? 'white' : theme.colors.textMain,
                        opacity: day ? 1 : 0,
                        fontWeight: isSelected ? 900 : 600,
                      }}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>

              {showTime && (
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '16px', marginTop: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      value={selectedTime.split(':')[0]}
                      onChange={(e) => {
                        const nextTime = `${e.target.value}:${selectedTime.split(':')[1]}`;
                        setSelectedTime(nextTime);
                        if (initialDateStr) onChange(`${initialDateStr} ${nextTime}`);
                      }}
                      style={selectTimeStyle}
                    >
                      {hours.map((h) => (
                        <option key={h} value={h}>
                          {h}時
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedTime.split(':')[1]}
                      onChange={(e) => {
                        const nextTime = `${selectedTime.split(':')[0]}:${e.target.value}`;
                        setSelectedTime(nextTime);
                        if (initialDateStr) onChange(`${initialDateStr} ${nextTime}`);
                      }}
                      style={selectTimeStyle}
                    >
                      {minuteOptions.map((m) => (
                        <option key={m} value={m}>
                          {m}分
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                  }}
                  style={ghostBtn}
                >
                  クリア
                </button>
                <button type="button" onClick={() => setIsOpen(false)} style={primaryBtn}>
                  閉じる
                </button>
              </div>
            </GlassCard>
          </div>,
          document.body
        )}
    </div>
  );
};

const navBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 999,
  border: '1px solid rgba(0,0,0,0.08)',
  background: 'white',
  cursor: 'pointer',
  fontWeight: 900,
};

const selectTimeStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid rgba(0,0,0,0.08)',
  background: 'white',
  fontSize: '14px',
};

const primaryBtn: React.CSSProperties = {
  flex: 1,
  height: 40,
  borderRadius: 14,
  border: '1px solid rgba(0,0,0,0.08)',
  background: theme.colors.primary,
  color: 'white',
  fontWeight: 900,
  cursor: 'pointer',
};

const ghostBtn: React.CSSProperties = {
  flex: 1,
  height: 40,
  borderRadius: 14,
  border: '1px solid rgba(0,0,0,0.08)',
  background: 'white',
  color: theme.colors.textMain,
  fontWeight: 800,
  cursor: 'pointer',
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 12, fontWeight: 900, color: theme.colors.textWeak, marginBottom: 6, letterSpacing: '0.02em' }}>
    {children}
  </div>
);

const SectionTitle = ({ title }: { title: string }) => (
  <div style={{ marginTop: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{ width: 6, height: 6, borderRadius: 999, background: theme.colors.primary }} />
    <div style={{ fontSize: 12, fontWeight: 900, color: theme.colors.primary, letterSpacing: '0.05em' }}>{title}</div>
  </div>
);

const TextInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    style={{
      width: '100%',
      padding: '10px 12px',
      borderRadius: 10,
      border: '1px solid rgba(0,0,0,0.08)',
      background: 'white',
      fontSize: 14,
      outline: 'none',
      ...props.style,
    }}
  />
);

const TextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    style={{
      width: '100%',
      padding: '10px 12px',
      borderRadius: 10,
      border: '1px solid rgba(0,0,0,0.08)',
      background: 'white',
      fontSize: 14,
      outline: 'none',
      minHeight: 96,
      resize: 'vertical',
      ...props.style,
    }}
  />
);

const Checkbox = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span style={{ fontSize: 13, color: theme.colors.textMain, fontWeight: 700 }}>{label}</span>
  </label>
);

const Select = ({
  value,
  onChange,
  options,
  style,
}: {
  value: any;
  onChange: (v: any) => void;
  options: Array<{ value: any; label: React.ReactNode }>;
  style?: React.CSSProperties;
}) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{
      width: '100%',
      padding: '10px 12px',
      borderRadius: 10,
      border: '1px solid rgba(0,0,0,0.08)',
      background: 'white',
      fontSize: 14,
      outline: 'none',
      ...style,
    }}
  >
    {options.map((o) => (
      <option key={String(o.value)} value={o.value}>
        {typeof o.label === 'string' ? o.label : String(o.value)}
      </option>
    ))}
  </select>
);

const TimeRange = ({
  start,
  end,
  onChange,
}: {
  start?: string;
  end?: string;
  onChange: (next: { start?: string; end?: string }) => void;
}) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
    <TextInput type="time" value={start || ''} onChange={(e) => onChange({ start: e.target.value || undefined })} />
    <TextInput type="time" value={end || ''} onChange={(e) => onChange({ end: e.target.value || undefined })} />
  </div>
);

export const ExhibitionInfoSection = ({
  exhibition,
  onChange,
  allExhibitions,
}: {
  exhibition: Exhibition;
  onChange: (patch: Partial<Exhibition>) => void;
  allExhibitions: Exhibition[];
}) => {
  const areaOptions = useMemo(() => {
    const set = new Set<string>();
    for (const ex of allExhibitions) {
      if (ex.area) set.add(ex.area);
    }
    return Array.from(set).sort();
  }, [allExhibitions]);

  const venueOptions = useMemo(() => {
    const set = new Set<string>();
    for (const ex of allExhibitions) {
      const v = ex.venueName || ex.venue;
      if (v) set.add(v);
    }
    return Array.from(set).sort();
  }, [allExhibitions]);

  const ticketStatusOptions: Array<{ label: string; value: ExhibitionTicketSalesStatus } | { label: string; value: 'none' }> = [
    { label: 'なし', value: 'none' },
    { label: '販売前', value: 'before_sale' },
    { label: '未購入', value: 'not_purchased' },
    { label: '購入済', value: 'purchased' },
  ];

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <SectionTitle title="基本" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <Label>開始日</Label>
          <CustomExhibitionDatePicker value={exhibition.startDate} onChange={(v) => onChange({ startDate: v })} placeholder="開始日" />
        </div>
        <div>
          <Label>終了日</Label>
          <CustomExhibitionDatePicker value={exhibition.endDate} onChange={(v) => onChange({ endDate: v })} placeholder="終了日" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <Label>エリア</Label>
          <TextInput value={exhibition.area || ''} onChange={(e) => onChange({ area: e.target.value })} list="exhibition-area-options" placeholder="エリア" />
          <datalist id="exhibition-area-options">
            {areaOptions.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>
        <div>
          <Label>会場名</Label>
          <TextInput
            value={exhibition.venueName || exhibition.venue || ''}
            onChange={(e) => onChange({ venueName: e.target.value })}
            list="exhibition-venue-options"
            placeholder="会場名"
          />
          <datalist id="exhibition-venue-options">
            {venueOptions.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </div>
      </div>

      <SectionTitle title="ステータス・チケット" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <Label>参戦日時</Label>
          <CustomExhibitionDatePicker
            showTime
            value={exhibition.visitedAt}
            placeholder="参戦日時"
            onChange={(v) => onChange({ visitedAt: v })}
          />
          {exhibition.visitedAt && (
            <button type="button" onClick={() => onChange({ visitedAt: undefined })} style={{ ...linkBtn, marginTop: 6 }}>
              記録解除
            </button>
          )}
        </div>
        <div>
          <Label>チケット状態</Label>
          <Select
            value={(exhibition.ticketSalesStatus || 'none') as any}
            onChange={(v) => onChange({ ticketSalesStatus: v as ExhibitionTicketSalesStatus })}
            options={ticketStatusOptions as any}
          />
          {exhibition.ticketSalesStatus === 'before_sale' && (
            <div style={{ marginTop: 8 }}>
              <Label>発売開始</Label>
              <CustomExhibitionDatePicker
                showTime
                value={exhibition.saleStartAt}
                placeholder="発売開始"
                onChange={(v) => onChange({ saleStartAt: v })}
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <Label>公式サイトURL</Label>
        <TextInput value={exhibition.websiteUrl || ''} onChange={(e) => onChange({ websiteUrl: e.target.value })} placeholder="https://..." />
      </div>

      <SectionTitle title="開館時間" />
      <Checkbox
        checked={!!exhibition.holidaySameAsWeekday}
        onChange={(v) => onChange({ holidaySameAsWeekday: v })}
        label="休日は平日と同じ"
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <Label>平日</Label>
          <TimeRange
            start={exhibition.weekdayStartTime}
            end={exhibition.weekdayEndTime}
            onChange={(t) => onChange({ weekdayStartTime: t.start ?? exhibition.weekdayStartTime, weekdayEndTime: t.end ?? exhibition.weekdayEndTime })}
          />
        </div>
        {!exhibition.holidaySameAsWeekday && (
          <div>
            <Label>休日</Label>
            <TimeRange
              start={exhibition.holidayStartTime}
              end={exhibition.holidayEndTime}
              onChange={(t) => onChange({ holidayStartTime: t.start ?? exhibition.holidayStartTime, holidayEndTime: t.end ?? exhibition.holidayEndTime })}
            />
          </div>
        )}
      </div>

      <SectionTitle title="料金設定" />
      <Checkbox
        checked={!!exhibition.holidayPriceSameAsWeekday}
        onChange={(v) => onChange({ holidayPriceSameAsWeekday: v })}
        label="休日は平日と同じ"
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <Label>平日料金</Label>
          <TextInput
            type="number"
            value={exhibition.weekdayPrice ?? ''}
            onChange={(e) => onChange({ weekdayPrice: e.target.value === '' ? undefined : Number(e.target.value) })}
            placeholder="平日料金"
          />
        </div>
        {!exhibition.holidayPriceSameAsWeekday && (
          <div>
            <Label>休日料金</Label>
            <TextInput
              type="number"
              value={exhibition.holidayPrice ?? ''}
              onChange={(e) => onChange({ holidayPrice: e.target.value === '' ? undefined : Number(e.target.value) })}
              placeholder="休日料金"
            />
          </div>
        )}
      </div>

      <SectionTitle title="予約設定" />
      <Checkbox checked={!!exhibition.needsReservation} onChange={(v) => onChange({ needsReservation: v })} label="予約が必要" />
      {exhibition.needsReservation && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <Label>受付開始</Label>
            <CustomExhibitionDatePicker
              showTime
              value={exhibition.reservationStartAt}
              placeholder="受付開始"
              onChange={(v) => {
                const nextStart = v;
                let nextEnd = exhibition.reservationEndAt;
                if (nextStart && nextEnd && dayjs(nextEnd).isBefore(dayjs(nextStart))) {
                  nextEnd = nextStart;
                }
                onChange({ reservationStartAt: nextStart, reservationEndAt: nextEnd });
              }}
            />
          </div>
          <div>
            <Label>受付終了</Label>
            <CustomExhibitionDatePicker
              showTime
              value={exhibition.reservationEndAt}
              placeholder="受付終了"
              onChange={(v) => {
                const nextEnd = v;
                let nextStart = exhibition.reservationStartAt;
                if (nextStart && nextEnd && dayjs(nextStart).isAfter(dayjs(nextEnd))) {
                  nextStart = nextEnd;
                }
                onChange({ reservationStartAt: nextStart, reservationEndAt: nextEnd });
              }}
            />
          </div>
        </div>
      )}

      <SectionTitle title="メモ" />
      <TextArea value={exhibition.description || ''} onChange={(e) => onChange({ description: e.target.value })} placeholder="メモ / 注意事項" />
    </div>
  );
};

const linkBtn: React.CSSProperties = {
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: theme.colors.error,
  cursor: 'pointer',
  fontWeight: 800,
  fontSize: 12,
};
