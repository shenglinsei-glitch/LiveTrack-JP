
import React, { useState, useMemo, useEffect } from 'react';
import { PageShell } from '../ui/PageShell';
import { theme } from '../ui/theme';
import { TEXT } from '../ui/constants';
import { PageId, Status, Artist, CalendarEvent, CalendarEventType } from '../domain/types';
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
  const [weekStart, setWeekStart] = useState<'sun' | 'mon'>('sun');
  
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

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const count = daysInMonth(year, month);
    let startDay = firstDayOfMonth(year, month);
    if (weekStart === 'mon') startDay = startDay === 0 ? 6 : startDay - 1;
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= count; i++) days.push(i);
    return days;
  }, [currentDate, weekStart]);

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
          <div style={{ fontSize: '24px', fontWeight: '900' }}>{currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} style={navBtnStyle}>◀</button>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} style={navBtnStyle}>▶</button>
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
            {(weekStart === 'sun' ? [TEXT.CALENDAR.WEEK_SUN, TEXT.CALENDAR.WEEK_MON, TEXT.CALENDAR.WEEK_TUE, TEXT.CALENDAR.WEEK_WED, TEXT.CALENDAR.WEEK_THU, TEXT.CALENDAR.WEEK_FRI, TEXT.CALENDAR.WEEK_SAT] : [TEXT.CALENDAR.WEEK_MON, TEXT.CALENDAR.WEEK_TUE, TEXT.CALENDAR.WEEK_WED, TEXT.CALENDAR.WEEK_THU, TEXT.CALENDAR.WEEK_FRI, TEXT.CALENDAR.WEEK_SAT, TEXT.CALENDAR.WEEK_SUN]).map(l => (
              <div key={l} style={weekLabelStyle}>{l}</div>
            ))}
            {calendarDays.map((day, idx) => {
              if (day === null) return <div key={idx} />;
              
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

const navBtnStyle = { width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: '#F3F4F6', cursor: 'pointer', fontWeight: 'bold' };
// Added React.CSSProperties to fix TextAlign assignment error
const weekLabelStyle: React.CSSProperties = { textAlign: 'center', fontSize: '11px', fontWeight: '700', color: theme.colors.textSecondary, paddingBottom: '8px' };
const dayCellStyle: React.CSSProperties = { 
  minHeight: '52px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', cursor: 'pointer', position: 'relative', transition: 'all 0.1s ease', padding: '4px 0' 
};
const eventCardStyle: React.CSSProperties = { 
  background: 'white', borderRadius: '24px', padding: '12px 16px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' 
};
