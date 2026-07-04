import React, { useEffect, useMemo, useState } from 'react';
import { Gacha, GachaKind, GachaPrize, GachaStatus } from '@/domain/types';
import { DetailHeader, DetailChip } from '@/components/detail/DetailHeader';
import { DetailPageLayout } from '@/components/detail/DetailPageLayout';
import { Label, SectionTitle, Value } from '@/components/detail/DetailText';
import { GlassCard } from '@/components/common/GlassCard';
import { Icons, IconButton } from '@/components/common/IconButton';
import { theme } from '@/components/common/theme';
import { NativeDateTimeInput, centeredNativeDateTimeInputStyle } from '@/components/common/nativeDateInput';
import { deriveGachaStatus, formatCurrency, formatDate, formatDateTime, GACHA_STATUSES, getGachaStats, getGachaStatusTone, getPrizeSoldAmount } from '@/utils/gacha';

interface GachaDetailPageProps {
  gacha: Gacha;
  onUpdateGacha: (gacha: Gacha) => void;
  onDeleteGacha: (id: string) => void;
  onBack: () => void;
  initialEditMode?: boolean;
}

const GACHA_KINDS: GachaKind[] = ['ガチャ', '一番くじ', 'ブラインド商品', 'ランダム特典', 'その他'];

const inputStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  minHeight: 54,
  borderRadius: 18,
  border: '1px solid rgba(15,23,42,0.08)',
  background: 'rgba(255,255,255,0.85)',
  padding: '0 16px',
  fontSize: 15,
  color: theme.colors.text,
  outline: 'none',
};

const nativeDateInputStyle: React.CSSProperties = {
  ...inputStyle,
  ...centeredNativeDateTimeInputStyle,
  colorScheme: 'light',
  WebkitAppearance: 'none',
  appearance: 'none',
};

const sectionCardStyle: React.CSSProperties = { marginBottom: 14 };
const collapseButtonStyle: React.CSSProperties = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' };
const infoGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 };
const infoItemStyle: React.CSSProperties = { minWidth: 0, wordBreak: 'break-word' };

const createId = (prefix = 'gacha-prize') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const Input: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string; type?: string; suffix?: string }> = ({ value, onChange, placeholder, type = 'text', suffix }) => (
  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', minWidth: 0 }}>
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} style={{ ...inputStyle, paddingRight: suffix ? 50 : inputStyle.paddingRight }} />
    {suffix && <span style={{ position: 'absolute', right: 16, fontSize: 14, color: theme.colors.textSecondary, fontWeight: 800 }}>{suffix}</span>}
  </div>
);

const TextArea: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      ...inputStyle,
      minHeight: 110,
      padding: '14px 16px',
      resize: 'vertical',
      lineHeight: 1.6,
      fontFamily: 'inherit',
    }}
  />
);

const DatePicker: React.FC<{ value?: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <NativeDateTimeInput type="date" value={value} onChange={onChange} style={nativeDateInputStyle} />
);

const DateTimePicker: React.FC<{ value?: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <NativeDateTimeInput type="datetime-local" value={value} onChange={onChange} style={nativeDateInputStyle} />
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
    <label style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: 800, marginLeft: 4 }}>{label}</label>
    {children}
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <GlassCard style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 14, fontWeight: 900, color: theme.colors.text, marginBottom: 14 }}>{title}</div>
    <div style={{ display: 'grid', gap: 14 }}>{children}</div>
  </GlassCard>
);

const ViewSection: React.FC<{ title: string; children: React.ReactNode; countLabel?: string; defaultOpen?: boolean }> = ({ title, children, countLabel, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <GlassCard padding="20px" style={sectionCardStyle}>
      <button type="button" onClick={() => setOpen(v => !v)} style={collapseButtonStyle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <SectionTitle title={title} style={{ marginTop: 0, marginBottom: open ? 12 : 0 }} dividerStyle={{ opacity: open ? 1 : 0 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 2 }}>
          {countLabel ? <span style={{ fontSize: 11, fontWeight: 800, color: theme.colors.textWeak, whiteSpace: 'nowrap' }}>{countLabel}</span> : null}
          <Icons.ChevronLeft style={{ width: 18, height: 18, color: theme.colors.textWeak, transform: open ? 'rotate(-90deg)' : 'rotate(180deg)', transition: 'transform 0.2s ease' }} />
        </div>
      </button>
      {open ? children : null}
    </GlassCard>
  );
};

const SelectRow: React.FC<{ options: string[]; value: string; onChange: (v: string) => void }> = ({ options, value, onChange }) => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    {options.map(opt => (
      <button key={opt} type="button" onClick={() => onChange(opt)} style={{ flex: 1, minWidth: 86, padding: '12px', borderRadius: 14, border: opt === value ? `2px solid ${theme.colors.primary}` : '1px solid rgba(0,0,0,0.08)', background: opt === value ? 'rgba(83,190,232,0.08)' : 'white', color: opt === value ? theme.colors.primary : theme.colors.text, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
        {opt}
      </button>
    ))}
  </div>
);

const AddButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button type="button" onClick={onClick} style={{ padding: '12px', borderRadius: 14, border: '1px dashed rgba(0,0,0,0.2)', background: 'transparent', color: theme.colors.textSecondary, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>+ {children}</button>
);

const DeleteButton: React.FC<{ onClick: () => void; label?: string }> = ({ onClick, label = '削除' }) => (
  <button type="button" onClick={onClick} style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'white', color: theme.colors.error, fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>{label}</button>
);

const StatTile: React.FC<{ label: string; value: React.ReactNode; strong?: boolean; negative?: boolean }> = ({ label, value, strong, negative }) => (
  <div style={{ borderRadius: 18, background: strong ? 'rgba(83,190,232,0.12)' : 'rgba(255,255,255,0.62)', border: strong ? '1px solid rgba(83,190,232,0.18)' : '1px solid rgba(15,23,42,0.05)', padding: '14px 12px', minWidth: 0 }}>
    <div style={{ fontSize: 11, fontWeight: 900, color: theme.colors.textWeak, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: strong ? 20 : 16, fontWeight: 900, color: negative ? theme.colors.error : strong ? theme.colors.primary : theme.colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
  </div>
);

const PrizeThumb: React.FC<{ prize: GachaPrize }> = ({ prize }) => (
  <div style={{ width: 58, height: 58, borderRadius: 16, overflow: 'hidden', background: '#F3F4F6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {prize.imageUrl ? <img src={prize.imageUrl} alt={prize.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 25, opacity: 0.28 }}>🎁</span>}
  </div>
);

export const GachaDetailPage: React.FC<GachaDetailPageProps> = ({ gacha, onUpdateGacha, onDeleteGacha, onBack, initialEditMode = false }) => {
  const [isEditMode, setIsEditMode] = useState(initialEditMode);
  const [formData, setFormData] = useState<Gacha>(gacha);

  useEffect(() => setFormData(gacha), [gacha]);

  const stats = useMemo(() => getGachaStats(formData), [formData]);
  const effectiveStatus = deriveGachaStatus(formData);
  const tone = getGachaStatusTone(effectiveStatus);

  const updateField = (field: keyof Gacha, value: any) => setFormData(prev => ({ ...prev, [field]: value }));
  const updatePrize = (id: string, updates: Partial<GachaPrize>) => setFormData(prev => ({ ...prev, prizes: (prev.prizes || []).map(prize => prize.id === id ? { ...prize, ...updates } : prize) }));
  const addPrize = () => setFormData(prev => ({ ...prev, prizes: [...(prev.prizes || []), { id: createId(), name: '', imageUrl: '', rank: '', wanted: false, wonCount: 0, keepCount: 0, soldCount: 0, salePrice: undefined, soldTotal: undefined, memo: '' }] }));
  const removePrize = (id: string) => setFormData(prev => ({ ...prev, prizes: (prev.prizes || []).filter(prize => prize.id !== id) }));

  const save = () => {
    const next: Gacha = { ...formData, status: deriveGachaStatus(formData), updatedAt: new Date().toISOString() };
    onUpdateGacha(next);
    setFormData(next);
    setIsEditMode(false);
  };

  return (
    <DetailPageLayout backgroundUrl={formData.posterUrl} bottomPadding={120}>
      <DetailHeader
        title={formData.name}
        onTitleChange={(value) => updateField('name', value)}
        titlePlaceholder="名前未設定"
        isEditMode={isEditMode}
        posterUrl={formData.posterUrl}
        posterAlt={formData.name}
        posterFallback={<div style={{ fontSize: 48, opacity: 0.2 }}>🎁</div>}
        onBack={onBack}
        actions={(
          <>
            {isEditMode ? <IconButton icon={<Icons.Check />} onClick={() => save()} primary /> : <IconButton icon={<Icons.Edit />} onClick={() => setIsEditMode(true)} style={{ background: 'rgba(255,255,255,0.82)', border: 'none', color: theme.colors.primary }} />}
            <IconButton icon={<Icons.Trash />} onClick={() => { if (window.confirm('このガチャ記録を削除しますか？')) onDeleteGacha(gacha.id); }} style={{ background: 'rgba(255,255,255,0.82)', border: 'none', color: theme.colors.error }} />
          </>
        )}
        tags={(
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 28, padding: '0 12px', borderRadius: 999, fontSize: 12, fontWeight: 900, color: '#fff', background: tone.color, boxShadow: '0 4px 12px rgba(0,0,0,0.10)', whiteSpace: 'nowrap', lineHeight: 1 }}>{tone.label}</span>
            <DetailChip label={formData.kind} subtle />
            {stats.drawCount > 0 ? <DetailChip label={`${stats.drawCount}回`} subtle /> : null}
          </>
        )}
      />

      {isEditMode ? (
        <>
          <Section title="基本情報">
            <Field label="ポスターURL"><Input value={formData.posterUrl || ''} onChange={(v) => updateField('posterUrl', v)} placeholder="https://..." /></Field>
            <Field label="種類"><SelectRow options={GACHA_KINDS} value={formData.kind} onChange={(v) => updateField('kind', v as GachaKind)} /></Field>
            <Field label="ステータス"><SelectRow options={GACHA_STATUSES} value={formData.status} onChange={(v) => updateField('status', v as GachaStatus)} /></Field>
            <Field label="発売日"><DatePicker value={formData.releaseDate} onChange={(v) => updateField('releaseDate', v)} /></Field>
            <Field label="抽選日時"><DateTimePicker value={formData.drawDateTime} onChange={(v) => updateField('drawDateTime', v)} /></Field>
            <Field label="抽選場所"><Input value={formData.drawPlace || ''} onChange={(v) => updateField('drawPlace', v)} placeholder="店舗・会場・オンライン" /></Field>
          </Section>

          <Section title="費用">
            <Field label="1回の料金"><Input value={formData.pricePerDraw?.toString() || ''} onChange={(v) => updateField('pricePerDraw', v === '' ? undefined : Number(v))} type="number" suffix="円" /></Field>
            <Field label="抽選回数"><Input value={formData.drawCount?.toString() || ''} onChange={(v) => updateField('drawCount', v === '' ? undefined : Number(v))} type="number" suffix="回" /></Field>
            <Field label="その他費用"><Input value={formData.otherCosts?.toString() || ''} onChange={(v) => updateField('otherCosts', v === '' ? undefined : Number(v))} type="number" suffix="円" /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <StatTile label="抽選総額" value={formatCurrency(stats.drawSubtotal)} />
              <StatTile label="売却回収" value={`-${formatCurrency(stats.soldTotal)}`} negative />
              <StatTile label="最終費用" value={formatCurrency(stats.finalCost)} strong />
              <StatTile label="保留1個あたり" value={stats.unitKeepCost !== undefined ? formatCurrency(stats.unitKeepCost) : '未計算'} />
            </div>
          </Section>

          <Section title="ラインナップ / 抽選結果">
            {(formData.prizes || []).map((prize, index) => (
              <GlassCard key={prize.id} padding="14px" style={{ borderRadius: 22, background: 'rgba(255,255,255,0.56)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: theme.colors.textSecondary }}>#{index + 1}</div>
                  <DeleteButton onClick={() => removePrize(prize.id)} />
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <Field label="画像URL"><Input value={prize.imageUrl || ''} onChange={(v) => updatePrize(prize.id, { imageUrl: v })} placeholder="https://..." /></Field>
                  <Field label="名前"><Input value={prize.name || ''} onChange={(v) => updatePrize(prize.id, { name: v })} placeholder="賞品名 / キャラ名" /></Field>
                  <Field label="賞 / レア度"><Input value={prize.rank || ''} onChange={(v) => updatePrize(prize.id, { rank: v })} placeholder="A賞 / レア / ノーマル" /></Field>
                  <Field label="欲しい"><SelectRow options={['欲しい', '不要']} value={prize.wanted ? '欲しい' : '不要'} onChange={(v) => updatePrize(prize.id, { wanted: v === '欲しい' })} /></Field>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                    <Field label="抽中"><Input value={prize.wonCount?.toString() || ''} onChange={(v) => updatePrize(prize.id, { wonCount: v === '' ? 0 : Number(v) })} type="number" suffix="個" /></Field>
                    <Field label="保留"><Input value={prize.keepCount?.toString() || ''} onChange={(v) => updatePrize(prize.id, { keepCount: v === '' ? 0 : Number(v) })} type="number" suffix="個" /></Field>
                    <Field label="売却"><Input value={prize.soldCount?.toString() || ''} onChange={(v) => updatePrize(prize.id, { soldCount: v === '' ? 0 : Number(v) })} type="number" suffix="個" /></Field>
                    <Field label="売却単価"><Input value={prize.salePrice?.toString() || ''} onChange={(v) => updatePrize(prize.id, { salePrice: v === '' ? undefined : Number(v), soldTotal: undefined })} type="number" suffix="円" /></Field>
                  </div>
                  <Field label="売却合計（手入力可）"><Input value={prize.soldTotal?.toString() || ''} onChange={(v) => updatePrize(prize.id, { soldTotal: v === '' ? undefined : Number(v) })} type="number" suffix="円" /></Field>
                  <Field label="メモ"><TextArea value={prize.memo || ''} onChange={(v) => updatePrize(prize.id, { memo: v })} placeholder="交換予定、売却先など" /></Field>
                </div>
              </GlassCard>
            ))}
            <AddButton onClick={addPrize}>款式を追加</AddButton>
          </Section>

          <Section title="メモ">
            <TextArea value={formData.memo || ''} onChange={(v) => updateField('memo', v)} placeholder="抽選の感想、狙い、交換予定など" />
          </Section>
        </>
      ) : (
        <>
          <ViewSection title="基本情報">
            <div style={infoGridStyle}>
              <div style={infoItemStyle}><Label>種類</Label><Value>{formData.kind}</Value></div>
              <div style={infoItemStyle}><Label>発売日</Label><Value>{formatDate(formData.releaseDate)}</Value></div>
              <div style={infoItemStyle}><Label>抽選日時</Label><Value>{formatDateTime(formData.drawDateTime)}</Value></div>
              <div style={infoItemStyle}><Label>抽選場所</Label><Value>{formData.drawPlace}</Value></div>
              <div style={infoItemStyle}><Label>抽選回数</Label><Value>{stats.drawCount ? `${stats.drawCount}回` : null}</Value></div>
              <div style={infoItemStyle}><Label>抽中総数</Label><Value>{stats.wonTotal ? `${stats.wonTotal}個` : null}</Value></div>
            </div>
          </ViewSection>

          <ViewSection title="費用まとめ">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <StatTile label="1回料金" value={formatCurrency(stats.pricePerDraw)} />
              <StatTile label="抽選総額" value={formatCurrency(stats.drawSubtotal)} />
              <StatTile label="その他費用" value={formatCurrency(stats.otherCosts)} />
              <StatTile label="売却回収" value={`-${formatCurrency(stats.soldTotal)}`} negative />
              <StatTile label="最終費用" value={formatCurrency(stats.finalCost)} strong />
              <StatTile label="保留1個あたり" value={stats.unitKeepCost !== undefined ? formatCurrency(stats.unitKeepCost) : '未計算'} />
            </div>
          </ViewSection>

          <ViewSection title="抽選結果" countLabel={(formData.prizes || []).length ? `${formData.prizes.length}款` : undefined}>
            {(formData.prizes || []).length === 0 ? (
              <Value>まだラインナップがありません</Value>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {(formData.prizes || []).map((prize) => {
                  const soldAmount = getPrizeSoldAmount(prize);
                  return (
                    <div key={prize.id} style={{ display: 'flex', gap: 12, alignItems: 'center', borderRadius: 20, background: 'rgba(255,255,255,0.62)', border: '1px solid rgba(15,23,42,0.05)', padding: 12, minWidth: 0 }}>
                      <PrizeThumb prize={prize} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 0, marginBottom: 4 }}>
                          {prize.rank ? <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 900, color: theme.colors.primary, background: 'rgba(83,190,232,0.12)', borderRadius: 999, padding: '3px 7px' }}>{prize.rank}</span> : null}
                          <div style={{ fontSize: 14, fontWeight: 900, color: theme.colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prize.name || '名称未設定'}</div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11, fontWeight: 800, color: theme.colors.textSecondary }}>
                          <span>{prize.wanted ? '欲しい' : '不要'}</span>
                          <span>抽中 {prize.wonCount || 0}</span>
                          <span>保留 {prize.keepCount || 0}</span>
                          <span>売却 {prize.soldCount || 0}</span>
                          {soldAmount > 0 ? <span style={{ color: theme.colors.error }}>回収 {formatCurrency(soldAmount)}</span> : null}
                        </div>
                        {prize.memo ? <div style={{ marginTop: 5, fontSize: 12, fontWeight: 600, color: theme.colors.textSecondary, lineHeight: 1.45 }}>{prize.memo}</div> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ViewSection>

          <ViewSection title="結果サマリー">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <StatTile label="欲しい抽中" value={`${stats.wantedWonTotal}個`} />
              <StatTile label="不要抽中" value={`${stats.unwantedWonTotal}個`} />
              <StatTile label="保留" value={`${stats.keepTotal}個`} />
              <StatTile label="売却" value={`${stats.soldCount}個`} />
            </div>
          </ViewSection>

          <ViewSection title="メモ" defaultOpen={!!formData.memo}>
            <Value style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, fontWeight: 600 }}>{formData.memo || null}</Value>
          </ViewSection>
        </>
      )}
    </DetailPageLayout>
  );
};
