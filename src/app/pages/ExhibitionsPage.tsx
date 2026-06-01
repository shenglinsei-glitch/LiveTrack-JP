import React, { useMemo, useRef, useState } from 'react';
import { PageShell } from '@/components/common/PageShell';
import { GlassCard } from '@/components/common/GlassCard';
import { theme } from '@/components/common/theme';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Icons } from '@/components/common/IconButton';
import { Exhibition, ExhibitionStatus } from '@/domain/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ExhibitionMenu, ExhibitionSortKey } from '@/components/ExhibitionMenu';
import dayjs from 'dayjs';

import { RemoteImage } from '@/components/RemoteImage';
import { getEffectiveExhibitionStatus } from '@/domain/logic';
import { ExhibitionCard } from '@/components/ExhibitionCard';

interface ExhibitionsPageProps {
  exhibitions: Exhibition[];
  onUpdateExhibitions: (list: Exhibition[]) => void;
  onOpenDetail: (id: string) => void;
  isMenuOpenExternally?: boolean;
  onMenuClose?: () => void;
  onAddNew: () => void;
  onExport: () => void;
  onImport: (data: any) => void;
  hideHeader?: boolean;
}

export const ExhibitionsPage: React.FC<ExhibitionsPageProps> = ({
  exhibitions,
  onUpdateExhibitions,
  onOpenDetail,
  isMenuOpenExternally,
  onMenuClose,
  onAddNew,
  onExport,
  onImport,
  hideHeader
}) => {
  const [isMobile] = useState(window.innerWidth <= 480);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [stagedImportData, setStagedImportData] = useState<any>(null);
  const [sortKey, setSortKey] = useState<ExhibitionSortKey>('status_time');
  const [selectedStatuses, setSelectedStatuses] = useState<ExhibitionStatus[] | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        setStagedImportData(json);
        setIsImportConfirmOpen(true);
      } catch (err) {
        console.error('Import failed:', err);
        window.alert('ファイルの読み込みに失敗しました。');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const executeImport = () => {
    if (stagedImportData) {
      onImport(stagedImportData);
      setStagedImportData(null);
    }
    setIsImportConfirmOpen(false);
  };


  const displayExhibitions = useMemo(() => {
    const allowed = new Set<ExhibitionStatus>(selectedStatuses && selectedStatuses.length ? selectedStatuses : ['NONE', 'PLANNED', 'RESERVED', 'VISITED', 'SKIPPED', 'ENDED']);
    const list = (exhibitions || []).filter((ex) => allowed.has(getEffectiveExhibitionStatus(ex)));
    const getStart = (ex: Exhibition) => dayjs(ex.startDate).valueOf() || 0;
    const getEnd = (ex: Exhibition) => dayjs(ex.endDate || ex.startDate).valueOf() || getStart(ex);
    const exhibitionStatusOrder: Record<ExhibitionStatus, number> = {
      PLANNED: 0,   // 開催中
      RESERVED: 1,  // 予約済（開催中寄り）
      NONE: 2,      // 準備中
      VISITED: 3,   // 参戦済み
      SKIPPED: 4,   // 見送り
      ENDED: 5,     // 終了
    };
    const getStatusTime = (ex: Exhibition) => {
      const status = getEffectiveExhibitionStatus(ex);
      if (status === 'VISITED' && ex.visitedAt) return dayjs(ex.visitedAt).valueOf() || getEnd(ex);
      if (status === 'ENDED' || status === 'SKIPPED') return getEnd(ex);
      return getStart(ex);
    };
    const sorted = [...list].sort((a, b) => {
      if (sortKey === 'status_time') {
        const statusDiff = exhibitionStatusOrder[getEffectiveExhibitionStatus(a)] - exhibitionStatusOrder[getEffectiveExhibitionStatus(b)];
        if (statusDiff !== 0) return statusDiff;
        return getStatusTime(a) - getStatusTime(b);
      }
      if (sortKey === 'date_asc') return getStart(a) - getStart(b);
      if (sortKey === 'date_desc') return getStart(b) - getStart(a);
      if (sortKey === 'name_desc') return (b.title || '').localeCompare(a.title || '');
      return (a.title || '').localeCompare(b.title || '');
    });
    return sorted;
  }, [exhibitions, selectedStatuses, sortKey]);

  const toggleStatus = (status: ExhibitionStatus) => {
    const base = selectedStatuses && selectedStatuses.length ? selectedStatuses : ['NONE', 'PLANNED', 'RESERVED', 'VISITED', 'SKIPPED', 'ENDED'];
    const next = new Set<ExhibitionStatus>(base);
    if (next.has(status)) next.delete(status);
    else next.add(status);
    const result = next.size === 0 || next.size === 6 ? undefined : Array.from(next);
    setSelectedStatuses(result);
  };


  return (
    <PageShell disablePadding>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleFileChange}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '16px',
          padding: hideHeader ? '8px 16px 140px 16px' : '24px 16px 140px 16px',
          marginTop: hideHeader ? 0 : 'calc(env(safe-area-inset-top) + 20px)'
        }}
      >
        {displayExhibitions.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '120px 0',
              textAlign: 'center',
              color: '#9CA3AF',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            <div style={{ fontSize: '48px', opacity: 0.3 }}>
              <Icons.Exhibitions />
            </div>
            <div style={{ fontWeight: '600' }}>展覧情報がありません。</div>
          </div>
        ) : (
          displayExhibitions.map((ex) => (
            <ExhibitionCard key={ex.id} exhibition={ex} onClick={() => onOpenDetail(ex.id)} />
          ))
        )}
      </div>

      <ExhibitionMenu
        isOpen={!!isMenuOpenExternally}
        onClose={() => onMenuClose?.()}
        onAddNew={onAddNew}
        showAddAction={false}
        position={hideHeader ? 'top-left' : 'bottom-right'}
        onExport={onExport}
        onImport={handleImportClick}
        sortKey={sortKey}
        onSetSortKey={setSortKey}
        selectedStatuses={selectedStatuses}
        onToggleStatus={toggleStatus}
        onSelectAllStatuses={() => setSelectedStatuses(undefined)}
      />

      <ConfirmDialog
        isOpen={isImportConfirmOpen}
        title="データ読み込み"
        message="選択されたファイルで現在のすべてのデータが上書きされます。よろしいですか？"
        confirmLabel="読み込む"
        isDestructive
        onClose={() => {
          setIsImportConfirmOpen(false);
          setStagedImportData(null);
        }}
        onConfirm={executeImport}
      />
    </PageShell>
  );
};
