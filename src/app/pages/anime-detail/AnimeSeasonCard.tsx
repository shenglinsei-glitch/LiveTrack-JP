import React from 'react';
import { Season } from '@/domain/types';
import { theme } from '@/components/common/theme';
import { GlassCard } from '@/components/common/GlassCard';
import { Label, Value } from '@/components/detail/DetailText';
import { DetailLinkIconButton } from '@/components/detail/DetailHeader';
import { InfoItem, GenreChips, SongList } from './AnimeDisplayComponents';
import { CollapseChevron, StatusPill, infoGridStyle } from './AnimeSharedStyles';
import { asArray, getSeasonDisplayTitle, formatDateWithWeek, getBroadcastText, openExternalUrl } from '@/utils/animeStatusHelpers';

export const SeasonSummaryCard: React.FC<{
  animeTitle: string;
  season: Season;
  open: boolean;
  onToggle: () => void;
  onOpenWebsite?: () => void;
}> = ({ animeTitle, season, open, onToggle, onOpenWebsite }) => {
  const seasonTitle = getSeasonDisplayTitle(animeTitle, season);
  const dateParts = [formatDateWithWeek(season.startDate), formatDateWithWeek(season.endDate)].filter(Boolean);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onToggle();
      }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        gap: 14,
        background: 'rgba(255,255,255,0.58)',
        border: '1px solid rgba(255,255,255,0.62)',
        borderRadius: 24,
        padding: 14,
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: '0 10px 30px rgba(15,23,42,0.06)',
        boxSizing: 'border-box',
        minWidth: 0,
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      <div style={{ width: 76, height: 96, borderRadius: 18, overflow: 'hidden', flexShrink: 0, background: 'rgba(15,23,42,0.06)' }}>
        {season.posterUrl ? (
          <img src={season.posterUrl} alt={seasonTitle} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', fontSize: 28, opacity: 0.22 }}>📺</div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
        <div style={{ fontSize: 17, fontWeight: 950, color: theme.colors.textMain, lineHeight: 1.25, wordBreak: 'break-word' }}>
          {seasonTitle}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <StatusPill status={season.status} />
          {season.websiteUrl?.trim() && onOpenWebsite ? (
            <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', marginTop: 6 }}>
              <DetailLinkIconButton onClick={onOpenWebsite} title="公式サイトを開く" />
            </span>
          ) : null}
          {dateParts.length > 0 ? (
            <span style={{ fontSize: 12, fontWeight: 850, color: theme.colors.textSecondary, lineHeight: 1.4 }}>
              {dateParts.join(' 〜 ')}
            </span>
          ) : null}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, paddingLeft: 4 }}>
        <CollapseChevron open={open} />
      </div>
    </div>
  );
};

export const SeasonDetailContent: React.FC<{
  animeTitle: string;
  season: Season;
}> = ({ animeTitle, season }) => {
  const seasonGenres = asArray(season.genres);
  const seasonOpeningSongs = asArray(season.openingSongs);
  const seasonEndingSongs = asArray(season.endingSongs);
  const seasonEpisodes = asArray(season.episodes);

  return (
    <div style={{ marginTop: 18, display: 'grid', gap: 18, padding: '0 4px 8px', minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
      <div style={infoGridStyle}>
        <InfoItem label="放送開始日">{formatDateWithWeek(season.startDate) || null}</InfoItem>
        <InfoItem label="放送終了日">{formatDateWithWeek(season.endDate) || null}</InfoItem>
        <InfoItem label="アニメーション制作">{season.studio || null}</InfoItem>
        <InfoItem label="監督">{season.director || null}</InfoItem>
        <InfoItem label="評価">{season.rating !== undefined ? `★ ${season.rating.toFixed(1)} / 5` : null}</InfoItem>
        <InfoItem label="集数">{season.totalEpisodes !== undefined && season.totalEpisodes > 0 ? `全${season.totalEpisodes}話` : null}</InfoItem>
        <InfoItem label="毎週更新">{getBroadcastText(season.startDate, season.broadcastWeekday) || null}</InfoItem>
      </div>

      {seasonGenres.length > 0 && (
        <div>
          <Label>ジャンル</Label>
          <div style={{ marginTop: 8 }}>
            <GenreChips genres={seasonGenres} />
          </div>
        </div>
      )}

      {seasonOpeningSongs.length > 0 && (
        <div>
          <Label>オープニング曲</Label>
          <div style={{ marginTop: 8 }}>
            <SongList songs={seasonOpeningSongs} />
          </div>
        </div>
      )}

      {seasonEndingSongs.length > 0 && (
        <div>
          <Label>エンディング曲</Label>
          <div style={{ marginTop: 8 }}>
            <SongList songs={seasonEndingSongs} />
          </div>
        </div>
      )}

      {season.summary && (
        <div>
          <Label>あらすじ</Label>
          <Value placeholder="" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, fontWeight: 600 }}>
            {season.summary}
          </Value>
        </div>
      )}

      {season.review && (
        <div>
          <Label>感想</Label>
          <Value placeholder="" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, fontWeight: 600 }}>
            {season.review}
          </Value>
        </div>
      )}

      {seasonEpisodes.length > 0 && (
        <div>
          <Label>エピソード</Label>
          <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
            {seasonEpisodes.map((ep) => (
              <div
                key={ep.id}
                style={{
                  borderRadius: 18,
                  border: '1px solid rgba(0,0,0,0.06)',
                  background: 'rgba(255,255,255,0.62)',
                  padding: '12px 14px'
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 900, color: theme.colors.textMain }}>
                  第{ep.episodeNumber}話{ep.title ? ` ${ep.title}` : ''}
                </div>
                {ep.summary && (
                  <div style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, fontWeight: 700 }}>
                    {ep.summary}
                  </div>
                )}
                {ep.watchedDate && (
                  <div style={{ fontSize: 11, color: theme.colors.primary, marginTop: 4, fontWeight: 800 }}>
                    視聴日: {formatDateWithWeek(ep.watchedDate)}
                  </div>
                )}
                {ep.review && (
                  <div style={{ fontSize: 12, color: theme.colors.text, marginTop: 6, fontWeight: 600, lineHeight: 1.55 }}>
                    {ep.review}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const AnimeSeasonCard: React.FC<{
  animeTitle: string;
  season: Season;
  seasonIdx: number;
  onUpdateSeason: (collapsed: boolean) => void;
}> = ({ animeTitle, season, seasonIdx, onUpdateSeason }) => {
  return (
    <GlassCard key={season.id} padding="12px" style={{ marginBottom: 14, minWidth: 0, maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
      <SeasonSummaryCard
        animeTitle={animeTitle}
        season={season}
        open={season.collapsed === false}
        onToggle={() => onUpdateSeason(season.collapsed === false ? true : false)}
        onOpenWebsite={season.websiteUrl?.trim() ? () => openExternalUrl(season.websiteUrl) : undefined}
      />

      {season.collapsed === false && <SeasonDetailContent animeTitle={animeTitle} season={season} />}
    </GlassCard>
  );
};
