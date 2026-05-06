import React, { useMemo, useState } from 'react';
import { Actor, Movie } from '@/domain/types';
import { DetailPageLayout } from '@/components/detail/DetailPageLayout';
import { DetailHeader, DetailChip } from '@/components/detail/DetailHeader';
import { Icons, IconButton } from '@/components/common/IconButton';
import { GlassCard } from '@/components/common/GlassCard';
import { SectionTitle, Value, Label } from '@/components/detail/DetailText';
import { theme } from '@/components/common/theme';
import { StatusBadge } from '@/components/common/StatusBadge';
import dayjs from 'dayjs';

interface ActorDetailPageProps {
  actor: Actor;
  movies: Movie[];
  onBack: () => void;
  onOpenMovieDetail: (movieId: string) => void;
  onUpdateActor: (actor: Actor) => void;
  onUnfollowActor: (actorId: string) => void;
}

const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();
const fmtDate = (date?: string) => date && dayjs(date).isValid() ? dayjs(date).format('YYYY/MM/DD') : '';

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 54,
  borderRadius: 18,
  border: '1px solid rgba(15,23,42,0.08)',
  background: 'rgba(255,255,255,0.85)',
  padding: '0 16px',
  fontSize: 15,
  color: theme.colors.text,
  outline: 'none',
  boxSizing: 'border-box',
};

export const ActorDetailPage: React.FC<ActorDetailPageProps> = ({ actor, movies, onBack, onOpenMovieDetail, onUpdateActor, onUnfollowActor }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<Actor>(actor);

  const relatedMovies = useMemo(() => {
    const key = normalizeName(actor.name);
    return (movies || [])
      .filter(movie => (movie.actors || []).some(name => normalizeName(name) === key))
      .sort((a, b) => dayjs(b.watchDate || b.releaseDate || b.updatedAt).valueOf() - dayjs(a.watchDate || a.releaseDate || a.updatedAt).valueOf());
  }, [actor.name, movies]);

  const backgroundUrl = formData.avatar || relatedMovies.find(m => m.posterUrl)?.posterUrl || '';

  const save = () => {
    const next = { ...formData, name: formData.name.trim() || actor.name, updatedAt: new Date().toISOString() };
    onUpdateActor(next);
    setFormData(next);
    setIsEditMode(false);
  };

  return (
    <DetailPageLayout backgroundUrl={backgroundUrl} bottomPadding={120}>
      <DetailHeader
        title={formData.name}
        onTitleChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
        titlePlaceholder="出演者名"
        isEditMode={isEditMode}
        posterUrl={formData.avatar || backgroundUrl}
        posterAlt={formData.name}
        posterFallback={<div style={{ fontSize: 46, opacity: 0.25 }}>🎭</div>}
        onBack={onBack}
        actions={
          <>
            {isEditMode ? (
              <IconButton icon={<Icons.Check />} onClick={save} primary />
            ) : (
              <IconButton icon={<Icons.Edit />} onClick={() => setIsEditMode(true)} style={{ background: 'rgba(255,255,255,0.82)', border: 'none', color: theme.colors.primary }} />
            )}
            <IconButton icon={<Icons.Trash />} onClick={() => { if (window.confirm('この出演者のフォローを解除しますか？')) onUnfollowActor(actor.id); }} style={{ background: 'rgba(255,255,255,0.82)', border: 'none', color: '#F97316' }} />
          </>
        }
        tags={
          <>
            <DetailChip label="フォロー中" />
            <DetailChip label={`${relatedMovies.length}作品`} subtle />
          </>
        }
      />

      {isEditMode && (
        <GlassCard padding="20px" style={{ marginBottom: 14 }}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <Label>头像 / 背景画像URL</Label>
              <input
                value={formData.avatar || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, avatar: e.target.value }))}
                placeholder="https://..."
                style={inputStyle}
              />
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard padding="20px" style={{ marginBottom: 14 }}>
        <SectionTitle title="出演作品" style={{ marginTop: 0, marginBottom: 14 }} />
        {relatedMovies.length === 0 ? (
          <Value>この出演者に紐づく映画はまだありません。</Value>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {relatedMovies.map(movie => (
              <button
                key={movie.id}
                type="button"
                onClick={() => onOpenMovieDetail(movie.id)}
                style={{
                  width: '100%',
                  border: '1px solid rgba(15,23,42,0.06)',
                  background: 'rgba(255,255,255,0.72)',
                  borderRadius: 22,
                  padding: 10,
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  textAlign: 'left',
                }}
              >
                <div style={{ width: 58, height: 82, borderRadius: 16, overflow: 'hidden', background: '#F3F4F6', flexShrink: 0 }}>
                  {movie.posterUrl ? <img src={movie.posterUrl} alt={movie.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.25 }}>🎬</div>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: theme.colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{movie.title}</div>
                  <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: theme.colors.textSecondary }}>{movie.watchDate ? `鑑賞日：${fmtDate(movie.watchDate)}` : `公開日：${fmtDate(movie.releaseDate) || '未設定'}`}</div>
                  <div style={{ marginTop: 8 }}><StatusBadge domain="movie" status={movie.status} /></div>
                </div>
                <div style={{ color: theme.colors.primary, fontWeight: 900, fontSize: 20 }}>›</div>
              </button>
            ))}
          </div>
        )}
      </GlassCard>
    </DetailPageLayout>
  );
};
