
import React, { useState } from 'react';
import { BatchSummaryAnalysis } from '../types';
import { saveToGoogleSheet } from '../services/googleSheetService';

interface BatchReportProps {
  analysis: BatchSummaryAnalysis;
  onClose: () => void;
}

export const BatchSummaryReport: React.FC<BatchReportProps> = ({ analysis, onClose }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await saveToGoogleSheet(analysis, 'batch_summary');
    setIsSaving(false);
    if (success) {
        setIsSaved(true);
    } else {
        alert("Lưu thất bại. Vui lòng thử lại.");
    }
  };

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="printable-container bg-white rounded-3xl border border-gray-200 p-8 lg:p-10 animate-in slide-in-from-bottom-6 duration-500 shadow-2xl relative overflow-hidden mb-12">
      {/* Background decoration */}
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-50 rounded-full blur-3xl -z-10 pointer-events-none opacity-50"></div>
      <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -z-10 pointer-events-none opacity-60"></div>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-10 pb-8 border-b border-gray-200">
        <div className="flex items-center gap-6">
           <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-700 flex items-center justify-center text-white text-4xl shadow-lg shadow-blue-500/20">
              <i className="fa-solid fa-layer-group"></i>
           </div>
           <div>
              <div className="flex items-center gap-3">
                 <h3 className="text-3xl md:text-4xl font-bold text-gray-900">Báo Cáo Tổng Hợp</h3>
                 <span className="px-4 py-1.5 bg-blue-100 text-blue-900 rounded-full text-sm font-bold uppercase tracking-wide border border-blue-200">Batch Strategy</span>
              </div>
              <p className="text-gray-700 text-lg mt-2 font-medium">Insight & Định hướng từ danh sách video</p>
           </div>
        </div>
        <div className="flex gap-3 no-print">
            <button 
                onClick={handlePrint}
                className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors shadow-sm"
                title="Xuất PDF"
            >
                <i className="fa-solid fa-print"></i>
            </button>
            <button 
                onClick={handleSave}
                disabled={isSaving || isSaved}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm border ${
                    isSaved 
                    ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed' 
                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800 hover:border-blue-300 shadow-sm'
                }`}
            >
                {isSaving ? (
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                ) : isSaved ? (
                    <i className="fa-solid fa-check-circle"></i>
                ) : (
                    <i className="fa-solid fa-file-excel"></i>
                )}
                {isSaving ? 'Đang lưu...' : isSaved ? 'Đã Lưu' : 'Lưu Sheet'}
            </button>
            <button onClick={onClose} className="w-12 h-12 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors">
              <i className="fa-solid fa-xmark text-2xl"></i>
            </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
        {/* LEFT COLUMN (4 cols) */}
        <div className="lg:col-span-4 space-y-8">
           {/* Health Score */}
           <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <h4 className="text-base font-semibold text-gray-300 uppercase tracking-wider mb-4">Chất Lượng Nhóm Video</h4>
              <div className="flex items-end gap-4 mb-6">
                 <span className={`text-7xl font-black ${analysis.healthScore >= 80 ? 'text-emerald-400' : analysis.healthScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {analysis.healthScore}
                 </span>
                 <span className="text-2xl text-gray-400 mb-3">/100</span>
              </div>
              <p className="text-base text-gray-200 leading-relaxed border-t border-white/10 pt-4 font-medium">
                 {analysis.healthAnalysis}
              </p>
           </div>

           {/* Brand Identity Matrix */}
           <div className="bg-blue-50/50 rounded-3xl p-8 border border-blue-200">
              <h4 className="text-base font-bold text-blue-900 uppercase tracking-wider mb-6 flex items-center gap-2">
                 <i className="fa-solid fa-fingerprint text-blue-800"></i> Nhận Diện Xu Hướng
              </h4>
              <div className="space-y-6">
                 <div>
                    <span className="text-sm text-blue-800 font-bold uppercase block mb-2">Phong Cách Chủ Đạo</span>
                    <div className="bg-white p-4 rounded-xl border border-blue-200 text-blue-900 text-base font-bold shadow-sm">
                       {analysis.channelStyle}
                    </div>
                 </div>
                 <div>
                    <span className="text-sm text-blue-800 font-bold uppercase block mb-2">Giọng Điệu Chung</span>
                    <div className="bg-white p-4 rounded-xl border border-blue-200 text-blue-900 text-base font-bold shadow-sm">
                       {analysis.channelVoice}
                    </div>
                 </div>
                 <div>
                    <span className="text-sm text-blue-800 font-bold uppercase block mb-2">Visual Hooks Hiệu Quả</span>
                    <div className="flex flex-wrap gap-2.5">
                        {analysis.channelVisuals?.map((v, i) => (
                            <span key={i} className="bg-white text-blue-900 border border-blue-200 px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm">
                                {v}
                            </span>
                        ))}
                    </div>
                 </div>
              </div>
           </div>

           {/* Audience */}
           <div className="bg-gray-50 rounded-3xl p-8 border border-gray-200">
              <h4 className="text-base font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                 <i className="fa-solid fa-users text-gray-600"></i> Chân Dung Khán Giả
              </h4>
              <p className="text-base text-gray-800 leading-relaxed font-medium">
                 {analysis.audiencePersona}
              </p>
           </div>
        </div>

        {/* CENTER/RIGHT COLUMN (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
           
           {/* Content Categories & Products */}
           <div className="grid md:grid-cols-2 gap-8">
               {/* Categories */}
               <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                  <h4 className="text-base font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2">
                     <i className="fa-solid fa-chart-pie text-blue-800"></i> Tỷ Trọng Ngách
                  </h4>
                  <div className="space-y-4">
                     {analysis.contentCategories?.map((cat, idx) => (
                        <div key={idx}>
                           <div className="flex justify-between text-sm font-bold text-gray-800 mb-2">
                              <span>{cat.name}</span>
                              <span>{cat.percentage}%</span>
                           </div>
                           <div className="w-full bg-gray-100 rounded-full h-3">
                              <div className="bg-blue-600 h-3 rounded-full" style={{ width: `${cat.percentage}%` }}></div>
                           </div>
                           <p className="text-xs text-gray-500 mt-1.5">{cat.description}</p>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Products & Services */}
               <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                  <h4 className="text-base font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2">
                     <i className="fa-solid fa-bullseye text-indigo-800"></i> Trọng Tâm Nội Dung
                  </h4>
                  
                  <div className="mb-6">
                     <h5 className="text-sm font-bold text-gray-600 uppercase mb-3">Chủ đề chính (Pillars)</h5>
                     <div className="flex flex-wrap gap-2.5">
                        {analysis.contentPillars?.map((pillar, idx) => (
                           <span key={idx} className="text-sm bg-indigo-50 text-indigo-900 border border-indigo-100 px-3 py-1.5 rounded-lg font-bold">
                              #{pillar}
                           </span>
                        ))}
                     </div>
                  </div>

                  <div>
                      <h5 className="text-sm font-bold text-gray-600 uppercase mb-3">Sản phẩm/Dịch vụ liên quan</h5>
                      {analysis.productsServices && analysis.productsServices.length > 0 ? (
                          <div className="flex flex-wrap gap-2.5">
                              {analysis.productsServices.map((p, idx) => (
                                  <span key={idx} className="bg-gray-100 text-gray-800 px-3 py-1.5 rounded-lg text-sm font-medium">
                                      {p}
                                  </span>
                              ))}
                          </div>
                      ) : (
                          <p className="text-sm text-gray-400 italic">Không xác định rõ sản phẩm.</p>
                      )}
                  </div>
               </div>
           </div>

           {/* Winning Formula */}
           <div className="bg-gradient-to-r from-amber-50 via-white to-white rounded-3xl p-8 border border-amber-200 shadow-sm">
              <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                 <i className="fa-solid fa-crown text-amber-600"></i> Công Thức Chiến Thắng (Top Picks)
              </h4>
              <div className="grid gap-6">
                 {analysis.winningFormula.map((item, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl border border-amber-100 flex gap-5 items-start shadow-sm">
                       <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg flex-shrink-0 mt-1">
                          {idx + 1}
                       </div>
                       <div>
                          <h5 className="font-bold text-gray-900 text-base mb-2 line-clamp-1">"{item.title}"</h5>
                          <div className="flex gap-3 mb-3">
                              <span className="text-xs bg-amber-50 text-amber-800 px-3 py-1 rounded border border-amber-200 font-bold uppercase tracking-wide">
                                 {item.performance}
                              </span>
                          </div>
                          <p className="text-base text-gray-800 leading-relaxed">
                             <span className="font-semibold text-gray-900">Tại sao hiệu quả:</span> {item.reason}
                          </p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           <div className="grid md:grid-cols-2 gap-8">
              {/* Weaknesses */}
              <div className="bg-red-50/50 rounded-3xl p-8 border border-red-200">
                 <h4 className="text-base font-bold text-red-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation text-red-600"></i> Điểm Yếu Cần Cải Thiện
                 </h4>
                 <ul className="space-y-3">
                    {analysis.weaknesses.map((w, idx) => (
                       <li key={idx} className="flex gap-3 text-base text-red-900">
                          <span className="text-red-500 mt-2 w-1.5 h-1.5 rounded-full bg-red-500 block flex-shrink-0"></span> 
                          <span className="leading-relaxed font-medium">{w}</span>
                       </li>
                    ))}
                 </ul>
              </div>

              {/* Strategy */}
              <div className="bg-blue-50/50 rounded-3xl p-8 border border-blue-200">
                 <h4 className="text-base font-bold text-blue-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-compass text-blue-700"></i> Định Hướng 30 Ngày Tới
                 </h4>
                 <ul className="space-y-3">
                    {analysis.strategicAdvice.map((s, idx) => (
                       <li key={idx} className="flex gap-3 text-base text-blue-900">
                          <i className="fa-solid fa-check text-blue-700 mt-1 text-sm flex-shrink-0"></i> 
                          <span className="leading-relaxed font-medium">{s}</span>
                       </li>
                    ))}
                 </ul>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
