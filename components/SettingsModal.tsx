
import React, { useState, useEffect } from 'react';
import { testConnection } from '../services/googleSheetService';

interface SettingsModalProps {
    onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<'config' | 'guide'>('guide'); // Default to guide to help user first
    const [url, setUrl] = useState('');
    const [testStatus, setTestStatus] = useState<{success: boolean, message: string} | null>(null);
    const [isTesting, setIsTesting] = useState(false);

    useEffect(() => {
        const savedUrl = localStorage.getItem('GOOGLE_SHEET_WEBAPP_URL');
        setUrl(savedUrl || '');
    }, []);

    const handleSave = () => {
        if (!url.trim()) return;
        localStorage.setItem('GOOGLE_SHEET_WEBAPP_URL', url.trim());
        setTestStatus({ success: true, message: "Đã lưu URL vào bộ nhớ trình duyệt." });
        setTimeout(() => setTestStatus(null), 3000);
    };

    const handleTest = async () => {
        setIsTesting(true);
        setTestStatus(null);
        // Save first just in case
        localStorage.setItem('GOOGLE_SHEET_WEBAPP_URL', url.trim());
        
        const result = await testConnection();
        setTestStatus(result);
        setIsTesting(false);
    };

    const copyCode = () => {
        const code = `
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    // TỰ ĐỘNG TẠO TAB 'Logs' NẾU CHƯA CÓ
    var sheet = doc.getSheetByName('Logs');
    if (!sheet) {
      sheet = doc.insertSheet('Logs');
      // Tạo header luôn nếu mới tạo sheet
      var headers = [
        "Thời Gian", "Loại", "Link/ID", "Tiêu Đề / Tên Kênh", 
        "Điểm Viral / Sức Khỏe", "Điểm Hook", "Ngách / Danh Mục", 
        "Tóm Tắt", "Kịch Bản / Nội Dung", "Chiến Lược / Lời Khuyên", 
        "Phong Cách & Giọng Điệu", "Visual Hooks", "Full JSON"
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    // Nếu sheet có rồi mà chưa có header (dòng 1 trống)
    if (sheet.getLastRow() === 0) {
       var headers = [
        "Thời Gian", "Loại", "Link/ID", "Tiêu Đề / Tên Kênh", 
        "Điểm Viral / Sức Khỏe", "Điểm Hook", "Ngách / Danh Mục", 
        "Tóm Tắt", "Kịch Bản / Nội Dung", "Chiến Lược / Lời Khuyên", 
        "Phong Cách & Giọng Điệu", "Visual Hooks", "Full JSON"
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    var data = JSON.parse(e.postData.contents);
    var nextRow = sheet.getLastRow() + 1;
    var newRow = [
      new Date(),           
      data.type || '',            
      data.inputId || '',         
      data.title || '',           
      data.score1 || '',          
      data.score2 || '',          
      data.niche || '',           
      data.summary || '',         
      data.script || '',          
      data.strategy || '',        
      data.styleVoice || '',      
      data.visuals || '',         
      JSON.stringify(data.fullData) 
    ];

    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);

    return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'row': nextRow }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
        `;
        navigator.clipboard.writeText(code.trim());
        alert("Đã copy code mới (Tự động tạo Sheet) vào bộ nhớ tạm!");
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                        <i className="fa-solid fa-database text-emerald-600"></i>
                        Cấu Hình Kết Nối Google Sheet
                    </h3>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors shadow-sm">
                        <i className="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-8 pt-4 gap-6">
                    <button 
                        onClick={() => setActiveTab('guide')}
                        className={`pb-4 text-base font-bold transition-all relative ${activeTab === 'guide' ? 'text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Hướng Dẫn Cài Đặt
                        {activeTab === 'guide' && <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-600 rounded-t-full"></div>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('config')}
                        className={`pb-4 text-base font-bold transition-all relative ${activeTab === 'config' ? 'text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Nhập Link & Kiểm Tra
                        {activeTab === 'config' && <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-600 rounded-t-full"></div>}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-white">
                    {activeTab === 'guide' ? (
                        <div className="space-y-6">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-sm flex gap-3 items-start">
                                <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
                                <div>
                                    <p className="font-bold">Làm sao để lấy link Web App?</p>
                                    <p>Vào Google Sheet của bạn &rarr; Tiện ích mở rộng &rarr; Apps Script &rarr; Dán code bên dưới &rarr; Bấm nút Deploy (Triển khai) màu xanh &rarr; Chọn 'New deployment' &rarr; Chọn 'Anyone' (Bất kỳ ai).</p>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-900 text-lg">Bước 1: Copy Code mới (Tự động tạo Sheet)</h4>
                                <div className="relative bg-gray-900 rounded-xl overflow-hidden p-4 group">
                                    <button 
                                        onClick={copyCode}
                                        className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
                                    >
                                        <i className="fa-regular fa-copy"></i> Copy Code
                                    </button>
                                    <pre className="text-emerald-400 text-xs font-mono overflow-x-auto p-2">
                                        <code>{`function doPost(e) { ... } // Code này sẽ tự tạo tab Logs nếu chưa có`}</code>
                                    </pre>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-900 text-lg">Bước 2: Deploy & Lấy Link</h4>
                                <ul className="list-decimal pl-5 space-y-2 text-gray-700">
                                    <li>Sau khi Deploy xong, bạn sẽ nhận được link có đuôi <code>/exec</code>.</li>
                                    <li>Copy link đó và dán vào tab <strong>"Nhập Link"</strong> bên cạnh.</li>
                                    <li>Hoặc dán trực tiếp vào file <code>services/googleSheetService.ts</code> để fix cứng.</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div>
                                <label className="block text-gray-700 font-bold mb-3">Dán Web App URL của bạn vào đây:</label>
                                <textarea 
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="w-full h-24 p-4 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-50 transition-all font-mono text-sm text-gray-800 break-all"
                                    placeholder="https://script.google.com/macros/s/.../exec"
                                ></textarea>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4">
                                <button 
                                    onClick={handleSave}
                                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    <i className="fa-solid fa-save"></i> Lưu Cấu Hình
                                </button>
                                <button 
                                    onClick={handleTest}
                                    disabled={isTesting}
                                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-600/20 flex-1 flex items-center justify-center gap-2"
                                >
                                    {isTesting ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-plug-circle-bolt"></i>}
                                    {isTesting ? "Đang kết nối..." : "Lưu & Test Kết Nối Ngay"}
                                </button>
                            </div>

                            {testStatus && (
                                <div className={`p-4 rounded-xl border flex items-start gap-3 ${testStatus.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                                    <i className={`fa-solid mt-1 ${testStatus.success ? 'fa-check-circle' : 'fa-circle-xmark'}`}></i>
                                    <div>
                                        <h5 className="font-bold text-base">{testStatus.success ? "Thành Công!" : "Kết Nối Thất Bại"}</h5>
                                        <p className="text-sm mt-1">{testStatus.message}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
