import React, { useState, useEffect, useRef } from 'react';
import { theme } from '../ui/theme';
import { TEXT } from '../ui/constants';
import { GlassCard } from '../ui/GlassCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Artist, SiteLink } from '../domain/types';
import { Icons, IconButton } from '../ui/IconButton';
import { PageShell } from '../ui/PageShell';

interface Props {
  artistId?: string;
  artist?: Artist;
  onSave: (updated: Artist) => void;
  onCancel: () => void;
  onOpenConcertEditor: (artistId: string, tourId?: string) => void;
  onDeleteArtist: (artistId: string) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

// Normalize legacy / partial link objects so the editor never crashes.
const normalizeLink = (link: Partial<SiteLink> | undefined | null): SiteLink => {
  const safeName = typeof link?.name === 'string' ? link!.name : '';
  const safeUrl = typeof link?.url === 'string' ? link!.url : '';
  const safeAutoTrack = typeof link?.autoTrack === 'boolean' ? link!.autoTrack : false;
  return {
    name: safeName,
    url: safeUrl,
    autoTrack: safeAutoTrack,
    lastCheckedAt: link?.lastCheckedAt,
    lastSuccessAt: link?.lastSuccessAt,
    trackingStatus: link?.trackingStatus,
    errorMessage: link?.errorMessage,
  };
};

export const ArtistEditorPage: React.FC<Props> = ({
  artistId,
  artist,
  onSave,
  onCancel,
  onOpenConcertEditor,
  onDeleteArtist,
}) => {
  const createNewArtist = (): Artist => ({
    id: generateId(),
    name: '',
    imageUrl: '',
    links: [],
    autoTrackConcerts: true,
    autoTrackTickets: true,
    tours: [],
    order: 0,
  });

  const [formData, setFormData] = useState<Artist>(artist ? { ...artist } : createNewArtist());
  const initialSnapshotRef = useRef<string>(JSON.stringify(artist ? { ...artist } : formData));
  const [imageUrlDraft, setImageUrlDraft] = useState(formData.imageUrl);
  const [hasChanges, setHasChanges] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (artist) {
      setFormData({ ...artist });
      setImageUrlDraft(artist.imageUrl);
      initialSnapshotRef.current = JSON.stringify(artist);
    }
  }, [artistId, artist]);

  useEffect(() => {
    setHasChanges(JSON.stringify(formData) !== initialSnapshotRef.current);
  }, [formData]);

  const handleUpdateField = (field: keyof Artist, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLoadImage = () => {
    if (imageUrlDraft.trim()) {
      handleUpdateField('imageUrl', imageUrlDraft.trim());
    }
  };

  // ----- Links editor helpers -----
  const setLinks = (updater: (prev: SiteLink[]) => SiteLink[]) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.links) ? prev.links : [];
      return { ...prev, links: updater(current) };
    });
  };

  const addLink = () => {
    setLinks((prev) => [
      ...prev,
      {
        name: '',
        url: '',
        autoTrack: false,
      },
    ]);
  };

  const updateLink = (index: number, patch: Partial<SiteLink>) => {
    setLinks((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        const normalized = normalizeLink(l);
        const next: SiteLink = {
          ...normalized,
          ...patch,
          autoTrack:
            typeof (patch as any).autoTrack === 'boolean'
              ? (patch as any).autoTrack
              : normalized.autoTrack,
        };
        return next;
      })
    );
  };

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <PageShell
      header={
        <header style={headerStyle}>
          <IconButton
            icon={<Icons.X />}
            onClick={onCancel}
            size={40}
            style={{
              color: theme.colors.textSecondary,
              borderColor: 'transparent',
              background: 'transparent',
              boxShadow: 'none',
            }}
          />
          <h2 style={{ fontSize: '17px', margin: 0, fontWeight: 'bold' }}>
            {artistId ? 'アーティスト編集' : 'アーティスト追加'}
          </h2>
          {artistId ? (
            <IconButton
              icon={<Icons.Trash />}
              onClick={() => setIsDeleteModalOpen(true)}
              size={40}
              style={{
                color: theme.colors.error,
                borderColor: 'transparent',
                background: 'transparent',
                boxShadow: 'none',
              }}
            />
          ) : (
            <div style={{ width: 40 }} />
          )}
        </header>
      }
    >
      <div style={{ paddingBottom: '160px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: '#F3F4F6',
              border: '4px solid white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {formData.imageUrl ? (
              <img
                src={formData.imageUrl}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Error';
                }}
              />
            ) : (
              <span style={{ fontSize: '32px', opacity: 0.2 }}>👤</span>
            )}
          </div>
        </div>

        <section style={{ marginBottom: theme.spacing.xl }}>
          <h3 style={sectionTitleStyle}>基本情報</h3>
          <GlassCard padding={theme.spacing.md}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              <Field label="アーティスト名 (必須)">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleUpdateField('name', e.target.value)}
                  placeholder="名称を入力"
                  style={inputStyle}
                />
              </Field>
              <Field label="画像URL">
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="url"
                    value={imageUrlDraft}
                    onChange={(e) => setImageUrlDraft(e.target.value)}
                    placeholder="https://..."
                    style={inputStyle}
                  />
                  <button
                    onClick={handleLoadImage}
                    style={{
                      padding: '0 16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(0,0,0,0.08)',
                      background: 'white',
                      color: theme.colors.textSecondary,
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s',
                    }}
                  >
                    読み込み
                  </button>
                </div>
              </Field>
            </div>
          </GlassCard>
        </section>

        <section style={{ marginBottom: theme.spacing.xl }}>
          <h3 style={sectionTitleStyle}>追跡設定</h3>
          <GlassCard padding={theme.spacing.md}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '15px' }}>公演自動追跡</div>
                  <div style={{ fontSize: '12px', color: theme.colors.textSecondary }}>
                    新規ツアー・公演情報を自動取得します
                  </div>
                </div>
                <Toggle
                  active={formData.autoTrackConcerts}
                  onToggle={() => handleUpdateField('autoTrackConcerts', !formData.autoTrackConcerts)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '15px' }}>チケット自動追跡</div>
                  <div style={{ fontSize: '12px', color: theme.colors.textSecondary }}>
                    販売・抽選情報を自動更新します
                  </div>
                </div>
                <Toggle
                  active={formData.autoTrackTickets}
                  onToggle={() => handleUpdateField('autoTrackTickets', !formData.autoTrackTickets)}
                />
              </div>
            </div>
          </GlassCard>
        </section>

        <section style={{ marginBottom: theme.spacing.xl }}>
          <h3 style={sectionTitleStyle}>公式サイト・リンク</h3>
          <GlassCard padding={theme.spacing.md}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              {(formData.links ?? []).length === 0 ? (
                <div style={{ fontSize: '12px', color: theme.colors.textSecondary, fontWeight: 600 }}>
                  まだ登録されていません
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                  {(formData.links ?? []).map((link, idx) => {
                    const safe = normalizeLink(link);
                    return (
                      <div
                        key={`${idx}-${safe.url}`}
                        style={{
                          border: '1px solid rgba(0,0,0,0.06)',
                          background: 'rgba(255,255,255,0.35)',
                          borderRadius: '16px',
                          padding: '12px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px',
                          }}
                        >
                          <div style={{ fontSize: '12px', color: theme.colors.textSecondary, fontWeight: 800 }}>
                            サイト {idx + 1}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '12px', color: theme.colors.textSecondary, fontWeight: 700 }}>
                                追跡
                              </span>
                              <Toggle
                                active={!!safe.autoTrack}
                                onToggle={() => updateLink(idx, { autoTrack: !safe.autoTrack })}
                              />
                            </div>
                            <button
                              onClick={() => removeLink(idx)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: theme.colors.textSecondary,
                                cursor: 'pointer',
                                padding: '6px 8px',
                                borderRadius: '12px',
                              }}
                              aria-label="削除"
                              title="削除"
                            >
                              <Icons.Trash />
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <Field label="サイト名">
                            <input
                              type="text"
                              value={safe.name}
                              onChange={(e) => updateLink(idx, { name: e.target.value })}
                              placeholder="例：公式サイト / チケット / SNS"
                              style={inputStyle}
                            />
                          </Field>
                          <Field label="URL">
                            <input
                              type="url"
                              value={safe.url}
                              onChange={(e) => updateLink(idx, { url: e.target.value })}
                              placeholder="https://..."
                              style={inputStyle}
                            />
                          </Field>
                        </div>

                        {(safe.lastCheckedAt || safe.trackingStatus === 'failed') && (
                          <div style={{ marginTop: '10px', fontSize: '11px', color: theme.colors.textSecondary }}>
                            {safe.lastCheckedAt && <span>最終チェック: {safe.lastCheckedAt}</span>}
                            {safe.trackingStatus === 'failed' && (
                              <span style={{ marginLeft: '8px', color: theme.colors.error, fontWeight: 700 }}>
                                失敗{safe.errorMessage ? `：${safe.errorMessage}` : ''}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={addLink}
                style={{
                  padding: '12px 14px',
                  borderRadius: '14px',
                  border: '1px dashed rgba(0,0,0,0.12)',
                  background: 'rgba(255,255,255,0.25)',
                  color: theme.colors.primary,
                  fontWeight: 900,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                ＋ サイトを追加
              </button>
            </div>
          </GlassCard>
        </section>

        {artistId && (
          <section style={{ marginBottom: theme.spacing.xl }}>
            <h3 style={sectionTitleStyle}>ツアー・公演管理</h3>
            <GlassCard padding="0">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {formData.tours.map((tour, idx) => (
                  <div
                    key={tour.id}
                    onClick={() => onOpenConcertEditor(formData.id, tour.id)}
                    style={{
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: idx === formData.tours.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.05)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          background: '#F3F4F6',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {tour.imageUrl ? (
                          <img src={tour.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '16px', opacity: 0.2 }}>🎸</span>
                        )}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '600' }}>{tour.name}</div>
                    </div>
                    <Icons.ChevronLeft style={{ transform: 'rotate(180deg)', color: theme.colors.textLabel }} />
                  </div>
                ))}
                <button
                  onClick={() => onOpenConcertEditor(formData.id)}
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    border: 'none',
                    background: 'transparent',
                    color: theme.colors.primary,
                    fontWeight: '800',
                    fontSize: '14px',
                    cursor: 'pointer',
                    borderTop: formData.tours.length > 0 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                  }}
                >
                  ＋ 新しいツアーを追加
                </button>
              </div>
            </GlassCard>
          </section>
        )}

        <section style={{ marginTop: '40px' }}>
          <button
            disabled={!hasChanges || !formData.name}
            onClick={() => onSave(formData)}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: theme.radius.button,
              background: !hasChanges || !formData.name ? 'rgba(0,0,0,0.05)' : theme.colors.primary,
              color: 'white',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            {TEXT.BUTTONS.SAVE}
          </button>
        </section>

        <ConfirmDialog
          isOpen={isDeleteModalOpen}
          title={TEXT.ALERTS.DELETE_ARTIST_TITLE}
          message={TEXT.ALERTS.DELETE_ARTIST_MSG}
          confirmLabel={TEXT.BUTTONS.DELETE}
          isDestructive
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={() => onDeleteArtist(formData.id)}
        />
      </div>
    </PageShell>
  );
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  position: 'sticky',
  top: 0,
  zIndex: 100,
  background: theme.colors.background,
  padding: `${theme.spacing.sm} 0`,
};
const sectionTitleStyle: React.CSSProperties = {
  fontSize: '13px',
  color: theme.colors.textSecondary,
  fontWeight: 'bold',
  marginBottom: theme.spacing.sm,
  paddingLeft: '4px',
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid rgba(0,0,0,0.08)',
  background: 'rgba(255,255,255,0.4)',
  fontSize: '15px',
  outline: 'none',
};
const Field = ({ label, children }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <label style={{ fontSize: '12px', color: theme.colors.textSecondary, marginLeft: '4px' }}>{label}</label>
    {children}
  </div>
);
const Toggle = ({ active, onToggle }: any) => (
  <div
    onClick={onToggle}
    style={{
      width: '46px',
      height: '26px',
      borderRadius: '13px',
      background: active ? theme.colors.primary : '#E9E9EB',
      position: 'relative',
      cursor: 'pointer',
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: '2px',
        left: active ? '22px' : '2px',
        width: '22px',
        height: '22px',
        borderRadius: '11px',
        background: 'white',
        transition: 'left 0.2s',
      }}
    />
  </div>
);
