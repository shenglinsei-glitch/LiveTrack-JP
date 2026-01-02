import React from 'react';
import { ConcertSection } from './ConcertSection';
import { MonitoringStage, Artist } from '../types';

interface ArtistDetailPageProps {
  selectedArtist: Artist | null;
  now: Date;

  getArtistStatus: (artist: Artist, now: Date) => {
    label: string;
    color: string;
  };

  setCurrentPage: (page: 'HOME' | 'DETAIL' | 'SETTINGS' | 'CONCERT_SUMMARY') => void;
  startEditing: (artist: Artist) => void;
  handleConfirmConcert: (artistId: string) => void;
  navigateToConcertSummary: (artistId: string, concertId: string) => void;
}

export const ArtistDetailPage: React.FC<ArtistDetailPageProps> = ({
  selectedArtist,
  now,
  getArtistStatus,
  setCurrentPage,
  startEditing,
  handleConfirmConcert,
  navigateToConcertSummary,
}) => {
  /* ===== 防空白兜底（必须） ===== */
  if (!selectedArtist) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        歌手情報を作成してください
      </div>
    );
  }

  /* ===== 关键：补上 status 定义 ===== */
  const status = getArtistStatus(selectedArtist, now);

  const validUrls = (selectedArtist.websiteUrls || []).filter(
    item => item.url.trim().length > 0
  );

  return (
    <div className="max-w-4xl mx-auto min-h-screen pb-20 md:pt-8">
      <header className="p-6 flex items-center bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100 rounded-b-3xl">
        <button
          onClick={() => setCurrentPage('HOME')}
          className="text-gray-400 p-1"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h2 className="flex-grow text-center font-bold text-gray-800 md:text-xl">
          {selectedArtist.name}
        </h2>

        <button
          onClick={() => startEditing(selectedArtist)}
          className="text-gray-400 p-1"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4
                 m-6 8a2 2 0 100-4m0 4a2 2 0 110-4
                 m0 4v2m0-6V4
                 m6 6v10
                 m6-2a2 2 0 100-4m0 4a2 2 0 110-4
                 m0 4v2m0-6V4"
            />
          </svg>
        </button>
      </header>

      <div className="px-4 sm:px-8 lg:px-12 mt-10">
        {selectedArtist.stage === MonitoringStage.CONCERT_DETECTED && (
          <div className="mb-8 p-6 bg-orange-50 border border-orange-100 rounded-[2rem] shadow-sm animate-pulse">
            <h4 className="text-orange-600 font-black text-lg mb-2 text-center">
              公演情報が検出されました！
            </h4>
            <p className="text-orange-400 text-xs text-center mb-6">
              詳細を入力してチケットの追跡を開始します。
            </p>
            <button
              onClick={() => handleConfirmConcert(selectedArtist.id)}
              className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-lg shadow-orange-200"
            >
              公演情報を確定する
            </button>
          </div>
        )}

        {/* 头像 / 状态 */}
        <div className="flex flex-col items-center mb-8">
          <img
            src={selectedArtist.avatar || ''}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://via.placeholder.com/200?text=No+Image';
            }}
            className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-lg object-cover mb-4"
          />

          <h3 className="text-2xl font-bold text-gray-900">
            {selectedArtist.name}
          </h3>

          <div className="mt-2 flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-slate-100 shadow-sm">
            <span className={`w-2 h-2 rounded-full ${status.color}`} />
            <span className="text-xs md:text-sm text-gray-500 font-bold uppercase tracking-widest">
              {status.label}
            </span>
          </div>
        </div>

        {/* 外部链接 */}
        {validUrls.length > 0 && (
          <div className="mb-10 flex flex-wrap justify-center gap-x-6 gap-y-3">
            {validUrls.map((item, idx) => (
              <a
                key={idx}
                href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-[#53BEE8]"
              >
                <span className="underline underline-offset-4">
                  {item.name || '公式サイト'}
                </span>
              </a>
            ))}
          </div>
        )}

        {/* 公演列表 */}
        <div className="space-y-4">
          <div className="px-2 mb-2">
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
              公演スケジュール
            </span>
          </div>

          {selectedArtist.concerts.length === 0 ? (
            <div className="p-10 text-center bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200">
              <p className="text-xs font-bold text-gray-300">
                スケジュールはまだありません
              </p>
            </div>
          ) : (
            selectedArtist.concerts.map(c => (
              <ConcertSection
                key={c.id}
                concert={c}
                now={now}
                onSummaryClick={(cid) =>
                  navigateToConcertSummary(selectedArtist.id, cid)
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
