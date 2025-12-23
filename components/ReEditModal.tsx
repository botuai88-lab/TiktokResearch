
import React, { useState, useEffect } from 'react';
import { ContentAnalysis, ScriptItem, ReEditResult } from '../types';
import { reEditVideoScript } from '../services/geminiService';

interface ReEditModalProps {
    analysis: ContentAnalysis;
    onClose: () => void;
    onSave?: (result: ReEditResult) => void;
}

export const ReEditModal: React.FC<ReEditModalProps> = ({ analysis, onClose, onSave }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [result, setResult] = useState<ReEditResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    useEffect(() => {
        const execute = async () => {
            if (analysis.reEditedScript) {
                setResult(analysis.reEditedScript);
                setIsLoading(false);
                return;
            }

            if (!analysis.scriptTable || analysis.scriptTable.length === 0) {
                setError("Không tìm thấy dữ liệu kịch bản gốc để xào lại. Vui lòng thử video khác.");
                setIsLoading(false);
                return;
            }

            try {
                const data = await reEditVideoScript(analysis.scriptTable);
                setResult(data);
                if (onSave) onSave(data);
            } catch (err: any) {
                setError(err.message || "Lỗi khi xử lý.");
            } finally {
                setIsLoading(false);
            }
        };
        execute();
    }, [analysis]);

    const handleCopy = () => {
        if (!result) return;
        const text = result.script.map(s => `[${s.scene}]\nVisual: ${s.visual}\nAudio: ${s.audio}`).join('\n---\n');
        navigator.clipboard.writeText(text);
        alert("Đã copy kịch bản mới!");
    };

    // Export PDF Logic
    const handleExportPDF = () => {
        const element = document.getElementById('re-edit-content');
        if (!element || !(window as any).html2pdf) {
            alert("Lỗi thư viện PDF. Vui lòng tải lại trang.");
            return;
        }

        setIsExportingPdf(true);

        const opt = {
            margin: [10, 10, 10, 10],
            filename: `ReEdit_Script_${Date.now()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Delay slighty to allow state update to remove overflow:hidden
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

    const handleScriptChange = (index: number, field: keyof ScriptItem, value: string) => {
        if (!result) return;
        const newScript = [...result.script];
        newScript[index] = { ...newScript[index], [field]: value };
        
        const updatedResult = { ...result, script: newScript };
        setResult(updatedResult);
        if (onSave) onSave(updatedResult);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className={`bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${isExportingPdf ? 'h-auto overflow-visible' : 'max-h-[90vh]'}`}>
                
                {/* Header */}
                <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-indigo-50" data-html2canvas-ignore="true">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-lg shadow-lg">
                             <i className="fa-solid fa-scissors"></i>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Xào Lại Video (Re-Edit)</h3>
                            <p className="text-xs text-indigo-700 font-medium">Tối ưu retention từ source cũ</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {result && (
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

                {/* Content - Wrapped with ID for PDF */}
                <div 
                    id="re-edit-content"
                    className={`flex-1 p-8 bg-white ${isExportingPdf ? 'overflow-visible h-auto' : 'overflow-y-auto custom-scrollbar'}`}
                >
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64" data-html2canvas-ignore="true">
                            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-500 font-medium animate-pulse">AI đang cắt ghép lại video của bạn...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center p-8 text-red-500 bg-red-50 rounded-xl border border-red-100" data-html2canvas-ignore="true">
                            <i className="fa-solid fa-triangle-exclamation text-3xl mb-2"></i>
                            <p>{error}</p>
                        </div>
                    ) : result ? (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4">
                            {/* Reasoning Box */}
                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
                                <h4 className="text-indigo-900 font-bold mb-2 flex items-center gap-2">
                                    <i className="fa-solid fa-brain"></i> Tại sao thay đổi thế này?
                                </h4>
                                <p className="text-indigo-800 text-sm leading-relaxed">{result.reasoning}</p>
                            </div>

                            {/* Script Table (EDITABLE) */}
                            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 font-bold text-gray-700 text-sm uppercase tracking-wide">
                                    Kịch Bản Mới
                                </div>
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase font-bold">
                                        <tr>
                                            <th className="p-4 w-20 text-center">Scene</th>
                                            <th className="p-4 border-l border-gray-200">Hình ảnh (Visual)</th>
                                            <th className="p-4 border-l border-gray-200">Âm thanh (Audio)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {result.script.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                                                <td className="p-4 text-center font-bold text-gray-400 bg-gray-50/50">{row.scene}</td>
                                                <td className="p-4 border-l border-gray-100 text-gray-800">
                                                    <textarea 
                                                        className="w-full bg-transparent border-none focus:ring-0 resize-none p-0 text-sm font-medium"
                                                        value={row.visual}
                                                        rows={2}
                                                        onChange={(e) => handleScriptChange(idx, 'visual', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-4 border-l border-gray-100 text-gray-700 font-mono text-xs bg-gray-50/30">
                                                    <textarea 
                                                        className="w-full bg-transparent border-none focus:ring-0 resize-none p-0 text-xs font-mono"
                                                        value={row.audio}
                                                        rows={2}
                                                        onChange={(e) => handleScriptChange(idx, 'audio', e.target.value)}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                {!isLoading && !error && (
                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3" data-html2canvas-ignore="true">
                        <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors">Đóng</button>
                        <button onClick={handleCopy} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-transform active:scale-95 flex items-center gap-2">
                            <i className="fa-regular fa-copy"></i> Copy Kịch Bản Mới
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
