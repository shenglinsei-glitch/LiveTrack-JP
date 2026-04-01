import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Movie, MovieStatus, MovieTicketType } from '../domain/types';
import { PageShell } from '../ui/PageShell';
import { theme } from '../ui/theme';
import { Icons, IconButton } from '../ui/IconButton';
import { GlassCard } from '../ui/GlassCard';

interface MovieDetailPageProps {
  movie: Movie;
  onUpdateMovie: (movie: Movie) => void;
  onDeleteMovie: (id: string) => void;
  onBack: () => void;
  initialEditMode?: boolean;
}

const STATUSES: MovieStatus[] = ['未上映', '上映中', '鑑賞済み', '見送り', '上映終了'];
const TICKET_TYPES: MovieTicketType[] = ['通常', '舞台挨拶'];

const statusTone = (status: MovieStatus) => {
  switch (status) {
    case '未上映': return { bg: '#9CA3AF', label: '未上映' };
    case '上映中': return { bg: '#53BEE8', label: '上映中' };
    case '鑑賞済み': return { bg: '#10B981', label: '鑑賞済み' };
    case '見送り': return { bg: '#6B7280', label: '見送り' };
    default: return { bg: '#94A3B8', label: '上映終了' };
  }
};

const week = ['日', '月', '火', '水', '木', '金', '土'];
const formatDateWithWeek = (date?: string) => {
  if (!date) return '未設定';
  const d = dayjs(date);
  if (!d.isValid()) return '未設定';
  return `${d.format('YYYY/MM/DD')}（${week[d.day()]}）`;
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 54,
  borderRadius: 18,
  border: '1px solid rgba(15,23,42,0.08)',
  background: 'rgba(255,255,255,0.85)',
  padding: '0 16px',
  fontSize: 15,
  color: theme.colors.text,
  outline: 'none',
};

const navBtnStyle: React.CSSProperties = { border: 'none', background: 'none', padding: '4px 8px', cursor: 'pointer', color: theme.colors.text };
const selectTimeStyle: React.CSSProperties = { flex: 1, padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', background: 'white', fontSize: 14 };

const Input: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string; readOnly?: boolean; type?: string; suffix?: string }> = ({ value, onChange, placeholder, readOnly, type = 'text', suffix }) => {
  return (
    <div style={{ position: 'relative' }}>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly} style={{ ...inputStyle, paddingRight: suffix ? 50 : 16, opacity: readOnly ? 0.92 : 1 }} />
      {suffix ? <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 800, color: theme.colors.textSecondary }}>{suffix}</div> : null}
    </div>
  );
};

const StaticText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', color: theme.colors.textMain }}>{children || '未設定'}</div>
);

const SelectRow: React.FC<{ options: string[]; value: string; onChange: (v: string) => void }> = ({ options, value, onChange }) => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    {options.map((option) => (
      <button key={option} onClick={() => onChange(option)} style={{ border: 'none', padding: '10px 14px', borderRadius: 999, fontSize: 13, fontWeight: 900, cursor: 'pointer', background: option === value ? 'rgba(83, 190, 232, 0.16)' : 'rgba(255,255,255,0.7)', color: option === value ? theme.colors.primary : theme.colors.textSecondary }}>
        {option}
      </button>
    ))}
  </div>
);

const CustomDatePicker = ({ value, onChange, placeholder }: { value?: string; onChange: (val: string) => void; placeholder?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const valStr = value || '';
  const initialDateStr = !valStr ? '' : valStr.split(' ')[0];
  const [viewDate, setViewDate] = useState(initialDateStr ? new Date(initialDateStr.replace(/-/g, '/')) : new Date());

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDay = (y: number, m: number) => new Date(y, m, 1).getDay();

  const calendarDays = useMemo(() => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const days = [] as Array<number | null>;
    const first = firstDay(y, m);
    for (let i = 0; i < first; i++) days.push(null);
    for (let i = 1; i <= daysInMonth(y, m); i++) days.push(i);
    return days;
  }, [viewDate]);

  const handleSelectDay = (day: number) => {
    const y = viewDate.getFullYear();
    const m = String(viewDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const datePart = `${y}-${m}-${d}`;
    onChange(datePart);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div onClick={() => setIsOpen(!isOpen)} style={{ ...inputStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', color: !valStr ? theme.colors.textWeak : 'inherit' }}>{valStr || placeholder || '未設定'}</span>
        <Icons.Calendar />
      </div>
      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setIsOpen(false)} />
          <GlassCard padding="16px" style={{ position: 'absolute', top: '100%', left: 0, width: '320px', maxWidth: 'calc(100vw - 32px)', zIndex: 101, marginTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} style={navBtnStyle}>◀</button>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月</div>
              <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} style={navBtnStyle}>▶</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
              {['日','月','火','水','木','金','土'].map(d => <div key={d} style={{ fontSize: '10px', color: theme.colors.textWeak }}>{d}</div>)}
              {calendarDays.map((day, i) => {
                const dateKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const isSelected = !!day && initialDateStr === dateKey;
                return (
                  <div key={i} onClick={() => day && handleSelectDay(day)} style={{ padding: '8px 0', fontSize: '13px', borderRadius: '8px', cursor: day ? 'pointer' : 'default', background: isSelected ? theme.colors.primary : 'transparent', color: isSelected ? 'white' : theme.colors.textMain, opacity: day ? 1 : 0 }}>
                    {day}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button type="button" onClick={() => { onChange(''); setIsOpen(false); }} style={{ flex: 1, padding: '10px', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>クリア</button>
              <button type="button" onClick={() => setIsOpen(false)} style={{ flex: 1, padding: '10px', background: theme.colors.primary, color: 'white', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>確定</button>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
};

const TimePicker = ({ value, onChange, readOnly }: { value?: string; onChange: (val: string) => void; readOnly?: boolean }) => {
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minuteOptions = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  const [h = '12', m = '00'] = (value || '12:00').split(':');
  if (readOnly) return <StaticText>{value || '未設定'}</StaticText>;
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <select value={h} onChange={(e) => onChange(`${e.target.value}:${m}`)} style={selectTimeStyle}>{hours.map(hour => <option key={hour} value={hour}>{hour}時</option>)}</select>
      <select value={m} onChange={(e) => onChange(`${h}:${e.target.value}`)} style={selectTimeStyle}>{minuteOptions.map(minute => <option key={minute} value={minute}>{minute}分</option>)}</select>
    </div>
  );
};

const AddButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => <button onClick={onClick} style={{ border: 'none', borderRadius: 12, padding: '10px 12px', background: 'rgba(83,190,232,0.12)', color: theme.colors.primary, fontWeight: 900, cursor: 'pointer' }}>{children}</button>;
const RoundGhostButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => <button onClick={onClick} style={{ border: 'none', borderRadius: 12, padding: '0 12px', background: 'rgba(0,0,0,0.05)', color: theme.colors.textSecondary, fontWeight: 800, cursor: 'pointer' }}>{children}</button>;

export const MovieDetailPage: React.FC<MovieDetailPageProps> = ({ movie, onUpdateMovie, onDeleteMovie, onBack, initialEditMode = false }) => {
  const [isEditMode, setIsEditMode] = useState(initialEditMode);
  const [formData, setFormData] = useState<Movie>(movie);

  useEffect(() => {
    setFormData(movie);
  }, [movie]);

  useEffect(() => {
    setIsEditMode(initialEditMode);
  }, [movie.id, initialEditMode]);

  const durationLabel = useMemo(() => calcDuration(formData.startTime, formData.endTime), [formData.startTime, formData.endTime]);
  const tone = statusTone(formData.status);

  const updateField = <K extends keyof Movie>(key: K, value: Movie[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value, updatedAt: new Date().toISOString() }));
  };

  const updateListField = (key: 'actors' | 'directors', index: number, value: string) => {
    const next = [...formData[key]];
    next[index] = value;
    updateField(key, next as any);
  };

  const addListField = (key: 'actors' | 'directors') => updateField(key, [...formData[key], ''] as any);
  const removeListField = (key: 'actors' | 'directors', index: number) => updateField(key, formData[key].filter((_, i) => i !== index) as any);

  const save = () => {
    onUpdateMovie({ ...formData, actors: formData.actors.filter((v) => v.trim()), directors: formData.directors.filter((v) => v.trim()) });
    setIsEditMode(false);
  };

  return (
    <PageShell disablePadding>
      <div style={{ minHeight: '100vh', position: 'relative', background: theme.colors.background }}>
        {formData.posterUrl && (
          <>
            <div style={{ position: 'fixed', inset: 0, backgroundImage: `url(${formData.posterUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(22px)', transform: 'scale(1.08)', opacity: 0.82 }} />
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.44)' }} />
          </>
        )}

        <div style={{ position: 'relative', zIndex: 1, padding: 'calc(env(safe-area-inset-top) + 16px) 16px 120px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <IconButton icon={<Icons.ChevronLeft />} onClick={() => onBack()} style={{ background: 'rgba(255,255,255,0.82)', border: 'none' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              {isEditMode ? (
                <IconButton icon={<Icons.Check />} onClick={() => save()} primary />
              ) : (
                <IconButton icon={<Icons.Edit />} onClick={() => setIsEditMode(true)} style={{ background: 'rgba(255,255,255,0.82)', border: 'none', color: theme.colors.primary }} />
              )}
              <IconButton icon={<Icons.Trash />} onClick={() => { if (window.confirm('この映画を削除しますか？')) onDeleteMovie(movie.id); }} style={{ background: 'rgba(255,255,255,0.82)', border: 'none', color: theme.colors.error }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ width: 150, height: 214, borderRadius: 26, overflow: 'hidden', background: '#F3F4F6', boxShadow: '0 12px 30px rgba(15,23,42,0.24)' }}>
              {formData.posterUrl ? <img src={formData.posterUrl} alt={formData.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, opacity: 0.2 }}>🎬</div>}
            </div>
            {isEditMode ? (
              <input value={formData.title} onChange={(e) => updateField('title', e.target.value)} placeholder="作品名を入力" style={{ marginTop: 20, width: '100%', textAlign: 'center', fontSize: 24, fontWeight: 900, color: '#fff', border: 'none', outline: 'none', background: 'transparent' }} />
            ) : (
              <h1 style={{ margin: '20px 0 10px', fontSize: 26, fontWeight: 900, textAlign: 'center', color: 'white', textShadow: '0 4px 24px rgba(0,0,0,0.22)' }}>{formData.title}</h1>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: tone.bg, color: 'white', fontSize: 12, fontWeight: 900 }}>{tone.label}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.82)', color: theme.colors.text, fontSize: 12, fontWeight: 900 }}>{formData.ticketType}</span>
            </div>
          </div>

          <Section title="基本情報">
            <Field label="ポスターURL"><Input value={formData.posterUrl || ''} onChange={(v) => updateField('posterUrl', v)} placeholder="https://..." readOnly={!isEditMode} /></Field>
            <Field label="劇場名"><Input value={formData.theaterName || ''} onChange={(v) => updateField('theaterName', v)} placeholder="劇場名" readOnly={!isEditMode} /></Field>
            <Field label="スクリーン"><Input value={formData.screenName || ''} onChange={(v) => updateField('screenName', v)} placeholder="スクリーン名" readOnly={!isEditMode} /></Field>
            <Field label="座席"><Input value={formData.seat || ''} onChange={(v) => updateField('seat', v)} placeholder="座席" readOnly={!isEditMode} /></Field>
            <Field label="料金"><Input value={formData.price === undefined ? '' : String(formData.price)} onChange={(v) => updateField('price', v === '' ? undefined as any : Number(v) as any)} placeholder="0" readOnly={!isEditMode} suffix="円" /></Field>
            <Field label="チケット種別">{isEditMode ? <SelectRow options={TICKET_TYPES} value={formData.ticketType} onChange={(v) => updateField('ticketType', v as MovieTicketType)} /> : <StaticText>{formData.ticketType}</StaticText>}</Field>
            <Field label="ステータス">{isEditMode ? <SelectRow options={STATUSES} value={formData.status} onChange={(v) => updateField('status', v as MovieStatus)} /> : <StaticText>{formData.status}</StaticText>}</Field>
          </Section>

          <Section title="日時情報">
            <Field label="公開日">{isEditMode ? <CustomDatePicker value={formData.releaseDate} onChange={(v) => updateField('releaseDate', v)} /> : <StaticText>{formatDateWithWeek(formData.releaseDate)}</StaticText>}</Field>
            <Field label="鑑賞日">{isEditMode ? <CustomDatePicker value={formData.watchDate} onChange={(v) => updateField('watchDate', v)} /> : <StaticText>{formatDateWithWeek(formData.watchDate)}</StaticText>}</Field>
            <Field label="開演"><TimePicker value={formData.startTime} onChange={(v) => updateField('startTime', v)} readOnly={!isEditMode} /></Field>
            <Field label="終演"><TimePicker value={formData.endTime} onChange={(v) => updateField('endTime', v)} readOnly={!isEditMode} /></Field>
            <Field label="上映時間"><StaticText>{durationLabel || '未設定'}</StaticText></Field>
          </Section>

          <Section title="出演者">
            {(formData.actors.length ? formData.actors : ['']).map((actor, index) => (
              <div key={`actor-${index}`} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <Input value={actor} onChange={(v) => updateListField('actors', index, v)} placeholder="出演者名" readOnly={!isEditMode} />
                {isEditMode && formData.actors.length > 1 && <RoundGhostButton onClick={() => removeListField('actors', index)}>削除</RoundGhostButton>}
              </div>
            ))}
            {isEditMode && <AddButton onClick={() => addListField('actors')}>出演者を追加</AddButton>}
          </Section>

          <Section title="監督">
            {(formData.directors.length ? formData.directors : ['']).map((director, index) => (
              <div key={`director-${index}`} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <Input value={director} onChange={(v) => updateListField('directors', index, v)} placeholder="監督名" readOnly={!isEditMode} />
                {isEditMode && formData.directors.length > 1 && <RoundGhostButton onClick={() => removeListField('directors', index)}>削除</RoundGhostButton>}
              </div>
            ))}
            {isEditMode && <AddButton onClick={() => addListField('directors')}>監督を追加</AddButton>}
          </Section>

          <Section title="感想">
            {isEditMode ? (
              <textarea value={formData.memo || ''} onChange={(e) => updateField('memo', e.target.value)} placeholder="観たあとにメモを残せます" style={{ ...inputStyle, minHeight: 140, padding: 16, resize: 'vertical' }} />
            ) : (
              <div style={{ ...inputStyle, minHeight: 120, padding: 16, whiteSpace: 'pre-wrap', alignItems: 'flex-start' }}>{formData.memo || '未入力'}</div>
            )}
          </Section>
        </div>
      </div>
    </PageShell>
  );
};
