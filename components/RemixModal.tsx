
import React, { useState } from 'react';
import { ContentAnalysis, RemixContent, ScriptItem } from '../types';
import { generateSimilarContent } from '../services/geminiService';

interface RemixModalProps {
    analysis: ContentAnalysis;
    onClose: () => void;
    onSave?: (result: RemixContent) => void;
}

export const RemixModal: React.FC<RemixModalProps> = ({ analysis, onClose, onSave }) => {
    const [step, setStep] = useState<'input' | 'generating' | 'result'>(
        analysis.remixContent ? 'result' : 'input'
    );
    const [productName, setProductName] = useState(analysis.remixContent?.productName || '');
    const [productInfo, setProductInfo] = useState('');
    const [remixResult, setRemixResult] = useState<RemixContent | null>(analysis.remixContent || null);
    const [selectedHookIndex, setSelectedHookIndex] = useState(0);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const handleGenerate = async () => {
        if (!productName.trim() || !productInfo.trim()) return;
        
        setStep('generating');
        try {
            const result = await generateSimilarContent(analysis, productName, productInfo);
            setRemixResult(result);
            setStep('result');
            if (onSave) onSave(result); // Persist
        } catch (error) {
            console.error(error);
            alert("Có lỗi khi tạo nội dung. Vui lòng thử lại.");
            setStep('input');
        }
    };

    const handleCopy = () => {
        if (!remixResult) return;
        const hook = remixResult.hooks[selectedHookIndex];
        
        const header = `TIÊU ĐỀ: ${remixResult.title}\nHOOK (${hook.type}): ${hook.content}\n\n`;
        const tableHeader = `Scene\tVisual (Hình ảnh)\tAudio (Âm thanh)`;
        const tableBody = remixResult.scriptTable.map(s => {
            const cleanVisual = s.visual.replace(/\n/g, ' ');
            const cleanAudio = s.audio.replace(/\n/g, ' ');
            return `${s.scene}\t${cleanVisual}\t${cleanAudio}`;
        }).join('\n');
        const notes = `\n\nGHI CHÚ QUAY:\n${remixResult.filmingNotes.join('\n- ')}`;
        const fullText = `${header}${tableHeader}\n${tableBody}${notes}`;

        navigator.clipboard.writeText(fullText);
        alert("Đã copy kịch bản!");
    };

    const handleExportPDF = () => {
        const element = document.getElementById('remix-content');
        if (!element || !(window as any).html2pdf) {
            alert("Lỗi thư viện PDF.");
            return;
        }

        setIsExportingPdf(true);

        const opt = {
            margin: [10, 10, 10, 10],
            filename: `Remix_Script_${productName.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        setTimeout(() => {
            (window as any).html2pdf().set(opt).from(element).save().then(() => {
                setIsExportingPdf(false);
            }).catch((err: any) => {
                console.error(err);
                setIsExportingPdf(false);
                alert("Lỗi xuất PDF.");
            });
        }, 500);
    };

    const handleScriptChange = (index: number, field: keyof ScriptItem, value: string) => {
        if (!remixResult) return;
        const newScriptTable = [...remixResult.scriptTable];
        newScriptTable[index] = { ...newScriptTable[index], [field]: value };
        
        const updatedResult = { ...remixResult, scriptTable: newScriptTable };
        setRemixResult(updatedResult);
        if (onSave) onSave(updatedResult);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className={`bg-white w-full md:w-[90%] max-w-[95vw] md:max-w-[90vw] rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${isExportingPdf ? 'h-auto overflow-visible' : 'max-h-[90vh]'}`}>
                
                {/* Header */}
                <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-pink-50" data-html2canvas-ignore="true">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-lg shadow-lg shadow-purple-200">
                             <i className="fa-solid fa-wand-magic-sparkles"></i>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">AI Content Generator 2.0</h3>
                            <p className="text-xs text-gray-500">Tạo Kịch bản Viral</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {step === 'result' && (
                            <button 
                                onClick={handleExportPDF} 
                                disabled={isExportingPdf}
                                className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl font-bold text-sm transition-colors shadow-sm flex items-center gap-2"
                            >
                                {isExportingPdf ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-file-pdf"></i>}
                                Xuất PDF
                            </button>
                        )}
                        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors shadow-sm">
                            <i className="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div 
                    id="remix-content"
                    className={`flex-1 p-8 bg-white ${isExportingPdf ? 'overflow-visible h-auto' : 'overflow-y-auto custom-scrollbar'}`}
                >
                    
                    {step === 'input' && (
                        <div className="max-w-xl mx-auto space-y-6">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800 flex gap-3">
                                <i className="fa-solid fa-lightbulb mt-1 text-blue-600"></i>
                                <div>
                                    <p className="font-bold mb-1">Bạn muốn áp dụng công thức này cho sản phẩm nào?</p>
                                    <p>AI sẽ phân tích cấu trúc video gốc và tạo ra <strong>3 kiểu mở đầu (Hook)</strong> khác nhau để bạn A/B Test.</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-bold mb-2">Tên Sản Phẩm / Dịch Vụ</label>
                                <input 
                                    type="text" 
                                    value={productName}
                                    onChange={(e) => setProductName(e.target.value)}
                                    placeholder="Ví dụ: Kem chống nắng SunShield, Khóa học Tiếng Anh..."
                                    className="w-full p-4 border border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 font-bold mb-2">Điểm Nổi Bật / Thông tin chính (USP)</label>
                                <textarea 
                                    value={productInfo}
                                    onChange={(e) => setProductInfo(e.target.value)}
                                    placeholder="Ví dụ: Kiềm dầu 12h, nâng tone tự nhiên, không bết dính. Dành cho da dầu mụn..."
                                    className="w-full p-4 h-32 border border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all resize-none text-sm"
                                />
                            </div>

                            <button 
                                onClick={handleGenerate}
                                disabled={!productName || !productInfo}
                                className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-xl transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 ${
                                    !productName || !productInfo ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-purple-500/30'
                                }`}
                            >
                                <i className="fa-solid fa-pen-nib"></i> Viết Kịch Bản Ngay
                            </button>
                        </div>
                    )}

                    {step === 'generating' && (
                        <div className="flex flex-col items-center justify-center h-full py-12" data-html2canvas-ignore="true">
                            <div className="w-20 h-20 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-6"></div>
                            <h4 className="text-xl font-bold text-gray-800 mb-2">AI đang sáng tạo đa chiều...</h4>
                            <p className="text-gray-500 text-center">Đang tạo 3 biến thể Hook và đề xuất Visual Trend cho {productName}</p>
                        </div>
                    )}

                    {step === 'result' && remixResult && (
                        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
                            
                            {/* SECTION 1: HOOK SELECTION (Full Width) */}
                            <div>
                                <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center text-sm"><i className="fa-solid fa-magnet"></i></span>
                                    1. Chọn Hook (3s Đầu)
                                </h4>
                                <div className="grid md:grid-cols-3 gap-4">
                                    {remixResult.hooks.map((hook, idx) => (
                                        <div 
                                            key={idx}
                                            onClick={() => setSelectedHookIndex(idx)}
                                            className={`p-5 rounded-2xl border cursor-pointer transition-all relative flex flex-col ${
                                                selectedHookIndex === idx 
                                                ? 'bg-purple-50 border-purple-500 shadow-md ring-2 ring-purple-100' 
                                                : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-sm'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center mb-3">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-lg uppercase ${
                                                    idx === 0 ? 'bg-red-100 text-red-700' : idx === 1 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                                }`}>
                                                    {hook.type}
                                                </span>
                                                {selectedHookIndex === idx && <i className="fa-solid fa-circle-check text-purple-600 text-lg" data-html2canvas-ignore="true"></i>}
                                            </div>
                                            <p className="text-gray-800 font-bold text-base leading-relaxed flex-1">
                                                "{hook.content}"
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid md:grid-cols-12 gap-8">
                                {/* SECTION 2: SCRIPT TABLE (Left - 8 Cols) */}
                                <div className="md:col-span-8">
                                    <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm"><i className="fa-solid fa-clapperboard"></i></span>
                                        2. Kịch Bản Chi Tiết
                                    </h4>
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse min-w-[500px]">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200">
                                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase w-16 text-center">#</th>
                                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase border-l border-gray-200">Hình ảnh (Visual)</th>
                                                        <th className="p-4 text-xs font-bold text-gray-500 uppercase w-1/2 border-l border-gray-200">Âm thanh (Audio)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {remixResult.scriptTable.map((row, i) => (
                                                        <tr key={i} className="group hover:bg-gray-50 transition-colors">
                                                            <td className="p-4 text-sm font-bold text-gray-500 align-top text-center bg-gray-50/30">{row.scene}</td>
                                                            <td className="p-4 text-sm text-gray-800 align-top border-l border-gray-100">
                                                                <textarea 
                                                                    className="w-full bg-transparent border-none focus:ring-0 resize-none p-0 text-sm font-medium leading-relaxed"
                                                                    value={row.visual}
                                                                    rows={3}
                                                                    onChange={(e) => handleScriptChange(i, 'visual', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="p-4 text-sm text-gray-800 font-medium align-top bg-indigo-50/20 border-l border-gray-100">
                                                                <textarea 
                                                                    className="w-full bg-transparent border-none focus:ring-0 resize-none p-0 text-sm leading-relaxed"
                                                                    value={row.audio}
                                                                    rows={3}
                                                                    onChange={(e) => handleScriptChange(i, 'audio', e.target.value)}
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 3: VISUALS & PACKAGING (Right - 4 Cols) */}
                                <div className="md:col-span-4 space-y-6">
                                    {/* Thumbnails */}
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-sm"><i className="fa-solid fa-image"></i></span>
                                            3. Đề Xuất Thumbnail
                                        </h4>
                                        <div className="space-y-3">
                                            {remixResult.thumbnailIdeas && remixResult.thumbnailIdeas.map((thumb, i) => (
                                                <div key={i} className="bg-white p-4 rounded-xl border border-orange-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 w-16 h-16 bg-orange-50 rounded-bl-full -mr-8 -mt-8 z-0"></div>
                                                    <div className="relative z-10">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h5 className="font-bold text-gray-900 text-sm">{thumb.concept}</h5>
                                                            <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Opt {i+1}</span>
                                                        </div>
                                                        <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 mb-2">
                                                            <p className="text-xs text-gray-600 font-medium">Text: <span className="text-orange-600 font-bold uppercase">"{thumb.textOverlay}"</span></p>
                                                        </div>
                                                        <p className="text-xs text-gray-500 italic">{thumb.visualDescription}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Visual Trends */}
                                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                                         <h4 className="font-bold text-gray-900 text-sm uppercase mb-3 text-gray-500">
                                            Trend Quay Dựng
                                         </h4>
                                         <div className="flex flex-wrap gap-2">
                                             {remixResult.visualTrends.map((trend, i) => (
                                                 <span key={i} className="bg-white text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 shadow-sm">
                                                     {trend}
                                                 </span>
                                             ))}
                                         </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="pt-4 space-y-3" data-html2canvas-ignore="true">
                                        <button 
                                            onClick={handleCopy}
                                            className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2"
                                        >
                                            <i className="fa-regular fa-copy"></i> Copy Kịch Bản
                                        </button>

                                        <button 
                                            onClick={() => {
                                                setStep('input');
                                                setRemixResult(null);
                                            }}
                                            className="w-full py-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl font-bold transition-colors"
                                        >
                                            Tạo Kịch Bản Khác
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 4: REASONING (Bottom) */}
                            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-100 flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <h5 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                                        <i className="fa-solid fa-bullseye"></i> Tại sao hiệu quả?
                                    </h5>
                                    <p className="text-sm text-purple-800 leading-relaxed font-medium">
                                        {remixResult.whyItWorks}
                                    </p>
                                </div>
                                <div className="md:w-1/3 border-l border-purple-200 md:pl-6">
                                    <h5 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                                        <i className="fa-solid fa-video"></i> Lưu ý quay dựng
                                    </h5>
                                    <ul className="space-y-2">
                                        {remixResult.filmingNotes.map((note, i) => (
                                            <li key={i} className="text-sm text-indigo-800 flex gap-2">
                                                <i className="fa-solid fa-check text-indigo-500 mt-1 flex-shrink-0"></i> {note}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
