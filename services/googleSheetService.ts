
import { ContentAnalysis, ChannelAnalysis, TikTokVideo } from "../types";

// ============================================================================
// HƯỚNG DẪN FIX CỨNG LINK GOOGLE SHEET:
// 1. Deploy Apps Script từ file Google Sheet CỦA BẠN (Chọn Access: Anyone).
// 2. Lấy link Web App URL (kết thúc bằng /exec).
// 3. Dán đè vào biến HARDCODED_SHEET_URL bên dưới.
// ============================================================================
const HARDCODED_SHEET_URL = "https://script.google.com/macros/s/AKfycbyB6Cr8oJqjTYLiTrhpZlJDD3LTeKlz8krXXzVEjuce7w0pI_oX8uF8P8f_XxDUB7ny/exec"; 

const getWebAppUrl = () => {
    // 1. Ưu tiên link hardcode nếu người dùng đã dán vào
    if (HARDCODED_SHEET_URL && HARDCODED_SHEET_URL.includes("/exec")) {
        return HARDCODED_SHEET_URL;
    }
    // 2. Nếu không có hardcode, lấy từ cài đặt trong App (LocalStorage)
    const localUrl = localStorage.getItem('GOOGLE_SHEET_WEBAPP_URL');
    if (localUrl && localUrl.includes("/exec")) {
        return localUrl;
    }
    return "";
};

export const testConnection = async (): Promise<{success: boolean, message: string}> => {
    const webAppUrl = getWebAppUrl();
    
    if (!webAppUrl) {
        return { success: false, message: "Chưa cấu hình Link Google Sheet. Vui lòng vào Cài đặt hoặc dán Link vào code." };
    }

    const payload = {
        type: 'test_connection',
        fullData: { message: "Test connection check", timestamp: new Date().toISOString() },
        title: "Test Connection",
        inputId: "TEST-CHECK"
    };

    try {
        const response = await fetch(webAppUrl, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "text/plain;charset=utf-8" },
        });

        const text = await response.text();
        console.log("Test Connection Response:", text);

        if (response.ok) {
            try {
                const json = JSON.parse(text);
                if (json.result === 'success') {
                    return { success: true, message: `Kết nối thành công! Đã ghi vào dòng số ${json.row}` };
                } else {
                    return { success: false, message: `Lỗi Script: ${json.error}` };
                }
            } catch (e) {
                // Nếu server trả về OK nhưng không phải JSON (có thể là HTML lỗi hoặc text)
                // Tuy nhiên với mode no-cors hoặc text/plain, đôi khi nó vẫn chạy được.
                return { success: true, message: "Đã gửi tín hiệu thành công (Raw Response)." };
            }
        } else {
            return { success: false, message: `Lỗi Server: ${response.status}. Kiểm tra quyền 'Anyone'.` };
        }
    } catch (error: any) {
        console.error("Test Connection Error", error);
        return { success: false, message: "Lỗi mạng. Vui lòng kiểm tra đường truyền." };
    }
};

export const saveToGoogleSheet = async (
  data: any, 
  type: 'video' | 'channel' | 'batch_summary'
): Promise<boolean> => {
  
  const webAppUrl = getWebAppUrl();
  if (!webAppUrl) {
      alert("Chưa cấu hình Link Google Sheet! Vui lòng vào Cài đặt.");
      return false;
  }

  // Format Data
  let payload: any = {
    type: type,
    fullData: data 
  };

  if (type === 'video') {
    const analysis = data.analysis as ContentAnalysis;
    const video = data.video as TikTokVideo;
    
    payload.inputId = video.downloadUrl || video.id;
    payload.title = video.title;
    payload.score1 = analysis.viralScore;
    payload.score2 = analysis.hookScore;
    payload.niche = analysis.niche;
    payload.summary = analysis.summary;
    
    let scriptText = "";
    if (analysis.scriptTable && analysis.scriptTable.length > 0) {
        scriptText = analysis.scriptTable.map(s => `[${s.scene}] Visual: ${s.visual}\nAudio: ${s.audio}`).join('\n---\n');
    } else {
        scriptText = analysis.fullScript || "No script available";
    }
    payload.script = scriptText;
    payload.strategy = analysis.improvementTips.join('\n');
    payload.styleVoice = `Style: ${analysis.style} | Voice: ${analysis.voice}`;
    payload.visuals = analysis.visualHooks.join(', ');
  
  } else if (type === 'channel' || type === 'batch_summary') {
    const analysis = data as ChannelAnalysis;
    payload.inputId = `@${analysis.username}`;
    payload.title = analysis.username;
    payload.score1 = analysis.healthScore;
    payload.score2 = "";
    payload.niche = analysis.contentCategories?.map(c => `${c.name} (${c.percentage}%)`).join(', ');
    payload.summary = analysis.healthAnalysis;
    payload.script = `Content Pillars: ${analysis.contentPillars.join(', ')}\nAudience: ${analysis.audiencePersona}`;
    payload.strategy = analysis.strategicAdvice.join('\n');
    payload.styleVoice = `Style: ${analysis.channelStyle} | Voice: ${analysis.channelVoice}`;
    payload.visuals = analysis.channelVisuals?.join(', ');
  }

  // Send Request
  try {
    const response = await fetch(webAppUrl, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "text/plain;charset=utf-8", 
      },
    });

    if (response.ok) {
        return true;
    } else {
        console.error("Server responded with status:", response.status);
        return false;
    }
  } catch (error) {
    console.error("Save to Sheet Error", error);
    return false;
  }
};

export const clearSheetUrl = () => {
    localStorage.removeItem('GOOGLE_SHEET_WEBAPP_URL');
    alert("Đã xóa cấu hình local. Nếu bạn đã hardcode link trong file services, hệ thống sẽ dùng link đó.");
};
