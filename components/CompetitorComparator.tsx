
import React, { useState } from 'react';
import { fetchChannelVideos, generateCompetitorAnalysis, extractUsername } from '../services/geminiService';
import { CompetitorAnalysis } from '../types';

interface CompetitorComparatorProps {
    onClose: () => void;
}

// Simple Tooltip Component
const Tooltip = ({ text, children }: { text: string, children?: React.ReactNode }) => {
    return (
        <div className="group relative inline-block">
            {children}
            <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 z-50 pointer-events-none shadow-xl">
                {text}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
            </div>
        </div>
    );
};

export const CompetitorComparator: React.FC<CompetitorComparatorProps> = ({ onClose }) => {
    const [channelA, setChannelA] = useState('');
    const [channelB, setChannelB] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<CompetitorAnalysis | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const handleCompare = async () => {
        const userA = extractUsername(channelA);
        const userB = extractUsername(channelB);

        if (!userA || !userB) {
            setError("Vui lòng nhập đúng định dạng @username cho cả 2 kênh.");
            return;
        }

        setIsAnalyzing(true);
        setError(null);

        try {
            // Fetch videos for both (Parallel)
            const [dataA, dataB] = await Promise.all([
                fetchChannelVideos(userA),
                fetchChannelVideos(userB)
            ]);

            if (dataA.videos.length < 5 || dataB.videos.length < 5) {
                throw new Error("Một trong hai kênh không đủ video công khai để phân tích.");
            }

            const result = await generateCompetitorAnalysis(userA, userB, dataA.videos, dataB.videos);
            setAnalysis(result);

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Lỗi khi so sánh. Vui lòng thử lại.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleExportPDF = () => {
        const element = document.getElementById('competitor-analysis-content');
        if (!element || !(window as any).html2pdf) {
            alert("Lỗi thư viện PDF. Vui lòng tải lại trang.");
            return;
        }

        setIsExportingPdf(true);

        const opt = {
            margin: [10, 10, 10, 10],
            filename: `Competitor_Battle_${channelA}_vs_${channelB}.pdf`,
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
                alert("Không thể xuất PDF. Vui lòng thử lại.");
            });
        }, 500);
    };

    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-6" data-html2canvas-ignore="true">
                <h2 className="text-2xl font-black text-gray-900 uppercase flex items-center gap-2">
                    <i className="fa-solid fa-chess-knight text-red-600"></i> Competitor Battle Card
                </h2>
                <div className="flex gap-2">
                    {analysis && (
                        <button 
                            onClick={handleExportPDF}
                            disabled={isExportingPdf}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                        >
                            {isExportingPdf ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-file-pdf"></i>}
                            Xuất PDF
                        </button>
                    )}
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>
            </div>

            {!analysis ? (
                <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-xl w-full text-gray-800">
                    <p className="text-center text-gray-500 mb-8 font-medium">
                        So sánh sức mạnh 2 kênh TikTok để tìm ra chiến lược chiến thắng.
                    </p>

                    <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Kênh của bạn (Channel A)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-3.5 text-gray-400"><i className="fa-solid fa-at"></i></span>
                                <input 
                                    type="text" 
                                    value={channelA}
                                    onChange={(e) => setChannelA(e.target.value)}
                                    placeholder="username_a"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none placeholder-gray-400 transition-all"
                                />
                            </div>
                        </div>

                        <div className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center font-black z-10 shrink-0 border border-orange-500 shadow-lg">
                            VS
                        </div>

                        <div className="flex-1 w-full">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Đối thủ (Channel B)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-3.5 text-gray-400"><i className="fa-solid fa-at"></i></span>
                                <input 
                                    type="text" 
                                    value={channelB}
                                    onChange={(e) => setChannelB(e.target.value)}
                                    placeholder="username_b"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none placeholder-gray-400 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-center text-sm font-bold">
                            {error}
                        </div>
                    )}

                    <button 
                        onClick={handleCompare}
                        disabled={isAnalyzing || !channelA || !channelB}
                        className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-orange-200 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {isAnalyzing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-bolt"></i>}
                        {isAnalyzing ? "Đang Quét Dữ Liệu..." : "Bắt Đầu So Sánh"}
                    </button>
                </div>
            ) : (
                <div 
                    id="competitor-analysis-content"
                    className={`bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden relative ${isExportingPdf ? 'overflow-visible h-auto' : ''}`}
                >
                    {/* Header Result */}
                    <div className="bg-slate-900 text-white p-8 text-center relative overflow-hidden print:bg-slate-900 print:text-white">
                        <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                        
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="flex justify-center items-center gap-8 md:gap-16 mb-4">
                                <div className={`text-center transition-opacity ${analysis.winner === 'B' ? 'opacity-50' : 'opacity-100'}`}>
                                    <h3 className="text-2xl md:text-3xl font-bold mb-2 text-white">@{analysis.channelA}</h3>
                                    <div className="text-4xl md:text-6xl font-black text-orange-500">{analysis.scoreA}</div>
                                </div>
                                
                                <div className="flex flex-col items-center">
                                    <span className="text-slate-500 font-bold tracking-widest text-sm mb-2">NGƯỜI CHIẾN THẮNG</span>
                                    <div className="w-16 h-16 rounded-full bg-white text-gray-900 flex items-center justify-center text-2xl font-black shadow-lg shadow-white/20">
                                        {analysis.winner === 'Draw' ? '=' : analysis.winner}
                                    </div>
                                </div>

                                <div className={`text-center transition-opacity ${analysis.winner === 'A' ? 'opacity-50' : 'opacity-100'}`}>
                                    <h3 className="text-2xl md:text-3xl font-bold mb-2 text-white">@{analysis.channelB}</h3>
                                    <div className="text-4xl md:text-6xl font-black text-blue-500">{analysis.scoreB}</div>
                                </div>
                            </div>
                            
                            <div className="flex gap-4 text-xs font-medium text-slate-400">
                                <span className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                                    <i className="fa-solid fa-video mr-1"></i> {analysis.analyzedVideoCount} Video
                                </span>
                                <span className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                                    <i className="fa-solid fa-clock mr-1"></i> {analysis.timeRange}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 grid lg:grid-cols-12 gap-8">
                        {/* LEFT COLUMN: Detailed Metrics */}
                        <div className="lg:col-span-8">
                            <h4 className="font-bold text-gray-800 mb-4 uppercase text-sm tracking-wide flex items-center gap-2">
                                <i className="fa-solid fa-chart-simple text-blue-600"></i> Phân Tích Chi Tiết 3 Lớp
                            </h4>
                            <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold border-b border-gray-200">
                                        <tr>
                                            <th className="p-4">Tiêu Chí</th>
                                            <th className="p-4 w-1/5">@{analysis.channelA}</th>
                                            <th className="p-4 w-1/5">@{analysis.channelB}</th>
                                            <th className="p-4 w-1/5 hidden md:table-cell bg-gray-100/50">TB Ngành</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm bg-white">
                                        {analysis.metrics.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4">
                                                    <Tooltip text={row.explanation}>
                                                        <div className="font-bold text-gray-800 flex items-center gap-1 cursor-help">
                                                            {row.category === 'Chiến Lược' && <i className="fa-solid fa-chess text-purple-500 mr-1"></i>}
                                                            {row.category === 'Sản Phẩm' && <i className="fa-solid fa-box text-orange-500 mr-1"></i>}
                                                            {row.category === 'Hiệu Suất' && <i className="fa-solid fa-bolt text-yellow-500 mr-1"></i>}
                                                            {row.metricName}
                                                            <i className="fa-solid fa-circle-info text-[10px] text-gray-300"></i>
                                                        </div>
                                                    </Tooltip>
                                                </td>
                                                <td className={`p-4 font-medium ${
                                                    row.winner === 'A' ? 'text-orange-600 font-bold' : 
                                                    (row.isCritical && row.winner === 'B') ? 'text-red-500 font-bold bg-red-50 rounded-lg' : 'text-gray-500'
                                                }`}>
                                                    {row.valueA}
                                                </td>
                                                <td className={`p-4 font-medium ${row.winner === 'B' ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                                                    {row.valueB}
                                                </td>
                                                <td className="p-4 text-gray-400 font-medium hidden md:table-cell bg-gray-50/50 text-xs">
                                                    {row.benchmark}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Key Findings Box */}
                            <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-6 relative">
                                <div className="absolute -top-3 left-6 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold border border-amber-200 uppercase tracking-wider">
                                    <i className="fa-solid fa-lightbulb mr-1"></i> Key Findings
                                </div>
                                <ul className="space-y-3 mt-2">
                                    {analysis.keyFindings.map((finding, i) => (
                                        <li key={i} className="flex gap-3 text-sm text-gray-800">
                                            <i className="fa-solid fa-check text-amber-600 mt-1 flex-shrink-0"></i>
                                            <span className="leading-relaxed font-medium">{finding}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: 30-Day Plan */}
                        <div className="lg:col-span-4 flex flex-col h-full">
                             <h4 className="font-bold text-gray-800 mb-4 uppercase text-sm tracking-wide flex items-center gap-2">
                                <i className="fa-solid fa-calendar-check text-green-600"></i> Kế Hoạch 30 Ngày
                             </h4>
                             
                             <div className={`bg-gray-50 p-4 rounded-2xl border border-gray-200 flex-1 custom-scrollbar ${isExportingPdf ? 'h-auto overflow-visible' : 'overflow-y-auto max-h-[600px]'}`}>
                                {analysis.todoTimeline.map((weekData, i) => (
                                    <div key={i} className="mb-6 last:mb-0 break-inside-avoid">
                                        <div className="flex items-center gap-2 mb-3 sticky top-0 bg-gray-50 py-2 z-10 print:static">
                                            <div className="bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded">Tuần {weekData.week}</div>
                                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide truncate">{weekData.focus}</div>
                                        </div>
                                        <div className="space-y-3">
                                            {weekData.tasks.map((task, j) => (
                                                <div key={j} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm break-inside-avoid">
                                                    <p className="text-sm font-bold text-gray-800 mb-1">{task.task}</p>
                                                    <div className="flex justify-between items-center text-[10px] text-gray-500 mt-2 border-t border-gray-100 pt-2">
                                                        <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">
                                                            <i className="fa-solid fa-user mr-1"></i>{task.role}
                                                        </span>
                                                        <span className="text-emerald-600 font-bold">
                                                            KPI: {task.kpi}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                             </div>
                             
                             <button 
                                onClick={() => setAnalysis(null)}
                                className="w-full mt-6 py-3 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-xl transition-colors no-print"
                                data-html2canvas-ignore="true"
                             >
                                So Sánh Cặp Khác
                             </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
