import React, { useState, useRef, useEffect, useMemo } from 'react';
import { theme } from '../ui/theme';
import { ImageDialog } from '../components/ImageDialog';
import { Artist, Tour, Concert } from '../domain/types';
import { Icons, IconButton } from '../ui/IconButton';
import { bulkGetImageUrls, bulkPutImageUrls, putImageUrl, setImageUrl, deleteImage } from '../domain/imageStore';

interface Props {
  artistId: string;
  concertId: string;
  artist: Artist;
  tour: Tour;
  concert: Concert;
  onBack: () => void;
  onOpenConcertEditor: (artistId: string, tourId: string) => void;

  // Scheme A: parent stores ONLY imageIds in Concert.
  onUpdateConcertAlbum: (artistId: string, tourId: string, concertId: string, imageIds: string[]) => void;
}

type AlbumItem = { id: string; url: string };

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
  const [editingTarget, setEditingTarget] = useState<{ id: string; index: number } | null>(null);
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  const bgCandidates = [tour.imageUrl, artist.imageUrl].filter(Boolean) as string[];
  const [bgIndex, setBgIndex] = useState<number>(0);
  const bgUrl = bgCandidates[bgIndex] || '';

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Source of truth: ids from concert
  const imageIds = concert.imageIds || [];
  const legacyUrls = (concert as any).images || [];

  // UI list expanded from ids
  const [items, setItems] = useState<AlbumItem[]>([]);

  // Expand ids -> urls whenever imageIds change.
  // Also supports one-time migration of legacy `concert.images: string[]` on import.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1) If we have no ids yet but we do have legacy urls, show them immediately and migrate in background.
        if ((!imageIds || imageIds.length === 0) && Array.isArray(legacyUrls) && legacyUrls.length > 0) {
          const legacyItems: AlbumItem[] = legacyUrls
            .filter((u: any) => typeof u === 'string' && u.trim() && !u.startsWith('data:image') && !u.startsWith('blob:'))
            .map((u: string, i: number) => ({ id: `legacy_${i}`, url: u }));

          if (!cancelled) setItems(legacyItems);

          // Migrate: urls -> ids (IndexedDB) then update parent.
          // eslint-disable-next-line no-await-in-loop
          const ids = await bulkPutImageUrls(legacyItems.map(x => x.url));
          if (!cancelled && ids.length > 0) {
            onUpdateConcertAlbum(artistId, tour.id, concertId, ids);
          }
          return;
        }

        // 2) Normal path: ids -> urls
        const map = await bulkGetImageUrls(imageIds);
        const next = (imageIds || [])
          .map(id => ({ id, url: map[id] }))
          .filter((x): x is AlbumItem => !!x.url);

        if (!cancelled) setItems(next);
      } catch (e) {
        if (!cancelled) setItems([]);
      }
    })();

    return () => { cancelled = true; };
  }, [artistId, tour.id, concertId, imageIds.join('|'), Array.isArray(legacyUrls) ? legacyUrls.length : 0]); // stable enough

  useEffect(() => {
    setBgIndex(0);
  }, [tour.imageUrl, artist.imageUrl]);

  const handleBgError = () => {
    setBgIndex((prev) => (prev + 1 < bgCandidates.length ? prev + 1 : prev));
  };

  const handleAddOrReplace = async (urlRaw: string) => {
    const url = urlRaw.trim();
    if (!url) return;

    try {
      if (editingTarget) {
        // Replace: keep id, update stored url
        await setImageUrl(editingTarget.id, url);

        // Update parent ids (order stays same)
        const nextIds = [...imageIds];
        onUpdateConcertAlbum(artistId, tour.id, concertId, nextIds);

        // Clear failed state
        setFailedUrls(prev => {
          const next = new Set(prev);
          // remove previous url if exists
          const old = items[editingTarget.index]?.url;
          if (old) next.delete(old);
          return next;
        });
        setEditingTarget(null);
      } else {
        // Add: create new id
        const id = await putImageUrl(url);
        onUpdateConcertAlbum(artistId, tour.id, concertId, [...imageIds, id]);
      }
    } finally {
      // dialog close handled by caller
    }
  };

  const handleImageError = (url: string) => {
    setFailedUrls(prev => new Set([...prev, url]));
  };

  const handleRemove = async (id: string) => {
    // Best-effort delete from IDB. If this id is reused elsewhere, user can re-add.
    try { await deleteImage(id); } catch {}
    onUpdateConcertAlbum(artistId, tour.id, concertId, imageIds.filter(x => x !== id));
  };

  const handleReplace = (id: string, index: number) => {
    setEditingTarget({ id, index });
    setIsDialogOpen(true);
  };

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const newIds = [...imageIds];
      const dragged = newIds[dragItem.current];
      newIds.splice(dragItem.current, 1);
      newIds.splice(dragOverItem.current, 0, dragged);
      onUpdateConcertAlbum(artistId, tour.id, concertId, newIds);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const countLabel = useMemo(() => `${items.length} 枚の思い出`, [items.length]);

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
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
              transform: 'scale(1.2)',
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
            {concert.saleLink && (
              <button
                onClick={() => window.open(concert.saleLink, '_blank', 'noopener,noreferrer')}
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
                title="チケット購入・詳細"
              >
                <Icons.ExternalLink style={{ width: 20, height: 20 }} />
              </button>
            )}
            {tour.officialUrl && (
              <button
                onClick={() => window.open(tour.officialUrl, '_blank', 'noopener,noreferrer')}
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
                title="ツアー公式サイト"
              >
                <Icons.Globe style={{ width: 20, height: 20 }} />
              </button>
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
              {countLabel}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {items.map((it, idx) => {
              const isFailed = failedUrls.has(it.url);
              return (
                <div
                  key={`${it.id}-${idx}`}
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
                          onClick={() => handleReplace(it.id, idx)}
                          style={{ border: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: '11px', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold' }}
                        >
                          置換
                        </button>
                        <button
                          onClick={() => handleRemove(it.id)}
                          style={{ border: 'none', background: 'rgba(255, 59, 48, 0.2)', color: '#FF3B30', fontSize: '11px', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold' }}
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <img
                        src={it.url}
                        referrerPolicy="no-referrer"
                        alt=""
                        loading="lazy"
                        onError={() => handleImageError(it.url)}
                        onClick={() => setFullscreenUrl(it.url)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(it.id);
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
          setEditingTarget(null);
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

      {fullscreenUrl && (
        <div
          onClick={() => setFullscreenUrl(null)}
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
          <img src={fullscreenUrl} referrerPolicy="no-referrer" alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} />
          <button
            style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: 'white', fontSize: '32px', cursor: 'pointer' }}
            onClick={() => setFullscreenUrl(null)}
          >
            ×
          </button>
        </div>
      )}

      <ImageDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingTarget(null);
        }}
        onAdd={async (url) => {
          await handleAddOrReplace(url);
          setIsDialogOpen(false);
        }}
        title={editingTarget ? "画像のURLを更新" : "思い出の写真を追加"}
      />
    </div>
  );
};
