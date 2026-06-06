import React, { useState, useRef, useEffect } from 'react';
import { theme } from './theme';
import { Icons } from './IconButton';

interface TagMultiSelectInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  candidates: string[];
  onAddCandidate?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  minHeight: 54,
  borderRadius: 18,
  border: '1px solid rgba(15,23,42,0.08)',
  background: 'rgba(255,255,255,0.85)',
  padding: '0 16px',
  fontSize: 15,
  color: theme.colors.text,
  outline: 'none',
};

const chipContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 12,
};

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: 'rgba(83, 190, 232, 0.15)',
  color: theme.colors.primary,
  padding: '6px 12px',
  borderRadius: 12,
  fontSize: 13,
  fontWeight: 700,
};

const chipRemoveStyle: React.CSSProperties = {
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 16,
  height: 16,
  borderRadius: '50%',
  background: 'rgba(83, 190, 232, 0.2)',
  transition: 'background 0.15s',
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: 0,
  right: 0,
  maxHeight: 240,
  overflowY: 'auto',
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(15, 23, 42, 0.08)',
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(15, 23, 42, 0.12)',
  zIndex: 1000,
};

const optionStyle: React.CSSProperties = {
  padding: '12px 16px',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
  color: theme.colors.text,
  background: 'transparent',
  border: 'none',
  width: '100%',
  textAlign: 'left',
  transition: 'background 0.15s',
};

const addOptionStyle: React.CSSProperties = {
  ...optionStyle,
  color: theme.colors.primary,
  fontWeight: 700,
};

export const TagMultiSelectInput: React.FC<TagMultiSelectInputProps> = ({
  values,
  onChange,
  candidates,
  onAddCandidate,
  placeholder,
  readOnly = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (!isOpen && newValue) setIsOpen(true);
  };

  const handleSelect = (selectedValue: string) => {
    if (!values.includes(selectedValue)) {
      onChange([...values, selectedValue]);
    }
    setInputValue('');
    setIsOpen(false);
  };

  const handleRemove = (valueToRemove: string) => {
    onChange(values.filter((v) => v !== valueToRemove));
  };

  const handleAddNew = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !values.includes(trimmed)) {
      if (onAddCandidate) {
        onAddCandidate(trimmed);
      }
      onChange([...values, trimmed]);
      setInputValue('');
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      handleAddNew();
    }
  };

  const filteredCandidates = candidates.filter(
    (c) => !values.includes(c) && c.toLowerCase().includes(inputValue.toLowerCase())
  );

  const showAddOption = inputValue.trim() && !candidates.includes(inputValue.trim()) && !values.includes(inputValue.trim());

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {values.length > 0 && (
        <div style={chipContainerStyle}>
          {values.map((val, idx) => (
            <div key={idx} style={chipStyle}>
              {val}
              {!readOnly && (
                <span
                  onClick={() => handleRemove(val)}
                  style={chipRemoveStyle}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(83, 190, 232, 0.35)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(83, 190, 232, 0.2)')}
                >
                  <Icons.X style={{ width: 10, height: 10 }} />
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => !readOnly && setIsOpen(true)}
          placeholder={placeholder}
          readOnly={readOnly}
          style={inputStyle}
        />
        {isOpen && !readOnly && (
          <div style={dropdownStyle}>
            {showAddOption && (
              <button
                type="button"
                onClick={handleAddNew}
                style={addOptionStyle}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(83, 190, 232, 0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                + 「{inputValue.trim()}」を追加
              </button>
            )}
            {filteredCandidates.length > 0 && (
              <>
                {showAddOption && (
                  <div style={{ height: 1, background: 'rgba(15, 23, 42, 0.06)', margin: '4px 0' }} />
                )}
                {filteredCandidates.map((candidate, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelect(candidate)}
                    style={optionStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(15, 23, 42, 0.04)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {candidate}
                  </button>
                ))}
              </>
            )}
            {filteredCandidates.length === 0 && !showAddOption && (
              <div style={{ padding: '16px', textAlign: 'center', color: theme.colors.textSecondary, fontSize: 13 }}>
                候補がありません
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
