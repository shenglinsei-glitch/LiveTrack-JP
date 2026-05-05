import React from 'react';
import { ExhibitionStatus, MovieStatus, Status } from '@/domain/types';
import { getExhibitionStatusTone, getMovieStatusTone } from '@/domain/statusHelpers';
import { theme } from '@/components/common/theme';

type StatusDomain = 'concert' | 'movie' | 'exhibition';
type StatusValue = Status | MovieStatus | ExhibitionStatus | string;

type StatusBadgeVariant = 'solid' | 'soft';

interface StatusBadgeProps {
  domain: StatusDomain;
  status: StatusValue;
  label?: React.ReactNode;
  variant?: StatusBadgeVariant;
  style?: React.CSSProperties;
  className?: string;
}

const concertBadgeBgFromColor = (color: string) => {
  const normalized = color.toLowerCase();
  if (normalized === theme.colors.status['発売前'].toLowerCase()) return theme.colors.badges.processing.bg;
  if (normalized === theme.colors.status['検討中'].toLowerCase()) return theme.colors.badges.considering.bg;
  if (normalized === theme.colors.status['抽選中'].toLowerCase()) return theme.colors.badges.lottery.bg;
  if (normalized === theme.colors.status['参戦予定'].toLowerCase()) return theme.colors.badges.confirmed.bg;
  if (normalized === theme.colors.status['参戦済み'].toLowerCase()) return theme.colors.badges.completed.bg;
  if (normalized === theme.colors.status['見送'].toLowerCase()) return theme.colors.badges.skipped.bg;
  return 'rgba(83,190,232,0.12)';
};

export const getConcertStatusTone = (status: StatusValue, displayLabel?: React.ReactNode) => {
  const key = String(status) as Status;
  const color = theme.colors.status[key] || theme.colors.primary;
  return {
    color,
    bg: concertBadgeBgFromColor(color),
    label: displayLabel || key,
  };
};

export const getStatusBadgeTone = (domain: StatusDomain, status: StatusValue, label?: React.ReactNode) => {
  if (domain === 'movie') {
    const tone = getMovieStatusTone(String(status), typeof label === 'string' ? label : undefined);
    return { ...tone, label: label ?? tone.label };
  }
  if (domain === 'exhibition') {
    const tone = getExhibitionStatusTone(String(status), typeof label === 'string' ? label : undefined);
    return { ...tone, label: label ?? tone.label };
  }
  return getConcertStatusTone(status, label);
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  domain,
  status,
  label,
  variant = 'solid',
  style,
  className,
}) => {
  const tone = getStatusBadgeTone(domain, status, label);
  const isSoft = variant === 'soft';

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 22,
        padding: '2px 10px',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 900,
        lineHeight: 1.6,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        color: isSoft ? tone.color : '#fff',
        background: isSoft ? tone.bg : tone.color,
        boxShadow: isSoft ? 'none' : '0 4px 12px rgba(0,0,0,0.10)',
        ...style,
      }}
    >
      {tone.label}
    </span>
  );
};
