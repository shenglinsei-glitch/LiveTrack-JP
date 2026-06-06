import React, { useState } from 'react';
import { TagMasters, TagMasterKey, Artist, Exhibition, Movie, Anime } from '@/domain/types';
import { theme } from '@/components/common/theme';
import { GlassCard } from '@/components/common/GlassCard';
import { Icons, IconButton } from '@/components/common/IconButton';
import { PageShell } from '@/components/common/PageShell';
import { DetailPageLayout } from '@/components/detail/DetailPageLayout';

interface TagManagementPageProps {
  tagMasters: TagMasters;
  onUpdateTagMasters: (tagMasters: TagMasters) => void;
  artists: Artist[];
  exhibitions: Exhibition[];
  movies: Movie[];
  animes: Anime[];
  onUpdateArtists: (artists: Artist[]) => void;
  onUpdateExhibitions: (exhibitions: Exhibition[]) => void;
  onUpdateMovies: (movies: Movie[]) => void;
  onUpdateAnimes: (animes: Anime[]) => void;
  onBack: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  minHeight: 44,
  borderRadius: 14,
  border: '1px solid rgba(15,23,42,0.08)',
  background: 'rgba(255,255,255,0.85)',
  padding: '0 14px',
  fontSize: 14,
  color: theme.colors.text,
  outline: 'none',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 900,
  color: theme.colors.text,
  marginBottom: 12,
};

const tagItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 8,
};

const TAG_LABELS: Record<TagMasterKey, string> = {
  venues: '公演会場',
  cinemas: '映画館',
  exhibitionVenues: '展覧会場',
  movieGenres: '映画ジャンル',
  animeGenres: 'アニメジャンル',
  animeStudios: 'アニメ制作会社',
  directors: '監督',
  artists: 'アーティスト',
  general: 'その他',
};

export const TagManagementPage: React.FC<TagManagementPageProps> = ({
  tagMasters,
  onUpdateTagMasters,
  artists,
  exhibitions,
  movies,
  animes,
  onUpdateArtists,
  onUpdateExhibitions,
  onUpdateMovies,
  onUpdateAnimes,
  onBack,
}) => {
  const [editingKey, setEditingKey] = useState<TagMasterKey | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [newTagInputs, setNewTagInputs] = useState<Record<TagMasterKey, string>>({
    venues: '',
    cinemas: '',
    exhibitionVenues: '',
    movieGenres: '',
    animeGenres: '',
    animeStudios: '',
    directors: '',
    artists: '',
    general: '',
  });

  const handleAdd = (key: TagMasterKey) => {
    const trimmed = newTagInputs[key].trim();
    if (!trimmed) return;
    if (tagMasters[key].includes(trimmed)) {
      window.alert('既に存在します');
      return;
    }
    onUpdateTagMasters({
      ...tagMasters,
      [key]: [...tagMasters[key], trimmed],
    });
    setNewTagInputs({ ...newTagInputs, [key]: '' });
  };

  const handleDelete = (key: TagMasterKey, index: number) => {
    if (!window.confirm('この候補を削除しますか？\n既存データからは削除されません。')) return;
    const newList = tagMasters[key].filter((_, i) => i !== index);
    onUpdateTagMasters({
      ...tagMasters,
      [key]: newList,
    });
  };

  const startEdit = (key: TagMasterKey, index: number) => {
    setEditingKey(key);
    setEditingIndex(index);
    setEditingValue(tagMasters[key][index]);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditingIndex(null);
    setEditingValue('');
  };

  const saveEdit = () => {
    if (editingKey === null || editingIndex === null) return;
    const trimmed = editingValue.trim();
    if (!trimmed) {
      window.alert('空白にはできません');
      return;
    }
    const oldValue = tagMasters[editingKey][editingIndex];

    if (trimmed !== oldValue && tagMasters[editingKey].includes(trimmed)) {
      window.alert('既に存在します');
      return;
    }

    const newList = [...tagMasters[editingKey]];
    newList[editingIndex] = trimmed;

    onUpdateTagMasters({
      ...tagMasters,
      [editingKey]: newList,
    });

    replaceInExistingData(editingKey, oldValue, trimmed);

    cancelEdit();
  };

  const replaceInExistingData = (key: TagMasterKey, oldValue: string, newValue: string) => {
    if (key === 'venues') {
      const updatedArtists = artists.map((artist) => ({
        ...artist,
        tours: artist.tours.map((tour) => ({
          ...tour,
          concerts: tour.concerts.map((concert) => ({
            ...concert,
            venue: concert.venue === oldValue ? newValue : concert.venue,
          })),
        })),
      }));
      onUpdateArtists(updatedArtists);
    }

    if (key === 'cinemas') {
      const updatedMovies = movies.map((movie) => ({
        ...movie,
        theaterName: movie.theaterName === oldValue ? newValue : movie.theaterName,
      }));
      onUpdateMovies(updatedMovies);
    }

    if (key === 'exhibitionVenues') {
      const updatedExhibitions = exhibitions.map((ex) => ({
        ...ex,
        venueName: ex.venueName === oldValue ? newValue : ex.venueName,
      }));
      onUpdateExhibitions(updatedExhibitions);
    }

    if (key === 'movieGenres') {
      const updatedMovies = movies.map((movie) => ({
        ...movie,
        genres: movie.genres?.map((g) => (g === oldValue ? newValue : g)),
      }));
      onUpdateMovies(updatedMovies);
    }

    if (key === 'animeGenres') {
      const updatedAnimes = animes.map((anime) => ({
        ...anime,
        genres: anime.genres?.map((g) => (g === oldValue ? newValue : g)),
        seasons: anime.seasons?.map((season) => ({
          ...season,
          genres: season.genres?.map((g) => (g === oldValue ? newValue : g)),
        })),
      }));
      onUpdateAnimes(updatedAnimes);
    }

    if (key === 'animeStudios') {
      const updatedAnimes = animes.map((anime) => ({
        ...anime,
        studio: anime.studio === oldValue ? newValue : anime.studio,
        seasons: anime.seasons?.map((season) => ({
          ...season,
          studio: season.studio === oldValue ? newValue : season.studio,
        })),
      }));
      onUpdateAnimes(updatedAnimes);
    }

    if (key === 'directors') {
      onUpdateMovies(movies.map((movie) => ({
        ...movie,
        directors: movie.directors?.map((d) => (d === oldValue ? newValue : d)),
      })));
      onUpdateAnimes(animes.map((anime) => ({
        ...anime,
        director: anime.director === oldValue ? newValue : anime.director,
        seasons: anime.seasons?.map((season) => ({
          ...season,
          director: season.director === oldValue ? newValue : season.director,
        })),
      })));
    }

    if (key === 'artists') {
      onUpdateExhibitions(exhibitions.map((ex) => ({
        ...ex,
        artists: ex.artists?.map((artist) => ({
          ...artist,
          name: artist.name === oldValue ? newValue : artist.name,
        })),
      })));
    }
  };

  const renderTagSection = (key: TagMasterKey) => (
    <GlassCard key={key} style={{ marginBottom: 16 }}>
      <div style={sectionTitleStyle}>{TAG_LABELS[key]}</div>
      <div style={{ marginBottom: 12 }}>
        {tagMasters[key].map((tag, idx) => (
          <div key={idx} style={tagItemStyle}>
            {editingKey === key && editingIndex === idx ? (
              <>
                <input
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  autoFocus
                />
                <IconButton icon={<Icons.Check />} onClick={saveEdit} />
                <IconButton icon={<Icons.X />} onClick={cancelEdit} />
              </>
            ) : (
              <>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: theme.colors.text }}>{tag}</div>
                <IconButton icon={<Icons.Edit />} onClick={() => startEdit(key, idx)} />
                <IconButton icon={<Icons.Trash />} onClick={() => handleDelete(key, idx)} />
              </>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={newTagInputs[key]}
          onChange={(e) => setNewTagInputs({ ...newTagInputs, [key]: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd(key)}
          placeholder="新しい候補を追加"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          onClick={() => handleAdd(key)}
          style={{
            minWidth: 60,
            padding: '0 16px',
            borderRadius: 14,
            border: 'none',
            background: theme.colors.primary,
            color: 'white',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          追加
        </button>
      </div>
    </GlassCard>
  );

  return (
    <DetailPageLayout>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: '#F9FAFB', paddingTop: 'env(safe-area-inset-top)' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
          <IconButton icon={<Icons.ChevronLeft />} onClick={onBack} />
          <div style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 900, color: theme.colors.text }}>タグ管理</div>
          <div style={{ width: 44 }} />
        </div>
      </div>

      <div style={{ padding: '16px', paddingTop: 'calc(64px + env(safe-area-inset-top))', paddingBottom: 140 }}>
        {(Object.keys(tagMasters) as TagMasterKey[]).map((key) => renderTagSection(key))}
      </div>
    </DetailPageLayout>
  );
};
