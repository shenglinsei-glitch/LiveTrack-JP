
import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { theme } from '../../ui/theme';
import { GlassCard } from '../../ui/GlassCard';
import { Exhibition, ExhibitionOverallStatus, ExhibitionTicketSalesStatus } from '../../domain/types';
import { Icons } from '../../ui/IconButton';
import {
  Select,
  Input,
  Checkbox,
  TimePicker,
  DatePicker,
  Button,
  InputNumber,
  Divider,
  Typography,
  Space,
  Tag
} from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

// --- Fixed Modal Style Date Picker for Exhibition Detail Page ---
const CustomExhibitionDatePicker = ({
  value,
  onChange,
  showTime = false,
  placeholder = '未設定'
}: {
  value: string | null | undefined;
  onChange: (val: string) => void;
  showTime?: boolean;
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const valStr = value || '';
  const initialDateStr = valStr === 'TBD' || !valStr ? '' : valStr.split(' ')[0];
  const initialTimeStr = showTime && valStr && valStr.includes(' ') ? valStr.split('12:00')[1] : '12:00';

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
          minHeight: '40px'
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
              padding: '16px'
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)'
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
                borderRadius: '24px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <button type="button" onClick={() => setViewDate(viewDate.subtract(1, 'month'))} style={navBtnStyle}>
                  ◀
                </button>
                <div style={{ fontWeight: '900', fontSize: '15px' }}>{viewDate.format('YYYY年 M月')}</div>
                <button type="button" onClick={() => setViewDate(viewDate.add(1, 'month'))} style={navBtnStyle}>
                  ▶
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
                {['日', '月', '火', '水', '木', '金', '土'].map((d) => (
                  <div
                    key={d}
                    style={{ fontSize: '11px', fontWeight: '800', color: theme.colors.textWeak, paddingBottom: '8px' }}
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
                        fontWeight: isSelected ? '900' : '600'
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
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'rgba(0,0,0,0.05)',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    color: theme.colors.textSecondary
                  }}
                >
                  クリア
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: theme.colors.primary,
                    color: 'white',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '13px'
                  }}
                >
                  確定
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
  border: 'none',
  background: 'none',
  padding: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  color: theme.colors.primary
};

const selectTimeStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px',
  borderRadius: '10px',
  border: '1px solid rgba(0,0,0,0.1)',
  background: 'white',
  fontSize: '14px',
  outline: 'none',
  fontWeight: '600'
};

interface Props {
  exhibition: Exhibition;
  allExhibitions: Exhibition[];
  isEditMode: boolean;
  onChange: (updates: Partial<Exhibition>) => void;
}

export const ExhibitionInfoSection: React.FC<Props> = ({ exhibition, allExhibitions, isEditMode, onChange }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const areaOptions = useMemo(() => {
    const areas = new Set<string>();
    for (const e of allExhibitions) {
      if (e.area) areas.add(e.area);
    }
    return Array.from(areas).sort();
  }, [allExhibitions]);

  const venueOptions = useMemo(() => {
    const venues = new Set<string>();
    for (const e of allExhibitions) {
      const v = e.venueName || (e as any).venue;
      if (v) venues.add(v);
    }
    return Array.from(venues).sort();
  }, [allExhibitions]);

  const Label = ({ children }: { children?: React.ReactNode }) => (
    <div
      style={{
        fontSize: '11px',
        fontWeight: '800',
        color: theme.colors.textWeak,
        marginBottom: '2px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}
    >
      {children}
    </div>
  );

  const Value = ({
    children,
    placeholder = '未設定',
    color = theme.colors.textMain
  }: {
    children?: React.ReactNode;
    placeholder?: string;
    color?: string;
  }) => (
    <div style={{ fontSize: '15px', fontWeight: '700', color: children ? color : theme.colors.textWeak }}>
      {children || placeholder}
    </div>
  );

  const SectionTitle = ({ title }: { title: string }) => (
    <div style={{ marginTop: '20px', marginBottom: '12px' }}>
      <Text strong style={{ fontSize: '12px', color: theme.colors.primary, letterSpacing: '0.05em' }}>
        {title}
      </Text>
      <Divider style={{ margin: '4px 0', borderColor: 'rgba(0,0,0,0.04)' }} />
    </div>
  );

  const ticketStatusLabels: Record<ExhibitionTicketSalesStatus, string> = {
    none: 'なし',
    before_sale: '販売前',
    not_purchased: '未購入',
    purchased: '購入済'
  };

  const ticketStatusColors: Record<ExhibitionTicketSalesStatus, string> = {
    none: '#9CA3AF',
    before_sale: '#F59E0B',
    not_purchased: '#9CA3AF',
    purchased: '#10B981'
  };

  return (
    <GlassCard padding="20px">
      <div 
        onClick={() => !isEditMode && setIsExpanded(!isExpanded)}
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          cursor: isEditMode ? 'default' : 'pointer',
          marginBottom: (isExpanded || isEditMode) ? '20px' : '0'
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: '900', margin: 0, color: theme.colors.primary }}>基本情報</h3>
        {!isEditMode && (
          <Icons.ChevronLeft 
            style={{ 
              width: 20, 
              height: 20, 
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
              transform: isExpanded ? 'rotate(270deg)' : 'rotate(180deg)',
              color: theme.colors.textSecondary
            }} 
          />
        )}
      </div>

      {(isExpanded || isEditMode) && (
        <>
          {isEditMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <Label>ポスター画像 (URL)</Label>
                <Input value={exhibition.imageUrl} onChange={(e) => onChange({ imageUrl: e.target.value })} placeholder="https://..." />
              </div>

              <div>
                <Label>会期</Label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <CustomExhibitionDatePicker
                    value={exhibition.startDate}
                    placeholder="開始日"
                    onChange={(v) => {
                      const nextStart = v;
                      let nextEnd = exhibition.endDate;
                      if (nextStart && nextEnd && dayjs(nextStart).isAfter(dayjs(nextEnd))) {
                        nextEnd = nextStart;
                      }
                      onChange({ startDate: nextStart, endDate: nextEnd });
                    }}
                  />
                  <CustomExhibitionDatePicker
                    value={exhibition.endDate}
                    placeholder="終了日"
                    onChange={(v) => {
                      const nextEnd = v;
                      let nextStart = exhibition.startDate;
                      if (nextEnd && nextStart && dayjs(nextEnd).isBefore(dayjs(nextStart))) {
                        nextStart = nextEnd;
                      }
                      onChange({ startDate: nextStart, endDate: nextEnd });
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <Label>エリア</Label>
                  <Input
                    value={exhibition.area}
                    onChange={(e) => onChange({ area: e.target.value })}
                    placeholder="エリアを入力/選択"
                    list="exhibition-area-options"
                  />
                  <datalist id="exhibition-area-options">
                    {areaOptions.map((a) => (
                      <option key={a} value={a} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label>会場名</Label>
                  <Input
                    value={exhibition.venueName || exhibition.venue}
                    onChange={(e) => onChange({ venueName: e.target.value })}
                    placeholder="会場名を入力/選択"
                    list="exhibition-venue-options"
                  />
                  <datalist id="exhibition-venue-options">
                    {venueOptions.map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                </div>
              </div>

              <SectionTitle title="ステータス・チケット" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <Label>参戦日時</Label>
                  <CustomExhibitionDatePicker showTime value={exhibition.visitedAt} placeholder="参戦日時" onChange={(v) => onChange({ visitedAt: v })} />
                  {exhibition.visitedAt && (
                    <Button size="small" danger type="text" onClick={() => onChange({ visitedAt: undefined })} style={{ padding: 0 }}>
                      记录解除
                    </Button>
                  )}
                </div>
                <div>
                  <Label>チケット状態</Label>
                  <Select
                    style={{ width: '100%' }}
                    value={exhibition.ticketSalesStatus || 'none'}
                    onChange={(v) => onChange({ ticketSalesStatus: v })}
                    getPopupContainer={() => document.body}
                    dropdownStyle={{ zIndex: 3000 }}
                    options={[
                      { label: 'なし', value: 'none' },
                      { label: '販売前', value: 'before_sale' },
                      { label: '未購入', value: 'not_purchased' },
                      { label: '購入済', value: 'purchased' }
                    ]}
                  />
                  {exhibition.ticketSalesStatus === 'before_sale' && (
                    <div style={{ marginTop: '8px' }}>
                      <Label>発売開始</Label>
                      <CustomExhibitionDatePicker showTime value={exhibition.saleStartAt} placeholder="発売開始" onChange={(v) => onChange({ saleStartAt: v })} />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>公式サイトURL</Label>
                <Input value={exhibition.websiteUrl} onChange={(e) => onChange({ websiteUrl: e.target.value })} placeholder="https://..." />
              </div>

              <SectionTitle title="開館時間" />
              <Checkbox checked={exhibition.holidaySameAsWeekday} onChange={(e) => onChange({ holidaySameAsWeekday: e.target.checked })}>
                休日は平日と同じ
              </Checkbox>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <TimePicker.RangePicker
                  format="HH:mm"
                  getPopupContainer={() => document.body}
                  dropdownStyle={{ zIndex: 3000 }}
                  style={{ width: '100%' }}
                  value={
                    exhibition.weekdayStartTime
                      ? [dayjs(`2000-01-01 ${exhibition.weekdayStartTime}`), dayjs(`2000-01-01 ${exhibition.weekdayEndTime}`)]
                      : null
                  }
                  onChange={(t) => onChange({ weekdayStartTime: t?.[0]?.format('HH:mm'), weekdayEndTime: t?.[1]?.format('HH:mm') })}
                  placeholder={['平日始', '終']}
                />
                {!exhibition.holidaySameAsWeekday && (
                  <TimePicker.RangePicker
                    format="HH:mm"
                    getPopupContainer={() => document.body}
                    dropdownStyle={{ zIndex: 3000 }}
                    style={{ width: '100%' }}
                    value={
                      exhibition.holidayStartTime
                        ? [dayjs(`2000-01-01 ${exhibition.holidayStartTime}`), dayjs(`2000-01-01 ${exhibition.holidayEndTime}`)]
                        : null
                    }
                    onChange={(t) => onChange({ holidayStartTime: t?.[0]?.format('HH:mm'), holidayEndTime: t?.[1]?.format('HH:mm') })}
                    placeholder={['休日始', '終']}
                  />
                )}
              </div>

              <SectionTitle title="料金設定" />
              <Checkbox checked={exhibition.holidayPriceSameAsWeekday} onChange={(e) => onChange({ holidayPriceSameAsWeekday: e.target.checked })}>
                休日は平日と同じ
              </Checkbox>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <InputNumber style={{ width: '100%' }} value={exhibition.weekdayPrice} onChange={(v) => onChange({ weekdayPrice: v || undefined })} placeholder="平日料金" />
                {!exhibition.holidayPriceSameAsWeekday && (
                  <InputNumber style={{ width: '100%' }} value={exhibition.holidayPrice} onChange={(v) => onChange({ holidayPrice: v || undefined })} placeholder="休日料金" />
                )}
              </div>

              <SectionTitle title="予約設定" />
              <Checkbox checked={exhibition.needsReservation} onChange={(e) => onChange({ needsReservation: e.target.checked })}>
                予約が必要
              </Checkbox>
              {exhibition.needsReservation && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <Label>受付開始</Label>
                    <CustomExhibitionDatePicker
                      showTime
                      value={exhibition.reservationStartAt}
                      placeholder="受付開始"
                      onChange={(v) => {
                        const nextStart = v;
                        let nextEnd = exhibition.reservationEndAt;
                        if (nextStart && nextEnd && dayjs(nextStart).isAfter(dayjs(nextEnd))) {
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
                        if (nextEnd && nextStart && dayjs(nextEnd).isBefore(dayjs(nextStart))) {
                          nextStart = nextEnd;
                        }
                        onChange({ reservationStartAt: nextStart, reservationEndAt: nextEnd });
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <Label>エリア</Label>
                  <Value>{exhibition.area}</Value>
                </div>
                <div>
                  <Label>会場名</Label>
                  <Value>{exhibition.venueName || exhibition.venue}</Value>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <Label>チケット状態</Label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <Tag
                      color={ticketStatusColors[exhibition.ticketSalesStatus || 'none']}
                      style={{
                        borderRadius: '6px',
                        border: 'none',
                        fontWeight: 800,
                        fontSize: '11px',
                        margin: 0,
                        padding: '0 8px',
                        width: 'fit-content'
                      }}
                    >
                      {ticketStatusLabels[exhibition.ticketSalesStatus || 'none']}
                    </Tag>
                    {exhibition.ticketSalesStatus === 'before_sale' && exhibition.saleStartAt && (
                      <div style={{ fontSize: '10px', color: theme.colors.textWeak, lineHeight: 1.2, fontWeight: 500 }}>
                        発売: {exhibition.saleStartAt.replace(/-/g, '/')}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label>参戦記録</Label>
                  <Value color={exhibition.visitedAt ? theme.colors.primary : undefined}>
                    {exhibition.visitedAt ? exhibition.visitedAt.replace(/-/g, '/').replace('T', ' ') : '未訪問'}
                  </Value>
                </div>
              </div>

              <SectionTitle title="開館時間" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <Label>平日</Label>
                  <Value>
                    {exhibition.weekdayStartTime && exhibition.weekdayEndTime
                      ? `${exhibition.weekdayStartTime} ～ ${exhibition.weekdayEndTime}`
                      : null}
                  </Value>
                </div>
                <div>
                  <Label>休日</Label>
                  {exhibition.holidaySameAsWeekday ? (
                    <Value color={theme.colors.textWeak}>
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>休日は平日と同じ</span>
                    </Value>
                  ) : (
                    <Value>
                      {exhibition.holidayStartTime && exhibition.holidayEndTime
                        ? `${exhibition.holidayStartTime} ～ ${exhibition.holidayEndTime}`
                        : null}
                    </Value>
                  )}
                </div>
              </div>

              <SectionTitle title="料金" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <Label>平日料金</Label>
                  <Value>{exhibition.weekdayPrice ? `${exhibition.weekdayPrice.toLocaleString()} 円` : null}</Value>
                </div>
                <div>
                  <Label>休日料金</Label>
                  {exhibition.holidayPriceSameAsWeekday ? (
                    <Value color={theme.colors.textWeak}>
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>休日は平日と同じ</span>
                    </Value>
                  ) : (
                    <Value>{exhibition.holidayPrice ? `${exhibition.holidayPrice.toLocaleString()} 円` : null}</Value>
                  )}
                </div>
              </div>

              <SectionTitle title="予約" />
              <div>
                {exhibition.needsReservation ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ color: theme.colors.error, fontSize: '14px', fontWeight: '800' }}>予約 要</div>
                    {exhibition.reservationStartAt || exhibition.reservationEndAt ? (
                      <div style={{ fontSize: '13px', color: theme.colors.textSecondary, fontWeight: '600' }}>
                        受付: {exhibition.reservationStartAt?.replace(/-/g, '/').replace('T', ' ') || '未設定'}
                        <br />～ {exhibition.reservationEndAt?.replace(/-/g, '/').replace('T', ' ') || '未設定'}
                      </div>
                    ) : (
                      <Value color={theme.colors.textWeak}>期间 未设定</Value>
                    )}
                  </div>
                ) : (
                  <Value color={theme.colors.textWeak}>予約 不要</Value>
                )}
              </div>
            </>
          )}
        </>
      )}
    </GlassCard>
  );
};
