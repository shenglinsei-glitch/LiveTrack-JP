
import React, { useMemo, useState } from 'react';
import { theme } from '@/components/common/theme';
import { GlassCard } from '@/components/common/GlassCard';
import { Label, Value, SubValue, SectionTitle } from '@/components/detail/DetailText';
import { Exhibition, ExhibitionStatus, ExhibitionTicketSalesStatus } from '@/domain/types';
import { Icons } from '@/components/common/IconButton';
import { TagSelectInput } from '@/components/common/TagSelectInput';
import {
  Select,
  Input,
  Checkbox,
  Button,
  InputNumber,
  Tag
} from 'antd';
import dayjs from 'dayjs';

const toNativeDateTimeValue = (value: string | null | undefined) => value ? value.replace(' ', 'T').slice(0, 16) : '';
const fromNativeDateTimeValue = (value: string) => value ? value.replace('T', ' ') : '';

const nativeDateInputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  borderRadius: 14,
  border: '1px solid rgba(15,23,42,0.08)',
  background: 'rgba(255,255,255,0.9)',
  padding: '0 12px',
  fontSize: 14,
  fontWeight: 700,
  color: theme.colors.text,
  outline: 'none',
  boxSizing: 'border-box',
  colorScheme: 'light',
  WebkitAppearance: 'none',
  appearance: 'none',
};

const CustomExhibitionDatePicker = ({
  value,
  onChange,
  showTime = false,
  placeholder = ''
}: {
  value: string | null | undefined;
  onChange: (val: string) => void;
  showTime?: boolean;
  placeholder?: string;
}) => (
  <input
    type={showTime ? 'datetime-local' : 'date'}
    value={showTime ? toNativeDateTimeValue(value) : (value || '').slice(0, 10)}
    onChange={(e) => onChange(showTime ? fromNativeDateTimeValue(e.target.value) : e.target.value)}
    placeholder={placeholder || '未設定'}
    style={nativeDateInputStyle}
  />
);

const CustomExhibitionTimePicker = ({
  value,
  onChange,
  placeholder = '未設定'
}: {
  value?: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) => (
  <input type="time" value={(value || '').slice(0, 5)} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={nativeDateInputStyle} />
);

interface Props {
  exhibition: Exhibition;
  allExhibitions: Exhibition[];
  isEditMode: boolean;
  onChange: (updates: Partial<Exhibition>) => void;
  exhibitionVenues?: string[];
  onAddExhibitionVenue?: (venue: string) => void;
}

export const ExhibitionInfoSection: React.FC<Props> = ({ exhibition, allExhibitions, isEditMode, onChange, exhibitionVenues = [], onAddExhibitionVenue }) => {
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
                <Input style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }} value={exhibition.imageUrl} onChange={(e) => onChange({ imageUrl: e.target.value })} placeholder="https://..." />
              </div>

              <div>
                <Label>会期</Label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                <div>
                  <Label>エリア</Label>
                  <Input
                    style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}
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
                  <TagSelectInput
                    value={exhibition.venueName || exhibition.venue || ''}
                    onChange={(v) => onChange({ venueName: v })}
                    candidates={exhibitionVenues}
                    onAddCandidate={onAddExhibitionVenue}
                    placeholder="会場名を入力"
                  />
                </div>
              </div>

              <SectionTitle title="ステータス・チケット" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                <div>
                  <Label>参戦日時</Label>
                  <CustomExhibitionDatePicker showTime value={exhibition.visitedAt} placeholder="参戦日時" onChange={(v) => onChange({ visitedAt: v })} />
                  {exhibition.visitedAt && (
                    <Button size="small" danger type="text" onClick={() => onChange({ visitedAt: undefined })} style={{ padding: 0 }}>
                      記録解除
                    </Button>
                  )}
                </div>
                <div>
                  <Label>チケットステータス</Label>
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
                <Input style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }} value={exhibition.websiteUrl} onChange={(e) => onChange({ websiteUrl: e.target.value })} placeholder="https://..." />
              </div>

              <SectionTitle title="開館時間" />
              <Checkbox checked={exhibition.holidaySameAsWeekday} onChange={(e) => onChange({ holidaySameAsWeekday: e.target.checked })}>
                休日は平日と同じ
              </Checkbox>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                <div>
                  <Label>平日 開館</Label>
                  <CustomExhibitionTimePicker value={exhibition.weekdayStartTime} placeholder="開始" onChange={(v) => onChange({ weekdayStartTime: v || undefined })} />
                </div>
                <div>
                  <Label>平日 閉館</Label>
                  <CustomExhibitionTimePicker value={exhibition.weekdayEndTime} placeholder="終了" onChange={(v) => onChange({ weekdayEndTime: v || undefined })} />
                </div>
                {!exhibition.holidaySameAsWeekday && (
                  <>
                    <div>
                      <Label>休日 開館</Label>
                      <CustomExhibitionTimePicker value={exhibition.holidayStartTime} placeholder="開始" onChange={(v) => onChange({ holidayStartTime: v || undefined })} />
                    </div>
                    <div>
                      <Label>休日 閉館</Label>
                      <CustomExhibitionTimePicker value={exhibition.holidayEndTime} placeholder="終了" onChange={(v) => onChange({ holidayEndTime: v || undefined })} />
                    </div>
                  </>
                )}
              </div>

              <SectionTitle title="料金設定" />
              <Checkbox checked={exhibition.holidayPriceSameAsWeekday} onChange={(e) => onChange({ holidayPriceSameAsWeekday: e.target.checked })}>
                休日は平日と同じ
              </Checkbox>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                <InputNumber style={{ width: '100%', maxWidth: '100%', minWidth: 0 }} value={exhibition.weekdayPrice} onChange={(v) => onChange({ weekdayPrice: v || undefined })} placeholder="平日料金" />
                {!exhibition.holidayPriceSameAsWeekday && (
                  <InputNumber style={{ width: '100%', maxWidth: '100%', minWidth: 0 }} value={exhibition.holidayPrice} onChange={(v) => onChange({ holidayPrice: v || undefined })} placeholder="休日料金" />
                )}
              </div>

              <SectionTitle title="予約設定" />
              <Checkbox checked={exhibition.needsReservation} onChange={(e) => onChange({ needsReservation: e.target.checked })}>
                予約が必要
              </Checkbox>
              {exhibition.needsReservation && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <Label>エリア</Label>
                  <Value placeholder="">{exhibition.area}</Value>
                </div>
                <div>
                  <Label>会場名</Label>
                  <Value placeholder="">{exhibition.venueName || exhibition.venue}</Value>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: exhibition.ticketSalesStatus && exhibition.ticketSalesStatus !== 'none' ? '1fr 1fr' : '1fr', gap: '16px', marginBottom: '16px' }}>
                {exhibition.ticketSalesStatus && exhibition.ticketSalesStatus !== 'none' && (
                  <div>
                    <Label>チケットステータス</Label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                        <SubValue color={theme.colors.textWeak} style={{ fontSize: '10px', lineHeight: 1.2, fontWeight: 500 }}>
                          発売: {exhibition.saleStartAt.replace(/-/g, '/')}
                        </SubValue>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <Label>参戦記録</Label>
                  <Value color={exhibition.visitedAt ? theme.colors.primary : undefined}>
                    {exhibition.visitedAt ? exhibition.visitedAt.replace(/-/g, '/').replace('T', ' ') : '未訪問'}
                  </Value>
                </div>
              </div>

              <SectionTitle title="開館時間" />
              {exhibition.holidaySameAsWeekday ? (
                <div>
                  <Value placeholder="">
                    {exhibition.weekdayStartTime && exhibition.weekdayEndTime
                      ? `${exhibition.weekdayStartTime} ～ ${exhibition.weekdayEndTime}`
                      : null}
                  </Value>
                </div>
              ) : (
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
                    <Value placeholder="">
                      {exhibition.holidayStartTime && exhibition.holidayEndTime
                        ? `${exhibition.holidayStartTime} ～ ${exhibition.holidayEndTime}`
                        : null}
                    </Value>
                  </div>
                </div>
              )}

              <SectionTitle title="料金" />
              {exhibition.holidayPriceSameAsWeekday ? (
                <div>
                  <Value placeholder="">{exhibition.weekdayPrice ? `${exhibition.weekdayPrice.toLocaleString()} 円` : null}</Value>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
                  <div>
                    <Label>平日料金</Label>
                    <Value placeholder="">{exhibition.weekdayPrice ? `${exhibition.weekdayPrice.toLocaleString()} 円` : null}</Value>
                  </div>
                  <div>
                    <Label>休日料金</Label>
                    <Value placeholder="">{exhibition.holidayPrice ? `${exhibition.holidayPrice.toLocaleString()} 円` : null}</Value>
                  </div>
                </div>
              )}

              <SectionTitle title="予約" />
              <div>
                {exhibition.needsReservation ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ color: theme.colors.error, fontSize: '14px', fontWeight: '800' }}>予約 要</div>
                    {exhibition.reservationStartAt || exhibition.reservationEndAt ? (
                      <div style={{ fontSize: '13px', color: theme.colors.textSecondary, fontWeight: '600' }}>
                        受付: {exhibition.reservationStartAt?.replace(/-/g, '/').replace('T', ' ') || ''}
                        <br />～ {exhibition.reservationEndAt?.replace(/-/g, '/').replace('T', ' ') || ''}
                      </div>
                    ) : (
                      <Value placeholder="" color={theme.colors.textWeak}>{null}</Value>
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
