import React, { useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Gacha, GachaStatus } from '@/domain/types';
import { PageShell } from '@/components/common/PageShell';
import { GlassCard } from '@/components/common/GlassCard';
import { theme } from '@/components/common/theme';
import { GachaCard } from '@/components/GachaCard';
import { deriveGachaStatus, GACHA_STATUSES, getGachaStats } from '@/utils/gacha';

interface GachasPageProps {
  gachas: Gacha[];
  onOpenDetail: (id: string) => void;
  onExport: () => void;
  onImport: (data: any) => void;
  isMenuOpenExternally?: boolean;
  onMenuClose?: () => void;
  hideHeader?: boolean;
  menuOnly?: boolean;
}

type GachaSortKey = 'status_time' | 'date_asc' | 'date_desc' | 'name' | 'cost_desc';

const STATUS_ORDER: GachaStatus[] = ['発売前', '抽選予定', '抽選済み', '一部売却済み', '完了', '見送り'];

export const GachasPage: React.FC<GachasPageProps> = ({ gachas, onOpenDetail, onExport, onImport, isMenuOpenExternally, onMenuClose, hideHeader = false, menuOnly = false }) => {
  const [sortKey, setSortKey] = useState<GachaSortKey>('status_time');
  const [selectedStatuses, setSelectedStatuses] = useState<GachaStatus[] | undefined>(undefined);
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMenuOpen = isMenuOpenExternally ?? internalMenuOpen;
  const setIsMenuOpen = (value: boolean) => {
    if (onMenuClose && !value) onMenuClose();
    if (isMenuOpenExternally === undefined) setInternalMenuOpen(value);
  };

  const displayGachas = useMemo(() => {
    const allowed = new Set<GachaStatus>(selectedStatuses && selectedStatuses.length ? selectedStatuses : GACHA_STATUSES);
    const base = (gachas || []).filter((gacha) => allowed.has(deriveGachaStatus(gacha)));
    const getDate = (gacha: Gacha) => dayjs(gacha.drawDateTime || gacha.releaseDate || gacha.updatedAt || '2999-12-31').valueOf();
    return [...base].sort((a, b) => {
      if (sortKey === 'status_time') {
        const statusDiff = STATUS_ORDER.indexOf(deriveGachaStatus(a)) - STATUS_ORDER.indexOf(deriveGachaStatus(b));
        if (statusDiff !== 0) return statusDiff;
        return getDate(a) - getDate(b);
      }
      if (sortKey === 'date_desc') return getDate(b) - getDate(a);
      if (sortKey === 'name') return (a.name || '').localeCompare(b.name || '', 'ja');
      if (sortKey === 'cost_desc') return getGachaStats(b).finalCost - getGachaStats(a).finalCost;
      return getDate(a) - getDate(b);
    });
  }, [gachas, selectedStatuses, sortKey]);

  const toggleStatus = (status: GachaStatus) => {
    const base = selectedStatuses && selectedStatuses.length ? selectedStatuses : GACHA_STATUSES;
    const next = new Set<GachaStatus>(base);
    if (next.has(status)) next.delete(status);
    else next.add(status);
    setSelectedStatuses(next.size === 0 || next.size === GACHA_STATUSES.length ? undefined : Array.from(next));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        onImport(JSON.parse(e.target?.result as string));
        setIsMenuOpen(false);
      } catch (err) {
        console.error('Import failed:', err);
        window.alert('ファイルの読み込みに失敗しました。');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const menuLayer = (
    <>
      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />
      {isMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120 }} onClick={() => setIsMenuOpen(false)}>
          <GlassCard style={{ position: 'fixed', top: 'calc(12px + env(safe-area-inset-top) + 52px)', left: 16, width: 300, maxWidth: 'calc(100vw - 32px)' }} onClick={(e: any) => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <section>
                <div style={menuTitleStyle}>並び替え</div>
                <MenuItem label="ステータス + 日付" active={sortKey === 'status_time'} onClick={() => setSortKey('status_time')} />
                <MenuItem label="日付が近い順" active={sortKey === 'date_asc'} onClick={() => setSortKey('date_asc')} />
                <MenuItem label="日付が遠い順" active={sortKey === 'date_desc'} onClick={() => setSortKey('date_desc')} />
                <MenuItem label="名前順" active={sortKey === 'name'} onClick={() => setSortKey('name')} />
                <MenuItem label="最終費用が高い順" active={sortKey === 'cost_desc'} onClick={() => setSortKey('cost_desc')} />
              </section>
              <section style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)', paddingTop: 16 }}>
                <div style={menuTitleStyle}>ステータス絞り込み</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {GACHA_STATUSES.map((status) => (
                    <SmallChip key={status} label={status} active={!selectedStatuses || selectedStatuses.includes(status)} onClick={() => toggleStatus(status)} />
                  ))}
                </div>
              </section>
              <section style={{ borderTop: '0.5px solid rgba(0,0,0,0.1)', paddingTop: 16 }}>
                <div style={menuTitleStyle}>データ</div>
                <MenuItem label="データ書き出し" onClick={() => { onExport(); setIsMenuOpen(false); }} />
                <MenuItem label="データ読み込み" onClick={() => fileInputRef.current?.click()} />
              </section>
            </div>
          </GlassCard>
        </div>
      )}
    </>
  );

  if (menuOnly) return menuLayer;

  return (
    <PageShell disablePadding>
      {menuLayer}
      <div style={{ padding: hideHeader ? '0 0 140px' : '24px 16px 140px', marginTop: hideHeader ? 0 : 'calc(env(safe-area-inset-top) + 20px)' }}>
        {!hideHeader && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ width: 44, height: 44, borderRadius: 9999, border: '1px solid rgba(15,23,42,0.06)', background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px)', color: '#9CA3AF', boxShadow: '0 6px 18px rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></svg>
            </button>
          </div>
        )}
        {displayGachas.length === 0 ? (
          <div style={{ padding: '120px 0', textAlign: 'center', color: '#9CA3AF', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <div style={{ fontSize: 48, opacity: 0.25 }}>🎁</div>
            <div style={{ fontWeight: 700 }}>ガチャ情報がありません。</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
            {displayGachas.map((gacha) => <GachaCard key={gacha.id} gacha={gacha} onClick={() => onOpenDetail(gacha.id)} />)}
          </div>
        )}
      </div>
    </PageShell>
  );
};

const menuTitleStyle: React.CSSProperties = { fontSize: 12, fontWeight: 800, color: theme.colors.textSecondary, marginBottom: 8 };
const menuButtonBase: React.CSSProperties = { width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', background: 'transparent', color: theme.colors.text };
const MenuItem: React.FC<{ label: string; active?: boolean; onClick: () => void }> = ({ label, active = false, onClick }) => <button onClick={onClick} style={{ ...menuButtonBase, background: active ? 'rgba(83, 190, 232, 0.10)' : 'transparent', color: active ? theme.colors.primary : theme.colors.text, fontWeight: active ? 800 : 600 }}>{label}</button>;
const SmallChip: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => <button onClick={onClick} style={{ border: 'none', cursor: 'pointer', padding: '6px 10px', fontSize: 12, fontWeight: 800, borderRadius: 999, background: active ? 'rgba(83, 190, 232, 0.16)' : 'rgba(0,0,0,0.04)', color: active ? theme.colors.primary : theme.colors.textSecondary, whiteSpace: 'nowrap' }}>{label}</button>;
