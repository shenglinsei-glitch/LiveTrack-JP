
import React from 'react';
import { Artist, ConcertStatus, Performance, HomeViewMode } from '../types';
import { getArtistStatus, isAutoSkipped } from '../App';

const isValidDate = (d?: string) => !!d && !isNaN(new Date(d).getTime());

interface ArtistCardProps {
  artist: Artist;
  now: Date;
  onClick: () => void;
  viewMode: HomeViewMode;
}

export const ArtistCard: React.FC<ArtistCardProps> = ({ artist, now, onClick, viewMode }) => {
  const statusInfo = getArtistStatus(artist, now);

  const allPerformancesWithConcert = artist.concerts.flatMap(c => 
    c.performances.map(p => ({ ...p, concertName: c.name }))
  );
  
  const relevantPerformances = allPerformancesWithConcert.filter(p => {
    const isPast = !p.isUndetermined && isValidDate(p.date) && new Date(p.date) < now;
    
    if (viewMode === HomeViewMode.REGULAR) {
      // 通常モード: 公演情報を表示しない
      return false;
    }

    if (viewMode === HomeViewMode.TRACKING) {
      // 追跡モード: 検討中、参戦を表示（過去の参戦を除く）
      // 過去の検討中（自動見送り）は表示しない
      if (isAutoSkipped(p, now)) return false;

      const isOngoingOrFuture = p.isUndetermined || !isPast;
      return (p.status === ConcertStatus.PENDING || p.status === ConcertStatus.JOINED) && isOngoingOrFuture;
    }

    if (viewMode === HomeViewMode.HISTORY) {
      // 履歴モード: 参戦済みのみ表示
      return p.status === ConcertStatus.JOINED && isPast;
    }

    return false;
  });

  const isHighlighted = artist.hasUpdate;

  return (
    <div className={`group relative flex flex-col justify-between p-6 transition-all rounded-[2rem] border-2 ${isHighlighted ? 'bg-[#53BEE8]/10 border-[#53BEE8]/20 shadow-md scale-[1.02]' : 'bg-white border-white shadow-sm hover:shadow-xl hover:scale-[1.01]'}`}>
      <div onClick={onClick} className="cursor-pointer">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="relative shrink-0">
              <img src={artist.avatar || `https://picsum.photos/seed/${artist.id}/100`} alt={artist.name} className="w-14 h-14 md:w-16 md:h-16 rounded-3xl object-cover border-2 border-white shadow-sm" />
              {artist.hasUpdate && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#53BEE8]/50 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-[#53BEE8] border-2 border-white"></span>
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h3 className={`text-xl font-black text-gray-900 transition-colors truncate ${isHighlighted ? 'text-[#53BEE8]' : 'group-hover:text-[#53BEE8]'}`}>{artist.name}</h3>
              <div className="flex flex-col mt-1 space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${statusInfo.color}`} />
                  <p className="text-[10px] md:text-xs text-gray-400 uppercase tracking-widest font-black truncate">{statusInfo.label}</p>
                </div>
              </div>
            </div>
          </div>
          <div className={`text-gray-300 transition-all shrink-0 ${isHighlighted ? 'text-[#53BEE8]' : 'group-hover:text-[#53BEE8]'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
          </div>
        </div>
      </div>

      {relevantPerformances.length > 0 && (
        <div className="mt-6 space-y-2">
          <div className="flex justify-between items-center px-1 mb-2">
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
              {viewMode === HomeViewMode.HISTORY ? '参戦履歴' : '追跡日程'}
            </span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {relevantPerformances.map((perf) => {
              const isPast = !perf.isUndetermined && isValidDate(perf.date) && new Date(perf.date) < now;
              return (
                <div key={perf.id} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                  <div className="flex flex-col min-w-0 flex-1 mr-2">
                    <span className="text-xs font-black text-gray-900 truncate">{perf.concertName}</span>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        {perf.isUndetermined ? '日程未定' : new Date(perf.date).toLocaleDateString()}
                      </span>
                      {perf.venue && (
                        <span className="text-[9px] text-[#53BEE8] font-bold truncate">@ {perf.venue}</span>
                      )}
                    </div>
                  </div>
                  <div className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter shadow-sm shrink-0 transition-colors ${
                    perf.status === ConcertStatus.JOINED 
                      ? (isPast ? 'bg-[#C1E9FA] text-[#2D8FB7]' : 'bg-[#53BEE8] text-white') 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {perf.status === ConcertStatus.JOINED ? (isPast ? '参戦済み' : '参戦') : '検討中'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
