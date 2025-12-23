
import React, { useState, useEffect } from 'react';
import { TikTokVideo, ROIRecord } from '../types';

interface ROITrackerProps {
    onClose: () => void;
}

export const ROITracker: React.FC<ROITrackerProps> = ({ onClose }) => {
    const [records, setRecords] = useState<ROIRecord[]>([]);
    const [view, setView] = useState<'table' | 'add'>('table');
    
    // Add Form State
    const [newTitle, setNewTitle] = useState('');
    const [newViews, setNewViews] = useState('');
    const [newCost, setNewCost] = useState('');
    const [newRevenue, setNewRevenue] = useState('');
    const [newOrders, setNewOrders] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('tiktok_roi_records');
        if (saved) {
            try {
                setRecords(JSON.parse(saved));
            } catch (e) { console.error("Failed to load ROI records"); }
        }
    }, []);

    const saveRecords = (newRecords: ROIRecord[]) => {
        setRecords(newRecords);
        localStorage.setItem('tiktok_roi_records', JSON.stringify(newRecords));
    };

    const handleAddRecord = () => {
        if (!newTitle || !newViews || !newCost || !newRevenue) return;

        const views = parseInt(newViews);
        const cost = parseInt(newCost);
        const revenue = parseInt(newRevenue);
        const orders = parseInt(newOrders || '0');
        
        const conversionRate = views > 0 ? (orders / views) * 100 : 0;
        const cpa = orders > 0 ? cost / orders : 0;
        const roas = cost > 0 ? revenue / cost : 0;
        
        // Alert Logic
        let status: 'Good' | 'Warning' | 'Critical' = 'Good';
        if (roas < 1) status = 'Critical';
        else if (roas < 2 || (views > 10000 && conversionRate < 0.2)) status = 'Warning';

        const record: ROIRecord = {
            id: Date.now().toString(),
            videoId: 'manual',
            videoTitle: newTitle,
            thumbnail: "https://cdn-icons-png.flaticon.com/512/3046/3046121.png",
            views,
            productionCost: cost,
            revenue,
            orders,
            cpa,
            roas,
            conversionRate,
            status,
            date: new Date().toLocaleDateString('vi-VN')
        };

        saveRecords([record, ...records]);
        setView('table');
        setNewTitle(''); setNewViews(''); setNewCost(''); setNewRevenue(''); setNewOrders('');
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Xóa bản ghi này?")) {
            saveRecords(records.filter(r => r.id !== id));
        }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-900 uppercase flex items-center gap-2">
                    <i className="fa-solid fa-chart-line text-green-600"></i> ROI Tracker
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <i className="fa-solid fa-xmark text-xl"></i>
                </button>
            </div>

            <div className="flex gap-4 mb-8">
                <button 
                    onClick={() => setView('table')} 
                    className={`px-5 py-2.5 rounded-xl font-bold transition-all ${view === 'table' ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                >
                    Dashboard
                </button>
                <button 
                    onClick={() => setView('add')} 
                    className={`px-5 py-2.5 rounded-xl font-bold transition-all ${view === 'add' ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                >
                    + Nhập Số Liệu
                </button>
            </div>

            {view === 'add' ? (
                <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-xl w-full text-gray-800">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Nhập Kết Quả Kinh Doanh</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-500 mb-1">Tên Video / Chiến Dịch</label>
                            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 outline-none focus:border-orange-500 transition-colors" placeholder="VD: Video Review Son Kem..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-bold text-gray-500 mb-1">Lượt Xem (Views)</label>
                                <input type="number" value={newViews} onChange={e => setNewViews(e.target.value)} className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 outline-none focus:border-orange-500 transition-colors" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-500 mb-1">Chi Phí (VND)</label>
                                <input type="number" value={newCost} onChange={e => setNewCost(e.target.value)} className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 outline-none focus:border-orange-500 transition-colors" placeholder="Sản xuất + Ads" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-bold text-gray-500 mb-1">Doanh Thu (VND)</label>
                                <input type="number" value={newRevenue} onChange={e => setNewRevenue(e.target.value)} className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 outline-none focus:border-orange-500 transition-colors" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-500 mb-1">Số Đơn Hàng</label>
                                <input type="number" value={newOrders} onChange={e => setNewOrders(e.target.value)} className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl text-gray-900 outline-none focus:border-orange-500 transition-colors" />
                            </div>
                        </div>
                        <button onClick={handleAddRecord} className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 mt-4 shadow-lg shadow-orange-200">
                            Lưu Kết Quả
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-gray-100">
                                <tr>
                                    <th className="p-4">Video</th>
                                    <th className="p-4 text-right">Chi Phí</th>
                                    <th className="p-4 text-right">Doanh Thu</th>
                                    <th className="p-4 text-center">ROAS</th>
                                    <th className="p-4 text-center">CPA</th>
                                    <th className="p-4 text-center">Trạng Thái</th>
                                    <th className="p-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {records.map(r => (
                                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-900 line-clamp-1 max-w-[200px]">{r.videoTitle}</div>
                                            <div className="text-xs text-gray-500">{r.date} | {r.views.toLocaleString()} views</div>
                                        </td>
                                        <td className="p-4 text-right font-medium text-gray-600">{formatCurrency(r.productionCost)}</td>
                                        <td className="p-4 text-right font-bold text-green-600">{formatCurrency(r.revenue)}</td>
                                        <td className="p-4 text-center font-bold text-gray-900">{r.roas.toFixed(2)}x</td>
                                        <td className="p-4 text-center text-gray-700">{formatCurrency(r.cpa)}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                r.status === 'Good' ? 'bg-green-100 text-green-700 border border-green-200' : 
                                                r.status === 'Warning' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-red-100 text-red-700 border border-red-200'
                                            }`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-500"><i className="fa-solid fa-trash"></i></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {records.length === 0 && (
                            <div className="p-8 text-center text-gray-500">Chưa có dữ liệu. Hãy nhập chi phí & doanh thu.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
