import React from 'react';
import { theme } from '@/components/common/theme';
import { Icons, IconButton } from '@/components/common/IconButton';

export interface DynamicListItem {
  id: string;
  [key: string]: any;
}

interface DynamicListEditorProps<T extends DynamicListItem> {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number, onUpdate: (updated: T) => void) => React.ReactNode;
  createNew: () => T;
  itemLabel?: string;
  showOrder?: boolean;
}

export function DynamicListEditor<T extends DynamicListItem>({
  items,
  onChange,
  renderItem,
  createNew,
  itemLabel = '項目',
  showOrder = false,
}: DynamicListEditorProps<T>) {
  const handleAdd = () => {
    onChange([...items, createNew()]);
  };

  const handleDelete = (index: number) => {
    if (!window.confirm(`この${itemLabel}を削除しますか？`)) return;
    onChange(items.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, updated: T) => {
    const newItems = [...items];
    newItems[index] = updated;
    onChange(newItems);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    onChange(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    onChange(newItems);
  };

  return (
    <div>
      {items.map((item, index) => (
        <div
          key={item.id}
          style={{
            marginBottom: 16,
            padding: 16,
            background: 'rgba(0,0,0,0.02)',
            borderRadius: 12,
            border: '1px solid rgba(15,23,42,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            {showOrder && (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: theme.colors.textSecondary,
                  minWidth: 30,
                }}
              >
                #{index + 1}
              </div>
            )}
            <div style={{ flex: 1 }} />
            {showOrder && index > 0 && (
              <button
                onClick={() => handleMoveUp(index)}
                style={{
                  padding: '4px 8px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: theme.colors.textSecondary,
                  background: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(15,23,42,0.08)',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                ↑
              </button>
            )}
            {showOrder && index < items.length - 1 && (
              <button
                onClick={() => handleMoveDown(index)}
                style={{
                  padding: '4px 8px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: theme.colors.textSecondary,
                  background: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(15,23,42,0.08)',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                ↓
              </button>
            )}
            <IconButton
              icon={<Icons.Trash />}
              onClick={() => handleDelete(index)}
              size={36}
            />
          </div>
          {renderItem(item, index, (updated) => handleUpdate(index, updated))}
        </div>
      ))}
      <button
        onClick={handleAdd}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: 14,
          fontWeight: 700,
          color: theme.colors.primary,
          background: 'rgba(83,190,232,0.08)',
          border: '1px dashed rgba(83,190,232,0.3)',
          borderRadius: 12,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(83,190,232,0.12)';
          e.currentTarget.style.borderColor = 'rgba(83,190,232,0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(83,190,232,0.08)';
          e.currentTarget.style.borderColor = 'rgba(83,190,232,0.3)';
        }}
      >
        + {itemLabel}を追加
      </button>
    </div>
  );
}
