import React, { useState, useEffect, useMemo } from 'react';
import { theme } from '../ui/theme';
import { Icons, IconButton } from '../ui/IconButton';
import { PageShell } from '../ui/PageShell';
import { Exhibition, ExhibitionOverallStatus } from '../domain/types';
import { ExhibitionInfoSection } from './exhibition-detail/ExhibitionInfoSection';
import { ExhibitionDescriptionSection } from './exhibition-detail/ExhibitionDescriptionSection';
import { ExhibitionGallerySection } from './exhibition-detail/ExhibitionGallerySection';
import { ConfirmDialog } from '../components/ConfirmDialog';
import dayjs from 'dayjs';

interface ExhibitionDetailPageProps {
  exhibition: Exhibition;
  allExhibitions: Exhibition[];
  onUpdateExhibition: (ex: Exhibition) => void;
  onDeleteExhibition: (id: string) => void;
  onBack: () => void;
  initialEditMode?: boolean;
}

const StatusTag: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0 8px',
      height: 20,
      borderRadius: 6,
      background: color,
      color: 'white',
      fontWeight: 800,
      fontSize: 10,
      lineHeight: '20px'
    }}
  >
    {children}
  </span>
);

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

  const computedStatus = useMemo(() => {
    if (formData.visitedAt) return 'visited' as ExhibitionOverallStatus;

    const now = dayjs().startOf('day');
    const start = dayjs(formData.startDate).startOf('day');
    const end = dayjs(formData.endDate).endOf('day');

    if (now.isBefore(start)) return 'preparing' as ExhibitionOverallStatus;
    if (now.isAfter(end)) return 'ended_not_visited' as ExhibitionOverallStatus;
    return 'running' as ExhibitionOverallStatus;
  }, [formData.startDate, formData.endDate, formData.visitedAt]);

  const handleSave = () => {
    const updated = { ...formData, exhibitionStatus: computedStatus };
    onUpdateExhibition(updated);
    setIsEditMode(false);
  };

  const handleCancel = () => {
    setFormData(exhibition);
    setIsEditMode(false);
  };

  const exhibitionStatusLabelMap: Record<ExhibitionOverallStatus, string> = {
    preparing: '準備中',
    running: '開催中',
    visited: '参加済',
    ended_not_visited: '終了（未参加）'
  };

  const statusColors: Record<ExhibitionOverallStatus, string> = {
    preparing: '#9CA3AF',
    running: theme.colors.primary,
    visited: '#10B981',
    ended_not_visited: '#6B7280'
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#F5F5F7' }}>
      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden' }}>
        {formData.imageUrl ? (
          <img
            src={formData.imageUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.9) blur(0px)' }}
            alt=""
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg, #E5E7EB 0%, #F5F5F7 100%)' }} />
        )}
      </div>

      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          background:
            'linear-gradient(180deg, rgba(245, 245, 247, 0) 0%, rgba(245, 245, 247, 0.4) 150px, #F5F5F7 350px, #F5F5F7 100%)',
          pointerEvents: 'none'
        }}
      />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <PageShell disablePadding>
          <div style={{ padding: 'calc(env(safe-area-inset-top) + 12px) 16px 140px 16px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <button
                onClick={onBack}
                style={{
                  border: 'none',
                  background: 'rgba(255,255,255,0.8)',
                  backdropFilter: 'blur(10px)',
                  color: theme.colors.textSecondary,
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  display: 'flex',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
              >
                <Icons.ChevronLeft />
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                {formData.websiteUrl && !isEditMode && (
                  <button
                    onClick={() => window.open(formData.websiteUrl, '_blank')}
                    style={{
                      border: 'none',
                      background: 'rgba(255,255,255,0.8)',
                      backdropFilter: 'blur(10px)',
                      color: theme.colors.primary,
                      cursor: 'pointer',
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      padding: 0
                    }}
                  >
                    <Icons.Globe style={{ width: 18, height: 18, display: 'block' }} />
                  </button>
                )}

                {isEditMode ? (
                  <IconButton
                    icon={<Icons.Trash />}
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    style={{
                      color: theme.colors.error,
                      border: 'none',
                      background: 'rgba(255,255,255,0.8)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                    }}
                  />
                ) : (
                  <IconButton
                    icon={<Icons.Edit />}
                    onClick={() => setIsEditMode(true)}
                    style={{
                      color: theme.colors.primary,
                      border: 'none',
                      background: 'rgba(255,255,255,0.8)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                    }}
                  />
                )}
              </div>
            </header>

            <div style={{ textAlign: 'center', margin: '24px 0 32px 0' }}>
              {isEditMode ? (
                <input
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  autoFocus={formData.title === '新規展覧会'}
                  placeholder="展覧会名を入力"
                  style={{
                    width: '100%',
                    fontSize: '24px',
                    fontWeight: 900,
                    margin: '0 0 12px 0',
                    letterSpacing: '-0.02em',
                    color: theme.colors.text,
                    lineHeight: '1.3',
                    textAlign: 'center',
                    padding: 0,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent'
                  }}
                />
              ) : (
                <h1
                  style={{
                    fontSize: '24px',
                    fontWeight: '900',
                    margin: '0 0 12px 0',
                    letterSpacing: '-0.02em',
                    color: theme.colors.text,
                    lineHeight: '1.3'
                  }}
                >
                  {formData.title}
                </h1>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: theme.colors.textSecondary, letterSpacing: '0.02em' }}>
                  {formData.startDate?.replace(/-/g, '/')} ～ {formData.endDate?.replace(/-/g, '/')}
                </span>
                <StatusTag color={statusColors[computedStatus]}>{exhibitionStatusLabelMap[computedStatus]}</StatusTag>
              </div>
            </div>

            {/* Sections */}
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

            {/* Bottom Actions */}
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
        </PageShell>
      </div>
    </div>
  );
};
