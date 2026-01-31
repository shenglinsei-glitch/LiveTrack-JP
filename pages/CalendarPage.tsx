import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { PageShell } from '../ui/PageShell';
import { theme } from '../ui/theme';
import { TEXT } from '../ui/constants';
import { Artist, CalendarEvent, CalendarEventType, Exhibition, ExhibitionOverallStatus } from '../domain/types';
import { CalendarMenu } from '../components/CalendarMenu';
import { buildCalendarEvents, EVENT_PRIORITY } from '../domain/logic';
import { Icons } from '../ui/IconButton';
import dayjs from 'dayjs';

interface Props {
  artists: Artist[];
  exhibitions: Exhibition[];
  onOpenArtist: (artistId: string) => void;
  onOpenConcert: (artistId: string, tourId: string, concertId: string) => void;
  onOpenExhibition: (exhibitionId: string) => void;
  onRefreshAll: () => void;
  isMenuOpenExternally?: boolean;
  onMenuClose?: () => void;
}

type CalendarMode = 'concert' | 'exhibition';

const exhibitionPriorityMap: Record<ExhibitionOverallStatus, number> = {
  running: 1,
  preparing: 2,
  visited: 3,
  ended_not_visited: 4,
};

// ====== Music calendar dot rules (restored from legacy CalendarPage.tsx) ======
const typeColorMap: Record<CalendarEventType, string> = {
  [TEXT.CALENDAR.EVENT_CONCERT]: theme.colors.status['参戦予定'],
  [TEXT.CALENDAR.EVENT_RESULT]: theme.colors.status['抽選中'],
  [TEXT.CALENDAR.EVENT_DEADLINE]: theme.colors.status['検討中'],
  [TEXT.CALENDAR.EVENT_SALE]: theme.colors.status['発売前'],
  '展覧会': theme.colors.primary, // Satisfy Record<CalendarEventType, string>
};

const CONCERT_DOT_COLOR_UNDECIDED = '#377D99';
const CONCERT_DOT_COLOR_SKIPPED = '#6B7280';

const isConcertType = (t: any): boolean => t === TEXT.CALENDAR.EVENT_CONCERT || t === '公演';

const getConcertDotColor = (status: string): string => {
  if (status === '参戦予定' || status === '参戦済み') return theme.colors.status['参戦予定'];
  if (status === '抽選中' || status === '発売前' || status === '検討中') return CONCERT_DOT_COLOR_UNDECIDED;
  if (status === '見送' || status === '見送り') return CONCERT_DOT_COLOR_SKIPPED;
  return CONCERT_DOT_COLOR_UNDECIDED;
};

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
          height: POPOVER_HEIGHT,
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '16px',
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
  onOpenArtist,
  onOpenConcert,
  onOpenExhibition,
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

  const monthAnchorRef = useRef<HTMLDivElement | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [isWheelPickerOpen, setIsWheelPickerOpen] = useState(false);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);

  useEffect(() => {
    setSelectedDateKey(null);
  }, [currentDate.getFullYear(), currentDate.getMonth(), mode]);

  const allEvents = useMemo(() => buildCalendarEvents(artists, { showAttended, showSkipped }), [artists, showAttended, showSkipped]);

  const musicEventMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    allEvents.forEach((ev) => {
      const list = map.get(ev.dateKey) || [];
      list.push(ev);
      map.set(ev.dateKey, list);
    });
    return map;
  }, [allEvents]);

  const getExhibitionsForDay = (dateKey: string): Exhibition[] => {
    const day = dayjs(dateKey).startOf('day');
    return exhibitions
      .filter((ex) => {
        const start = dayjs(ex.startDate).startOf('day');
        const end = dayjs(ex.endDate).endOf('day');
        return (day.isAfter(start) || day.isSame(start)) && (day.isBefore(end) || day.isSame(end));
      })
      .sort((a, b) => {
        const prioA = exhibitionPriorityMap[a.exhibitionStatus] || 99;
        const prioB = exhibitionPriorityMap[b.exhibitionStatus] || 99;
        if (prioA !== prioB) return prioA - prioB;
        return dayjs(a.startDate).unix() - dayjs(b.startDate).unix();
      });
  };

  const calendarWeeks = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstOfMonth = dayjs(new Date(year, month, 1));
    const daysInMonth = firstOfMonth.daysInMonth();

    const firstDayIndex = firstOfMonth.day();
    const startOffset = weekStart === 'sun' ? firstDayIndex : firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const cells: Array<{ day: number | null; dateKey: string | null }> = [];
    for (let i = 0; i < startOffset; i++) cells.push({ day: null, dateKey: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateKey });
    }

    const weeks: Array<Array<{ day: number | null; dateKey: string | null }>> = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }, [currentDate, weekStart]);

  const todayKey = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }, []);

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

  const selectedDayEvents = useMemo(() => {
    if (!selectedDateKey) return [];
    if (mode === 'concert') {
      const list = musicEventMap.get(selectedDateKey) || [];
      return [...list].sort((a, b) => {
        if (a.timeLabel && !b.timeLabel) return -1;
        if (!a.timeLabel && b.timeLabel) return 1;
        if (a.timeLabel && b.timeLabel) {
          const timeCmp = a.timeLabel.localeCompare(b.timeLabel);
          if (timeCmp !== 0) return timeCmp;
        }
        return EVENT_PRIORITY[a.type] - EVENT_PRIORITY[b.type];
      });
    }
    return getExhibitionsForDay(selectedDateKey);
  }, [selectedDateKey, musicEventMap, mode, exhibitions]);

  const renderExhibitionRowBars = (week: Array<{ day: number | null; dateKey: string | null }>) => {
    const weekStartDay = week.find((d) => d.dateKey)?.dateKey;
    const weekEndDay = [...week].reverse().find((d) => d.dateKey)?.dateKey;
    if (!weekStartDay || !weekEndDay) return null;

    const startOfWeek = dayjs(weekStartDay).startOf('day');
    const endOfWeek = dayjs(weekEndDay).endOf('day');

    const weekExhibitions = exhibitions
      .filter((ex) => {
        const start = dayjs(ex.startDate).startOf('day');
        const end = dayjs(ex.endDate).endOf('day');
        return (start.isBefore(endOfWeek) || start.isSame(endOfWeek)) && (end.isAfter(startOfWeek) || end.isSame(startOfWeek));
      })
      .sort((a, b) => {
        const prioA = exhibitionPriorityMap[a.exhibitionStatus] || 99;
        const prioB = exhibitionPriorityMap[b.exhibitionStatus] || 99;
        if (prioA !== prioB) return prioA - prioB;
        return dayjs(a.startDate).unix() - dayjs(b.startDate).unix();
      });

    const top2 = weekExhibitions.slice(0, 2);
    const hasMore = weekExhibitions.length > 2;

    return (
      <div style={{ position: 'absolute', inset: 0, top: '28px', pointerEvents: 'none', zIndex: 1, padding: '0 4px' }}>
        {top2.map((ex, idx) => {
          const exStart = dayjs(ex.startDate).startOf('day');
          const exEnd = dayjs(ex.endDate).endOf('day');

          let startCol = -1;
          let endCol = -1;
          week.forEach((d, colIdx) => {
            if (!d.dateKey) return;
            const cur = dayjs(d.dateKey);
            if (cur.isSame(exStart, 'day')) startCol = colIdx;
            if (cur.isSame(exEnd, 'day')) endCol = colIdx;
          });

          if (startCol === -1) startCol = week.findIndex((d) => d.dateKey !== null);
          if (endCol === -1) endCol = 6 - [...week].reverse().findIndex((d) => d.dateKey !== null);

          const left = startCol * (100 / 7) + 0.5;
          const width = (endCol - startCol + 1) * (100 / 7) - 1;
          const shouldShowText = exStart.isAfter(startOfWeek.subtract(1, 'day')) && exStart.isBefore(endOfWeek.add(1, 'day'));

          return (
            <div
              key={ex.id}
              style={{
                position: 'absolute',
                top: `${idx * 8}px`,
                left: `${left}%`,
                width: `${width}%`,
                height: '6px',
                background: theme.colors.primary,
                opacity: idx === 0 ? 0.75 : 0.45,
                borderRadius: '999px',
                display: 'flex',
                alignItems: 'center',
                overflow: 'hidden',
              }}
            >
              {shouldShowText && (
                <span style={{ fontSize: '8px', fontWeight: '900', color: 'white', paddingLeft: '4px', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                  {ex.title}
                </span>
              )}
            </div>
          );
        })}
        {hasMore && <div style={{ position: 'absolute', top: '18px', right: '4px', fontSize: '8px', fontWeight: '900', color: theme.colors.textWeak }}>+{weekExhibitions.length - 2}</div>}
      </div>
    );
  };

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
          <div style={{ display: 'inline-flex', background: 'white', padding: '3px', borderRadius: '999px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', whiteSpace: 'nowrap' }}>
            <button onClick={() => setMode('concert')} style={{ ...modeBtnStyle, background: mode === 'concert' ? theme.colors.primary : 'transparent', color: mode === 'concert' ? 'white' : theme.colors.textSecondary }}>
              公演
            </button>
            <button onClick={() => setMode('exhibition')} style={{ ...modeBtnStyle, background: mode === 'exhibition' ? theme.colors.primary : 'transparent', color: mode === 'exhibition' ? 'white' : theme.colors.textSecondary }}>
              展覧
            </button>
          </div>

          <div ref={monthAnchorRef} onClick={handleOpenPicker} style={{ justifySelf: 'center', fontSize: '17px', fontWeight: '900', color: theme.colors.text, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: '6px 10px', borderRadius: '12px', maxWidth: '100%' }}>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
            </span>
            <span style={{ flexShrink: 0, marginLeft: '6px', fontSize: '10px', opacity: 0.35, lineHeight: 1 }}>▼</span>
          </div>

          <button onClick={onRefreshAll} style={{ border: '1px solid rgba(0,0,0,0.06)', background: 'white', color: '#9CA3AF', fontSize: '12px', fontWeight: 800, padding: '10px', borderRadius: '999px', cursor: 'pointer', whiteSpace: 'nowrap', lineHeight: 0 }} aria-label="refresh">
            <Icons.Refresh />
          </button>
        </div>

        <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ background: 'white', borderRadius: '28px', padding: '16px 10px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden', userSelect: 'none', touchAction: 'pan-y' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '8px' }}>
            {(weekStart === 'sun'
              ? [TEXT.CALENDAR.WEEK_SUN, TEXT.CALENDAR.WEEK_MON, TEXT.CALENDAR.WEEK_TUE, TEXT.CALENDAR.WEEK_WED, TEXT.CALENDAR.WEEK_THU, TEXT.CALENDAR.WEEK_FRI, TEXT.CALENDAR.WEEK_SAT]
              : [TEXT.CALENDAR.WEEK_MON, TEXT.CALENDAR.WEEK_TUE, TEXT.CALENDAR.WEEK_WED, TEXT.CALENDAR.WEEK_THU, TEXT.CALENDAR.WEEK_FRI, TEXT.CALENDAR.WEEK_SAT, TEXT.CALENDAR.WEEK_SUN]
            ).map((l) => (
              <div key={l} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: theme.colors.textSecondary }}>
                {l}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {calendarWeeks.map((week, wIdx) => (
              <div key={wIdx} style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', minHeight: mode === 'exhibition' ? '48px' : '44px' }}>
                {week.map((d, colIdx) => {
                  if (d.day === null) return <div key={`empty-${colIdx}`} />;
                  const isSelected = selectedDateKey === d.dateKey;
                  const isToday = d.dateKey === todayKey;
                  const musicEvents = d.dateKey ? musicEventMap.get(d.dateKey) || [] : [];

                  return (
                    <div key={d.day} onClick={() => d.day && handleDayClick(d.day)} style={{ position: 'relative', padding: '6px 4px 10px 4px', borderRadius: '12px', cursor: 'pointer', background: isSelected ? 'rgba(83, 190, 232, 0.10)' : 'transparent', border: isSelected ? '2px solid rgba(83, 190, 232, 0.55)' : '2px solid transparent', zIndex: 0 }}>
                      <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: isToday ? 900 : 700, color: isToday ? theme.colors.primary : theme.colors.text, lineHeight: 1, paddingTop: '2px' }}>
                        {d.day}
                      </div>

                      {mode === 'concert' && musicEvents.length > 0 && (() => {
                        const sorted = [...musicEvents].sort((a, b) => EVENT_PRIORITY[a.type] - EVENT_PRIORITY[b.type]);
                        const primary = sorted[0];
                        let primaryDotColor: string | null = null;

                        if (primary) {
                          if (isConcertType(primary.type)) primaryDotColor = getConcertDotColor(primary.status);
                          else primaryDotColor = typeColorMap[primary.type] || theme.colors.primary;
                        }

                        return (
                          <div style={{ marginTop: '6px', height: '6px', display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'center' }}>
                            {primaryDotColor && <div style={{ width: '6px', height: '6px', borderRadius: '999px', background: primaryDotColor }} />}
                            {musicEvents.length > 1 && <div style={{ width: '4px', height: '4px', borderRadius: '999px', background: '#CBD5E1' }} />}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
                {mode === 'exhibition' && renderExhibitionRowBars(week)}
              </div>
            ))}
          </div>
        </div>

        {selectedDateKey && (
          <div style={{ marginTop: '32px' }} className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '4px', height: '16px', background: theme.colors.primary, borderRadius: '2px' }} />
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                {selectedDateKey.replace(/-/g, '.')} の予定
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedDayEvents.length === 0 ? (
                <div style={{ color: theme.colors.textWeak, fontWeight: 700, padding: '12px 0' }}>予定はありません</div>
              ) : mode === 'concert' ? (
                (selectedDayEvents as CalendarEvent[]).map((ev, idx) => (
                  <div key={`${ev.concertId}-${ev.type}-${idx}`} onClick={() => handleEventClick(ev)} style={eventCardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: '10px', fontWeight: '800', color: typeColorMap[ev.type] }}>
                          {isConcertType(ev.type) ? 'LIVE' : String(ev.type).substring(0, 2)}
                        </div>
                        {ev.timeLabel && <div style={{ fontSize: '10px', fontWeight: '600', color: theme.colors.textSecondary }}>{ev.timeLabel}</div>}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: theme.colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</div>
                        <div style={{ fontSize: '12px', color: theme.colors.textSecondary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: typeColorMap[ev.type] }} />
                          {ev.type}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: theme.colors.textWeak, padding: '4px 8px', borderRadius: '8px', background: '#F8FAFC' }}>
                        {TEXT.STATUS[ev.status]}
                      </div>
                      <Icons.ChevronLeft style={{ transform: 'rotate(180deg)', width: '16px', height: '16px', color: '#CBD5E1' }} />
                    </div>
                  </div>
                ))
              ) : (
                (selectedDayEvents as Exhibition[]).map((ex) => (
                  <div key={ex.id} style={eventCardStyle} onClick={() => onOpenExhibition(ex.id)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.title}</div>
                      <div style={{ fontSize: '12px', color: theme.colors.textSecondary, fontWeight: 700 }}>
                        {dayjs(ex.startDate).format('YYYY/MM/DD')} 〜 {dayjs(ex.endDate).format('YYYY/MM/DD')}
                        <br />
                        {ex.venueName || ex.venue}
                      </div>
                    </div>
                    <Icons.ChevronLeft style={{ transform: 'rotate(180deg)', width: '16px', height: '16px', color: '#CBD5E1' }} />
                  </div>
                ))
              )}
            </div>
          </div>
        )}
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

      <CalendarMenu isOpen={!!isMenuOpenExternally} onClose={() => onMenuClose?.()} weekStart={weekStart} setWeekStart={setWeekStart} showAttended={showAttended} setShowAttended={setShowAttended} showSkipped={showSkipped} setShowSkipped={setShowSkipped} />
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

const eventCardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '20px',
  padding: '12px 16px',
  border: '1px solid rgba(0,0,0,0.04)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
};