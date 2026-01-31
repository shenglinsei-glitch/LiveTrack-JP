
import React, { useState, useRef } from 'react';
import { Tag, Typography } from 'antd';
import { PageShell } from '../ui/PageShell';
import { GlassCard } from '../ui/GlassCard';
import { theme } from '../ui/theme';
import { Icons } from '../ui/IconButton';
import { Exhibition } from '../domain/types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ExhibitionMenu } from '../components/ExhibitionMenu';
import dayjs from 'dayjs';

const { Text } = Typography;

interface ExhibitionsPageProps {
  exhibitions: Exhibition[];
  onUpdateExhibitions: (list: Exhibition[]) => void;
  onOpenDetail: (id: string) => void;
  isMenuOpenExternally?: boolean;
  onMenuClose?: () => void;
  onAddNew: () => void;
  onExport: () => void;
  onImport: (data: any) => void;
}

export const ExhibitionsPage: React.FC<ExhibitionsPageProps> = ({ 
  exhibitions, 
  onUpdateExhibitions, 
  onOpenDetail,
  isMenuOpenExternally, 
  onMenuClose,
  onAddNew,
  onExport,
  onImport
}) => {
  const [isMobile] = useState(window.innerWidth <= 480);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [stagedImportData, setStagedImportData] = useState<any>(null);
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

  const getStatus = (ex: Exhibition): { label: string; color: string } => {
    if (ex.visitedAt) return { label: '参加済', color: '#10B981' };
    
    const today = dayjs().startOf('day');
    const start = dayjs(ex.startDate).startOf('day');
    const end = dayjs(ex.endDate).endOf('day');

    if (today.isBefore(start)) return { label: '準備中', color: '#9CA3AF' };
    if (today.isAfter(end)) return { label: '終了', color: '#6B7280' };
    return { label: '開催中', color: theme.colors.primary };
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

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '16px',
        padding: '24px 16px 140px 16px',
        marginTop: 'calc(env(safe-area-inset-top) + 20px)'
      }}>
        {exhibitions.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '120px 0', textAlign: 'center', color: '#9CA3AF', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '48px', opacity: 0.3 }}><Icons.Exhibitions /></div>
            <div style={{ fontWeight: '600' }}>展覧会情報がありません。</div>
          </div>
        ) : (
          exhibitions.map(ex => {
            const status = getStatus(ex);
            return (
              <div key={ex.id} onClick={() => onOpenDetail(ex.id)} style={{ position: 'relative' }}>
                <GlassCard padding="0" style={{ overflow: 'hidden', height: '100%', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  <div style={{ position: 'relative', paddingTop: '140%', background: '#F3F4F6' }}>
                    {ex.imageUrl ? (
                      <img 
                        src={ex.imageUrl} 
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        alt={ex.title}
                      />
                    ) : (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                         <Icons.Exhibitions style={{ width: 48, height: 48 }} />
                      </div>
                    )}
                    
                    <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '4px' }}>
                      <Tag color={status.color} style={{ margin: 0, borderRadius: '8px', border: 'none', fontWeight: 900, fontSize: '11px', padding: '2px 10px' }}>
                        {status.label}
                      </Tag>
                    </div>

                    <div style={{ 
                      position: 'absolute', 
                      bottom: 0, 
                      left: 0, 
                      right: 0, 
                      padding: '24px 12px 12px', 
                      background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
                      color: 'white'
                    }}>
                      <div style={{ fontSize: '16px', fontWeight: '900', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                        {ex.title}
                      </div>
                      <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: '600' }}>
                        {ex.startDate?.replace(/-/g, '.')} - {ex.endDate?.replace(/-/g, '.')}
                      </div>
                    </div>
                  </div>
                </GlassCard>
                {ex.ticketSalesStatus === 'purchased' && (
                  <div style={{ 
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
                  }}>
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
        onExport={onExport}
        onImport={handleImportClick}
      />

      <ConfirmDialog 
        isOpen={isImportConfirmOpen} 
        title="データをインポート" 
        message="選択されたファイルで現在のすべてのデータが上書きされます。よろしいですか？" 
        confirmLabel="読み込む" 
        isDestructive 
        onClose={() => { setIsImportConfirmOpen(false); setStagedImportData(null); }} 
        onConfirm={executeImport} 
      />
    </PageShell>
  );
};
