import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { PageShell } from '../ui/PageShell';
import { theme } from '../ui/theme';
import { TEXT } from '../ui/constants';
import { Artist, CalendarEvent, Exhibition, Movie } from '../domain/types';
import { buildCalendarEvents } from '../domain/logic';
import { CalendarGrid } from '../components/CalendarGrid';
import { CalendarEventList } from '../components/CalendarEventList';
import {
  CalendarMode,
  buildCalendarWeeks,
  buildMusicEventMap,
  getSelectedDayEvents,
  getTodayKey,
} from '../domain/calendarHelpers';

interface Props {
  artists: Artist[];
  exhibitions: Exhibition[];
  movies: Movie[];
  onOpenArtist: (artistId: string) => void;
  onOpenConcert: (artistId: string, tourId: string, concertId: string) => void;
  onOpenExhibition: (exhibitionId: string) => void;
  onOpenMovie: (movieId: string) => void;
  onRefreshAll: () => void;
  isMenuOpenExternally?: boolean;
  onMenuClose?: () => void;
}

// ====== Wheel Picker Popover ======
const WheelPickerPopover = ({
  isOpen,
  onClose,
  onConfirm,
  initialYear,
  initialMonth,
  anchorRect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (y: number, m: number) => void;
  initialYear: number;
  initialMonth: number;
  anchorRect: DOMRect | null;
}) => {
  const [selectedY, setSelectedY] = useState(initialYear);
  const [selectedM, setSelectedM] = useState(initialMonth);
  const yearListRef = useRef<HTMLDivElement>(null);
  const monthListRef = useRef<HTMLDivElement>(null);
  const scrollDebounceRef = useRef<number | null>(null);

  const years = useMemo(() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: 21 }, (_, i) => cur - 10 + i);
  }, []);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  const ITEM_HEIGHT = 44;
  const POPOVER_WIDTH = Math.min(340, window.innerWidth - 32);
  const POPOVER_HEIGHT = 330;

  const position = useMemo(() => {
    if (!anchorRect) return { top: 0, left: 0 };
    let left = anchorRect.left + anchorRect.width / 2 - POPOVER_WIDTH / 2;
    left = Math.min(Math.max(left, 16), window.innerWidth - 16 - POPOVER_WIDTH);

    let top = anchorRect.bottom + 10;
    if (top + POPOVER_HEIGHT > window.innerHeight - 16) {
      top = anchorRect.top - 10 - POPOVER_HEIGHT;
    }
    return { top, left };
  }, [anchorRect, POPOVER_WIDTH, POPOVER_HEIGHT]);

  const syncScroll = (ref: React.RefObject<HTMLDivElement>, value: number, options: number[]) => {
    if (!ref.current) return;
    const idx = options.indexOf(value);
    if (idx !== -1) {
      const target = ref.current.children[idx] as HTMLElement;
      if (target) target.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          syncScroll(yearListRef, initialYear, years);
          syncScroll(monthListRef, initialMonth, months);
          setSelectedY(initialYear);
          setSelectedM(initialMonth);
        });
      });
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, initialYear, initialMonth, years, months]);

  const handleScroll = (ref: React.RefObject<HTMLDivElement>, type: 'y' | 'm') => {
    if (!ref.current) return;
    if (scrollDebounceRef.current) window.clearTimeout(scrollDebounceRef.current);

    scrollDebounceRef.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;

      const children = Array.from(el.children) as HTMLElement[];
      const containerRect = el.getBoundingClientRect();
      const containerCenter = containerRect.top + el.clientHeight / 2;

      let closestIdx = 0;
      let minDiff = Number.MAX_VALUE;

      children.forEach((child, idx) => {
        const rect = child.getBoundingClientRect();
        const childCenter = rect.top + rect.height / 2;
        const diff = Math.abs(containerCenter - childCenter);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });

      const targetItem = children[closestIdx];
      if (targetItem) {
        targetItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
        const options = type === 'y' ? years : months;
        const val = options[closestIdx];
        if (val !== undefined) {
          if (type === 'y') setSelectedY(val);
          else setSelectedM(val);
        }
      }
    }, 100);
  };

  const handleItemClick = (ref: React.RefObject<HTMLDivElement>, idx: number) => {
    if (!ref.current) return;
    const target = ref.current.children[idx] as HTMLElement;
    if (target) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  if (!isOpen) return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 5000 }}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }} onClick={onClose} />

      <div
        className="fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: position.top,
          left: position.left,
          width: POPOVER_WIDTH,
          maxWidth: 'calc(100vw - 32px)',
          height: POPOVER_HEIGHT,
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '16px',
          boxSizing: 'border-box',
          boxShadow: '0 18px 50px rgba(0,0,0,0.12)',
          border: '1px solid rgba(15, 23, 42, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center', padding: '0 4px' }}>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '14px', fontWeight: 'bold', color: theme.colors.textSecondary, cursor: 'pointer' }}>
            キャンセル
          </button>
          <span style={{ fontWeight: '900', fontSize: '15px', color: theme.colors.text }}>年月を選択</span>
          <button onClick={() => onConfirm(selectedY, selectedM)} style={{ border: 'none', background: 'none', fontSize: '14px', fontWeight: '900', color: theme.colors.primary, cursor: 'pointer' }}>
            確定
          </button>
        </div>

        <div style={{ position: 'relative', flex: 1, display: 'flex', overflow: 'hidden', background: 'rgba(0,0,0,0.02)', borderRadius: '16px' }}>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 12,
              right: 12,
              height: ITEM_HEIGHT,
              transform: 'translateY(-50%)',
              background: 'rgba(83, 190, 232, 0.08)',
              borderRadius: '10px',
              zIndex: 0,
              pointerEvents: 'none',
              borderTop: '0.5px solid rgba(83, 190, 232, 0.12)',
              borderBottom: '0.5px solid rgba(83, 190, 232, 0.12)',
            }}
          />

          <div
            ref={yearListRef}
            onScroll={() => handleScroll(yearListRef, 'y')}
            style={{
              flex: 1,
              height: '100%',
              overflowY: 'auto',
              scrollSnapType: 'y mandatory',
              textAlign: 'center',
              zIndex: 1,
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
              pointerEvents: 'auto',
              overscrollBehavior: 'contain',
              paddingTop: ITEM_HEIGHT * 3,
              paddingBottom: ITEM_HEIGHT * 3,
            }}
            className="hide-scrollbar"
          >
            {years.map((y, idx) => (
              <div
                key={y}
                onClick={() => handleItemClick(yearListRef, idx)}
                style={{
                  height: ITEM_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  scrollSnapAlign: 'center',
                  fontSize: y === selectedY ? '18px' : '16px',
                  fontWeight: y === selectedY ? '900' : '500',
                  color: y === selectedY ? theme.colors.text : theme.colors.textWeak,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                {y}年
              </div>
            ))}
          </div>

          <div
            ref={monthListRef}
            onScroll={() => handleScroll(monthListRef, 'm')}
            style={{
              flex: 1,
              height: '100%',
              overflowY: 'auto',
              scrollSnapType: 'y mandatory',
              textAlign: 'center',
              zIndex: 1,
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
              pointerEvents: 'auto',
              overscrollBehavior: 'contain',
              paddingTop: ITEM_HEIGHT * 3,
              paddingBottom: ITEM_HEIGHT * 3,
            }}
            className="hide-scrollbar"
          >
            {months.map((m, idx) => (
              <div
                key={m}
                onClick={() => handleItemClick(monthListRef, idx)}
                style={{
                  height: ITEM_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  scrollSnapAlign: 'center',
                  fontSize: m === selectedM ? '18px' : '16px',
                  fontWeight: m === selectedM ? '900' : '500',
                  color: m === selectedM ? theme.colors.text : theme.colors.textWeak,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                {m}月
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const CalendarPage: React.FC<Props> = ({
  artists,
  exhibitions,
  movies,
  onOpenArtist,
  onOpenConcert,
  onOpenExhibition,
  onOpenMovie,
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

  const monthAnchorRef = useRef<HTMLDivElement | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isWheelPickerOpen, setIsWheelPickerOpen] = useState(false);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);

  useEffect(() => {
    setSelectedDateKey(null);
  }, [currentDate.getFullYear(), currentDate.getMonth(), mode]);

  const allEvents = useMemo(() => buildCalendarEvents(artists, { showAttended, showSkipped }, movies), [artists, showAttended, showSkipped, movies]);

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
    if (isWheelPickerOpen) return;
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

  const handleOpenPicker = () => {
    if (monthAnchorRef.current) {
      setAnchorRect(monthAnchorRef.current.getBoundingClientRect());
      setIsWheelPickerOpen(true);
    }
  };

  return (
    <PageShell disablePadding>
      <div style={{ padding: 'calc(12px + env(safe-area-inset-top)) 16px 140px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: '10px', marginBottom: '24px', height: '44px', width: '100%' }}>
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
              <span>{mode === 'concert' ? '公演' : mode === 'exhibition' ? '展覧' : '映画'}</span>
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
                  ].map((item) => (
                    <button key={item.key} onClick={() => { setMode(item.key as CalendarMode); setIsModeMenuOpen(false); }} style={{ width: '100%', border: 'none', background: mode === item.key ? 'rgba(83,190,232,0.12)' : 'transparent', color: mode === item.key ? theme.colors.primary : theme.colors.text, borderRadius: 14, padding: '10px 12px', textAlign: 'left', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>{item.label}</button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div ref={monthAnchorRef} onClick={handleOpenPicker} style={{ justifySelf: 'center', fontSize: '17px', fontWeight: '900', color: theme.colors.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: '6px 10px', borderRadius: '12px', maxWidth: '100%' }}>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
            </span>
            <span style={{ flexShrink: 0, marginLeft: '6px', fontSize: '10px', opacity: 0.35, lineHeight: 1 }}>▼</span>
          </div>

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
            onDayClick={handleDayClick}
          />
        </div>

        <CalendarEventList
          selectedDateKey={selectedDateKey}
          mode={mode}
          selectedDayEvents={selectedDayEvents}
          onOpenMovie={onOpenMovie}
          onOpenExhibition={onOpenExhibition}
          onOpenArtistEvent={handleEventClick}
        />
      </div>

      <WheelPickerPopover
        isOpen={isWheelPickerOpen}
        onClose={() => setIsWheelPickerOpen(false)}
        onConfirm={(y, m) => {
          setCurrentDate(new Date(y, m - 1, 1));
          setIsWheelPickerOpen(false);
        }}
        initialYear={currentDate.getFullYear()}
        initialMonth={currentDate.getMonth() + 1}
        anchorRect={anchorRect}
      />
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
