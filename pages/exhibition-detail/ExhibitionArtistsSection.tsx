import React from 'react';
import { theme } from '../../ui/theme';
import { GlassCard } from '../../ui/GlassCard';
import { Exhibition, ExhibitionArtist } from '../../domain/types';
import { Icons } from '../../ui/IconButton';

interface Props {
  exhibition: Exhibition;
  isEditMode: boolean;
  onChange: (artists: ExhibitionArtist[]) => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(0,0,0,0.08)',
  background: 'white',
  fontSize: 14,
  outline: 'none'
};

export const ExhibitionArtistsSection: React.FC<Props> = ({ exhibition, isEditMode, onChange }) => {
  const artists = exhibition.artists || [];

  const handleAdd = () => onChange([...artists, { name: '' }]);
  const handleRemove = (index: number) => onChange(artists.filter((_, i) => i !== index));
  const handleUpdate = (index: number, patch: Partial<ExhibitionArtist>) =>
    onChange(artists.map((a, i) => (i === index ? { ...a, ...patch } : a)));

  return (
    <GlassCard padding="20px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0, color: theme.colors.primary }}>参加作家 / アーティスト</h3>
        {isEditMode && (
          <button
            type="button"
            onClick={handleAdd}
            style={{
              border: 'none',
              background: 'transparent',
              color: theme.colors.textSecondary,
              fontWeight: 900,
              cursor: 'pointer',
              display: 'inline-flex',
              gap: 6,
              alignItems: 'center',
              padding: 0
            }}
          >
            <Icons.Plus style={{ width: 14 }} /> 追加
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {artists.length === 0 && !isEditMode && <div style={{ color: '#9CA3AF', fontSize: 14 }}>登録されていません</div>}

        {artists.map((artist, idx) => (
          <div
            key={idx}
            style={{
              padding: isEditMode ? 0 : '10px 14px',
              background: isEditMode ? 'transparent' : 'rgba(0,0,0,0.02)',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}
          >
            {isEditMode ? (
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    placeholder="作家名"
                    value={artist.name}
                    onChange={(e) => handleUpdate(idx, { name: e.target.value })}
                    style={inputStyle}
                  />
                  <input
                    placeholder="備考 (オプション)"
                    value={artist.note ?? ''}
                    onChange={(e) => handleUpdate(idx, { note: e.target.value })}
                    style={{ ...inputStyle, padding: '8px 10px', fontSize: 12 }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    border: '1px solid rgba(0,0,0,0.08)',
                    background: 'rgba(255,255,255,0.9)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: theme.colors.error
                  }}
                  aria-label="remove"
                >
                  <Icons.Trash style={{ width: 16 }} />
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{artist.name}</div>
                {artist.note && <div style={{ fontSize: 12, color: theme.colors.textSecondary }}>{artist.note}</div>}
              </>
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );
};
