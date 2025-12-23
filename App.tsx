
import React, { useState, useEffect, useRef } from 'react';
import { analyzeTikTokLink, generateVideoAnalysis, extractUsername, fetchChannelVideos, generateChannelAnalysis, generateBatchSummary } from './services/geminiService';
import { TikTokVideo, AnalysisHistoryItem, ContentAnalysis, ChannelAnalysis, BatchSummaryAnalysis } from './types';
import { HistoryList } from './components/HistoryList';
import { AnalysisReport } from './components/AnalysisReport';
import { ChannelAnalysisReport } from './components/ChannelAnalysisReport';
import { BatchSummaryReport } from './components/BatchSummaryReport';
import { SettingsModal } from './components/SettingsModal'; 
import { saveToGoogleSheet } from './services/googleSheetService'; 
import { DiscoveryMode } from './components/DiscoveryMode'; 

// --- Static Sections ---
const LegalSection = ({ title }: { title: string }) => (
  <div className="bg-white border border-gray-200 rounded-3xl p-10 animate-in fade-in slide-in-from-bottom-4 shadow-sm max-w-4xl mx-auto">
    <h2 className="text-3xl font-bold mb-8 text-gray-900 flex items-center gap-3">
        <i className="fa-solid fa-scale-balanced text-emerald-600"></i> {title}
    </h2>
    <div className="space-y-6 text-base text-gray-700 leading-relaxed font-medium">
      <p>Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}</p>
      <p>Dịch vụ này cho phép phân tích metadata công khai từ TikTok. Chúng tôi không liên kết với TikTok hoặc ByteDance.</p>
      <p>Mọi kết quả là ước tính do AI tạo ra.</p>
    </div>
  </div>
);

const GuideSection = () => (
    <div className="bg-white border border-gray-200 rounded-3xl p-8 md:p-12 animate-in fade-in slide-in-from-bottom-4 shadow-sm max-w-5xl mx-auto">
        <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Hướng Dẫn Sử Dụng <span className="text-emerald-600">TikTok Analyst</span></h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">Khai thác tối đa sức mạnh của AI để tối ưu hóa nội dung.</p>
        </div>
        <div className="space-y-12">
            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                    <h3 className="font-bold text-lg mb-2">Phân tích Video đơn</h3>
                    <p className="text-sm text-gray-600">Dán link video TikTok vào ô tìm kiếm để AI bóc tách kịch bản, chấm điểm viral và đề xuất cách xào lại.</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                    <h3 className="font-bold text-lg mb-2">Audit Kênh (@username)</h3>
                    <p className="text-sm text-gray-600">Nhập @username để AI quét toàn bộ kênh, tìm ra "Winning Formula" và đưa ra chiến lược 30 ngày.</p>
                </div>
            </div>
        </div>
    </div>
);

const ChangelogSection = () => {
    const versions = [
        {
            version: "v1.8.0",
            date: "22/12/2025",
            tag: "Market Intel & KOC Audit",
            title: "Nâng Cấp Hệ Thống Tình Báo Thị Trường & Audit KOC",
            items: [
                "🕵️ Market Intel Scanner: Hệ thống quét insight ngách thị trường, tìm khoảng trống (Market Gap) và nỗi đau khách hàng.",
                "🛡️ KOC Deep Audit: Module thẩm định chất lượng KOC, phát hiện seeding tương tác ảo và đánh giá sức mua của tệp fan.",
                "📊 Strategic Dashboard: Báo cáo chiến lược theo phong cách Market Research Director.",
                "⚖️ Fraud Detection: Thuật toán AI phân tích comment để bóc tách tương tác thật/giả."
            ],
            color: "indigo"
        },
        {
            version: "v1.7.2",
            date: "22/12/2025",
            tag: "Feature Unlock",
            title: "Tái Kích Hoạt Module So Sánh Chiến Lược",
            items: [
                "⚔️ Competitor Unlock: Mở lại tính năng So Sánh Kênh (Competitor Battle Card) với thuật toán AI Gemini 3 Pro đã được tối ưu.",
                "🩺 AI Script Doctor: Tích hợp đầy đủ module 'Khám bệnh kịch bản' vào báo cáo video chi tiết.",
                "🎯 Scoring Logic: Cập nhật cơ chế chấm điểm Viral dựa trên dữ liệu trending mới nhất trong ngách.",
                "✨ UI Refinement: Cải thiện độ phản hồi của menu chức năng tại Discovery Mode."
            ],
            color: "emerald"
        },
        {
            version: "v1.6.0",
            date: "14/12/2025",
            tag: "Core Engine",
            title: "Nâng Cấp AI: Gemini 3.0 Pro",
            items: [
                "🚀 Next-Gen Engine: Nâng cấp lõi phân tích từ Gemini 2.5 lên Gemini 3.0 Pro.",
                "🧠 Reasoning 3.0: Khả năng hiểu ngữ cảnh văn hóa Việt Nam sâu sắc hơn."
            ],
            color: "indigo"
        },
        {
            version: "v1.5.0",
            date: "13/12/2025",
            tag: "Intelligence",
            title: "Dynamic Intelligence & Localization",
            items: [
                "🇻🇳 Bản địa hóa 100%: Ép buộc AI trả về kết quả thuần Việt.",
                "🧠 Dynamic Perspective: AI tự động đóng vai các đối tượng khác nhau để đưa ra nhận xét đa chiều."
            ],
            color: "blue"
        },
        {
            version: "v1.0.0",
            date: "10/12/2025",
            tag: "Birth",
            title: "Khởi Tạo Nền Tảng TikTok Analyst",
            items: [
                "🚀 MVP Release: Xây dựng Core AI phân tích Video TikTok qua Link.",
                "🎥 Core Analysis: Phân tích Hook 3s, Cấu trúc kịch bản và Điểm Viral."
            ],
            color: "gray"
        }
    ];

    return (
        <div className="w-[95%] xl:w-[80%] mx-auto bg-white border border-gray-200 rounded-3xl p-8 md:p-12 animate-in fade-in slide-in-from-bottom-4 shadow-sm mb-10">
            <div className="text-left mb-16">
                <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Nhật Ký Phiên Bản</h2>
                <p className="text-lg text-gray-600 font-medium">Hành trình phát triển ứng dụng TikTok AI Analyst</p>
            </div>
            
            <div className="relative border-l-2 border-gray-100 ml-4 md:ml-12 space-y-16 text-left">
                {versions.map((v, i) => (
                    <div key={i} className="relative pl-8 md:pl-12 group">
                        <div className={`absolute -left-2.5 top-0 w-5 h-5 rounded-full border-4 border-white shadow-md transition-transform group-hover:scale-125 ${
                            v.color === 'emerald' ? 'bg-emerald-500' : 
                            v.color === 'indigo' ? 'bg-indigo-500' : 
                            v.color === 'blue' ? 'bg-blue-500' : 
                            v.color === 'purple' ? 'bg-purple-500' : 
                            v.color === 'teal' ? 'bg-teal-500' : 
                            v.color === 'orange' ? 'bg-orange-500' : 'bg-gray-400'
                        }`}></div>
                        
                        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-3">
                            <span className="text-sm font-black text-gray-400 uppercase tracking-widest">{v.date}</span>
                            <span className="hidden md:block text-gray-300 font-black">•</span>
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase border shadow-sm ${
                                    v.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                    v.color === 'indigo' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                                    v.color === 'blue' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                    v.color === 'purple' ? 'bg-purple-50 text-purple-600 border-purple-100' : 
                                    v.color === 'teal' ? 'bg-teal-50 text-teal-600 border-teal-100' : 
                                    v.color === 'orange' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-gray-50 text-gray-600 border-gray-200'
                                }`}>{v.tag}</span>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">{v.version}</h3>
                            </div>
                        </div>
                        
                        <h4 className="text-lg font-black text-gray-800 mb-4 group-hover:text-emerald-600 transition-colors">{v.title}</h4>
                        
                        <ul className="space-y-3">
                            {v.items.map((item, j) => (
                                <li key={j} className="text-base text-gray-600 font-medium leading-relaxed flex items-start gap-4">
                                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0"></span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="mt-20 pt-10 border-t border-gray-100 text-center">
                 <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">© 2025 TikTok AI Analyst Team</p>
            </div>
        </div>
    );
};

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'border-emerald-600/50 bg-emerald-50 text-emerald-900',
    error: 'border-red-600/50 bg-red-50 text-red-900',
    info: 'border-teal-600/50 bg-teal-50 text-teal-900'
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-4 px-6 py-4 rounded-2xl border shadow-xl animate-in slide-in-from-right-full ${colors[type]}`}>
      <i className={`fa-solid text-lg ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-info'}`}></i>
      <span className="font-bold text-base">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70 text-lg"><i className="fa-solid fa-xmark"></i></button>
    </div>
  );
};

const CompletionModal = ({ onConfirm, onCancel }: { onConfirm: () => void, onCancel: () => void }) => {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full mx-4">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4 animate-bounce">
                        <i className="fa-solid fa-check text-2xl"></i>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Phân Tích Hoàn Tất!</h3>
                    <p className="text-gray-500 mb-6 text-sm">Bạn có muốn xem báo cáo chi tiết ngay không?</p>
                    <div className="flex gap-3 w-full">
                        <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold">Thoát</button>
                        <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-200">Xem Chi Tiết</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'home' | 'terms' | 'privacy' | 'guide' | 'changelog'>('home');
  const [mode, setMode] = useState<'single' | 'batch' | 'channel'>('single');
  const [showSettings, setShowSettings] = useState(false); 
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [currentVideo, setCurrentVideo] = useState<TikTokVideo | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ContentAnalysis | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  const [batchResults, setBatchResults] = useState<Array<{video: TikTokVideo, analysis: ContentAnalysis | null, status: 'pending'|'success'|'error'}>>([]);
  const [batchSummary, setBatchSummary] = useState<BatchSummaryAnalysis | null>(null);
  const [savingBatchIds, setSavingBatchIds] = useState<Set<string>>(new Set());
  const [savedBatchIds, setSavedBatchIds] = useState<Set<string>>(new Set());

  const [channelAnalysis, setChannelAnalysis] = useState<ChannelAnalysis | null>(null);
  const [channelProfile, setChannelProfile] = useState<{avatar: string, nickname: string} | undefined>(undefined);

  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('tiktok_analysis_history');
    if (saved) {
        try { setHistory(JSON.parse(saved)); } catch (e) { console.error("History parse fail"); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tiktok_analysis_history', JSON.stringify(history));
  }, [history]);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
  };

  const resetState = () => {
    setError(null);
    setCurrentVideo(null);
    setAnalysisResult(null);
    setChannelAnalysis(null);
    setBatchSummary(null);
    setProcessStep('');
    setShowCompletionModal(false);
    setShowReportModal(false);
    if (mode === 'single') setBatchResults([]);
    setSavingBatchIds(new Set());
    setSavedBatchIds(new Set());
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsProcessing(false);
        setProcessStep('Đã dừng phân tích.');
        showToast('Đã dừng quá trình phân tích', 'info');
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Xóa toàn bộ lịch sử?')) {
        setHistory([]);
        localStorage.removeItem('tiktok_analysis_history');
        showToast('Đã làm sạch lịch sử!', 'success');
    }
  };

  const handleUpdateAnalysis = (updatedAnalysis: ContentAnalysis) => {
      setAnalysisResult(updatedAnalysis);
      setHistory(prev => prev.map(item => (item.type === 'video' && item.video?.id === currentVideo?.id) ? { ...item, analysis: updatedAnalysis } : item));
      showToast("Đã lưu kết quả mới!", "success");
  };

  const handleGenerateBatchSummary = async () => {
      const validItems = batchResults.filter(item => item.status === 'success' && item.analysis !== null) as {video: TikTokVideo, analysis: ContentAnalysis}[];
      if (validItems.length < 2) {
          showToast('Cần ít nhất 2 video để tổng hợp.', 'info');
          return;
      }
      setIsProcessing(true);
      setProcessStep('AI đang tổng hợp chiến lược...');
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      try {
          const summary = await generateBatchSummary(validItems, controller.signal);
          setBatchSummary(summary);
          showToast('Đã tạo báo cáo tổng hợp!', 'success');
      } catch (err: any) {
          if (err.name !== 'AbortError') showToast('Lỗi tạo báo cáo', 'error');
      } finally {
          setIsProcessing(false);
          setProcessStep('');
      }
  };

  const handleSaveBatchItem = async (video: TikTokVideo, analysis: ContentAnalysis) => {
      setSavingBatchIds(prev => new Set(prev).add(video.id));
      const success = await saveToGoogleSheet({ video, analysis }, 'video');
      setSavingBatchIds(prev => {
          const next = new Set(prev);
          next.delete(video.id);
          return next;
      });
      if (success) {
          setSavedBatchIds(prev => new Set(prev).add(video.id));
          showToast(`Đã lưu video ${video.id} vào Sheet`, 'success');
      } else {
          showToast('Lưu thất bại', 'error');
      }
  };

  const handleDiscoveryAnalyze = (selectedVideos: TikTokVideo[]) => {
      if (selectedVideos.length === 0) return;
      setMode('batch');
      resetState();
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const executeBatchAnalysis = async (videosToAnalyze: TikTokVideo[], signal: AbortSignal) => {
          setIsProcessing(true);
          setBatchResults([]);
          for (let i = 0; i < videosToAnalyze.length; i++) {
              if (signal.aborted) break;
              const videoData = videosToAnalyze[i];
              setProcessStep(`Video ${i + 1}/${videosToAnalyze.length}: Đang phân tích...`);
              try {
                  if (i > 0) await new Promise(r => setTimeout(r, 2000));
                  const analysis = await generateVideoAnalysis(videoData, signal);
                  setBatchResults(prev => [...prev, { video: videoData, analysis: analysis, status: 'success' }]);
                  setHistory(prev => [{ id: Date.now().toString() + Math.random(), video: videoData, analysis: analysis, type: 'video', timestamp: Date.now() }, ...prev].slice(0, 50));
              } catch (e: any) {
                  if (e.name === 'AbortError') throw e;
                  setBatchResults(prev => [...prev, { video: videoData, analysis: null, status: 'error' }]);
              }
          }
          setIsProcessing(false);
          setProcessStep('');
          showToast(`Hoàn tất phân tích nhóm video.`, 'success');
      };
      executeBatchAnalysis(selectedVideos, controller.signal);
  };

  const handleDirectAnalyze = async (inputUrl: string, analysisMode: 'single' | 'channel' = 'single') => {
    resetState();
    setCurrentView('home'); 
    setMode(analysisMode);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;
    try {
        if (analysisMode === 'channel') {
            const username = extractUsername(inputUrl);
            if (!username) throw new Error("Username không hợp lệ.");
            setIsProcessing(true);
            setProcessStep(`Đang quét kênh @${username}...`);
            const channelData = await fetchChannelVideos(username, signal);
            setProcessStep(`AI đang Audit ${channelData.videos.length} video...`);
            setChannelProfile(channelData.userProfile);
            const audit = await generateChannelAnalysis(username, channelData.videos, signal);
            setChannelAnalysis(audit);
            setHistory(prev => [{ id: Date.now().toString(), analysis: audit, type: 'channel', timestamp: Date.now(), channel: { username, avatar: channelData.userProfile?.avatar || 'https://cdn-icons-png.flaticon.com/512/847/847969.png' } }, ...prev].slice(0, 50));
            showToast('Audit hoàn tất!', 'success');
        } else {
            setIsProcessing(true);
            setProcessStep('Đang phân tích video...');
            const videoData = await analyzeTikTokLink(inputUrl, signal);
            if (!videoData) throw new Error("Video riêng tư hoặc không hợp lệ.");
            const analysis = await generateVideoAnalysis(videoData, signal);
            setCurrentVideo(videoData);
            setAnalysisResult(analysis);
            setHistory(prev => [{ id: Date.now().toString(), video: videoData, analysis, type: 'video', timestamp: Date.now() }, ...prev].slice(0, 50));
            setShowCompletionModal(true);
        }
    } catch (err: any) {
        if (err.name !== 'AbortError') { setError(err.message); showToast(err.message, 'error'); }
    } finally { if (!signal.aborted) { setIsProcessing(false); setProcessStep(''); } }
  };

  const handleSelectHistory = (item: AnalysisHistoryItem) => {
      resetState();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (item.type === 'channel') {
          setMode('channel');
          setChannelAnalysis(item.analysis as ChannelAnalysis);
          if (item.channel) setChannelProfile({ avatar: item.channel.avatar, nickname: item.channel.username });
      } else {
          setMode('single');
          if (item.video) setCurrentVideo(item.video);
          setAnalysisResult(item.analysis as ContentAnalysis);
          setShowReportModal(true);
      }
  };

  const renderAnalysisResultsBlock = () => {
      if ((mode === 'channel' && channelAnalysis) || (batchResults.length > 0)) {
          return (
            <div id="analysis-results" className="space-y-12 mb-8">
                {mode === 'channel' && channelAnalysis && (
                    <div className="animate-in fade-in slide-in-from-bottom-8"><ChannelAnalysisReport analysis={channelAnalysis} userProfile={channelProfile} onClose={() => setChannelAnalysis(null)} /></div>
                )}
                {batchResults.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-bottom-8">
                        <div className="flex items-center gap-3 mb-8"><div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl"><i className="fa-solid fa-layer-group"></i></div><h3 className="text-2xl font-bold">Kết quả nhóm ({batchResults.length})</h3></div>
                        <div id="batch-summary-section">
                            {batchSummary ? <BatchSummaryReport analysis={batchSummary} onClose={() => setBatchSummary(null)} /> : 
                            batchResults.filter(i => i.status === 'success').length >= 2 && !isProcessing && (
                                <div className="mb-12 bg-white border border-indigo-100 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl shadow-indigo-100/50 relative overflow-hidden">
                                    <div className="flex items-center gap-6 relative z-10"><div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg text-2xl"><i className="fa-solid fa-wand-magic-sparkles"></i></div><div><h4 className="text-xl font-bold">Tổng Hợp Insight Chiến Lược</h4><p className="text-gray-600">Tìm công thức chiến thắng chung từ nhóm video này.</p></div></div>
                                    <button onClick={handleGenerateBatchSummary} className="px-8 py-4 bg-gray-900 text-white font-bold rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all">Tạo Báo Cáo Ngay</button>
                                </div>
                            )}
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            {batchResults.map((item, idx) => (
                                <div key={idx} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm hover:shadow-lg transition-all flex gap-5 group">
                                    <div className="relative w-24 h-32 shrink-0"><img src={item.video.thumbnail} className="w-full h-full rounded-2xl object-cover bg-gray-100" alt="thumb" />{item.status === 'success' && <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs border-2 border-white shadow-sm"><i className="fa-solid fa-check"></i></div>}</div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                        <div><h4 className="text-base font-bold line-clamp-2 mb-1">{item.video.title}</h4><p className="text-sm text-gray-500 font-medium">@{item.video.author}</p></div>
                                        {item.analysis && (
                                            <div className="flex items-center justify-between mt-3">
                                                <div className="flex gap-2">
                                                    <span className="text-xs px-2 py-1 rounded-lg font-bold bg-emerald-100 text-emerald-800">Hook: {item.analysis.hookScore}</span>
                                                    <span className="text-xs px-2 py-1 rounded-lg font-bold bg-blue-100 text-blue-800">Viral: {item.analysis.viralScore}</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button 
                                                        onClick={() => handleSaveBatchItem(item.video, item.analysis!)}
                                                        disabled={savedBatchIds.has(item.video.id) || savingBatchIds.has(item.video.id)}
                                                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${savedBatchIds.has(item.video.id) ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-600'}`}
                                                        title="Lưu vào Sheet"
                                                    >
                                                        {savingBatchIds.has(item.video.id) ? <i className="fa-solid fa-circle-notch fa-spin text-[10px]"></i> : <i className="fa-solid fa-file-excel text-xs"></i>}
                                                    </button>
                                                    <button onClick={() => { setMode('single'); setCurrentVideo(item.video); setAnalysisResult(item.analysis); setShowReportModal(true); }} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors"><i className="fa-solid fa-arrow-right"></i></button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
          );
      }
      return null;
  };

  return (
    <div className="min-h-screen pb-20 bg-[#F8FAFC]">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showCompletionModal && <CompletionModal onConfirm={() => { setShowCompletionModal(false); setShowReportModal(true); }} onCancel={() => setShowCompletionModal(false)} />}
      <main className="w-[95%] xl:w-[80%] max-w-[1920px] mx-auto mt-12 flex-1">
        {currentView !== 'home' ? (
            currentView === 'guide' ? <GuideSection /> : 
            currentView === 'changelog' ? <ChangelogSection /> : 
            currentView === 'terms' ? <LegalSection title="Điều Khoản Dịch Vụ" /> : <LegalSection title="Chính Sách Bảo Mật" />
        ) : (
            <>
                <DiscoveryMode onAnalyzeSelected={handleDiscoveryAnalyze} onDirectAnalyze={handleDirectAnalyze} isGlobalProcessing={isProcessing} globalProcessStep={processStep} onGlobalStop={handleStop} analysisResultNode={renderAnalysisResultsBlock()} />
                {error && <div className="mt-8 p-6 bg-red-50 border border-red-100 rounded-3xl text-red-800 text-center flex flex-col items-center gap-2 max-w-2xl mx-auto"><i className="fa-solid fa-face-frown-open text-3xl opacity-50"></i><span className="font-bold">{error}</span></div>}
                {showReportModal && mode === 'single' && currentVideo && analysisResult && <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"><div className="w-full max-w-[95vw] h-full max-h-[95vh] relative"><AnalysisReport analysis={analysisResult} video={currentVideo} onUpdateAnalysis={handleUpdateAnalysis} onClose={() => { setShowReportModal(false); setAnalysisResult(null); setCurrentVideo(null); }} /></div></div>}
                {history.length > 0 && <div className="pt-16 border-t border-gray-100 mt-16"><HistoryList items={history} onClear={handleClearHistory} onSelect={handleSelectHistory} /></div>}
            </>
        )}
      </main>
      <footer className="mt-12 py-12 border-t border-gray-200 w-[95%] xl:w-[80%] mx-auto rounded-3xl mb-10 bg-white shadow-sm px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div 
                onClick={() => setCurrentView('home')} 
                className="flex items-center gap-3 select-none cursor-pointer group"
            >
                <div className="w-11 h-11 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><i className="fa-solid fa-bolt text-white"></i></div>
                <h1 className="text-xl font-black tracking-tighter">TikTok <span className="text-emerald-600">Analyst</span></h1>
            </div>
            
            <div className="flex items-center gap-4 flex-wrap justify-center">
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
                    <button 
                        onClick={() => setCurrentView('changelog')} 
                        className={`hover:text-emerald-600 transition-all font-bold text-sm flex items-center gap-2 ${currentView === 'changelog' ? 'text-emerald-600' : 'text-gray-500'}`}
                    >
                        <i className="fa-solid fa-clock-rotate-left text-xs"></i>
                        Nhật Ký Phiên Bản
                    </button>
                    <div className="w-px h-4 bg-gray-200"></div>
                    <span className="text-[10px] font-black bg-gray-200 text-gray-500 px-2 py-1 rounded-lg uppercase">v1.8.0 Stable</span>
                </div>
                <button onClick={() => setShowSettings(true)} className="w-11 h-11 rounded-full bg-gray-50 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-gray-100"><i className="fa-solid fa-gear"></i></button>
            </div>
          </div>
      </footer>
    </div>
  );
};

export default App;
