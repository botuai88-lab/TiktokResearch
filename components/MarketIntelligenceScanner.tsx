
import React, { useState } from 'react';
import { generateMarketIntelligence } from '../services/geminiService';
import { MarketIntelligenceReport } from '../types';

interface MarketIntelligenceScannerProps {
    onClose: () => void;
}

export const MarketIntelligenceScanner: React.FC<MarketIntelligenceScannerProps> = ({ onClose }) => {
    const [topic, setTopic] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [report, setReport] = useState<MarketIntelligenceReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const handleScan = async () => {
        if (!topic.trim()) return;
        setIsScanning(true);
        setError(null);
        setReport(null);

        try {
            const result = await generateMarketIntelligence(topic);
            setReport(result);
        } catch (err: any) {
            setError(err.message || "Lỗi khi quét thị trường.");
        } finally {
            setIsScanning(false);
        }
    };

    const handleExportPDF = () => {
        const element = document.getElementById('market-intel-content');
        if (!element || !(window as any).html2pdf) return;
        setIsExportingPdf(true);
        const opt = {
            margin: [10, 10, 10, 10],
            filename: `Market_Intel_${topic.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        setTimeout(() => {
            (window as any).html2pdf().set(opt).from(element).save().then(() => setIsExportingPdf(false));
        }, 500);
    };

    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200">
                        <i className="fa-solid fa-magnifying-glass-chart text-3xl"></i>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-black text-gray-900 uppercase leading-none tracking-tight">Market Intelligence Scanner</h2>
                            <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase border border-blue-200">Expert Edition</span>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">Báo cáo tình báo chiến lược & Giải mã tâm lý khách hàng</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {report && (
                        <button onClick={handleExportPDF} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm">
                            <i className="fa-solid fa-file-pdf text-red-500"></i> Xuất Báo Cáo
                        </button>
                    )}
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>
            </div>

            {!report ? (
                <div className="bg-white rounded-[2.5rem] p-12 border border-gray-100 shadow-2xl w-full text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 rounded-full blur-[100px] -mr-40 -mt-40 opacity-70"></div>
                    <div className="max-w-2xl mx-auto relative z-10">
                        <h3 className="text-4xl font-black text-gray-900 mb-12">Trạm Phân Tích Thị Trường</h3>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                <i className="fa-solid fa-lightbulb text-gray-400 group-focus-within:text-blue-500 transition-colors text-xl"></i>
                            </div>
                            <input 
                                type="text" 
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                                placeholder="Nhập ngách (VD: Chăm sóc da dầu, Robot hút bụi...)"
                                className="w-full pl-14 pr-44 py-7 bg-gray-50 border-2 border-gray-100 rounded-3xl font-bold text-xl focus:bg-white focus:border-blue-600 focus:ring-8 focus:ring-blue-50 transition-all outline-none shadow-inner"
                            />
                            <button 
                                onClick={handleScan}
                                disabled={!topic || isScanning}
                                className="absolute right-3 top-3 h-16 px-10 rounded-2xl font-black text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center gap-3"
                            >
                                {isScanning ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-radar"></i>}
                                {isScanning ? "Đang Phân Tích..." : "Quét Thị Trường"}
                            </button>
                        </div>
                        <div className="mt-8 flex justify-center gap-6 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                            <span className="flex items-center gap-2"><i className="fa-solid fa-circle-check text-green-500"></i> Thinking 32K</span>
                            <span className="flex items-center gap-2"><i className="fa-solid fa-circle-check text-green-500"></i> Keyword Frequency</span>
                            <span className="flex items-center gap-2"><i className="fa-solid fa-circle-check text-green-500"></i> Behavioral Audit</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div id="market-intel-content" className="space-y-10 bg-[#F8FAFC] p-4 lg:p-10 rounded-[3rem] border border-gray-200 shadow-2xl">
                    
                    {/* Header Summary */}
                    <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 px-6 py-2 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-bl-2xl shadow-lg">Strategic Dashboard</div>
                        <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
                            <div className="flex-1">
                                <span className="text-blue-600 font-black uppercase tracking-widest text-xs mb-3 block">Chủ đề nghiên cứu</span>
                                <h1 className="text-5xl font-black text-gray-900 mb-6 leading-tight uppercase tracking-tighter">{report.topic}</h1>
                                <p className="text-lg text-gray-600 leading-relaxed font-medium max-w-3xl">{report.executiveSummary}</p>
                            </div>
                            <div className="lg:w-72 space-y-4">
                                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                    <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Độ chín thị trường</span>
                                    <span className="text-2xl font-black text-blue-600">{report.marketMaturity}</span>
                                </div>
                                <div className="bg-blue-600 p-6 rounded-3xl shadow-xl shadow-blue-100">
                                    <span className="text-[10px] font-black text-blue-200 uppercase block mb-1">Nghịch lý trọng tâm (Paradox)</span>
                                    <p className="text-white font-bold text-sm leading-snug">"{report.marketParadox}"</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* NEW SECTION: KEYWORD FREQUENCY ANALYTICS */}
                    <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm break-inside-avoid">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-lg"><i className="fa-solid fa-tags"></i></span>
                                    Tiếng nói Thị trường (Keyword Frequency)
                                </h3>
                                <p className="text-sm text-gray-500 font-medium mt-1">Phân tích từ mật độ hàng nghìn lượt thảo luận của khách hàng</p>
                            </div>
                            <span className="text-[11px] font-black text-gray-400 uppercase bg-gray-50 px-3 py-1 rounded-full border border-gray-100">Dữ liệu thời gian thực</span>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {report.topKeywords.map((kw, idx) => (
                                <div key={idx} className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 flex flex-col justify-between group hover:bg-white hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="font-black text-gray-900 text-base">#{kw.word}</h4>
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                                            kw.sentiment === 'Tích cực' ? 'bg-green-50 text-green-700 border-green-200' :
                                            kw.sentiment === 'Tiêu cực' ? 'bg-red-50 text-red-700 border-red-200' :
                                            'bg-gray-100 text-gray-700 border-gray-300'
                                        }`}>
                                            {kw.sentiment}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                            <span className="text-gray-400">Tần suất</span>
                                            <span className="text-blue-600">{kw.frequency}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ${
                                                    kw.sentiment === 'Tiêu cực' ? 'bg-red-500' : 
                                                    kw.sentiment === 'Tích cực' ? 'bg-emerald-500' : 
                                                    'bg-blue-600'
                                                }`}
                                                style={{ width: `${kw.frequency}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-12 gap-8">
                        {/* LEFT: Persona & Behavior (8 Cols) */}
                        <div className="lg:col-span-8 space-y-8">
                            
                            {/* Personas */}
                            <div className="break-inside-avoid">
                                <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center text-lg"><i className="fa-solid fa-user-group"></i></span>
                                    Chân dung Khách hàng (Deep Personas)
                                </h3>
                                <div className="grid md:grid-cols-2 gap-6">
                                    {report.personas.map((p, idx) => (
                                        <div key={idx} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">{idx === 0 ? '👔' : idx === 1 ? '👩‍🎨' : '🧠'}</div>
                                                <div>
                                                    <h4 className="font-black text-xl text-gray-900 leading-tight">{p.name}</h4>
                                                    <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-full">{p.contentPreference}</span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-600 font-medium leading-relaxed mb-6 italic">"{p.description}"</p>
                                            <div className="space-y-4">
                                                <div className="bg-gray-50 p-4 rounded-2xl">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase block mb-2">Động cơ mua hàng</span>
                                                    <div className="flex flex-wrap gap-2">
                                                        {p.buyingMotives.map((m, i) => <span key={i} className="text-xs bg-white px-2 py-1 rounded-lg border border-gray-200 font-bold text-gray-700"># {m}</span>)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-black text-red-400 uppercase block mb-2">Nỗi lo sợ thầm kín</span>
                                                    <ul className="space-y-1.5">
                                                        {p.mainConcerns.map((c, i) => <li key={i} className="text-xs text-gray-800 font-bold flex gap-2"><i className="fa-solid fa-circle-exclamation text-red-400 mt-1"></i> {c}</li>)}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Behavioral Audit */}
                            <div className="bg-gray-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden break-inside-avoid">
                                <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] -mr-20 -mb-20"></div>
                                <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
                                    <i className="fa-solid fa-brain text-blue-500"></i> Giải mã Hành vi & Tâm lý (Audit)
                                </h3>
                                <div className="grid md:grid-cols-3 gap-8">
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Triggers (Điểm chạm)</span>
                                        <p className="text-gray-300 text-sm leading-relaxed font-medium">{report.behavioralAnalysis.trigger}</p>
                                    </div>
                                    <div className="space-y-3 border-l border-white/10 pl-8">
                                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Barriers (Rào cản)</span>
                                        <p className="text-gray-300 text-sm leading-relaxed font-medium">{report.behavioralAnalysis.barrier}</p>
                                    </div>
                                    <div className="space-y-3 border-l border-white/10 pl-8">
                                        <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Trust Factor (Niềm tin)</span>
                                        <p className="text-gray-300 text-sm leading-relaxed font-medium">{report.behavioralAnalysis.trustFactor}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Strategic Ops (4 Cols) */}
                        <div className="lg:col-span-4 space-y-8">
                            
                            {/* Content Gaps */}
                            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm break-inside-avoid">
                                <h4 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-tight">
                                    <i className="fa-solid fa-star text-amber-500"></i> Cơ hội nội dung
                                </h4>
                                <div className="space-y-6">
                                    {report.contentGap.map((gap, i) => (
                                        <div key={i} className="relative pl-6 border-l-2 border-blue-500 pb-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <h5 className="font-black text-gray-900 text-base">{gap.opportunity}</h5>
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${gap.difficulty === 'Dễ' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>{gap.difficulty}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 font-medium leading-relaxed">{gap.reasoning}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Proposed USPs */}
                            <div className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-200 break-inside-avoid">
                                <h4 className="text-lg font-black mb-6 flex items-center gap-2 uppercase tracking-tight">
                                    <i className="fa-solid fa-wand-magic-sparkles text-blue-200"></i> Góc bán hàng (USP)
                                </h4>
                                <div className="space-y-6">
                                    {report.uspProposed.map((usp, i) => (
                                        <div key={i} className="bg-white/10 p-5 rounded-2xl border border-white/10 hover:bg-white/20 transition-colors">
                                            <h5 className="font-black text-white text-base mb-1">{usp.angle}</h5>
                                            <p className="text-blue-100 text-xs mb-3 font-medium">{usp.explanation}</p>
                                            <div className="bg-black/20 p-3 rounded-xl border border-white/5 italic text-xs text-blue-50 font-bold">
                                                Hook: "{usp.hookSample}"
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Roadmap */}
                            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm break-inside-avoid">
                                <h4 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-tight">
                                    <i className="fa-solid fa-route text-blue-600"></i> Action Roadmap
                                </h4>
                                <div className="space-y-4">
                                    {report.actionRoadmap.map((step, i) => (
                                        <div key={i} className="flex gap-4">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm flex-shrink-0">{i+1}</div>
                                            <p className="text-sm text-gray-800 font-bold leading-snug pt-1.5">{step}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-center pt-8 border-t border-gray-200">
                        <button onClick={() => setReport(null)} className="px-12 py-5 bg-gray-900 text-white font-black rounded-2xl hover:scale-105 transition-all shadow-xl shadow-gray-200 flex items-center gap-3 mx-auto">
                            <i className="fa-solid fa-rotate-left"></i> Nghiên cứu ngách khác
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
