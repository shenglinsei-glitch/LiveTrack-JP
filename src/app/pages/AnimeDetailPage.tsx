import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Anime, Season, Episode, OriginalType, OpeningSong, EndingSong, AnimeStatus, AnimeBroadcastWeekday } from '@/domain/types';
import { theme } from '@/components/common/theme';
import { Icons, IconButton } from '@/components/common/IconButton';
import { GlassCard } from '@/components/common/GlassCard';
import { Label, Value, SectionTitle } from '@/components/detail/DetailText';
import { DetailHeader, DetailChip, DetailLinkIconButton } from '@/components/detail/DetailHeader';
import { DetailPageLayout } from '@/components/detail/DetailPageLayout';

interface AnimeDetailPageProps {
  anime: Anime;
  onUpdateAnime: (anime: Anime) => void;
  onDeleteAnime: (id: string) => void;
  onBack: () => void;
  initialEditMode?: boolean;
  availableGenres?: string[];
}

const ORIGINAL_TYPES: OriginalType[] = ['漫画', '小説', 'オリジナル', 'その他'];
const ANIME_STATUSES: AnimeStatus[] = ['放送前', '視聴予定', '視聴中', '保留', '視聴済み', '視聴中止', '見送り'];
const BROADCAST_WEEKDAYS: AnimeBroadcastWeekday[] = ['', '日', '月', '火', '水', '木', '金', '土'];
const getAnimeStatusColor = (status?: string) => {
  switch (status) {
    case '放送前': return theme.colors.status['発売前'];
    case '視聴予定': return theme.colors.status['参戦予定'];
    case '視聴中': return theme.colors.primary;
    case '視聴済み': return theme.colors.status['参戦済み'];
    case '保留': return theme.colors.status['検討中'];
    case '視聴中止': return theme.colors.textWeak;
    case '見送り': return theme.colors.status['見送'];
    default: return theme.colors.textWeak;
  }
};

const week = ['日', '月', '火', '水', '木', '金', '土'];
const formatDateWithWeek = (date?: string) => {
  if (!date) return '';
  const d = dayjs(date);
  if (!d.isValid()) return '';
  return `${d.format('YYYY/MM/DD')}（${week[d.day()]}）`;
};

const openExternalUrl = (url?: string) => {
  const value = url?.trim();
  if (!value) return;
  window.open(value.startsWith('http') ? value : `https://${value}`, '_blank', 'noopener,noreferrer');
};


const ANIME_STATUS_PRIORITY: AnimeStatus[] = ['視聴中', '視聴予定', '放送前', '保留', '視聴済み', '視聴中止', '見送り'];

const deriveAnimeStatus = (anime: Pick<Anime, 'status' | 'seasons'>): AnimeStatus => {
  const statuses = asArray(anime.seasons).map((s) => s.status).filter(Boolean) as AnimeStatus[];
  if (!statuses.length) return anime.status || '放送前';
  return ANIME_STATUS_PRIORITY.find((status) => statuses.includes(status)) || anime.status || '放送前';
};

const getNextDayWeekday = (date?: string): AnimeBroadcastWeekday => {
  if (!date) return '';
  const d = dayjs(date);
  if (!d.isValid()) return '';
  return week[(d.add(1, 'day').day())] as AnimeBroadcastWeekday;
};

const getBroadcastText = (startDate?: string, broadcastWeekday?: AnimeBroadcastWeekday) => {
  const weekday = getNextDayWeekday(startDate) || broadcastWeekday;
  if (!weekday) return '';
  return `毎週${weekday}曜`;
};

const looksLikeSeasonNumber = (value?: string) => /^第.+[シリーズ]$|^Season\s*\d+$/i.test(String(value || '').trim());

const getSeasonNumber = (season?: Season) => {
  if (!season) return '';
  if (season.seasonNumber?.trim()) return season.seasonNumber.trim();
  if (looksLikeSeasonNumber(season.seasonTitle)) return season.seasonTitle.trim();
  return '';
};

const getEffectiveSeasonTitle = (animeTitle: string, season?: Season) => {
  if (!season) return animeTitle;
  if (season.useAnimeTitle || !season.seasonTitle?.trim() || looksLikeSeasonNumber(season.seasonTitle)) return animeTitle;
  return season.seasonTitle.trim();
};

const getSeasonDisplayTitle = (animeTitle: string, season?: Season) => {
  const number = getSeasonNumber(season);
  const title = getEffectiveSeasonTitle(animeTitle, season);
  return number ? `${number} ${title}` : title;
};

const getCurrentWatchingSeason = (anime: Anime) => {
  return asArray(anime.seasons).find((season) => season.status === '視聴中');
};

const getLatestSeasonPosterUrl = (anime: Pick<Anime, 'posterUrl' | 'seasons'>) => {
  const seasons = [...asArray(anime.seasons)];
  for (let i = seasons.length - 1; i >= 0; i--) {
    const url = seasons[i]?.posterUrl?.trim();
    if (url) return url;
  }
  return anime.posterUrl || '';
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  minHeight: 54,
  borderRadius: 18,
  border: '1px solid rgba(15,23,42,0.08)',
  background: 'rgba(255,255,255,0.85)',
  padding: '0 16px',
  fontSize: 15,
  color: theme.colors.text,
  outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  paddingRight: 44,
  appearance: 'auto',
  WebkitAppearance: 'menulist',
};

const CollapseChevron: React.FC<{ open: boolean }> = ({ open }) => (
  <Icons.ChevronLeft
    style={{
      width: 18,
      height: 18,
      color: theme.colors.textWeak,
      transform: open ? 'rotate(-90deg)' : 'rotate(180deg)',
      transition: 'transform 0.2s ease',
    }}
  />
);

const Input: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string; readOnly?: boolean; type?: string }> = ({ value, onChange, placeholder, readOnly, type = 'text' }) => (
  <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly} type={type} style={inputStyle} />
);

const TextArea: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string; readOnly?: boolean; rows?: number }> = ({ value, onChange, placeholder, readOnly, rows = 4 }) => (
  <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly} rows={rows} style={{ ...inputStyle, padding: '16px', resize: 'vertical', fontFamily: 'inherit' }} />
);




const nativeDateInputStyle: React.CSSProperties = {
  ...inputStyle,
  colorScheme: 'light',
  WebkitAppearance: 'none',
  appearance: 'none',
};

const DateField: React.FC<{ value?: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder = '未設定' }) => (
  <input type="date" value={(value || '').slice(0, 10)} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={nativeDateInputStyle} />
);

const sectionCardStyle: React.CSSProperties = {
  marginBottom: 14,
  minWidth: 0,
  maxWidth: '100%',
  boxSizing: 'border-box',
  overflow: 'hidden',
};


const collapseButtonStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  textAlign: 'left',
};

const infoGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))',
  gap: 16,
  minWidth: 0,
  maxWidth: '100%',
};

const infoItemStyle: React.CSSProperties = {
  minWidth: 0,
  wordBreak: 'break-word',
};

const chipWrapStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
};

const ViewSection: React.FC<{
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  countLabel?: string;
}> = ({ title, defaultOpen = false, children, countLabel }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <GlassCard padding="20px" style={sectionCardStyle}>
      <button type="button" onClick={() => setOpen((v) => !v)} style={collapseButtonStyle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <SectionTitle title={title} style={{ marginTop: 0, marginBottom: open ? 12 : 0 }} dividerStyle={{ opacity: open ? 1 : 0 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 2 }}>
          {countLabel ? (
            <span style={{ fontSize: 11, fontWeight: 800, color: theme.colors.textWeak, whiteSpace: 'nowrap' }}>{countLabel}</span>
          ) : null}
          <Icons.ChevronLeft style={{ width: 18, height: 18, color: theme.colors.textWeak, transform: open ? 'rotate(-90deg)' : 'rotate(180deg)', transition: 'transform 0.2s ease' }} />
        </div>
      </button>
      {open ? children : null}
    </GlassCard>
  );
};

const InfoItem: React.FC<{ label: string; children?: React.ReactNode }> = ({ label, children }) => {
  if (children === null || children === undefined || children === '') return null;
  return (
    <div style={infoItemStyle}>
      <Label>{label}</Label>
      <Value placeholder="">{children}</Value>
    </div>
  );
};

const StatusPill: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) return null;
  const color = getAnimeStatusColor(status);
  return (
    <span style={{ display: 'inline-flex', marginTop: 6, background: `${color}22`, color, padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 900 }}>
      {status}
    </span>
  );
};

const GenreChips: React.FC<{ genres?: string[] }> = ({ genres }) => {
  const values = asArray(genres).filter(Boolean);
  if (!values.length) return null;
  return (
    <div style={chipWrapStyle}>
      {values.map((genre, idx) => (
        <span key={`${genre}-${idx}`} style={{ background: 'rgba(83,190,232,0.15)', color: theme.colors.primary, padding: '6px 12px', borderRadius: 12, fontSize: 13, fontWeight: 800 }}>
          {genre}
        </span>
      ))}
    </div>
  );
};

const SongList: React.FC<{ songs?: Array<OpeningSong | EndingSong> }> = ({ songs }) => {
  const values = asArray(songs);
  if (!values.length) return null;
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {values.map((song, idx) => (
        <div key={`${song.songTitle}-${idx}`} style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(255,255,255,0.62)', borderRadius: 16, padding: '10px 12px', border: '1px solid rgba(15,23,42,0.05)' }}>
          {song.coverUrl ? <img src={song.coverUrl} alt={song.songTitle} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} /> : null}
          <div style={{ flex: '1 1 0', minWidth: 0, maxWidth: '100%' }}>
            <Value placeholder="">{song.songTitle || null}</Value>
            <div style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 2, fontWeight: 700 }}>{song.artistName || ''}</div>
            {song.musicUrl ? <a href={song.musicUrl.startsWith('http') ? song.musicUrl : `https://${song.musicUrl}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: theme.colors.primary, fontWeight: 800 }}>リンクを開く</a> : null}
          </div>
        </div>
      ))}
    </div>
  );
};

const SeasonSummaryCard: React.FC<{
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
        <div style={{ fontSize: 17, fontWeight: 950, color: theme.colors.textMain, lineHeight: 1.25, wordBreak: 'break-word' }}>{seasonTitle}</div>
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

const StaticField: React.FC<{ label: string; value?: string; placeholder?: string }> = ({ label, value, placeholder = '未設定' }) => (
  <div style={{ marginBottom: 14 }}>
    <Label>{label}</Label>
    <Value>{value || placeholder}</Value>
  </div>
);


const asArray = <T,>(value: T[] | undefined | null): T[] => Array.isArray(value) ? value : [];

const normalizeAnimeDraft = (value: Anime): Anime => ({
  ...value,
  openingSongs: asArray(value.openingSongs),
  endingSongs: asArray(value.endingSongs),
  genres: asArray(value.genres),
  seasons: asArray(value.seasons).map((season, idx) => ({
    ...season,
    id: String(season.id || `season-${idx}-${Date.now()}`),
    seasonTitle: season.seasonTitle || '',
    openingSongs: asArray(season.openingSongs),
    endingSongs: asArray(season.endingSongs),
    genres: asArray(season.genres),
    episodes: asArray(season.episodes),
  })),
});

const responsiveTwoColumnStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 10,
  marginBottom: 14,
};

export const AnimeDetailPage: React.FC<AnimeDetailPageProps> = ({ anime, onUpdateAnime, onDeleteAnime, onBack, initialEditMode = false, availableGenres = [] }) => {
  const [isEditMode, setIsEditMode] = useState(initialEditMode);
  const [draft, setDraft] = useState<Anime>(() => normalizeAnimeDraft(anime));

  const isDraftDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(anime), [draft, anime]);

  useEffect(() => {
    setDraft(normalizeAnimeDraft(anime));
  }, [anime]);

  const handleSave = () => {
    const updated: Anime = {
      ...draft,
      posterUrl: draft.posterUrl?.trim() || '',
      genres: Array.from(new Set((draft.genres || []).map((g) => g.trim()).filter(Boolean))),
      status: deriveAnimeStatus(draft),
      updatedAt: new Date().toISOString(),
    };
    onUpdateAnime(updated);
    setIsEditMode(false);
  };

  const discardEdit = () => {
    setDraft(normalizeAnimeDraft(anime));
    setIsEditMode(false);
  };

  const handleCancel = () => {
    if (isDraftDirty && !window.confirm('保存していない変更があります。破棄しますか？')) return;
    discardEdit();
  };

  const handleEditBack = () => {
    if (isDraftDirty && !window.confirm('保存していない変更があります。破棄して戻りますか？')) return;
    discardEdit();
  };

  const handleDelete = () => {
    if (window.confirm(`「${anime.title}」を削除しますか？`)) {
      onDeleteAnime(anime.id);
      onBack();
    }
  };

  const updateDraft = (updates: Partial<Anime>) => {
    setDraft(prev => ({ ...prev, ...updates }));
  };

  const updateSeason = (seasonIndex: number, updates: Partial<Season>) => {
    const newSeasons = [...asArray(draft.seasons)];
    newSeasons[seasonIndex] = { ...newSeasons[seasonIndex], ...updates };
    updateDraft({ seasons: newSeasons });
  };

  const addSeason = () => {
    const newSeason: Season = {
      id: Math.random().toString(36).substr(2, 9),
      seasonNumber: `第${asArray(draft.seasons).length + 1}シリーズ`,
      seasonTitle: '',
      posterUrl: '',
      startDate: '',
      endDate: '',
      studio: '',
      director: '',
      originalType: draft.originalType,
      originalTitle: draft.originalTitle,
      openingSongs: [],
      endingSongs: [],
      genres: [],
      totalEpisodes: undefined,
      broadcastWeekday: '',
      broadcastTime: '',
      summary: '',
      rating: undefined,
      review: '',
      episodes: [],
      collapsed: false,
      status: asArray(draft.seasons).length === 0 ? (draft.status || '放送前') : '放送前',
      useAnimeTitle: true,
    };
    updateDraft({ seasons: [...asArray(draft.seasons), newSeason] });
  };

  const removeSeason = (seasonIndex: number) => {
    if (window.confirm('このシーズンを削除しますか？')) {
      updateDraft({ seasons: asArray(draft.seasons).filter((_, i) => i !== seasonIndex) });
    }
  };

  const toggleSeasonCollapse = (seasonIndex: number) => {
    updateSeason(seasonIndex, { collapsed: !asArray(draft.seasons)[seasonIndex]?.collapsed });
  };

  const addEpisode = (seasonIndex: number) => {
    const season = asArray(draft.seasons)[seasonIndex];
    if (!season) return;
    const episodes = asArray(season.episodes);
    const newEpisode: Episode = {
      id: Math.random().toString(36).substr(2, 9),
      episodeNumber: episodes.length + 1,
      title: '',
      summary: '',
      review: '',
      watchedDate: '',
    };
    const newEpisodes = [...episodes, newEpisode];
    updateSeason(seasonIndex, { episodes: newEpisodes });
  };

  const updateEpisode = (seasonIndex: number, episodeIndex: number, updates: Partial<Episode>) => {
    const season = asArray(draft.seasons)[seasonIndex];
    if (!season) return;
    const newEpisodes = [...asArray(season.episodes)];
    newEpisodes[episodeIndex] = { ...newEpisodes[episodeIndex], ...updates };
    updateSeason(seasonIndex, { episodes: newEpisodes });
  };

  const removeEpisode = (seasonIndex: number, episodeIndex: number) => {
    const season = asArray(draft.seasons)[seasonIndex];
    if (!season) return;
    updateSeason(seasonIndex, { episodes: asArray(season.episodes).filter((_, i) => i !== episodeIndex) });
  };

  const addOpeningSong = (seasonIndex?: number) => {
    if (seasonIndex !== undefined) {
      const season = asArray(draft.seasons)[seasonIndex];
      if (!season) return;
      updateSeason(seasonIndex, { openingSongs: [...(season.openingSongs || []), { songTitle: '', artistName: '', coverUrl: '', musicUrl: '' }] });
    } else {
      updateDraft({ openingSongs: [...(draft.openingSongs || []), { songTitle: '', artistName: '', coverUrl: '', musicUrl: '' }] });
    }
  };

  const updateOpeningSong = (songIndex: number, updates: Partial<OpeningSong>, seasonIndex?: number) => {
    if (seasonIndex !== undefined) {
      const season = asArray(draft.seasons)[seasonIndex];
      if (!season) return;
      const newSongs = [...asArray(season.openingSongs)];
      newSongs[songIndex] = { ...newSongs[songIndex], ...updates };
      updateSeason(seasonIndex, { openingSongs: newSongs });
    } else {
      const newSongs = [...(draft.openingSongs || [])];
      newSongs[songIndex] = { ...newSongs[songIndex], ...updates };
      updateDraft({ openingSongs: newSongs });
    }
  };

  const removeOpeningSong = (songIndex: number, seasonIndex?: number) => {
    if (seasonIndex !== undefined) {
      const season = asArray(draft.seasons)[seasonIndex];
      if (!season) return;
      updateSeason(seasonIndex, { openingSongs: (season.openingSongs || []).filter((_, i) => i !== songIndex) });
    } else {
      updateDraft({ openingSongs: (draft.openingSongs || []).filter((_, i) => i !== songIndex) });
    }
  };

  const addEndingSong = (seasonIndex?: number) => {
    if (seasonIndex !== undefined) {
      const season = asArray(draft.seasons)[seasonIndex];
      if (!season) return;
      updateSeason(seasonIndex, { endingSongs: [...(season.endingSongs || []), { songTitle: '', artistName: '', coverUrl: '', musicUrl: '' }] });
    } else {
      updateDraft({ endingSongs: [...(draft.endingSongs || []), { songTitle: '', artistName: '', coverUrl: '', musicUrl: '' }] });
    }
  };

  const updateEndingSong = (songIndex: number, updates: Partial<EndingSong>, seasonIndex?: number) => {
    if (seasonIndex !== undefined) {
      const season = asArray(draft.seasons)[seasonIndex];
      if (!season) return;
      const newSongs = [...asArray(season.endingSongs)];
      newSongs[songIndex] = { ...newSongs[songIndex], ...updates };
      updateSeason(seasonIndex, { endingSongs: newSongs });
    } else {
      const newSongs = [...(draft.endingSongs || [])];
      newSongs[songIndex] = { ...newSongs[songIndex], ...updates };
      updateDraft({ endingSongs: newSongs });
    }
  };

  const removeEndingSong = (songIndex: number, seasonIndex?: number) => {
    if (seasonIndex !== undefined) {
      const season = asArray(draft.seasons)[seasonIndex];
      if (!season) return;
      updateSeason(seasonIndex, { endingSongs: (season.endingSongs || []).filter((_, i) => i !== songIndex) });
    } else {
      updateDraft({ endingSongs: (draft.endingSongs || []).filter((_, i) => i !== songIndex) });
    }
  };

  const addGenre = (seasonIndex?: number) => {
    if (seasonIndex !== undefined) {
      const season = asArray(draft.seasons)[seasonIndex];
      if (!season) return;
      updateSeason(seasonIndex, { genres: [...(season.genres || []), ''] });
    } else {
      updateDraft({ genres: [...(draft.genres || []), ''] });
    }
  };

  const updateGenre = (genreIndex: number, value: string, seasonIndex?: number) => {
    if (seasonIndex !== undefined) {
      const season = asArray(draft.seasons)[seasonIndex];
      if (!season) return;
      const newGenres = [...asArray(season.genres)];
      newGenres[genreIndex] = value;
      updateSeason(seasonIndex, { genres: newGenres });
    } else {
      const newGenres = [...(draft.genres || [])];
      newGenres[genreIndex] = value;
      updateDraft({ genres: newGenres });
    }
  };

  const removeGenre = (genreIndex: number, seasonIndex?: number) => {
    if (seasonIndex !== undefined) {
      const season = asArray(draft.seasons)[seasonIndex];
      if (!season) return;
      updateSeason(seasonIndex, { genres: (season.genres || []).filter((_, i) => i !== genreIndex) });
    } else {
      updateDraft({ genres: (draft.genres || []).filter((_, i) => i !== genreIndex) });
    }
  };

  const renderReadMode = () => {
    const animeStatus = deriveAnimeStatus(anime);
    const animeGenres = asArray(anime.genres);
    const animeOpeningSongs = asArray(anime.openingSongs);
    const animeEndingSongs = asArray(anime.endingSongs);
    const seasons = asArray(anime.seasons);

    return (
      <>
        <DetailHeader
          title={anime.title}
          posterUrl={anime.posterUrl}
          posterAlt={anime.title}
          posterFallback={<div style={{ fontSize: 48, opacity: 0.2 }}>📺</div>}
          onBack={onBack}
          actions={
            <>
              <IconButton icon={<Icons.Edit />} onClick={() => setIsEditMode(true)} style={{ background: 'rgba(255,255,255,0.82)', border: 'none', color: theme.colors.primary }} />
              <IconButton icon={<Icons.Trash />} onClick={handleDelete} style={{ background: 'rgba(255,255,255,0.82)', border: 'none', color: theme.colors.error }} />
            </>
          }
          tags={
            <>
              <DetailChip label={animeStatus} bg={getAnimeStatusColor(animeStatus)} />
              {anime.websiteUrl?.trim() ? (
                <DetailLinkIconButton onClick={() => openExternalUrl(anime.websiteUrl)} title="公式サイトを開く" />
              ) : null}
            </>
          }
        />

        <div style={{ padding: '0 0 140px', minWidth: 0, maxWidth: '100%' }}>
          <ViewSection title="基本情報">
            <div style={infoGridStyle}>
              <InfoItem label="放送開始日">{formatDateWithWeek(anime.startDate) || null}</InfoItem>
              <InfoItem label="放送終了日">{formatDateWithWeek(anime.endDate) || null}</InfoItem>
              <InfoItem label="制作会社">{anime.studio || null}</InfoItem>
              <InfoItem label="監督">{anime.director || null}</InfoItem>
              <InfoItem label="原作種別">{anime.originalType || null}</InfoItem>
              <InfoItem label="原作作者">{anime.originalTitle || null}</InfoItem>
              <InfoItem label="評価">{anime.rating !== undefined ? `★ ${anime.rating.toFixed(1)} / 5` : null}</InfoItem>
              <InfoItem label="集数">{anime.totalEpisodes !== undefined && anime.totalEpisodes > 0 ? `全${anime.totalEpisodes}話` : null}</InfoItem>
              <InfoItem label="毎週更新">{getBroadcastText(anime.startDate, anime.broadcastWeekday) || null}</InfoItem>
            </div>
          </ViewSection>

          {animeGenres.length > 0 && (
            <ViewSection title="ジャンル" countLabel={`${animeGenres.length}件`}>
              <GenreChips genres={animeGenres} />
            </ViewSection>
          )}

          {animeOpeningSongs.length > 0 && (
            <ViewSection title="オープニング曲" countLabel={`${animeOpeningSongs.length}曲`}>
              <SongList songs={animeOpeningSongs} />
            </ViewSection>
          )}

          {animeEndingSongs.length > 0 && (
            <ViewSection title="エンディング曲" countLabel={`${animeEndingSongs.length}曲`}>
              <SongList songs={animeEndingSongs} />
            </ViewSection>
          )}

          {anime.summary && (
            <ViewSection title="あらすじ">
              <Value placeholder="" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, fontWeight: 600 }}>{anime.summary}</Value>
            </ViewSection>
          )}

          {anime.review && (
            <ViewSection title="感想">
              <Value placeholder="" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, fontWeight: 600 }}>{anime.review}</Value>
            </ViewSection>
          )}

          {seasons.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <SectionTitle title="シーズン" style={{ marginBottom: 12 }} />
              {seasons.map((season, seasonIdx) => {
                const seasonGenres = asArray(season.genres);
                const seasonOpeningSongs = asArray(season.openingSongs);
                const seasonEndingSongs = asArray(season.endingSongs);
                const seasonEpisodes = asArray(season.episodes);
                const seasonTitle = getSeasonDisplayTitle(anime.title, season);

                return (
                  <GlassCard key={season.id} padding="12px" style={sectionCardStyle}>
                    <SeasonSummaryCard
                      animeTitle={anime.title}
                      season={season}
                      open={season.collapsed === false}
                      onToggle={() => {
                        const newSeasons = [...seasons];
                        const isOpen = season.collapsed === false;
                        newSeasons[seasonIdx] = { ...season, collapsed: isOpen ? true : false };
                        onUpdateAnime({ ...anime, seasons: newSeasons });
                      }}
                      onOpenWebsite={season.websiteUrl?.trim() ? () => openExternalUrl(season.websiteUrl) : undefined}
                    />

                    {season.collapsed === false && (
                      <div style={{ marginTop: 18, display: 'grid', gap: 18, padding: '0 4px 8px', minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                        <div style={infoGridStyle}>
                          <InfoItem label="放送開始日">{formatDateWithWeek(season.startDate) || null}</InfoItem>
                          <InfoItem label="放送終了日">{formatDateWithWeek(season.endDate) || null}</InfoItem>
                          <InfoItem label="制作会社">{season.studio || null}</InfoItem>
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
                            <Value placeholder="" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, fontWeight: 600 }}>{season.summary}</Value>
                          </div>
                        )}

                        {season.review && (
                          <div>
                            <Label>感想</Label>
                            <Value placeholder="" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, fontWeight: 600 }}>{season.review}</Value>
                          </div>
                        )}

                        {seasonEpisodes.length > 0 && (
                          <div>
                            <Label>エピソード</Label>
                            <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
                              {seasonEpisodes.map((ep) => (
                                <div key={ep.id} style={{ borderRadius: 18, border: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.62)', padding: '12px 14px' }}>
                                  <div style={{ fontSize: 14, fontWeight: 900, color: theme.colors.textMain }}>第{ep.episodeNumber}話{ep.title ? ` ${ep.title}` : ''}</div>
                                  {ep.summary && <div style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4, fontWeight: 700 }}>{ep.summary}</div>}
                                  {ep.watchedDate && <div style={{ fontSize: 11, color: theme.colors.primary, marginTop: 4, fontWeight: 800 }}>視聴日: {formatDateWithWeek(ep.watchedDate)}</div>}
                                  {ep.review && <div style={{ fontSize: 12, color: theme.colors.text, marginTop: 6, fontWeight: 600, lineHeight: 1.55 }}>{ep.review}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      </>
    );
  };

  const renderEditMode = () => (
    <>
      <DetailHeader
        title={draft.title}
        onTitleChange={(value) => updateDraft({ title: value })}
        titlePlaceholder="アニメタイトル"
        isEditMode={isEditMode}
        posterUrl={draft.posterUrl}
        posterAlt={draft.title}
        posterFallback={<div style={{ fontSize: 48, opacity: 0.2 }}>📺</div>}
        onBack={handleEditBack}
        actions={
          <>
            <IconButton icon={<Icons.Check />} onClick={handleSave} primary />
            <IconButton icon={<Icons.X />} onClick={handleCancel} style={{ background: 'rgba(255,255,255,0.82)', border: 'none', color: theme.colors.textSecondary }} />
          </>
        }
        tags={<DetailChip label={deriveAnimeStatus(draft)} bg={getAnimeStatusColor(deriveAnimeStatus(draft))} />}
      />

      <div style={{ padding: '0 0 140px', minWidth: 0, maxWidth: '100%' }}>
        <GlassCard style={sectionCardStyle}>
          <SectionTitle title="基本情報" />
          <div style={{ marginBottom: 14 }}>
            <Label>タイトル</Label>
            <Input value={draft.title} onChange={(v) => updateDraft({ title: v })} placeholder="タイトルを入力" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label>{asArray(draft.seasons).length > 0 ? '総ステータス（シーズンから自動）' : 'ステータス（手動）'}</Label>
            {asArray(draft.seasons).length > 0 ? (
              <>
                <span style={{ display: 'inline-flex', marginTop: 6, background: `${getAnimeStatusColor(deriveAnimeStatus(draft))}22`, color: getAnimeStatusColor(deriveAnimeStatus(draft)), padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 900 }}>{deriveAnimeStatus(draft)}</span>
                <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: theme.colors.textWeak }}>シーズンを追加しているため、総ステータスは各シーズンの状態から自動計算されます。</div>
              </>
            ) : (
              <select value={draft.status || '放送前'} onChange={(e) => updateDraft({ status: e.target.value as AnimeStatus })} style={selectStyle}>
                {ANIME_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            )}
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label>総ポスター画像URL</Label>
            <Input value={draft.posterUrl || ''} onChange={(v) => updateDraft({ posterUrl: v })} placeholder="https://..." />
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label>公式サイトURL</Label>
            <Input value={draft.websiteUrl || ''} onChange={(v) => updateDraft({ websiteUrl: v })} placeholder="https://..." />
          </div>
          {asArray(draft.seasons).some((season) => season.posterUrl?.trim()) && (
            <div style={{ marginBottom: 14 }}>
              <Label>シーズン海報から選択</Label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) updateDraft({ posterUrl: e.target.value });
                }}
                style={selectStyle}
              >
                <option value="">選択してください</option>
                {asArray(draft.seasons).map((season, idx) => {
                  const url = season.posterUrl?.trim();
                  if (!url) return null;
                  return (
                    <option key={season.id || idx} value={url}>
                      {getSeasonDisplayTitle(draft.title || 'アニメ', season)}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
          <div style={responsiveTwoColumnStyle}>
            <div>
              <Label>放送開始日</Label>
              <DateField value={draft.startDate || ''} onChange={(v) => updateDraft({ startDate: v, broadcastWeekday: getNextDayWeekday(v) })} />
            </div>
            <div>
              <Label>放送終了日</Label>
              <DateField value={draft.endDate || ''} onChange={(v) => updateDraft({ endDate: v })} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label>制作会社</Label>
            <Input value={draft.studio || ''} onChange={(v) => updateDraft({ studio: v })} placeholder="制作会社を入力" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label>監督</Label>
            <Input value={draft.director || ''} onChange={(v) => updateDraft({ director: v })} placeholder="監督名を入力" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label>原作種別</Label>
            <select value={draft.originalType || ''} onChange={(e) => updateDraft({ originalType: e.target.value as OriginalType || undefined })} style={selectStyle}>
              <option value="">未選択</option>
              {ORIGINAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label>原作作者</Label>
            <Input value={draft.originalTitle || ''} onChange={(v) => updateDraft({ originalTitle: v })} placeholder="原作作者を入力" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label>評価（0.0〜5.0）</Label>
            <Input type="number" value={draft.rating?.toString() || ''} onChange={(v) => updateDraft({ rating: v ? parseFloat(v) : undefined })} placeholder="0.0" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label>集数</Label>
            <Input type="number" value={draft.totalEpisodes?.toString() || ''} onChange={(v) => updateDraft({ totalEpisodes: v ? Number(v) : undefined })} placeholder="全話数" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label>毎週更新曜日（放送開始日の翌日で自動計算）</Label>
            <select value={draft.broadcastWeekday || ''} onChange={(e) => updateDraft({ broadcastWeekday: e.target.value as AnimeBroadcastWeekday })} style={selectStyle}>
              {BROADCAST_WEEKDAYS.map((d) => <option key={d || 'none'} value={d}>{d ? `${d}曜` : '未設定'}</option>)}
            </select>
          </div>
        </GlassCard>

        <GlassCard style={sectionCardStyle}>
          <SectionTitle title="ジャンル" />
          {availableGenres.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {availableGenres.filter((g) => !(draft.genres || []).includes(g)).slice(0, 12).map((genre) => (
                <button key={genre} type="button" onClick={() => updateDraft({ genres: [...(draft.genres || []), genre] })} style={{ border: 'none', background: 'rgba(83,190,232,0.12)', color: theme.colors.primary, padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>+ {genre}</button>
              ))}
            </div>
          )}
          {(draft.genres || []).map((genre, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Input value={genre} onChange={(v) => updateGenre(idx, v)} placeholder="ジャンルを入力" />
              <IconButton icon={<Icons.Trash />} onClick={() => removeGenre(idx)} />
            </div>
          ))}
          {/* Genre add button temporarily removed */}
        </GlassCard>

        <GlassCard style={sectionCardStyle}>
          <SectionTitle title="オープニング曲" />
          {(draft.openingSongs || []).map((song, idx) => (
            <div key={idx} style={{ marginBottom: 12, padding: 12, background: 'rgba(0,0,0,0.02)', borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Label>OP {idx + 1}</Label>
                <IconButton icon={<Icons.Trash />} onClick={() => removeOpeningSong(idx)} />
              </div>
              <div style={{ marginBottom: 8 }}>
                <Input value={song.songTitle} onChange={(v) => updateOpeningSong(idx, { songTitle: v })} placeholder="曲名" />
              </div>
              <Input value={song.artistName} onChange={(v) => updateOpeningSong(idx, { artistName: v })} placeholder="アーティスト名" />
              <div style={{ marginTop: 8 }}><Input value={song.coverUrl || ''} onChange={(v) => updateOpeningSong(idx, { coverUrl: v })} placeholder="ジャケット画像URL" /></div>
              <div style={{ marginTop: 8 }}><Input value={song.musicUrl || ''} onChange={(v) => updateOpeningSong(idx, { musicUrl: v })} placeholder="楽曲リンクURL" /></div>
            </div>
          ))}
          <button onClick={() => addOpeningSong()} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px dashed rgba(15,23,42,0.2)', background: 'transparent', color: theme.colors.primary, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+ OP曲を追加</button>
        </GlassCard>

        <GlassCard style={sectionCardStyle}>
          <SectionTitle title="エンディング曲" />
          {(draft.endingSongs || []).map((song, idx) => (
            <div key={idx} style={{ marginBottom: 12, padding: 12, background: 'rgba(0,0,0,0.02)', borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Label>ED {idx + 1}</Label>
                <IconButton icon={<Icons.Trash />} onClick={() => removeEndingSong(idx)} />
              </div>
              <div style={{ marginBottom: 8 }}>
                <Input value={song.songTitle} onChange={(v) => updateEndingSong(idx, { songTitle: v })} placeholder="曲名" />
              </div>
              <Input value={song.artistName} onChange={(v) => updateEndingSong(idx, { artistName: v })} placeholder="アーティスト名" />
              <div style={{ marginTop: 8 }}><Input value={song.coverUrl || ''} onChange={(v) => updateEndingSong(idx, { coverUrl: v })} placeholder="ジャケット画像URL" /></div>
              <div style={{ marginTop: 8 }}><Input value={song.musicUrl || ''} onChange={(v) => updateEndingSong(idx, { musicUrl: v })} placeholder="楽曲リンクURL" /></div>
            </div>
          ))}
          <button onClick={() => addEndingSong()} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px dashed rgba(15,23,42,0.2)', background: 'transparent', color: theme.colors.primary, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+ ED曲を追加</button>
        </GlassCard>

        <GlassCard style={sectionCardStyle}>
          <SectionTitle title="あらすじ" />
          <TextArea value={draft.summary || ''} onChange={(v) => updateDraft({ summary: v })} placeholder="あらすじを入力" />
        </GlassCard>

        <GlassCard style={sectionCardStyle}>
          <SectionTitle title="感想" />
          <TextArea value={draft.review || ''} onChange={(v) => updateDraft({ review: v })} placeholder="感想を入力" rows={6} />
        </GlassCard>

        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <SectionTitle title="シーズン" />
            <button onClick={addSeason} style={{ padding: '8px 16px', borderRadius: 12, border: 'none', background: theme.colors.primary, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ シーズン追加</button>
          </div>
          {asArray(draft.seasons).map((season, seasonIdx) => (
            <GlassCard key={season.id} style={{ marginBottom: 12, minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(72px, 0.34fr) minmax(0, 1fr)', gap: 8 }}>
                    <Input value={season.seasonNumber || getSeasonNumber(season) || ''} onChange={(v) => updateSeason(seasonIdx, { seasonNumber: v })} placeholder={`第${seasonIdx + 1}シリーズ`} />
                    <Input value={season.useAnimeTitle ? draft.title : looksLikeSeasonNumber(season.seasonTitle) ? '' : season.seasonTitle} onChange={(v) => updateSeason(seasonIdx, { seasonTitle: v, useAnimeTitle: false })} placeholder={season.useAnimeTitle ? draft.title : 'シーズンタイトル'} readOnly={!!season.useAnimeTitle} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, fontWeight: 800, color: theme.colors.textSecondary }}>
                    <input type="checkbox" checked={!!season.useAnimeTitle} onChange={(e) => updateSeason(seasonIdx, { useAnimeTitle: e.target.checked, seasonTitle: e.target.checked ? '' : looksLikeSeasonNumber(season.seasonTitle) ? '' : season.seasonTitle })} />
                    アニメタイトルと同じ
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 8, marginLeft: 8, flexShrink: 0 }}>
                  <button onClick={() => toggleSeasonCollapse(seasonIdx)} style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
                    <CollapseChevron open={!season.collapsed} />
                  </button>
                  <IconButton icon={<Icons.Trash />} onClick={() => removeSeason(seasonIdx)} />
                </div>
              </div>
              {season.collapsed === false && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <Label>ステータス</Label>
                    <select value={season.status || '放送前'} onChange={(e) => updateSeason(seasonIdx, { status: e.target.value as AnimeStatus })} style={selectStyle}>
                      {ANIME_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <Label>ポスター画像URL</Label>
                    <Input value={season.posterUrl || ''} onChange={(v) => updateSeason(seasonIdx, { posterUrl: v })} placeholder="https://..." />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <Label>公式サイトURL</Label>
                    <Input value={season.websiteUrl || ''} onChange={(v) => updateSeason(seasonIdx, { websiteUrl: v })} placeholder="https://..." />
                  </div>
                  <div style={responsiveTwoColumnStyle}>
                    <div>
                      <Label>放送開始日</Label>
                      <DateField value={season.startDate || ''} onChange={(v) => updateSeason(seasonIdx, { startDate: v, broadcastWeekday: getNextDayWeekday(v) })} />
                    </div>
                    <div>
                      <Label>放送終了日</Label>
                      <DateField value={season.endDate || ''} onChange={(v) => updateSeason(seasonIdx, { endDate: v })} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <Label>制作会社</Label>
                    <Input value={season.studio || ''} onChange={(v) => updateSeason(seasonIdx, { studio: v })} placeholder="制作会社" />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <Label>監督</Label>
                    <Input value={season.director || ''} onChange={(v) => updateSeason(seasonIdx, { director: v })} placeholder="監督名" />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <Label>評価</Label>
                    <Input type="number" value={season.rating?.toString() || ''} onChange={(v) => updateSeason(seasonIdx, { rating: v ? parseFloat(v) : undefined })} placeholder="0.0" />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <Label>集数</Label>
                    <Input type="number" value={season.totalEpisodes?.toString() || ''} onChange={(v) => updateSeason(seasonIdx, { totalEpisodes: v ? Number(v) : undefined })} placeholder="全話数" />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <Label>毎週更新曜日</Label>
                    <select value={season.broadcastWeekday || ''} onChange={(e) => updateSeason(seasonIdx, { broadcastWeekday: e.target.value as AnimeBroadcastWeekday })} style={selectStyle}>
                      {BROADCAST_WEEKDAYS.map((d) => <option key={d || 'none'} value={d}>{d ? `${d}曜` : '未設定'}</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <Label>ジャンル</Label>
                    {availableGenres.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        {availableGenres.filter((g) => !(season.genres || []).includes(g)).slice(0, 10).map((genre) => (
                          <button key={genre} type="button" onClick={() => updateSeason(seasonIdx, { genres: [...(season.genres || []), genre] })} style={{ border: 'none', background: 'rgba(83,190,232,0.10)', color: theme.colors.primary, padding: '5px 9px', borderRadius: 999, fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>+ {genre}</button>
                        ))}
                      </div>
                    )}
                    {(season.genres || []).map((genre, gIdx) => (
                      <div key={gIdx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <Input value={genre} onChange={(v) => updateGenre(gIdx, v, seasonIdx)} placeholder="ジャンル" />
                        <IconButton icon={<Icons.Trash />} onClick={() => removeGenre(gIdx, seasonIdx)} />
                      </div>
                    ))}
                    <button onClick={() => addGenre(seasonIdx)} style={{ width: '100%', padding: 8, borderRadius: 10, border: '1px dashed rgba(15,23,42,0.15)', background: 'transparent', color: theme.colors.primary, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ ジャンル追加</button>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <Label>オープニング曲</Label>
                    {(season.openingSongs || []).map((song, sIdx) => (
                      <div key={sIdx} style={{ marginBottom: 8, padding: 10, background: 'rgba(0,0,0,0.02)', borderRadius: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>OP {sIdx + 1}</span>
                          <IconButton icon={<Icons.Trash />} onClick={() => removeOpeningSong(sIdx, seasonIdx)} />
                        </div>
                        <div style={{ marginBottom: 6 }}>
                          <Input value={song.songTitle} onChange={(v) => updateOpeningSong(sIdx, { songTitle: v }, seasonIdx)} placeholder="曲名" />
                        </div>
                        <Input value={song.artistName} onChange={(v) => updateOpeningSong(sIdx, { artistName: v }, seasonIdx)} placeholder="アーティスト名" />
                        <div style={{ marginTop: 6 }}><Input value={song.coverUrl || ''} onChange={(v) => updateOpeningSong(sIdx, { coverUrl: v }, seasonIdx)} placeholder="ジャケット画像URL" /></div>
                        <div style={{ marginTop: 6 }}><Input value={song.musicUrl || ''} onChange={(v) => updateOpeningSong(sIdx, { musicUrl: v }, seasonIdx)} placeholder="楽曲リンクURL" /></div>
                      </div>
                    ))}
                    <button onClick={() => addOpeningSong(seasonIdx)} style={{ width: '100%', padding: 8, borderRadius: 10, border: '1px dashed rgba(15,23,42,0.15)', background: 'transparent', color: theme.colors.primary, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ OP曲追加</button>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <Label>エンディング曲</Label>
                    {(season.endingSongs || []).map((song, sIdx) => (
                      <div key={sIdx} style={{ marginBottom: 8, padding: 10, background: 'rgba(0,0,0,0.02)', borderRadius: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>ED {sIdx + 1}</span>
                          <IconButton icon={<Icons.Trash />} onClick={() => removeEndingSong(sIdx, seasonIdx)} />
                        </div>
                        <div style={{ marginBottom: 6 }}>
                          <Input value={song.songTitle} onChange={(v) => updateEndingSong(sIdx, { songTitle: v }, seasonIdx)} placeholder="曲名" />
                        </div>
                        <Input value={song.artistName} onChange={(v) => updateEndingSong(sIdx, { artistName: v }, seasonIdx)} placeholder="アーティスト名" />
                        <div style={{ marginTop: 6 }}><Input value={song.coverUrl || ''} onChange={(v) => updateEndingSong(sIdx, { coverUrl: v }, seasonIdx)} placeholder="ジャケット画像URL" /></div>
                        <div style={{ marginTop: 6 }}><Input value={song.musicUrl || ''} onChange={(v) => updateEndingSong(sIdx, { musicUrl: v }, seasonIdx)} placeholder="楽曲リンクURL" /></div>
                      </div>
                    ))}
                    <button onClick={() => addEndingSong(seasonIdx)} style={{ width: '100%', padding: 8, borderRadius: 10, border: '1px dashed rgba(15,23,42,0.15)', background: 'transparent', color: theme.colors.primary, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ ED曲追加</button>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <Label>あらすじ</Label>
                    <TextArea value={season.summary || ''} onChange={(v) => updateSeason(seasonIdx, { summary: v })} placeholder="あらすじ" rows={3} />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <Label>感想</Label>
                    <TextArea value={season.review || ''} onChange={(v) => updateSeason(seasonIdx, { review: v })} placeholder="感想" rows={3} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Label>エピソード</Label>
                      <button onClick={() => addEpisode(seasonIdx)} style={{ padding: '6px 12px', borderRadius: 10, border: 'none', background: theme.colors.primary, color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ 話数追加</button>
                    </div>
                    {asArray(season.episodes).map((ep, epIdx) => (
                      <div key={ep.id} style={{ marginBottom: 10, padding: 12, background: 'rgba(0,0,0,0.03)', borderRadius: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: theme.colors.text, minWidth: 50 }}>第{ep.episodeNumber}話</span>
                            <Input value={ep.title || ''} onChange={(v) => updateEpisode(seasonIdx, epIdx, { title: v })} placeholder="タイトル" />
                          </div>
                          <IconButton icon={<Icons.Trash />} onClick={() => removeEpisode(seasonIdx, epIdx)} />
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <Label>視聴日</Label>
                          <DateField value={ep.watchedDate || ''} onChange={(v) => updateEpisode(seasonIdx, epIdx, { watchedDate: v })} />
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <TextArea value={ep.summary || ''} onChange={(v) => updateEpisode(seasonIdx, epIdx, { summary: v })} placeholder="あらすじ" rows={2} />
                        </div>
                        <TextArea value={ep.review || ''} onChange={(v) => updateEpisode(seasonIdx, epIdx, { review: v })} placeholder="感想" rows={2} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </GlassCard>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <DetailPageLayout backgroundUrl={(isEditMode ? draft.posterUrl : anime.posterUrl) || undefined}>
      {isEditMode ? renderEditMode() : renderReadMode()}
    </DetailPageLayout>
  );
};
