
import React, { useState, useEffect, useRef } from 'react';
import { theme } from '../../ui/theme';
import { GlassCard } from '../../ui/GlassCard';
import { Exhibition } from '../../domain/types';
import { Icons, IconButton } from '../../ui/IconButton';
import { ImageDialog } from '../../components/ImageDialog';
import { bulkGetImageUrls, putImageUrl, deleteImage } from '../../domain/imageStore';

interface Props {
  exhibition: Exhibition;
  onChange: (imageIds: string[]) => void;
}

type GalleryItem = { id: string; url: string };

export const ExhibitionGallerySection: React.FC<Props> = ({ exhibition, onChange }) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);
  
  const imageIds = exhibition.imageIds || [];
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      if (imageIds.length === 0) {
        setItems([]);
        return;
      }
      const map = await bulkGetImageUrls(imageIds);
      const next = imageIds.map(id => ({ id, url: map[id] })).filter(x => !!x.url);
      setItems(next);
    })();
  }, [imageIds.join('|')]);

  const handleAdd = async (url: string) => {
    const id = await putImageUrl(url);
    onChange([...imageIds, id]);
  };

  const handleRemove = async (id: string) => {
    try { await deleteImage(id); } catch {}
    onChange(imageIds.filter(x => x !== id));
  };

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const nextIds = [...imageIds];
      const dragged = nextIds[dragItem.current];
      nextIds.splice(dragItem.current, 1);
      nextIds.splice(dragOverItem.current, 0, dragged);
      onChange(nextIds);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '900', margin: 0, color: theme.colors.primary }}>アルバム</h3>
        <button 
          onClick={() => setIsDialogOpen(true)}
          style={{ border: 'none', background: 'rgba(83, 190, 232, 0.1)', color: theme.colors.primary, padding: '6px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          ＋ 追加
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {items.map((it, idx) => (
          <div
            key={it.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragEnter={() => handleDragEnter(idx)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            style={{
              position: 'relative',
              aspectRatio: '1/1',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#F3F4F6',
              cursor: 'grab'
            }}
          >
            <img 
              src={it.url} 
              alt="" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              onClick={() => setFullscreenUrl(it.url)}
            />
            <button
              onClick={() => handleRemove(it.id)}
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '20px',
                height: '20px',
                borderRadius: '10px',
                background: 'rgba(0,0,0,0.4)',
                border: 'none',
                color: 'white',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
            思い出の写真を登録しましょう
          </div>
        )}
      </div>

      <ImageDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onAdd={handleAdd}
        title="写真を展示风景に追加"
      />

      {fullscreenUrl && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setFullscreenUrl(null)}
        >
          <img src={fullscreenUrl} style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain' }} alt="" />
        </div>
      )}
    </div>
  );
};
