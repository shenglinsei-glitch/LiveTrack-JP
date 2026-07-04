import React from 'react';
import dayjs from 'dayjs';
import { CalendarEvent, Exhibition } from '@/domain/types';
import { theme } from '@/components/common/theme';
import {
  CalendarMode,
  exhibitionPriorityMap,
  getConcertDotColor,
  getAnimeDotColor,
  getMovieDotColor,
  getWeekLabels,
  isConcertType,
  typeColorMap,
} from '@/domain/calendarHelpers';
import { EVENT_PRIORITY, getEffectiveExhibitionStatus } from '@/domain/logic';

interface Props {
  mode: CalendarMode;
  weekStart: 'sun' | 'mon';
  calendarWeeks: Array<Array<{ day: number | null; dateKey: string | null }>>;
  selectedDateKey: string | null;
  todayKey: string;
  musicEventMap: Map<string, CalendarEvent[]>;
  exhibitions: Exhibition[];
  currentDate: Date;
  monthInputValue: string;
  onMonthChange: (value: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
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
  currentDate,
  monthInputValue,
  onMonthChange,
  onPreviousMonth,
  onNextMonth,
  onDayClick,
}) => {
  const [supportsMonthInput, setSupportsMonthInput] = React.useState(true);

  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const testInput = document.createElement('input');
    testInput.setAttribute('type', 'month');
    setSupportsMonthInput(testInput.type === 'month');
  }, []);

  const handleNativeInputClick = (event: React.MouseEvent<HTMLInputElement>) => {
    event.stopPropagation();

    const inputWithPicker = event.currentTarget as HTMLInputElement & { showPicker?: () => void };
    if (typeof inputWithPicker.showPicker !== 'function') return;

    try {
      inputWithPicker.showPicker();
    } catch {
      // iOS Safari does not support showPicker; direct tapping the input still opens the native picker.
    }
  };

  const monthNativeInputStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    opacity: 0.001,
    border: 'none',
    padding: 0,
    margin: 0,
    cursor: 'pointer',
    background: 'transparent',
    color: 'transparent',
    zIndex: 2,
  };

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
      <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 44px', alignItems: 'center', gap: '6px', marginBottom: '14px', padding: '0 6px 2px' }}>
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onPreviousMonth(); }}
          onTouchStart={(event) => event.stopPropagation()}
          aria-label="previous month"
          style={{ border: 'none', background: 'transparent', color: theme.colors.textSecondary, fontSize: '28px', fontWeight: 600, lineHeight: 1, height: 40, borderRadius: 14, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
        >
          ‹
        </button>

        <div
          role="button"
          aria-label="年月を選択"
          style={{
            position: 'relative',
            justifySelf: 'center',
            fontSize: '18px',
            fontWeight: '900',
            color: theme.colors.text,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            minWidth: 0,
            padding: '6px 10px',
            borderRadius: '12px',
            maxWidth: '100%',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
            {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
          </span>
          <span style={{ flexShrink: 0, marginLeft: '6px', fontSize: '10px', opacity: 0.35, lineHeight: 1, pointerEvents: 'none' }}>▼</span>

          {supportsMonthInput ? (
            <input
              className="calendar-month-native-input"
              aria-label="年月を選択"
              type="month"
              value={monthInputValue}
              onClick={handleNativeInputClick}
              onTouchStart={(event) => event.stopPropagation()}
              onChange={(e) => onMonthChange(e.target.value)}
              style={monthNativeInputStyle}
            />
          ) : (
            <input
              className="calendar-month-native-input"
              aria-label="年月を選択"
              type="date"
              value={`${monthInputValue}-01`}
              onClick={handleNativeInputClick}
              onTouchStart={(event) => event.stopPropagation()}
              onChange={(e) => onMonthChange(e.target.value.slice(0, 7))}
              style={monthNativeInputStyle}
            />
          )}
        </div>

        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onNextMonth(); }}
          onTouchStart={(event) => event.stopPropagation()}
          aria-label="next month"
          style={{ border: 'none', background: 'transparent', color: theme.colors.textSecondary, fontSize: '28px', fontWeight: 600, lineHeight: 1, height: 40, borderRadius: 14, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
        >
          ›
        </button>
      </div>

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

                  {(mode === 'concert' || mode === 'movie' || mode === 'anime') && musicEvents.length > 0 && (() => {
                    const filteredEvents = mode === 'movie'
                      ? musicEvents.filter((ev) => ev.type === '映画')
                      : mode === 'anime'
                        ? musicEvents.filter((ev) => ev.type === 'アニメ')
                        : musicEvents.filter((ev) => ev.type !== '映画' && ev.type !== 'アニメ');
                    if (!filteredEvents.length) return null;
                    const sorted = [...filteredEvents].sort((a, b) => EVENT_PRIORITY[a.type] - EVENT_PRIORITY[b.type]);
                    const primary = sorted[0];
                    let primaryDotColor: string | null = null;

                    if (primary) {
                      if (primary.type === '映画') primaryDotColor = getMovieDotColor(primary.status);
                      else if (primary.type === 'アニメ') primaryDotColor = getAnimeDotColor(primary.status);
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
