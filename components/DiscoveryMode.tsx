
import React, { useState, useRef, useEffect } from 'react';
import { TikTokVideo, SearchStrategy, RankedVideo } from '../types';
import { searchTikTokVideos, generateSearchStrategy, aiRankVideoRelevance, analyzeTikTokLink } from '../services/geminiService';
import { VideoPlayerModal } from './VideoPlayerModal';
import { CompetitorComparator } from './CompetitorComparator';
import { TrendRadar } from './TrendRadar';
import { AudiencePulse } from './AudiencePulse';
import { TrendArchive } from './TrendArchive';
import { ROITracker } from './ROITracker';
import { MarketIntelligenceScanner } from './MarketIntelligenceScanner';
import { KOCQualityAudit } from './KOCQualityAudit';

interface DiscoveryModeProps {
    onAnalyzeSelected: (videos: TikTokVideo[]) => void;
    onDirectAnalyze: (input: string, mode: 'single' | 'channel') => void;
    isGlobalProcessing?: boolean;
    globalProcessStep?: string;
    onGlobalStop?: () => void;
    analysisResultNode?: React.ReactNode; // New Prop to render results internally
}

type SortOption = 'relevance' | 'views' | 'likes' | 'comments' | 'shares' | 'potential';

const SUGGESTIONS = [
    "Tắm cho bé sơ sinh", "Dung dịch vệ sinh phụ nữ", "Ăn dặm kiểu Nhật", 
    "Chăm sóc mẹ sau sinh", "Nhạc ru bé ngủ", "Review bỉm sữa", 
    "Đồ chơi phát triển trí tuệ", "Mẹo vặt gia đình", "Yoga bầu"
];

const ITEMS_PER_PAGE = 25;

export const DiscoveryMode: React.FC<DiscoveryModeProps> = ({ 
    onAnalyzeSelected, 
    onDirectAnalyze,
    isGlobalProcessing,
    globalProcessStep,
    onGlobalStop,
    analysisResultNode
}) => {
    const [searchMode, setSearchMode] = useState<'keyword' | 'script' | 'competitor' | 'trend_radar' | 'audience_pulse' | 'trend_archive' | 'roi_tracker' | 'market_intel' | 'koc_audit'>('keyword');
    const [keyword, setKeyword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [scanProgress, setScanProgress] = useState<{current: number, total: number} | null>(null);
    
    const [results, setResults] = useState<RankedVideo[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [sortBy, setSortBy] = useState<SortOption>('relevance');
    const [error, setError] = useState<string | null>(null);
    const [searchStrategy, setSearchStrategy] = useState<SearchStrategy | null>(null);
    
    // Search History State
    const [searchHistory, setSearchHistory] = useState<string[]>([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    
    const [playingVideo, setPlayingVideo] = useState<TikTokVideo | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Load History on Mount
    useEffect(() => {
        const savedHistory = localStorage.getItem('tiktok_search_keyword_history');
        if (savedHistory) {
            try {
                setSearchHistory(JSON.parse(savedHistory));
            } catch (e) { console.error("Failed to load search history"); }
        }
    }, []);

    const addToHistory = (term: string) => {
        if (!term.trim() || term.length > 50) return; // Ignore empty or too long
        // Avoid duplicates and keep last 10
        const newHistory = [term, ...searchHistory.filter(h => h.toLowerCase() !== term.toLowerCase())].slice(0, 10);
        setSearchHistory(newHistory);
        localStorage.setItem('tiktok_search_keyword_history', JSON.stringify(newHistory));
    };

    const clearHistory = () => {
        setSearchHistory([]);
        localStorage.removeItem('tiktok_search_keyword_history');
    };

    // --- SMART INPUT DETECTION ---
    const getInputType = () => {
        const k = keyword.trim();
        if (!k) return 'search';
        
        // Detect Multiple Links (separated by newline, comma, or space)
        const possibleLinks = k.split(/[\n,\s]+/).filter(s => s.includes('tiktok.com'));
        if (possibleLinks.length > 1) {
            return 'batch_links';
        }

        // Check for common Video URL patterns
        if (k.includes('/video/') || k.includes('vt.tiktok.com') || k.includes('vm.tiktok.com')) {
            return 'video';
        }

        // Check for Channel URL patterns
        if (k.startsWith('@') || (k.includes('tiktok.com/@') && !k.includes('/video/'))) {
            return 'channel';
        }
        
        // Edge case: generic tiktok link, assume video analysis
        if (k.includes('tiktok.com')) return 'video';

        return 'search';
    };

    const inputType = getInputType();

    // --- SMART SEARCH LOGIC ---
    const handleSmartSearch = async () => {
        const input = keyword.trim();
        if (!input) return;

        const type = getInputType();

        // Add to history only if it's a search term (not a link)
        if (type === 'search') {
            addToHistory(input);
        }

        if (type === 'batch_links') {
            handleBatchLinkProcessing(input);
            return;
        }

        if (type === 'video') {
            onDirectAnalyze(input, 'single');
            return;
        }

        if (type === 'channel') {
            onDirectAnalyze(input, 'channel');
            return;
        }

        // 3. NORMAL DISCOVERY SEARCH
        handleDiscoverySearch(input);
    };

    const handleBatchLinkProcessing = async (rawInput: string) => {
        setIsLoading(true);
        setError(null);
        setResults([]);
        setLoadingMessage('Đang xử lý danh sách video...');
        
        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            // Extract links
            const urls = rawInput.split(/[\n,\s]+/).filter(s => s.includes('tiktok.com') || s.includes('vt.tiktok.com'));
            const uniqueUrls = [...new Set(urls)];
            
            if (uniqueUrls.length === 0) {
                setError("Không tìm thấy link TikTok hợp lệ.");
                setIsLoading(false);
                return;
            }

            setScanProgress({ current: 0, total: uniqueUrls.length });
            
            const validVideos: TikTokVideo[] = [];
            
            for (let i = 0; i < uniqueUrls.length; i++) {
                if (controller.signal.aborted) break;
                setLoadingMessage(`Đang lấy dữ liệu video ${i + 1}/${uniqueUrls.length}...`);
                
                try {
                    const videoData = await analyzeTikTokLink(uniqueUrls[i], controller.signal);
                    if (videoData) {
                        validVideos.push(videoData);
                    }
                } catch (e) {
                    console.warn(`Failed to fetch link: ${uniqueUrls[i]}`);
                }
                
                setScanProgress({ current: i + 1, total: uniqueUrls.length });
                // Small delay to be polite
                await new Promise(r => setTimeout(r, 500));
            }

            if (validVideos.length > 0) {
                // Immediately trigger analysis for these videos
                onAnalyzeSelected(validVideos);
            } else {
                setError("Không thể tải thông tin từ các link đã nhập. Vui lòng kiểm tra lại.");
            }

        } catch (err: any) {
            if (err.name !== 'AbortError') setError(err.message);
        } finally {
            if (!controller.signal.aborted) {
                setIsLoading(false);
                setLoadingMessage('');
                setScanProgress(null);
            }
        }
    };

    const handleDiscoverySearch = async (searchTerm: string) => {
        setIsLoading(true);
        setError(null);
        setResults([]);
        setSelectedIds(new Set());
        setSearchStrategy(null);
        setScanProgress(null);
        setKeyword(searchTerm);
        setCurrentPage(1); 
        
        setSortBy(searchMode === 'script' ? 'relevance' : 'views');
        setLoadingMessage(searchMode === 'script' ? 'AI đang hoạch định chiến lược tìm kiếm...' : 'Đang tìm kiếm...');

        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            let finalQuery = searchTerm;
            let currentStrategy: SearchStrategy | null = null;

            if (searchMode === 'script') {
                 try {
                     const strategy = await generateSearchStrategy(searchTerm);
                     currentStrategy = strategy;
                     setSearchStrategy(strategy);
                     finalQuery = strategy.searchQuery;
                     setLoadingMessage(`Đang tìm với từ khóa Trend: "${strategy.searchQuery}"...`);
                 } catch (e) {
                     console.warn("AI keyword gen failed");
                 }
            } 
            
            const videos = await searchTikTokVideos(finalQuery, controller.signal);
            if (videos.length === 0) {
                setError("Không tìm thấy video nào. Hãy thử từ khóa khác hoặc ngắn gọn hơn.");
                setIsLoading(false);
                return;
            }

            if (searchMode === 'script' && currentStrategy) {
                // LIMIT TO TOP 20 FOR DEEP SCAN
                const candidates = videos.slice(0, 20);
                
                setLoadingMessage(`AI đang nghe & xem ${candidates.length} video để đánh giá...`);
                setScanProgress({ current: 0, total: candidates.length });

                // Pass the setScanProgress callback to update UI during deep scan
                const rankedVideos = await aiRankVideoRelevance(
                    currentStrategy, 
                    candidates, 
                    controller.signal,
                    (processedCount) => setScanProgress({ current: processedCount, total: candidates.length })
                );
                
                setResults(rankedVideos);
            } else {
                setResults(sortVideos(videos as RankedVideo[], 'views'));
            }

        } catch (err: any) {
            if (err.name !== 'AbortError') setError(err.message);
        } finally {
            if (!controller.signal.aborted) {
                setIsLoading(false);
                setLoadingMessage('');
                setScanProgress(null);
            }
        }
    };

    const calculateCommercialScore = (video: TikTokVideo) => {
        const views = video.playCount || 0;
        let score = 1;
        if (views >= 1000000) score = 5;       
        else if (views >= 500000) score = 4;   
        else if (views >= 100000) score = 3;   
        else if (views >= 10000) score = 2;    
        else score = 1;                        
        const type = video.isCommerce ? 'P' : 'B';
        return { type, score };
    };

    const sortVideos = (videos: RankedVideo[], criterion: SortOption): RankedVideo[] => {
        return [...videos].sort((a, b) => {
            if (criterion === 'relevance') return (b.relevanceScore || 0) - (a.relevanceScore || 0);
            if (criterion === 'views') return (b.playCount || 0) - (a.playCount || 0);
            if (criterion === 'likes') return (b.diggCount || 0) - (a.diggCount || 0);
            if (criterion === 'comments') return (b.commentCount || 0) - (a.commentCount || 0);
            if (criterion === 'shares') return (b.shareCount || 0) - (a.shareCount || 0);
            if (criterion === 'potential') {
                const scoreA = calculateCommercialScore(a).score;
                const scoreB = calculateCommercialScore(b).score;
                return scoreB - scoreA;
            }
            return 0;
        });
    };

    const handleSortChange = (newSort: SortOption) => {
        setSortBy(newSort);
        setResults(prev => sortVideos(prev, newSort));
    };

    const toggleSelection = (video: TikTokVideo) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(video.id)) next.delete(video.id);
            else next.add(video.id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === results.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(results.map(v => v.id)));
    };

    const formatNumber = (num?: number) => {
        if (!num) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toLocaleString('vi-VN');
    };

    const extractHashtags = (title: string) => {
        const hashtags = title.match(/#[a-zA-Z0-9_\u00C0-\u00FF]+/g);
        return hashtags ? hashtags.join(' ') : '---'; 
    };

    const handleSubmit = () => {
        const selectedVideos = results.filter(v => selectedIds.has(v.id));
        if (selectedVideos.length > 0) {
            onAnalyzeSelected(selectedVideos);
        }
    };
    
    const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);
    const visibleResults = results.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // --- Helper for Menu Buttons ---
    const MenuButton = ({ 
        icon, 
        colorClass, 
        bgClass, 
        label, 
        subLabel, 
        onClick,
        disabled = false
    }: { 
        icon: string, 
        colorClass: string, 
        bgClass: string, 
        label: string, 
        subLabel: string, 
        onClick?: () => void,
        disabled?: boolean
    }) => (
        <button 
            onClick={disabled ? undefined : onClick} 
            className={`flex flex-col items-center justify-center gap-2 bg-white border border-gray-200 p-4 rounded-2xl text-center transition-all shadow-sm h-full relative overflow-hidden ${disabled ? 'opacity-70 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50 hover:scale-[1.02] hover:shadow-md group'}`}
        >
            {disabled && (
                <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide">
                    {subLabel === 'Đang Nâng Cấp' ? 'Upgrading' : 'Soon'}
                </div>
            )}
            <div className={`w-10 h-10 rounded-xl ${bgClass} ${colorClass} flex items-center justify-center text-lg ${!disabled && 'group-hover:scale-110 transition-all duration-300'}`}>
                <i className={`fa-solid ${icon}`}></i>
            </div>
            <div className="flex flex-col">
                <h3 className="font-bold text-sm leading-tight text-gray-900">{label}</h3>
                <p className={`text-[10px] mt-0.5 transition-colors font-bold ${disabled ? 'text-indigo-600' : 'text-gray-400'}`}>{subLabel}</p>
            </div>
        </button>
    );

    return (
        <div className="w-full flex flex-col items-center">
            {playingVideo && <VideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)} />}
            
            {searchMode === 'competitor' ? (
                <CompetitorComparator onClose={() => setSearchMode('keyword')} />
            ) : searchMode === 'trend_radar' ? (
                <TrendRadar 
                    onClose={() => setSearchMode('keyword')} 
                    onAnalyze={(video) => onAnalyzeSelected([video])}
                />
            ) : searchMode === 'audience_pulse' ? (
                <AudiencePulse onClose={() => setSearchMode('keyword')} />
            ) : searchMode === 'market_intel' ? (
                <MarketIntelligenceScanner onClose={() => setSearchMode('keyword')} />
            ) : searchMode === 'koc_audit' ? (
                <KOCQualityAudit onClose={() => setSearchMode('keyword')} />
            ) : searchMode === 'trend_archive' ? (
                <TrendArchive onClose={() => setSearchMode('keyword')} />
            ) : searchMode === 'roi_tracker' ? (
                <ROITracker onClose={() => setSearchMode('keyword')} />
            ) : (
            <>
                {/* HERO SECTION */}
                <div className="w-full bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] shadow-2xl shadow-emerald-500/20 p-6 md:p-8 relative overflow-hidden flex flex-col items-center text-center">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-900/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

                    <div className="relative z-10 w-full max-w-5xl flex flex-col items-center">
                        <div className="w-full flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-6 select-none">
                            <div className="flex flex-col items-center md:items-end leading-none">
                                <span className="text-xl md:text-3xl font-bold text-white/90 uppercase tracking-widest mb-1 md:mb-2">Khám Phá Ý Tưởng</span>
                                <span className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter">Phân Tích Nội Dung</span>
                            </div>
                            <div className="hidden md:block w-[2px] h-20 bg-white/20 rounded-full"></div>
                            <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-300 via-orange-400 to-red-400 italic tracking-tighter drop-shadow-sm leading-none">
                                VIRAL
                            </h1>
                        </div>

                        <p className="text-emerald-50 text-base mb-8 font-medium w-full opacity-90 whitespace-nowrap overflow-hidden text-ellipsis px-4">
                            Nhập từ khóa, mô tả kịch bản để tìm ý tưởng. Hoặc dán trực tiếp link video/kênh để AI phân tích chuyên sâu.
                        </p>

                        {/* Search Box */}
                        <div className="bg-white p-2 rounded-[1.5rem] shadow-xl shadow-emerald-900/10 flex flex-col md:flex-row gap-2 transition-transform focus-within:scale-[1.01] w-full max-w-5xl mx-auto">
                            <div className="flex bg-gray-100 rounded-xl p-1 shrink-0 h-fit self-start md:self-center overflow-x-auto max-w-full">
                                <button 
                                    onClick={() => setSearchMode('keyword')}
                                    className={`px-3 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${searchMode === 'keyword' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-800'}`}
                                >
                                    Từ Khóa
                                </button>
                                <button 
                                    onClick={() => setSearchMode('script')}
                                    className={`px-3 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${searchMode === 'script' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-800'}`}
                                >
                                    Kịch Bản
                                </button>
                            </div>

                            <div className={`relative flex-1 ${searchMode === 'script' ? 'h-32' : 'h-auto'} transition-all duration-300`}>
                                {searchMode === 'script' ? (
                                    <textarea
                                        placeholder="Mô tả ý tưởng kịch bản (VD: Video hài hước vợ chồng rửa bát...)"
                                        className="w-full h-full bg-transparent pl-3 pr-3 py-3 text-base font-medium text-gray-800 placeholder-gray-400 focus:outline-none resize-none"
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !isLoading && !isGlobalProcessing && (e.preventDefault(), handleSmartSearch())}
                                        disabled={isLoading || isGlobalProcessing}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        placeholder="Nhập từ khóa, @channel, hoặc dán nhiều Link TikTok..."
                                        className="w-full h-full bg-transparent pl-3 pr-3 py-3 text-base font-medium text-gray-800 placeholder-gray-400 focus:outline-none"
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !isLoading && !isGlobalProcessing && handleSmartSearch()}
                                        disabled={isLoading || isGlobalProcessing}
                                    />
                                )}
                            </div>

                            {isGlobalProcessing || isLoading ? (
                                <button 
                                    onClick={onGlobalStop}
                                    className="px-6 py-3 bg-red-50 text-red-500 font-bold rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2 whitespace-nowrap h-auto min-h-[50px] self-stretch"
                                >
                                    <div className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin"></div> Dừng
                                </button>
                            ) : (
                                <button
                                    onClick={handleSmartSearch}
                                    disabled={!keyword}
                                    className={`px-8 py-3 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-md h-auto min-h-[50px] self-stretch ${
                                        !keyword 
                                        ? 'bg-orange-300 text-white/80 cursor-not-allowed'
                                        : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200 hover:shadow-orange-300 hover:scale-105 active:scale-95'
                                    }`}
                                >
                                    {inputType === 'batch_links' ? <i className="fa-solid fa-layer-group"></i> : 
                                     inputType === 'video' ? <i className="fa-solid fa-microscope"></i> : 
                                     inputType === 'channel' ? <i className="fa-solid fa-users-viewfinder"></i> : 
                                     <i className="fa-solid fa-magnifying-glass"></i>}
                                    
                                    {inputType === 'batch_links' ? "Phân Tích Hàng Loạt" : 
                                     inputType === 'video' ? "Phân Tích Video" : 
                                     inputType === 'channel' ? "Audit Kênh" : "Tìm Kiếm"}
                                </button>
                            )}
                        </div>
                        
                        {/* Processing Feedback */}
                        {(isGlobalProcessing || isLoading) && (
                            <div className="mt-4 flex flex-col items-center gap-2 w-full max-w-lg mx-auto">
                                <div className="flex items-center gap-2 text-emerald-100 animate-pulse text-sm font-medium">
                                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                                    {globalProcessStep || loadingMessage || "Đang xử lý..."}
                                </div>
                                {scanProgress && (
                                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-orange-400 transition-all duration-300 ease-out"
                                            style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                                        ></div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Search History & Suggestions */}
                        {!isGlobalProcessing && !isLoading && (
                            <div className="mt-6 flex flex-wrap gap-2 justify-center mb-8 max-w-4xl mx-auto">
                                {searchHistory.length > 0 ? (
                                    <>
                                        <div className="w-full flex items-center justify-center gap-2 text-[10px] text-emerald-100 font-bold uppercase tracking-widest mb-1 opacity-70">
                                            Lịch sử tìm kiếm
                                            <button onClick={clearHistory} className="hover:text-white transition-colors" title="Xóa lịch sử"><i className="fa-solid fa-trash"></i></button>
                                        </div>
                                        {searchHistory.map((s, idx) => (
                                            <button 
                                                key={`hist-${idx}`} 
                                                onClick={() => { setKeyword(s); setSearchMode('keyword'); setTimeout(() => handleDiscoverySearch(s), 0); }} 
                                                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-emerald-50 text-[11px] font-bold rounded-full border border-white/10 transition-colors flex items-center gap-1 group"
                                            >
                                                <i className="fa-solid fa-clock-rotate-left text-[9px] opacity-60"></i> {s.length > 20 ? s.substring(0,20)+'...' : s}
                                            </button>
                                        ))}
                                    </>
                                ) : (
                                    SUGGESTIONS.slice(0, 6).map(s => (
                                        <button key={s} onClick={() => { setKeyword(s); setSearchMode('keyword'); setTimeout(() => handleDiscoverySearch(s), 0); }} className="px-3 py-1 bg-white/10 hover:bg-white/20 text-emerald-50 text-[11px] font-bold rounded-full border border-white/10 transition-colors">
                                            {s}
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* --- FUNCTION MENU (ORDERED: Radar > KOC Audit > Audience Pulse > Market Intel) --- */}
                {!isGlobalProcessing && !isLoading && (
                    <div className="w-full mt-4 px-0 animate-in fade-in slide-in-from-bottom-4 delay-200">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <MenuButton 
                                icon="fa-arrow-trend-up"
                                bgClass="bg-purple-50 group-hover:bg-purple-500"
                                colorClass="text-purple-500 group-hover:text-white"
                                label="Trend Radar"
                                subLabel="Bắt Trend Live"
                                onClick={() => setSearchMode('trend_radar')}
                            />
                            <MenuButton 
                                icon="fa-user-check"
                                bgClass="bg-emerald-50 group-hover:bg-emerald-600"
                                colorClass="text-emerald-600 group-hover:text-white"
                                label="KOC Audit"
                                subLabel="Thẩm định thật giả"
                                onClick={() => setSearchMode('koc_audit')}
                            />
                            <MenuButton 
                                icon="fa-heart-pulse"
                                bgClass="bg-pink-50 group-hover:bg-pink-500"
                                colorClass="text-pink-500 group-hover:text-white"
                                label="Audience Pulse"
                                subLabel="Thấu hiểu KH"
                                onClick={() => setSearchMode('audience_pulse')}
                            />
                            <MenuButton 
                                icon="fa-magnifying-glass-chart"
                                bgClass="bg-blue-50 group-hover:bg-blue-600"
                                colorClass="text-blue-600 group-hover:text-white"
                                label="Market Intel"
                                subLabel="Insight Ngành"
                                onClick={() => setSearchMode('market_intel')}
                            />
                        </div>
                        {/* Second row for remaining active features */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                            <MenuButton 
                                icon="fa-chess-knight"
                                bgClass="bg-indigo-50 group-hover:bg-indigo-600"
                                colorClass="text-indigo-600 group-hover:text-white"
                                label="So Sánh Kênh"
                                subLabel="Đối đầu trực diện"
                                onClick={() => setSearchMode('competitor')}
                            />
                            <MenuButton 
                                icon="fa-book-bookmark"
                                bgClass="bg-amber-50 group-hover:bg-amber-600"
                                colorClass="text-amber-500 group-hover:text-white"
                                label="Trend Archive"
                                subLabel="Kho Case Study"
                                onClick={() => setSearchMode('trend_archive')}
                            />
                            <MenuButton 
                                icon="fa-chart-line"
                                bgClass="bg-green-50 group-hover:bg-green-600"
                                colorClass="text-green-500 group-hover:text-white"
                                label="ROI Tracker"
                                subLabel="Hiệu quả KD"
                                onClick={() => setSearchMode('roi_tracker')}
                            />
                        </div>
                    </div>
                )}
                
                {error && (
                    <div className="mt-8 mx-auto max-w-xl text-center p-6 bg-red-50 rounded-2xl border border-red-100 text-red-800">
                        <i className="fa-solid fa-bug text-2xl mb-2 opacity-50 block"></i>
                        <p>{error}</p>
                    </div>
                )}

                {analysisResultNode && (
                    <div className="w-full mt-8 animate-in fade-in slide-in-from-top-4">
                        {analysisResultNode}
                    </div>
                )}

                {searchStrategy && !isLoading && !error && (
                    <div className="mt-8 w-full bg-white border border-indigo-100 rounded-3xl p-8 shadow-lg shadow-indigo-100/50 animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl shadow-lg shadow-indigo-500/30 flex-shrink-0"><i className="fa-solid fa-brain"></i></div>
                            <div><h4 className="text-2xl font-bold text-gray-900 leading-tight">AI Content Strategist</h4><p className="text-gray-500 text-base">Hệ thống đã "xem" và "nghe" nội dung để chọn ra kết quả khớp nhất với ý tưởng của bạn.</p></div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100"><p className="text-xs font-bold text-gray-500 uppercase mb-2">Từ Khóa & Ngữ Cảnh</p><p className="font-bold text-indigo-700 text-xl">"{searchStrategy.searchQuery}"</p><p className="font-medium text-gray-600 text-sm mt-1">{searchStrategy.targetMood}</p></div>
                            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100"><p className="text-xs font-bold text-gray-500 uppercase mb-2">Hashtags Mục Tiêu</p><div className="flex flex-wrap gap-2">{searchStrategy.relatedHashtags.map((tag, i) => (<span key={i} className="bg-white text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-indigo-100 shadow-sm">{tag}</span>))}</div></div>
                        </div>
                    </div>
                )}

                {results.length > 0 && !isLoading && (
                    <div className="w-full mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 px-2">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm"><i className="fa-solid fa-list-check"></i></span> Kết quả tìm kiếm ({results.length})</h3>
                            <div className="flex items-center gap-2 text-sm bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                                {searchMode === 'script' && (<button onClick={() => handleSortChange('relevance')} className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${sortBy === 'relevance' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}><i className="fa-solid fa-bullseye text-xs"></i> Độ Khớp</button>)}
                                <button onClick={() => handleSortChange('views')} className={`px-3 py-1.5 rounded-lg transition-all ${sortBy === 'views' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>Lượt xem</button>
                                <button onClick={() => handleSortChange('likes')} className={`px-3 py-1.5 rounded-lg transition-all ${sortBy === 'likes' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>Lượt thích</button>
                                <button onClick={() => handleSortChange('potential')} className={`px-3 py-1.5 rounded-lg transition-all ${sortBy === 'potential' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}>Tiềm năng</button>
                            </div>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-[2rem] shadow-xl shadow-gray-200/50 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead><tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase text-gray-400 font-bold tracking-wider"><th className="p-5 w-10 text-center"><input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer" checked={selectedIds.size === results.length && results.length > 0} onChange={toggleSelectAll} /></th><th className="p-5 w-[350px]">Thông tin Video</th>{searchMode === 'script' && <th className="p-5 min-w-[300px]">Tóm Tắt Kịch Bản (AI)</th>}<th className="p-5 w-[100px] text-center" title="Tiềm năng thương mại">Tiềm năng</th><th className="p-5 text-center">Thời lượng</th><th className="p-5 text-right w-[150px]">Chỉ số</th><th className="p-5 text-center w-32">Thao tác</th></tr></thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {visibleResults.map((video) => {
                                            const isSelected = selectedIds.has(video.id);
                                            const hashtags = extractHashtags(video.title);
                                            const datePosted = video.createTime ? new Date(video.createTime * 1000).toLocaleDateString('vi-VN') : '--/--';
                                            const { score } = calculateCommercialScore(video);
                                            return (
                                                <tr key={video.id} onClick={() => toggleSelection(video)} className={`group transition-colors cursor-pointer ${isSelected ? 'bg-emerald-50/30' : 'hover:bg-gray-50/50'}`}>
                                                    <td className="p-5 text-center" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer" checked={isSelected} onChange={() => toggleSelection(video)} /></td>
                                                    <td className="p-5"><div className="flex gap-4 items-start"><div className="relative w-16 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-200 shadow-sm group/thumb"><img src={video.coverUrl} alt="" className="w-full h-full object-cover transform transition-transform duration-500 group-hover/thumb:scale-125" /><div onClick={(e) => { e.stopPropagation(); setPlayingVideo(video); }} className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 flex items-center justify-center transition-colors cursor-pointer z-10"><i className="fa-solid fa-play text-white text-lg opacity-0 group-hover/thumb:opacity-100 transform translate-y-2 group-hover/thumb:translate-y-0 transition-all duration-300"></i></div></div><div className="min-w-0 flex-1">{searchMode === 'script' && video.relevanceScore !== undefined && (<div className="mb-2 flex flex-wrap gap-1"><span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold ${video.relevanceScore >= 80 ? 'bg-emerald-100 text-emerald-700' : video.relevanceScore >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{video.relevanceScore}% Match</span>{video.matchReason && video.matchReason !== "Low relevance" && (<span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full line-clamp-1 border border-gray-200 max-w-full" title={video.matchReason}><i className="fa-solid fa-check mr-1 text-emerald-500"></i>{video.matchReason}</span>)}</div>)}<p className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug mb-1 group-hover:text-emerald-700 transition-colors" title={video.title}>{video.title.replace(/#[^ ]+/g, '')}</p><p className="text-xs text-gray-500">@{video.author}</p><p className="text-[10px] text-gray-400 mt-1 line-clamp-1 italic">{hashtags}</p></div></div></td>
                                                    {searchMode === 'script' && (<td className="p-5 align-top">{video.scriptSummary ? (<p className="text-xs text-gray-600 font-medium leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100" title="Tóm tắt nội dung video">{video.scriptSummary}</p>) : (<p className="text-[11px] text-gray-400 italic bg-gray-50 p-2 rounded-lg text-center">Chưa phân tích</p>)}</td>)}
                                                    <td className="p-5 text-center align-top"><div className="flex flex-col items-center gap-1.5" title="Mức độ phổ biến và tiềm năng"><div className="flex gap-0.5 text-xs text-orange-400">{[1, 2, 3, 4, 5].map((s) => (<i key={s} className={`fa-solid fa-star ${s <= score ? 'text-orange-400' : 'text-gray-200'}`}></i>))}</div></div></td>
                                                    <td className="p-5 text-center text-sm font-mono text-gray-500">{video.duration}s</td>
                                                    <td className="p-5 text-right align-top"><div className="space-y-1"><div className="text-xs text-gray-500 mb-1 border-b border-gray-100 pb-1 font-medium"><i className="fa-regular fa-calendar mr-1"></i>{datePosted}</div><div className="text-sm font-bold text-gray-900">{formatNumber(video.playCount)} <span className="text-[10px] text-gray-400 font-normal">Views</span></div><div className="text-xs font-medium text-pink-500">{formatNumber(video.diggCount)} <span className="text-[10px] text-gray-400 font-normal">Likes</span></div><div className="text-xs font-medium text-blue-500">{formatNumber(video.commentCount)} <span className="text-[10px] text-gray-400 font-normal">Cmts</span></div></div></td>
                                                    <td className="p-5 text-center" onClick={(e) => e.stopPropagation()}><button onClick={(e) => { e.stopPropagation(); onAnalyzeSelected([video]); }} className="w-full py-2 bg-white border border-gray-200 hover:border-emerald-500 hover:text-emerald-600 text-gray-600 rounded-xl shadow-sm transition-all text-xs font-bold flex items-center justify-center gap-2 group/btn"><i className="fa-solid fa-microscope group-hover/btn:rotate-12 transition-transform"></i> Phân Tích</button></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {totalPages > 1 && (<div className="flex justify-center items-center gap-4 py-6 border-t border-gray-100 bg-gray-50/30"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-white hover:shadow-md'}`}><i className="fa-solid fa-chevron-left"></i></button><span className="text-sm font-bold text-gray-700">Trang {currentPage} / {totalPages}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-white hover:shadow-md'}`}><i className="fa-solid fa-chevron-right"></i></button></div>)}
                        </div>
                    </div>
                )}
                
                {selectedIds.size > 0 && (<div className="fixed bottom-8 z-40 animate-in slide-in-from-bottom-20 fade-in duration-500"><button onClick={handleSubmit} className="bg-gray-900 text-white pl-6 pr-2 py-2 rounded-full shadow-2xl shadow-emerald-500/20 flex items-center gap-4 hover:scale-105 transition-transform ring-4 ring-white"><div className="flex flex-col items-start"><span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Đã chọn {selectedIds.size}</span><span className="text-sm font-bold">Phân Tích Hàng Loạt</span></div><div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white"><i className="fa-solid fa-arrow-right"></i></div></button></div>)}
            </>
            )}
        </div>
    );
};
