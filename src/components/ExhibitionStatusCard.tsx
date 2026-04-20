import React from 'react';
import { Exhibition, StatusItem } from '../domain/types';
import { theme } from '../ui/theme';
import { RemoteImage } from './RemoteImage';

interface Props {
  item: StatusItem;
  onOpenExhibitionDetail: (id: string) => void;
  onOpenExhibitionDateModal: (item: StatusItem, mode: 'reserve' | 'visit') => void;
  onUpdateExhibitionStatus: (id: string, updates: Partial<Exhibition>) => void;
}

const actionPrimaryBtn: React.CSSProperties = {
  flex: 1,
  border: 'none',
  borderRadius: 12,
  background: theme.colors.primary,
  color: 'white',
  padding: '12px 16px',
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
};

const actionGhostBtn: React.CSSProperties = {
  ...actionPrimaryBtn,
  background: 'rgba(0,0,0,0.06)',
  color: theme.colors.text,
};

const badgeBgFromColor = (color: string) => {
  const normalized = color.toLowerCase();
  if (normalized === theme.colors.status['発売前'].toLowerCase()) return theme.colors.badges.processing.bg;
  if (normalized === theme.colors.status['検討中'].toLowerCase()) return theme.colors.badges.considering.bg;
  if (normalized === theme.colors.status['抽選中'].toLowerCase()) return theme.colors.badges.lottery.bg;
  if (normalized === theme.colors.status['参戦予定'].toLowerCase()) return theme.colors.badges.confirmed.bg;
  if (normalized === theme.colors.status['参戦済み'].toLowerCase()) return theme.colors.badges.completed.bg;
  if (normalized === theme.colors.status['見送'].toLowerCase()) return theme.colors.badges.skipped.bg;
  return 'rgba(83, 190, 232, 0.12)';
};

const getExhibitionStatusTone = (status: string) => {
  switch (status) {
    case 'PLANNED':
      return { color: theme.colors.status['参戦予定'], bg: theme.colors.badges.confirmed.bg, label: '開催中' };
    case 'RESERVED':
      return { color: theme.colors.status['抽選中'], bg: theme.colors.badges.lottery.bg, label: '予約済' };
    case 'VISITED':
      return { color: theme.colors.status['参戦済み'], bg: theme.colors.badges.completed.bg, label: '訪問済' };
    case 'SKIPPED':
      return { color: theme.colors.status['見送'], bg: theme.colors.badges.skipped.bg, label: '見送る' };
    case 'ENDED':
      return { color: theme.colors.textWeak, bg: 'rgba(0,0,0,0.04)', label: '終了' };
    default:
      return { color: theme.colors.primary, bg: 'rgba(83, 190, 232, 0.12)', label: '開催中' };
  }
};

const formatCompactDate = (dateStr: string) => {
  if (!dateStr) return '';
  const normalized = dateStr.replace('T', ' ');
  const parts = normalized.split(' ')[0].split('-');
  if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
  return normalized;
};

const parseNormalDate = (dateStr?: string) => {
  if (!dateStr) return null;
  const normalized = dateStr.replace(/-/g, '/');
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
};

const getExhibitionMeta = (item: StatusItem) => {
  if (item.status === 'RESERVED') {
    return {
      type: '訪問予定',
      value: item.raw.visitedAt || item.date || '',
    };
  }

  if (item.status === 'VISITED') {
    return {
      type: '訪問日時',
      value: item.raw.visitedAt || item.date || '',
    };
  }

  return {
    type: '会期',
    value: item.raw.endDate ? `${formatCompactDate(item.raw.startDate)} - ${formatCompactDate(item.raw.endDate)}` : formatCompactDate(item.date),
  };
};

export const ExhibitionStatusCard: React.FC<Props> = ({
  item,
  onOpenExhibitionDetail,
  onOpenExhibitionDateModal,
  onUpdateExhibitionStatus,
}) => {
  const statusTone = getExhibitionStatusTone(item.status);
  const imageId = Array.isArray(item.raw.imageIds) && item.raw.imageIds.length > 0 ? item.raw.imageIds[0] : undefined;
  const meta = getExhibitionMeta(item);

  const renderActions = () => {
    if (item.status === 'PLANNED') {
      return (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', padding: '0 4px' }}>
          <button onClick={(e) => { e.stopPropagation(); onOpenExhibitionDateModal(item, 'reserve'); }} style={actionPrimaryBtn}>予約済</button>
          <button onClick={(e) => { e.stopPropagation(); onOpenExhibitionDateModal(item, 'visit'); }} style={actionGhostBtn}>訪問済</button>
          <button onClick={(e) => { e.stopPropagation(); onUpdateExhibitionStatus(item.parentId, { status: 'SKIPPED', visitedAt: undefined }); }} style={actionGhostBtn}>見送る</button>
        </div>
      );
    }

    if (item.status === 'RESERVED') {
      const reservedAt = item.raw.visitedAt ? parseNormalDate(item.raw.visitedAt) : null;
      const canActOnReserved = !reservedAt || new Date() >= reservedAt;
      if (!canActOnReserved) return null;
      return (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', padding: '0 4px' }}>
          <button onClick={(e) => { e.stopPropagation(); onUpdateExhibitionStatus(item.parentId, { status: 'VISITED' }); }} style={actionPrimaryBtn}>訪問済</button>
          <button onClick={(e) => { e.stopPropagation(); onUpdateExhibitionStatus(item.parentId, { status: 'SKIPPED', visitedAt: undefined }); }} style={actionGhostBtn}>見送る</button>
        </div>
      );
    }

    return null;
  };

  const hasActions = item.status === 'PLANNED' || item.status === 'RESERVED';

  return (
    <div>
      <div
        onClick={() => onOpenExhibitionDetail(item.parentId)}
        style={{
          background: 'white',
          borderRadius: '24px',
          border: '1px solid rgba(0, 0, 0, 0.04)',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          transition: 'all 0.2s',
          marginBottom: hasActions ? '4px' : '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#F3F4F6',
              flexShrink: 0,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RemoteImage
              imageUrl={item.raw.imageUrl}
              imageId={imageId}
              alt={item.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              fallback={<span style={{ fontSize: '18px', opacity: 0.2 }}>🖼️</span>}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ fontSize: '12px', color: theme.colors.textSecondary, fontWeight: '700', minWidth: 0 }}>
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.raw.venueName || item.raw.venue || '展覧会'}
                </div>
              </div>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: '800',
                  color: statusTone.color,
                  background: statusTone.bg || badgeBgFromColor(statusTone.color),
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(0,0,0,0.06)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {item.displayStatus || statusTone.label}
              </div>
            </div>

            <div
              style={{
                fontWeight: '800',
                fontSize: '15px',
                color: theme.colors.text,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: 2,
              }}
            >
              {item.title}
            </div>

            <div
              style={{
                fontSize: '12px',
                color: theme.colors.textSecondary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: 2,
              }}
              title={`${meta.type}：${meta.value}`}
            >
              <span style={{ fontWeight: '800', color: theme.colors.textMain }}>{meta.type}：</span> {meta.value}
            </div>
          </div>
        </div>
      </div>

      {renderActions()}
    </div>
  );
};
