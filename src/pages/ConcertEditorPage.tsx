
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { theme } from '../ui/theme';
import { GlassCard } from '../ui/GlassCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Artist, Tour, Concert, Status } from '../domain/types';
import { Icons, IconButton } from '../ui/IconButton';
import { sortPerformancesForDisplay, checkGlobalDateConflicts } from '../domain/logic';
import { PageShell } from '../ui/PageShell';

const generateId = () => Math.random().toString(36).substr(2, 9);

const Field: React.FC<{ label: string; description?: string; children: React.ReactNode }> = ({ label, children, description }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', minWidth: 0 }}>
    <label style={{ fontSize: '12px', color: theme.colors.textSecondary, marginLeft: '4px', fontWeight: 'bold' }}>{label}</label>
    {children}
    {description && <div style={{ fontSize: '10px', color: theme.colors.textWeak, marginLeft: '4px' }}>{description}</div>}
  </div>
);

interface Props {
  artistId: string;
  tourId?: string;
  tour?: Tour;
  allArtists: Artist[];
  onSave: (updatedTour: Tour) => void;
  onCancel: () => void;
  onDeleteTour: (artistId: string, tourId: string) => void;
}

const statusOptions: { value: Status; label: string; color: string }[] = [
  { value: '発売前', label: '発売前', color: theme.colors.status['発売前'] },
  { value: '検討中', label: '検討中', color: theme.colors.status['検討中'] },
  { value: '抽選中', label: '抽選中', color: theme.colors.status['抽選中'] },
  { value: '参戦予定', label: '参戦予定', color: theme.colors.status['参戦予定'] },
  { value: '参戦済み', label: '参戦済み', color: theme.colors.status['参戦済み'] },
  { value: '見送', label: '見送', color: theme.colors.status['見送'] },
];

const StatusPicker = ({ value, onChange }: { value: Status; onChange: (s: Status) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const current = statusOptions.find(o => o.value === value) || statusOptions[0];
  return (
    <div style={{ position: 'relative' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ ...inputStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: current.color }} />
          {current.label}
        </div>
        <span style={{ fontSize: '10px', opacity: 0.5 }}>{isOpen ? '▲' : '▼'}</span>
      </div>
      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setIsOpen(false)} />
          <GlassCard padding="8px" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 101, marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {statusOptions.map(opt => (
              <div 
                key={opt.value} 
                onClick={() => { onChange(opt.value); setIsOpen(false); }} 
                style={{ 
                  padding: '10px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', 
                  background: value === opt.value ? 'rgba(83, 190, 232, 0.1)' : 'transparent', 
                  color: value === opt.value ? theme.colors.primary : theme.colors.textMain, 
                  display: 'flex', alignItems: 'center', gap: '8px' 
                }}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: opt.color }} />{opt.label}
              </div>
            ))}
          </GlassCard>
        </>
      )}
    </div>
  );
};


const CustomDatePicker = ({ value, onChange, showTime = false, placeholder }: { value: string | null | undefined; onChange: (val: string) => void; showTime?: boolean; placeholder?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const valStr = value || '';
  const initialDateStr = valStr === 'TBD' || !valStr ? '' : valStr.split(' ')[0];
  const initialTimeStr = (showTime && valStr && valStr.includes(' ')) ? (valStr.split(' ')[1] || '12:00').slice(0, 5) : '12:00';
  const [viewDate, setViewDate] = useState(initialDateStr ? new Date(initialDateStr.replace(/-/g, '/')) : new Date());
  const [selectedTime, setSelectedTime] = useState(initialTimeStr);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDay = (y: number, m: number) => new Date(y, m, 1).getDay();

  const calendarDays = useMemo(() => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const days: Array<number | null> = [];
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
    if (showTime) onChange(`${datePart} ${selectedTime}`);
    else {
      onChange(datePart);
      setIsOpen(false);
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minuteOptions = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

  return (
    <div style={{ position: 'relative', width: '100%', minWidth: 0 }}>
      <div onClick={() => setIsOpen(true)} style={{ ...inputStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '14px', color: !valStr ? theme.colors.textWeak : 'inherit' }}>{valStr || placeholder || '未設定'}</span>
        {showTime ? <Icons.Clock /> : <Icons.Calendar />}
      </div>
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.42)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} onClick={() => setIsOpen(false)} />
          <GlassCard padding="16px" style={{ position: 'relative', zIndex: 5001, width: 'min(340px, calc(100vw - 32px))', maxWidth: 'calc(100vw - 32px)', borderRadius: '24px', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} style={navBtnStyle}>◀</button>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月</div>
              <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} style={navBtnStyle}>▶</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '4px', textAlign: 'center', marginBottom: showTime ? '16px' : '0' }}>
              {['日','月','火','水','木','金','土'].map(d => <div key={d} style={{ fontSize: '10px', color: theme.colors.textWeak }}>{d}</div>)}
              {calendarDays.map((day, i) => {
                const dateKey = day ? `${viewDate.getFullYear()}-${String(viewDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}` : '';
                const isSelected = !!day && initialDateStr === dateKey;
                return (
                  <div key={i} onClick={() => day && handleSelectDay(day)} style={{ padding: '8px 0', fontSize: '13px', borderRadius: '8px', cursor: day ? 'pointer' : 'default', background: isSelected ? theme.colors.primary : 'transparent', color: isSelected ? 'white' : theme.colors.textMain, opacity: day ? 1 : 0 }}>
                    {day}
                  </div>
                );
              })}
            </div>
            {showTime && (
              <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select value={selectedTime.split(':')[0]} onChange={e => {
                    const [,m] = selectedTime.split(':');
                    const next = `${e.target.value}:${m}`;
                    setSelectedTime(next);
                    if (initialDateStr) onChange(`${initialDateStr} ${next}`);
                  }} style={selectTimeStyle}>
                    {hours.map(h => <option key={h} value={h}>{h}時</option>)}
                  </select>
                  <select value={selectedTime.split(':')[1]} onChange={e => {
                    const [h] = selectedTime.split(':');
                    const next = `${h}:${e.target.value}`;
                    setSelectedTime(next);
                    if (initialDateStr) onChange(`${initialDateStr} ${next}`);
                  }} style={selectTimeStyle}>
                    {minuteOptions.map(m => <option key={m} value={m}>{m}分</option>)}
                  </select>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button type="button" onClick={() => { onChange(''); setIsOpen(false); }} style={{ flex: 1, padding: '10px', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>クリア</button>
              <button type="button" onClick={() => setIsOpen(false)} style={{ flex: 1, padding: '10px', background: theme.colors.primary, color: 'white', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>確定</button>
            </div>
          </GlassCard>
        </div>,
        document.body
      )}
    </div>
  );
};

const navBtnStyle = { border: 'none', background: 'none', padding: '4px 8px', cursor: 'pointer' };
const selectTimeStyle = { flex: 1, minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: '8px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)', background: 'white' };

export const ConcertEditorPage: React.FC<Props> = ({ artistId, tourId, tour, allArtists, onSave, onCancel, onDeleteTour }) => {
  const getInitialData = (): Tour => {
    const base = tourId && tour ? { ...tour } : { id: generateId(), name: '', imageUrl: '', memo: '', concerts: [], officialUrl: '' };
    return {
      ...base,
      concerts: Array.isArray(base.concerts) ? base.concerts : [],
    };
  };
  const [formData, setFormData] = useState<Tour>(getInitialData());
  const initialSnapshotRef = useRef<string>(JSON.stringify(getInitialData()));
  const [imageUrlDraft, setImageUrlDraft] = useState(formData.imageUrl);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedConcertId, setExpandedConcertId] = useState<string | null>(null);
  const [isDeleteTourModalOpen, setIsDeleteTourModalOpen] = useState(false);
  const [isDeleteConcertModalOpen, setIsDeleteConcertModalOpen] = useState<string | null>(null);
  const [conflictDates, setConflictDates] = useState<string[]>([]);

  useEffect(() => { 
    if (tour) { 
      const normalized = {
        ...tour,
        concerts: Array.isArray(tour.concerts) ? tour.concerts : [],
      };
      setFormData(normalized); 
      setImageUrlDraft(normalized.imageUrl); 
      initialSnapshotRef.current = JSON.stringify(normalized); 
    } 
  }, [tourId, tour]);
  
  useEffect(() => { 
    setHasChanges(JSON.stringify(formData) !== initialSnapshotRef.current); 
  }, [formData]);

  const handleSave = (e?: React.MouseEvent) => {
    if (e) e.preventDefault(); // Safety for touch triggers
    
    // Explicit Validation
    if (!formData.name.trim()) {
      window.alert("ツアー名を入力してください。");
      return;
    }

    const conflicts = checkGlobalDateConflicts(allArtists, formData.id, formData.concerts);
    if (conflicts.length > 0) { 
      setConflictDates(conflicts); 
      return; 
    }
    
    onSave(formData);
  };

  const handleAddConcert = () => {
    const nc: Concert = { id: generateId(), date: 'TBD', venue: '', price: 0, saleLink: '', status: '発売前', isParticipated: false, imageIds: [] };
    setFormData(prev => ({ ...prev, concerts: [...(prev.concerts || []), nc] }));
    setExpandedConcertId(nc.id);
  };

  const handleUpdateConcert = (id: string, updates: Partial<Concert>) => setFormData(prev => ({ ...prev, concerts: (prev.concerts || []).map(c => c.id === id ? { ...c, ...updates } : c) }));

  const handleLoadImage = () => {
    if (imageUrlDraft.trim()) {
      setFormData(p => ({ ...p, imageUrl: imageUrlDraft.trim() }));
    }
  };

  return (
    <PageShell header={
      <header style={headerStyle}>
        <IconButton icon={<Icons.X />} onClick={onCancel} size={40} style={{ color: theme.colors.textSecondary, border: 'none', background: 'transparent', boxShadow: 'none' }} />
        <h2 style={{ fontSize: '17px', margin: 0, fontWeight: 'bold' }}>ツアー・公演編集</h2>
        {tourId ? (
          <IconButton icon={<Icons.Trash />} onClick={() => setIsDeleteTourModalOpen(true)} size={40} style={{ color: theme.colors.error, border: 'none', background: 'transparent', boxShadow: 'none' }} />
        ) : (
          <div style={{ width: 40 }} />
        )}
      </header>
    }>
      <div style={{ paddingBottom: '160px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div style={{ width: '120px', height: '160px', borderRadius: '16px', background: '#F3F4F6', border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {formData.imageUrl ? <img src={formData.imageUrl} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '32px', opacity: 0.2 }}>🎸</span>}
          </div>
        </div>
        <section style={{ marginBottom: theme.spacing.xl }}>
          <h3 style={sectionTitleStyle}>ツアー情報</h3>
          <GlassCard padding={theme.spacing.md} style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
            <Field label="ツアー名"><input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} style={inputStyle} /></Field>
            <Field label="画像URL">
              <div style={{ display: 'flex', gap: '8px', width: '100%', minWidth: 0, alignItems: 'stretch' }}>
                <input 
                  type="url" 
                  value={imageUrlDraft} 
                  onChange={e => setImageUrlDraft(e.target.value)} 
                  style={inputStyle} 
                />
                <button
                  type="button"
                  onClick={handleLoadImage}
                  style={{
                    padding: '0 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(0,0,0,0.08)',
                    background: 'white',
                    color: theme.colors.textSecondary,
                    fontSize: '13px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                  }}
                >
                  読み込み
                </button>
              </div>
            </Field>
            <Field label="公式サイトURL"><input type="url" value={formData.officialUrl || ''} onChange={e => setFormData(p => ({ ...p, officialUrl: e.target.value }))} style={inputStyle} /></Field>
          </GlassCard>
        </section>
        <section style={{ marginBottom: theme.spacing.xl }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
            <h3 style={{ ...sectionTitleStyle, marginBottom: 0 }}>公演一覧</h3>
            <button type="button" onClick={handleAddConcert} style={actionButtonStyle}>＋ 公演追加</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
            {sortPerformancesForDisplay(formData.concerts || []).map(c => {
              const exp = expandedConcertId === c.id;
              return (
                <GlassCard key={c.id} padding="0" style={{ position: 'relative', zIndex: exp ? 10 : 1 }}>
                  <div onClick={() => setExpandedConcertId(exp ? null : c.id)} style={{ padding: theme.spacing.md, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: '700', minWidth: 0, wordBreak: 'break-word' }}>{c.concertAt || c.date}</div><div style={{ fontSize: '12px', color: theme.colors.textSecondary, minWidth: 0, wordBreak: 'break-word' }}>{c.venue || '会場未入力'}</div></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.colors.status[c.status] }}>{c.status}</span><span>{exp ? '▲' : '▼'}</span></div>
                  </div>
                  {exp && (
                    <div style={{ padding: theme.spacing.md, borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                        <Field label="状态"><StatusPicker value={c.status} onChange={v => handleUpdateConcert(c.id, { status: v })} /></Field>
                        <Field label="会場"><input type="text" value={c.venue} onChange={e => handleUpdateConcert(c.id, { venue: e.target.value })} style={inputStyle} /></Field>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                        {c.status === '発売前' && <Field label="発売日"><CustomDatePicker value={c.saleAt} onChange={v => handleUpdateConcert(c.id, { saleAt: v })} showTime /></Field>}
                        {(c.status === '検討中' || c.status === '発売前') && <Field label="締切日"><CustomDatePicker value={c.deadlineAt} onChange={v => handleUpdateConcert(c.id, { deadlineAt: v })} showTime /></Field>}
                        {c.status === '抽選中' && <Field label="結果日"><CustomDatePicker value={c.resultAt} onChange={v => handleUpdateConcert(c.id, { resultAt: v })} showTime /></Field>}
                        <Field label="公演日"><CustomDatePicker value={c.concertAt || (c.date === 'TBD' ? '' : c.date)} onChange={v => handleUpdateConcert(c.id, { concertAt: v, date: v.split(' ')[0] })} /></Field>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                        <Field label="チケット価格"><input type="number" value={c.price || ''} onChange={e => handleUpdateConcert(c.id, { price: Number(e.target.value) })} style={inputStyle} /></Field>
                        <Field label="抽選名"><input type="text" value={c.lotteryName || ''} onChange={e => handleUpdateConcert(c.id, { lotteryName: e.target.value })} style={inputStyle} /></Field>
                      </div>
                      <Field label="販売页面URL"><input type="url" value={c.saleLink} onChange={e => handleUpdateConcert(c.id, { saleLink: e.target.value })} style={inputStyle} /></Field>
                      <button type="button" onClick={() => setIsDeleteConcertModalOpen(c.id)} style={{ padding: '8px', color: theme.colors.error, background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>この公演を削除</button>
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>
        </section>
        <button 
          type="button" 
          disabled={!hasChanges || !formData.name} 
          onClick={handleSave} 
          style={{ 
            width: '100%', padding: '16px', borderRadius: '16px', 
            background: !hasChanges || !formData.name ? 'rgba(0,0,0,0.05)' : theme.colors.primary, 
            color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' 
          }}
        >
          保存
        </button>
        <ConfirmDialog isOpen={conflictDates.length > 0} title="重复警告" message={`同日に他公演があります：${conflictDates.join(', ')}`} confirmLabel="強制保存" onClose={() => setConflictDates([])} onConfirm={() => onSave(formData)} />
        <ConfirmDialog isOpen={isDeleteTourModalOpen} title="ツアー削除" message="全て削除されます。復元不可。" confirmLabel="削除" isDestructive onClose={() => setIsDeleteTourModalOpen(false)} onConfirm={() => onDeleteTour(artistId, formData.id)} />
        <ConfirmDialog isOpen={!!isDeleteConcertModalOpen} title="公演削除" message="この公演を削除しますか？" confirmLabel="削除" isDestructive onClose={() => setIsDeleteConcertModalOpen(null)} onConfirm={() => isDeleteConcertModalOpen && setFormData(p => ({ ...p, concerts: p.concerts.filter(c => c.id !== isDeleteConcertModalOpen) }))} />
      </div>
    </PageShell>
  );
};

const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, background: theme.colors.background, padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' };
const sectionTitleStyle: React.CSSProperties = { fontSize: '13px', color: theme.colors.textSecondary, fontWeight: 'bold', marginBottom: '8px' };
const inputStyle: React.CSSProperties = { width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', padding: '12px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.08)', background: 'white', fontSize: '14px', outline: 'none' };
const actionButtonStyle: React.CSSProperties = { border: 'none', background: 'none', color: theme.colors.primary, fontSize: '14px', fontWeight: '600', cursor: 'pointer' };
