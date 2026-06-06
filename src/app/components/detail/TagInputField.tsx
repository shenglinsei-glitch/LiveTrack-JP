import React, { useState, useRef, useEffect } from 'react';
import { theme } from '@/components/common/theme';

interface TagInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export const TagInputField: React.FC<TagInputFieldProps> = ({
  value,
  onChange,
  suggestions = [],
  placeholder = '',
  disabled = false,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (suggestions.length > 0 && newValue.trim()) {
      const filtered = suggestions.filter(s =>
        s.toLowerCase().includes(newValue.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setFilteredSuggestions(suggestions);
      setShowSuggestions(true);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          minHeight: 44,
          borderRadius: 14,
          border: '1px solid rgba(15,23,42,0.08)',
          background: disabled ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.85)',
          padding: '0 14px',
          fontSize: 14,
          color: theme.colors.text,
          outline: 'none',
        }}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: 200,
            overflowY: 'auto',
            background: 'rgba(255,255,255,0.98)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(15,23,42,0.08)',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
            zIndex: 100,
          }}
        >
          {filteredSuggestions.map((suggestion, idx) => (
            <div
              key={idx}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                padding: '10px 14px',
                fontSize: 14,
                fontWeight: 600,
                color: theme.colors.text,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(83,190,232,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
