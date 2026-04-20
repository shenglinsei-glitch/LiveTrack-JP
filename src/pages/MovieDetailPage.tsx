import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';
import { Movie, MovieStatus, MovieTicketType } from '../domain/types';
import { theme } from '../ui/theme';
import { Icons, IconButton } from '../ui/IconButton';
import { GlassCard } from '../ui/GlassCard';
import { Label, Value, SubValue, SectionTitle } from '../components/detail/DetailText';
import { DetailHeader, DetailChip, DetailLinkIconButton } from '../components/detail/DetailHeader';
import { DetailPageLayout } from '../components/detail/DetailPageLayout';

interface MovieDetailPageProps {
  movie: Movie;
  onUpdateMovie: (movie: Movie) => void;
  onDeleteMovie: (id: string) => void;
  onBack: () => void;
  initialEditMode?: boolean;
}

const NORMAL_STATUSES: MovieStatus[] = ['未上映', '上映中', '鑑賞済み', '見送り', '上映終了'];
const STAGE_GREETING_STATUSES: MovieStatus[] = ['未上映', '発売前', '抽選中', '上映中', '鑑賞予定', '鑑賞済み', '見送り', '上映終了'];
const TICKET_TYPES: MovieTicketType[] = ['通常', '舞台挨拶'];

const statusTone = (status: MovieStatus) => {
  switch (status) {
    case '未上映': return { bg: '#9CA3AF', label: '未上映' };
    case '発売前': return { bg: '#F59E0B', label: '発売前' };
    case '抽選中': return { bg: '#F59E0B', label: '抽選中' };
    case '上映中': return { bg: '#53BEE8', label: '上映中' };
    case '鑑賞予定': return { bg: '#3B82F6', label: '鑑賞予定' };
    case '鑑賞済み': return { bg: '#10B981', label: '鑑賞済み' };
    case '見送り': return { bg: '#6B7280', label: '見送り' };
    default: return { bg: '#94A3B8', label: '上映終了' };
  }
};

const week = ['日', '月', '火', '水', '木', '金', '土'];
const formatDateWithWeek = (date?: string) => {
  if (!date) return ''; 
  const d = dayjs(date);
  if (!d.isValid()) return ''; 
  return `${d.format('YYYY/MM/DD')}（${week[d.day()]}）`;
};
const formatDateTimeWithWeek = (value?: string) => {
  if (!value) return ''; 
  const d = dayjs(value.replace('T', ' '));
  if (!d.isValid()) return ''; 
  return `${d.format('YYYY/MM/DD')}（${week[d.day()]}） ${d.format('HH:mm')}`;
};
const calcDuration = (start?: string, end?: string) => {
  if (!start || !end) return '';
  const s = dayjs(`2000-01-01 ${start}`);
  const e = dayjs(`2000-01-01 ${end}`);
  if (!s.isValid() || !e.isValid()) return '';
  const diff = e.diff(s, 'minute');
  if (diff <= 0) return '';
  return `${Math.floor(diff / 60)}時間${diff % 60}分`;
};

const getEffectiveMovieStatus = (movie: Movie): MovieStatus => {
  const now = dayjs();
  const watchAt = movie.watchDate
    ? dayjs(`${movie.watchDate}${movie.startTime ? ` ${movie.startTime}` : ''}`.trim())
    : null;
  const releaseAt = movie.releaseDate ? dayjs(movie.releaseDate) : null;

  if (watchAt?.isValid() && (watchAt.isBefore(now) || watchAt.isSame(now))) return '鑑賞済み';
  if (movie.status === '鑑賞済み' || movie.status === '見送り' || movie.status === '上映終了') return movie.status;
  if (movie.ticketType === '舞台挨拶' && movie.status === '発売前') return '発売前';
  if (movie.ticketType === '舞台挨拶' && movie.status === '抽選中') return '抽選中';
  if (movie.ticketType === '舞台挨拶' && movie.status === '鑑賞予定') return '鑑賞予定';
  if (releaseAt?.isValid() && (releaseAt.isBefore(now) || releaseAt.isSame(now))) return movie.watchDate ? '鑑賞済み' : '上映中';
  return movie.status;
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  maxWidth: '100%',
  boxSizing: 'border-box',
  minHeight: 54,
  borderRadius: 18,
  border: '1px solid rgba(15,23,42,0.08)',
  background: 'rgba(255,255,255,0.85)',
  padding: '0 16px',
  fontSize: 15,
  color: theme.colors.text,
  outline: 'none',
};

const staticInputStyle: React.CSSProperties = {
  ...inputStyle,
  display: 'flex',
  alignItems: 'center',
  color: theme.colors.textSecondary,
};

const sectionCardStyle: React.CSSProperties = {
  marginBottom: 14,
};

const collapseButtonStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  textAlign: 'left',
};

const infoGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(0, 1fr))',
  gap: 16,
};

const ViewSection: React.FC<{
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  countLabel?: string;
}> = ({ title, defaultOpen = true, children, countLabel }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <GlassCard padding="20px" style={sectionCardStyle}>
      <button type="button" onClick={() => setOpen((v) => !v)} style={collapseButtonStyle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <SectionTitle title={title} style={{ marginTop: 0, marginBottom: open ? 12 : 0 }} dividerStyle={{ opacity: open ? 1 : 0 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 2 }}>
          {countLabel ? (
            <span style={{ fontSize: 11, fontWeight: 800, color: theme.colors.textWeak, whiteSpace: 'nowrap' }}>{countLabel}</span>
          ) : null}
          <Icons.ChevronLeft style={{ width: 18, height: 18, color: theme.colors.textWeak, transform: open ? 'rotate(-90deg)' : 'rotate(180deg)', transition: 'transform 0.2s ease' }} />
        </div>
      </button>
      {open ? children : null}
    </GlassCard>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: 800, marginLeft: 4 }}>{label}</label>
    {children}
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <GlassCard style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 14, fontWeight: 900, color: theme.colors.text, marginBottom: 14 }}>{title}</div>
    <div style={{ display: 'grid', gap: 14 }}>{children}</div>
  </GlassCard>
);

export const MovieDetailPage: React.FC<MovieDetailPageProps> = ({ movie, onUpdateMovie, onDeleteMovie, onBack, initialEditMode = false }) => {
  const [isEditMode, setIsEditMode] = useState(initialEditMode);
  const [formData, setFormData] = useState<Movie>(movie);

  useEffect(() => {
    setFormData(movie);
  }, [movie]);

  const effectiveStatus = getEffectiveMovieStatus(formData);
  const tone = statusTone(effectiveStatus);
  const durationLabel = calcDuration(formData.startTime, formData.endTime);
  const hasPosterLink = !!formData.posterUrl;
  const hasLotteryLink = !!(formData.status === '発売前' ? formData.saleLink : formData.lotteryUrl);
  const movieLotteryHistory = useMemo(() => ([...(formData.lotteryHistory || [])].sort((a, b) => dayjs(b.at).valueOf() - dayjs(a.at).valueOf())), [formData.lotteryHistory]);
  const availableStatuses = formData.ticketType === '舞台挨拶' ? STAGE_GREETING_STATUSES : NORMAL_STATUSES;

  const updateField = (field: keyof Movie, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const save = () => {
    const nextStatus = getEffectiveMovieStatus(formData);
    const nextMovie: Movie = {
      ...formData,
      status: nextStatus,
      lotteryName: formData.ticketType === '舞台挨拶' && nextStatus === '抽選中' ? formData.lotteryName : '',
      lotteryUrl: formData.ticketType === '舞台挨拶' && nextStatus === '抽選中' ? formData.lotteryUrl : '',
      lotteryResultAt: formData.ticketType === '舞台挨拶' && nextStatus === '抽選中' ? formData.lotteryResultAt : '',
      updatedAt: new Date().toISOString(),
    };
    onUpdateMovie(nextMovie);
    setFormData(nextMovie);
    setIsEditMode(false);
  };

  const Input: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string; readOnly?: boolean; type?: string; suffix?: string }> = ({ value, onChange, placeholder, readOnly, type = 'text', suffix }) => (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly} type={type} style={inputStyle} />
      {suffix && <span style={{ position: 'absolute', right: 16, fontSize: 14, color: theme.colors.textSecondary, fontWeight: 800 }}>{suffix}</span>}
    </div>
  );

  const StaticText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={staticInputStyle}>{children}</div>
  );

  const SelectRow: React.FC<{ options: string[]; value: string; onChange: (v: string) => void }> = ({ options, value, onChange }) => (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => onChange(opt)} style={{ flex: 1, minWidth: 80, padding: '12px', borderRadius: '14px', border: opt === value ? `2px solid ${theme.colors.primary}` : '1px solid rgba(0,0,0,0.08)', background: opt === value ? 'rgba(83,190,232,0.08)' : 'white', color: opt === value ? theme.colors.primary : theme.colors.text, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
          {opt}
        </button>
      ))}
    </div>
  );

  
  const ModalDatePicker: React.FC<{ value?: string; onChange: (v: string) => void; showTime?: boolean; timeOnly?: boolean; placeholder?: string }> = ({ value, onChange, showTime = false, timeOnly = false, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const valStr = value || '';
    const initialDateStr = valStr && !timeOnly ? valStr.split(' ')[0] : dayjs().format('YYYY-MM-DD');
    const initialTimeStr = timeOnly ? (valStr || '12:00').slice(0,5) : (showTime && valStr.includes(' ') ? (valStr.split(' ')[1] || '12:00').slice(0,5) : '12:00');
    const [viewDate, setViewDate] = useState(initialDateStr ? dayjs(initialDateStr) : dayjs());
    const [selectedTime, setSelectedTime] = useState(initialTimeStr);

    useEffect(() => {
      if (!isOpen) return;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = originalOverflow; };
    }, [isOpen]);

    const calendarDays = useMemo(() => {
      const first = viewDate.startOf('month').day();
      const count = viewDate.daysInMonth();
      const days: Array<number | null> = [];
      for (let i = 0; i < first; i++) days.push(null);
      for (let i = 1; i <= count; i++) days.push(i);
      return days;
    }, [viewDate]);

    const confirm = () => {
      if (timeOnly) {
        onChange(selectedTime);
        setIsOpen(false);
        return;
      }
      const datePart = initialDateStr || viewDate.format('YYYY-MM-DD');
      onChange(showTime ? `${datePart} ${selectedTime}` : datePart);
      setIsOpen(false);
    };

    const handleSelectDay = (day: number) => {
      const datePart = viewDate.date(day).format('YYYY-MM-DD');
      if (showTime) onChange(`${datePart} ${selectedTime}`);
      else { onChange(datePart); setIsOpen(false); }
    };

    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minuteOptions = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

    return (
      <div style={{ position: 'relative', width: '100%', minWidth: 0 }}>
        <div onClick={() => setIsOpen(true)} style={{ ...inputStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: !valStr ? theme.colors.textWeak : 'inherit' }}>{valStr ? valStr.replace(/-/g, '/') : (placeholder || '')}</span>
          {timeOnly || showTime ? <Icons.Clock /> : <Icons.Calendar />}
        </div>
        {isOpen && typeof document !== 'undefined' && createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} onClick={() => setIsOpen(false)} />
            <GlassCard padding="20px" style={{ position: 'relative', width: '100%', maxWidth: timeOnly ? '280px' : '340px', zIndex: 5001, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', borderRadius: '24px' }}>
              {!timeOnly && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <button type="button" onClick={() => setViewDate(viewDate.subtract(1, 'month'))} style={navBtnStyle}>◀</button>
                    <div style={{ fontWeight: '900', fontSize: '15px' }}>{viewDate.format('YYYY年 M月')}</div>
                    <button type="button" onClick={() => setViewDate(viewDate.add(1, 'month'))} style={navBtnStyle}>▶</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
                    {['日','月','火','水','木','金','土'].map((d) => <div key={d} style={{ fontSize: '11px', fontWeight: '800', color: theme.colors.textWeak, paddingBottom: '8px' }}>{d}</div>)}
                    {calendarDays.map((day, i) => {
                      const isSelected = !!day && value && !timeOnly && value.split(' ')[0] === viewDate.date(day).format('YYYY-MM-DD');
                      return <div key={i} onClick={() => day && handleSelectDay(day)} style={{ padding: '10px 0', fontSize: '14px', borderRadius: '10px', cursor: day ? 'pointer' : 'default', background: isSelected ? theme.colors.primary : 'transparent', color: isSelected ? 'white' : theme.colors.textMain, opacity: day ? 1 : 0, fontWeight: isSelected ? '900' : '600' }}>{day}</div>;
                    })}
                  </div>
                </>
              )}
              {(showTime || timeOnly) && (
                <div style={{ borderTop: !timeOnly ? '1px solid rgba(0,0,0,0.05)' : 'none', paddingTop: !timeOnly ? '16px' : '0', marginTop: !timeOnly ? '16px' : '0' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select value={selectedTime.split(':')[0]} onChange={e => setSelectedTime(`${e.target.value}:${selectedTime.split(':')[1]}`)} style={selectTimeStyle}>{hours.map(h => <option key={h} value={h}>{h}時</option>)}</select>
                    <select value={selectedTime.split(':')[1]} onChange={e => setSelectedTime(`${selectedTime.split(':')[0]}:${e.target.value}`)} style={selectTimeStyle}>{minuteOptions.map(m => <option key={m} value={m}>{m}分</option>)}</select>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button type="button" onClick={() => { onChange(''); setIsOpen(false); }} style={{ flex: 1, padding: '10px', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>クリア</button>
                <button type="button" onClick={confirm} style={{ flex: 1, padding: '10px', background: theme.colors.primary, color: 'white', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>確定</button>
              </div>
            </GlassCard>
          </div>, document.body)}
      </div>
    );
  };

  const CustomDatePicker: React.FC<{ value?: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
    <ModalDatePicker value={value} onChange={onChange} placeholder="未設定" />
  );

  const CustomDateTimePicker: React.FC<{ value?: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
    <ModalDatePicker value={value} onChange={onChange} showTime placeholder="未設定" />
  );

  const TimePicker: React.FC<{ value?: string; onChange: (v: string) => void; readOnly?: boolean }> = ({ value, onChange, readOnly }) => (
    <ModalDatePicker value={value} onChange={onChange} timeOnly placeholder="未設定" />
  );



  const navBtnStyle = { border: 'none', background: 'none', padding: '4px 8px', cursor: 'pointer' } as React.CSSProperties;
  const selectTimeStyle = { flex: 1, minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' as const, padding: '8px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', background: 'white' };

  const AddButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
    <button type="button" onClick={onClick} style={{ padding: '12px', borderRadius: '14px', border: '1px dashed rgba(0,0,0,0.2)', background: 'transparent', color: theme.colors.textSecondary, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
      + {children}
    </button>
  );

  const RoundGhostButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
    <button type="button" onClick={onClick} style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: 'white', color: theme.colors.error, fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  );

  const addListField = (field: 'actors' | 'directors') => {
    setFormData(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  const updateListField = (field: 'actors' | 'directors', index: number, value: string) => {
    setFormData(prev => ({ ...prev, [field]: prev[field].map((item, i) => i === index ? value : item) }));
  };

  const removeListField = (field: 'actors' | 'directors', index: number) => {
    setFormData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const openExternal = (url?: string) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <DetailPageLayout backgroundUrl={formData.posterUrl} bottomPadding={120}>

          <DetailHeader
            title={formData.title}
            onTitleChange={(value) => updateField('title', value)}
            titlePlaceholder="作品名未設定"
            isEditMode={isEditMode}
            posterUrl={formData.posterUrl}
            posterAlt={formData.title}
            posterFallback={<div style={{ fontSize: 48, opacity: 0.2 }}>🎬</div>}
            onBack={onBack}
            actions={
              <>
                {isEditMode ? (
                  <IconButton icon={<Icons.Check />} onClick={() => save()} primary />
                ) : (
                  <IconButton icon={<Icons.Edit />} onClick={() => setIsEditMode(true)} style={{ background: 'rgba(255,255,255,0.82)', border: 'none', color: theme.colors.primary }} />
                )}
                <IconButton icon={<Icons.Trash />} onClick={() => { if (window.confirm('この映画を削除しますか？')) onDeleteMovie(movie.id); }} style={{ background: 'rgba(255,255,255,0.82)', border: 'none', color: theme.colors.error }} />
              </>
            }
            tags={
              <>
                <DetailChip label={tone.label} bg={tone.bg} />
                <DetailChip label={formData.ticketType} subtle />
                {!isEditMode && hasPosterLink ? <DetailLinkIconButton onClick={() => openExternal(formData.posterUrl)} title="ポスターを開く" /> : null}
                {!isEditMode && hasLotteryLink ? <DetailLinkIconButton onClick={() => openExternal(formData.status === '発売前' ? formData.saleLink : formData.lotteryUrl)} title={formData.status === '発売前' ? '販売ページを開く' : '抽選ページを開く'} /> : null}
              </>
            }
          />

          {isEditMode ? (
            <>
              <Section title="基本情報">
                <Field label="ポスターURL"><Input value={formData.posterUrl} onChange={(v) => updateField('posterUrl', v)} placeholder="https://..." /></Field>
                <Field label="劇場名"><Input value={formData.theaterName} onChange={(v) => updateField('theaterName', v)} placeholder="劇場名" /></Field>
                <Field label="スクリーン"><Input value={formData.screenName} onChange={(v) => updateField('screenName', v)} placeholder="スクリーン名" /></Field>
                <Field label="座席"><Input value={formData.seat} onChange={(v) => updateField('seat', v)} placeholder="例：C列 12番" /></Field>
                <Field label="料金"><Input value={formData.price?.toString() || ''} onChange={(v) => updateField('price', v ? Number(v) : undefined)} placeholder="0" type="number" suffix="円" /></Field>
                <Field label="チケット種別">{isEditMode ? <SelectRow options={TICKET_TYPES} value={formData.ticketType} onChange={(v) => updateField('ticketType', v as MovieTicketType)} /> : <StaticText>{formData.ticketType}</StaticText>}</Field>
                <Field label="ステータス">{isEditMode ? <SelectRow options={availableStatuses} value={formData.status} onChange={(v) => updateField('status', v as MovieStatus)} /> : <StaticText>{effectiveStatus}</StaticText>}</Field>
              </Section>

              {formData.ticketType === '舞台挨拶' && formData.status === '発売前' && (
                <Section title="舞台挨拶販売">
                  <Field label="発売日">{isEditMode ? <CustomDateTimePicker value={formData.saleAt} onChange={(v) => updateField('saleAt', v as any)} /> : <StaticText>{formatDateTimeWithWeek(formData.saleAt)}</StaticText>}</Field>
                  <Field label="締切日">{isEditMode ? <CustomDateTimePicker value={formData.deadlineAt} onChange={(v) => updateField('deadlineAt', v as any)} /> : <StaticText>{formatDateTimeWithWeek(formData.deadlineAt)}</StaticText>}</Field>
                  <Field label="販売ページURL"><Input value={formData.saleLink || ''} onChange={(v) => updateField('saleLink', v as any)} placeholder="https://..." readOnly={!isEditMode} /></Field>
                </Section>
              )}

              {formData.ticketType === '舞台挨拶' && formData.status === '抽選中' && (
                <Section title="舞台挨拶抽選">
                  <Field label="抽選名"><Input value={formData.lotteryName || ''} onChange={(v) => updateField('lotteryName', v as any)} placeholder="例：プレリザーブ" readOnly={!isEditMode} /></Field>
                  <Field label="抽選結果日時">{isEditMode ? <CustomDateTimePicker value={formData.lotteryResultAt} onChange={(v) => updateField('lotteryResultAt', v as any)} /> : <StaticText>{formatDateTimeWithWeek(formData.lotteryResultAt)}</StaticText>}</Field>
                  <Field label="抽選リンク"><Input value={formData.lotteryUrl || ''} onChange={(v) => updateField('lotteryUrl', v as any)} placeholder="https://..." readOnly={!isEditMode} /></Field>
                </Section>
              )}

              <Section title="日時情報">
                <Field label="公開日">{isEditMode ? <CustomDatePicker value={formData.releaseDate} onChange={(v) => updateField('releaseDate', v)} /> : <StaticText>{formatDateWithWeek(formData.releaseDate)}</StaticText>}</Field>
                <Field label="鑑賞日">{isEditMode ? <CustomDatePicker value={formData.watchDate} onChange={(v) => updateField('watchDate', v)} /> : <StaticText>{formatDateWithWeek(formData.watchDate)}</StaticText>}</Field>
                <Field label="開演"><TimePicker value={formData.startTime} onChange={(v) => updateField('startTime', v)} readOnly={!isEditMode} /></Field>
                <Field label="終演"><TimePicker value={formData.endTime} onChange={(v) => updateField('endTime', v)} readOnly={!isEditMode} /></Field>
                <Field label="上映時間"><StaticText>{durationLabel || ''}</StaticText></Field>
              </Section>

              <Section title="出演者">
                {(formData.actors.length ? formData.actors : ['']).map((actor, index) => (
                  <div key={`actor-${index}`} style={{ display: 'flex', gap: 8, marginBottom: 10, width: '100%', minWidth: 0, alignItems: 'stretch' }}>
                    <Input value={actor} onChange={(v) => updateListField('actors', index, v)} placeholder="出演者名" readOnly={!isEditMode} />
                    {isEditMode && formData.actors.length > 1 && <RoundGhostButton onClick={() => removeListField('actors', index)}>削除</RoundGhostButton>}
                  </div>
                ))}
                {isEditMode && <AddButton onClick={() => addListField('actors')}>出演者を追加</AddButton>}
              </Section>

              <Section title="監督">
                {(formData.directors.length ? formData.directors : ['']).map((director, index) => (
                  <div key={`director-${index}`} style={{ display: 'flex', gap: 8, marginBottom: 10, width: '100%', minWidth: 0, alignItems: 'stretch' }}>
                    <Input value={director} onChange={(v) => updateListField('directors', index, v)} placeholder="監督名" readOnly={!isEditMode} />
                    {isEditMode && formData.directors.length > 1 && <RoundGhostButton onClick={() => removeListField('directors', index)}>削除</RoundGhostButton>}
                  </div>
                ))}
                {isEditMode && <AddButton onClick={() => addListField('directors')}>監督を追加</AddButton>}
              </Section>

              <Section title="感想">
                <textarea value={formData.memo || ''} onChange={(e) => updateField('memo', e.target.value)} placeholder="観たあとにメモを残せます" style={{ ...inputStyle, minHeight: 140, padding: 16, resize: 'vertical' }} />
              </Section>
            </>
          ) : (
            <>
              <ViewSection title="基本情報">
                <div style={infoGridStyle}>
                  <div>
                    <Label>劇場名</Label>
                    <Value>{formData.theaterName}</Value>
                  </div>
                  <div>
                    <Label>スクリーン</Label>
                    <Value>{formData.screenName}</Value>
                  </div>
                  <div>
                    <Label>座席</Label>
                    <Value>{formData.seat}</Value>
                  </div>
                  <div>
                    <Label>料金</Label>
                    <Value>{formData.price !== undefined ? `${formData.price.toLocaleString()} 円` : null}</Value>
                  </div>
                  <div>
                    <Label>チケット種別</Label>
                    <Value>{formData.ticketType}</Value>
                  </div>
                </div>
              </ViewSection>

              {formData.ticketType === '舞台挨拶' && formData.status === '発売前' && (
                <ViewSection title="舞台挨拶販売">
                  <div style={infoGridStyle}>
                    <div>
                      <Label>発売日</Label>
                      <Value placeholder="">{formData.saleAt ? formatDateTimeWithWeek(formData.saleAt) : null}</Value>
                    </div>
                    <div>
                      <Label>締切日</Label>
                      <Value placeholder="">{formData.deadlineAt ? formatDateTimeWithWeek(formData.deadlineAt) : null}</Value>
                    </div>
                    {formData.saleLink && (
                      <div>
                        <Label>販売ページ</Label>
                        <button
                          onClick={() => openExternal(formData.saleLink)}
                          style={{
                            border: 'none',
                            background: 'rgba(83, 190, 232, 0.12)',
                            color: theme.colors.primary,
                            fontSize: 14,
                            fontWeight: 800,
                            borderRadius: 999,
                            padding: '10px 14px',
                            cursor: 'pointer'
                          }}
                        >
                          販売ページを開く
                        </button>
                      </div>
                    )}
                  </div>
                </ViewSection>
              )}

              {formData.ticketType === '舞台挨拶' && formData.status === '抽選中' && (
                <ViewSection title="舞台挨拶抽選">
                  <div style={infoGridStyle}>
                    <div>
                      <Label>抽選名</Label>
                      <Value placeholder="">{formData.lotteryName}</Value>
                    </div>
                    <div>
                      <Label>抽選結果日時</Label>
                      <Value placeholder="">{formData.lotteryResultAt ? formatDateTimeWithWeek(formData.lotteryResultAt) : null}</Value>
                    </div>
                    {formData.lotteryUrl && (
                      <div>
                        <Label>抽選リンク</Label>
                        <button
                          onClick={() => openExternal(formData.lotteryUrl)}
                          style={{
                            border: 'none',
                            background: 'rgba(83, 190, 232, 0.12)',
                            color: theme.colors.primary,
                            fontSize: 14,
                            fontWeight: 800,
                            borderRadius: 999,
                            padding: '10px 14px',
                            cursor: 'pointer'
                          }}
                        >
                          抽選ページを開く
                        </button>
                      </div>
                    )}
                  </div>
                </ViewSection>
              )}


              {formData.ticketType === '舞台挨拶' && movieLotteryHistory.length > 0 && (
                <ViewSection title="抽選履歴" countLabel={`${movieLotteryHistory.length}件`}>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {movieLotteryHistory.map((entry, index) => (
                      <div
                        key={`${entry.at}-${index}`}
                        style={{
                          borderRadius: 18,
                          border: '1px solid rgba(0,0,0,0.06)',
                          background: 'rgba(255,255,255,0.72)',
                          padding: '12px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                          alignItems: 'flex-start',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: theme.colors.textMain }}>
                            {entry.result === 'WON' ? '当選' : '落選'}
                          </div>
                          <div style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: 700, marginTop: 2, wordBreak: 'break-word' }}>
                            {entry.lotteryName || '舞台挨拶抽選'}
                          </div>
                          {(entry.lotteryResultAt || entry.at) && (
                            <div style={{ fontSize: 12, color: theme.colors.textWeak, marginTop: 4 }}>
                              結果：{formatDateTimeWithWeek(entry.lotteryResultAt || entry.at)}
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 900,
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: entry.result === 'WON' ? 'rgba(83,190,232,0.14)' : 'rgba(226,232,240,1)',
                            color: entry.result === 'WON' ? theme.colors.primary : theme.colors.textSecondary,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {entry.result === 'WON' ? '当選' : '落選'}
                        </div>
                      </div>
                    ))}
                  </div>
                </ViewSection>
              )}

              <ViewSection title="日時情報">
                <div style={infoGridStyle}>
                  <div>
                    <Label>公開日</Label>
                    <Value placeholder="">{formatDateWithWeek(formData.releaseDate)}</Value>
                  </div>
                  <div>
                    <Label>鑑賞日</Label>
                    <Value placeholder="">{formatDateWithWeek(formData.watchDate)}</Value>
                  </div>
                  <div>
                    <Label>開演</Label>
                    <Value placeholder="">{formData.startTime}</Value>
                  </div>
                  <div>
                    <Label>終演</Label>
                    <Value placeholder="">{formData.endTime}</Value>
                  </div>
                  <div>
                    <Label>上映時間</Label>
                    <Value placeholder="">{durationLabel || null}</Value>
                  </div>
                </div>
              </ViewSection>

              <ViewSection title="出演者" countLabel={formData.actors.length ? `${formData.actors.length}名` : undefined}>
                <div style={{ display: 'grid', gap: 10 }}>
                  {(formData.actors.length ? formData.actors : ['']).map((actor, index) => (
                    <Value key={`actor-${index}`}>{actor}</Value>
                  ))}
                </div>
              </ViewSection>

              <ViewSection title="監督" countLabel={formData.directors.length ? `${formData.directors.length}名` : undefined}>
                <div style={{ display: 'grid', gap: 10 }}>
                  {(formData.directors.length ? formData.directors : ['']).map((director, index) => (
                    <Value key={`director-${index}`}>{director}</Value>
                  ))}
                </div>
              </ViewSection>

              <ViewSection title="感想" defaultOpen={!!formData.memo}>
                <Value style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, fontWeight: 600 }}>{formData.memo || null}</Value>
              </ViewSection>
            </>
          )}
    </DetailPageLayout>
  );
};
