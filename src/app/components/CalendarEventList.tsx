import React from 'react';
import dayjs from 'dayjs';
import { CalendarEvent, Exhibition } from '@/domain/types';
import { Icons } from '@/components/common/IconButton';
import { theme } from '@/components/common/theme';
import { TEXT } from '@/components/common/constants';
import { CalendarMode, getAnimeDotColor, getMovieDotColor, isConcertType, typeColorMap } from '@/domain/calendarHelpers';

interface Props {
  selectedDateKey: string | null;
  mode: CalendarMode;
  selectedDayEvents: Array<CalendarEvent | Exhibition>;
  canExportToSystemCalendar?: boolean;
  onOpenCalendarExport?: () => void;
  onOpenMovie: (movieId: string) => void;
  onOpenAnime?: (animeId: string) => void;
  onOpenExhibition: (exhibitionId: string) => void;
  onOpenArtistEvent: (ev: CalendarEvent) => void;
}

export const CalendarEventList: React.FC<Props> = ({
  selectedDateKey,
  mode,
  selectedDayEvents,
  canExportToSystemCalendar,
  onOpenCalendarExport,
  onOpenMovie,
  onOpenAnime,
  onOpenExhibition,
  onOpenArtistEvent,
}) => {
  if (!selectedDateKey) return null;

  return (
    <div style={{ marginTop: '32px' }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div style={{ width: '4px', height: '16px', background: theme.colors.primary, borderRadius: '2px', flexShrink: 0 }} />
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {selectedDateKey.replace(/-/g, '.')} の予定
          </h3>
        </div>
        {canExportToSystemCalendar && onOpenCalendarExport && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenCalendarExport();
            }}
            style={calendarExportButtonStyle}
          >
            カレンダー追加
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {selectedDayEvents.length === 0 ? (
          <div style={{ color: theme.colors.textWeak, fontWeight: 700, padding: '12px 0' }}>予定はありません</div>
        ) : mode === 'concert' || mode === 'movie' || mode === 'anime' ? (
          (selectedDayEvents as CalendarEvent[])
            .filter((ev) => mode === 'movie' ? ev.type === '映画' : mode === 'anime' ? ev.type === 'アニメ' : ev.type !== '映画' && ev.type !== 'アニメ')
            .map((ev, idx) => (
              <div key={`${ev.movieId || ev.concertId}-${ev.type}-${idx}`} onClick={() => (ev.type === '映画' ? onOpenMovie(ev.movieId || '') : ev.type === 'アニメ' ? onOpenAnime?.(ev.animeId || '') : onOpenArtistEvent(ev))} style={eventCardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: ev.type === '映画' ? getMovieDotColor(ev.status) : ev.type === 'アニメ' ? getAnimeDotColor(ev.status) : typeColorMap[ev.type] }}>
                      {ev.type === '映画' ? 'MOV' : ev.type === 'アニメ' ? 'ANI' : isConcertType(ev.type) ? 'LIVE' : String(ev.type).substring(0, 2)}
                    </div>
                    {ev.timeLabel && <div style={{ fontSize: '10px', fontWeight: '600', color: theme.colors.textSecondary }}>{ev.timeLabel}</div>}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: theme.colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</div>
                    <div style={{ fontSize: '12px', color: theme.colors.textSecondary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: ev.type === '映画' ? getMovieDotColor(ev.status) : ev.type === 'アニメ' ? getAnimeDotColor(ev.status) : typeColorMap[ev.type] }} />
                      {ev.type}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: theme.colors.textWeak, padding: '4px 8px', borderRadius: '8px', background: '#F8FAFC' }}>
                    {ev.type === '映画' || ev.type === 'アニメ' ? ev.status : TEXT.STATUS[ev.status as keyof typeof TEXT.STATUS] || ev.status}
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

const calendarExportButtonStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 999,
  padding: '9px 12px',
  background: 'rgba(83,190,232,0.12)',
  color: theme.colors.primary,
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  boxShadow: '0 6px 16px rgba(83,190,232,0.10)',
};
