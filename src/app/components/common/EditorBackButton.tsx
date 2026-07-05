import React from 'react';
import { Icons, IconButton } from '@/components/common/IconButton';
import { theme } from '@/components/common/theme';

interface EditorBackButtonProps {
  onClick: () => void;
  size?: number;
  style?: React.CSSProperties;
  title?: string;
}

export const EditorBackButton: React.FC<EditorBackButtonProps> = ({
  onClick,
  size = 40,
  style,
  title = '戻る',
}) => (
  <IconButton
    icon={<Icons.ChevronLeft />}
    onClick={onClick}
    size={size}
    style={{
      background: 'rgba(255,255,255,0.82)',
      border: 'none',
      color: theme.colors.textSecondary,
      boxShadow: theme.shadows.card,
      ...style,
    }}
    title={title}
  />
);
