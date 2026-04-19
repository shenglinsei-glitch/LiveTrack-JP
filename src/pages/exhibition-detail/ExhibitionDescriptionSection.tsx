import React, { useState } from 'react';
import { theme } from '../../ui/theme';
import { GlassCard } from '../../ui/GlassCard';
import { Exhibition, ExhibitionArtist } from '../../domain/types';
import { Icons } from '../../ui/IconButton';

interface Props {
  exhibition: Exhibition;
  isEditMode: boolean;
  onUpdateArtists: (artists: ExhibitionArtist[]) => void;
  onUpdateDescription: (description: string) => void;
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

export const ExhibitionDescriptionSection: React.FC<Props> = ({
  exhibition,
  isEditMode,
  onUpdateArtists,
  onUpdateDescription
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const artists = exhibition.artists || [];

  const handleAddArtist = () => onUpdateArtists([...artists, { name: '' }]);
  const handleRemoveArtist = (index: number) => onUpdateArtists(artists.filter((_, i) => i !== index));
  const handleUpdateArtist = (index: number, patch: Partial<ExhibitionArtist>) =>
    onUpdateArtists(artists.map((a, i) => (i === index ? { ...a, ...patch } : a)));

  const SubTitle = ({ title }: { title: string }) => (
    <div style={{ fontSize: 13, fontWeight: 800, color: theme.colors.primary, marginBottom: 8, marginTop: 16 }}>
      {title}
    </div>
  );

  return (
    <GlassCard padding="20px">
      <div
        onClick={() => !isEditMode && setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: isEditMode ? 'default' : 'pointer',
          marginBottom: isExpanded || isEditMode ? 12 : 0
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 900, margin: 0, color: theme.colors.primary }}>展覧会について</h3>
        {!isEditMode && (
          <Icons.ChevronLeft
            style={{
              width: 20,
              height: 20,
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isExpanded ? 'rotate(270deg)' : 'rotate(180deg)',
              color: theme.colors.textSecondary
            }}
          />
        )}
      </div>

      {(isExpanded || isEditMode) && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Artists */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <SubTitle title="作家" />
            {isEditMode && (
              <button
                type="button"
                onClick={handleAddArtist}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontWeight: 900,
                  padding: 0,
                  color: 'rgb(156, 163, 175)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Icons.Plus style={{ width: 14 }} />
                追加
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {artists.length === 0 && !isEditMode && <div style={{ color: '#9CA3AF', fontSize: 14 }}>未登録</div>}

            {artists.map((artist, idx) => (
              <div
                key={idx}
                style={{
                  padding: isEditMode ? 0 : '8px 12px',
                  background: isEditMode ? 'transparent' : 'rgba(0,0,0,0.02)',
                  borderRadius: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}
              >
                {isEditMode ? (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <input
                        placeholder="作家名"
                        value={artist.name}
                        onChange={(e) => handleUpdateArtist(idx, { name: e.target.value })}
                        style={inputStyle}
                      />
                      <input
                        placeholder="備考"
                        value={artist.note ?? ''}
                        onChange={(e) => handleUpdateArtist(idx, { note: e.target.value })}
                        style={{ ...inputStyle, padding: '8px 10px', fontSize: 12 }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveArtist(idx)}
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

          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '16px 0' }} />

          {/* Description */}
          <SubTitle title="展覧会紹介" />
          {isEditMode ? (
            <textarea
              rows={6}
              value={exhibition.description ?? ''}
              onChange={(e) => onUpdateDescription(e.target.value)}
              placeholder="展覧会の内容、見どころなどを入力..."
              style={{ ...inputStyle, resize: 'vertical', minHeight: 120, borderRadius: 12 }}
            />
          ) : (
            <div style={{ fontSize: 15, lineHeight: '1.8', color: theme.colors.textMain, whiteSpace: 'pre-wrap' }}>
              {exhibition.description || '紹介文がありません。'}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
};
