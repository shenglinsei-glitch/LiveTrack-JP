import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Anime, Season, Episode, OriginalType, OpeningSong, EndingSong, AnimeStatus, AnimeBroadcastWeekday } from '@/domain/types';
import { theme } from '@/components/common/theme';
import { Icons, IconButton } from '@/components/common/IconButton';
import { GlassCard } from '@/components/common/GlassCard';
import { Label, Value, SectionTitle } from '@/components/detail/DetailText';
import { DetailHeader, DetailChip } from '@/components/detail/DetailHeader';
import { DetailPageLayout } from '@/components/detail/DetailPageLayout';

interface AnimeDetailPageProps {
  anime: Anime;
  onUpdateAnime: (anime: Anime) => void;
  onDeleteAnime: (id: string) => void;
  onBack: () => void;
  initialEditMode?: boolean;
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


const ANIME_STATUS_PRIORITY: AnimeStatus[] = ['視聴中', '視聴予定', '放送前', '保留', '視聴済み', '視聴中止', '見送り'];

const deriveAnimeStatus = (anime: Pick<Anime, 'status' | 'seasons'>): AnimeStatus => {
  const statuses = (anime.seasons || []).map((s) => s.status).filter(Boolean) as AnimeStatus[];
  if (!statuses.length) return anime.status || '放送前';
  return ANIME_STATUS_PRIORITY.find((status) => statuses.includes(status)) || anime.status || '放送前';
};

const getNextDayWeekday = (date?: string): AnimeBroadcastWeekday => {
  if (!date) return '';
  const d = dayjs(date);
  if (!d.isValid()) return '';
  return week[(d.add(1, 'day').day())] as AnimeBroadcastWeekday;
};

const getBroadcastText = (startDate?: string, broadcastWeekday?: AnimeBroadcastWeekday, broadcastTime?: string) => {
  const weekday = getNextDayWeekday(startDate) || broadcastWeekday;
  if (!weekday) return '';
  return `毎週${weekday}曜${broadcastTime ? ` ${broadcastTime}` : ''}`;
};

const looksLikeSeasonNumber = (value?: string) => /^第.+[期季]$|^Season\s*\d+$/i.test(String(value || '').trim());

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
  return (anime.seasons || []).find((season) => season.status === '視聴中');
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

const sectionCardStyle: React.CSSProperties = {
  marginBottom: 14,
};

const StaticField: React.FC<{ label: string; value?: string; placeholder?: string }> = ({ label, value, placeholder = '未設定' }) => (
  <div style={{ marginBottom: 14 }}>
    <Label>{label}</Label>
    <Value>{value || placeholder}</Value>
  </div>
);

export const AnimeDetailPage: React.FC<AnimeDetailPageProps> = ({ anime, onUpdateAnime, onDeleteAnime, onBack, initialEditMode = false }) => {
  const [isEditMode, setIsEditMode] = useState(initialEditMode);
  const [draft, setDraft] = useState(anime);

  const isDraftDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(anime), [draft, anime]);

  useEffect(() => {
    setDraft(anime);
  }, [anime]);

  const handleSave = () => {
    const updated: Anime = {
      ...draft,
      status: deriveAnimeStatus(draft),
      updatedAt: new Date().toISOString(),
    };
    onUpdateAnime(updated);
    setIsEditMode(false);
  };

  const discardEdit = () => {
    setDraft(anime);
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
    const newSeasons = [...draft.seasons];
    newSeasons[seasonIndex] = { ...newSeasons[seasonIndex], ...updates };
    updateDraft({ seasons: newSeasons });
  };

  const addSeason = () => {
    const newSeason: Season = {
      id: Math.random().toString(36).substr(2, 9),
      seasonNumber: `第${draft.seasons.length + 1}期`,
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
      status: '放送前',
      useAnimeTitle: true,
    };
    updateDraft({ seasons: [...draft.seasons, newSeason] });
  };

  const removeSeason = (seasonIndex: number) => {
    if (window.confirm('このシーズンを削除しますか？')) {
      updateDraft({ seasons: draft.seasons.filter((_, i) => i !== seasonIndex) });
    }
  };

  const toggleSeasonCollapse = (seasonIndex: number) => {
    updateSeason(seasonIndex, { collapsed: !draft.seasons[seasonIndex].collapsed });
  };

  const addEpisode = (seasonIndex: number) => {
    const season = draft.seasons[seasonIndex];
    const newEpisode: Episode = {
      id: Math.random().toString(36).substr(2, 9),
      episodeNumber: season.episodes.length + 1,
      title: '',
      summary: '',
      review: '',
      watchedDate: '',
    };
    const newEpisodes = [...season.episodes, newEpisode];
    updateSeason(seasonIndex, { episodes: newEpisodes });
  };

  const updateEpisode = (seasonIndex: number, episodeIndex: number, updates: Partial<Episode>) => {
    const season = draft.seasons[seasonIndex];
    const newEpisodes = [...season.episodes];
    newEpisodes[episodeIndex] = { ...newEpisodes[episodeIndex], ...updates };
    updateSeason(seasonIndex, { episodes: newEpisodes });
  };

  const removeEpisode = (seasonIndex: number, episodeIndex: number) => {
    const season = draft.seasons[seasonIndex];
    updateSeason(seasonIndex, { episodes: season.episodes.filter((_, i) => i !== episodeIndex) });
  };

  const addOpeningSong = (seasonIndex?: number) => {
    if (seasonIndex !== undefined) {
      const season = draft.seasons[seasonIndex];
      updateSeason(seasonIndex, { openingSongs: [...(season.openingSongs || []), { songTitle: '', artistName: '', coverUrl: '', musicUrl: '' }] });
    } else {
      updateDraft({ openingSongs: [...(draft.openingSongs || []), { songTitle: '', artistName: '', coverUrl: '', musicUrl: '' }] });
    }
  };

  const updateOpeningSong = (songIndex: number, updates: Partial<OpeningSong>, seasonIndex?: number) => {
    if (seasonIndex !== undefined) {
      const season = draft.seasons[seasonIndex];
      const newSongs = [...(season.openingSongs || [])];
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
      const season = draft.seasons[seasonIndex];
      updateSeason(seasonIndex, { openingSongs: (season.openingSongs || []).filter((_, i) => i !== songIndex) });
    } else {
      updateDraft({ openingSongs: (draft.openingSongs || []).filter((_, i) => i !== songIndex) });
    }
  };

  const addEndingSong = (seasonIndex?: number) => {
    if (seasonIndex !== undefined) {
      const season = draft.seasons[seasonIndex];
      updateSeason(seasonIndex, { endingSongs: [...(season.endingSongs || []), { songTitle: '', artistName: '', coverUrl: '', musicUrl: '' }] });
    } else {
      updateDraft({ endingSongs: [...(draft.endingSongs || []), { songTitle: '', artistName: '', coverUrl: '', musicUrl: '' }] });
    }
  };

  const updateEndingSong = (songIndex: number, updates: Partial<EndingSong>, seasonIndex?: number) => {
    if (seasonIndex !== undefined) {
      const season = draft.seasons[seasonIndex];
      const newSongs = [...(season.endingSongs || [])];
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
      const season = draft.seasons[seasonIndex];
      updateSeason(seasonIndex, { endingSongs: (season.endingSongs || []).filter((_, i) => i !== songIndex) });
    } else {
      updateDraft({ endingSongs: (draft.endingSongs || []).filter((_, i) => i !== songIndex) });
    }
  };

  const addGenre = (seasonIndex?: number) => {
    if (seasonIndex !== undefined) {
      const season = draft.seasons[seasonIndex];
      updateSeason(seasonIndex, { genres: [...(season.genres || []), ''] });
    } else {
      updateDraft({ genres: [...(draft.genres || []), ''] });
    }
  };

  const updateGenre = (genreIndex: number, value: string, seasonIndex?: number) => {
    if (seasonIndex !== undefined) {
      const season = draft.seasons[seasonIndex];
      const newGenres = [...(season.genres || [])];
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
      const season = draft.seasons[seasonIndex];
      updateSeason(seasonIndex, { genres: (season.genres || []).filter((_, i) => i !== genreIndex) });
    } else {
      updateDraft({ genres: (draft.genres || []).filter((_, i) => i !== genreIndex) });
    }
  };

  const renderReadMode = () => (
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
        tags={<DetailChip label={deriveAnimeStatus(anime)} bg={getAnimeStatusColor(deriveAnimeStatus(anime))} />}
      />

      <div style={{ padding: '0 16px 140px' }}>

        <GlassCard style={sectionCardStyle}>
          <SectionTitle>基本情報</SectionTitle>
          {deriveAnimeStatus(anime) && (
            <div style={{ marginBottom: 14 }}>
              <Label>ステータス</Label>
              <span style={{ display: 'inline-flex', marginTop: 6, background: `${getAnimeStatusColor(deriveAnimeStatus(anime))}22`, color: getAnimeStatusColor(deriveAnimeStatus(anime)), padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 900 }}>{deriveAnimeStatus(anime)}</span>
            </div>
          )}
          {anime.startDate && <StaticField label="放送開始日" value={formatDateWithWeek(anime.startDate)} />}
          {anime.endDate && <StaticField label="放送終了日" value={formatDateWithWeek(anime.endDate)} />}
          {anime.studio && <StaticField label="制作会社" value={anime.studio} />}
          {anime.director && <StaticField label="監督" value={anime.director} />}
          {anime.originalType && <StaticField label="原作種別" value={anime.originalType} />}
          {anime.originalTitle && <StaticField label="原作タイトル" value={anime.originalTitle} />}
          {anime.rating !== undefined && <StaticField label="評価" value={`★ ${anime.rating.toFixed(1)} / 5`} />}
          {anime.totalEpisodes !== undefined && anime.totalEpisodes > 0 && <StaticField label="集数" value={`全${anime.totalEpisodes}話`} />}
          {getBroadcastText(anime.startDate, anime.broadcastWeekday, anime.broadcastTime) && <StaticField label="毎週更新" value={getBroadcastText(anime.startDate, anime.broadcastWeekday, anime.broadcastTime)} />}
        </GlassCard>

        {anime.genres && anime.genres.length > 0 && (
          <GlassCard style={sectionCardStyle}>
            <SectionTitle>ジャンル</SectionTitle>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {anime.genres.map((genre, idx) => (
                <span key={idx} style={{ background: 'rgba(83,190,232,0.15)', color: theme.colors.primary, padding: '6px 12px', borderRadius: 12, fontSize: 13, fontWeight: 700 }}>{genre}</span>
              ))}
            </div>
          </GlassCard>
        )}

        {anime.openingSongs && anime.openingSongs.length > 0 && (
          <GlassCard style={sectionCardStyle}>
            <SectionTitle>オープニング曲</SectionTitle>
            {anime.openingSongs.map((song, idx) => (
              <div key={idx} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
                  {song.coverUrl && <img src={song.coverUrl} alt={song.songTitle} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />}
                  <div style={{ minWidth: 0 }}>
                    <Value>{song.songTitle || '曲名未設定'}</Value>
                    <div style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 }}>{song.artistName || 'アーティスト未設定'}</div>
                    {song.musicUrl && <a href={song.musicUrl.startsWith('http') ? song.musicUrl : `https://${song.musicUrl}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: theme.colors.primary, fontWeight: 800 }}>リンクを開く</a>}
                  </div>
                </div>
              </div>
            ))}
          </GlassCard>
        )}

        {anime.endingSongs && anime.endingSongs.length > 0 && (
          <GlassCard style={sectionCardStyle}>
            <SectionTitle>エンディング曲</SectionTitle>
            {anime.endingSongs.map((song, idx) => (
              <div key={idx} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
                  {song.coverUrl && <img src={song.coverUrl} alt={song.songTitle} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />}
                  <div style={{ minWidth: 0 }}>
                    <Value>{song.songTitle || '曲名未設定'}</Value>
                    <div style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 }}>{song.artistName || 'アーティスト未設定'}</div>
                    {song.musicUrl && <a href={song.musicUrl.startsWith('http') ? song.musicUrl : `https://${song.musicUrl}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: theme.colors.primary, fontWeight: 800 }}>リンクを開く</a>}
                  </div>
                </div>
              </div>
            ))}
          </GlassCard>
        )}

        {anime.summary && (
          <GlassCard style={sectionCardStyle}>
            <SectionTitle>あらすじ</SectionTitle>
            <Value>{anime.summary}</Value>
          </GlassCard>
        )}

        {anime.review && (
          <GlassCard style={sectionCardStyle}>
            <SectionTitle>感想</SectionTitle>
            <Value>{anime.review}</Value>
          </GlassCard>
        )}

        {anime.seasons && anime.seasons.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <SectionTitle style={{ marginBottom: 12 }}>シーズン</SectionTitle>
            {anime.seasons.map((season, seasonIdx) => (
              <GlassCard key={season.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: theme.colors.text }}>{getSeasonDisplayTitle(anime.title, season)}</div>
                  <button
                    onClick={() => {
                      const newSeasons = [...anime.seasons];
                      newSeasons[seasonIdx] = { ...season, collapsed: !season.collapsed };
                      onUpdateAnime({ ...anime, seasons: newSeasons });
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                  >
                    <CollapseChevron open={!season.collapsed} />
                  </button>
                </div>
                {!season.collapsed && (
                  <>
                    {season.status && (
                      <div style={{ marginBottom: 14 }}>
                        <Label>ステータス</Label>
                        <span style={{ display: 'inline-flex', marginTop: 6, background: `${getAnimeStatusColor(season.status)}22`, color: getAnimeStatusColor(season.status), padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 900 }}>{season.status}</span>
                      </div>
                    )}
                    {season.startDate && <StaticField label="放送開始日" value={formatDateWithWeek(season.startDate)} />}
                    {season.endDate && <StaticField label="放送終了日" value={formatDateWithWeek(season.endDate)} />}
                    {season.studio && <StaticField label="制作会社" value={season.studio} />}
                    {season.director && <StaticField label="監督" value={season.director} />}
                    {season.rating !== undefined && <StaticField label="評価" value={`★ ${season.rating.toFixed(1)} / 5`} />}
                    {season.totalEpisodes !== undefined && season.totalEpisodes > 0 && <StaticField label="集数" value={`全${season.totalEpisodes}話`} />}
                    {getBroadcastText(season.startDate, season.broadcastWeekday, season.broadcastTime) && <StaticField label="毎週更新" value={getBroadcastText(season.startDate, season.broadcastWeekday, season.broadcastTime)} />}
                    {season.genres && season.genres.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <Label>ジャンル</Label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                          {season.genres.map((genre, idx) => (
                            <span key={idx} style={{ background: 'rgba(83,190,232,0.15)', color: theme.colors.primary, padding: '4px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>{genre}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {season.openingSongs && season.openingSongs.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <Label>オープニング曲</Label>
                        {season.openingSongs.map((song, idx) => (
                          <div key={idx} style={{ marginTop: 6 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                              {song.coverUrl && <img src={song.coverUrl} alt={song.songTitle} style={{ width: 38, height: 38, borderRadius: 9, objectFit: 'cover' }} />}
                              <div>
                                <Value>{song.songTitle || '曲名未設定'}</Value>
                                <div style={{ fontSize: 12, color: theme.colors.textSecondary }}>{song.artistName || 'アーティスト未設定'}</div>
                                {song.musicUrl && <a href={song.musicUrl.startsWith('http') ? song.musicUrl : `https://${song.musicUrl}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: theme.colors.primary, fontWeight: 800 }}>リンクを開く</a>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {season.endingSongs && season.endingSongs.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <Label>エンディング曲</Label>
                        {season.endingSongs.map((song, idx) => (
                          <div key={idx} style={{ marginTop: 6 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                              {song.coverUrl && <img src={song.coverUrl} alt={song.songTitle} style={{ width: 38, height: 38, borderRadius: 9, objectFit: 'cover' }} />}
                              <div>
                                <Value>{song.songTitle || '曲名未設定'}</Value>
                                <div style={{ fontSize: 12, color: theme.colors.textSecondary }}>{song.artistName || 'アーティスト未設定'}</div>
                                {song.musicUrl && <a href={song.musicUrl.startsWith('http') ? song.musicUrl : `https://${song.musicUrl}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: theme.colors.primary, fontWeight: 800 }}>リンクを開く</a>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {season.summary && (
                      <div style={{ marginBottom: 14 }}>
                        <Label>あらすじ</Label>
                        <Value>{season.summary}</Value>
                      </div>
                    )}
                    {season.review && (
                      <div style={{ marginBottom: 14 }}>
                        <Label>感想</Label>
                        <Value>{season.review}</Value>
                      </div>
                    )}
                    {season.episodes && season.episodes.length > 0 && (
                      <div>
                        <Label>エピソード</Label>
                        {season.episodes.map((ep) => (
                          <div key={ep.id} style={{ marginTop: 8, padding: 10, background: 'rgba(0,0,0,0.03)', borderRadius: 12 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: theme.colors.text }}>第{ep.episodeNumber}話{ep.title ? ` ${ep.title}` : ''}</div>
                            {ep.summary && <div style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 }}>{ep.summary}</div>}
                            {ep.watchedDate && <div style={{ fontSize: 11, color: theme.colors.primary, marginTop: 4, fontWeight: 800 }}>視聴日: {formatDateWithWeek(ep.watchedDate)}</div>}
                            {ep.review && <div style={{ fontSize: 12, color: theme.colors.text, marginTop: 6, fontStyle: 'italic' }}>{ep.review}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </>
  );

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

      <div style={{ padding: '0 16px 140px' }}>
        <GlassCard style={sectionCardStyle}>
          <SectionTitle>基本情報</SectionTitle>
          <div style={{ marginBottom: 14 }}>
            <Label>タイトル</Label>
            <Input value={draft.title} onChange={(v) => updateDraft({ title: v })} placeholder="タイトルを入力" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label>ステータス</Label>
            <span style={{ display: 'inline-flex', marginTop: 6, background: `${getAnimeStatusColor(deriveAnimeStatus(draft))}22`, color: getAnimeStatusColor(deriveAnimeStatus(draft)), padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 900 }}>{deriveAnimeStatus(draft)}</span>
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label>ポスター画像URL</Label>
            <Input value={draft.posterUrl || ''} onChange={(v) => updateDraft({ posterUrl: v })} placeholder="https://..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
            <div>
              <Label>放送開始日</Label>
              <Input type="date" value={draft.startDate || ''} onChange={(v) => updateDraft({ startDate: v, broadcastWeekday: getNextDayWeekday(v) })} />
            </div>
            <div>
              <Label>放送終了日</Label>
              <Input type="date" value={draft.endDate || ''} onChange={(v) => updateDraft({ endDate: v })} />
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
            <Label>原作タイトル</Label>
            <Input value={draft.originalTitle || ''} onChange={(v) => updateDraft({ originalTitle: v })} placeholder="原作タイトルを入力" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label>評価（0.0〜5.0）</Label>
            <Input type="number" value={draft.rating?.toString() || ''} onChange={(v) => updateDraft({ rating: v ? parseFloat(v) : undefined })} placeholder="0.0" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label>集数</Label>
            <Input type="number" value={draft.totalEpisodes?.toString() || ''} onChange={(v) => updateDraft({ totalEpisodes: v ? Number(v) : undefined })} placeholder="全話数" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
            <div>
              <Label>毎週更新曜日（放送開始日の翌日で自動計算）</Label>
              <select value={draft.broadcastWeekday || ''} onChange={(e) => updateDraft({ broadcastWeekday: e.target.value as AnimeBroadcastWeekday })} style={selectStyle}>
                {BROADCAST_WEEKDAYS.map((d) => <option key={d || 'none'} value={d}>{d ? `${d}曜` : '未設定'}</option>)}
              </select>
            </div>
            <div>
              <Label>更新時間</Label>
              <Input type="time" value={draft.broadcastTime || ''} onChange={(v) => updateDraft({ broadcastTime: v })} />
            </div>
          </div>
        </GlassCard>

        <GlassCard style={sectionCardStyle}>
          <SectionTitle>ジャンル</SectionTitle>
          {(draft.genres || []).map((genre, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Input value={genre} onChange={(v) => updateGenre(idx, v)} placeholder="ジャンルを入力" />
              <IconButton icon={<Icons.Trash />} onClick={() => removeGenre(idx)} />
            </div>
          ))}
          <button onClick={() => addGenre()} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px dashed rgba(15,23,42,0.2)', background: 'transparent', color: theme.colors.primary, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+ ジャンルを追加</button>
        </GlassCard>

        <GlassCard style={sectionCardStyle}>
          <SectionTitle>オープニング曲</SectionTitle>
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
          <SectionTitle>エンディング曲</SectionTitle>
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
          <SectionTitle>あらすじ</SectionTitle>
          <TextArea value={draft.summary || ''} onChange={(v) => updateDraft({ summary: v })} placeholder="あらすじを入力" />
        </GlassCard>

        <GlassCard style={sectionCardStyle}>
          <SectionTitle>感想</SectionTitle>
          <TextArea value={draft.review || ''} onChange={(v) => updateDraft({ review: v })} placeholder="感想を入力" rows={6} />
        </GlassCard>

        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <SectionTitle>シーズン</SectionTitle>
            <button onClick={addSeason} style={{ padding: '8px 16px', borderRadius: 12, border: 'none', background: theme.colors.primary, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ シーズン追加</button>
          </div>
          {draft.seasons.map((season, seasonIdx) => (
            <GlassCard key={season.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(72px, 0.34fr) minmax(0, 1fr)', gap: 8 }}>
                    <Input value={season.seasonNumber || getSeasonNumber(season) || ''} onChange={(v) => updateSeason(seasonIdx, { seasonNumber: v })} placeholder={`第${seasonIdx + 1}期`} />
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
              {!season.collapsed && (
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
                    <div>
                      <Label>放送開始日</Label>
                      <Input type="date" value={season.startDate || ''} onChange={(v) => updateSeason(seasonIdx, { startDate: v, broadcastWeekday: getNextDayWeekday(v) })} />
                    </div>
                    <div>
                      <Label>放送終了日</Label>
                      <Input type="date" value={season.endDate || ''} onChange={(v) => updateSeason(seasonIdx, { endDate: v })} />
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 14 }}>
                    <div>
                      <Label>毎週更新曜日</Label>
                      <select value={season.broadcastWeekday || ''} onChange={(e) => updateSeason(seasonIdx, { broadcastWeekday: e.target.value as AnimeBroadcastWeekday })} style={selectStyle}>
                        {BROADCAST_WEEKDAYS.map((d) => <option key={d || 'none'} value={d}>{d ? `${d}曜` : '未設定'}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>更新時間</Label>
                      <Input type="time" value={season.broadcastTime || ''} onChange={(v) => updateSeason(seasonIdx, { broadcastTime: v })} />
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <Label>ジャンル</Label>
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
                    {season.episodes.map((ep, epIdx) => (
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
                          <Input type="date" value={ep.watchedDate || ''} onChange={(v) => updateEpisode(seasonIdx, epIdx, { watchedDate: v })} />
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
