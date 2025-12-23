
import React from 'react';
import { AnalysisHistoryItem, ContentAnalysis, ChannelAnalysis } from '../types';

interface HistoryListProps {
  items: AnalysisHistoryItem[];
  onClear: () => void;
  onSelect: (item: AnalysisHistoryItem) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ items, onClear, onSelect }) => {
  // Hide completely if no history
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 shadow-sm">
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <h3 className="text-xl font-bold text-gray-800">Lịch Sử Phân Tích</h3>
        <button 
          type="button"
          onClick={onClear}
          className="text-sm text-red-500 hover:text-red-700 transition-colors font-medium px-4 py-2 hover:bg-red-50 rounded-lg"
        >
          Xóa Tất Cả
        </button>
      </div>
      <div className="max-h-[500px] overflow-y-auto">
        {items.map((item) => {
            const isChannel = item.type === 'channel';
            
            // Extract display data based on type
            let imgUrl = '';
            let title = '';
            let subtitle = '';
            let scoreLabel = '';
            let scoreValue = 0;
            let isHigh = false;

            if (isChannel) {
                const analysis = item.analysis as ChannelAnalysis;
                imgUrl = item.channel?.avatar || "https://cdn-icons-png.flaticon.com/512/847/847969.png";
                title = `Channel Audit: @${analysis.username}`;
                subtitle = "Phân tích kênh";
                scoreLabel = "Sức khỏe";
                scoreValue = analysis.healthScore;
                isHigh = scoreValue >= 80;
            } else {
                const video = item.video;
                const analysis = item.analysis as ContentAnalysis;
                
                // Defensive check if video data is corrupted/missing
                if (!video) return null;

                imgUrl = video.thumbnail;
                title = video.title;
                subtitle = video.author;
                scoreLabel = "Viral";
                scoreValue = analysis?.viralScore || 0;
                isHigh = scoreValue >= 7;
            }

            return (
              <div 
                key={item.id} 
                onClick={() => onSelect(item)}
                className="flex items-center gap-5 p-5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 group cursor-pointer"
              >
                <img 
                  src={imgUrl} 
                  alt={title} 
                  className={`rounded-lg object-cover bg-gray-200 shadow-sm opacity-90 group-hover:opacity-100 transition-opacity flex-shrink-0 ${isChannel ? 'w-14 h-14 rounded-full border border-gray-200' : 'w-14 h-20'}`}
                  onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-gray-800 truncate group-hover:text-emerald-600 transition-colors">{title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
                  <div className="flex gap-4 mt-2">
                     <span className={`text-sm flex items-center gap-1.5 font-medium ${isHigh ? 'text-emerald-600' : 'text-yellow-600'}`}>
                        <i className={`fa-solid ${isChannel ? 'fa-heart-pulse' : 'fa-chart-line'}`}></i> {scoreLabel}: {scoreValue}{isChannel ? '/100' : '/10'}
                     </span>
                     <span className="text-sm text-gray-400 border-l border-gray-300 pl-4">
                        {new Date(item.timestamp).toLocaleDateString('vi-VN')}
                     </span>
                  </div>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-all">
                    <i className="fa-solid fa-chevron-right text-sm"></i>
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
};
