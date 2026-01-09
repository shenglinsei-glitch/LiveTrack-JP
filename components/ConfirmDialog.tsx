
import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { theme } from '../ui/theme';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  isDestructive?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  isDestructive,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 3000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.md,
      background: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{ position: 'fixed', inset: 0 }} onClick={onClose} />
      <GlassCard className="fade-in" padding={theme.spacing.lg} style={{ width: '100%', maxWidth: '320px', position: 'relative' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: 'bold' }}>{title}</h3>
        <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: theme.colors.textSecondary, lineHeight: '1.4' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: 'rgba(0,0,0,0.05)',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            キャンセル
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: isDestructive ? theme.colors.error : theme.colors.primary,
              color: 'white',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </GlassCard>
    </div>
  );
};
