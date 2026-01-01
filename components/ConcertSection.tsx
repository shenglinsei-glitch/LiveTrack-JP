
import React from 'react';
import { Concert, ConcertStatus, Performance } from '../types';
import { isAutoSkipped } from '../App';

const isValidDate = (d?: string) => !!d && !isNaN(new Date(d).getTime());

interface ConcertSectionProps {
  concert: Concert;
  now: Date;
  onSummaryClick?: (concertId: string) => void;
}

export const ConcertSection: React.FC<ConcertSectionProps> = ({ concert, now, onSummaryClick }) => {
  const latestPerformance = concert.performances.length > 0
    ? concert.performances.reduce((prev, curr) => {
        if (curr.isUndetermined) return curr;
        if (prev.isUndetermined) return prev;
        const d1 = isValidDate(curr.date) ? new Date(curr.date).getTime() : 0;
        const d2 = isValidDate(prev.date) ? new Date(prev.date).getTime() : 0;
        return d1 > d2 ? curr : prev;
      })
    : null;
    
  const isExpired = latestPerformance && !latestPerformance.isUndetermined && isValidDate(latestPerformance.date) && now > new Date(latestPerformance.date);
  const hasJoinedPerformance = concert.performances.some(p => p.status === ConcertStatus.JOINED);

  const getBgColor = (perf: Performance | null) => {
    if (!perf) return 'bg-white border-gray-100';
    
    let status = perf.status;
    if (isAutoSkipped(perf, now)) {
      status = ConcertStatus.SKIPPED;
    }

    switch (status) {
      case ConcertStatus.JOINED: return isExpired ? 'bg-[#53BEE8]/5 border-[#53BEE8]/20' : 'bg-emerald-50/50 border-emerald-100';
      case ConcertStatus.LOST: return 'bg-slate-50 border-slate-100 opacity-80';
      case ConcertStatus.SKIPPED: return 'bg-gray-50/50 border-gray-100 opacity-70';
      case ConcertStatus.PENDING: return 'bg-amber-50/40 border-amber-100/60';
      default: return 'bg-white border-gray-100';
    }
  };

  const getStatusText = (perf: Performance) => {
    if (isAutoSkipped(perf, now)) return '見送り';

    const expired = !perf.isUndetermined && isValidDate(perf.date) && now > new Date(perf.date);
    switch (perf.status) {
      case ConcertStatus.JOINED: return expired ? '参戦済み' : '参戦';
      case ConcertStatus.LOST: return '落選';
      case ConcertStatus.SKIPPED: return '見送り';
      default: return '検討中';
    }
  };

  const getStatusBadgeClass = (perf: Performance) => {
    if (isAutoSkipped(perf, now)) return 'bg-gray-400 text-white';

    const expired = !perf.isUndetermined && isValidDate(perf.date) && now > new Date(perf.date);
    switch (perf.status) {
      case ConcertStatus.JOINED: return expired ? 'bg-[#A6DFF7] text-white' : 'bg-[#53BEE8] text-white';
      case ConcertStatus.LOST: return 'bg-slate-500 text-white';
      case ConcertStatus.SKIPPED: return 'bg-gray-400 text-white';
      case ConcertStatus.PENDING: return 'bg-amber-300 text-amber-900';
      default: return 'bg-gray-400 text-white';
    }
  };

  return (
    <div 
      onClick={() => hasJoinedPerformance && onSummaryClick?.(concert.id)}
      className={`flex flex-col p-4 md:p-6 rounded-[2.5rem] border transition-all ${getBgColor(latestPerformance)} mb-4 shadow-sm hover:shadow-md ${hasJoinedPerformance ? 'cursor-pointer' : ''}`}
    >
      <div className="flex gap-4 md:gap-6 items-start">
        <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-gray-200 overflow-hidden flex-shrink-0 shadow-inner">
          <img src={concert.imageUrl || `https://picsum.photos/seed/${concert.id}/300`} className="w-full h-full object-cover" alt="Concert" />
        </div>
        <div className="flex-grow pt-1">
          <h4 className="text-base md:text-xl font-black text-gray-900 leading-tight mb-4">{concert.name || '名称未設定の公演'}</h4>
          <div className="space-y-3">
            {concert.performances.map(perf => {
              const autoSkipped = isAutoSkipped(perf, now);
              const showTickets = !autoSkipped && (perf.status === ConcertStatus.PENDING || perf.status === ConcertStatus.JOINED);
              
              return (
                <div key={perf.id} className="bg-white/40 rounded-xl border border-white/50 overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between p-2.5">
                    <div className="flex flex-col gap-0.5">
                       <div className="flex items-center gap-2">
                          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                          <span className="text-[10px] md:text-xs font-bold text-gray-600">
                            {perf.isUndetermined ? '日付未定' : (isValidDate(perf.date) ? new Date(perf.date).toLocaleDateString('ja-JP') : '日付未定')}
                          </span>
                       </div>
                       {perf.venue && (
                         <div className="flex items-center gap-2">
                           <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                           <span className="text-[9px] md:text-[10px] font-black text-gray-500 tracking-tight">{perf.venue}</span>
                         </div>
                       )}
                    </div>
                    <span className={`text-[8px] md:text-[10px] px-2.5 py-0.5 rounded-lg font-black uppercase tracking-tight shadow-sm transition-colors ${getStatusBadgeClass(perf)}`}>
                      {getStatusText(perf)}
                    </span>
                  </div>
                  
                  {showTickets && (perf.price || perf.ticketUrl) && (
                    <div className="px-3 pb-3 pt-1 border-t border-white/30 flex flex-wrap gap-x-4 gap-y-1.5">
                       {perf.price && (
                         <div className="flex items-center gap-1">
                           <span className="text-[12px] font-black text-gray-400 leading-none">￥</span>
                           <span className="text-[10px] font-bold text-gray-700">{perf.price}</span>
                         </div>
                       )}
                       {perf.ticketUrl && (
                         <div className="flex items-center gap-1.5">
                           <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.826L10.242 9.242a4 4 0 115.656 5.656l-1.101 1.101m-.758-4.826L12 12" /></svg>
                           <a 
                             href={perf.ticketUrl.startsWith('http') ? perf.ticketUrl : `https://${perf.ticketUrl}`} 
                             target="_blank" 
                             rel="noopener noreferrer" 
                             className="text-[10px] font-black text-gray-500 hover:text-gray-700 hover:underline flex items-center gap-1"
                           >
                             販売サイト
                             <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                           </a>
                         </div>
                       )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
