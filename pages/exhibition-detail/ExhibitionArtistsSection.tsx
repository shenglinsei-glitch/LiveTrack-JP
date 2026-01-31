
import React from 'react';
import { theme } from '../../ui/theme';
import { GlassCard } from '../../ui/GlassCard';
import { Exhibition, ExhibitionArtist } from '../../domain/types';
import { Input, Button, Space } from 'antd';
import { Icons } from '../../ui/IconButton';

interface Props {
  exhibition: Exhibition;
  isEditMode: boolean;
  onChange: (artists: ExhibitionArtist[]) => void;
}

export const ExhibitionArtistsSection: React.FC<Props> = ({ exhibition, isEditMode, onChange }) => {
  const artists = exhibition.artists || [];

  const handleAdd = () => {
    onChange([...artists, { name: '' }]);
  };

  const handleRemove = (index: number) => {
    onChange(artists.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, patch: Partial<ExhibitionArtist>) => {
    onChange(artists.map((a, i) => i === index ? { ...a, ...patch } : a));
  };

  return (
    <GlassCard padding="20px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '900', margin: 0, color: theme.colors.primary }}>参加作家 / アーティスト</h3>
        {isEditMode && (
          <Button type="link" onClick={handleAdd} icon={<Icons.Plus style={{ width: 14 }} />} style={{ fontWeight: 'bold', padding: 0 }}>
            追加
          </Button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {artists.length === 0 && !isEditMode && (
          <div style={{ color: '#9CA3AF', fontSize: '14px' }}>登録されていません</div>
        )}

        {artists.map((artist, idx) => (
          <div key={idx} style={{ 
            padding: isEditMode ? '0' : '10px 14px', 
            background: isEditMode ? 'transparent' : 'rgba(0,0,0,0.02)', 
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            {isEditMode ? (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <Input 
                    placeholder="作家名" 
                    value={artist.name} 
                    onChange={e => handleUpdate(idx, { name: e.target.value })} 
                  />
                  <Input 
                    placeholder="備考 (オプション)" 
                    size="small"
                    value={artist.note} 
                    onChange={e => handleUpdate(idx, { note: e.target.value })} 
                  />
                </div>
                <Button 
                  danger 
                  type="text" 
                  icon={<Icons.Trash style={{ width: 16 }} />} 
                  onClick={() => handleRemove(idx)} 
                />
              </div>
            ) : (
              <>
                <div style={{ fontSize: '14px', fontWeight: '800' }}>{artist.name}</div>
                {artist.note && <div style={{ fontSize: '12px', color: theme.colors.textSecondary }}>{artist.note}</div>}
              </>
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );
};
