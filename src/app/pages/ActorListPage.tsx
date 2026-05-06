import React, { useMemo } from 'react';
import { Actor, Movie } from '@/domain/types';
import { GlassCard } from '@/components/common/GlassCard';
import { PageShell } from '@/components/common/PageShell';
import { theme } from '@/components/common/theme';

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

export const ActorListPage: React.FC<ActorListPageProps> = ({ actors, movies, onOpenActor }) => {
  const displayActors = useMemo(() => {
    return [...(actors || [])].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }, [actors]);

  return (
    <PageShell disablePadding>
      <div style={{ padding: '8px 16px 140px' }}>
        {displayActors.length === 0 ? (
          <div style={{ padding: '110px 0', textAlign: 'center', color: '#9CA3AF', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
            <div style={{ fontSize: 48, opacity: 0.25 }}>🎭</div>
            <div style={{ fontWeight: 800 }}>フォロー中の出演者がありません。</div>
            <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.7, maxWidth: 280 }}>
              映画詳細の出演者欄から「フォロー」を押すと、この一覧に表示されます。
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {displayActors.map(actor => {
              const relatedMovies = getMoviesForActor(actor, movies);
              const bgUrl = actor.avatar || relatedMovies.find(m => m.posterUrl)?.posterUrl || '';
              return (
                <button
                  key={actor.id}
                  type="button"
                  onClick={() => onOpenActor(actor.id)}
                  style={{ border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                >
                  <GlassCard padding="16px" style={{ borderRadius: 26, display: 'flex', alignItems: 'center', gap: 14, minHeight: 96 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 22, overflow: 'hidden', background: '#F3F4F6', flexShrink: 0, boxShadow: '0 8px 20px rgba(15,23,42,0.10)' }}>
                      {bgUrl ? (
                        <img src={bgUrl} alt={actor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, opacity: 0.28 }}>🎭</div>
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: theme.colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actor.name}</div>
                      <div style={{ marginTop: 6, fontSize: 12, fontWeight: 800, color: theme.colors.textSecondary }}>{relatedMovies.length} 作品</div>
                    </div>
                    <div style={{ color: theme.colors.primary, fontWeight: 900, fontSize: 20 }}>›</div>
                  </GlassCard>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
};
