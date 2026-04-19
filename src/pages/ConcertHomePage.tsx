import React, { useState, useRef, useEffect, useMemo } from 'react';
import { theme } from '../ui/theme';
import { ImageDialog } from '../components/ImageDialog';
import { GlassCard } from '../ui/GlassCard';
import { Label, Value, SectionTitle } from '../components/detail/DetailText';
import { DetailHeader, DetailChip, DetailLinkIconButton } from '../components/detail/DetailHeader';
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
  onOpenArtistDetail: (artistId: string) => void;
  onOpenConcertEditor: (artistId: string, tourId: string) => void;
  onUpdateConcertAlbum: (artistId: string, tourId: string, concertId: string, imageIds: string[]) => void;
}

type AlbumItem = { id: string; url: string };

const LinkPill: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      border: 'none',
      background: 'rgba(83, 190, 232, 0.12)',
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: 800,
      borderRadius: 999,
      padding: '10px 14px',
      cursor: 'pointer',
      width: 'fit-content'
    }}
  >
    {children}
  </button>
);

const CollapsibleSection: React.FC<{ title: string; defaultOpen?: boolean; children: React.ReactNode; rightLabel?: string; rightAction?: React.ReactNode }> = ({ title, defaultOpen = true, children, rightLabel, rightAction }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <GlassCard padding="20px" style={{ marginBottom: 16, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.4)' }}>
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', padding: 0, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <SectionTitle title={title} style={{ marginTop: 0, marginBottom: open ? 12 : 0 }} dividerStyle={{ opacity: open ? 1 : 0 }} />
          </div>
          {rightLabel ? <div style={{ fontSize: 12, color: theme.colors.textWeak, fontWeight: 800 }}>{rightLabel}</div> : null}
          <Icons.ChevronLeft style={{ width: 18, height: 18, color: theme.colors.textWeak, transform: open ? 'rotate(-90deg)' : 'rotate(180deg)', transition: 'transform 0.2s ease' }} />
        </button>
        {rightAction ? <div style={{ display: 'flex', alignItems: 'center' }}>{rightAction}</div> : null}
      </div>
      {open ? children : null}
    </GlassCard>
  );
};

export const ConcertHomePage: React.FC<Props> = ({
  artistId,
  concertId,
  artist,
  tour,
  concert,
  onBack,
  onOpenArtistDetail,
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

  const imageIds = concert.imageIds || [];
  const legacyUrls = (concert as any).images || [];
  const [items, setItems] = useState<AlbumItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if ((!imageIds || imageIds.length === 0) && Array.isArray(legacyUrls) && legacyUrls.length > 0) {
          const legacyItems: AlbumItem[] = legacyUrls
            .filter((u: any) => typeof u === 'string' && u.trim() && !u.startsWith('data:image') && !u.startsWith('blob:'))
            .map((u: string, i: number) => ({ id: `legacy_${i}`, url: u }));
          if (!cancelled) setItems(legacyItems);
          const ids = await bulkPutImageUrls(legacyItems.map(x => x.url));
          if (!cancelled && ids.length > 0) onUpdateConcertAlbum(artistId, tour.id, concertId, ids);
          return;
        }
        const map = await bulkGetImageUrls(imageIds);
        const next = (imageIds || []).map(id => ({ id, url: map[id] })).filter((x): x is AlbumItem => !!x.url);
        if (!cancelled) setItems(next);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => { cancelled = true; };
  }, [artistId, tour.id, concertId, imageIds.join('|'), Array.isArray(legacyUrls) ? legacyUrls.length : 0, onUpdateConcertAlbum]);

  useEffect(() => { setBgIndex(0); }, [tour.imageUrl, artist.imageUrl]);

  const handleBgError = () => setBgIndex(prev => (prev + 1 < bgCandidates.length ? prev + 1 : prev));
  const handleAddOrReplace = async (urlRaw: string) => {
    const url = urlRaw.trim();
    if (!url) return;
    try {
      if (editingTarget) {
        await setImageUrl(editingTarget.id, url);
        onUpdateConcertAlbum(artistId, tour.id, concertId, [...imageIds]);
        setFailedUrls(prev => {
          const next = new Set(prev);
          const old = items[editingTarget.index]?.url;
          if (old) next.delete(old);
          return next;
        });
        setEditingTarget(null);
      } else {
        const id = await putImageUrl(url);
        onUpdateConcertAlbum(artistId, tour.id, concertId, [...imageIds, id]);
      }
    } finally {}
  };
  const handleImageError = (url: string) => setFailedUrls(prev => new Set([...prev, url]));
  const handleRemove = async (id: string) => { try { await deleteImage(id); } catch {} onUpdateConcertAlbum(artistId, tour.id, concertId, imageIds.filter(x => x !== id)); };
  const handleReplace = (id: string, index: number) => { setEditingTarget({ id, index }); setIsDialogOpen(true); };
  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOverItem.current = index; };
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
  const heroImageUrl = tour.imageUrl || bgUrl || artist.imageUrl || '';
  const salesLinkHeaderAction = concert.saleLink ? (
    <button
      type="button"
      onClick={() => window.open(concert.saleLink!, '_blank', 'noopener,noreferrer')}
      title="販売リンクを開く"
      style={{
        width: 28,
        height: 28,
        borderRadius: 999,
        border: 'none',
        background: 'rgba(83, 190, 232, 0.10)',
        color: theme.colors.primary,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3h7v7" />
        <path d="M10 14L21 3" />
        <path d="M21 14v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h4" />
      </svg>
    </button>
  ) : null;

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden', background: theme.colors.background }}>
      {bgUrl && (
        <>
          <div style={{ position: 'fixed', inset: 0, backgroundImage: `url(${bgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', transform: 'scale(1.02)', opacity: 0.94 }} />
          <div style={{ position: 'fixed', inset: 0, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.06)', maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.92) 12%, rgba(0,0,0,0.75) 28%, rgba(0,0,0,0.50) 48%, rgba(0,0,0,0.28) 65%, rgba(0,0,0,0.12) 78%, rgba(0,0,0,0) 88%)', WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.92) 12%, rgba(0,0,0,0.75) 28%, rgba(0,0,0,0.50) 48%, rgba(0,0,0,0.28) 65%, rgba(0,0,0,0.12) 78%, rgba(0,0,0,0) 88%)' }} />
          <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.42) 18%, rgba(0,0,0,0.28) 38%, rgba(0,0,0,0.16) 58%, rgba(0,0,0,0.10) 78%, rgba(0,0,0,0.04) 100%)' }} />
        </>
      )}

      <div style={{ position: 'relative', zIndex: 1, padding: 'calc(env(safe-area-inset-top) + 16px) max(16px, env(safe-area-inset-right)) 140px max(16px, env(safe-area-inset-left))', width: '100%', maxWidth: 1080, margin: '0 auto', boxSizing: 'border-box' }}>
        <DetailHeader
          title={tour.name || ''}
          titlePlaceholder="公演名未設定"
          posterUrl={heroImageUrl}
          posterAlt={tour.name}
          onBack={onBack}
          actions={<IconButton icon={<Icons.Edit />} onClick={() => onOpenConcertEditor(artistId, tour.id)} style={{ background: 'rgba(255,255,255,0.82)', border: 'none', color: theme.colors.primary }} />}
          subtitle={<button onClick={() => onOpenArtistDetail(artist.id)} style={{ width: 'fit-content', border: 'none', background: 'transparent', padding: 0, color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '4px', textDecorationColor: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>{artist.name}</button>}
          tags={
            <>
              <DetailChip label={concert.status} bg={theme.colors.status[concert.status as keyof typeof theme.colors.status] || theme.colors.primary} />
              <DetailChip label={concert.isParticipated ? '参戦済み' : '公演情報'} subtle />
              {concert.saleLink ? <DetailLinkIconButton onClick={() => window.open(concert.saleLink, '_blank', 'noopener,noreferrer')} title="販売ページを開く" /> : null}
              {tour.officialUrl ? <DetailLinkIconButton onClick={() => window.open(tour.officialUrl!, '_blank', 'noopener,noreferrer')} title="ツアー公式サイトを開く" /> : null}
            </>
          }
        />

        <CollapsibleSection title="基本情報">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, width: '100%' }}>
            <div><Label>公演日</Label><Value>{concert.concertAt || concert.date}</Value></div>
            <div><Label>会場</Label><Value>{concert.venue}</Value></div>
            <div><Label>チケット状態</Label><Value>{concert.status || '未設定'}</Value></div>
            <div><Label>料金</Label><Value>{concert.price ? `${concert.price.toLocaleString()} 円` : null}</Value></div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="抽選・販売情報" defaultOpen={!!(concert.lotteryName || concert.saleAt || concert.deadlineAt || concert.resultAt || concert.saleLink)} rightAction={salesLinkHeaderAction}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, width: '100%' }}>
            <div><Label>発売開始</Label><Value>{concert.saleAt || null}</Value></div>
            <div><Label>申込締切</Label><Value>{concert.deadlineAt || null}</Value></div>
            <div><Label>抽選結果日時</Label><Value>{concert.resultAt || null}</Value></div>
            <div><Label>抽選名</Label><Value>{concert.lotteryName || null}</Value></div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="アルバム" rightLabel={countLabel} defaultOpen>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <IconButton
              icon={<Icons.Plus />}
              primary
              size={48}
              onClick={() => { setEditingTarget(null); setIsDialogOpen(true); }}
              style={{ boxShadow: '0 8px 24px -6px rgba(83, 190, 232, 0.5)' }}
            />
          </div>
          {items.length === 0 ? (
            <div style={{ minHeight: 160, borderRadius: 24, border: '1px dashed rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.colors.textWeak, fontWeight: 700 }}>写真を追加</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>
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
                    style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 24, overflow: 'hidden', background: 'rgba(0,0,0,0.2)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'grab' }}
                  >
                    {isFailed ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: theme.colors.textWeak, fontSize: 12, padding: 16, textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, marginBottom: 12 }}>読み込めません</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <LinkPill onClick={() => handleReplace(it.id, idx)}>置換</LinkPill>
                          <button onClick={() => handleRemove(it.id)} style={{ border: 'none', background: 'rgba(255, 59, 48, 0.12)', color: '#FF3B30', fontSize: 11, padding: '10px 12px', borderRadius: 999, fontWeight: 800, cursor: 'pointer' }}>削除</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <img src={it.url} referrerPolicy="no-referrer" alt="" loading="lazy" onError={() => handleImageError(it.url)} onClick={() => setFullscreenUrl(it.url)} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} />
                        <button onClick={(e) => { e.stopPropagation(); handleRemove(it.id); }} style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 14, background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>×</button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleSection>
      </div>

      {fullscreenUrl && (
        <div onClick={() => setFullscreenUrl(null)} className="fade-in" style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <img src={fullscreenUrl} referrerPolicy="no-referrer" alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
          <button style={{ position: 'absolute', top: 24, right: 24, background: 'none', border: 'none', color: 'white', fontSize: 32, cursor: 'pointer' }} onClick={() => setFullscreenUrl(null)}>×</button>
        </div>
      )}

      <ImageDialog
        isOpen={isDialogOpen}
        onClose={() => { setIsDialogOpen(false); setEditingTarget(null); }}
        onAdd={async (url) => { await handleAddOrReplace(url); setIsDialogOpen(false); }}
        title={editingTarget ? '画像のURLを更新' : '思い出の写真を追加'}
      />
    </div>
  );
};
