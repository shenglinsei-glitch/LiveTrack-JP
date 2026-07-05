import React, { useState, useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import { theme } from '@/components/common/theme';
import { Icons, IconButton } from '@/components/common/IconButton';
import { DetailHeader, DetailChip, DetailLinkIconButton } from '@/components/detail/DetailHeader';
import { DetailSection } from '@/components/detail/DetailSection';
import { InfoRow, InfoGrid } from '@/components/detail/InfoRow';
import { AlbumSection } from '@/components/detail/AlbumSection';
import { FormSection, FormField } from '@/components/detail/FormSection';
import { TagInputField } from '@/components/detail/TagInputField';
import { DynamicListEditor } from '@/components/detail/DynamicListEditor';
import { GoodsSection } from '@/components/detail/GoodsSection';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DetailPageLayout } from '@/components/detail/DetailPageLayout';
import { Exhibition, ExhibitionSpecialHours, ExhibitionClosedDay, ExhibitionUrl, ExhibitionArtist } from '@/domain/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useRemoteImage } from '@/components/RemoteImage';
import { getEffectiveExhibitionStatus } from '@/domain/logic';
import { NativeDateTimeInput } from '@/components/common/nativeDateInput';
import { UnsavedChangesDialog } from '@/components/common/UnsavedChangesDialog';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

const generateId = () => Math.random().toString(36).substr(2, 9);

interface ExhibitionDetailPageProps {
  exhibition: Exhibition;
  allExhibitions: Exhibition[];
  onUpdateExhibition: (ex: Exhibition) => void;
  onDeleteExhibition: (id: string) => void;
  onBack: () => void;
  initialEditMode?: boolean;
  initialIsNew?: boolean;
  exhibitionVenues?: string[];
  onAddExhibitionVenue?: (venue: string) => void;
}

const formatDateWithWeekday = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = dayjs(dateStr);
  if (!d.isValid()) return dateStr;
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.format('YYYY/MM/DD')}（${weekdays[d.day()]}）`;
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  minHeight: 44,
  borderRadius: 14,
  border: '1px solid rgba(15,23,42,0.08)',
  background: 'rgba(255,255,255,0.85)',
  padding: '0 14px',
  fontSize: 14,
  outline: 'none',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  padding: '12px 14px',
  minHeight: 100,
  resize: 'vertical',
  fontFamily: 'inherit',
};


const buildVisitedAtFromFields = (exhibition: Exhibition) => {
  const date = exhibition.visitedAtDate || (exhibition.visitedAt ? exhibition.visitedAt.split(' ')[0] : '');
  const time = exhibition.visitTime || (exhibition.visitedAt && exhibition.visitedAt.length >= 16 ? exhibition.visitedAt.slice(11, 16) : '');
  if (!date) return undefined;
  return `${date}${time ? ` ${time}` : ''}`;
};

const normalizeExhibitionVisitFields = (exhibition: Exhibition): Exhibition => {
  const visitedAt = buildVisitedAtFromFields(exhibition);
  if (!visitedAt) {
    return { ...exhibition, visitedAt: undefined };
  }
  return {
    ...exhibition,
    visitedAt,
    visitedAtDate: visitedAt.slice(0, 10),
    visitTime: visitedAt.length >= 16 ? visitedAt.slice(11, 16) : exhibition.visitTime,
  };
};

export const ExhibitionDetailPage: React.FC<ExhibitionDetailPageProps> = ({
  exhibition,
  allExhibitions,
  onUpdateExhibition,
  onDeleteExhibition,
  onBack,
  initialEditMode = false,
  initialIsNew = false,
  exhibitionVenues = [],
  onAddExhibitionVenue
}) => {
  const [isEditMode, setIsEditMode] = useState(initialEditMode);
  const [formData, setFormData] = useState<Exhibition>(exhibition);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isNewDraft, setIsNewDraft] = useState(initialIsNew);

  useEffect(() => {
    setFormData(exhibition);
  }, [exhibition]);

  const isDirty = useMemo(() => JSON.stringify(formData) !== JSON.stringify(exhibition), [formData, exhibition]);

  const saveAndLeave = () => {
    const prepared = normalizeExhibitionVisitFields(formData);
    const next = { ...prepared, status: getEffectiveExhibitionStatus(prepared) };
    onUpdateExhibition(next);
    setFormData(next);
    setIsNewDraft(false);
    setIsEditMode(false);
    onBack();
  };

  const discardChanges = () => {
    if (isNewDraft) {
      onDeleteExhibition(formData.id);
      return;
    }
    setFormData(exhibition);
    setIsEditMode(false);
  };

  const backGuard = useUnsavedChangesGuard({
    isDirty: isEditMode && isDirty,
    isNewDraft: isEditMode && isNewDraft,
    onBack,
    onSaveAndBack: saveAndLeave,
    onDiscard: discardChanges,
  });

  const handleBack = backGuard.requestBack;

  const handleCancel = () => {
    if (isDirty || isNewDraft) {
      backGuard.requestBack();
      return;
    }
    setFormData(exhibition);
    setIsEditMode(false);
  };

  const { resolvedUrl: backgroundUrl } = useRemoteImage(formData.imageUrl);
  const effectiveStatus = getEffectiveExhibitionStatus(formData);

  const handleSave = () => {
    const prepared = normalizeExhibitionVisitFields(formData);
    const next = { ...prepared, status: getEffectiveExhibitionStatus(prepared) };

    // 保存会场标签
    if (formData.venueTags && formData.venueTags.length > 0 && onAddExhibitionVenue) {
      formData.venueTags.forEach(tag => {
        if (tag.trim()) onAddExhibitionVenue(tag.trim());
      });
    }

    onUpdateExhibition(next);
    setFormData(next);
    setIsNewDraft(false);
    setIsEditMode(false);
  };

  // 向后兼容：从旧字段获取会场名
  const venueDisplay = useMemo(() => {
    if (formData.venueTags && formData.venueTags.length > 0) {
      return formData.venueTags.join(', ');
    }
    return formData.venueName || formData.venue || formData.area || '';
  }, [formData.venueTags, formData.venueName, formData.venue, formData.area]);

  // 向后兼容：获取开馆时间
  const regularOpen = formData.regularOpenTime || formData.weekdayStartTime || '';
  const regularClose = formData.regularCloseTime || formData.weekdayEndTime || '';

  // URL列表（向后兼容）
  const urlList = useMemo(() => {
    const list = formData.urls || [];
    // 如果没有新URL但有旧websiteUrl，自动添加
    if (list.length === 0 && formData.websiteUrl) {
      return [{ id: 'legacy', name: '公式サイト', url: formData.websiteUrl }];
    }
    return list;
  }, [formData.urls, formData.websiteUrl]);

  // 观览日期（向后兼容）
  const visitedDate = useMemo(() => {
    if (formData.visitedAtDate) return formData.visitedAtDate;
    if (formData.visitedAt) {
      const parts = formData.visitedAt.split(' ');
      return parts[0] || '';
    }
    return '';
  }, [formData.visitedAtDate, formData.visitedAt]);

  return (
    <DetailPageLayout backgroundUrl={backgroundUrl} bottomPadding={140}>
      <DetailHeader
        title={formData.title}
        onTitleChange={(value) => setFormData((prev) => ({ ...prev, title: value }))}
        titlePlaceholder="展覧名未設定"
        isEditMode={isEditMode}
        posterUrl={backgroundUrl}
        posterAlt={formData.title}
        onBack={handleBack}
        actions={isEditMode ? (
          <IconButton icon={<Icons.Check />} onClick={handleSave} primary />
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <IconButton icon={<Icons.Edit />} onClick={() => setIsEditMode(true)} style={{ background: 'rgba(255,255,255,0.82)', border: 'none', color: theme.colors.primary }} />
            <IconButton icon={<Icons.Trash />} onClick={() => setIsDeleteConfirmOpen(true)} style={{ background: 'rgba(255,255,255,0.82)', border: 'none', color: theme.colors.error }} />
          </div>
        )}
        tags={
          <>
            <StatusBadge domain="exhibition" status={effectiveStatus} style={{ minHeight: 28, padding: '0 12px', borderRadius: 999, fontSize: 12, lineHeight: 1 }} />
            <DetailChip label={`${formData.startDate?.replace(/-/g, '/') || ''}${formData.startDate || formData.endDate ? ' ～ ' : ''}${formData.endDate?.replace(/-/g, '/') || ''}`} subtle />
            {!isEditMode && urlList.length > 0 && urlList[0].url ? (
              <DetailLinkIconButton onClick={() => window.open(urlList[0].url, '_blank', 'noopener,noreferrer')} title={urlList[0].name || '公式サイトを開く'} />
            ) : null}
          </>
        }
      />

      {isEditMode && (
        <FormSection title="ポスター">
          <FormField label="ポスター画像URL">
            <input
              type="url"
              value={formData.imageUrl || ''}
              onChange={e => setFormData(p => ({ ...p, imageUrl: e.target.value }))}
              placeholder="https://..."
              style={inputStyle}
            />
          </FormField>
        </FormSection>
      )}

      {/* 1. スケジュール */}
      {!isEditMode ? (
        <DetailSection title="スケジュール">
          <InfoGrid items={[
            { label: '会期', value: formData.startDate && formData.endDate ? `${formatDateWithWeekday(formData.startDate)} 〜 ${formatDateWithWeekday(formData.endDate)}` : '' },
            { label: '開館情報', value: regularOpen && regularClose ? `${regularOpen} 〜 ${regularClose}` : '' },
          ]} />

          {formData.specialHours && formData.specialHours.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.colors.textSecondary, marginBottom: 8 }}>特別時間</div>
              {formData.specialHours.map(sh => (
                <div key={sh.id} style={{ fontSize: 14, fontWeight: 600, color: theme.colors.text, marginBottom: 4 }}>
                  {sh.dateOrWeekday} {sh.startTime}〜{sh.endTime}
                </div>
              ))}
            </div>
          )}

          {formData.noClosedDays ? (
            <InfoRow label="休館日" value="会期中無休" />
          ) : (
            formData.closedDays && formData.closedDays.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: theme.colors.textSecondary, marginBottom: 8 }}>休館日</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: theme.colors.text }}>
                  {formData.closedDays.map(cd => cd.dateOrWeekday).join(', ')}
                </div>
              </div>
            )
          )}
        </DetailSection>
      ) : (
        <FormSection title="スケジュール">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <FormField label="開始日">
              <NativeDateTimeInput type="date" value={formData.startDate || ''} onChange={value => setFormData(p => ({ ...p, startDate: value }))} style={inputStyle} />
            </FormField>
            <FormField label="終了日">
              <NativeDateTimeInput type="date" value={formData.endDate || ''} onChange={value => setFormData(p => ({ ...p, endDate: value }))} style={inputStyle} />
            </FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <FormField label="通常開館">
              <NativeDateTimeInput type="time" value={formData.regularOpenTime || formData.weekdayStartTime || ''} onChange={value => setFormData(p => ({ ...p, regularOpenTime: value }))} style={inputStyle} />
            </FormField>
            <FormField label="通常閉館">
              <NativeDateTimeInput type="time" value={formData.regularCloseTime || formData.weekdayEndTime || ''} onChange={value => setFormData(p => ({ ...p, regularCloseTime: value }))} style={inputStyle} />
            </FormField>
          </div>

          <FormField label="特別時間">
            <DynamicListEditor<ExhibitionSpecialHours>
              items={formData.specialHours || []}
              onChange={items => setFormData(p => ({ ...p, specialHours: items }))}
              createNew={() => ({ id: generateId(), type: 'date', dateOrWeekday: '', startTime: '', endTime: '' })}
              itemLabel="特別時間"
              renderItem={(item, _, onUpdate) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <select value={item.type} onChange={e => onUpdate({ ...item, type: e.target.value as 'date' | 'weekday' })} style={inputStyle}>
                    <option value="date">日付指定</option>
                    <option value="weekday">曜日指定</option>
                  </select>
                  {item.type === 'date' ? (
                    <NativeDateTimeInput type="date" value={item.dateOrWeekday} onChange={value => onUpdate({ ...item, dateOrWeekday: value })} style={inputStyle} />
                  ) : (
                    <select value={item.dateOrWeekday} onChange={e => onUpdate({ ...item, dateOrWeekday: e.target.value })} style={inputStyle}>
                      <option value="">曜日を選択</option>
                      <option value="日">日曜日</option>
                      <option value="月">月曜日</option>
                      <option value="火">火曜日</option>
                      <option value="水">水曜日</option>
                      <option value="木">木曜日</option>
                      <option value="金">金曜日</option>
                      <option value="土">土曜日</option>
                    </select>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                    <NativeDateTimeInput type="time" value={item.startTime} onChange={value => onUpdate({ ...item, startTime: value })} style={inputStyle} placeholder="開館" />
                    <NativeDateTimeInput type="time" value={item.endTime} onChange={value => onUpdate({ ...item, endTime: value })} style={inputStyle} placeholder="閉館" />
                  </div>
                </div>
              )}
            />
          </FormField>

          <FormField label="">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.noClosedDays || false}
                onChange={e => setFormData(p => ({ ...p, noClosedDays: e.target.checked }))}
              />
              <span style={{ fontSize: 14, fontWeight: 600 }}>会期中無休</span>
            </label>
          </FormField>

          {!formData.noClosedDays && (
            <FormField label="休館日">
              <DynamicListEditor<ExhibitionClosedDay>
                items={formData.closedDays || []}
                onChange={items => setFormData(p => ({ ...p, closedDays: items }))}
                createNew={() => ({ id: generateId(), type: 'weekday', dateOrWeekday: '' })}
                itemLabel="休館日"
                renderItem={(item, _, onUpdate) => (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select value={item.type} onChange={e => onUpdate({ ...item, type: e.target.value as 'date' | 'weekday' })} style={{ ...inputStyle, flex: 1 }}>
                      <option value="date">日付指定</option>
                      <option value="weekday">曜日指定</option>
                    </select>
                    {item.type === 'date' ? (
                      <NativeDateTimeInput type="date" value={item.dateOrWeekday} onChange={value => onUpdate({ ...item, dateOrWeekday: value })} style={inputStyle} containerStyle={{ flex: 2 }} />
                    ) : (
                      <select value={item.dateOrWeekday} onChange={e => onUpdate({ ...item, dateOrWeekday: e.target.value })} style={{ ...inputStyle, flex: 2 }}>
                        <option value="">曜日を選択</option>
                        <option value="日">日曜日</option>
                        <option value="月">月曜日</option>
                        <option value="火">火曜日</option>
                        <option value="水">水曜日</option>
                        <option value="木">木曜日</option>
                        <option value="金">金曜日</option>
                        <option value="土">土曜日</option>
                      </select>
                    )}
                  </div>
                )}
              />
            </FormField>
          )}
        </FormSection>
      )}

      {/* 2. 会場 */}
      {!isEditMode ? (
        venueDisplay && (
          <DetailSection title="会場">
            <InfoRow label="会場" value={venueDisplay} />
          </DetailSection>
        )
      ) : (
        <FormSection title="会場">
          <FormField label="会場">
            <TagInputField
              value={formData.venueTags && formData.venueTags.length > 0 ? formData.venueTags[0] : (formData.venueName || formData.venue || '')}
              onChange={value => setFormData(p => ({ ...p, venueTags: value ? [value] : [] }))}
              suggestions={exhibitionVenues}
              placeholder="会場名を入力"
            />
          </FormField>
        </FormSection>
      )}

      {/* 3. 入場・予約 */}
      {!isEditMode ? (
        (formData.isFree !== undefined || formData.admissionFee || formData.needsReservation !== undefined || formData.reservationRequired !== undefined) && (
          <DetailSection title="入場・予約">
            <InfoGrid items={[
              { label: '入場料', value: formData.isFree ? '無料' : (formData.admissionFee ? `${formData.admissionFee}円` : '') },
              { label: '予約', value: (formData.reservationRequired || formData.needsReservation) ? '必要' : '不要' },
            ]} />
          </DetailSection>
        )
      ) : (
        <FormSection title="入場・予約">
          <FormField label="">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.isFree || false}
                onChange={e => setFormData(p => ({ ...p, isFree: e.target.checked }))}
              />
              <span style={{ fontSize: 14, fontWeight: 600 }}>入場無料</span>
            </label>
          </FormField>
          {!formData.isFree && (
            <FormField label="入場料">
              <input
                type="number"
                value={formData.admissionFee || ''}
                onChange={e => setFormData(p => ({ ...p, admissionFee: Number(e.target.value) }))}
                style={inputStyle}
                placeholder="円"
              />
            </FormField>
          )}
          <FormField label="予約">
            <select
              value={formData.reservationRequired || formData.needsReservation ? 'required' : 'not_required'}
              onChange={e => setFormData(p => ({ ...p, reservationRequired: e.target.value === 'required' }))}
              style={inputStyle}
            >
              <option value="not_required">不要</option>
              <option value="required">必要</option>
            </select>
          </FormField>
        </FormSection>
      )}

      {/* 4. URL */}
      {!isEditMode ? (
        urlList.length > 0 && (
          <DetailSection title="URL">
            {urlList.map(urlItem => (
              <InfoRow
                key={urlItem.id}
                label={urlItem.name}
                value={urlItem.url}
                link={urlItem.url}
                onLinkClick={() => window.open(urlItem.url, '_blank', 'noopener,noreferrer')}
              />
            ))}
          </DetailSection>
        )
      ) : (
        <FormSection title="URL">
          <DynamicListEditor<ExhibitionUrl>
            items={formData.urls || []}
            onChange={items => setFormData(p => ({ ...p, urls: items }))}
            createNew={() => ({ id: generateId(), name: '公式サイト', url: '' })}
            itemLabel="URL"
            renderItem={(item, _, onUpdate) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  type="text"
                  value={item.name}
                  onChange={e => onUpdate({ ...item, name: e.target.value })}
                  placeholder="リンク名（例：公式サイト）"
                  style={inputStyle}
                />
                <input
                  type="url"
                  value={item.url}
                  onChange={e => onUpdate({ ...item, url: e.target.value })}
                  placeholder="https://"
                  style={inputStyle}
                />
              </div>
            )}
          />
        </FormSection>
      )}

      {/* 5. 予約済み */}
      {!isEditMode ? (
        formData.reservedAt && (
          <DetailSection title="予約済み">
            <InfoRow label="予約日時" value={formData.reservedAt.replace(/-/g, '/').replace('T', ' ')} />
          </DetailSection>
        )
      ) : (
        <FormSection title="予約済み">
          <FormField label="予約日時">
            <NativeDateTimeInput
              type="datetime-local"
              value={formData.reservedAt || ''}
              onChange={value => setFormData(p => ({ ...p, reservedAt: value }))}
              style={inputStyle}
            />
          </FormField>
        </FormSection>
      )}

      {/* 5. 観覧済み */}
      {!isEditMode ? (
        (visitedDate || formData.visitTime) && (
          <DetailSection title="観覧済み">
            <InfoGrid items={[
              { label: '日付', value: formatDateWithWeekday(visitedDate) },
              { label: '時間', value: formData.visitTime },
            ]} />
          </DetailSection>
        )
      ) : (
        <FormSection title="観覧済み">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            <FormField label="日付">
              <NativeDateTimeInput
                type="date"
                value={visitedDate}
                onChange={value => setFormData(p => ({ ...p, visitedAtDate: value }))}
                style={inputStyle}
              />
            </FormField>
            <FormField label="時間">
              <NativeDateTimeInput
                type="time"
                value={formData.visitTime || ''}
                onChange={value => setFormData(p => ({ ...p, visitTime: value }))}
                style={inputStyle}
              />
            </FormField>
          </div>
        </FormSection>
      )}

      {/* 6. アーティスト・開催概要 */}
      {!isEditMode ? (
        (formData.artists && formData.artists.length > 0) || formData.description ? (
          <DetailSection title="アーティスト・開催概要">
            {formData.artists && formData.artists.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: theme.colors.textSecondary, marginBottom: 8 }}>アーティスト</div>
                {formData.artists.map((artist, idx) => (
                  <div key={idx} style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: theme.colors.text }}>{artist.name}</div>
                    {artist.note && <div style={{ fontSize: 13, fontWeight: 600, color: theme.colors.textSecondary }}>{artist.note}</div>}
                  </div>
                ))}
              </div>
            )}
            {formData.description && <InfoRow label="開催概要" value={formData.description} />}
          </DetailSection>
        ) : null
      ) : (
        <FormSection title="アーティスト・開催概要">
          <FormField label="アーティスト">
            <DynamicListEditor<ExhibitionArtist>
              items={formData.artists || []}
              onChange={items => setFormData(p => ({ ...p, artists: items }))}
              createNew={() => ({ id: `artist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: '', note: '' })}
              itemLabel="アーティスト"
              renderItem={(item, _, onUpdate) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    type="text"
                    value={item.name}
                    onChange={e => onUpdate({ ...item, name: e.target.value })}
                    placeholder="名前"
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    value={item.note || ''}
                    onChange={e => onUpdate({ ...item, note: e.target.value })}
                    placeholder="備考"
                    style={inputStyle}
                  />
                </div>
              )}
            />
          </FormField>
          <FormField label="開催概要">
            <textarea
              value={formData.description || ''}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              placeholder="展覧会の概要を入力"
              style={textareaStyle}
            />
          </FormField>
        </FormSection>
      )}

      {/* 7. グッズ */}
      {!isEditMode ? (
        formData.goods && formData.goods.length > 0 && (
          <DetailSection title="グッズ">
            <GoodsSection items={formData.goods || []} />
          </DetailSection>
        )
      ) : (
        <FormSection title="グッズ">
          <GoodsSection
            items={formData.goods || []}
            onChange={items => setFormData(p => ({ ...p, goods: items }))}
            isEditMode
            itemLabel="グッズ"
          />
        </FormSection>
      )}

      {/* 8. コメント */}
      {!isEditMode ? (
        formData.comment && (
          <DetailSection title="コメント">
            <div style={{ fontSize: 14, fontWeight: 600, color: theme.colors.text, whiteSpace: 'pre-wrap' }}>
              {formData.comment}
            </div>
          </DetailSection>
        )
      ) : (
        <FormSection title="コメント">
          <textarea
            value={formData.comment || ''}
            onChange={e => setFormData(p => ({ ...p, comment: e.target.value }))}
            placeholder="コメントを入力"
            style={textareaStyle}
          />
        </FormSection>
      )}

      {/* 9. アルバム */}
      <DetailSection title="アルバム">
        <AlbumSection
          imageIds={formData.imageIds || []}
          onChange={imageIds => setFormData(p => ({ ...p, imageIds }))}
          title=""
        />
      </DetailSection>

      {isEditMode && (
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button
            onClick={handleCancel}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 14,
              border: '1px solid rgba(0,0,0,0.08)',
              background: 'rgba(255,255,255,0.85)',
              fontWeight: 800,
              cursor: 'pointer',
              color: theme.colors.textSecondary
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 14,
              border: 'none',
              background: theme.colors.primary,
              color: 'white',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 10px 24px -10px rgba(83,190,232,0.6)'
            }}
          >
            保存
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="削除しますか？"
        message="この展覧を削除すると元に戻せません。"
        confirmLabel="削除"
        isDestructive
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => onDeleteExhibition(formData.id)}
      />

      <UnsavedChangesDialog
        open={backGuard.isDialogOpen}
        onSaveAndBack={backGuard.saveAndBack}
        onDiscardAndBack={backGuard.discardAndBack}
        onCancel={backGuard.cancelBack}
      />
    </DetailPageLayout>
  );
};
