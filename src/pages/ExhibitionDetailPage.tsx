import React, { useState, useEffect, useMemo } from 'react';
import { theme } from '../ui/theme';
import { Icons, IconButton } from '../ui/IconButton';
import { DetailHeader, DetailChip, DetailLinkIconButton } from '../components/detail/DetailHeader';
import { DetailPageLayout } from '../components/detail/DetailPageLayout';
import { Exhibition, ExhibitionStatus } from '../domain/types';
import { ExhibitionInfoSection } from './exhibition-detail/ExhibitionInfoSection';
import { ExhibitionDescriptionSection } from './exhibition-detail/ExhibitionDescriptionSection';
import { ExhibitionGallerySection } from './exhibition-detail/ExhibitionGallerySection';
import { ConfirmDialog } from '../components/ConfirmDialog';
import dayjs from 'dayjs';

import { useRemoteImage } from '../components/RemoteImage';
import { getEffectiveExhibitionStatus } from '../domain/logic';

interface ExhibitionDetailPageProps {
  exhibition: Exhibition;
  allExhibitions: Exhibition[];
  onUpdateExhibition: (ex: Exhibition) => void;
  onDeleteExhibition: (id: string) => void;
  onBack: () => void;
  initialEditMode?: boolean;
}

export const ExhibitionDetailPage: React.FC<ExhibitionDetailPageProps> = ({
  exhibition,
  allExhibitions,
  onUpdateExhibition,
  onDeleteExhibition,
  onBack,
  initialEditMode = false
}) => {
  const [isEditMode, setIsEditMode] = useState(initialEditMode);
  const [formData, setFormData] = useState<Exhibition>(exhibition);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    setFormData(exhibition);
  }, [exhibition]);

  const handleCancel = () => {
    setFormData(exhibition);
    setIsEditMode(false);
  };

  const exhibitionStatusLabelMap: Record<ExhibitionStatus, string> = {
    NONE: '準備中',
    PLANNED: '開催中',
    RESERVED: '予約済',
    SKIPPED: '見送る',
    VISITED: '参戦済み',
    ENDED: '終了'
  };

  const statusColors: Record<ExhibitionStatus, string> = {
    NONE: '#9CA3AF',
    PLANNED: theme.colors.primary,
    RESERVED: '#F59E0B',
    VISITED: '#10B981',
    SKIPPED: '#6B7280',
    ENDED: '#9CA3AF'
  };

  const { resolvedUrl: backgroundUrl } = useRemoteImage(formData.imageUrl, formData.imageId);
  const effectiveStatus = getEffectiveExhibitionStatus(formData);

  const handleSave = () => {
    const next = { ...formData, status: getEffectiveExhibitionStatus(formData) };
    onUpdateExhibition(next);
    setFormData(next);
    setIsEditMode(false);
  };

  return (
    <DetailPageLayout backgroundUrl={backgroundUrl} bottomPadding={140}>

          <DetailHeader
            title={formData.title}
            onTitleChange={(value) => setFormData((prev) => ({ ...prev, title: value }))}
            titlePlaceholder="展覧会名未設定"
            isEditMode={isEditMode}
            posterUrl={backgroundUrl}
            posterAlt={formData.title}
            onBack={onBack}
            actions={isEditMode ? (
              <IconButton icon={<Icons.Check />} onClick={handleSave} primary />
            ) : (
              <IconButton icon={<Icons.Edit />} onClick={() => setIsEditMode(true)} style={{ background: 'rgba(255,255,255,0.82)', border: 'none', color: theme.colors.primary }} />
            )}
            tags={
              <>
                <DetailChip label={exhibitionStatusLabelMap[effectiveStatus]} bg={statusColors[effectiveStatus]} />
                <DetailChip label={`${formData.startDate?.replace(/-/g, '/') || '未設定'} ～ ${formData.endDate?.replace(/-/g, '/') || '未設定'}`} subtle />
                {!isEditMode && formData.websiteUrl ? <DetailLinkIconButton onClick={() => window.open(formData.websiteUrl, '_blank', 'noopener,noreferrer')} title="公式サイトを開く" /> : null}
              </>
            }
          />

          <ExhibitionInfoSection
            exhibition={formData}
            isEditMode={isEditMode}
            allExhibitions={allExhibitions}
            onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
          />

          <div style={{ height: 12 }} />

          <ExhibitionDescriptionSection
            exhibition={formData}
            isEditMode={isEditMode}
            onUpdateArtists={(artists) => setFormData((p) => ({ ...p, artists }))}
            onUpdateDescription={(description) => setFormData((p) => ({ ...p, description }))}
          />

          <div style={{ height: 12 }} />

          <ExhibitionGallerySection
            exhibition={formData}
            isEditMode={isEditMode}
            onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
          />

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
            message="この展覧会を削除すると元に戻せません。"
            confirmLabel="削除"
            isDestructive
            onClose={() => setIsDeleteConfirmOpen(false)}
            onConfirm={() => onDeleteExhibition(formData.id)}
          />
    </DetailPageLayout>
  );
};
