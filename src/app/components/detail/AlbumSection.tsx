import React, { useState, useEffect, useRef } from 'react';
import { theme } from '@/components/common/theme';
import { ImageDialog } from '@/components/ImageDialog';
import { bulkGetImageUrls, putImageUrl, deleteImage } from '@/domain/imageStore';

interface AlbumSectionProps {
  imageIds: string[];
  onChange: (imageIds: string[]) => void;
  title?: string;
  addButtonText?: string;
  emptyText?: string;
}

type GalleryItem = { id: string; url: string };

export const AlbumSection: React.FC<AlbumSectionProps> = ({
  imageIds,
  onChange,
  title = 'アルバム',
  addButtonText = '＋ 追加',
  emptyText = '思い出の写真を登録しましょう',
}) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);

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
    try {
      await deleteImage(id);
    } catch {}
    onChange(imageIds.filter(x => x !== id));
  };

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (
      dragItem.current !== null &&
      dragOverItem.current !== null &&
      dragItem.current !== dragOverItem.current
    ) {
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
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0, color: theme.colors.text }}>
          {title}
        </h3>
        <button
          onClick={() => setIsDialogOpen(true)}
          style={{
            border: 'none',
            background: 'rgba(83, 190, 232, 0.1)',
            color: theme.colors.primary,
            padding: '6px 12px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {addButtonText}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
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
              borderRadius: 12,
              overflow: 'hidden',
              background: '#F3F4F6',
              cursor: 'grab',
            }}
          >
            <img
              src={it.url}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
              onClick={() => setFullscreenUrl(it.url)}
            />
            <button
              onClick={() => handleRemove(it.id)}
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 20,
                height: 20,
                borderRadius: 10,
                background: 'rgba(0,0,0,0.4)',
                border: 'none',
                color: 'white',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '40px 0',
              textAlign: 'center',
              color: '#9CA3AF',
              fontSize: 13,
            }}
          >
            {emptyText}
          </div>
        )}
      </div>

      <ImageDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onAdd={handleAdd}
        title="写真を追加"
      />

      {fullscreenUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3000,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setFullscreenUrl(null)}
        >
          <img
            src={fullscreenUrl}
            style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain' }}
            alt=""
          />
        </div>
      )}
    </div>
  );
};
