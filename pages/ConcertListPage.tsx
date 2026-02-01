import React, { useState, useMemo } from 'react';
import { PageShell } from '../ui/PageShell';
import { Icons } from '../ui/IconButton';
import { theme } from '../ui/theme';
import { TEXT } from '../ui/constants';
import { Concert, Status, Artist, DueAction, ConcertViewMode } from '../domain/types';
import { ConcertMenu } from '../components/ConcertMenu';
import { sortPerformancesForDisplay, sortPerformancesByLotteryDate, getDueAction, applyDecision } from '../domain/logic';

interface Props {
  artists: Artist[];
  onOpenArtist: (artistId: string) => void;
  onOpenConcert: (artistId: string, tourId: string, concertId: string) => void;
  onCreateConcert: () => void;
  onRefreshAll: () => void;
  onUpdateConcert: (artistId: string, tourId: string, concertId: string, updates: Partial<Concert>) => void;
  sortMode: 'status' | 'lottery';
  onSetSort: (mode: 'status' | 'lottery') => void;
  viewMode: ConcertViewMode;
  onSetViewMode: (mode: ConcertViewMode) => void;
  isMenuOpenExternally?: boolean;
  onMenuClose?: () => void;
  hideHeader?: boolean;
}

interface ConcertWithMetadata extends Concert {
  artistName: string;
  artistId: string;
  artistImageUrl: string;
  tourName: string;
  tourId: string;
  tourImageUrl: string;
  tourOfficialUrl?: string;
}

// -------------------------------------------------------------------------
// 辅助函数
// -------------------------------------------------------------------------
const normalizeDateTimeText = (v?: string) => (v || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

const formatCompactDateTime = (v?: string, includeYear: boolean = false) => {
  const s = normalizeDateTimeText(v);
  if (!s) return '';
  const mDate = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (mDate) {
    const mm = String(parseInt(mDate[2], 10));
    const dd = String(parseInt(mDate[3], 10));
    const prefix = includeYear ? `${mDate[1]}/` : '';
    if (mDate[4] && mDate[5]) return `${prefix}${mm}/${dd} ${mDate[4]}:${mDate[5]}`;
    return `${prefix}${mm}/${dd}`;
  }
  return s;
};

const badgeBgFromColor = (color: string) => {
  return typeof color === 'string' && color.startsWith('#') ? `${color}22` : 'rgba(0,0,0,0.06)';
};

// -------------------------------------------------------------------------
// 卡片类型 B：关键时间信息卡 (抽选/截止/开票)
// -------------------------------------------------------------------------
const MilestoneRowCard: React.FC<{ 
  concert: ConcertWithMetadata; 
  onClick: () => void;
  sortMode: 'status' | 'lottery';
}> = ({ concert, onClick, sortMode }) => {
  const statusColor = theme.colors.status[concert.status as Status] || theme.colors.primary;
  const displayImage = concert.tourImageUrl || concert.artistImageUrl;

  const displayMeta = useMemo(() => {
    let type = '公演日';
    let val = concert.concertAt || concert.date || '';
    if (sortMode === 'lottery' || ['抽選中', '検討中', '発売前'].includes(concert.status)) {
      if (concert.status === '抽選中') { type = '抽選結果'; val = concert.resultAt || TEXT.GLOBAL.COMMON_NOT_REGISTERED; }
      else if (concert.status === '検討中') { type = '申込締切'; val = concert.deadlineAt || TEXT.GLOBAL.COMMON_NOT_REGISTERED; }
      else if (concert.status === '発売前') { type = '発売開始'; val = concert.saleAt || TEXT.GLOBAL.COMMON_NOT_REGISTERED; }
    }
    return { type, label: formatCompactDateTime(val, true) || val };
  }, [concert, sortMode]);

  return (
    <div
      onClick={onClick}
      style={{
        background: 'white', borderRadius: '24px', border: '1px solid rgba(0, 0, 0, 0.04)',
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)', transition: 'all 0.2s'
      }}
    >
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F3F4F6', flexShrink: 0, overflow: 'hidden' }}>
        {displayImage ? <img src={displayImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '18px', opacity: 0.2 }}>🎟️</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '12px', color: theme.colors.textSecondary, fontWeight: '700' }}>{concert.artistName}</div>
          <div style={{ fontSize: '10px', fontWeight: '800', color: statusColor, background: badgeBgFromColor(statusColor), padding: '2px 8px', borderRadius: '9999px' }}>{TEXT.STATUS[concert.status]}</div>
        </div>
        <div style={{ fontWeight: '800', fontSize: '15px', color: theme.colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{concert.tourName}</div>
        <div style={{ fontSize: '12px', color: theme.colors.textSecondary }}>
          <span style={{ fontWeight: '800', color: theme.colors.textMain }}>{displayMeta.type}:</span> {displayMeta.label}
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------
// 卡片类型 A：演唱会主题封面卡 (参战予定/已参加)
// -------------------------------------------------------------------------
const TourGroupCard: React.FC<{ 
  artistId: string;
  tourName: string;
  artistName: string;
  imageUrl: string;
  status: Status;
  concerts: ConcertWithMetadata[];
  onOpenArtist: (artistId: string) => void;
  onOpenConcert: (aid: string, tid: string, cid: string) => void;
}> = ({ artistId, tourName, artistName, imageUrl, status, concerts, onOpenArtist, onOpenConcert }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusColor = theme.colors.status[status] || theme.colors.primary;
  
  const visibleConcerts = isExpanded ? concerts : concerts.slice(0, 2);
  const hasMore = concerts.length > 2;

  return (
    <div style={{
      background: 'white',
      borderRadius: '28px',
      border: '1px solid rgba(0, 0, 0, 0.04)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      transition: 'all 0.3s ease-in-out',
      position: 'relative',
      height: 'auto',
    }}>
      {/* 封面图容器：点击跳转到歌手详情 */}
      <div 
        onClick={() => onOpenArtist(artistId)}
        style={{ 
          position: 'relative', 
          width: '100%', 
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#F3F4F6',
          cursor: 'pointer',
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* 上部：ポスター領域（高さの基準）。展開時は下方向に伸びる */}
        <div style={{ minHeight: 180, position: 'relative' }}>
          {!imageUrl && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.12 }}>
              <Icons.Exhibitions style={{ width: 64, height: 64 }} />
            </div>
          )}
        </div>

{/* 左上角状态角标 */}
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
          <div style={{
            background: statusColor,
            color: 'white',
            padding: '4px 12px',
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 900,
            lineHeight: 1,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            whiteSpace: 'nowrap'
          }}>
            {TEXT.STATUS[status]}
          </div>
        </div>

        {/* 底部渐变遮罩内容区 */}
        <div
          style={{
            position: 'relative',
            zIndex: 5,
            padding: '56px 16px 12px', 
            background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.62) 28%, rgba(0,0,0,0.28) 55%, transparent 78%)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* 基本信息 */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ 
              fontSize: 12, 
              fontWeight: 800, 
              opacity: 0.85, 
              marginBottom: 2, 
              textShadow: '0 2px 4px rgba(0,0,0,0.3)' 
            }}>
              {artistName}
            </div>
            <div style={{
              fontSize: 20,
              fontWeight: 900,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: '1.2',
              textShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}>
              {tourName}
            </div>
          </div>

          {/* 公演日期行列表：纯文字列表，无背景块 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '-2px' }}> 
            {visibleConcerts.map((c) => {
              const isParticipated = c.status === '参戦済み';
              return (
                <div
                  key={c.id}
                  onClick={isParticipated ? (e) => {
                    e.stopPropagation();
                    onOpenConcert(c.artistId, c.tourId, c.id);
                  } : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    padding: '2px 0',
                    cursor: isParticipated ? 'pointer' : 'default',
                    opacity: isParticipated ? 1 : 0.75,
                    transition: 'opacity 0.2s',
                    lineHeight: 1.2, 
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 900, minWidth: 56, color: 'white' }}>
                    {formatCompactDateTime(c.concertAt || c.date)}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'white',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1,
                    textAlign: 'center',
                    padding: '0 8px',
                    fontWeight: '600'
                  }}>
                    {c.venue || '会場未定'}
                  </div>
                  {isParticipated ? (
                    <Icons.ChevronLeft style={{ transform: 'rotate(180deg)', width: 14, color: 'rgba(255,255,255,0.6)',alignSelf: 'center' }} />
                  ) : (
                    <div style={{ width: 14 }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* 展开/折叠按钮 */}
          {hasMore && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              style={{
                width: '100%',
                border: 'none',
                background: 'none',
                padding: '6px 0 0',
                marginTop: 2,
                color: 'rgba(255,255,255,0.9)',
                fontSize: 12,
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                textShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}
            >
              {isExpanded ? '折りたたむ' : `＋ ${concerts.length - 2} 件の他公演を表示`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------
// 主页面组件
// -------------------------------------------------------------------------
export const ConcertListPage: React.FC<Props> = ({ 
  artists, onOpenArtist, onOpenConcert, onCreateConcert, onRefreshAll, 
  onUpdateConcert, sortMode, onSetSort, viewMode, onSetViewMode, isMenuOpenExternally, onMenuClose, hideHeader
}) => {
  const [showAttended, setShowAttended] = useState(true);
  const [showSkipped, setShowSkipped] = useState(true);

  const allConcerts = useMemo(() => {
    const list: ConcertWithMetadata[] = [];
    artists.forEach(artist => artist.tours.forEach(tour => tour.concerts.forEach(concert => {
      list.push({ ...concert, artistName: artist.name, artistId: artist.id, artistImageUrl: artist.imageUrl || '', tourName: tour.name, tourId: tour.id, tourImageUrl: tour.imageUrl || '', tourOfficialUrl: tour.officialUrl });
    })));
    return list;
  }, [artists]);

  const displayList = useMemo(() => {
    let sorted = sortMode === 'lottery' 
      ? sortPerformancesByLotteryDate(allConcerts as any) 
      : sortPerformancesForDisplay(allConcerts as any);
    
    let filtered = (sorted as ConcertWithMetadata[]).filter(c => {
      if (!showAttended && c.status === '参戦済み') return false;
      if (!showSkipped && c.status === '見送') return false;
      return true;
    });

    if (viewMode === 'concert') {
      const grouped: (ConcertWithMetadata | { type: 'tour_group'; tourId: string; concerts: ConcertWithMetadata[] })[] = [];
      const processedTourIds = new Set<string>();

      filtered.forEach((item) => {
        if (processedTourIds.has(item.tourId)) return;
        const tourConcerts = filtered.filter(c => c.tourId === item.tourId);
        
        if (tourConcerts.length > 1) {
          grouped.push({ type: 'tour_group', tourId: item.tourId, concerts: tourConcerts });
        } else {
          grouped.push(item);
        }
        processedTourIds.add(item.tourId);
      });
      return grouped;
    }

    return filtered;
  }, [allConcerts, showAttended, showSkipped, sortMode, viewMode]);

  return (
    <PageShell header={hideHeader ? null : (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#111827', margin: 0 }}>{TEXT.GLOBAL.APP_TITLE} <span style={{ color: '#53BEE8' }}>JP</span></h1>
        <button onClick={onRefreshAll} style={{ padding: '12px', borderRadius: '9999px', background: 'white', border: '1px solid #F3F4F6', color: '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icons.Refresh /></button>
      </div>
    )} disablePadding={hideHeader}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '120px' }}>
        {displayList.length === 0 ? (
          <div style={{ padding: '80px 20px', textAlign: 'center', color: theme.colors.textWeak, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
            <div style={{ fontSize: '48px', opacity: 0.5 }}>🎟️</div>
            <div style={{ fontSize: '15px', fontWeight: '600' }}>{TEXT.LABELS.SCHEDULE_EMPTY}</div>
            <button onClick={onCreateConcert} style={{ padding: '12px 24px', borderRadius: '12px', background: theme.colors.primary, color: 'white', border: 'none', fontWeight: 'bold' }}>＋ {TEXT.BUTTONS.ADD}</button>
          </div>
        ) : (
          displayList.map((item) => {
            if ('type' in item && item.type === 'tour_group') {
              const main = item.concerts[0];
              return (
                <TourGroupCard 
                  key={`group-${item.tourId}`}
                  artistId={main.artistId}
                  tourName={main.tourName} artistName={main.artistName} imageUrl={main.tourImageUrl || main.artistImageUrl}
                  status={main.status} concerts={item.concerts} 
                  onOpenArtist={onOpenArtist}
                  onOpenConcert={onOpenConcert}
                />
              );
            } else {
              const concert = item as ConcertWithMetadata;
              if (viewMode === 'concert') {
                 return (
                  <TourGroupCard 
                    key={concert.id}
                    artistId={concert.artistId}
                    tourName={concert.tourName} artistName={concert.artistName} imageUrl={concert.tourImageUrl || concert.artistImageUrl}
                    status={concert.status} concerts={[concert]} 
                    onOpenArtist={onOpenArtist}
                    onOpenConcert={onOpenConcert}
                  />
                );
              } else {
                return (
                  <MilestoneRowCard 
                    key={concert.id} concert={concert} sortMode={sortMode}
                    onClick={() => onOpenArtist(concert.artistId)} 
                  />
                );
              }
            }
          })
        )}
      </div>
      <ConcertMenu 
        isOpen={!!isMenuOpenExternally} 
        onClose={() => onMenuClose?.()} 
        onAddConcert={onCreateConcert} 
        showAttended={showAttended} 
        onToggleAttended={() => setShowAttended(!showAttended)} 
        showSkipped={showSkipped} 
        onToggleSkipped={() => setShowSkipped(!showSkipped)} 
        sortMode={sortMode} 
        onSetSort={onSetSort} 
        viewMode={viewMode}
        onSetViewMode={onSetViewMode}
      />
    </PageShell>
  );
};