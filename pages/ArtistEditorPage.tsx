
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
  onDeleteArtist: (artistId: string) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * 确保规格化函数包含所有判定相关的字段
 */
const normalizeLink = (link: Partial<SiteLink> | undefined | null): SiteLink => {
  return {
    name: typeof link?.name === 'string' ? link!.name : '',
    url: typeof link?.url === 'string' ? link!.url : '',
    autoTrack: typeof link?.autoTrack === 'boolean' ? link!.autoTrack : false,
    trackCapability: link?.trackCapability || 'unjudged', 
    trackCapabilityCheckedAt: link?.trackCapabilityCheckedAt,
    lastCheckedAt: link?.lastCheckedAt,
    lastSuccessAt: link?.lastSuccessAt,
    trackingStatus: link?.trackingStatus,
    errorMessage: link?.errorMessage,
    matchedKeywords: link?.matchedKeywords,
    lastHitAt: link?.lastHitAt,
    acknowledgedAt: link?.acknowledgedAt,
  };
};

type LinkJudgeResult = NonNullable<SiteLink['trackCapability']>;

export const ArtistEditorPage: React.FC<Props> = ({
  artistId,
  artist,
  onSave,
  onCancel,
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
  const [isBackConfirmOpen, setIsBackConfirmOpen] = useState(false);

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

  /**
   * 增强型 URL 判定规则
   */
  const judgeTrackability = (url: string): LinkJudgeResult => {
    const u = (url || '').trim();
    if (!u) return 'unjudged';

    const lower = u.toLowerCase();

    // 1. 社交媒体：直接判定为不可
    if (lower.includes('twitter.com') || lower.includes('x.com') || lower.includes('instagram.com') || lower.includes('facebook.com')) {
      return 'unsupported';
    }

    // 2. 详情页特征：判定为可 (高优先级)
    const hasDetailHint =
      lower.includes('in.html') ||
      lower.includes('id=') ||
      lower.includes('detail') ||
      lower.includes('article') ||
      lower.includes('post/') ||
      lower.includes('view/');
    
    if (hasDetailHint) return 'supported';

    // 3. 判定列表页/分页页：判定为不可
    // 匹配包含 /news/、/list/、/page/、/p/ 后面紧跟数字或特定结构的 URL
    const isNumberedList = /\/(news|list|page|p|archive)\/\d+/.test(lower);
    const isMrsGreenAppleList = /\/list\/\d+\/\d+/.test(lower); // 处理 /news/list/1/6/
    const isNewsRoot = /\/(news|list|p)\/?(\?.*)?$/.test(lower); // 处理以 /news 或 /news/ 结尾的路径

    if (isNumberedList || isMrsGreenAppleList || isNewsRoot) {
      return 'unsupported';
    }

    // 4. 特定的日程/巡演页面：判定为可
    if (lower.includes('/live') || lower.includes('/tour') || lower.includes('/schedule') || lower.includes('/concert')) {
      return 'supported';
    }

    return 'unjudged';
  };

  const getJudgeLabel = (r: LinkJudgeResult | undefined): string => {
    if (r === 'unsupported') return '不可';
    if (r === 'supported') return '可';
    return '未判定';
  };

  const handleLoadImage = () => {
    if (imageUrlDraft.trim()) {
      handleUpdateField('imageUrl', imageUrlDraft.trim());
    }
  };

  const handleBack = () => {
    if (hasChanges) {
      setIsBackConfirmOpen(true);
    } else {
      onCancel();
    }
  };

  const setLinks = (updater: (prev: SiteLink[]) => SiteLink[]) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.links) ? prev.links : [];
      return { ...prev, links: updater(current) };
    });
  };

  const addLink = () => {
    setLinks((prev) => [...prev, normalizeLink({ name: '', url: '', autoTrack: false, trackCapability: 'unjudged' })]);
  };

  const updateLink = (index: number, patch: Partial<SiteLink>) => {
    setLinks((prev) => prev.map((l, i) => (i !== index ? l : { ...normalizeLink(l), ...patch })));
  };

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * 判定按钮：确保从当前状态读取 URL 并写回结果
   */
  const runJudgeForLink = (index: number) => {
    setLinks((prev) => {
      const current = prev.map((l) => normalizeLink(l));
      const target = current[index];
      if (!target) return current;
      
      const result = judgeTrackability(target.url);
      const next = [...current];
      next[index] = {
        ...target,
        trackCapability: result,
        trackCapabilityCheckedAt: new Date().toISOString(),
      };
      return next;
    });
  };

  return (
    <PageShell
      header={
        <header style={headerStyle}>
          <IconButton
            icon={<Icons.X />}
            onClick={handleBack}
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
              <img src={formData.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '32px', opacity: 0.2 }}>👤</span>
            )}
          </div>
        </div>

        <section style={{ marginBottom: theme.spacing.xl }}>
          <h3 style={sectionTitleStyle}>基本情報</h3>
          <GlassCard padding={theme.spacing.md}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              <Field label="アーティスト名 (必须)">
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
                  <button onClick={handleLoadImage} style={loadButtonStyle}>
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
              <ToggleRow
                label="公演自動追跡"
                subLabel="新規ツアー・公演情報を自动取得します"
                active={formData.autoTrackConcerts}
                onToggle={() => handleUpdateField('autoTrackConcerts', !formData.autoTrackConcerts)}
              />
              <ToggleRow
                label="チケット自動追跡"
                subLabel="販売・抽選情報を自动更新します"
                active={formData.autoTrackTickets}
                onToggle={() => handleUpdateField('autoTrackTickets', !formData.autoTrackTickets)}
              />
            </div>
          </GlassCard>
        </section>

        <section style={{ marginBottom: theme.spacing.xl }}>
          <h3 style={sectionTitleStyle}>公式サイト・リンク</h3>
          <GlassCard padding={theme.spacing.md}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
              {formData.links.map((link, idx) => {
                const safe = normalizeLink(link);
                return (
                  <div key={idx} style={linkBoxStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', color: theme.colors.textSecondary, fontWeight: 800 }}>
                        サイト {idx + 1}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Toggle active={safe.autoTrack} onToggle={() => updateLink(idx, { autoTrack: !safe.autoTrack })} />
                        <button onClick={() => removeLink(idx)} style={iconBtnStyle}>
                          <Icons.Trash />
                        </button>
                      </div>
                    </div>
                    <Field label="サイト名">
                      <input
                        type="text"
                        value={safe.name}
                        onChange={(e) => updateLink(idx, { name: e.target.value })}
                        placeholder="公式サイト等"
                        style={inputStyle}
                      />
                    </Field>
                    <div style={{ height: '8px' }} />
                    <Field label="URL">
                      <input
                        type="url"
                        value={safe.url}
                        onChange={(e) => {
                          updateLink(idx, {
                            url: e.target.value,
                            trackCapability: 'unjudged',
                            trackCapabilityCheckedAt: undefined,
                          });
                        }}
                        placeholder="https://..."
                        style={inputStyle}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', minHeight: '18px' }}>
                        <div style={{ 
                          fontSize: '12px', 
                          color: safe.trackCapability === 'unsupported' ? theme.colors.error : theme.colors.textSecondary,
                          fontWeight: safe.trackCapability !== 'unjudged' ? 'bold' : 'normal'
                        }}>
                          {getJudgeLabel(safe.trackCapability)}
                        </div>
                        <button
                          type="button"
                          onClick={() => runJudgeForLink(idx)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            border: '1px solid rgba(0,0,0,0.10)',
                            background: 'rgba(255,255,255,0.55)',
                            fontSize: '12px',
                            color: theme.colors.textSecondary,
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          判定
                        </button>
                      </div>
                    </Field>
                  </div>
                );
              })}
              <button onClick={addLink} style={addLinkButtonStyle}>
                ＋ サイトを追加
              </button>
            </div>
          </GlassCard>
        </section>

        <button
          disabled={!hasChanges || !formData.name}
          onClick={() => onSave(formData)}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: theme.radius.button,
            fontWeight: 'bold',
            fontSize: '16px',
            cursor: 'pointer',
            border: 'none',
            color: 'white',
            background: !hasChanges || !formData.name ? 'rgba(0,0,0,0.05)' : theme.colors.primary,
          }}
        >
          {TEXT.BUTTONS.SAVE}
        </button>

        <ConfirmDialog
          isOpen={isDeleteModalOpen}
          title={TEXT.ALERTS.DELETE_ARTIST_TITLE}
          message={TEXT.ALERTS.DELETE_ARTIST_MSG}
          confirmLabel={TEXT.BUTTONS.DELETE}
          isDestructive
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={() => onDeleteArtist(formData.id)}
        />
        <ConfirmDialog
          isOpen={isBackConfirmOpen}
          title="変更を破棄しますか？"
          message="編集した内容は保存されません。戻りますか？"
          confirmLabel="戻る"
          onClose={() => setIsBackConfirmOpen(false)}
          onConfirm={onCancel}
        />
      </div>
    </PageShell>
  );
};

// --- Styles ---
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
const loadButtonStyle: React.CSSProperties = {
  padding: '0 16px',
  borderRadius: '12px',
  border: '1px solid rgba(0,0,0,0.08)',
  background: 'white',
  color: theme.colors.textSecondary,
  fontSize: '13px',
  fontWeight: 'bold',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
const addLinkButtonStyle: React.CSSProperties = {
  padding: '12px',
  borderRadius: '14px',
  border: '1px dashed rgba(0,0,0,0.12)',
  background: 'rgba(255,255,255,0.25)',
  color: theme.colors.primary,
  fontWeight: 900,
  fontSize: '13px',
  cursor: 'pointer',
};
const linkBoxStyle: React.CSSProperties = {
  border: '1px solid rgba(0,0,0,0.06)',
  background: 'rgba(255,255,255,0.35)',
  borderRadius: '16px',
  padding: '12px',
};
const iconBtnStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: theme.colors.textSecondary,
  cursor: 'pointer',
  padding: '6px',
};

const Field = ({ label, children }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <label style={{ fontSize: '12px', color: theme.colors.textSecondary, marginLeft: '4px' }}>{label}</label>
    {children}
  </div>
);

const ToggleRow = ({ label, subLabel, active, onToggle }: any) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div>
      <div style={{ fontWeight: '600', fontSize: '15px' }}>{label}</div>
      <div style={{ fontSize: '12px', color: theme.colors.textSecondary }}>{subLabel}</div>
    </div>
    <Toggle active={active} onToggle={onToggle} />
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
