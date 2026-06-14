import React, { useMemo } from 'react';
import { Actor, Movie } from '@/domain/types';
import { PageShell } from '@/components/common/PageShell';
import { theme } from '@/components/common/theme';
import { PosterCard } from '@/components/common/PosterCard';

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
  const relatedMovies = getMoviesForActor(actor, movies);
  const fallbackPoster = relatedMovies.find(m => m.posterUrl)?.posterUrl || '';
  const countLabel = `${relatedMovies.length} 作品`;
  const displayImage = actor.avatar || fallbackPoster;

  return (
    <PosterCard
      onClick={onClick}
      imageUrl={displayImage}
      title={actor.name}
      meta={(
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.colors.primary, boxShadow: `0 0 8px ${theme.colors.primary}aa`, flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{countLabel}</span>
        </span>
      )}
      alt={actor.name}
      compact
      fallback={(
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2 }}>
          <span style={{ fontSize: 48 }}>🎭</span>
        </div>
      )}
    />
  );
};

export const ActorListPage: React.FC<ActorListPageProps> = ({ actors, movies, onOpenActor }) => {
  const displayActors = useMemo(() => {
    return [...(actors || [])].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }, [actors]);

  return (
    <PageShell disablePadding>
      <div style={{ padding: '0 0 140px' }}>
        {displayActors.length === 0 ? (
          <div style={{ padding: '110px 0', textAlign: 'center', color: '#9CA3AF', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <div style={{ fontSize: 48, opacity: 0.25 }}>🎭</div>
            <div style={{ fontWeight: 800 }}>フォロー中の出演者がありません。</div>
            <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.7, maxWidth: 280 }}>
              映画詳細の出演者欄から「フォロー」を押すと、この一覧に表示されます。
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
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
