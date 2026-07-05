import React from 'react';
import { theme } from '@/components/common/theme';

interface UnsavedChangesDialogProps {
  open: boolean;
  onSaveAndBack: () => void;
  onDiscardAndBack: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  saveLabel?: string;
  discardLabel?: string;
  cancelLabel?: string;
  showSave?: boolean;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  open,
  onSaveAndBack,
  onDiscardAndBack,
  onCancel,
  title = '未保存の変更があります',
  message = '保存するか、変更を破棄して戻ってください。',
  saveLabel = '保存して戻る',
  discardLabel = '破棄して戻る',
  cancelLabel = 'キャンセル',
  showSave = true,
}) => {
  if (!open) return null;

  return (
    <div style={overlayStyle}>
      <div style={backdropStyle} onClick={onCancel} />
      <div style={cardStyle}>
        <h3 style={titleStyle}>{title}</h3>
        <p style={messageStyle}>{message}</p>
        <div style={buttonStackStyle}>
          {showSave ? (
            <button type="button" onClick={onSaveAndBack} style={saveButtonStyle}>
              {saveLabel}
            </button>
          ) : null}
          <button type="button" onClick={onDiscardAndBack} style={discardButtonStyle}>
            {discardLabel}
          </button>
          <button type="button" onClick={onCancel} style={cancelButtonStyle}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 3000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing.md,
  background: 'rgba(0,0,0,0.4)',
  backdropFilter: 'blur(4px)',
};

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 340,
  position: 'relative',
  borderRadius: 24,
  padding: 22,
  background: 'rgba(255,255,255,0.94)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 24px 60px rgba(15,23,42,0.22)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
};

const titleStyle: React.CSSProperties = {
  margin: '0 0 8px 0',
  fontSize: 17,
  fontWeight: 900,
  color: theme.colors.textMain,
};

const messageStyle: React.CSSProperties = {
  margin: '0 0 22px 0',
  fontSize: 14,
  color: theme.colors.textSecondary,
  lineHeight: 1.45,
};

const buttonStackStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const saveButtonStyle: React.CSSProperties = {
  height: 44,
  borderRadius: 14,
  border: 'none',
  background: theme.colors.primary,
  color: 'white',
  fontWeight: 900,
  cursor: 'pointer',
};

const discardButtonStyle: React.CSSProperties = {
  height: 44,
  borderRadius: 14,
  border: 'none',
  background: 'rgba(239,68,68,0.10)',
  color: theme.colors.error,
  fontWeight: 900,
  cursor: 'pointer',
};

const cancelButtonStyle: React.CSSProperties = {
  height: 40,
  borderRadius: 14,
  border: 'none',
  background: 'rgba(0,0,0,0.05)',
  color: theme.colors.textSecondary,
  fontWeight: 800,
  cursor: 'pointer',
};
