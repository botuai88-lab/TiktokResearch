
import React, { useState } from 'react';
import { generateKOCAudit } from '../services/geminiService';
import { KOCAuditReport } from '../types';

interface KOCQualityAuditProps {
    onClose: () => void;
}

export const KOCQualityAudit: React.FC<KOCQualityAuditProps> = ({ onClose }) => {
    const [kocLink, setKocLink] = useState('');
    const [isAuditing, setIsAuditing] = useState(false);
    const [auditStep, setAuditStep] = useState('');
    const [report, setReport] = useState<KOCAuditReport | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAudit = async () => {
        if (!kocLink.trim()) return;
        setIsAuditing(true);
        setError(null);
        setReport(null);
        setAuditStep("Khởi tạo hệ thống audit...");

        try {
            // Extract username if it's a link
            const username = kocLink.includes('tiktok.com') 
                ? (kocLink.match(/@([a-zA-Z0-9_.-]+)/)?.[1] || kocLink) 
                : kocLink.replace('@', '');
            
            const result = await generateKOCAudit(username, (step) => setAuditStep(step));
            setReport(result);
        } catch (err: any) {
            setError(err.message || "Lỗi khi thẩm định KOC.");
        } finally {
            setIsAuditing(false);
            setAuditStep('');
        }
    };

    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                        <i className="fa-solid fa-user-check text-2xl"></i>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase leading-none">KOC Deep Audit & Fraud Detector</h2>
                        <p className="text-sm text-gray-500 font-medium">Thẩm định KOC - Chống Seeding & Follow ảo</p>
                    </div>
                </div>
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors">
                    <i className="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            {!report ? (
                <div className="bg-white rounded-[2rem] p-10 border border-gray-200 shadow-xl w-full text-center">
                    <div className="max-w-xl mx-auto">
                        <h3 className="text-3xl font-black text-gray-900 mb-4">Quality Auditor Pro</h3>
                        <p className="text-gray-500 mb-10 text-lg">
                            Bảo vệ ngân sách booking. AI sẽ soi kỹ từng comment, ngôn ngữ fan để vạch trần Seeding ảo.
                        </p>
                        <div className="flex flex-col gap-4">
                            <input 
                                type="text" 
                                value={kocLink}
                                onChange={(e) => setKocLink(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAudit()}
                                placeholder="Nhập @username hoặc dán link kênh KOC..."
                                className="w-full px-6 py-5 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-lg focus:bg-white focus:border-emerald-500 transition-all outline-none"
                            />
                            <button 
                                onClick={handleAudit}
                                disabled={!kocLink || isAuditing}
                                className="w-full py-5 rounded-2xl font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3"
                            >
                                {isAuditing ? <><i className="fa-solid fa-circle-notch fa-spin"></i> {auditStep}</> : "Thẩm Định Kênh"}
                            </button>
                        </div>
                    </div>
                    {error && <p className="text-red-500 mt-6 font-bold bg-red-50 p-4 rounded-xl border border-red-100">{error}</p>}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden">
                    <div className={`p-8 flex justify-between items-center text-white ${report.verdict === 'Recommended' ? 'bg-emerald-600' : report.verdict === 'Caution' ? 'bg-amber-500' : 'bg-red-600'}`}>
                        <div>
                            <span className="text-xs font-black uppercase tracking-widest opacity-80">Kết luận audit</span>
                            <h3 className="text-3xl font-black">
                                {report.verdict === 'Recommended' ? '✅ NÊN BOOKING' : report.verdict === 'Caution' ? '⚠️ CÂN NHẮC KỸ' : '❌ KHÔNG NÊN BOOK'}
                            </h3>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-black uppercase tracking-widest opacity-80">Chất lượng fan</div>
                            <div className="text-5xl font-black">{report.audienceQualityScore}<span className="text-xl opacity-60">/100</span></div>
                        </div>
                    </div>

                    <div className="p-8 grid md:grid-cols-12 gap-8">
                        <div className="md:col-span-4 space-y-6">
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                                <h4 className="text-xs font-black text-gray-500 uppercase mb-4">Fraud Detection</h4>
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-bold text-gray-700">Tỷ lệ Seeding ước tính:</span>
                                    <span className={`text-2xl font-black ${parseInt(report.seedingRate) > 20 ? 'text-red-600' : 'text-emerald-600'}`}>{report.seedingRate}</span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                                    <div className={`h-2 rounded-full ${parseInt(report.seedingRate) > 20 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{width: report.seedingRate}}></div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                                <h4 className="text-xs font-black text-gray-500 uppercase mb-4">Audience Persona</h4>
                                <div className="space-y-2">
                                    <p className="text-sm font-bold text-gray-800">Độ tuổi: <span className="text-gray-600 font-medium">{report.audiencePersona.age}</span></p>
                                    <p className="text-sm font-bold text-gray-800">Giới tính: <span className="text-gray-600 font-medium">{report.audiencePersona.gender}</span></p>
                                    <p className="text-sm font-bold text-gray-800">Sức mua: <span className="text-gray-600 font-medium">{report.audiencePersona.buyingPower}</span></p>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-8 space-y-6">
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                <h4 className="text-xs font-black text-gray-500 uppercase mb-3">Phân tích chuyên gia</h4>
                                <p className="text-gray-800 font-medium leading-relaxed">{report.verdictReason}</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                                    <h4 className="text-xs font-black text-red-800 uppercase mb-3">Red Flags (Cảnh báo)</h4>
                                    <ul className="space-y-2">
                                        {report.brandSafety.warnings.map((w, i) => (
                                            <li key={i} className="text-sm text-red-900 font-bold flex gap-2">
                                                <i className="fa-solid fa-triangle-exclamation text-red-500 mt-1"></i> {w}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                                    <h4 className="text-xs font-black text-emerald-800 uppercase mb-3">Phù hợp ngành hàng</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {report.commercialFit.map((f, i) => (
                                            <span key={i} className="bg-white text-emerald-800 px-3 py-1 rounded-lg text-xs font-black border border-emerald-200 shadow-sm">{f}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 border-t border-gray-100 text-center">
                        <button onClick={() => setReport(null)} className="px-8 py-3 bg-gray-100 text-gray-600 font-black rounded-xl hover:bg-gray-200">Kiểm tra KOC khác</button>
                    </div>
                </div>
            )}
        </div>
    );
};
