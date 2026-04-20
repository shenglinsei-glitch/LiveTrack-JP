import React from 'react';
import dayjs from 'dayjs';
import { CalendarEvent, Exhibition } from '../domain/types';
import { Icons } from '../ui/IconButton';
import { theme } from '../ui/theme';
import { TEXT } from '../ui/constants';
import { CalendarMode, getMovieDotColor, isConcertType, typeColorMap } from '../domain/calendarHelpers';

interface Props {
  selectedDateKey: string | null;
  mode: CalendarMode;
  selectedDayEvents: Array<CalendarEvent | Exhibition>;
  onOpenMovie: (movieId: string) => void;
  onOpenExhibition: (exhibitionId: string) => void;
  onOpenArtistEvent: (ev: CalendarEvent) => void;
}

export const CalendarEventList: React.FC<Props> = ({
  selectedDateKey,
  mode,
  selectedDayEvents,
  onOpenMovie,
  onOpenExhibition,
  onOpenArtistEvent,
}) => {
  if (!selectedDateKey) return null;

  return (
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
        ) : mode === 'concert' || mode === 'movie' ? (
          (selectedDayEvents as CalendarEvent[])
            .filter((ev) => (mode === 'movie' ? ev.type === '映画' : ev.type !== '映画'))
            .map((ev, idx) => (
              <div key={`${ev.movieId || ev.concertId}-${ev.type}-${idx}`} onClick={() => (ev.type === '映画' ? onOpenMovie(ev.movieId || '') : onOpenArtistEvent(ev))} style={eventCardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: ev.type === '映画' ? getMovieDotColor(ev.status) : typeColorMap[ev.type] }}>
                      {ev.type === '映画' ? 'MOV' : isConcertType(ev.type) ? 'LIVE' : String(ev.type).substring(0, 2)}
                    </div>
                    {ev.timeLabel && <div style={{ fontSize: '10px', fontWeight: '600', color: theme.colors.textSecondary }}>{ev.timeLabel}</div>}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: theme.colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</div>
                    <div style={{ fontSize: '12px', color: theme.colors.textSecondary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: ev.type === '映画' ? getMovieDotColor(ev.status) : typeColorMap[ev.type] }} />
                      {ev.type}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: theme.colors.textWeak, padding: '4px 8px', borderRadius: '8px', background: '#F8FAFC' }}>
                    {ev.type === '映画' ? ev.status : TEXT.STATUS[ev.status as keyof typeof TEXT.STATUS] || ev.status}
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
  );
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
