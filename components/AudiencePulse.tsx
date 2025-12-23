
import React, { useState } from 'react';
import { generateAudiencePulse } from '../services/geminiService';
import { AudienceInsight } from '../types';

interface AudiencePulseProps {
    onClose: () => void;
}

export const AudiencePulse: React.FC<AudiencePulseProps> = ({ onClose }) => {
    const [topic, setTopic] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [insight, setInsight] = useState<AudienceInsight | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const handleAnalyze = async () => {
        if (!topic.trim()) return;
        setIsAnalyzing(true);
        setError(null);
        setInsight(null);

        try {
            const result = await generateAudiencePulse(topic);
            if (!result.topic) result.topic = topic; 
            setInsight(result);
        } catch (err: any) {
            setError(err.message || "Không thể phân tích đối tượng lúc này.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleExportPDF = () => {
        const element = document.getElementById('audience-pulse-content');
        if (!element || !(window as any).html2pdf) {
            alert("Lỗi thư viện PDF. Vui lòng tải lại trang.");
            return;
        }

        setIsExportingPdf(true);

        const opt = {
            margin: [10, 10, 10, 10],
            filename: `Audience_Deep_Research_${topic.replace(/\s+/g, '_')}.pdf`,
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
            <div className="flex justify-between items-center mb-8" data-html2canvas-ignore="true">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm relative overflow-hidden group">
                        <div className="absolute inset-0 bg-indigo-200 group-hover:animate-ping opacity-20"></div>
                        <i className="fa-solid fa-microscope text-2xl relative z-10"></i>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-black text-gray-900 uppercase leading-none">Audience Deep Pulse</h2>
                            <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter animate-pulse">Pro Engine</span>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">Nghiên cứu sâu Tâm lý & Hành vi khách hàng</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {insight && (
                        <button 
                            onClick={handleExportPDF} 
                            disabled={isExportingPdf}
                            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-sm flex items-center gap-2"
                        >
                            {isExportingPdf ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-file-pdf"></i>}
                            Xuất PDF
                        </button>
                    )}
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>
            </div>

            {!insight ? (
                <div className="bg-white rounded-[2rem] p-10 border border-gray-200 shadow-xl w-full text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -z-0 opacity-50"></div>
                    
                    <div className="relative z-10">
                        <h3 className="text-3xl font-black text-gray-900 mb-8">Deep Research Audience</h3>
                        
                        <div className="relative max-w-2xl mx-auto mb-8 group">
                             <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                 <i className="fa-solid fa-brain text-gray-400 text-xl group-focus-within:text-indigo-500 transition-colors"></i>
                             </div>
                             <input 
                                 type="text" 
                                 value={topic}
                                 onChange={(e) => setTopic(e.target.value)}
                                 onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                                 placeholder="VD: Kem chống nắng cho da dầu, Robot hút bụi cao cấp..."
                                 className="w-full pl-14 pr-6 py-6 bg-gray-50 border-2 border-gray-100 rounded-3xl font-bold text-xl text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-8 focus:ring-indigo-50 transition-all outline-none placeholder-gray-400 shadow-inner"
                             />
                             <div className="absolute inset-y-0 right-2 flex items-center">
                                <button 
                                    onClick={handleAnalyze}
                                    disabled={!topic || isAnalyzing}
                                    className={`h-14 px-8 rounded-2xl font-black text-white shadow-xl transition-all flex items-center gap-2 ${
                                        !topic || isAnalyzing 
                                        ? 'bg-gray-300 cursor-not-allowed' 
                                        : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 active:scale-95 shadow-indigo-200'
                                    }`}
                                >
                                    {isAnalyzing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-atom animate-spin-slow"></i>}
                                    {isAnalyzing ? "Đang Deep Research..." : "Nghiên cứu Pro"}
                                </button>
                             </div>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                            <span className="flex items-center gap-1"><i className="fa-solid fa-check text-green-500"></i> Thinking 32K</span>
                            <span className="flex items-center gap-1"><i className="fa-solid fa-check text-green-500"></i> Buyer Persona</span>
                            <span className="flex items-center gap-1"><i className="fa-solid fa-check text-green-500"></i> Market Gap Analysis</span>
                        </div>
                    </div>
                    {error && <p className="text-red-500 font-bold bg-red-50 py-2 px-4 rounded-lg mt-8 inline-block border border-red-200">{error}</p>}
                </div>
            ) : (
                <div 
                    id="audience-pulse-content"
                    className={`space-y-10 bg-white p-6 rounded-3xl ${isExportingPdf ? 'overflow-visible h-auto' : ''}`}
                >
                    <div className="text-center border-b border-gray-100 pb-8 mb-6">
                        <span className="bg-indigo-50 text-indigo-700 text-xs font-black px-4 py-1 rounded-full uppercase tracking-widest mb-4 inline-block border border-indigo-100">Deep Research Report</span>
                        <h1 className="text-5xl font-black text-gray-900 leading-tight">
                            Chủ đề: <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">{insight.topic}</span>
                        </h1>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-emerald-50 rounded-[2rem] p-8 border border-emerald-100 shadow-sm relative overflow-hidden group">
                            <h4 className="text-emerald-800 font-black text-sm uppercase mb-4 flex items-center gap-2">
                                <i className="fa-solid fa-bolt-lightning text-emerald-500"></i> Cơ Hội Bùng Nổ
                            </h4>
                            <p className="text-emerald-900 font-bold text-xl leading-snug">{insight.summary?.topOpportunity || 'N/A'}</p>
                        </div>
                        <div className="bg-red-50 rounded-[2rem] p-8 border border-red-100 shadow-sm relative overflow-hidden group">
                            <h4 className="text-red-800 font-black text-sm uppercase mb-4 flex items-center gap-2">
                                <i className="fa-solid fa-shield-virus text-red-500"></i> Rào Cản Thị Trường
                            </h4>
                            <p className="text-red-900 font-bold text-xl leading-snug">{insight.summary?.criticalWarning || 'N/A'}</p>
                        </div>
                        <div className="bg-indigo-50 rounded-[2rem] p-8 border border-indigo-100 shadow-sm relative overflow-hidden group">
                            <h4 className="text-indigo-800 font-black text-sm uppercase mb-4 flex items-center gap-2">
                                <i className="fa-solid fa-anchor text-indigo-500"></i> Lợi Thế Cạnh Tranh
                            </h4>
                            <p className="text-indigo-900 font-bold text-xl leading-snug">{insight.summary?.keyStrength || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="break-inside-avoid">
                        <h3 className="text-3xl font-black text-gray-900 mb-8 flex items-center gap-4">
                            <span className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center text-xl shadow-lg"><i className="fa-solid fa-user-gear"></i></span>
                            Cấu trúc Chân dung Khách hàng (Deep Personas)
                        </h3>
                        <div className="grid lg:grid-cols-2 gap-8">
                            {insight.personas?.map((persona, idx) => (
                                <div key={idx} className="bg-white rounded-[2.5rem] border border-gray-200 shadow-xl overflow-hidden flex flex-col hover:border-indigo-400 transition-all duration-500 break-inside-avoid group">
                                    <div className="bg-gray-50 p-8 border-b border-gray-100 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/50 rounded-full blur-3xl -mr-10 -mt-10"></div>
                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                            <div className="flex items-center gap-5">
                                                <div className="w-20 h-20 rounded-[1.5rem] bg-white border-4 border-white shadow-xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                                                    {idx === 0 ? '👔' : idx === 1 ? '🎨' : '🧠'}
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-2xl text-gray-900 leading-none mb-2">{persona.name}</h4>
                                                    <div className="flex gap-2">
                                                        <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase">{persona.ageRange}</span>
                                                        <span className="text-[10px] font-black bg-white text-gray-600 px-2 py-0.5 rounded-full uppercase border border-gray-200">Quan tâm: {persona.interestScore}/10</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-4xl font-black text-indigo-600">{persona.percentage}%</span>
                                            </div>
                                        </div>
                                        <p className="text-gray-600 text-sm italic font-medium leading-relaxed">"{persona.description}"</p>
                                    </div>

                                    <div className="p-8 flex-1 space-y-8">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-red-50/30 p-4 rounded-2xl border border-red-100/50">
                                                <h5 className="text-[10px] font-black text-red-800 uppercase mb-2">Pain Points (Nỗi đau)</h5>
                                                <ul className="space-y-1">
                                                    {persona.painPoints.slice(0,3).map((p, i) => <li key={i} className="text-xs text-red-900 font-bold leading-tight">• {p}</li>)}
                                                </ul>
                                            </div>
                                            <div className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/50">
                                                <h5 className="text-[10px] font-black text-emerald-800 uppercase mb-2">Triggers (Động cơ)</h5>
                                                <ul className="space-y-1">
                                                    {persona.buyingTriggers.slice(0,3).map((t, i) => <li key={i} className="text-xs text-emerald-900 font-bold leading-tight">• {t}</li>)}
                                                </ul>
                                            </div>
                                        </div>

                                        <div>
                                            <h5 className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">Hành trình trải nghiệm khách hàng</h5>
                                            <div className="flex gap-2">
                                                <div className="flex-1 bg-slate-100 rounded-2xl p-3 border border-slate-200 hover:bg-white transition-colors cursor-default">
                                                    <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Awareness</span>
                                                    <p className="text-[10px] text-slate-800 font-bold leading-tight">{persona.journey?.awareness || 'N/A'}</p>
                                                </div>
                                                <div className="flex-1 bg-slate-200 rounded-2xl p-3 border border-slate-300 hover:bg-white transition-colors cursor-default">
                                                    <span className="text-[9px] font-black text-slate-600 uppercase block mb-1">Consider</span>
                                                    <p className="text-[10px] text-slate-900 font-bold leading-tight">{persona.journey?.consideration || 'N/A'}</p>
                                                </div>
                                                <div className="flex-1 bg-indigo-600 rounded-2xl p-3 border border-indigo-700 hover:scale-105 transition-all cursor-default shadow-lg shadow-indigo-200">
                                                    <span className="text-[9px] font-black text-indigo-200 uppercase block mb-1">Decision</span>
                                                    <p className="text-[10px] text-white font-bold leading-tight">{persona.journey?.decision || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-br from-indigo-50 to-white rounded-3xl p-6 border border-indigo-100 shadow-inner group-hover:shadow-md transition-shadow">
                                            <h5 className="text-sm font-black text-indigo-900 uppercase mb-4 flex items-center gap-2">
                                                <i className="fa-solid fa-chess-knight"></i> Master Content Strategy
                                            </h5>
                                            <div className="space-y-4">
                                                <div>
                                                    <span className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Hook "Thôi miên"</span>
                                                    <p className="text-sm text-indigo-900 font-black italic">"{persona.strategy?.hook}"</p>
                                                </div>
                                                <div className="flex justify-between items-center pt-3 border-t border-indigo-100">
                                                    <div>
                                                        <span className="text-[9px] font-black text-gray-400 uppercase block">Định dạng</span>
                                                        <span className="text-xs text-gray-900 font-black">{persona.strategy?.format}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase block">Giờ vàng</span>
                                                        <span className="text-xs text-indigo-600 font-black">{persona.strategy?.postingTime}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="break-inside-avoid">
                        <h3 className="text-3xl font-black text-gray-900 mb-8 flex items-center gap-4">
                            <span className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center text-xl shadow-lg shadow-orange-200"><i className="fa-solid fa-magnifying-glass-chart"></i></span>
                            Khoảng Trống Thị Trường (Content Gaps)
                        </h3>
                        <div className="bg-white border-2 border-gray-100 rounded-[2.5rem] overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest">
                                    <tr>
                                        <th className="p-6">Chủ đề Tiềm Năng</th>
                                        <th className="p-6 text-center w-32">Nhu Cầu</th>
                                        <th className="p-6 text-center w-32">Tiềm Năng</th>
                                        <th className="p-6">Chiến Thuật Tiếp Cận</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-gray-50">
                                    {insight.contentGaps?.map((gap, i) => (
                                        <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="p-6">
                                                <p className="font-black text-gray-900 text-lg">{gap.topic}</p>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${gap.competitionLevel === 'Low' ? 'bg-green-100 text-green-700' : gap.competitionLevel === 'Medium' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>Cạnh tranh: {gap.competitionLevel}</span>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="w-12 h-12 rounded-full border-4 border-gray-100 flex items-center justify-center mx-auto">
                                                    <span className="font-black text-gray-900">{gap.demandLevel}</span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-orange-500 to-red-600">{gap.opportunityScore}</span>
                                            </td>
                                            <td className="p-6 text-sm text-gray-700 font-bold leading-relaxed border-l border-gray-50">
                                                <i className="fa-solid fa-quote-left text-orange-300 mr-2"></i>
                                                {gap.suggestion}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-gray-950 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl break-inside-avoid">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] -mr-40 -mt-40"></div>
                        <div className="relative z-10">
                            <h3 className="text-3xl font-black mb-10 flex items-center gap-4">
                                <i className="fa-solid fa-calendar-days text-indigo-500"></i>
                                Content Roadmap 30 Ngày (Advanced)
                            </h3>
                            <div className="grid md:grid-cols-4 gap-6">
                                {insight.contentCalendar30Days?.map((week, i) => (
                                    <div key={i} className="bg-white/5 rounded-[2rem] p-6 border border-white/10 hover:bg-white/10 transition-colors">
                                        <span className="text-[10px] font-black bg-indigo-600 px-3 py-1 rounded-full text-white mb-6 inline-block uppercase tracking-widest">Tuần {week.week}</span>
                                        <h5 className="font-black text-white mb-4 text-sm uppercase tracking-tight h-10 line-clamp-2">{week.focus}</h5>
                                        <ul className="space-y-3">
                                            {week.ideas?.map((idea, j) => (
                                                <li key={j} className="text-xs text-gray-400 leading-relaxed flex gap-2">
                                                    <span className="text-indigo-500 font-black">•</span>
                                                    <span>{idea}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="text-center pt-12 no-print">
                         <button 
                            onClick={() => setInsight(null)}
                            className="px-10 py-5 bg-white border-2 border-gray-200 text-gray-900 font-black rounded-[2rem] hover:bg-gray-50 hover:border-indigo-500 transition-all shadow-xl hover:shadow-indigo-100 flex items-center gap-3 mx-auto uppercase tracking-tighter"
                        >
                            <i className="fa-solid fa-rotate-left"></i> Nghiên cứu chủ đề khác
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
