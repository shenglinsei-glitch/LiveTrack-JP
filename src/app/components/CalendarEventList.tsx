import React from 'react';
import dayjs from 'dayjs';
import { CalendarEvent, Exhibition } from '@/domain/types';
import { Icons } from '@/components/common/IconButton';
import { theme } from '@/components/common/theme';
import { TEXT } from '@/components/common/constants';
import { CalendarMode, getCalendarEventDotColor, getVisibleCalendarEventsForMode, isNonParticipatingCalendarEvent } from '@/domain/calendarHelpers';

interface Props {
  selectedDateKey: string | null;
  mode: CalendarMode;
  selectedDayEvents: Array<CalendarEvent | Exhibition>;
  monthEvents: CalendarEvent[];
  monthExhibitions: Exhibition[];
  canExportToSystemCalendar?: boolean;
  onOpenCalendarExport?: () => void;
  onOpenMovie: (movieId: string) => void;
  onOpenAnime?: (animeId: string) => void;
  onOpenExhibition: (exhibitionId: string) => void;
  onOpenGacha?: (gachaId: string) => void;
  onOpenArtistEvent: (ev: CalendarEvent) => void;
}

export const CalendarEventList: React.FC<Props> = ({
  selectedDateKey,
  mode,
  selectedDayEvents,
  monthEvents,
  monthExhibitions,
  canExportToSystemCalendar,
  onOpenCalendarExport,
  onOpenMovie,
  onOpenAnime,
  onOpenExhibition,
  onOpenGacha,
  onOpenArtistEvent,
}) => {
  const renderCalendarEventCard = (ev: CalendarEvent, idx: number, showDate = false) => {
    const isMuted = isNonParticipatingCalendarEvent(ev);
    const eventColor = getCalendarEventListColor(ev);
    const eventCode = ev.type === '映画' ? 'MOV' : ev.type === 'アニメ' ? 'ANI' : ev.type === '展覧' ? 'EXH' : ev.type === 'ガチャ' ? 'GAC' : 'LIVE';
    const statusLabel = ev.type === '映画' || ev.type === 'アニメ' || ev.type === '展覧' || ev.type === 'ガチャ' ? ev.status : TEXT.STATUS[ev.status as keyof typeof TEXT.STATUS] || ev.status;
    const statusBadgeStyle = getEventStatusBadgeStyle(eventColor, isMuted);
    const handleClick = () => {
      if (ev.type === '映画') onOpenMovie(ev.movieId || '');
      else if (ev.type === 'アニメ') onOpenAnime?.(ev.animeId || '');
      else if (ev.type === '展覧') onOpenExhibition(ev.exhibitionId || '');
      else if (ev.type === 'ガチャ') onOpenGacha?.(ev.gachaId || '');
      else onOpenArtistEvent(ev);
    };

    return (
      <div key={`${ev.dateKey}-${ev.movieId || ev.animeId || ev.exhibitionId || ev.gachaId || ev.concertId}-${ev.type}-${ev.status}-${idx}`} onClick={handleClick} style={isMuted ? mutedEventCardStyle : eventCardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: showDate ? '11px' : '10px', fontWeight: '800', color: eventColor }}>
              {showDate ? dayjs(ev.dateKey).format('M/D') : eventCode}
            </div>
            {(showDate || ev.timeLabel) && (
              <div style={{ fontSize: '10px', fontWeight: '600', color: theme.colors.textSecondary, lineHeight: 1.15 }}>
                {ev.timeLabel || eventCode}
              </div>
            )}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: '800', color: isMuted ? theme.colors.textSecondary : theme.colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</div>
            <div style={{ fontSize: '12px', color: isMuted ? theme.colors.textWeak : theme.colors.textSecondary, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: eventColor }} />
              {ev.type}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={statusBadgeStyle}>
            {statusLabel}
          </div>
          <Icons.ChevronLeft style={{ transform: 'rotate(180deg)', width: '16px', height: '16px', color: '#CBD5E1' }} />
        </div>
      </div>
    );
  };

  const renderExhibitionCard = (ex: Exhibition) => (
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
  );

  const isEventMode = mode === 'all' || mode === 'concert' || mode === 'movie' || mode === 'anime' || mode === 'gacha';
  const headerText = selectedDateKey
    ? `${selectedDateKey.replace(/-/g, '.')} の予定`
    : 'これからの予定';

  const sortMutedEventsLast = (events: CalendarEvent[]) => [...events].sort((a, b) => {
    const mutedA = isNonParticipatingCalendarEvent(a) ? 1 : 0;
    const mutedB = isNonParticipatingCalendarEvent(b) ? 1 : 0;
    return mutedA - mutedB;
  });

  const visibleSelectedEvents = isEventMode ? sortMutedEventsLast(getVisibleCalendarEventsForMode(selectedDayEvents as CalendarEvent[], mode)) : [];
  const visibleMonthEvents = isEventMode ? getVisibleCalendarEventsForMode(monthEvents, mode).filter((ev) => !isNonParticipatingCalendarEvent(ev)) : [];
  const isEmpty = selectedDateKey
    ? (isEventMode ? visibleSelectedEvents.length === 0 : selectedDayEvents.length === 0)
    : (isEventMode ? visibleMonthEvents.length === 0 : monthExhibitions.length === 0);

  return (
    <div style={{ marginTop: '32px' }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div style={{ width: '4px', height: '16px', background: theme.colors.primary, borderRadius: '2px', flexShrink: 0 }} />
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {headerText}
          </h3>
        </div>
        {selectedDateKey && canExportToSystemCalendar && onOpenCalendarExport && (
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
        {isEmpty ? (
          <div style={{ color: theme.colors.textWeak, fontWeight: 700, padding: '12px 0' }}>{selectedDateKey ? '予定はありません' : 'これからの予定はありません'}</div>
        ) : selectedDateKey ? (
          isEventMode
            ? visibleSelectedEvents.map((ev, idx) => renderCalendarEventCard(ev, idx, false))
            : (selectedDayEvents as Exhibition[]).map(renderExhibitionCard)
        ) : (
          isEventMode
            ? visibleMonthEvents.map((ev, idx) => renderCalendarEventCard(ev, idx, true))
            : monthExhibitions.map(renderExhibitionCard)
        )}
      </div>
    </div>
  );
};

const softBgFromColor = (color: string, alpha = 0.12) => {
  const hex = color.replace('#', '').trim();
  if (hex.length !== 6) return 'rgba(83,190,232,0.12)';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const getCalendarEventListColor = (ev: CalendarEvent): string => {
  if (isNonParticipatingCalendarEvent(ev)) return theme.colors.status['見送'];
  const statusColor = theme.colors.status[ev.status as keyof typeof theme.colors.status];
  return statusColor || getCalendarEventDotColor(ev);
};

const getEventStatusBadgeStyle = (color: string, isMuted: boolean): React.CSSProperties => ({
  fontSize: '11px',
  fontWeight: '800',
  color: isMuted ? theme.colors.status['見送'] : color,
  padding: '4px 8px',
  borderRadius: '8px',
  background: isMuted ? theme.colors.badges.skipped.bg : softBgFromColor(color, 0.10),
  whiteSpace: 'nowrap',
});

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

const mutedEventCardStyle: React.CSSProperties = {
  ...eventCardStyle,
  background: 'rgba(255,255,255,0.72)',
  border: '1px solid rgba(156,163,175,0.14)',
  boxShadow: '0 4px 12px rgba(15,23,42,0.02)',
  opacity: 0.78,
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
