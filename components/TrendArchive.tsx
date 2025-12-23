
import React, { useState, useEffect } from 'react';
import { TikTokVideo, CaseStudy } from '../types';
import { analyzeTikTokLink, analyzeCaseStudy } from '../services/geminiService';

interface TrendArchiveProps {
    onClose: () => void;
}

const NICHES = ["All", "F&B", "Fashion", "Beauty", "Tech", "Education", "Entertainment"];

export const TrendArchive: React.FC<TrendArchiveProps> = ({ onClose }) => {
    const [view, setView] = useState<'list' | 'add'>('list');
    const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
    const [filterNiche, setFilterNiche] = useState("All");
    
    // Add State
    const [inputLink, setInputLink] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [newCaseStudy, setNewCaseStudy] = useState<CaseStudy | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('tiktok_case_studies');
        if (saved) {
            try {
                setCaseStudies(JSON.parse(saved));
            } catch (e) { console.error("Failed to load case studies"); }
        }
    }, []);

    const saveToLocalStorage = (items: CaseStudy[]) => {
        setCaseStudies(items);
        localStorage.setItem('tiktok_case_studies', JSON.stringify(items));
    };

    const handleAnalyze = async () => {
        if (!inputLink) return;
        setIsAnalyzing(true);
        try {
            const video = await analyzeTikTokLink(inputLink);
            if (!video) throw new Error("Link không hợp lệ.");
            
            const study = await analyzeCaseStudy(video);
            setNewCaseStudy(study);
        } catch (error) {
            alert("Lỗi phân tích: " + error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveCaseStudy = () => {
        if (newCaseStudy) {
            const updated = [newCaseStudy, ...caseStudies];
            saveToLocalStorage(updated);
            setNewCaseStudy(null);
            setInputLink('');
            setView('list');
        }
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Bạn có chắc muốn xóa Case Study này?")) {
            const updated = caseStudies.filter(c => c.id !== id);
            saveToLocalStorage(updated);
        }
    };

    const filteredStudies = filterNiche === "All" 
        ? caseStudies 
        : caseStudies.filter(c => c.niche.includes(filterNiche) || filterNiche.includes(c.niche));

    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-900 uppercase flex items-center gap-2">
                    <i className="fa-solid fa-book-bookmark text-amber-600"></i> Kho Case Study & Trend
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <i className="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>

            {/* Navigation */}
            <div className="flex gap-4 mb-8">
                <button 
                    onClick={() => setView('list')}
                    className={`px-5 py-2.5 rounded-xl font-bold transition-all ${view === 'list' ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                >
                    <i className="fa-solid fa-layer-group mr-2"></i> Thư Viện
                </button>
                <button 
                    onClick={() => setView('add')}
                    className={`px-5 py-2.5 rounded-xl font-bold transition-all ${view === 'add' ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                >
                    <i className="fa-solid fa-plus mr-2"></i> Phân Tích Mới
                </button>
            </div>

            {view === 'add' ? (
                <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-xl w-full text-gray-800">
                    {!newCaseStudy ? (
                        <>
                            <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Giải Mã Video Viral</h3>
                            <p className="text-gray-500 mb-6 text-center text-sm">Nhập link video bạn thấy hay. AI sẽ phân tích tại sao nó thành công và tạo template để bạn bắt chước.</p>
                            
                            <input 
                                type="text" 
                                value={inputLink}
                                onChange={(e) => setInputLink(e.target.value)}
                                placeholder="Dán link TikTok (VD: tiktok.com/@abc/video/123...)"
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-orange-500 outline-none text-gray-900 placeholder-gray-400"
                            />
                            
                            <button 
                                onClick={handleAnalyze}
                                disabled={isAnalyzing || !inputLink}
                                className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
                            >
                                {isAnalyzing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-microscope"></i>}
                                {isAnalyzing ? "Đang Giải Mã..." : "Phân Tích Case Study"}
                            </button>
                        </>
                    ) : (
                        <div className="animate-in fade-in">
                            <div className="flex gap-4 mb-6">
                                <img src={newCaseStudy.videoData.thumbnail} className="w-20 h-28 object-cover rounded-lg bg-gray-100 border border-gray-200" />
                                <div>
                                    <h4 className="font-bold text-gray-900 line-clamp-2">{newCaseStudy.videoData.title}</h4>
                                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded mt-2 inline-block font-bold border border-amber-200">{newCaseStudy.niche}</span>
                                </div>
                            </div>

                            <div className="bg-amber-50 p-5 rounded-xl border border-amber-100 mb-4">
                                <h5 className="font-bold text-amber-700 mb-2">Tại sao 1M Views?</h5>
                                <ul className="text-sm space-y-2 text-gray-700">
                                    <li><strong>Hook:</strong> {newCaseStudy.whyItViral.hook}</li>
                                    <li><strong>Timing:</strong> {newCaseStudy.whyItViral.timing}</li>
                                    <li><strong>Emotion:</strong> {newCaseStudy.whyItViral.emotion}</li>
                                </ul>
                            </div>

                            <div className="bg-white p-5 rounded-xl border border-gray-200 mb-6 shadow-sm">
                                <h5 className="font-bold text-gray-900 mb-2">Smart Template (Bắt chước)</h5>
                                <div className="space-y-2">
                                    {newCaseStudy.smartTemplate.structure.map((step, i) => (
                                        <div key={i} className="flex gap-2 text-sm text-gray-700">
                                            <span className="font-bold text-amber-600">{i+1}.</span>
                                            <span>{step}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setNewCaseStudy(null)} className="flex-1 py-3 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50">Hủy</button>
                                <button onClick={handleSaveCaseStudy} className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 shadow-lg shadow-orange-200">
                                    <i className="fa-solid fa-floppy-disk mr-2"></i> Lưu Vào Thư Viện
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* Filters */}
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-4 custom-scrollbar">
                        {NICHES.map(niche => (
                            <button
                                key={niche}
                                onClick={() => setFilterNiche(niche)}
                                className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                                    filterNiche === niche 
                                    ? 'bg-orange-600 text-white' 
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                {niche}
                            </button>
                        ))}
                    </div>

                    {filteredStudies.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                            <i className="fa-regular fa-folder-open text-4xl text-gray-400 mb-4"></i>
                            <p className="text-gray-500 font-medium">Chưa có Case Study nào trong danh mục này.</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredStudies.map(study => (
                                <div key={study.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl transition-all flex flex-col overflow-hidden group">
                                    <div className="relative h-48 bg-gray-100 overflow-hidden">
                                        <img src={study.videoData.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded">
                                            {study.month}
                                        </div>
                                        <div className="absolute bottom-2 left-2 bg-amber-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                                            {study.niche}
                                        </div>
                                    </div>
                                    
                                    <div className="p-5 flex-1 flex flex-col">
                                        <h4 className="font-bold text-gray-900 line-clamp-2 mb-3 h-12">{study.videoData.title}</h4>
                                        
                                        <div className="space-y-2 mb-4 flex-1">
                                            <div className="flex items-start gap-2 text-xs text-gray-600">
                                                <i className="fa-solid fa-key text-amber-500 mt-0.5"></i>
                                                <span className="line-clamp-2">{study.whyItViral.hook}</span>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                             <button 
                                                onClick={() => {
                                                    const template = study.smartTemplate.structure.map((s, i) => `${i+1}. ${s}`).join('\n');
                                                    navigator.clipboard.writeText(template);
                                                    alert("Đã copy cấu trúc template!");
                                                }}
                                                className="text-xs font-bold text-amber-600 hover:text-amber-500 flex items-center gap-1"
                                             >
                                                 <i className="fa-regular fa-copy"></i> Copy Template
                                             </button>
                                             <button onClick={() => handleDelete(study.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                                 <i className="fa-solid fa-trash"></i>
                                             </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
