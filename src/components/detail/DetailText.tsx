import React from 'react';
import { theme } from '../../ui/theme';

export const Label: React.FC<{ children?: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      fontSize: '11px',
      fontWeight: 800,
      color: theme.colors.textWeak,
      marginBottom: '2px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      ...style,
    }}
  >
    {children}
  </div>
);

export const Value: React.FC<{
  children?: React.ReactNode;
  placeholder?: string;
  color?: string;
  style?: React.CSSProperties;
}> = ({ children, placeholder = '未設定', color = theme.colors.textMain, style }) => {
  const hasContent = children !== undefined && children !== null && children !== '';
  return (
    <div
      style={{
        fontSize: '15px',
        fontWeight: 700,
        color: hasContent ? color : theme.colors.textWeak,
        ...style,
      }}
    >
      {hasContent ? children : placeholder}
    </div>
  );
};

export const SubValue: React.FC<{ children?: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({
  children,
  color = theme.colors.textSecondary,
  style,
}) => (
  <div
    style={{
      fontSize: '13px',
      fontWeight: 600,
      color,
      lineHeight: 1.45,
      ...style,
    }}
  >
    {children}
  </div>
);


export const SectionTitle: React.FC<{ title: React.ReactNode; style?: React.CSSProperties; dividerStyle?: React.CSSProperties }> = ({ title, style, dividerStyle }) => (
  <div
    style={{
      marginTop: '20px',
      marginBottom: '12px',
      ...style,
    }}
  >
    <div
      style={{
        fontSize: '12px',
        fontWeight: 800,
        color: theme.colors.primary,
        letterSpacing: '0.05em',
        marginBottom: '4px',
      }}
    >
      {title}
    </div>
    <div
      style={{
        height: 1,
        background: 'rgba(0,0,0,0.04)',
        ...dividerStyle,
      }}
    />
  </div>
);
