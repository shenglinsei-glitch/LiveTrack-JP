
import React, { useState, useRef, useEffect } from 'react';
import { theme } from '../ui/theme';
import { ImageDialog } from '../components/ImageDialog';
import { Artist, Tour, Concert } from '../domain/types';
import { Icons, IconButton } from '../ui/IconButton';

interface Props {
  artistId: string;
  concertId: string;
  artist: Artist;
  tour: Tour;
  concert: Concert;
  onBack: () => void;
  onOpenConcertEditor: (artistId: string, tourId: string) => void;
  onUpdateConcertAlbum: (artistId: string, tourId: string, concertId: string, images: string[]) => void;
}

export const ConcertHomePage: React.FC<Props> = ({ 
  artistId, 
  concertId, 
  artist, 
  tour, 
  concert, 
  onBack, 
  onOpenConcertEditor,
  onUpdateConcertAlbum 
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingImageUrl, setEditingImageUrl] = useState<{ url: string; index: number } | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  // Background image (blurred)
  // NOTE: iOS Safari/PWA can fail to render fixed elements with negative z-index.
  // We therefore keep the background at zIndex=0 and render the page content above it.
  const bgCandidates = [tour.imageUrl, artist.imageUrl].filter(Boolean) as string[];
  const [bgIndex, setBgIndex] = useState<number>(0);
  const bgUrl = bgCandidates[bgIndex] || '';
  
  // Drag and Drop state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const images = concert.images || [];

  // Reset fallback chain when artist/tour changes
  useEffect(() => {
    setBgIndex(0);
  }, [tour.imageUrl, artist.imageUrl]);

  const handleBgError = () => {
    // fallback: tour -> artist -> none
    setBgIndex((prev) => (prev + 1 < bgCandidates.length ? prev + 1 : prev));
  };

  const handleAddImage = (url: string) => {
    if (editingImageUrl !== null) {
      const newImages = [...images];
      newImages[editingImageUrl.index] = url;
      onUpdateConcertAlbum(artistId, tour.id, concertId, newImages);
      setFailedImages(prev => {
        const next = new Set(prev);
        next.delete(editingImageUrl.url);
        return next;
      });
      setEditingImageUrl(null);
    } else {
      onUpdateConcertAlbum(artistId, tour.id, concertId, [...images, url]);
    }
  };

  const handleImageError = (url: string) => {
    setFailedImages(prev => new Set([...prev, url]));
  };

  const handleRemoveImage = (url: string) => {
    onUpdateConcertAlbum(artistId, tour.id, concertId, images.filter(i => i !== url));
  };

  const handleReplaceImage = (url: string, index: number) => {
    setEditingImageUrl({ url, index });
    setIsDialogOpen(true);
  };

  // Drag and Drop Handlers
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const newList = [...images];
      const draggedItemContent = newList[dragItem.current];
      newList.splice(dragItem.current, 1);
      newList.splice(dragOverItem.current, 0, draggedItemContent);
      
      onUpdateConcertAlbum(artistId, tour.id, concertId, newList);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      {/* 
        Requirement Fix: Dynamic background using <img> for proper Referrer Policy support.
        This replaces the CSS background-image which cannot bypass hotlink protection.
      */}
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 0, 
        overflow: 'hidden', 
        backgroundColor: '#111',
        pointerEvents: 'none'
      }}>
        {bgUrl && (
          <img 
            src={bgUrl}
            referrerPolicy="no-referrer"
            alt=""
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              filter: 'blur(40px) brightness(0.6)', 
              transform: 'scale(1.2)', // Prevents blurred edges from showing the background
              transition: 'opacity 0.5s ease-in-out'
            }}
            onError={handleBgError}
          />
        )}
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: `${theme.spacing.lg} ${theme.spacing.md} 140px ${theme.spacing.md}`, maxWidth: '600px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <button 
            onClick={onBack} 
            style={{ 
              border: 'none', 
              background: 'rgba(255,255,255,0.15)', 
              backdropFilter: 'blur(10px)',
              color: 'white', 
              width: '44px', 
              height: '44px', 
              borderRadius: '22px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer' 
            }}
          >
            <Icons.ChevronLeft />
          </button>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {tour.officialUrl && (
              <a 
                href={tour.officialUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  border: 'none', 
                  background: 'rgba(255,255,255,0.15)', 
                  backdropFilter: 'blur(10px)',
                  color: 'white', 
                  width: '44px', 
                  height: '44px', 
                  borderRadius: '22px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer',
                  textDecoration: 'none'
                }}
                title="ツアー公式サイト"
              >
                <Icons.Globe />
              </a>
            )}
            <IconButton 
              icon={<Icons.Edit />} 
              onClick={() => onOpenConcertEditor(artistId, tour.id)}
              size={44}
              style={{ 
                background: 'rgba(255,255,255,0.15)', 
                backdropFilter: 'blur(10px)',
                border: 'none',
                color: 'white',
                boxShadow: 'none'
              }}
            />
          </div>
        </header>

        <div style={{ color: 'white', marginBottom: '32px', textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: '900', 
            margin: '0 0 8px 0', 
            textShadow: '0 4px 12px rgba(0,0,0,0.4)',
            letterSpacing: '-0.02em'
          }}>
            {tour.name}
          </h1>
          <div style={{ fontSize: '18px', opacity: 0.8, fontWeight: '600', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            {artist.name}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.6, marginTop: '4px' }}>
            {concert.date} @ {concert.venue}
          </div>
        </div>

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 4px' }}>
            <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '800', margin: 0 }}>アルバム</h2>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>
              {images.length} 枚の思い出
            </span>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {images.map((img, idx) => {
              const isFailed = failedImages.has(img);
              return (
                <div 
                  key={`${img}-${idx}`} 
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  style={{ 
                    position: 'relative', 
                    aspectRatio: '1/1', 
                    borderRadius: '24px', 
                    overflow: 'hidden', 
                    background: 'rgba(0,0,0,0.2)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'grab'
                  }}
                >
                  {isFailed ? (
                    <div style={{ 
                      width: '100%', 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'rgba(255,255,255,0.5)', 
                      fontSize: '12px', 
                      padding: '16px', 
                      textAlign: 'center' 
                    }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>📷</div>
                      <div style={{ fontWeight: '600', marginBottom: '12px' }}>読み込めません</div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleReplaceImage(img, idx)}
                          style={{ border: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: '11px', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold' }}
                        >
                          置換
                        </button>
                        <button 
                          onClick={() => handleRemoveImage(img)}
                          style={{ border: 'none', background: 'rgba(255, 59, 48, 0.2)', color: '#FF3B30', fontSize: '11px', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold' }}
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <img 
                        src={img} 
                        referrerPolicy="no-referrer"
                        alt="" 
                        loading="lazy"
                        onError={() => handleImageError(img)} 
                        onClick={() => setFullscreenImage(img)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                      />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(img);
                        }}
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '12px',
                          background: 'rgba(0,0,0,0.5)',
                          border: 'none',
                          color: 'white',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        ×
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <IconButton 
        icon={<Icons.Plus />} 
        primary 
        size={64} 
        onClick={() => {
          setEditingImageUrl(null);
          setIsDialogOpen(true);
        }} 
        style={{ 
          position: 'fixed', 
          right: '16px', 
          bottom: 'calc(16px + env(safe-area-inset-bottom))', 
          zIndex: 110,
          boxShadow: '0 8px 24px -6px rgba(83, 190, 232, 0.5)'
        }}
      />

      {fullscreenImage && (
        <div 
          onClick={() => setFullscreenImage(null)} 
          className="fade-in"
          style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 3000, 
            background: 'rgba(0,0,0,0.95)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <img src={fullscreenImage} referrerPolicy="no-referrer" alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} />
          <button 
            style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: 'white', fontSize: '32px', cursor: 'pointer' }}
            onClick={() => setFullscreenImage(null)}
          >
            ×
          </button>
        </div>
      )}

      <ImageDialog 
        isOpen={isDialogOpen} 
        onClose={() => {
          setIsDialogOpen(false);
          setEditingImageUrl(null);
        }} 
        onAdd={handleAddImage}
        title={editingImageUrl ? "画像のURLを更新" : "思い出の写真を追加"}
      />
    </div>
  );
};
