
import React, { useState, useEffect, useMemo } from 'react';
import { theme } from '../ui/theme';
import { Icons, IconButton } from '../ui/IconButton';
import { PageShell } from '../ui/PageShell';
import { Exhibition, ExhibitionOverallStatus } from '../domain/types';
import { ExhibitionInfoSection } from './exhibition-detail/ExhibitionInfoSection';
import { ExhibitionDescriptionSection } from './exhibition-detail/ExhibitionDescriptionSection';
import { ExhibitionGallerySection } from './exhibition-detail/ExhibitionGallerySection';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Tag, Input } from 'antd';
import dayjs from 'dayjs';

interface ExhibitionDetailPageProps {
  exhibition: Exhibition;
  allExhibitions: Exhibition[];
  onUpdateExhibition: (ex: Exhibition) => void;
  onDeleteExhibition: (id: string) => void;
  onBack: () => void;
  initialEditMode?: boolean; // Prop to force edit mode on load
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

  // Automatic Status Calculation
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
    'preparing': '準備中',
    'running': '開催中',
    'visited': '参加済',
    'ended_not_visited': '終了（未参加）'
  };

  const statusColors: Record<ExhibitionOverallStatus, string> = {
    'preparing': '#9CA3AF',
    'running': theme.colors.primary,
    'visited': '#10B981',
    'ended_not_visited': '#6B7280'
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#F5F5F7' }}>
      
      {/* 1. Fixed Background Layer - Full Screen */}
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 0,
        overflow: 'hidden'
      }}>
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

      {/* 2. Fixed Gradient Overlay - Smooth transition to page background */}
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 1, 
        background: 'linear-gradient(180deg, rgba(245, 245, 247, 0) 0%, rgba(245, 245, 247, 0.4) 150px, #F5F5F7 350px, #F5F5F7 100%)',
        pointerEvents: 'none'
      }} />

      {/* 3. Scrollable Content Layer */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <PageShell disablePadding>
          <div style={{ padding: 'calc(env(safe-area-inset-top) + 12px) 16px 140px 16px' }}>
            
            {/* Top Actions Bar */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <button 
                onClick={onBack}
                style={{ border: 'none', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', color: theme.colors.textSecondary, cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
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
                    style={{ color: theme.colors.error, border: 'none', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                  />
                ) : (
                  <IconButton 
                    icon={<Icons.Edit />} 
                    onClick={() => setIsEditMode(true)} 
                    style={{ color: theme.colors.primary, border: 'none', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                  />
                )}
              </div>
            </header>

            {/* Centered Title & Badge Section */}
            <div style={{ textAlign: 'center', margin: '24px 0 32px 0' }}>
              {isEditMode ? (
                <Input
                  variant="borderless"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  autoFocus={formData.title === '新規展覧会'}
                  placeholder="展覧会名を入力"
                  style={{ 
                    fontSize: '24px', 
                    fontWeight: '900', 
                    margin: '0 0 12px 0', 
                    letterSpacing: '-0.02em',
                    color: theme.colors.text,
                    lineHeight: '1.3',
                    textAlign: 'center',
                    padding: 0,
                    background: 'transparent'
                  }}
                />
              ) : (
                <h1 style={{ 
                  fontSize: '24px', 
                  fontWeight: '900', 
                  margin: '0 0 12px 0', 
                  letterSpacing: '-0.02em',
                  color: theme.colors.text,
                  lineHeight: '1.3'
                }}>
                  {formData.title}
                </h1>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: theme.colors.textSecondary, letterSpacing: '0.02em' }}>
                  {formData.startDate?.replace(/-/g, '/')} ～ {formData.endDate?.replace(/-/g, '/')}
                </span>
                <Tag 
                  color={statusColors[computedStatus]} 
                  style={{ borderRadius: '6px', border: 'none', fontWeight: 800, fontSize: '10px', margin: 0, padding: '0 8px' }}
                >
                  {exhibitionStatusLabelMap[computedStatus]}
                </Tag>
              </div>
            </div>

            {/* Content Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <ExhibitionInfoSection 
                exhibition={{ ...formData, exhibitionStatus: computedStatus }} 
                allExhibitions={allExhibitions}
                isEditMode={isEditMode} 
                onChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))} 
              />
              
              <ExhibitionDescriptionSection 
                exhibition={formData} 
                isEditMode={isEditMode} 
                onUpdateDescription={(description) => setFormData(prev => ({ ...prev, description }))}
                onUpdateArtists={(artists) => setFormData(prev => ({ ...prev, artists }))}
              />

              <ExhibitionGallerySection 
                exhibition={formData} 
                onChange={(imageIds) => {
                  const updated = { ...formData, imageIds };
                  setFormData(updated);
                  if (!isEditMode) onUpdateExhibition(updated);
                }} 
              />
            </div>

            {/* Footer Actions */}
            {isEditMode && (
              <div style={{
                position: 'fixed',
                bottom: 'calc(20px + env(safe-area-inset-bottom))',
                left: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                padding: '12px 20px',
                borderRadius: '24px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                display: 'flex',
                gap: '12px',
                zIndex: 1000
              }}>
                <button 
                  onClick={handleCancel}
                  style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', background: 'rgba(0,0,0,0.05)', fontWeight: 'bold', cursor: 'pointer', color: theme.colors.textMain }}
                >
                  キャンセル
                </button>
                <button 
                  onClick={handleSave}
                  style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', background: theme.colors.primary, color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  保存
                </button>
              </div>
            )}

            <ConfirmDialog
              isOpen={isDeleteConfirmOpen}
              title="展覧会を削除"
              message="この展覧会情報を完全に削除しますか？この操作は取り消せません。"
              confirmLabel="削除"
              isDestructive
              onClose={() => setIsDeleteConfirmOpen(false)}
              onConfirm={() => onDeleteExhibition(exhibition.id)}
            />
          </div>
        </PageShell>
      </div>
    </div>
  );
};
