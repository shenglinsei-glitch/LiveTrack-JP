import React, { useMemo, useRef, useState } from 'react';
import { PageShell } from '../ui/PageShell';
import { GlassCard } from '../ui/GlassCard';
import { theme } from '../ui/theme';
import { Icons } from '../ui/IconButton';
import { Exhibition, ExhibitionStatus } from '../domain/types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ExhibitionMenu, ExhibitionSortKey } from '../components/ExhibitionMenu';
import dayjs from 'dayjs';

import { RemoteImage } from '../components/RemoteImage';
import { getEffectiveExhibitionStatus } from '../domain/logic';

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

const StatusTag: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 10px',
      borderRadius: '8px',
      fontWeight: 900,
      fontSize: '11px',
      background: color,
      color: 'white',
      boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
      lineHeight: 1.6
    }}
  >
    {children}
  </span>
);

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
  const [sortKey, setSortKey] = useState<ExhibitionSortKey>('date_asc');
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
    const sorted = [...list].sort((a, b) => {
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

  const getStatus = (ex: Exhibition): { label: string; color: string } => {
    const effectiveStatus = getEffectiveExhibitionStatus(ex);
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

    return { 
      label: exhibitionStatusLabelMap[effectiveStatus] || '未定', 
      color: statusColors[effectiveStatus] || '#9CA3AF' 
    };
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
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
          padding: '24px 16px 140px 16px',
          marginTop: 'calc(env(safe-area-inset-top) + 20px)'
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
            <div style={{ fontWeight: '600' }}>展覧会情報がありません。</div>
          </div>
        ) : (
          displayExhibitions.map((ex) => {
            const status = getStatus(ex);
            return (
              <div key={ex.id} onClick={() => onOpenDetail(ex.id)} style={{ position: 'relative' }}>
                <GlassCard
                  padding="0"
                  style={{
                    overflow: 'hidden',
                    height: '100%',
                    borderRadius: '24px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
                  }}
                >
                  <div style={{ position: 'relative', paddingTop: '140%', background: '#F3F4F6' }}>
                    <RemoteImage 
                      imageUrl={ex.imageUrl} 
                      imageId={ex.imageId}
                      alt={ex.title}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      fallback={(
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.2
                          }}
                        >
                          <Icons.Exhibitions style={{ width: 48, height: 48 }} />
                        </div>
                      )}
                    />

                    <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '4px' }}>
                      <StatusTag color={status.color}>{status.label}</StatusTag>
                    </div>

                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '24px 12px 12px',
                        background:
                          'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
                        color: 'white'
                      }}
                    >
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: '900',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginBottom: '2px'
                        }}
                      >
                        {ex.title}
                      </div>
                      <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: '600' }}>
                        {ex.startDate?.replace(/-/g, '.')} - {ex.endDate?.replace(/-/g, '.')}
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {(ex.advanceTicketPurchased || ex.ticketSalesStatus === 'purchased') && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: '#10B981',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 900,
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    購入済
                  </div>
                )}
              </div>
            );
          })
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
        title="データを読み込む"
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
