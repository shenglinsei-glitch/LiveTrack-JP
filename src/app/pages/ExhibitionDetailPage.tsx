import React, { useState, useEffect, useMemo } from 'react';
import { theme } from '@/components/common/theme';
import { Icons, IconButton } from '@/components/common/IconButton';
import { DetailHeader, DetailChip, DetailLinkIconButton } from '@/components/detail/DetailHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DetailPageLayout } from '@/components/detail/DetailPageLayout';
import { Exhibition } from '@/domain/types';
import { ExhibitionInfoSection } from '@/pages/exhibition-detail/ExhibitionInfoSection';
import { ExhibitionDescriptionSection } from '@/pages/exhibition-detail/ExhibitionDescriptionSection';
import { ExhibitionGallerySection } from '@/pages/exhibition-detail/ExhibitionGallerySection';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useRemoteImage } from '@/components/RemoteImage';
import { getEffectiveExhibitionStatus } from '@/domain/logic';

interface ExhibitionDetailPageProps {
  exhibition: Exhibition;
  allExhibitions: Exhibition[];
  onUpdateExhibition: (ex: Exhibition) => void;
  onDeleteExhibition: (id: string) => void;
  onBack: () => void;
  initialEditMode?: boolean;
  initialIsNew?: boolean;
}

export const ExhibitionDetailPage: React.FC<ExhibitionDetailPageProps> = ({
  exhibition,
  allExhibitions,
  onUpdateExhibition,
  onDeleteExhibition,
  onBack,
  initialEditMode = false,
  initialIsNew = false
}) => {
  const [isEditMode, setIsEditMode] = useState(initialEditMode);
  const [formData, setFormData] = useState<Exhibition>(exhibition);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isUnsavedConfirmOpen, setIsUnsavedConfirmOpen] = useState(false);
  const [isNewDraft, setIsNewDraft] = useState(initialIsNew);

  useEffect(() => {
    setFormData(exhibition);
  }, [exhibition]);

  const isDirty = useMemo(() => JSON.stringify(formData) !== JSON.stringify(exhibition), [formData, exhibition]);

  const handleBack = () => {
    if (isEditMode && (isDirty || isNewDraft)) {
      setIsUnsavedConfirmOpen(true);
      return;
    }
    onBack();
  };

  const handleCancel = () => {
    if (isDirty || isNewDraft) {
      setIsUnsavedConfirmOpen(true);
      return;
    }
    setFormData(exhibition);
    setIsEditMode(false);
  };

  const saveAndLeave = () => {
    const next = { ...formData, status: getEffectiveExhibitionStatus(formData) };
    onUpdateExhibition(next);
    setFormData(next);
    setIsNewDraft(false);
    setIsEditMode(false);
    setIsUnsavedConfirmOpen(false);
    onBack();
  };

  const discardChanges = () => {
    setIsUnsavedConfirmOpen(false);
    if (isNewDraft) {
      onDeleteExhibition(formData.id);
      return;
    }
    setFormData(exhibition);
    setIsEditMode(false);
    onBack();
  };



  const { resolvedUrl: backgroundUrl } = useRemoteImage(formData.imageUrl);
  const effectiveStatus = getEffectiveExhibitionStatus(formData);

  const handleSave = () => {
    const next = { ...formData, status: getEffectiveExhibitionStatus(formData) };
    onUpdateExhibition(next);
    setFormData(next);
    setIsNewDraft(false);
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

          {isUnsavedConfirmOpen && (
            <div style={{
              position: 'fixed',
              inset: 0,
              zIndex: 3000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: theme.spacing.md,
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)'
            }}>
              <div style={{ position: 'fixed', inset: 0 }} onClick={() => setIsUnsavedConfirmOpen(false)} />
              <div style={{
                width: '100%',
                maxWidth: 340,
                position: 'relative',
                borderRadius: 24,
                padding: 22,
                background: 'rgba(255,255,255,0.94)',
                border: '1px solid rgba(255,255,255,0.7)',
                boxShadow: '0 24px 60px rgba(15,23,42,0.22)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)'
              }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: 17, fontWeight: 900, color: theme.colors.textMain }}>未保存の変更があります</h3>
                <p style={{ margin: '0 0 22px 0', fontSize: 14, color: theme.colors.textSecondary, lineHeight: 1.45 }}>保存して退出するか、変更を放棄して退出してください。</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button onClick={saveAndLeave} style={{ height: 44, borderRadius: 14, border: 'none', background: theme.colors.primary, color: 'white', fontWeight: 900, cursor: 'pointer' }}>保存して退出</button>
                  <button onClick={discardChanges} style={{ height: 44, borderRadius: 14, border: 'none', background: 'rgba(239,68,68,0.10)', color: theme.colors.error, fontWeight: 900, cursor: 'pointer' }}>放棄して退出</button>
                  <button onClick={() => setIsUnsavedConfirmOpen(false)} style={{ height: 40, borderRadius: 14, border: 'none', background: 'rgba(0,0,0,0.05)', color: theme.colors.textSecondary, fontWeight: 800, cursor: 'pointer' }}>キャンセル</button>
                </div>
              </div>
            </div>
          )}
    </DetailPageLayout>
  );
};
