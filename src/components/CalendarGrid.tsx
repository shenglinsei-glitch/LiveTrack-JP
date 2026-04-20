import React from 'react';
import dayjs from 'dayjs';
import { CalendarEvent, Exhibition } from '../domain/types';
import { theme } from '../ui/theme';
import {
  CalendarMode,
  exhibitionPriorityMap,
  getConcertDotColor,
  getMovieDotColor,
  getWeekLabels,
  isConcertType,
  typeColorMap,
} from '../domain/calendarHelpers';
import { EVENT_PRIORITY, getEffectiveExhibitionStatus } from '../domain/logic';

interface Props {
  mode: CalendarMode;
  weekStart: 'sun' | 'mon';
  calendarWeeks: Array<Array<{ day: number | null; dateKey: string | null }>>;
  selectedDateKey: string | null;
  todayKey: string;
  musicEventMap: Map<string, CalendarEvent[]>;
  exhibitions: Exhibition[];
  onDayClick: (day: number) => void;
}

export const CalendarGrid: React.FC<Props> = ({
  mode,
  weekStart,
  calendarWeeks,
  selectedDateKey,
  todayKey,
  musicEventMap,
  exhibitions,
  onDayClick,
}) => {
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
        const prioA = exhibitionPriorityMap[getEffectiveExhibitionStatus(a)] || 99;
        const prioB = exhibitionPriorityMap[getEffectiveExhibitionStatus(b)] || 99;
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

  return (
    <div style={{ background: 'white', borderRadius: '28px', padding: '16px 10px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden', userSelect: 'none', touchAction: 'pan-y' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '8px' }}>
        {getWeekLabels(weekStart).map((l) => (
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
                <div
                  key={d.day}
                  onClick={() => d.day && onDayClick(d.day)}
                  style={{
                    position: 'relative',
                    padding: '6px 4px 10px 4px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(83, 190, 232, 0.10)' : 'transparent',
                    border: isSelected ? '2px solid rgba(83, 190, 232, 0.55)' : '2px solid transparent',
                    zIndex: 0,
                  }}
                >
                  <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: isToday ? 900 : 700, color: isToday ? theme.colors.primary : theme.colors.text, lineHeight: 1, paddingTop: '2px' }}>
                    {d.day}
                  </div>

                  {(mode === 'concert' || mode === 'movie') && musicEvents.length > 0 && (() => {
                    const filteredEvents = mode === 'movie' ? musicEvents.filter((ev) => ev.type === '映画') : musicEvents.filter((ev) => ev.type !== '映画');
                    if (!filteredEvents.length) return null;
                    const sorted = [...filteredEvents].sort((a, b) => EVENT_PRIORITY[a.type] - EVENT_PRIORITY[b.type]);
                    const primary = sorted[0];
                    let primaryDotColor: string | null = null;

                    if (primary) {
                      if (primary.type === '映画') primaryDotColor = getMovieDotColor(primary.status);
                      else if (isConcertType(primary.type)) primaryDotColor = getConcertDotColor(primary.status);
                      else primaryDotColor = typeColorMap[primary.type] || theme.colors.primary;
                    }

                    return (
                      <div style={{ marginTop: '6px', height: '6px', display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'center' }}>
                        {primaryDotColor && <div style={{ width: '6px', height: '6px', borderRadius: '999px', background: primaryDotColor }} />}
                        {filteredEvents.length > 1 && <div style={{ width: '4px', height: '4px', borderRadius: '999px', background: '#CBD5E1' }} />}
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
  );
};
