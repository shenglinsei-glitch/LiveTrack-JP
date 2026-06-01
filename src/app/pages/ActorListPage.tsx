import React, { useMemo, useState } from 'react';
import { Actor, Movie } from '@/domain/types';
import { PageShell } from '@/components/common/PageShell';
import { theme } from '@/components/common/theme';
import { RemoteImage } from '@/components/RemoteImage';

interface ActorListPageProps {
  actors: Actor[];
  movies: Movie[];
  onOpenActor: (actorId: string) => void;
}

const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();
const getMoviesForActor = (actor: Actor, movies: Movie[]) => {
  const key = normalizeName(actor.name);
  return (movies || []).filter(movie => (movie.actors || []).some(name => normalizeName(name) === key));
};

const ActorGridCard: React.FC<{ actor: Actor; movies: Movie[]; onClick: () => void }> = ({ actor, movies, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const relatedMovies = getMoviesForActor(actor, movies);
  const fallbackPoster = relatedMovies.find(m => m.posterUrl)?.posterUrl || '';
  const countLabel = `${relatedMovies.length} 作品`;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'white',
        borderRadius: '24px',
        border: '1px solid rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        boxShadow: isHovered ? '0 12px 24px -8px rgba(0,0,0,0.12)' : '0 4px 12px -2px rgba(0,0,0,0.03)',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ position: 'relative', paddingTop: '133%', background: '#F3F4F6' }}>
        {actor.avatar ? (
          <img
            src={actor.avatar}
            alt={actor.name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : fallbackPoster ? (
          <RemoteImage
            imageUrl={fallbackPoster}
            alt={actor.name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            fallback={(
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
                <span style={{ fontSize: '40px' }}>🎭</span>
              </div>
            )}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
            <span style={{ fontSize: '40px' }}>🎭</span>
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '38%',
            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.62) 0%, rgba(0, 0, 0, 0.24) 62%, transparent 100%)',
            zIndex: 1,
            pointerEvents: 'none'
          }}
        />

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 14px 12px', zIndex: 2 }}>
          <div
            style={{
              fontWeight: '900',
              fontSize: '14px',
              color: 'white',
              marginBottom: '4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textShadow: '0 1px 4px rgba(0,0,0,0.4)'
            }}
          >
            {actor.name}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: theme.colors.primary,
                boxShadow: `0 0 8px ${theme.colors.primary}aa`,
                flexShrink: 0
              }}
            />
            <div
              style={{
                fontSize: '10px',
                fontWeight: '700',
                color: 'rgba(255, 255, 255, 0.86)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}
            >
              {countLabel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ActorListPage: React.FC<ActorListPageProps> = ({ actors, movies, onOpenActor }) => {
  const displayActors = useMemo(() => {
    return [...(actors || [])].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }, [actors]);

  return (
    <PageShell disablePadding>
      <div style={{ padding: '0 16px 140px' }}>
        {displayActors.length === 0 ? (
          <div style={{ padding: '110px 0', textAlign: 'center', color: '#9CA3AF', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <div style={{ fontSize: 48, opacity: 0.25 }}>🎭</div>
            <div style={{ fontWeight: 800 }}>フォロー中の出演者がありません。</div>
            <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.7, maxWidth: 280 }}>
              映画詳細の出演者欄から「フォロー」を押すと、この一覧に表示されます。
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
            {displayActors.map(actor => (
              <ActorGridCard
                key={actor.id}
                actor={actor}
                movies={movies}
                onClick={() => onOpenActor(actor.id)}
              />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
};
