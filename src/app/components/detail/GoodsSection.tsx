import React from 'react';
import { theme } from '@/components/common/theme';
import { DynamicListEditor } from '@/components/detail/DynamicListEditor';
import { GoodsItem } from '@/domain/types';

const generateId = () => Math.random().toString(36).slice(2, 11);

const inputStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  minHeight: 44,
  borderRadius: 14,
  border: '1px solid rgba(15,23,42,0.08)',
  background: 'rgba(255,255,255,0.85)',
  padding: '0 14px',
  fontSize: 14,
  outline: 'none',
};

interface GoodsSectionProps<T extends GoodsItem = GoodsItem> {
  items: T[];
  onChange?: (items: T[]) => void;
  isEditMode?: boolean;
  itemLabel?: string;
}

export function GoodsSection<T extends GoodsItem = GoodsItem>({
  items,
  onChange,
  isEditMode = false,
  itemLabel = 'グッズ',
}: GoodsSectionProps<T>) {
  if (!isEditMode && (!items || items.length === 0)) return null;

  if (isEditMode) {
    return (
      <DynamicListEditor<T>
        items={items || []}
        onChange={(next) => onChange?.(next)}
        createNew={() => ({
          id: generateId(),
          name: '',
          price: undefined,
          quantity: undefined,
          imageUrl: '',
        } as T)}
        itemLabel={itemLabel}
        renderItem={(item, _, onUpdate) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <input
              type="text"
              value={item.name || ''}
              onChange={e => onUpdate({ ...item, name: e.target.value })}
              placeholder="商品名"
              style={inputStyle}
            />
            <input
              type="url"
              value={item.imageUrl || ''}
              onChange={e => onUpdate({ ...item, imageUrl: e.target.value })}
              placeholder="画像URL"
              style={inputStyle}
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, minWidth: 0 }}>
              <input
                type="number"
                value={item.price ?? ''}
                onChange={e => onUpdate({ ...item, price: e.target.value === '' ? undefined : Number(e.target.value) })}
                placeholder="価格"
                style={inputStyle}
              />
              <input
                type="number"
                value={item.quantity ?? ''}
                onChange={e => onUpdate({ ...item, quantity: e.target.value === '' ? undefined : Number(e.target.value) })}
                placeholder="数量"
                style={inputStyle}
              />
            </div>
          </div>
        )}
      />
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, minWidth: 0 }}>
      {(items || []).map(goods => (
        <div
          key={goods.id}
          style={{
            minWidth: 0,
            padding: 12,
            background: 'rgba(0,0,0,0.02)',
            borderRadius: 12,
            border: '1px solid rgba(15,23,42,0.06)',
          }}
        >
          {goods.imageUrl && (
            <div style={{ aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden', marginBottom: 8, background: '#F3F4F6' }}>
              <img src={goods.imageUrl} alt={goods.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.colors.text, marginBottom: 4, overflowWrap: 'anywhere' }}>
            {goods.name || '名称未設定'}
          </div>
          {goods.price !== undefined && goods.price !== null && (
            <div style={{ fontSize: 12, fontWeight: 600, color: theme.colors.textSecondary }}>¥{Number(goods.price).toLocaleString()}</div>
          )}
          {goods.quantity !== undefined && goods.quantity !== null && (
            <div style={{ fontSize: 12, fontWeight: 600, color: theme.colors.textSecondary }}>数量: {goods.quantity}</div>
          )}
        </div>
      ))}
    </div>
  );
}
