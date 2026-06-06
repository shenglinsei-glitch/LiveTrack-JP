import React from 'react';
import { GlassCard } from '@/components/common/GlassCard';
import { theme } from '@/components/common/theme';

interface FormSectionProps {
  title?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const FormSection: React.FC<FormSectionProps> = ({ title, children, style }) => {
  return (
    <GlassCard style={{ marginBottom: 16, minWidth: 0, maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box', ...style }}>
      {title && (
        <h3 style={{ fontSize: 16, fontWeight: 900, color: theme.colors.text, marginBottom: 16 }}>
          {title}
        </h3>
      )}
      {children}
    </GlassCard>
  );
};

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({ label, children, required = false }) => {
  return (
    <div style={{ marginBottom: 16, minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: theme.colors.textSecondary, marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: theme.colors.primary, marginLeft: 4 }}>*</span>}
      </label>
      {children}
    </div>
  );
};
