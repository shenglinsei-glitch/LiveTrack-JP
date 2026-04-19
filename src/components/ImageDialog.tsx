
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { theme } from '../ui/theme';

interface ImageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (url: string) => void;
  title?: string;
}

export const ImageDialog: React.FC<ImageDialogProps> = ({ isOpen, onClose, onAdd, title = "画像URLを追加" }) => {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (isOpen) setUrl('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onAdd(url.trim());
      setUrl('');
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.md,
      background: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{ position: 'fixed', inset: 0 }} onClick={onClose} />
      <GlassCard className="fade-in" padding={theme.spacing.lg} style={{ width: '100%', maxWidth: '340px', position: 'relative' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: 'bold' }}>{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            type="url"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid rgba(0,0,0,0.1)',
              background: 'rgba(255,255,255,0.5)',
              fontSize: '14px',
              marginBottom: '20px',
              outline: 'none'
            }}
          />
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
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
              type="submit"
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: theme.colors.primary,
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              OK
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
};
