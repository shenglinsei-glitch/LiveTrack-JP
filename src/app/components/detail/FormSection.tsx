import React from 'react';
import { theme } from '@/components/common/theme';
import { DetailSection } from '@/components/detail/DetailSection';

interface FormSectionProps {
  title?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  defaultOpen?: boolean;
}

export const FormSection: React.FC<FormSectionProps> = ({ title, children, style, defaultOpen = true }) => {
  return (
    <DetailSection title={title} defaultOpen={defaultOpen} style={style}>
      {children}
    </DetailSection>
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
