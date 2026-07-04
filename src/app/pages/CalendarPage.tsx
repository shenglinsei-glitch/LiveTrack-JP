import React, { useEffect, useMemo, useState } from 'react';
import { PageShell } from '@/components/common/PageShell';
import { theme } from '@/components/common/theme';
import { TEXT } from '@/components/common/constants';
import { Artist, CalendarEvent, Exhibition, Movie, Anime } from '@/domain/types';
import { buildCalendarEvents } from '@/domain/logic';
import { CalendarGrid } from '@/components/CalendarGrid';
import { CalendarEventList } from '@/components/CalendarEventList';
import {
  CalendarMode,
  buildCalendarWeeks,
  buildMusicEventMap,
  getSelectedDayEvents,
  getTodayKey,
} from '@/domain/calendarHelpers';

interface Props {
  artists: Artist[];
  exhibitions: Exhibition[];
  movies: Movie[];
  animes: Anime[];
  onOpenArtist: (artistId: string) => void;
  onOpenConcert: (artistId: string, tourId: string, concertId: string) => void;
  onOpenExhibition: (exhibitionId: string) => void;
  onOpenMovie: (movieId: string) => void;
  onOpenAnime: (animeId: string) => void;
  onRefreshAll: () => void;
  isMenuOpenExternally?: boolean;
  onMenuClose?: () => void;
}

export const CalendarPage: React.FC<Props> = ({
  artists,
  exhibitions,
  movies,
  animes,
  onOpenArtist,
  onOpenConcert,
  onOpenExhibition,
  onOpenMovie,
  onOpenAnime,
  onRefreshAll,
  isMenuOpenExternally,
  onMenuClose,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<'sun' | 'mon'>('mon');

  const [showAttended, setShowAttended] = useState(true);
  const [showSkipped, setShowSkipped] = useState(true);

  const [mode, setMode] = useState<CalendarMode>('concert');
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);

  const [isToolsOpen, setIsToolsOpen] = useState(false);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);

  useEffect(() => {
    setSelectedDateKey(null);
  }, [currentDate.getFullYear(), currentDate.getMonth(), mode]);

  const allEvents = useMemo(() => buildCalendarEvents(artists, { showAttended, showSkipped }, movies, animes), [artists, showAttended, showSkipped, movies, animes]);

  const musicEventMap = useMemo(() => buildMusicEventMap(allEvents), [allEvents]);

  const calendarWeeks = useMemo(() => buildCalendarWeeks(currentDate, weekStart), [currentDate, weekStart]);

  const todayKey = useMemo(() => getTodayKey(), []);

  const handleDayClick = (day: number) => {
    const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDateKey(dateKey === selectedDateKey ? null : dateKey);
  };

  const handleEventClick = (ev: CalendarEvent) => {
    if (ev.status === '参戦予定' || ev.status === '参戦済み') onOpenConcert(ev.artistId, ev.tourId, ev.concertId);
    else onOpenArtist(ev.artistId);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchCurrentX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    setTouchCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchCurrentX === null) {
      setTouchStartX(null);
      setTouchCurrentX(null);
      return;
    }
    const dx = touchCurrentX - touchStartX;
    const threshold = 70;
    if (Math.abs(dx) > threshold) {
      if (dx < 0) setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
      else setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
    setTouchStartX(null);
    setTouchCurrentX(null);
  };

  const selectedDayEvents = useMemo(() => getSelectedDayEvents(selectedDateKey, mode, musicEventMap, exhibitions), [selectedDateKey, mode, musicEventMap, exhibitions]);

  const monthInputValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const handleNativeMonthChange = (value: string) => {
    const match = value.match(/^(\d{4})-(\d{2})$/);
    if (!match) return;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return;
    setCurrentDate(new Date(year, month - 1, 1));
  };

  return (
    <PageShell disablePadding horizontalPadding="16px">
      <div style={{ padding: 'calc(12px + env(safe-area-inset-top)) 0 140px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: '10px', marginBottom: '16px', height: '44px', width: '100%' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsModeMenuOpen(v => !v)}
              style={{
                ...modeBtnStyle,
                height: 44,
                padding: '0 16px',
                background: 'rgba(255,255,255,0.72)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.42)',
                boxShadow: '0 6px 18px rgba(15,23,42,0.05)',
                color: theme.colors.text,
                gap: 8,
              }}
            >
              <span>{mode === 'concert' ? '公演' : mode === 'exhibition' ? '展覧' : mode === 'movie' ? '映画' : 'アニメ'}</span>
              <span style={{ fontSize: 10, opacity: 0.45 }}>▼</span>
            </button>
            {isModeMenuOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 119 }} onClick={() => setIsModeMenuOpen(false)} />
                <div style={{ position: 'absolute', left: 0, top: 48, zIndex: 120, minWidth: 140, background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', border: '1px solid rgba(15,23,42,0.06)', borderRadius: 20, boxShadow: '0 18px 44px -18px rgba(15,23,42,0.18)', padding: 8 }}>
                  {[
                    { key: 'concert', label: '公演' },
                    { key: 'exhibition', label: '展覧' },
                    { key: 'movie', label: '映画' },
                    { key: 'anime', label: 'アニメ' },
                  ].map((item) => (
                    <button key={item.key} onClick={() => { setMode(item.key as CalendarMode); setIsModeMenuOpen(false); }} style={{ width: '100%', border: 'none', background: mode === item.key ? 'rgba(83,190,232,0.12)' : 'transparent', color: mode === item.key ? theme.colors.primary : theme.colors.text, borderRadius: 14, padding: '10px 12px', textAlign: 'left', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>{item.label}</button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div />

          <div style={{ position: 'relative' }}>
            <button onClick={() => setIsToolsOpen(v => !v)} style={{ border: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.72)', color: '#9CA3AF', fontSize: '12px', fontWeight: 800, padding: '10px', borderRadius: '999px', cursor: 'pointer', whiteSpace: 'nowrap', lineHeight: 0, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 6px 18px rgba(15, 23, 42, 0.06)' }} aria-label="calendar tools">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
              </svg>
            </button>
            {isToolsOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 119 }} onClick={() => setIsToolsOpen(false)} />
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 48,
                    zIndex: 120,
                    width: 324,
                    maxWidth: 'calc(100vw - 32px)',
                    background: 'rgba(255,255,255,0.58)',
                    border: '1px solid rgba(255,255,255,0.40)',
                    borderRadius: 30,
                    boxShadow: '0 18px 44px -18px rgba(15,23,42,0.18)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    padding: '18px 16px',
                  }}
                >
                  <div style={calendarMenuSectionTitleStyle}>表示設定</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    <button
                      onClick={() => { onRefreshAll(); setIsToolsOpen(false); }}
                      style={calendarMenuTextButtonStyle}
                    >
                      再読み込み
                    </button>
                  </div>

                  <div style={calendarMenuDividerStyle} />
                  <div style={calendarMenuSectionTitleStyle}>週の開始日</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                    <button onClick={() => setWeekStart('sun')} style={weekStart === 'sun' ? calendarChipActiveStyle : calendarChipStyle}>日曜日</button>
                    <button onClick={() => setWeekStart('mon')} style={weekStart === 'mon' ? calendarChipActiveStyle : calendarChipStyle}>月曜日</button>
                  </div>

                  <div style={calendarMenuDividerStyle} />
                  <div style={calendarMenuSectionTitleStyle}>予定表示</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button onClick={() => setShowAttended(!showAttended)} style={showAttended ? calendarMenuBtnActiveStyle : calendarMenuBtnStyle}>参戦済みを表示</button>
                    <button onClick={() => setShowSkipped(!showSkipped)} style={showSkipped ? calendarMenuBtnActiveStyle : calendarMenuBtnStyle}>見送りを表示</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <CalendarGrid
            mode={mode}
            weekStart={weekStart}
            calendarWeeks={calendarWeeks}
            selectedDateKey={selectedDateKey}
            todayKey={todayKey}
            musicEventMap={musicEventMap}
            exhibitions={exhibitions}
            currentDate={currentDate}
            monthInputValue={monthInputValue}
            onMonthChange={handleNativeMonthChange}
            onPreviousMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            onNextMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            onDayClick={handleDayClick}
          />
        </div>

        <CalendarEventList
          selectedDateKey={selectedDateKey}
          mode={mode}
          selectedDayEvents={selectedDayEvents}
          onOpenMovie={onOpenMovie}
          onOpenAnime={onOpenAnime}
          onOpenExhibition={onOpenExhibition}
          onOpenArtistEvent={handleEventClick}
        />
      </div>
    </PageShell>
  );
};

const modeBtnStyle: React.CSSProperties = {
  border: 'none',
  padding: '6px 14px',
  borderRadius: '9999px',
  fontSize: '13px',
  fontWeight: '800',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const calendarMenuSectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: '0.06em',
  color: '#6B7280',
  marginBottom: 10,
};

const calendarMenuDividerStyle: React.CSSProperties = {
  borderTop: '1px solid rgba(15,23,42,0.08)',
  margin: '0 0 16px 0',
};

const calendarMenuTextButtonStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  padding: '8px 2px',
  border: 'none',
  background: 'transparent',
  color: theme.colors.text,
  fontSize: 14,
  lineHeight: 1.3,
  fontWeight: 800,
  cursor: 'pointer',
};

const calendarMenuBtnStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  padding: '12px 16px',
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.22)',
  background: 'rgba(255,255,255,0.22)',
  color: theme.colors.text,
  fontSize: 13,
  lineHeight: 1.2,
  fontWeight: 800,
  cursor: 'pointer',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};

const calendarMenuBtnActiveStyle: React.CSSProperties = {
  ...calendarMenuBtnStyle,
  background: 'rgba(83,190,232,0.10)',
  border: '1px solid rgba(83,190,232,0.12)',
  color: theme.colors.primary,
};

const calendarChipStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.22)',
  cursor: 'pointer',
  padding: '7px 14px',
  fontSize: 12,
  fontWeight: 800,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.22)',
  color: theme.colors.textSecondary,
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
};

const calendarChipActiveStyle: React.CSSProperties = {
  ...calendarChipStyle,
  background: 'rgba(83,190,232,0.10)',
  border: '1px solid rgba(83,190,232,0.12)',
  color: theme.colors.primary,
};
