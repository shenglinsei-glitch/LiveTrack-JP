import React, { useState, useEffect, useMemo } from 'react';
import { theme } from '../ui/theme';
import { Icons, IconButton } from '../ui/IconButton';
import { DetailHeader, DetailChip, DetailLinkIconButton } from '../components/detail/DetailHeader';
import { PageShell } from '../ui/PageShell';
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

  const handleSave = () => {
    onUpdateExhibition(formData);
    setIsEditMode(false);
  };

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

  return (
    <PageShell disablePadding>
      <div style={{ minHeight: '100vh', position: 'relative', background: theme.colors.background }}>
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden' }}>
          {backgroundUrl ? (
            <img
              src={backgroundUrl}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.02)', opacity: 0.94 }}
              alt=""
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg, #E5E7EB 0%, #F5F5F7 100%)' }} />
          )}
        </div>

        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            background: 'rgba(0,0,0,0.06)',
            maskImage:
              'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.92) 12%, rgba(0,0,0,0.75) 28%, rgba(0,0,0,0.50) 48%, rgba(0,0,0,0.28) 65%, rgba(0,0,0,0.12) 78%, rgba(0,0,0,0) 88%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.92) 12%, rgba(0,0,0,0.75) 28%, rgba(0,0,0,0.50) 48%, rgba(0,0,0,0.28) 65%, rgba(0,0,0,0.12) 78%, rgba(0,0,0,0) 88%)',
            pointerEvents: 'none'
          }}
        />

        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1,
            background: `
              linear-gradient(
                to bottom,
                rgba(0,0,0,0.60) 0%,
                rgba(0,0,0,0.42) 18%,
                rgba(0,0,0,0.28) 38%,
                rgba(0,0,0,0.16) 58%,
                rgba(0,0,0,0.10) 78%,
                rgba(0,0,0,0.04) 100%
              )
            `,
            pointerEvents: 'none'
          }}
        />

        <div style={{ position: 'relative', zIndex: 2, padding: 'calc(env(safe-area-inset-top) + 16px) clamp(10px, 1.8vw, 16px) 140px', width: '100%', maxWidth: 1080, margin: '0 auto', boxSizing: 'border-box' }}>
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
                <DetailChip label={exhibitionStatusLabelMap[formData.status]} bg={statusColors[formData.status]} />
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
        </div>
      </div>
    </PageShell>
  );
};
