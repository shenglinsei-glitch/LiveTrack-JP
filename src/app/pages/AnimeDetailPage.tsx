import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Anime, Season, Episode, OriginalType, OpeningSong, EndingSong, AnimeStatus, AnimeBroadcastWeekday } from '@/domain/types';
import { theme } from '@/components/common/theme';
import { Icons, IconButton } from '@/components/common/IconButton';
import { GlassCard } from '@/components/common/GlassCard';
import { Label, Value, SectionTitle } from '@/components/detail/DetailText';
import { DetailHeader, DetailChip, DetailLinkIconButton } from '@/components/detail/DetailHeader';
import { DetailPageLayout } from '@/components/detail/DetailPageLayout';
import { TagMultiSelectInput } from '@/components/common/TagMultiSelectInput';
import { TagSelectInput } from '@/components/common/TagSelectInput';
import {
  asArray,
  getAnimeStatusColor,
  formatDateWithWeek,
  openExternalUrl,
  deriveAnimeStatus,
  getNextDayWeekday,
  getBroadcastText,
  looksLikeSeasonNumber,
  getSeasonNumber,
  getSeasonDisplayTitle,
  normalizeAnimeDraft,
} from '@/utils/animeStatusHelpers';
import { Input, TextArea, DateField, CollapseChevron, StatusPill, inputStyle, selectStyle, sectionCardStyle, responsiveTwoColumnStyle } from './anime-detail/AnimeSharedStyles';
import { InfoItem, GenreChips, SongList } from './anime-detail/AnimeDisplayComponents';
import { ViewSection } from './anime-detail/AnimeViewSection';
import { AnimeSeasonCard } from './anime-detail/AnimeSeasonCard';

interface AnimeDetailPageProps {
  anime: Anime;
  onUpdateAnime: (anime: Anime) => void;
  onDeleteAnime: (id: string) => void;
  onBack: () => void;
  initialEditMode?: boolean;
  availableGenres?: string[];
  availableStudios?: string[];
  onAddAnimeGenre?: (genre: string) => void;
  onAddAnimeStudio?: (studio: string) => void;
}

const ORIGINAL_TYPES: OriginalType[] = ['漫画', '小説', 'オリジナル', 'その他'];
const ANIME_STATUSES: AnimeStatus[] = ['放送前', '視聴予定', '視聴中', '保留', '視聴済み', '視聴中止', '見送り'];
const BROADCAST_WEEKDAYS: AnimeBroadcastWeekday[] = ['', '日', '月', '火', '水', '木', '金', '土'];

export const AnimeDetailPage: React.FC<AnimeDetailPageProps> = ({ anime, onUpdateAnime, onDeleteAnime, onBack, initialEditMode = false, availableGenres = [], availableStudios = [], onAddAnimeGenre, onAddAnimeStudio }) => {
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

    if (onAddAnimeGenre) {
      (updated.genres || []).forEach((genre) => {
        if (genre.trim()) onAddAnimeGenre(genre.trim());
      });

      (updated.seasons || []).forEach((season) => {
        (season.genres || []).forEach((genre) => {
          if (genre.trim()) onAddAnimeGenre(genre.trim());
        });
      });
    }

    if (onAddAnimeStudio) {
      if (updated.studio?.trim()) onAddAnimeStudio(updated.studio.trim());
      (updated.seasons || []).forEach((season) => {
        if (season.studio?.trim()) onAddAnimeStudio(season.studio.trim());
      });
    }

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 16, minWidth: 0, maxWidth: '100%' }}>
              <InfoItem label="放送開始日">{formatDateWithWeek(anime.startDate) || null}</InfoItem>
              <InfoItem label="放送終了日">{formatDateWithWeek(anime.endDate) || null}</InfoItem>
              <InfoItem label="アニメーション制作">{anime.studio || null}</InfoItem>
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
              {seasons.map((season, seasonIdx) => (
                <AnimeSeasonCard
                  key={season.id}
                  animeTitle={anime.title}
                  season={season}
                  seasonIdx={seasonIdx}
                  onUpdateSeason={(collapsed) => {
                    const newSeasons = [...seasons];
                    newSeasons[seasonIdx] = { ...season, collapsed };
                    onUpdateAnime({ ...anime, seasons: newSeasons });
                  }}
                />
              ))}
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
            <Label>アニメーション制作</Label>
            <TagSelectInput value={draft.studio || ''} onChange={(v) => updateDraft({ studio: v })} candidates={availableStudios} onAddCandidate={onAddAnimeStudio} placeholder="アニメーション制作を入力" />
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
          <TagMultiSelectInput
            values={draft.genres || []}
            onChange={(v) => updateDraft({ genres: v })}
            candidates={availableGenres}
            onAddCandidate={onAddAnimeGenre}
            placeholder="ジャンルを追加"
          />
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
                    <Label>アニメーション制作</Label>
                    <TagSelectInput value={season.studio || ''} onChange={(v) => updateSeason(seasonIdx, { studio: v })} candidates={availableStudios} onAddCandidate={onAddAnimeStudio} placeholder="アニメーション制作" />
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
                    <TagMultiSelectInput
                      values={season.genres || []}
                      onChange={(v) => updateSeason(seasonIdx, { genres: v })}
                      candidates={availableGenres}
                      onAddCandidate={onAddAnimeGenre}
                      placeholder="ジャンルを追加"
                    />
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
