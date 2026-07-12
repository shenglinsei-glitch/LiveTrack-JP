import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GlassCard } from '@/components/common/GlassCard';
import { theme } from '@/components/common/theme';

interface ImageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (url: string) => void;
  title?: string;
}

export const ImageDialog: React.FC<ImageDialogProps> = ({
  isOpen,
  onClose,
  onAdd,
  title = '画像URLを追加',
}) => {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (isOpen) setUrl('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onAdd(url.trim());
      setUrl('');
      onClose();
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        minHeight: '100dvh',
        padding: `max(${theme.spacing.md}, env(safe-area-inset-top)) max(${theme.spacing.md}, env(safe-area-inset-right)) max(${theme.spacing.md}, env(safe-area-inset-bottom)) max(${theme.spacing.md}, env(safe-area-inset-left))`,
        boxSizing: 'border-box',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'default',
        }}
      />

      <GlassCard
        className="fade-in"
        padding={theme.spacing.lg}
        style={{
          width: '100%',
          maxWidth: 340,
          position: 'relative',
          zIndex: 1,
          flexShrink: 0,
          boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.94)',
          border: '1px solid rgba(255,255,255,0.72)',
          boxShadow: '0 24px 60px rgba(15,23,42,0.22)',
        }}
      >
        <h3
          style={{
            margin: '0 0 16px 0',
            fontSize: 17,
            fontWeight: 800,
            color: theme.colors.text,
          }}
        >
          {title}
        </h3>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            type="url"
            inputMode="url"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{
              display: 'block',
              width: '100%',
              minWidth: 0,
              padding: 12,
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.1)',
              background: 'rgba(255,255,255,0.78)',
              color: theme.colors.text,
              fontSize: 16,
              marginBottom: 20,
              outline: 'none',
              boxSizing: 'border-box',
              WebkitAppearance: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                minWidth: 0,
                padding: 12,
                borderRadius: 10,
                border: 'none',
                background: 'rgba(0,0,0,0.05)',
                color: theme.colors.text,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                minWidth: 0,
                padding: 12,
                borderRadius: 10,
                border: 'none',
                background: theme.colors.primary,
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              OK
            </button>
          </div>
        </form>
      </GlassCard>
    </div>,
    document.body,
  );
};
