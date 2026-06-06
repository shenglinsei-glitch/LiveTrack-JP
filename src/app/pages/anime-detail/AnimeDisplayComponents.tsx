import React from 'react';
import { OpeningSong, EndingSong } from '@/domain/types';
import { theme } from '@/components/common/theme';
import { Label, Value } from '@/components/detail/DetailText';
import { infoItemStyle, chipWrapStyle } from './AnimeSharedStyles';
import { asArray } from '@/utils/animeStatusHelpers';

export const InfoItem: React.FC<{ label: string; children?: React.ReactNode }> = ({ label, children }) => {
  if (children === null || children === undefined || children === '') return null;
  return (
    <div style={infoItemStyle}>
      <Label>{label}</Label>
      <Value placeholder="">{children}</Value>
    </div>
  );
};

export const GenreChips: React.FC<{ genres?: string[] }> = ({ genres }) => {
  const values = asArray(genres).filter(Boolean);
  if (!values.length) return null;
  return (
    <div style={chipWrapStyle}>
      {values.map((genre, idx) => (
        <span
          key={`${genre}-${idx}`}
          style={{
            background: 'rgba(83,190,232,0.15)',
            color: theme.colors.primary,
            padding: '6px 12px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 800
          }}
        >
          {genre}
        </span>
      ))}
    </div>
  );
};

export const SongList: React.FC<{ songs?: Array<OpeningSong | EndingSong> }> = ({ songs }) => {
  const values = asArray(songs);
  if (!values.length) return null;
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {values.map((song, idx) => (
        <div
          key={`${song.songTitle}-${idx}`}
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            background: 'rgba(255,255,255,0.62)',
            borderRadius: 16,
            padding: '10px 12px',
            border: '1px solid rgba(15,23,42,0.05)'
          }}
        >
          {song.coverUrl ? (
            <img
              src={song.coverUrl}
              alt={song.songTitle}
              style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
            />
          ) : null}
          <div style={{ flex: '1 1 0', minWidth: 0, maxWidth: '100%' }}>
            <Value placeholder="">{song.songTitle || null}</Value>
            <div style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 2, fontWeight: 700 }}>
              {song.artistName || ''}
            </div>
            {song.musicUrl ? (
              <a
                href={song.musicUrl.startsWith('http') ? song.musicUrl : `https://${song.musicUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: theme.colors.primary, fontWeight: 800 }}
              >
                リンクを開く
              </a>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
};
