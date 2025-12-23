
import React from 'react';
import { TikTokVideo } from '../types';

interface VideoPlayerModalProps {
    video: TikTokVideo;
    onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ video, onClose }) => {
    return (
        <div 
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div 
                className="relative w-full max-w-md bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10 flex justify-between items-start pointer-events-none">
                    <div className="pointer-events-auto">
                        <span className="text-white font-bold text-sm shadow-black drop-shadow-md line-clamp-1 pr-4">
                            {video.title}
                        </span>
                        <span className="text-gray-300 text-xs shadow-black drop-shadow-md">
                            @{video.author}
                        </span>
                    </div>
                    <button 
                        onClick={onClose}
                        className="pointer-events-auto w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Player */}
                <div className="aspect-[9/16] w-full bg-gray-900 relative flex items-center justify-center">
                    {video.downloadUrl ? (
                        <video 
                            src={video.downloadUrl} 
                            controls 
                            autoPlay 
                            playsInline
                            loop
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                // Fallback if video fails to load inside the tag
                                console.error("Video load error");
                                (e.target as HTMLVideoElement).style.display = 'none';
                                const fallback = document.getElementById('video-fallback');
                                if (fallback) fallback.style.display = 'flex';
                            }}
                        />
                    ) : (
                        <div className="text-white text-center p-6">
                            <i className="fa-solid fa-video-slash text-4xl mb-4 text-gray-500"></i>
                            <p>Không thể tải video trực tiếp.</p>
                        </div>
                    )}
                    
                    {/* Fallback Message (Hidden by default) */}
                    <div id="video-fallback" className="hidden absolute inset-0 flex-col items-center justify-center p-6 text-center z-0">
                         <i className="fa-regular fa-face-frown text-4xl text-gray-400 mb-3"></i>
                         <p className="text-gray-300 text-sm mb-4">Trình duyệt chặn phát video này do bảo mật.</p>
                         <a 
                            href={`https://www.tiktok.com/${video.author}/video/${video.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-full font-bold text-sm transition-colors"
                         >
                            Mở Video Gốc
                         </a>
                    </div>
                </div>
                
                {/* Footer Info */}
                <div className="bg-gray-900 p-4 border-t border-gray-800 flex justify-between items-center">
                     <div className="flex gap-4 text-gray-400 text-xs">
                        <span className="flex items-center gap-1"><i className="fa-solid fa-play"></i> {(video.playCount || 0).toLocaleString()}</span>
                        <span className="flex items-center gap-1"><i className="fa-solid fa-heart"></i> {(video.diggCount || 0).toLocaleString()}</span>
                     </div>
                     
                     {video.isCommerce && (
                        <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] font-bold uppercase rounded border border-orange-500/30">
                            Video Bán Hàng
                        </span>
                     )}
                </div>
            </div>
        </div>
    );
};
