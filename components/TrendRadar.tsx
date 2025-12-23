
import React, { useState } from 'react';
import { analyzeNicheTrends } from '../services/geminiService';
import { TrendReport, TikTokVideo } from '../types';
import { VideoPlayerModal } from './VideoPlayerModal';

interface TrendRadarProps {
    onClose: () => void;
    onAnalyze: (video: TikTokVideo) => void;
}

const NICHES = [
    { id: 'MomBaby', name: 'Mẹ & Bé', icon: 'fa-person-breastfeeding' },
    { id: 'FeminineHygiene', name: 'Vệ Sinh Phụ Nữ', icon: 'fa-spa' },
    { id: 'Health', name: 'Sức Khỏe', icon: 'fa-heart-pulse' },
    { id: 'BabyCare', name: 'Chăm Sóc Bé', icon: 'fa-baby' },
    { id: 'Beauty', name: 'Làm Đẹp & Skincare', icon: 'fa-sparkles' },
    { id: 'Fashion', name: 'Thời Trang', icon: 'fa-shirt' },
    { id: 'Food', name: 'Ẩm Thực (F&B)', icon: 'fa-utensils' },
    { id: 'Tech', name: 'Công Nghệ', icon: 'fa-microchip' },
    { id: 'Education', name: 'Giáo Dục', icon: 'fa-book' },
    { id: 'Entertainment', name: 'Giải Trí', icon: 'fa-masks-theater' },
    { id: 'Youth', name: 'Giới Trẻ (GenZ)', icon: 'fa-bolt' },
    { id: 'Consumer', name: 'Xu Hướng Tiêu Dùng', icon: 'fa-cart-shopping' }
];

export const TrendRadar: React.FC<TrendRadarProps> = ({ onClose, onAnalyze }) => {
    const [scanMode, setScanMode] = useState<'niche' | 'keyword'>('keyword');
    const [selectedNiche, setSelectedNiche] = useState('');
    const [customKeyword, setCustomKeyword] = useState('');
    
    const [isScanning, setIsScanning] = useState(false);
    const [report, setReport] = useState<TrendReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [playingVideo, setPlayingVideo] = useState<TikTokVideo | null>(null);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const handleScan = async () => {
        let queryTerm = '';
        if (scanMode === 'niche') {
            if (!selectedNiche) return;
            const nicheObj = NICHES.find(n => n.id === selectedNiche);
            queryTerm = nicheObj ? nicheObj.name : selectedNiche;
        } else {
            if (!customKeyword.trim()) return;
            queryTerm = customKeyword.trim();
        }

        setIsScanning(true);
        setError(null);
        setReport(null);
        
        try {
            const result = await analyzeNicheTrends(queryTerm);
            setReport(result);
        } catch (err: any) {
            console.error(err);
            setError("Không thể quét trend lúc này. Vui lòng thử lại sau hoặc đổi từ khóa.");
        } finally {
            setIsScanning(false);
        }
    };

    const handleExportPDF = () => {
        const element = document.getElementById('trend-radar-content');
        if (!element || !(window as any).html2pdf) {
            alert("Lỗi thư viện PDF. Vui lòng tải lại trang.");
            return;
        }

        setIsExportingPdf(true);

        const opt = {
            margin: [10, 10, 10, 10],
            filename: `Trend_Radar_${Date.now()}.pdf`,
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

    const handleKeywordChange = (val: string) => {
        setCustomKeyword(val);
        setScanMode('keyword');
        setSelectedNiche('');
    };

    const handleNicheSelect = (id: string) => {
        setSelectedNiche(id);
        setScanMode('niche');
        setCustomKeyword('');
    };

    const getTrendExampleVideo = (exampleIds?: string[]) => {
        if (!report || !report.topVideos || report.topVideos.length === 0) return null;
        if (exampleIds && exampleIds.length > 0) {
            const match = report.topVideos.find(v => exampleIds.includes(v.id));
            if (match) return match;
        }
        return null; 
    };

    const getVelocityDisplay = (video: TikTokVideo) => {
        if (!video.createTime || !video.playCount) return "N/A";
        const now = Date.now() / 1000;
        const ageHours = (now - video.createTime) / 3600;
        if (ageHours < 1) return "Vừa đăng";
        const viewsPerHour = Math.round(video.playCount / ageHours);
        if (viewsPerHour > 10000) return `🔥 ${Math.round(viewsPerHour/1000)}k/h (Siêu Nóng)`;
        if (viewsPerHour > 5000) return `⚡ ${Math.round(viewsPerHour/1000)}k/h (Tăng Nhanh)`;
        if (viewsPerHour > 1000) return `📈 ${Math.round(viewsPerHour/1000)}k/h (Ổn Định)`;
        return `${viewsPerHour}/h`;
    };

    const getNumericVelocity = (video: TikTokVideo) => {
        if (!video.createTime || !video.playCount) return 0;
        const now = Date.now() / 1000;
        const ageHours = Math.max(0.5, (now - video.createTime) / 3600);
        return video.playCount / ageHours;
    };

    const formatDateTime = (timestamp?: number) => {
        if (!timestamp) return "Unknown";
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    };

    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-8">
            {playingVideo && <VideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)} />}

            <div className="flex justify-between items-center mb-6" data-html2canvas-ignore="true">
                <h2 className="text-2xl font-black text-gray-900 uppercase flex items-center gap-2">
                    <i className="fa-solid fa-radar text-purple-600 animate-pulse"></i> Real-time Trend Radar 2.0
                </h2>
                <div className="flex gap-2">
                    {report && (
                        <button 
                            onClick={handleExportPDF} 
                            disabled={isExportingPdf}
                            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-xl font-bold text-sm transition-colors shadow-sm flex items-center gap-2"
                        >
                            {isExportingPdf ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-file-pdf"></i>}
                            {isExportingPdf ? 'Đang xuất...' : 'Xuất PDF'}
                        </button>
                    )}
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>
            </div>

            {!report ? (
                <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-xl w-full text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                    <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 relative border border-purple-200 shadow-inner">
                        <i className="fa-solid fa-tower-broadcast text-5xl text-purple-600"></i>
                        {isScanning && <div className="absolute inset-0 border-4 border-purple-400 rounded-full animate-ping opacity-30"></div>}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Trạm Kiểm Soát Xu Hướng 24h</h3>
                    <p className="text-gray-500 mb-8 max-w-lg mx-auto">Hệ thống AI sẽ quét liên tục để phát hiện các tín hiệu Viral tiềm năng trong 48h tới.</p>

                    <div className="max-w-4xl mx-auto">
                        <div className="mb-8 relative z-10">
                            <div className={`relative group transition-all duration-300 ${scanMode === 'keyword' ? 'scale-105' : 'opacity-80 hover:opacity-100'}`}>
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                    <i className={`fa-solid fa-magnifying-glass text-xl ${scanMode === 'keyword' ? 'text-purple-600' : 'text-gray-400'}`}></i>
                                </div>
                                <input 
                                    type="text" 
                                    value={customKeyword}
                                    onChange={(e) => handleKeywordChange(e.target.value)}
                                    onFocus={() => setScanMode('keyword')}
                                    onKeyDown={(e) => e.key === 'Enter' && !isScanning && handleScan()}
                                    placeholder="Nhập từ khóa (VD: Son kem lì, Xe đạp điện...)"
                                    className={`w-full pl-12 pr-4 py-5 bg-white border-2 rounded-2xl font-bold text-lg text-gray-900 outline-none transition-all placeholder-gray-400 shadow-sm ${scanMode === 'keyword' ? 'border-purple-500 ring-4 ring-purple-100' : 'border-gray-200'}`}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-4 mb-8 opacity-60">
                            <div className="h-px bg-gray-300 w-16"></div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Hoặc chọn chủ đề Hot</span>
                            <div className="h-px bg-gray-300 w-16"></div>
                        </div>

                        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 transition-all duration-300 ${scanMode === 'niche' ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}>
                            {NICHES.map(niche => (
                                <button
                                    key={niche.id}
                                    onClick={() => handleNicheSelect(niche.id)}
                                    className={`p-4 rounded-xl border text-left transition-all flex flex-col items-center justify-center gap-2 h-24 ${selectedNiche === niche.id ? 'bg-purple-600 text-white border-purple-600 shadow-lg' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'}`}
                                >
                                    <i className={`fa-solid ${niche.icon} text-xl ${selectedNiche === niche.id ? 'text-white' : 'text-purple-500'}`}></i>
                                    <span className="font-bold text-xs text-center leading-tight">{niche.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={handleScan}
                        disabled={(scanMode === 'niche' && !selectedNiche) || (scanMode === 'keyword' && !customKeyword) || isScanning}
                        className={`w-full max-w-md mx-auto py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${(scanMode === 'niche' && !selectedNiche) || (scanMode === 'keyword' && !customKeyword) || isScanning ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:scale-105 shadow-purple-200'}`}
                    >
                        {isScanning ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Đang Phân Tích...</> : <><i className="fa-solid fa-radar"></i> {scanMode === 'keyword' ? `Quét Trend: "${customKeyword}"` : `Quét Ngách: ${NICHES.find(n => n.id === selectedNiche)?.name || ''}`}</>}
                    </button>
                    {error && <p className="text-red-500 mt-4 font-bold bg-red-50 py-2 px-4 rounded-lg inline-block">{error}</p>}
                </div>
            ) : (
                <div 
                    id="trend-radar-content"
                    className={`space-y-8 bg-white p-6 rounded-3xl ${isExportingPdf ? 'overflow-visible h-auto' : ''}`}
                >
                    <div className="bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden border border-slate-700 shadow-2xl print:bg-white print:text-black">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none print:hidden"></div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className="text-purple-400 font-bold uppercase tracking-widest text-xs mb-1 block border-l-2 border-purple-500 pl-2">Báo Cáo Xu Hướng Live</span>
                                    <h3 className="text-4xl md:text-5xl font-black leading-tight">{scanMode === 'keyword' ? `Keyword: "${customKeyword}"` : report.niche}</h3>
                                    <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                                        <i className="fa-regular fa-clock"></i> Cập nhật: Vừa xong
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-4">
                                {report.keywords.map((kw, i) => (
                                    <span key={i} className="px-3 py-1 bg-purple-900/50 rounded-lg text-xs font-bold border border-purple-700/50 text-purple-200 print:border-black print:text-black">#{kw}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {report.trends.map((trend, idx) => {
                            const exampleVideo = getTrendExampleVideo(trend.exampleVideoIds);
                            return (
                                <div key={idx} className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden flex flex-col hover:border-purple-400 transition-all duration-300 break-inside-avoid">
                                    <div className="bg-gray-50 p-5 border-b border-gray-100 flex justify-between items-start print:bg-white">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${trend.type === 'Audio' ? 'bg-blue-50 text-blue-700 border-blue-200' : trend.type === 'Challenge' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>{trend.type}</span>
                                            </div>
                                            <h4 className="text-lg font-bold text-gray-900 leading-tight">{trend.name}</h4>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-gray-500 uppercase font-bold">Điểm Bùng Nổ</div>
                                            <div className={`text-2xl font-black ${trend.explosionScore >= 80 ? 'text-red-600' : trend.explosionScore >= 50 ? 'text-orange-500' : 'text-gray-600'}`}>{trend.explosionScore}</div>
                                        </div>
                                    </div>
                                    <div className="p-5 flex-1 space-y-6">
                                        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 print:bg-white">
                                            <h5 className="text-xs font-bold text-purple-800 uppercase mb-2 flex items-center gap-2"><i className="fa-solid fa-crystal-ball"></i> Dự Báo Xu Hướng</h5>
                                            <p className="text-sm text-gray-800 leading-relaxed font-medium">{trend.description}</p>
                                        </div>
                                        <div>
                                            <h5 className="text-xs font-bold text-gray-900 uppercase mb-3 flex items-center gap-2"><i className="fa-solid fa-dna text-gray-400"></i> Góc Nhìn Content</h5>
                                            <div className="space-y-2">
                                                {trend.viralFactors?.map((factor, i) => (
                                                    <div key={i} className="flex items-start gap-3 text-sm">
                                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase min-w-[75px] text-center ${factor.type === 'Emotional' ? 'bg-pink-50 text-pink-700 border border-pink-100' : factor.type === 'Practical' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>{factor.type}</span>
                                                        <span className="text-gray-700 text-xs leading-snug">{factor.description}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-between items-center print:bg-white">
                                        <div className="text-xs text-gray-500 font-medium">Cạnh tranh: <span className="text-gray-900 font-bold">{trend.stats?.competitionLevel || 'Medium'}</span></div>
                                        {exampleVideo && (
                                            <button 
                                                onClick={() => setPlayingVideo(exampleVideo)}
                                                className="text-xs font-bold bg-white border border-gray-300 hover:border-purple-500 text-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1 no-print"
                                            >
                                                <i className="fa-solid fa-play"></i> Xem Mẫu
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {report.topVideos && report.topVideos.length > 0 && (
                        <div className="mt-12 break-inside-avoid">
                            <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <span className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center text-sm print:hidden"><i className="fa-solid fa-ranking-star"></i></span>
                                Bảng Xếp Hạng Dữ Liệu Nguồn
                            </h4>
                            <div className="bg-white border border-gray-200 rounded-[20px] shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-bold">
                                                <th className="p-4 text-center w-12">#</th>
                                                <th className="p-4">Video</th>
                                                <th className="p-4 text-right">Tương Tác</th>
                                                <th className="p-4 text-left pl-8">Tốc Độ Tăng Trưởng</th>
                                                <th className="p-4 text-center w-32 no-print">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-sm">
                                            {[...report.topVideos].sort((a, b) => getNumericVelocity(b) - getNumericVelocity(a)).map((video, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                                                    <td className="p-4 text-center font-bold text-gray-400">{idx + 1}</td>
                                                    <td className="p-4">
                                                        <div className="flex gap-3 items-center">
                                                            <div className="relative w-12 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-200 cursor-pointer" onClick={() => setPlayingVideo(video)}>
                                                                <img src={video.thumbnail} className="w-full h-full object-cover" alt="" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-gray-900 line-clamp-1 text-sm">{video.title}</p>
                                                                <p className="text-xs text-gray-500">@{video.author}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right font-bold text-gray-900">{(video.playCount || 0).toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">Views</span></td>
                                                    <td className="p-4 pl-8">
                                                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">{getVelocityDisplay(video)}</span>
                                                    </td>
                                                    <td className="p-4 text-center no-print">
                                                        <button onClick={() => onAnalyze(video)} className="px-4 py-2 bg-white border border-gray-200 hover:bg-emerald-500 hover:text-white rounded-xl text-xs font-bold transition-all"><i className="fa-solid fa-microscope mr-1"></i> Phân Tích</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="text-center pt-8 no-print" data-html2canvas-ignore="true">
                         <button onClick={() => setReport(null)} className="px-8 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors">Quét Ngách Khác</button>
                    </div>
                </div>
            )}
        </div>
    );
};
