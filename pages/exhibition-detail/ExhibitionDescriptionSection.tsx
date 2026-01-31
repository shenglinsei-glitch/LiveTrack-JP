
import React, { useState } from 'react';
import { theme } from '../../ui/theme';
import { GlassCard } from '../../ui/GlassCard';
import { Exhibition, ExhibitionArtist } from '../../domain/types';
import { Input, Button, Divider } from 'antd';
import { Icons } from '../../ui/IconButton';

const { TextArea } = Input;

interface Props {
  exhibition: Exhibition;
  isEditMode: boolean;
  onUpdateArtists: (artists: ExhibitionArtist[]) => void;
  onUpdateDescription: (description: string) => void;
}

export const ExhibitionDescriptionSection: React.FC<Props> = ({ 
  exhibition, 
  isEditMode, 
  onUpdateArtists, 
  onUpdateDescription 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const artists = exhibition.artists || [];

  const handleAddArtist = () => {
    onUpdateArtists([...artists, { name: '' }]);
  };

  const handleRemoveArtist = (index: number) => {
    onUpdateArtists(artists.filter((_, i) => i !== index));
  };

  const handleUpdateArtist = (index: number, patch: Partial<ExhibitionArtist>) => {
    onUpdateArtists(artists.map((a, i) => i === index ? { ...a, ...patch } : a));
  };

  const SubTitle = ({ title }: { title: string }) => (
    <div style={{ 
      fontSize: '13px', 
      fontWeight: '800', 
      color: theme.colors.primary, 
      marginBottom: '8px',
      marginTop: '16px'
    }}>
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
          marginBottom: (isExpanded || isEditMode) ? '12px' : '0'
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: '900', margin: 0, color: theme.colors.primary }}>展覧会について</h3>
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
          
          {/* Artists Part */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <SubTitle title="作家" />
            {isEditMode && (
              <Button type="link" onClick={handleAddArtist} icon={<Icons.Plus style={{ width: 14 }} />} style={{ fontWeight: 'bold', padding: 0, color: 'rgb(156, 163, 175)' }}>
                追加
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {artists.length === 0 && !isEditMode && (
              <div style={{ color: '#9CA3AF', fontSize: '14px' }}>未登録</div>
            )}
            {artists.map((artist, idx) => (
              <div key={idx} style={{ 
                padding: isEditMode ? '0' : '8px 12px', 
                background: isEditMode ? 'transparent' : 'rgba(0,0,0,0.02)', 
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}>
                {isEditMode ? (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <Input 
                        placeholder="作家名" 
                        value={artist.name} 
                        onChange={e => handleUpdateArtist(idx, { name: e.target.value })} 
                      />
                      <Input 
                        placeholder="備考" 
                        size="small"
                        value={artist.note} 
                        onChange={e => handleUpdateArtist(idx, { note: e.target.value })} 
                      />
                    </div>
                    <Button 
                      danger 
                      type="text" 
                      icon={<Icons.Trash style={{ width: 16 }} />} 
                      onClick={() => handleRemoveArtist(idx)} 
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

          <Divider style={{ margin: '16px 0', opacity: 0.05 }} />

          {/* Description Part */}
          <SubTitle title="展覧会紹介" />
          {isEditMode ? (
            <TextArea 
              rows={6} 
              value={exhibition.description} 
              onChange={e => onUpdateDescription(e.target.value)}
              placeholder="展覧会の内容、見どころなどを入力..."
              style={{ borderRadius: '12px' }}
            />
          ) : (
            <div style={{ 
              fontSize: '15px', 
              lineHeight: '1.8', 
              color: theme.colors.textMain, 
              whiteSpace: 'pre-wrap' 
            }}>
              {exhibition.description || '紹介文がありません。'}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
};
