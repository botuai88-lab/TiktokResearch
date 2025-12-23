
import React, { useState } from 'react';
import { ContentAnalysis, TikTokVideo, ReEditResult, RemixContent } from '../types';
import { saveToGoogleSheet } from '../services/googleSheetService';
import { RemixModal } from './RemixModal';
import { ReEditModal } from './ReEditModal';

interface AnalysisReportProps {
  analysis: ContentAnalysis;
  video?: TikTokVideo;
  onClose: () => void;
  onUpdateAnalysis?: (updatedAnalysis: ContentAnalysis) => void; 
}

export const AnalysisReport: React.FC<AnalysisReportProps> = ({ analysis, video, onClose, onUpdateAnalysis }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showRemix, setShowRemix] = useState(false);
  const [showReEdit, setShowReEdit] = useState(false);
  
  // State for export/download status
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);

  const handleSave = async () => {
    if (!video) return;
    setIsSaving(true);
    const success = await saveToGoogleSheet({ analysis, video }, 'video');
    setIsSaving(false);
    if (success) {
        setIsSaved(true);
    } else {
        alert("Lưu thất bại. Vui lòng thử lại.");
    }
  };

  const handleCopyScript = () => {
    if (!analysis.scriptTable || analysis.scriptTable.length === 0) {
        if (analysis.fullScript) {
             navigator.clipboard.writeText(analysis.fullScript);
             alert("Đã sao chép kịch bản text!");
        } else {
             alert("Không có dữ liệu kịch bản để sao chép.");
        }
        return;
    }

    const text = analysis.scriptTable.map(s =>
        `[${s.scene}] \n- Hình ảnh: ${s.visual}\n- Âm thanh: ${s.audio}`
    ).join('\n\n');

    navigator.clipboard.writeText(text);
    alert("Đã sao chép toàn bộ kịch bản!");
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Đã sao chép gợi ý!");
  };

  // --- NEW: Handle PDF Export via html2pdf ---
  const handleExportPDF = () => {
      const element = document.getElementById('analysis-report-content');
      if (!element || !(window as any).html2pdf) {
          alert("Lỗi thư viện PDF. Vui lòng tải lại trang.");
          return;
      }

      setIsExportingPdf(true);

      const opt = {
          margin: [10, 10, 10, 10], // top, left, bottom, right
          filename: `TikTok_Analyst_${video?.id || 'Report'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Wait for React to render the full height view (due to isExportingPdf state change)
      setTimeout(() => {
          (window as any).html2pdf().set(opt).from(element).save().then(() => {
              setIsExportingPdf(false);
          }).catch((err: any) => {
              console.error(err);
              setIsExportingPdf(false);
              alert("Không thể xuất PDF. Vui lòng thử lại.");
          });
      }, 500);
  };

  // --- NEW: Handle Video Download ---
  const handleDownloadVideo = async () => {
      if (!video?.downloadUrl) return;
      setIsDownloadingVideo(true);
      
      try {
          // Attempt direct fetch first. TikWM urls often allow CORS or can be proxied.
          // Using a CORS proxy to ensure binary data access
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(video.downloadUrl)}`;
          
          const response = await fetch(proxyUrl);
          if (!response.ok) throw new Error("Fetch failed");
          
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `TikTok_${video.id}_NoWatermark.mp4`;
          document.body.appendChild(a);
          a.click();
          
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
      } catch (e) {
          console.warn("Direct download failed, opening in new tab.", e);
          // Fallback
          window.open(video.downloadUrl, '_blank');
      } finally {
          setIsDownloadingVideo(false);
      }
  };

  // Callback to merge new Re-Edit data into current analysis
  const handleSaveReEdit = (result: ReEditResult) => {
      if (onUpdateAnalysis) {
          const updated = { ...analysis, reEditedScript: result };
          onUpdateAnalysis(updated);
      }
  };

  // Callback to merge new Remix data into current analysis
  const handleSaveRemix = (result: RemixContent) => {
      if (onUpdateAnalysis) {
          const updated = { ...analysis, remixContent: result };
          onUpdateAnalysis(updated);
      }
  };

  const getPotentialLabel = (potential: string) => {
      if (potential === 'High') return 'Cao';
      if (potential === 'Medium') return 'Trung bình';
      if (potential === 'Low') return 'Thấp';
      return potential;
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-2xl relative overflow-hidden flex flex-col transition-all duration-300 ${isExportingPdf ? 'h-auto overflow-visible' : 'h-full max-h-[90vh] animate-in slide-in-from-bottom-6 duration-500'}`}>
      {/* Remix Modal */}
      {showRemix && (
          <RemixModal 
            analysis={analysis} 
            onClose={() => setShowRemix(false)} 
            onSave={handleSaveRemix} 
          />
      )}
      
      {/* Re-Edit Modal */}
      {showReEdit && (
          <ReEditModal 
            analysis={analysis} 
            onClose={() => setShowReEdit(false)} 
            onSave={handleSaveReEdit} 
          />
      )}

      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-100 rounded-full blur-3xl -z-10 pointer-events-none opacity-40"></div>
      
      {/* Header Section (Sticky) */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 p-6 lg:p-8 border-b border-gray-100 bg-white sticky top-0 z-20 print:static print:border-b-2 print:p-4" data-html2canvas-ignore="true">
        <div>
           <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
             <i className="fa-solid fa-microscope text-emerald-800"></i>
             AI Phân Tích Chuyên Sâu
           </h3>
           <div className="flex flex-wrap gap-2 mt-2">
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide border border-emerald-200">
                {analysis.niche}
              </span>
              <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full border border-gray-200">
                <i className="fa-regular fa-clock mr-1"></i>{video?.duration}s
              </span>
           </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto flex-wrap md:flex-nowrap no-print">
            <button 
                onClick={handleExportPDF}
                disabled={isExportingPdf}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm bg-gray-800 text-white hover:bg-black shadow-lg shadow-gray-300 hover:shadow-gray-400 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                {isExportingPdf ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-file-pdf"></i>}
                {isExportingPdf ? 'Đang xuất...' : 'Xuất PDF'}
            </button>

            <button 
                onClick={() => setShowReEdit(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 hover:shadow-md"
            >
                <i className="fa-solid fa-scissors"></i> Xào Lại Video
            </button>

            <button 
                onClick={() => setShowRemix(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-200 hover:shadow-purple-300 hover:scale-105"
            >
                <i className="fa-solid fa-wand-magic-sparkles"></i> SP Tương Tự
            </button>

            {video && (
                <button 
                    onClick={handleSave}
                    disabled={isSaving || isSaved}
                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm border ${
                        isSaved 
                        ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed' 
                        : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800 hover:border-green-300 shadow-sm'
                    }`}
                >
                    {isSaving ? <i className="fa-solid fa-circle-notch fa-spin"></i> : isSaved ? <i className="fa-solid fa-check-circle"></i> : <i className="fa-solid fa-file-excel"></i>}
                    {isSaving ? 'Đang lưu...' : isSaved ? 'Đã Lưu' : 'Lưu Sheet'}
                </button>
            )}
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors">
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
        </div>
      </div>

      {/* Scrollable Content (Wrapper with ID for html2pdf) */}
      <div 
        id="analysis-report-content" 
        className={`p-6 lg:p-8 bg-white ${isExportingPdf ? 'overflow-visible h-auto' : 'overflow-y-auto custom-scrollbar flex-1'}`}
      >
        <div className="grid lg:grid-cols-12 gap-8 mb-8">
            {/* LEFT: Scores & Summary (4 Cols) */}
            <div className="lg:col-span-5 space-y-6">
            
            {/* Scores Matrix */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-1">Hook Score</span>
                    <span className={`text-4xl font-black ${analysis.hookScore >= 8 ? 'text-emerald-600' : analysis.hookScore >= 6 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {analysis.hookScore}<span className="text-lg text-gray-400 font-medium">/10</span>
                    </span>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-1">Viral Score</span>
                    <span className={`text-4xl font-black ${analysis.viralScore >= 8 ? 'text-blue-600' : analysis.viralScore >= 6 ? 'text-yellow-600' : 'text-gray-600'}`}>
                    {analysis.viralScore}<span className="text-lg text-gray-400 font-medium">/10</span>
                    </span>
                </div>
            </div>

            {/* AI SCRIPT DOCTOR SECTION (Added right below scores) */}
            {analysis.scriptDoctor && (
              <div className="bg-white border-2 border-indigo-100 rounded-3xl overflow-hidden shadow-xl shadow-indigo-100/50 animate-in zoom-in-95 duration-500">
                <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
                  <h4 className="text-white font-black text-sm uppercase tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-user-md"></i> AI Script Doctor
                  </h4>
                  <span className="bg-indigo-400/30 text-white text-[10px] font-bold px-2 py-0.5 rounded border border-white/20">Optimizing...</span>
                </div>
                <div className="p-6 space-y-6">
                  {/* Emergency Hooks */}
                  {analysis.hookScore < 8 && (
                    <div>
                      <h5 className="text-[10px] font-black text-indigo-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                        Giải cứu Hook (Top 3 Phương Án)
                      </h5>
                      <div className="space-y-3">
                        {analysis.scriptDoctor.newHooks.map((hook, hIdx) => (
                          <div key={hIdx} className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 relative group">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-[9px] font-bold bg-white text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 uppercase">{hook.type}</span>
                              <button 
                                onClick={() => handleCopyText(hook.content)}
                                className="text-indigo-400 hover:text-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Copy Hook"
                              >
                                <i className="fa-regular fa-copy"></i>
                              </button>
                            </div>
                            <p className="text-sm font-bold text-indigo-900 leading-snug italic">"{hook.content}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Body Optimization */}
                  <div className="border-t border-indigo-100 pt-4">
                    <h5 className="text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">
                       Tối ưu kịch bản ({analysis.scriptDoctor.bodyOptimization.framework})
                    </h5>
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                      <p className="text-sm text-gray-700 leading-relaxed font-medium">
                        {analysis.scriptDoctor.bodyOptimization.suggestion}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Sales Estimation Card */}
            {analysis.salesEstimate && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-200 rounded-full blur-2xl -z-10 opacity-50 group-hover:opacity-80 transition-opacity"></div>
                    
                    <h4 className="text-sm font-bold text-emerald-900 mb-3 uppercase tracking-wide flex items-center gap-2">
                        <i className="fa-solid fa-money-bill-trend-up"></i> Dự Báo Doanh Số (AI)
                        <span className="bg-emerald-200 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded border border-emerald-300">Beta</span>
                    </h4>
                    
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center border-b border-emerald-200/50 pb-2">
                            <span className="text-sm text-emerald-700 font-medium">Đơn hàng ước tính</span>
                            <span className="text-lg font-black text-emerald-900">{analysis.salesEstimate.estimatedOrders}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-emerald-200/50 pb-2">
                            <span className="text-sm text-emerald-700 font-medium">Tiềm năng</span>
                            <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                                analysis.salesEstimate.revenuePotential === 'High' || analysis.salesEstimate.revenuePotential === 'Cao' ? 'bg-emerald-200 text-emerald-900' : 
                                analysis.salesEstimate.revenuePotential === 'Medium' || analysis.salesEstimate.revenuePotential === 'Trung bình' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                                {getPotentialLabel(analysis.salesEstimate.revenuePotential)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-emerald-700 font-medium">Tỷ lệ chuyển đổi (CVR)</span>
                            <span className="text-sm font-bold text-emerald-900">{analysis.salesEstimate.conversionRate}</span>
                        </div>
                    </div>
                    
                    <div className="mt-3 pt-2 border-t border-emerald-200/50">
                        <p className="text-xs text-emerald-800 italic leading-snug">
                            <i className="fa-solid fa-circle-info mr-1"></i>
                            {analysis.salesEstimate.reasoning}
                        </p>
                    </div>
                </div>
            )}

            {/* Summary */}
            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                <h4 className="text-sm font-bold text-blue-900 mb-2 uppercase tracking-wide">Tóm tắt khách quan</h4>
                <p className="text-sm text-gray-800 leading-relaxed font-medium">{analysis.summary}</p>
            </div>

            {/* Watch on TikTok Button (Deep Link) */}
            {video && (
                <div className="flex flex-col gap-3 no-print" data-html2canvas-ignore="true">
                    <a 
                        href={video.downloadUrl || `https://www.tiktok.com/${video.author}/video/${video.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-3 w-full py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold transition-all shadow-lg shadow-gray-300 hover:shadow-gray-400"
                    >
                        <i className="fa-brands fa-tiktok text-xl"></i>
                        Xem Video Gốc trên TikTok
                    </a>
                    
                    {/* NEW: Download No Watermark Button */}
                    <button 
                        onClick={handleDownloadVideo}
                        disabled={isDownloadingVideo}
                        className={`flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold transition-all shadow-lg ${
                            isDownloadingVideo 
                            ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed' 
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 hover:shadow-emerald-300'
                        }`}
                    >
                        {isDownloadingVideo ? (
                            <>
                                <i className="fa-solid fa-circle-notch fa-spin"></i> Đang tải về...
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-download"></i> Tải Video Không Logo
                            </>
                        )}
                    </button>
                </div>
            )}
            </div>

            {/* RIGHT: Analysis Details (8 Cols) */}
            <div className="lg:col-span-7 space-y-6">
            
            {/* Hook Analysis */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <i className="fa-solid fa-anchor text-emerald-800"></i> Phân Tích Hook (3s Đầu)
                </h4>
                <p className="text-base text-gray-800 leading-relaxed italic border-l-4 border-emerald-500 pl-4 bg-gray-50 py-2 pr-2 rounded-r-lg">
                "{analysis.hookAnalysis}"
                </p>
            </div>

            {/* Style & Structure Grid */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                    <h4 className="text-base font-bold text-gray-900 mb-3 uppercase tracking-wide text-xs text-gray-500">Định Dạng (Identity)</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span className="text-sm text-gray-600 font-medium">Phong Cách</span>
                        <span className="text-sm font-bold text-gray-900 text-right">{analysis.style}</span>
                        </div>
                        <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 font-medium">Giọng Điệu</span>
                        <span className="text-sm font-bold text-gray-900 text-right">{analysis.voice}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
                    <h4 className="text-base font-bold text-gray-900 mb-3 uppercase tracking-wide text-xs text-gray-500">Cấu Trúc Tuyến Tính</h4>
                    <div className="flex flex-col gap-2">
                        {analysis.structure.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{idx+1}</span>
                            <span className="text-sm font-bold text-gray-800">{step}</span>
                        </div>
                        ))}
                    </div>
                </div>
            </div>
            </div>
        </div>

        {/* Visual Hooks & Strategic Advice Grid (MOVED TO FULL WIDTH ROW) */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Visual Hooks */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-full">
                <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-eye text-indigo-700"></i> Yếu Tố Thị Giác (Visual Hooks)
                </h4>
                <div className="flex flex-wrap gap-2">
                    {analysis.visualHooks.map((hook, idx) => (
                    <span key={idx} className="bg-indigo-50 text-indigo-900 border border-indigo-100 px-3 py-1.5 rounded-lg text-sm font-semibold">
                        {hook}
                    </span>
                    ))}
                </div>
            </div>

            {/* Strategic Advice */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 rounded-2xl border border-emerald-100 h-full">
                <h4 className="text-base font-bold text-emerald-900 mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-lightbulb text-emerald-600"></i> Lời Khuyên Chiến Lược
                </h4>
                <ul className="space-y-3">
                    {analysis.improvementTips.map((tip, idx) => (
                        <li key={idx} className="flex gap-3 text-sm text-emerald-900 font-medium">
                        <i className="fa-solid fa-check text-emerald-600 mt-1 flex-shrink-0"></i>
                        <span className="leading-relaxed">{tip}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>

        {/* FULL SCRIPT AUDIT SECTION (Full Width) */}
        <div className="mt-10 border-t border-gray-200 pt-8">
            <div className="bg-gray-900 rounded-t-xl px-6 py-4 flex items-center justify-between print:bg-gray-200 print:text-black">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center print:bg-black/10 print:text-black">
                    <i className="fa-solid fa-file-lines text-sm"></i>
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-white print:text-black">Audit Kịch Bản & Nội Dung (Verbatim)</h4>
                        <p className="text-xs text-gray-400 print:text-gray-600">Ghi chép chính xác từng chữ và mô tả hình ảnh.</p>
                    </div>
                </div>
                <button 
                    onClick={handleCopyScript}
                    className="text-xs bg-white/20 hover:bg-white/30 text-white font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 no-print"
                    data-html2canvas-ignore="true"
                >
                    <i className="fa-regular fa-copy"></i> Sao chép Kịch bản
                </button>
            </div>
            
            <div className="border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                    {analysis.scriptTable ? (
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[12%] whitespace-nowrap">Thời gian</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[44%] border-l border-gray-200">
                                        <i className="fa-solid fa-video mr-1.5"></i>Hình ảnh (Visual)
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[44%] border-l border-gray-200">
                                        <i className="fa-solid fa-microphone-lines mr-1.5"></i>Âm thanh (Audio)
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {analysis.scriptTable.map((item, index) => (
                                    <tr key={index} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4 text-sm font-bold text-gray-500 align-top bg-gray-50/50 group-hover:bg-blue-50/50 whitespace-nowrap">
                                            {item.scene.replace('Cảnh ', '')}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-800 align-top leading-relaxed border-l border-gray-100">
                                            {item.visual}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-800 align-top leading-relaxed font-mono bg-gray-50/30 border-l border-gray-100 whitespace-pre-wrap">
                                            {item.audio}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            Chưa có dữ liệu kịch bản chi tiết.
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
