
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Artist, MonitoringStage, Concert, Page, ConcertStatus, Performance, HomeViewMode, GlobalSettings, SortMode, MonitoringUrl } from './types';
import { ArtistCard } from './components/ArtistCard';
import { ConcertSection } from './components/ConcertSection';
import { simulateMonitor } from './services/geminiService';
import { STATUS_COLORS } from './constants';

const CURRENT_SCHEMA_VERSION = 1;

const isValidDate = (d?: string) => !!d && !isNaN(new Date(d).getTime());

/**
 * Helper to determine if a performance is effectively "Skipped" 
 * because its date has passed and it was still in "Pending" status.
 */
export const isAutoSkipped = (perf: Performance, now: Date) => {
  if (perf.status !== ConcertStatus.PENDING) return false;
  if (perf.isUndetermined || !isValidDate(perf.date)) return false;
  
  const concertDate = new Date(perf.date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return concertDate < today;
};

export const getArtistStatus = (artist: Artist, now: Date) => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // High Priority: System Alert (New Concert Detected)
  if (artist.stage === MonitoringStage.CONCERT_DETECTED) {
    return { label: '公演情報を検出！', color: STATUS_COLORS.ALERT };
  }

  const allPerformances = artist.concerts.flatMap(c => c.performances);
  
  const hasFutureJoined = allPerformances.some(p => 
    p.status === ConcertStatus.JOINED && (p.isUndetermined || (isValidDate(p.date) && new Date(p.date) >= today))
  );

  const hasFutureAny = allPerformances.some(p => 
    p.isUndetermined || (isValidDate(p.date) && new Date(p.date) >= today)
  );

  // 1. 開演前 (Priority after Alert)
  if (hasFutureJoined) {
    return { label: '開演前', color: STATUS_COLORS.PRE_SHOW };
  }

  // 2. ライブ追跡中（自動）
  if (artist.isAutoMonitoring) {
    // If in ticket tracking stage, show keyword if available, else standard auto label
    if (artist.stage === MonitoringStage.MONITORING_TICKETS && artist.latestKeyword) {
        return { label: artist.latestKeyword, color: STATUS_COLORS.TICKET_PHASE };
    }
    return { label: 'ライブ追跡中（自動）', color: STATUS_COLORS.AUTO_TRACKING };
  }

  // 3. ツアー中（見送ります）
  if (hasFutureAny) {
    return { label: 'ツアー中（見送ります）', color: STATUS_COLORS.TOURING_SKIPPED };
  }

  // 4. フォローしていません (Default/Manual with no future events)
  return { label: 'フォローしていません', color: STATUS_COLORS.NOT_FOLLOWING };
};

const App: React.FC = () => {
  const [artists, setArtists] = useState<Artist[]>(() => {
    const saved = localStorage.getItem('live-track-jp-artists');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return parsed.map((a: any) => ({
      ...a,
      websiteUrls: Array.isArray(a.websiteUrls) 
        ? a.websiteUrls.map((u: any) => typeof u === 'string' ? { name: '', url: u } : u) 
        : []
    }));
  });

  const [settings, setSettings] = useState<GlobalSettings>(() => {
    const saved = localStorage.getItem('live-track-jp-settings');
    return saved ? JSON.parse(saved) : { homeViewMode: HomeViewMode.REGULAR, sortMode: SortMode.MANUAL, autoUpdateTime: "10:00" };
  });

  const [now, setNow] = useState(new Date());
  const [currentPage, setCurrentPage] = useState<Page>('HOME');
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportConfirmModal, setShowImportConfirmModal] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [draggedArtistId, setDraggedArtistId] = useState<string | null>(null);
  const [pendingImportData, setPendingImportData] = useState<any>(null);
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [isUrlLoading, setIsUrlLoading] = useState(false);

  // For concerts
  const [concertUrlInputs, setConcertUrlInputs] = useState<Record<string, string>>({});
  const [concertUrlLoading, setConcertUrlLoading] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const concertFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const backupImportInputRef = useRef<HTMLInputElement>(null);
  const viewMenuRef = useRef<HTMLDivElement>(null);

  const [editArtist, setEditArtist] = useState<Artist | null>(null);
  const originalArtistRef = useRef<string>('');
  const cameFromHomeRef = useRef<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) {
        setShowViewMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem('live-track-jp-artists', JSON.stringify(artists));
    localStorage.setItem('live-track-jp-settings', JSON.stringify(settings));
  }, [artists, settings]);

  const sortedArtists = useMemo(() => {
    if (settings.sortMode === SortMode.ALPHABETICAL) {
      return [...artists].sort((a, b) => a.name.localeCompare(b.name, 'ja-JP'));
    }
    return artists;
  }, [artists, settings.sortMode]);

  const selectedArtist = useMemo(() => 
    artists.find(a => a.id === selectedArtistId), 
    [artists, selectedArtistId]
  );

  const totalPerformancesCount = useMemo(() => {
    if (settings.homeViewMode === HomeViewMode.REGULAR) return 0;
    let count = 0;
    artists.forEach(artist => {
      artist.concerts.forEach(concert => {
        concert.performances.forEach(perf => {
          const isPast = !perf.isUndetermined && isValidDate(perf.date) && new Date(perf.date) < now;
          if (settings.homeViewMode === HomeViewMode.TRACKING) {
            if (isAutoSkipped(perf, now)) return;
            const isOngoingOrFuture = perf.isUndetermined || !isPast;
            if ((perf.status === ConcertStatus.PENDING || perf.status === ConcertStatus.JOINED) && isOngoingOrFuture) count++;
          } else if (settings.homeViewMode === HomeViewMode.HISTORY) {
            if (perf.status === ConcertStatus.JOINED && isPast) count++;
          }
        });
      });
    });
    return count;
  }, [artists, settings.homeViewMode, now]);

  const isDirty = useMemo(() => {
    if (!editArtist) return false;
    return JSON.stringify(editArtist) !== originalArtistRef.current;
  }, [editArtist]);

  const startEditing = (artist: Artist, fromHome: boolean = false) => {
    setEditArtist(JSON.parse(JSON.stringify(artist)));
    originalArtistRef.current = JSON.stringify(artist);
    cameFromHomeRef.current = fromHome;
    setAvatarUrlInput('');
    setConcertUrlInputs({});
    setConcertUrlLoading({});
    setCurrentPage('SETTINGS');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => callback(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const imageUrlToBase64 = async (url: string): Promise<string> => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; 
    img.src = url;
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('画像の読み込みに失敗しました。'));
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context could not be created');
    
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  };

  const handleUrlAvatarLoad = async () => {
    if (!avatarUrlInput.trim()) return;
    setIsUrlLoading(true);
    try {
      const dataUrl = await imageUrlToBase64(avatarUrlInput);
      if (editArtist) {
        setEditArtist({ ...editArtist, avatar: dataUrl });
        setAvatarUrlInput('');
      }
    } catch (err) {
      console.warn("CORS or loading error. Storing direct URL as fallback.", err);
      if (editArtist) {
        setEditArtist({ ...editArtist, avatar: avatarUrlInput });
      }
    } finally {
      setIsUrlLoading(false);
    }
  };

  const handleConcertUrlLoad = async (concertId: string) => {
    const url = concertUrlInputs[concertId];
    if (!url || !url.trim()) return;

    setConcertUrlLoading(prev => ({ ...prev, [concertId]: true }));
    try {
      const dataUrl = await imageUrlToBase64(url);
      if (editArtist) {
        const newConcerts = editArtist.concerts.map(c => 
          c.id === concertId ? { ...c, imageUrl: dataUrl } : c
        );
        setEditArtist({ ...editArtist, concerts: newConcerts });
        setConcertUrlInputs(prev => ({ ...prev, [concertId]: '' }));
      }
    } catch (err) {
      console.warn("CORS or loading error. Storing direct URL as fallback.", err);
      if (editArtist) {
        const newConcerts = editArtist.concerts.map(c => 
          c.id === concertId ? { ...c, imageUrl: url } : c
        );
        setEditArtist({ ...editArtist, concerts: newConcerts });
      }
    } finally {
      setConcertUrlLoading(prev => ({ ...prev, [concertId]: false }));
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const updatedArtists = await Promise.all(artists.map(async (artist) => {
      const result = await simulateMonitor(artist);
      if (result.hasChange) {
        return { 
          ...artist, 
          stage: result.newStage || artist.stage, 
          latestKeyword: result.keyword || artist.latestKeyword, 
          hasUpdate: true, 
          lastChecked: new Date().toISOString() 
        };
      }
      return { ...artist, lastChecked: new Date().toISOString() };
    }));
    setArtists(updatedArtists);
    setIsRefreshing(false);
  };

  const handleConfirmConcert = (artistId: string) => {
    const artist = artists.find(a => a.id === artistId);
    if (!artist) return;
    const newConcert: Concert = {
      id: Date.now().toString(),
      name: '',
      performances: [{
        id: (Date.now() + 1).toString(),
        date: '',
        isUndetermined: false,
        status: ConcertStatus.PENDING,
        venue: ''
      }]
    };
    const updatedArtist: Artist = {
      ...artist,
      stage: MonitoringStage.MONITORING_TICKETS,
      hasUpdate: false,
      concerts: [...artist.concerts, newConcert]
    };
    setArtists(artists.map(a => a.id === artistId ? updatedArtist : a));
    setSelectedArtistId(artistId);
    startEditing(updatedArtist);
  };

  const addArtist = () => {
    const newArtist: Artist = {
      id: Date.now().toString(),
      name: '新規アーティスト',
      websiteUrls: [{ name: '', url: '' }],
      isAutoMonitoring: false,
      monitoringInterval: 7,
      monitoringTime: "10:00",
      stage: MonitoringStage.MONITORING_CONCERT,
      hasUpdate: false,
      concerts: [],
      latestKeyword: ''
    };
    setArtists([...artists, newArtist]);
    setSelectedArtistId(newArtist.id);
    startEditing(newArtist, true);
  };

  const deleteArtist = () => {
    if (editArtist) {
      setArtists(artists.filter(a => a.id !== editArtist.id));
      setEditArtist(null);
      setSelectedArtistId(null);
      setShowDeleteModal(false);
      setCurrentPage('HOME');
    }
  };

  const handleSettingsBack = () => {
    if (isDirty) {
      setShowUnsavedModal(true);
    } else {
      // If we added a new artist from Home and didn't change anything, remove the placeholder
      if (cameFromHomeRef.current && editArtist) {
        try {
          const original = JSON.parse(originalArtistRef.current);
          if (original.name === '新規アーティスト') {
            setArtists(prev => prev.filter(a => a.id !== editArtist.id));
          }
        } catch (e) {}
      }
      
      setCurrentPage(cameFromHomeRef.current ? 'HOME' : 'DETAIL');
      setEditArtist(null);
    }
  };

  const discardChangesAndLeave = () => {
    if (cameFromHomeRef.current && editArtist) {
      try {
        const original = JSON.parse(originalArtistRef.current);
        if (original.name === '新規アーティスト') {
          setArtists(artists.filter(a => a.id !== editArtist.id));
        }
      } catch (e) {}
    }
    setShowUnsavedModal(false);
    setEditArtist(null);
    setCurrentPage(cameFromHomeRef.current ? 'HOME' : 'DETAIL');
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    if (settings.sortMode !== SortMode.MANUAL) return;
    setDraggedArtistId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    if (settings.sortMode !== SortMode.MANUAL) return;
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, targetId: string) => {
    if (settings.sortMode !== SortMode.MANUAL || !draggedArtistId || draggedArtistId === targetId) return;
    
    const newArtists = [...artists];
    const draggedIndex = newArtists.findIndex(a => a.id === draggedArtistId);
    const targetIndex = newArtists.findIndex(a => a.id === targetId);
    
    const [removed] = newArtists.splice(draggedIndex, 1);
    newArtists.splice(targetIndex, 0, removed);
    
    setArtists(newArtists);
    setDraggedArtistId(null);
  };

  const handleExportBackup = () => {
    const backupData = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      artists,
      settings,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    link.href = url;
    link.download = `livetrack_backup_${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowViewMenu(false);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.artists && Array.isArray(data.artists)) {
          const incomingVersion = data.schemaVersion || 0;
          
          if (incomingVersion > CURRENT_SCHEMA_VERSION) {
            alert('より新しいバージョンのデータです。アプリを最新版にアップデートしてください。');
            return;
          }

          // Compatibility: Perform migrations if incomingVersion < CURRENT_SCHEMA_VERSION
          // (No migrations currently needed for version 1)
          
          setPendingImportData(data);
          setShowImportConfirmModal(true);
        } else {
          alert('不正なバックアップファイルです。');
        }
      } catch (err) {
        alert('ファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
    // Reset the input so the same file can be selected again if needed
    e.target.value = '';
  };

  const confirmImport = () => {
    if (pendingImportData) {
      setArtists(pendingImportData.artists);
      if (pendingImportData.settings) {
        setSettings(pendingImportData.settings);
      }
      setShowImportConfirmModal(false);
      setPendingImportData(null);
      setShowViewMenu(false);
    }
  };

  const renderHome = () => (
    <div className="max-w-6xl mx-auto min-h-screen pb-36">
      <header className="px-6 pt-10 md:pt-16 flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">LiveTrack <span className="text-[#53BEE8]">JP</span></h1>
          <p className="text-sm md:text-base text-gray-400 mt-2 font-medium italic">Monitor without anxiety.</p>
        </div>
        <button onClick={handleRefresh} className={`p-3 rounded-full transition-all shadow-sm bg-white border border-gray-100 ${isRefreshing ? 'animate-spin text-[#53BEE8]' : 'text-gray-400 hover:text-[#53BEE8]'}`}>
          <svg className="h-6 w-6 md:h-8 md:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </header>

      <div className="px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
          {sortedArtists.map((artist) => (
            <div 
              key={artist.id} 
              draggable={settings.sortMode === SortMode.MANUAL}
              onDragStart={(e) => onDragStart(e, artist.id)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, artist.id)}
              className={draggedArtistId === artist.id ? 'opacity-40' : ''}
            >
              <ArtistCard 
                artist={artist} 
                now={now}
                viewMode={settings.homeViewMode} 
                onClick={() => { setSelectedArtistId(artist.id); setArtists(prev => prev.map(a => a.id === artist.id ? { ...a, hasUpdate: false } : a)); setCurrentPage('DETAIL'); }}
              />
            </div>
          ))}
        </div>
      </div>

      {settings.homeViewMode !== HomeViewMode.REGULAR && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none text-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#53BEE8]/50" />
            {settings.homeViewMode === HomeViewMode.TRACKING ? `追跡中: ${totalPerformancesCount} 公演` : `参戦済み: ${totalPerformancesCount} 公演`}
          </p>
        </div>
      )}

      <div className="fixed bottom-8 left-8 z-50">
        <div className="relative" ref={viewMenuRef}>
          <button onClick={() => setShowViewMenu(!showViewMenu)} className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all border shadow-lg ${showViewMenu ? 'bg-[#53BEE8] text-white border-[#53BEE8]' : 'bg-white text-gray-400 border-gray-100'}`}>
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          {showViewMenu && (
            <div className="absolute left-0 bottom-full mb-4 w-64 bg-white rounded-[2rem] shadow-2xl border border-gray-50 p-2 z-[100] overflow-hidden">
              <div className="px-4 py-3 bg-gray-50/50">
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">表示設定</span>
                <div className="mt-2 space-y-1">
                  <button onClick={() => setSettings({...settings, homeViewMode: HomeViewMode.REGULAR})} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-black transition-all ${settings.homeViewMode === HomeViewMode.REGULAR ? 'bg-[#53BEE8] text-white' : 'text-gray-500 hover:bg-white'}`}>通常モード</button>
                  <button onClick={() => setSettings({...settings, homeViewMode: HomeViewMode.TRACKING})} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-black transition-all ${settings.homeViewMode === HomeViewMode.TRACKING ? 'bg-[#53BEE8] text-white' : 'text-gray-500 hover:bg-white'}`}>追跡モード</button>
                  <button onClick={() => setSettings({...settings, homeViewMode: HomeViewMode.HISTORY})} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-black transition-all ${settings.homeViewMode === HomeViewMode.HISTORY ? 'bg-[#53BEE8] text-white' : 'text-gray-500 hover:bg-white'}`}>参戦履歴</button>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">並び替え</span>
                  <div className="mt-2 space-y-1">
                    <button onClick={() => setSettings({...settings, sortMode: SortMode.ALPHABETICAL})} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-black transition-all ${settings.sortMode === SortMode.ALPHABETICAL ? 'bg-[#53BEE8] text-white' : 'text-gray-500 hover:bg-white'}`}>五十音順</button>
                    <button onClick={() => setSettings({...settings, sortMode: SortMode.MANUAL})} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-black transition-all ${settings.sortMode === SortMode.MANUAL ? 'bg-[#53BEE8] text-white' : 'text-gray-500 hover:bg-white'}`}>手動（ドラッグ）</button>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">データ管理</span>
                  <div className="mt-2 space-y-1">
                    <button onClick={handleExportBackup} className="w-full text-left px-3 py-2 rounded-xl text-xs font-black text-gray-500 hover:bg-white transition-all flex items-center gap-2">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      バックアップを書き出す
                    </button>
                    <button onClick={() => backupImportInputRef.current?.click()} className="w-full text-left px-3 py-2 rounded-xl text-xs font-black text-gray-500 hover:bg-white transition-all flex items-center gap-2">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      バックアップを読み込む
                    </button>
                    <input type="file" ref={backupImportInputRef} className="hidden" accept=".json" onChange={handleImportFileChange} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-8 right-8 z-50"><button onClick={addArtist} className="w-16 h-16 md:w-20 md:h-20 bg-[#53BEE8] text-white rounded-full flex items-center justify-center shadow-xl transition-all"><svg className="h-8 w-8 md:h-12 md:w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg></button></div>
    </div>
  );

  const renderDetail = () => {
    if (!selectedArtist) return null;
    const status = getArtistStatus(selectedArtist, now);
    const validUrls = selectedArtist.websiteUrls.filter(item => item.url.trim().length > 0);

    return (
      <div className="max-w-4xl mx-auto min-h-screen pb-20 md:pt-8">
        <header className="p-6 flex items-center bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100 rounded-b-3xl">
          <button onClick={() => setCurrentPage('HOME')} className="text-gray-400 p-1"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
          <h2 className="flex-grow text-center font-bold text-gray-800 md:text-xl">{selectedArtist.name}</h2>
          <button onClick={() => startEditing(selectedArtist)} className="text-gray-400 p-1"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg></button>
        </header>

        <div className="px-4 sm:px-8 lg:px-12 mt-10">
          {selectedArtist.stage === MonitoringStage.CONCERT_DETECTED && (
            <div className="mb-8 p-6 bg-orange-50 border border-orange-100 rounded-[2rem] shadow-sm animate-pulse">
              <h4 className="text-orange-600 font-black text-lg mb-2 text-center">公演情報が検出されました！</h4>
              <p className="text-orange-400 text-xs text-center mb-6">詳細を入力してチケットの追跡を開始します。</p>
              <button onClick={() => handleConfirmConcert(selectedArtist.id)} className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-lg shadow-orange-200">公演情報を確定する</button>
            </div>
          )}

          <div className="flex flex-col items-center mb-8">
            <img src={selectedArtist.avatar || `https://picsum.photos/seed/${selectedArtist.id}/200`} className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-lg object-cover mb-4" />
            <h3 className="text-2xl font-bold text-gray-900">{selectedArtist.name}</h3>
            <div className="mt-2 flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-slate-100 shadow-sm">
              <span className={`w-2 h-2 rounded-full ${status.color}`} />
              <span className="text-xs md:text-sm text-gray-500 font-bold uppercase tracking-widest">{status.label}</span>
            </div>
          </div>

          {validUrls.length > 0 && (
            <div className="mb-10 flex flex-wrap justify-center gap-x-6 gap-y-3">
              {validUrls.map((item, idx) => (
                <a 
                  key={idx}
                  href={item.url.startsWith('http') ? item.url : `https://${item.url}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="group flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-[#53BEE8] transition-all"
                >
                  <svg className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  <span className="underline decoration-slate-200 group-hover:decoration-[#53BEE8] underline-offset-4">{item.name || '公式サイト'}</span>
                </a>
              ))}
            </div>
          )}

          <div className="space-y-4">
            <div className="px-2 mb-2 flex justify-between items-center">
              <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">公演スケジュール</span>
            </div>
            {selectedArtist.concerts.length === 0 ? (
              <div className="p-10 text-center bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200">
                <p className="text-xs font-bold text-gray-300">スケジュールはまだありません</p>
              </div>
            ) : (
              selectedArtist.concerts.map(c => <ConcertSection key={c.id} concert={c} now={now} />)
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    if (!editArtist) return null;
    return (
      <div className="max-w-3xl mx-auto min-h-screen pb-24 md:pt-8 relative">
        <header className="p-6 flex items-center bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 rounded-b-3xl mb-8">
          <button onClick={handleSettingsBack} className="text-gray-400 p-1 hover:text-[#53BEE8] transition-colors"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
          <h2 className="flex-grow text-center font-bold text-gray-800 md:text-xl">アーティスト管理</h2>
          <button onClick={() => setShowDeleteModal(true)} className="text-gray-400 hover:text-red-500 p-1 transition-colors"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
        </header>

        <div className="p-6 sm:p-10 space-y-12">
          <section className="flex flex-col items-center">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <img src={editArtist.avatar || `https://picsum.photos/seed/${editArtist.id}/200`} className="w-28 h-28 md:w-36 md:h-36 rounded-full object-cover border-4 border-white shadow-md transition-all group-hover:brightness-75" />
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, (url) => setEditArtist({ ...editArtist, avatar: url }))} />
              <div className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                 <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
            </div>
            
            <div className="mt-6 w-full max-w-xs">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-center mb-2">画像URLから読み込む</label>
              <div className="flex gap-2 p-1 bg-white rounded-xl border border-slate-100 shadow-sm">
                <input 
                  type="text" 
                  value={avatarUrlInput} 
                  onChange={(e) => setAvatarUrlInput(e.target.value)}
                  placeholder="https://..." 
                  className="flex-grow bg-transparent px-3 py-2 text-xs outline-none"
                />
                <button 
                  onClick={handleUrlAvatarLoad} 
                  disabled={isUrlLoading || !avatarUrlInput.trim()}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${isUrlLoading || !avatarUrlInput.trim() ? 'bg-gray-100 text-gray-400' : 'bg-[#53BEE8] text-white hover:bg-[#42adc9]'}`}
                >
                  {isUrlLoading ? '読み込み中...' : '読込'}
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">アーティスト名</label>
            <input value={editArtist.name} onChange={(e) => setEditArtist({ ...editArtist, name: e.target.value })} className="w-full text-2xl font-black p-4 bg-white rounded-2xl border-2 border-transparent focus:border-[#53BEE8]/40 outline-none shadow-sm" placeholder="アーティスト名" />
          </section>

          <section className="p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">追跡設定</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={editArtist.isAutoMonitoring} onChange={(e) => setEditArtist({...editArtist, isAutoMonitoring: e.target.checked})} />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-[#53BEE8] after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                <span className="ml-3 text-xs font-black text-gray-400">自動識別</span>
              </label>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">追跡フェーズ</span>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setEditArtist({...editArtist, stage: MonitoringStage.MONITORING_CONCERT})}
                  className={`py-3 rounded-xl text-xs font-black transition-all border-2 ${editArtist.stage === MonitoringStage.MONITORING_CONCERT ? 'bg-[#53BEE8] text-white border-[#53BEE8]' : 'bg-slate-50 text-gray-400 border-transparent'}`}
                >
                  公演追跡
                </button>
                <button 
                  onClick={() => setEditArtist({...editArtist, stage: MonitoringStage.MONITORING_TICKETS})}
                  className={`py-3 rounded-xl text-xs font-black transition-all border-2 ${editArtist.stage === MonitoringStage.MONITORING_TICKETS ? 'bg-[#53BEE8] text-white border-[#53BEE8]' : 'bg-slate-50 text-gray-400 border-transparent'}`}
                >
                  チケット追跡
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600">追跡URL</span>
                <button onClick={() => setEditArtist({...editArtist, websiteUrls: [...editArtist.websiteUrls, { name: '', url: '' }]})} className="text-[10px] font-black text-[#53BEE8]">+ 追加</button>
              </div>
              {editArtist.websiteUrls.map((item, i) => (
                <div key={i} className="space-y-2 p-3 bg-slate-50 rounded-2xl relative">
                  <div className="flex gap-2">
                    <input 
                      value={item.name} 
                      onChange={(e) => { 
                        const urls = [...editArtist.websiteUrls]; 
                        urls[i].name = e.target.value; 
                        setEditArtist({...editArtist, websiteUrls: urls}); 
                      }} 
                      className="w-1/3 p-2 bg-white rounded-lg text-[10px] font-bold outline-none focus:ring-1 ring-[#53BEE8] shadow-sm" 
                      placeholder="サイト名 (例: Twitter)" 
                    />
                    <input 
                      value={item.url} 
                      onChange={(e) => { 
                        const urls = [...editArtist.websiteUrls]; 
                        urls[i].url = e.target.value; 
                        setEditArtist({...editArtist, websiteUrls: urls}); 
                      }} 
                      className="flex-grow p-2 bg-white rounded-lg text-[10px] font-bold outline-none focus:ring-1 ring-[#53BEE8] shadow-sm" 
                      placeholder="https://..." 
                    />
                    <button onClick={() => { const urls = editArtist.websiteUrls.filter((_, idx) => idx !== i); setEditArtist({...editArtist, websiteUrls: urls}); }} className="p-1 text-gray-300 hover:text-red-400 transition-colors">✕</button>
                  </div>
                </div>
              ))}
            </div>

            {editArtist.isAutoMonitoring && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase">追跡間隔 (日)</span>
                  <input type="number" min="1" max="14" value={editArtist.monitoringInterval} onChange={(e) => setEditArtist({...editArtist, monitoringInterval: parseInt(e.target.value)})} className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold" />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">実行時間 (30分単位)</span>
                  <select value={editArtist.monitoringTime} onChange={(e) => setEditArtist({...editArtist, monitoringTime: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold">
                    {Array.from({length: 48}).map((_, i) => {
                      const h = Math.floor(i / 2).toString().padStart(2, '0');
                      const m = (i % 2 === 0 ? '00' : '30');
                      return <option key={i} value={`${h}:${m}`}>{h}:{m}</option>;
                    })}
                  </select>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">公演スケジュール</label>
              <button onClick={() => setEditArtist({ ...editArtist, concerts: [...editArtist.concerts, { id: Date.now().toString(), name: '', performances: [] }] })} className="text-xs font-black text-[#53BEE8]">+ 公演を追加</button>
            </div>
            {editArtist.concerts.length === 0 && (
              <div className="p-10 text-center bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200">
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">公演情報なし</p>
              </div>
            )}
            {editArtist.concerts.map((concert, cIdx) => (
              <div key={concert.id} className="p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Concert Image Management */}
                  <div className="flex-shrink-0 flex flex-col items-center space-y-3">
                    <div className="relative group cursor-pointer w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-gray-100 border-2 border-slate-50 shadow-inner" onClick={() => concertFileInputRefs.current[concert.id]?.click()}>
                      <img 
                        src={concert.imageUrl || `https://picsum.photos/seed/${concert.id}/300`} 
                        className="w-full h-full object-cover transition-all group-hover:brightness-75" 
                      />
                      <input 
                        type="file" 
                        // Fix TypeScript error by wrapping ref assignment in curly braces to ensure return type is void
                        ref={el => { concertFileInputRefs.current[concert.id] = el; }} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => handleFileUpload(e, (url) => {
                          const newC = [...editArtist.concerts];
                          newC[cIdx].imageUrl = url;
                          setEditArtist({ ...editArtist, concerts: newC });
                        })} 
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </div>
                    </div>
                    <div className="w-full max-w-[120px]">
                      <div className="flex flex-col gap-1">
                        <input 
                          type="text" 
                          value={concertUrlInputs[concert.id] || ''} 
                          onChange={(e) => setConcertUrlInputs(prev => ({ ...prev, [concert.id]: e.target.value }))}
                          placeholder="画像URL" 
                          className="w-full bg-slate-50 px-2 py-1 text-[8px] font-bold rounded-md border border-slate-100 outline-none"
                        />
                        <button 
                          onClick={() => handleConcertUrlLoad(concert.id)} 
                          disabled={concertUrlLoading[concert.id] || !concertUrlInputs[concert.id]?.trim()}
                          className={`w-full py-1 rounded-md text-[8px] font-black transition-all ${concertUrlLoading[concert.id] || !concertUrlInputs[concert.id]?.trim() ? 'bg-gray-100 text-gray-400' : 'bg-[#53BEE8] text-white hover:bg-[#42adc9]'}`}
                        >
                          {concertUrlLoading[concert.id] ? '読込中' : 'URL読込'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex-grow space-y-6">
                    <div className="flex items-center gap-2">
                      <input value={concert.name} onChange={(e) => { const newC = [...editArtist.concerts]; newC[cIdx].name = e.target.value; setEditArtist({ ...editArtist, concerts: newC }); }} placeholder="公演名" className="flex-grow text-lg font-black border-b border-slate-100 outline-none p-1" />
                      <button onClick={() => { const newC = editArtist.concerts.filter((_, idx) => idx !== cIdx); setEditArtist({...editArtist, concerts: newC}); }} className="text-red-300 hover:text-red-500">✕</button>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-black text-gray-300">
                        <span>日程 & 状態 / 会場・チケット情報</span>
                        <button onClick={() => { const newC = [...editArtist.concerts]; newC[cIdx].performances.push({ id: Date.now().toString(), date: '', isUndetermined: false, status: ConcertStatus.PENDING, venue: '' }); setEditArtist({ ...editArtist, concerts: newC }); }} className="text-[#53BEE8]">+ 日程追加</button>
                      </div>
                      {concert.performances.map((perf, pIdx) => {
                        const isPastDate = !perf.isUndetermined && isValidDate(perf.date) && (new Date(perf.date) < new Date(now.getFullYear(), now.getMonth(), now.getDate()));

                        return (
                          <div key={perf.id} className="p-4 bg-slate-50 rounded-2xl space-y-3 border border-slate-100">
                            <div className="flex items-center gap-3">
                              <input type="date" disabled={perf.isUndetermined} value={perf.date} onChange={(e) => { 
                                const newC = [...editArtist.concerts]; 
                                newC[cIdx].performances[pIdx].date = e.target.value; 
                                const isNewDatePast = isValidDate(e.target.value) && (new Date(e.target.value) < new Date(now.getFullYear(), now.getMonth(), now.getDate()));
                                if (isNewDatePast && newC[cIdx].performances[pIdx].status === ConcertStatus.PENDING) {
                                  newC[cIdx].performances[pIdx].status = ConcertStatus.SKIPPED;
                                }
                                setEditArtist({ ...editArtist, concerts: newC }); 
                              }} className="flex-grow p-2 rounded-lg text-xs font-bold shadow-sm" />
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input type="checkbox" checked={perf.isUndetermined} onChange={(e) => { const newC = [...editArtist.concerts]; newC[cIdx].performances[pIdx].isUndetermined = e.target.checked; if(e.target.checked) newC[cIdx].performances[pIdx].date = ''; setEditArtist({ ...editArtist, concerts: newC }); }} />
                                <span className="text-[10px] font-black text-gray-400">未定</span>
                              </label>
                              <button onClick={() => { const newC = [...editArtist.concerts]; newC[cIdx].performances = newC[cIdx].performances.filter(p => p.id !== perf.id); setEditArtist({ ...editArtist, concerts: newC }); }} className="text-gray-300 hover:text-red-400">✕</button>
                            </div>

                            <div className="space-y-2">
                              <input 
                                value={perf.venue || ''} 
                                onChange={(e) => { const newC = [...editArtist.concerts]; newC[cIdx].performances[pIdx].venue = e.target.value; setEditArtist({ ...editArtist, concerts: newC }); }} 
                                placeholder="会場名 (例: ぴあアリーナMM)" 
                                className="w-full p-2 rounded-lg text-[10px] font-bold bg-white border border-slate-100 shadow-sm" 
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <input value={perf.price || ''} onChange={(e) => { const newC = [...editArtist.concerts]; newC[cIdx].performances[pIdx].price = e.target.value; setEditArtist({ ...editArtist, concerts: newC }); }} placeholder="价格 (例: ¥10,000)" className="p-2 rounded-lg text-[10px] font-bold bg-white border border-slate-100 shadow-sm" />
                                <input value={perf.ticketUrl || ''} onChange={(e) => { const newC = [...editArtist.concerts]; newC[cIdx].performances[pIdx].ticketUrl = e.target.value; setEditArtist({ ...editArtist, concerts: newC }); }} placeholder="チケットURL" className="p-2 rounded-lg text-[10px] font-bold bg-white border border-slate-100 shadow-sm" />
                              </div>
                            </div>

                            <div className="flex gap-1">
                              {[ConcertStatus.PENDING, ConcertStatus.SKIPPED, ConcertStatus.LOST, ConcertStatus.JOINED].map(s => {
                                const isPending = s === ConcertStatus.PENDING;
                                const isDisabled = isPending && isPastDate;
                                
                                return (
                                  <button 
                                    key={s} 
                                    disabled={isDisabled}
                                    onClick={() => { 
                                      const newC = [...editArtist.concerts]; 
                                      newC[cIdx].performances[pIdx].status = s; 
                                      setEditArtist({ ...editArtist, concerts: newC }); 
                                    }} 
                                    className={`flex-1 py-1.5 text-[9px] font-black rounded-lg border transition-all ${
                                      perf.status === s 
                                        ? 'bg-[#53BEE8] text-white border-[#53BEE8] shadow-sm' 
                                        : 'bg-white text-gray-400 border-slate-100'
                                    } ${isDisabled ? 'opacity-20 cursor-not-allowed bg-gray-100' : ''}`}
                                  >
                                    {s === 'PENDING' ? '検討' : s === 'SKIPPED' ? '見送り' : s === 'LOST' ? '落選' : '参戦'}
                                  </button>
                                );
                              })}
                            </div>
                            {isPastDate && (
                              <p className="text-[8px] text-gray-400 text-center font-bold">※ 過去の日付のため「検討」は選択できません</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <div className="pt-10 flex flex-col items-center">
            <button disabled={!isDirty} onClick={() => { setArtists(prev => prev.map(a => a.id === editArtist.id ? editArtist : a)); setEditArtist(null); setCurrentPage(cameFromHomeRef.current ? 'HOME' : 'DETAIL'); }} className={`px-16 py-4 rounded-full text-sm font-black transition-all ${isDirty ? 'bg-[#53BEE8] text-white shadow-xl shadow-[#53BEE8]/20' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>保存</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 relative">
      {currentPage === 'HOME' && renderHome()}
      {currentPage === 'DETAIL' && renderDetail()}
      {currentPage === 'SETTINGS' && renderSettings()}
      
      {showUnsavedModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl">
            <h3 className="text-center text-xl font-black text-gray-900 mb-2">未保存の内容</h3>
            <p className="text-center text-sm text-gray-400 font-medium mb-8">変更を破棄して戻りますか？</p>
            <div className="flex gap-4">
              <button onClick={() => setShowUnsavedModal(false)} className="flex-1 py-4 bg-slate-50 rounded-2xl font-black text-sm text-gray-400">キャンセル</button>
              <button onClick={discardChangesAndLeave} className="flex-1 py-4 bg-red-500 rounded-2xl font-black text-sm text-white">破棄する</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in scale-in">
           <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl">
            <h3 className="text-center text-xl font-black text-gray-900 mb-2 text-red-600">アーティスト削除</h3>
            <p className="text-center text-sm text-gray-400 font-medium mb-8">このアーティストとすべての公演情報を削除しますか？</p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-4 bg-slate-50 rounded-2xl font-black text-sm text-gray-400">キャンセル</button>
              <button onClick={deleteArtist} className="flex-1 py-4 bg-red-600 rounded-2xl font-black text-sm text-white">削除する</button>
            </div>
          </div>
        </div>
      )}

      {showImportConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in fade-in scale-in">
          <div className="bg-white w-full max-md rounded-[2rem] p-8 shadow-2xl">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
            </div>
            <h3 className="text-center text-xl font-black text-gray-900 mb-4">バックアップを読み込みますか</h3>
            <p className="text-center text-sm text-gray-500 font-bold leading-relaxed mb-10">
              現在のデータはすべて削除され、バックアップの内容で置き換えられます。この操作は元に戻せません。
            </p>
            <div className="flex gap-4">
              <button onClick={() => { setShowImportConfirmModal(false); setPendingImportData(null); }} className="flex-1 py-4 bg-slate-50 rounded-2xl font-black text-sm text-gray-400 hover:bg-slate-100 transition-colors">キャンセル</button>
              <button onClick={confirmImport} className="flex-1 py-4 bg-[#53BEE8] rounded-2xl font-black text-sm text-white hover:bg-[#42adc9] transition-colors shadow-lg shadow-[#53BEE8]/20">確定する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
