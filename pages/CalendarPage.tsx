import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PageShell } from '../ui/PageShell';
import { theme } from '../ui/theme';
import { TEXT } from '../ui/constants';
import { Artist, CalendarEvent, CalendarEventType } from '../domain/types';
import { CalendarMenu } from '../components/CalendarMenu';
import { buildCalendarEvents, EVENT_PRIORITY } from '../domain/logic';
import { Icons, IconButton } from '../ui/IconButton';

interface Props {
  artists: Artist[];
  onOpenArtist: (artistId: string) => void;
  onOpenConcert: (artistId: string, tourId: string, concertId: string) => void;
  onRefreshAll: () => void;
}

const typeColorMap: Record<CalendarEventType, string> = {
  [TEXT.CALENDAR.EVENT_CONCERT]: theme.colors.status['参戦予定'],
  [TEXT.CALENDAR.EVENT_RESULT]: theme.colors.status['抽選中'],
  [TEXT.CALENDAR.EVENT_DEADLINE]: theme.colors.status['検討中'],
  [TEXT.CALENDAR.EVENT_SALE]: theme.colors.status['発売前'],
};

export const CalendarPage: React.FC<Props> = ({ artists, onOpenArtist, onOpenConcert, onRefreshAll }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [weekStart, setWeekStart] = useState<'sun' | 'mon'>('mon');

  const [yearOpen, setYearOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);
  const yearBtnRef = useRef<HTMLButtonElement | null>(null);
  const monthBtnRef = useRef<HTMLButtonElement | null>(null);
  const yearPopoverRef = useRef<HTMLDivElement | null>(null);
  const monthPopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!yearOpen && !monthOpen) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      const insideYear =
        (yearBtnRef.current && target && yearBtnRef.current.contains(target)) ||
        (yearPopoverRef.current && target && yearPopoverRef.current.contains(target));
      const insideMonth =
        (monthBtnRef.current && target && monthBtnRef.current.contains(target)) ||
        (monthPopoverRef.current && target && monthPopoverRef.current.contains(target));

      if (!insideYear) setYearOpen(false);
      if (!insideMonth) setMonthOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown as any);
    };
  }, [yearOpen, monthOpen]);

  
  const [showAttended, setShowAttended] = useState(true);
  const [showSkipped, setShowSkipped] = useState(true);

  useEffect(() => {
    setSelectedDateKey(null);
  }, [currentDate.getFullYear(), currentDate.getMonth()]);

  const allEvents = useMemo(() => {
    return buildCalendarEvents(artists, { showAttended, showSkipped });
  }, [artists, showAttended, showSkipped]);

  const eventMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    allEvents.forEach(ev => {
      const list = map.get(ev.dateKey) || [];
      list.push(ev);
      map.set(ev.dateKey, list);
    });
    return map;
  }, [allEvents]);

  // --- 修正后的日历核心绘制逻辑 ---
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const count = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    
    let startOffset = 0;
    if (weekStart === 'sun') {
      startOffset = firstDayIndex;
    } else {
      startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    }

    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= count; i++) days.push(i);
    
    return days;
  }, [currentDate, weekStart]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);
  }, []);

  const handleDayClick = (day: number) => {
    const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDateKey(dateKey === selectedDateKey ? null : dateKey);
  };

  const handleEventClick = (ev: CalendarEvent) => {
    if (ev.status === '参戦予定' || ev.status === '参戦済み') {
      onOpenConcert(ev.artistId, ev.tourId, ev.concertId);
    } else {
      onOpenArtist(ev.artistId);
    }
  };

  const selectedDayEvents = useMemo(() => {
    if (!selectedDateKey) return [];
    const list = eventMap.get(selectedDateKey) || [];
    return [...list].sort((a, b) => {
      if (a.timeLabel && !b.timeLabel) return -1;
      if (!a.timeLabel && b.timeLabel) return 1;
      if (a.timeLabel && b.timeLabel) {
        const timeCmp = a.timeLabel.localeCompare(b.timeLabel);
        if (timeCmp !== 0) return timeCmp;
      }
      return EVENT_PRIORITY[a.type] - EVENT_PRIORITY[b.type];
    });
  }, [selectedDateKey, eventMap]);

  return (
    <PageShell
      header={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
            {TEXT.GLOBAL.APP_TITLE} <span style={{ color: '#53BEE8' }}>JP</span>
          </h1>
          <button 
            onClick={onRefreshAll}
            style={{ padding: '12px', borderRadius: '9999px', background: 'white', border: '1px solid #F3F4F6', color: '#9CA3AF', cursor: 'pointer', outline: 'none' }}
          >
            <Icons.Refresh />
          </button>
        </div>
      }
    >
      <div style={{ paddingBottom: '120px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          {/* --- 年月选择器（方案A：胶囊按钮 + Popover） --- */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Year */}
            <div style={{ position: 'relative' }}>
              <button
                ref={yearBtnRef}
                type="button"
                onClick={() => {
                  setYearOpen(v => !v);
                  setMonthOpen(false);
                }}
                style={pickerBtnStyle}
                aria-haspopup="dialog"
                aria-expanded={yearOpen}
              >
                <span style={{ fontWeight: 900 }}>{currentDate.getFullYear()}年</span>
                <span style={chevStyle}>▾</span>
              </button>

              {yearOpen && (
                <div ref={yearPopoverRef} style={popoverStyle}>
                  <div style={popoverHeaderStyle}>年を選択</div>
                  <div style={popoverScrollStyle}>
                    {years.map(y => {
                      const active = y === currentDate.getFullYear();
                      return (
                        <button
                          key={y}
                          type="button"
                          onClick={() => {
                            setCurrentDate(new Date(y, currentDate.getMonth(), 1));
                            setYearOpen(false);
                          }}
                          style={{
                            ...popoverItemStyle,
                            ...(active ? popoverItemActiveStyle : null),
                          }}
                        >
                          {y}年
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Month */}
            <div style={{ position: 'relative' }}>
              <button
                ref={monthBtnRef}
                type="button"
                onClick={() => {
                  setMonthOpen(v => !v);
                  setYearOpen(false);
                }}
                style={pickerBtnStyle}
                aria-haspopup="dialog"
                aria-expanded={monthOpen}
              >
                <span style={{ fontWeight: 900 }}>{currentDate.getMonth() + 1}月</span>
                <span style={chevStyle}>▾</span>
              </button>

              {monthOpen && (
                <div ref={monthPopoverRef} style={{ ...popoverStyle, width: 248 }}>
                  <div style={popoverHeaderStyle}>月を選択</div>
                  <div style={monthGridStyle}>
                    {Array.from({ length: 12 }, (_, i) => {
                      const active = i === currentDate.getMonth();
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setCurrentDate(new Date(currentDate.getFullYear(), i, 1));
                            setMonthOpen(false);
                          }}
                          style={{
                            ...monthCellStyle,
                            ...(active ? monthCellActiveStyle : null),
                          }}
                        >
                          {i + 1}月
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setYearOpen(false); setMonthOpen(false); setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)); }} style={navBtnStyle}>◀</button>
            <button onClick={() => { setYearOpen(false); setMonthOpen(false); setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)); }} style={navBtnStyle}>▶</button>
          </div>
        </div>

        <div style={{ 
          background: 'white', 
          borderRadius: '28px', 
          padding: '16px 12px', 
          border: '1px solid rgba(0,0,0,0.04)', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)' 
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {(weekStart === 'sun' 
              ? [TEXT.CALENDAR.WEEK_SUN, TEXT.CALENDAR.WEEK_MON, TEXT.CALENDAR.WEEK_TUE, TEXT.CALENDAR.WEEK_WED, TEXT.CALENDAR.WEEK_THU, TEXT.CALENDAR.WEEK_FRI, TEXT.CALENDAR.WEEK_SAT] 
              : [TEXT.CALENDAR.WEEK_MON, TEXT.CALENDAR.WEEK_TUE, TEXT.CALENDAR.WEEK_WED, TEXT.CALENDAR.WEEK_THU, TEXT.CALENDAR.WEEK_FRI, TEXT.CALENDAR.WEEK_SAT, TEXT.CALENDAR.WEEK_SUN]
            ).map(l => (
              <div key={l} style={weekLabelStyle}>{l}</div>
            ))}
            
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />;
              
              const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const events = eventMap.get(dateKey) || [];
              const isSelected = selectedDateKey === dateKey;

              let primaryDotColor = null;
              if (events.length > 0) {
                const sorted = [...events].sort((a, b) => EVENT_PRIORITY[a.type] - EVENT_PRIORITY[b.type]);
                primaryDotColor = typeColorMap[sorted[0].type];
              }
              
              return (
                <div 
                  key={day} 
                  onClick={() => handleDayClick(day)} 
                  style={{ 
                    ...dayCellStyle,
                    background: isSelected ? 'rgba(83, 190, 232, 0.1)' : 'transparent', 
                    border: isSelected ? '2px solid #53BEE8' : 'none', 
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: isSelected ? '800' : '600', marginBottom: '4px' }}>{day}</span>
                  <div style={{ height: '6px', display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'center' }}>
                    {primaryDotColor && (
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: primaryDotColor }} />
                    )}
                    {events.length > 1 && (
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#CBD5E1' }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedDateKey && selectedDayEvents.length > 0 && (
          <div style={{ marginTop: '32px' }} className="fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '4px', height: '16px', background: theme.colors.primary, borderRadius: '2px' }} />
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                {selectedDateKey.replace(/-/g, '.')} の予定
              </h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedDayEvents.map((ev, idx) => (
                <div 
                  key={`${ev.concertId}-${ev.type}-${idx}`} 
                  onClick={() => handleEventClick(ev)}
                  style={eventCardStyle}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      width: '44px', 
                      height: '44px', 
                      borderRadius: '12px', 
                      background: 'rgba(0,0,0,0.03)', 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <div style={{ fontSize: '10px', fontWeight: '800', color: typeColorMap[ev.type] }}>{ev.type === TEXT.CALENDAR.EVENT_CONCERT ? 'LIVE' : ev.type.substring(0,2)}</div>
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
              ))}
            </div>
          </div>
        )}
      </div>

      <IconButton 
        icon={isMenuOpen ? <Icons.X /> : <Icons.Plus />} 
        primary 
        size={64}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        style={{ 
          position: 'fixed', 
          right: '16px', 
          bottom: 'calc(16px + env(safe-area-inset-bottom))', 
          zIndex: 110, 
          boxShadow: '0 8px 24px -6px rgba(83, 190, 232, 0.5)' 
        }}
      />

      <CalendarMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        weekStart={weekStart} 
        setWeekStart={setWeekStart}
        showAttended={showAttended}
        setShowAttended={setShowAttended}
        showSkipped={showSkipped}
        setShowSkipped={setShowSkipped}
      />
    </PageShell>
  );
};

const navBtnStyle: React.CSSProperties = { width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: '#F3F4F6', color: '#111827', WebkitTextFillColor: '#111827', cursor: 'pointer', fontWeight: 900, fontSize: '18px', lineHeight: 1 };
const weekLabelStyle: React.CSSProperties = { textAlign: 'center', fontSize: '11px', fontWeight: '700', color: theme.colors.textSecondary, paddingBottom: '8px' };
const dayCellStyle: React.CSSProperties = { 
  minHeight: '52px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', cursor: 'pointer', position: 'relative', transition: 'all 0.1s ease', padding: '4px 0' 
};
const eventCardStyle: React.CSSProperties = { 
  background: 'white', borderRadius: '24px', padding: '12px 16px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' 
};
const pickerBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  borderRadius: '9999px',
  border: '1px solid rgba(0,0,0,0.06)',
  background: 'rgba(255,255,255,0.88)',
  boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
  fontSize: 'clamp(16px, 3.2vw, 20px)',
  fontWeight: 900,
  color: '#111827',
  WebkitTextFillColor: '#111827',
  cursor: 'pointer',
  outline: 'none',
  lineHeight: 1,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
};

const chevStyle: React.CSSProperties = {
  fontSize: '18px',
  color: 'rgba(17,24,39,0.55)',
  transform: 'translateY(1px)',
};

const popoverStyle: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 10px)',
  left: 0,
  width: 220,
  borderRadius: '18px',
  border: '1px solid rgba(0,0,0,0.06)',
  background: 'rgba(255,255,255,0.92)',
  boxShadow: '0 18px 46px rgba(0,0,0,0.10)',
  overflow: 'hidden',
  zIndex: 80,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
};

const popoverHeaderStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: '12px',
  fontWeight: 800,
  letterSpacing: '0.06em',
  color: 'rgba(17,24,39,0.55)',
  borderBottom: '1px solid rgba(0,0,0,0.06)',
};

const popoverScrollStyle: React.CSSProperties = {
  maxHeight: '240px',
  overflowY: 'auto',
  padding: '6px',
};

const popoverItemStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  padding: '10px 10px',
  borderRadius: '14px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: 800,
  color: '#111827',
};

const popoverItemActiveStyle: React.CSSProperties = {
  background: 'rgba(83, 190, 232, 0.12)',
  boxShadow: 'inset 0 0 0 2px rgba(83, 190, 232, 0.35)',
};

const monthGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '8px',
  padding: '10px',
};

const monthCellStyle: React.CSSProperties = {
  padding: '10px 0',
  borderRadius: '14px',
  border: '1px solid rgba(0,0,0,0.06)',
  background: 'rgba(255,255,255,0.7)',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 900,
  color: '#111827',
};

const monthCellActiveStyle: React.CSSProperties = {
  background: 'rgba(83, 190, 232, 0.12)',
  border: '1px solid rgba(83, 190, 232, 0.35)',
  boxShadow: '0 10px 22px rgba(83, 190, 232, 0.18)',
};