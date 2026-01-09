
import React from 'react';
import { theme } from './theme';

type CardVariant = 'card' | 'panel' | 'fab';

interface GlassCardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  className?: string;
  onClick?: () => void;
  padding?: string;
  style?: React.CSSProperties;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  variant = 'card',
  className, 
  onClick, 
  padding, 
  style,
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'panel':
        return {
          borderRadius: theme.radius.panel,
          boxShadow: theme.shadows.pop,
          padding: padding || theme.spacing.lg,
        };
      case 'fab':
        return {
          borderRadius: theme.radius.fab,
          boxShadow: theme.shadows.fab,
          padding: padding || theme.spacing.md,
        };
      case 'card':
      default:
        return {
          borderRadius: theme.radius.card,
          boxShadow: theme.shadows.card,
          padding: padding || theme.spacing.md,
        };
    }
  };

  return (
    <div 
      onClick={onClick}
      className={className}
      style={{
        background: theme.glass.background,
        backdropFilter: theme.glass.blur,
        WebkitBackdropFilter: theme.glass.blur,
        border: theme.glass.border,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.15s ease',
        ...getVariantStyles(),
        ...style,
      }}
      onMouseDown={(e) => onClick && (e.currentTarget.style.transform = 'scale(0.97)')}
      onMouseUp={(e) => onClick && (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={(e) => onClick && (e.currentTarget.style.transform = 'scale(1)')}
    >
      {children}
    </div>
  );
};
