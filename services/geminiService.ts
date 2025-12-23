
import { TikTokVideo, ContentAnalysis, ChannelAnalysis, BatchSummaryAnalysis, SearchStrategy, RankedVideo, RemixContent, CompetitorAnalysis, TrendReport, TrendItem, AudienceInsight, CaseStudy, ScriptItem, MarketIntelligenceReport, KOCAuditReport } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

// --- Gemini API Setup ---
const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helper: Retry Logic for Gemini API ---
const callGeminiWithRetry = async (fn: () => Promise<any>, retries = 3, baseDelay = 2000): Promise<any> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            const isRateLimit = error.status === 429 || error.code === 429 || (error.message && error.message.includes('429'));
            const isServerOverload = error.status === 503 || (error.message && error.message.includes('503'));
            
            if ((isRateLimit || isServerOverload) && attempt < retries) {
                const delay = baseDelay * Math.pow(2, attempt) + (Math.random() * 1000); 
                console.warn(`Gemini API Rate Limit/Overload (Attempt ${attempt + 1}/${retries}). Retrying in ${Math.round(delay)}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error;
            }
        }
    }
};

// --- Proxy Logic ---
const createProxies = (targetUrl: string) => {
    const encoded = encodeURIComponent(targetUrl);
    const cacheBuster = `&_t=${Date.now()}`;
    return [
        `https://corsproxy.io/?${encoded}`,
        `https://api.codetabs.com/v1/proxy?quest=${encoded}`,
        `https://api.allorigins.win/raw?url=${encoded}${cacheBuster}`,
        `https://cors-anywhere.herokuapp.com/${targetUrl}`, 
        `https://thingproxy.freeboard.io/fetch/${targetUrl}`
    ];
};

async function fetchWithProxyFallback(targetUrl: string, signal?: AbortSignal, isJson: boolean = true): Promise<any> {
  const MOBILE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";
  const proxyList = createProxies(targetUrl);

  for (const proxyUrl of proxyList) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); 
    
    const onExternalAbort = () => {
        clearTimeout(timeoutId);
        controller.abort(); 
    };
    if (signal) signal.addEventListener('abort', onExternalAbort);

    try {
      const fetchOptions: RequestInit = { 
        headers: { 
            'Accept': isJson ? 'application/json' : 'text/html,application/xhtml+xml',
            'User-Agent': MOBILE_UA,
            'Origin': 'https://www.tiktok.com',
            'Referer': 'https://www.tiktok.com/'
        },
        signal: controller.signal
      };

      const response = await fetch(proxyUrl, fetchOptions);
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onExternalAbort);
      
      if (!response.ok) continue;

      if (isJson) {
          const text = await response.text();
          try {
            const data = JSON.parse(text);
            if (data.contents) { 
                try { return JSON.parse(data.contents); } catch(e) { return data.contents; }
            }
            return data;
          } catch (e) { continue; }
      } else {
          return await response.json(); 
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', onExternalAbort);
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      continue;
    }
  }
  return null;
}

async function fetchBinaryWithProxyFallback(targetUrl: string, signal?: AbortSignal): Promise<Blob | null> {
  const encoded = encodeURIComponent(targetUrl);
  const BINARY_PROXIES = [
      `https://corsproxy.io/?${encoded}`,
      `https://api.codetabs.com/v1/proxy?quest=${encoded}`
  ];

  for (const proxyUrl of BINARY_PROXIES) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); 
      
      const onExternalAbort = () => {
          clearTimeout(timeoutId);
          controller.abort();
      };
      if (signal) signal.addEventListener('abort', onExternalAbort);

      try {
          const response = await fetch(proxyUrl, { 
              signal: controller.signal,
              headers: { 'Accept': 'video/mp4, audio/mpeg, image/jpeg, image/png, */*' } 
          });
          clearTimeout(timeoutId);
          if (signal) signal.removeEventListener('abort', onExternalAbort);

          if (!response.ok) continue;
          
          const blob = await response.blob();
          if (blob.size < 100) continue; 
          return blob;
      } catch (e: any) {
          clearTimeout(timeoutId);
          if (signal) signal.removeEventListener('abort', onExternalAbort);
          
          if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
          continue;
      }
  }
  return null;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function fetchOembedData(url: string, signal?: AbortSignal): Promise<TikTokVideo | null> {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const data = await fetchWithProxyFallback(oembedUrl, signal, true);

    if (data && data.title) {
        return {
            id: `oembed_${Date.now()}`,
            title: data.title || "Video TikTok (Shop/Ads)",
            author: data.author_name || data.author_url || "Unknown",
            thumbnail: data.thumbnail_url || "https://cdn-icons-png.flaticon.com/512/3046/3046121.png",
            duration: "Unknown",
            downloadUrl: "",
            coverUrl: data.thumbnail_url,
            playCount: 0,
            diggCount: 0,
            commentCount: 0,
            shareCount: 0,
            isCommerce: false,
            createTime: Date.now() / 1000 
        };
    }
    return null;
}

export const analyzeTikTokLink = async (url: string, signal?: AbortSignal): Promise<TikTokVideo | null> => {
  let cleanUrl = url.trim();
  try {
      const targetApiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(cleanUrl)}&hd=1&_rand=${Math.random()}`;
      const data = await fetchWithProxyFallback(targetApiUrl, signal);

      if (data && data.code === 0 && data.data) {
        const d = data.data;
        return {
          id: d.id,
          title: d.title || `TikTok Video ${d.id}`,
          author: d.author ? `@${d.author.nickname}` : "@unknown",
          thumbnail: d.cover,
          duration: d.duration ? String(d.duration) : '0',
          downloadUrl: d.play, 
          musicUrl: d.music,
          coverUrl: d.cover,
          playCount: d.play_count,
          diggCount: d.digg_count,
          commentCount: d.comment_count,
          shareCount: d.share_count,
          isCommerce: d.anchors && d.anchors.length > 0,
          createTime: d.create_time || d.time || 0
        };
      }
  } catch (e: any) { 
      if (e.name === 'AbortError' || signal?.aborted) throw e;
  }
  try {
      const fallbackData = await fetchOembedData(cleanUrl, signal);
      if (fallbackData) return fallbackData;
  } catch (e: any) { 
      if (e.name === 'AbortError' || signal?.aborted) throw e;
  }
  return null;
};

export const extractUsername = (input: string): string | null => {
  let clean = input.trim();
  if (clean.includes('tiktok.com')) {
      const match = clean.match(/@([a-zA-Z0-9_.-]+)/);
      if (match && match[1]) return match[1];
  }
  if (clean.startsWith('@')) {
      return clean.substring(1).split('?')[0].split('/')[0].trim();
  }
  clean = clean.replace(/(^\w+:|^)\/\//, '');
  if (clean.includes('tiktok.com/')) {
      const parts = clean.split('tiktok.com/');
      if (parts[1]) {
          if (parts[1].startsWith('@')) return parts[1].substring(1).split('?')[0].split('/')[0];
          return parts[1].split('?')[0].split('/')[0];
      }
  }
  if (!clean.includes('/')) {
      return clean.split('?')[0].trim();
  }
  return null;
};

export const fetchChannelVideos = async (username: string, signal?: AbortSignal): Promise<{ videos: TikTokVideo[]; userProfile?: any }> => {
  let allVideos: TikTokVideo[] = [];
  let cursor = 0;
  let hasMore = true;
  let attempts = 0;
  const MAX_VIDEOS = 50; 
  const MAX_REQUESTS = 3; 
  let userProfile = undefined;
  
  let targetHandle = username.replace('@', '').trim();
  let secUid = "";

  try {
      const infoUrl = `https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(targetHandle)}&_rand=${Math.random()}`;
      const infoData = await fetchWithProxyFallback(infoUrl, signal);
      
      if (infoData && infoData.code === 0 && infoData.data && infoData.data.user) {
          secUid = infoData.data.user.secUid;
          userProfile = {
              nickname: infoData.data.user.nickname,
              avatar: infoData.data.user.avatar,
              unique_id: infoData.data.user.unique_id,
              secUid: infoData.data.user.secUid,
              signature: infoData.data.user.signature,
              followingCount: infoData.data.stats?.followingCount,
              followerCount: infoData.data.stats?.followerCount,
              heartCount: infoData.data.stats?.heartCount,
              videoCount: infoData.data.stats?.videoCount
          };
      }
  } catch (e) {
      console.warn("Error fetching user info:", e);
  }

  while (hasMore && allVideos.length < MAX_VIDEOS && attempts < MAX_REQUESTS) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    attempts++;
    
    const queryParam = secUid ? `sec_user_id=${encodeURIComponent(secUid)}` : `unique_id=${encodeURIComponent(targetHandle)}`;
    const targetApiUrl = `https://www.tikwm.com/api/user/posts?${queryParam}&count=33&cursor=${cursor}&hd=1&_rand=${Math.random()}`;
    
    try {
        const data = await fetchWithProxyFallback(targetApiUrl, signal);

        if (data && data.code === 0) {
            const videoList = data.data.videos || [];
            
            if (!userProfile && data.data.author) {
                userProfile = {
                    nickname: data.data.author.nickname,
                    avatar: data.data.author.avatar,
                    unique_id: data.data.author.unique_id
                };
            }

            if (videoList.length === 0) {
                hasMore = false; 
                break; 
            }

            const mappedVideos = videoList.map((d: any) => ({
                id: d.video_id || d.id,
                title: d.title || `Video ${d.id}`,
                author: `@${targetHandle}`,
                thumbnail: d.cover,
                duration: d.duration ? String(d.duration) : '0',
                downloadUrl: d.play,
                musicUrl: d.music,
                coverUrl: d.cover,
                playCount: d.play_count,
                diggCount: d.digg_count,
                commentCount: d.comment_count,
                shareCount: d.share_count,
                isCommerce: d.anchors && d.anchors.length > 0,
                createTime: d.create_time || d.time || 0
            }));

            allVideos = [...allVideos, ...mappedVideos];
            
            if (data.data.cursor && data.data.cursor !== "0" && Number(data.data.cursor) !== cursor) {
                cursor = Number(data.data.cursor);
            } else { 
                hasMore = false; 
            }
        } else { 
            hasMore = false; 
            break;
        }
    } catch (e) {
        console.warn("Channel fetch attempt failed", e);
    }
    if (hasMore) await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const uniqueVideos = Array.from(new Map(allVideos.map(v => [v.id, v])).values());
  return { videos: uniqueVideos, userProfile };
};

export const fetchVideoComments = async (videoId: string, signal?: AbortSignal): Promise<string[]> => {
    try {
        const targetUrl = `https://www.tikwm.com/api/video/comments?video_id=${videoId}&count=20`;
        const data = await fetchWithProxyFallback(targetUrl, signal);
        if (data && data.code === 0 && data.data && data.data.comments) {
            return data.data.comments.map((c: any) => c.text);
        }
    } catch (e) {
        console.warn(`Failed to fetch comments for video ${videoId}`);
    }
    return [];
};

// --- NEW: Generate Market Intelligence (EXPERT VERSION WITH KEYWORD ANALYSIS) ---
export const generateMarketIntelligence = async (topic: string, signal?: AbortSignal): Promise<MarketIntelligenceReport> => {
    try {
        const videos = await searchTikTokVideos(topic, signal);
        
        // Lấy Context từ top videos + mô phỏng comment sâu rộng
        const dataContext = videos.slice(0, 15).map(v => `Title: ${v.title}, Views: ${v.playCount}, Comments: ${v.commentCount}`).join('\n');

        const prompt = `
            ROLE: Senior Strategic Consultant & Market Research Director (Big 4 Consulting Experience).
            TASK: Expert Market Scan for niche: "${topic}".
            
            DATA CONTEXT (Top Videos): 
            ${dataContext}
            
            CORE MISSION: 
            1. Uncover the "Market Paradox" - the specific tension or gap between what brands offer and what customers actually need.
            2. KEYWORD MINING: Analyze "imagined" thousands of comments to extract Top 8-10 recurring keywords/phrases. Calculate their frequency (%) and sentiment.
            3. Define 3 detailed Personas based on behavioral signals in the niche.
            4. Analyze behavioral triggers and barriers.
            5. Provide a logical Action Roadmap.
            
            OUTPUT: Vietnamese. JSON.
        `;

        return await callGeminiWithRetry(async () => {
            const response = await genAI.models.generateContent({
                model: "gemini-3-pro-preview",
                contents: prompt,
                config: {
                    thinkingConfig: { thinkingBudget: 32768 },
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            topic: { type: Type.STRING },
                            executiveSummary: { type: Type.STRING },
                            marketMaturity: { type: Type.STRING, enum: ['Mới nổi', 'Đang bùng nổ', 'Bão hòa', 'Suy thoái'] },
                            marketParadox: { type: Type.STRING },
                            topKeywords: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        word: {type:Type.STRING},
                                        frequency: {type:Type.NUMBER}, // 0-100
                                        sentiment: {type:Type.STRING, enum: ['Tích cực', 'Tiêu cực', 'Trung lập']}
                                    },
                                    required: ["word", "frequency", "sentiment"]
                                }
                            },
                            personas: { 
                                type: Type.ARRAY, 
                                items: { 
                                    type: Type.OBJECT, 
                                    properties: { 
                                        name: {type:Type.STRING}, 
                                        description: {type:Type.STRING}, 
                                        buyingMotives: {type:Type.ARRAY, items: {type:Type.STRING}}, 
                                        mainConcerns: {type:Type.ARRAY, items: {type:Type.STRING}},
                                        contentPreference: {type:Type.STRING} 
                                    },
                                    required: ["name", "description", "buyingMotives", "mainConcerns", "contentPreference"]
                                } 
                            },
                            behavioralAnalysis: {
                                type: Type.OBJECT,
                                properties: {
                                    trigger: {type:Type.STRING},
                                    barrier: {type:Type.STRING},
                                    trustFactor: {type:Type.STRING}
                                },
                                required: ["trigger", "barrier", "trustFactor"]
                            },
                            topPainPoints: { 
                                type: Type.ARRAY, 
                                items: { 
                                    type: Type.OBJECT, 
                                    properties: { 
                                        issue: {type:Type.STRING}, 
                                        description: {type:Type.STRING}, 
                                        impactScore: {type:Type.NUMBER} 
                                    }, 
                                    required: ["issue", "description", "impactScore"] 
                                } 
                            },
                            contentGap: { 
                                type: Type.ARRAY, 
                                items: { 
                                    type: Type.OBJECT, 
                                    properties: { 
                                        opportunity: {type:Type.STRING}, 
                                        reasoning: {type:Type.STRING}, 
                                        difficulty: {type:Type.STRING, enum: ['Dễ', 'Trung bình', 'Khó']} 
                                    }, 
                                    required: ["opportunity", "reasoning", "difficulty"] 
                                } 
                            },
                            uspProposed: { 
                                type: Type.ARRAY, 
                                items: { 
                                    type: Type.OBJECT, 
                                    properties: { 
                                        angle: {type:Type.STRING}, 
                                        explanation: {type:Type.STRING},
                                        hookSample: {type:Type.STRING} 
                                    }, 
                                    required: ["angle", "explanation", "hookSample"] 
                                } 
                            },
                            competitorWeaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                            actionRoadmap: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["topic", "executiveSummary", "marketMaturity", "marketParadox", "topKeywords", "personas", "behavioralAnalysis", "topPainPoints", "contentGap", "uspProposed", "competitorWeaknesses", "actionRoadmap"]
                    }
                }
            });
            if (response.text) return JSON.parse(response.text);
            throw new Error("AI failed to generate market intel");
        });
    } catch (error) { throw error; }
};

// --- REST OF FUNCTIONS REMAIN SAME ---
export const generateKOCAudit = async (username: string, onProgress?: (step: string) => void, signal?: AbortSignal): Promise<KOCAuditReport> => {
    try {
        if (onProgress) onProgress("Đang quét thông tin kênh...");
        const { videos, userProfile } = await fetchChannelVideos(username, signal);
        
        if (videos.length === 0) {
            throw new Error("Không tìm thấy video nào trên kênh này. Có thể tài khoản ở chế độ riêng tư hoặc link không chính xác.");
        }
        
        if (onProgress) onProgress("Đang lấy mẫu comment để kiểm tra seeding...");
        const topVideos = videos.slice(0, 3);
        const commentSamples: string[] = [];
        
        for (const vid of topVideos) {
            if (signal?.aborted) break;
            const comments = await fetchVideoComments(vid.id, signal);
            commentSamples.push(...comments);
            await new Promise(r => setTimeout(r, 500)); 
        }

        if (onProgress) onProgress("AI đang thẩm định chất lượng tương tác...");
        
        const videoDataSummary = videos.slice(0, 10).map(v => `Title: ${v.title}, Views: ${v.playCount}, Likes: ${v.diggCount}, Comments: ${v.commentCount}`).join('\n');
        const commentsText = commentSamples.length > 0 ? commentSamples.join(' | ') : "Không có comment nào để phân tích.";

        const channelStats = userProfile ? `Followers: ${userProfile.followerCount}, Likes: ${userProfile.heartCount}, Videos: ${userProfile.videoCount}` : "N/A";

        const prompt = `
            ROLE: Senior Booking Manager & Data Auditor.
            TASK: Audit KOC/KOL Quality for: "@${username}".
            CHANNEL STATS: ${channelStats}
            LATEST VIDEOS: ${videoDataSummary}
            COMMENT SAMPLES: ${commentsText}
            
            MISSION: 
            1. Detect seeding.
            2. Determine Audience Persona.
            3. Evaluate Buying Power.
            4. Brand Safety.
            
            OUTPUT: Vietnamese. JSON.
        `;

        return await callGeminiWithRetry(async () => {
            const response = await genAI.models.generateContent({
                model: "gemini-3-pro-preview",
                contents: prompt,
                config: {
                    thinkingConfig: { thinkingBudget: 25000 },
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            username: { type: Type.STRING },
                            audienceQualityScore: { type: Type.NUMBER },
                            seedingRate: { type: Type.STRING },
                            audiencePersona: { type: Type.OBJECT, properties: { age: {type:Type.STRING}, gender: {type:Type.STRING}, buyingPower: {type:Type.STRING} }, required: ["age", "gender", "buyingPower"] },
                            brandSafety: { type: Type.OBJECT, properties: { riskLevel: {type:Type.STRING}, warnings: {type:Type.ARRAY, items: {type:Type.STRING}} }, required: ["riskLevel", "warnings"] },
                            commercialFit: { type: Type.ARRAY, items: { type: Type.STRING } },
                            verdict: { type: Type.STRING, enum: ["Recommended", "Caution", "Not Recommended"] },
                            verdictReason: { type: Type.STRING }
                        },
                        required: ["username", "audienceQualityScore", "seedingRate", "audiencePersona", "brandSafety", "commercialFit", "verdict", "verdictReason"]
                    }
                }
            });
            if (response.text) {
                const report = JSON.parse(response.text);
                report.username = username;
                return report;
            }
            throw new Error("AI Audit failed to return content");
        });
    } catch (error) { throw error; }
};

export const generateChannelAnalysis = async (username: string, videos: TikTokVideo[], signal?: AbortSignal): Promise<ChannelAnalysis> => {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  if (!videos || videos.length === 0) {
      throw new Error(`Không tìm thấy video công khai nào của kênh @${username}.`);
  }

  try {
    const sortedVideos = [...videos].sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    const topVideosToAnalyze = sortedVideos.slice(0, 30); 
    const videoDataSummary = topVideosToAnalyze.map((v, index) => 
        `Vid${index+1}: "${v.title}" | Views: ${v.playCount} | Likes: ${v.diggCount} | Commerce: ${v.isCommerce}`
    ).join('\n');

    const prompt = `
      ROLE: TikTok Channel Auditor & Strategist.
      TASK: Audit this TikTok channel (@${username}) based on its top performing videos.
      DATA (Top 30 Videos): ${videoDataSummary}
      OUTPUT: Vietnamese. JSON.
    `;

    return await callGeminiWithRetry(async () => {
        const response = await genAI.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
            thinkingConfig: { thinkingBudget: 32768 },
            responseMimeType: "application/json",
            responseSchema: {
            type: Type.OBJECT,
            properties: {
                username: { type: Type.STRING },
                healthScore: { type: Type.INTEGER },
                healthAnalysis: { type: Type.STRING },
                channelStyle: { type: Type.STRING },
                channelVoice: { type: Type.STRING },
                channelVisuals: { type: Type.ARRAY, items: { type: Type.STRING } },
                contentCategories: { 
                    type: Type.ARRAY, 
                    items: { 
                        type: Type.OBJECT, 
                        properties: { 
                            name: {type:Type.STRING}, 
                            percentage: {type:Type.NUMBER}, 
                            description: {type:Type.STRING} 
                        },
                        required: ["name", "percentage", "description"]
                    } 
                },
                productsServices: { type: Type.ARRAY, items: { type: Type.STRING } },
                contentPillars: { type: Type.ARRAY, items: { type: Type.STRING } },
                audiencePersona: { type: Type.STRING },
                winningFormula: { 
                    type: Type.ARRAY, 
                    items: { 
                        type: Type.OBJECT, 
                        properties: { 
                            videoId: {type:Type.STRING}, 
                            title: {type:Type.STRING}, 
                            reason: {type:Type.STRING}, 
                            performance: {type:Type.STRING} 
                        },
                        required: ["title", "reason", "performance"]
                    } 
                },
                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                strategicAdvice: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["username", "healthScore", "healthAnalysis", "channelStyle", "channelVoice", "channelVisuals", "contentCategories", "productsServices", "contentPillars", "audiencePersona", "winningFormula", "weaknesses", "strategicAdvice"]
            }
        }
        });

        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        if (response.text) {
            const result = JSON.parse(response.text) as ChannelAnalysis;
            result.username = username;
            result.topVideos = sortedVideos.slice(0, 6);
            return result;
        }
        throw new Error("Empty AI response");
    });
  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    throw error;
  }
};

export const generateCompetitorAnalysis = async (
    userA: string, 
    userB: string, 
    videosA: TikTokVideo[], 
    videosB: TikTokVideo[]
): Promise<CompetitorAnalysis> => {
    const calcStats = (videos: TikTokVideo[]) => {
        const totalViews = videos.reduce((sum, v) => sum + (v.playCount || 0), 0);
        const avgViews = totalViews / (videos.length || 1);
        const totalLikes = videos.reduce((sum, v) => sum + (v.diggCount || 0), 0);
        const engagementRate = totalViews > 0 ? (totalLikes / totalViews) * 100 : 0;
        return { totalViews, avgViews, engagementRate };
    };

    const statsA = calcStats(videosA);
    const statsB = calcStats(videosB);

    const prompt = `
        ROLE: Competitor Analysis Expert.
        TASK: Compare Channel A (@${userA}) vs Channel B (@${userB}).
        DATA A: Avg Views ${Math.round(statsA.avgViews)}, Engagement ${statsA.engagementRate.toFixed(2)}%.
        DATA B: Avg Views ${Math.round(statsB.avgViews)}, Engagement ${statsB.engagementRate.toFixed(2)}%.
        OUTPUT: Vietnamese. JSON.
    `;

    return await callGeminiWithRetry(async () => {
        const response = await genAI.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 32768 },
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        channelA: { type: Type.STRING },
                        channelB: { type: Type.STRING },
                        winner: { type: Type.STRING, enum: ["A", "B", "Draw"] },
                        scoreA: { type: Type.NUMBER },
                        scoreB: { type: Type.NUMBER },
                        analyzedVideoCount: { type: Type.NUMBER },
                        timeRange: { type: Type.STRING },
                        metrics: { 
                            type: Type.ARRAY, 
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    category: { type: Type.STRING, enum: ["Chiến Lược", "Sản Phẩm", "Hiệu Suất"] },
                                    metricName: { type: Type.STRING },
                                    valueA: { type: Type.STRING },
                                    valueB: { type: Type.STRING },
                                    benchmark: { type: Type.STRING },
                                    winner: { type: Type.STRING, enum: ["A", "B", "Draw"] },
                                    explanation: { type: Type.STRING },
                                    isCritical: { type: Type.BOOLEAN }
                                },
                                required: ["category", "metricName", "valueA", "valueB", "benchmark", "winner", "explanation", "isCritical"]
                            }
                        },
                        keyFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
                        todoTimeline: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    week: { type: Type.NUMBER },
                                    focus: { type: Type.STRING },
                                    tasks: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                task: { type: Type.STRING },
                                                role: { type: Type.STRING },
                                                kpi: { type: Type.STRING }
                                            },
                                            required: ["task", "role", "kpi"]
                                        }
                                    }
                                },
                                required: ["week", "focus", "tasks"]
                            }
                        }
                    },
                    required: ["channelA", "channelB", "winner", "scoreA", "scoreB", "analyzedVideoCount", "timeRange", "metrics", "keyFindings", "todoTimeline"]
                }
            }
        });

        if (response.text) {
             const result = JSON.parse(response.text) as CompetitorAnalysis;
             result.channelA = userA;
             result.channelB = userB;
             result.analyzedVideoCount = videosA.length + videosB.length;
             return result;
        }
        throw new Error("Competitor Analysis Failed");
    });
};

export const searchTikTokVideos = async (query: string, signal?: AbortSignal): Promise<TikTokVideo[]> => {
    try {
        const targetApiUrl = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}&count=20&cursor=0&hd=1`;
        const data = await fetchWithProxyFallback(targetApiUrl, signal);

        if (data && data.code === 0 && data.data && data.data.videos) {
            return data.data.videos.map((d: any) => ({
                id: d.video_id || d.id,
                title: d.title || `Video ${d.id}`,
                author: d.author ? `@${d.author.unique_id}` : "@unknown",
                thumbnail: d.cover,
                duration: d.duration ? String(d.duration) : '0',
                downloadUrl: d.play,
                musicUrl: d.music,
                coverUrl: d.cover,
                playCount: d.play_count,
                diggCount: d.digg_count,
                commentCount: d.comment_count,
                shareCount: d.share_count,
                isCommerce: d.anchors && d.anchors.length > 0,
                createTime: d.create_time || d.time || 0
            }));
        }
    } catch (e: any) {
         if (e.name === 'AbortError') throw e;
         console.warn("Search API error", e);
    }
    return [];
};

export const generateSearchStrategy = async (scriptDescription: string): Promise<SearchStrategy> => {
    const prompt = `
        ROLE: TikTok SEO Specialist.
        TASK: Convert script idea into search strategy.
        INPUT: "${scriptDescription}"
        OUTPUT: Vietnamese. JSON.
    `;
    
    return await callGeminiWithRetry(async () => {
         const response = await genAI.models.generateContent({
             model: "gemini-3-pro-preview",
             contents: prompt,
             config: {
                 thinkingConfig: { thinkingBudget: 32768 },
                 responseMimeType: "application/json",
                 responseSchema: {
                     type: Type.OBJECT,
                     properties: {
                         searchQuery: { type: Type.STRING },
                         relatedHashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                         visualCues: { type: Type.ARRAY, items: { type: Type.STRING } },
                         audioCues: { type: Type.ARRAY, items: { type: Type.STRING } },
                         targetMood: { type: Type.STRING }
                     }
                 }
             }
         });
         
         if (response.text) return JSON.parse(response.text);
         throw new Error("Failed to generate strategy");
    });
};

export const aiRankVideoRelevance = async (
    strategy: SearchStrategy, 
    videos: TikTokVideo[], 
    signal: AbortSignal,
    onProgress?: (count: number) => void
): Promise<RankedVideo[]> => {
    const batchSize = 5;
    const rankedVideos: RankedVideo[] = [];
    
    for (let i = 0; i < videos.length; i += batchSize) {
        if (signal.aborted) break;
        const batch = videos.slice(i, i + batchSize);
        
        const batchPrompt = `
            ROLE: Video Relevance AI.
            STRATEGY: Mood: ${strategy.targetMood}, Visuals: ${strategy.visualCues.join(', ')}
            TASK: Rate relevance (0-100) and summarize script.
            VIDEOS: ${batch.map((v, idx) => `Video ${idx}: "${v.title}"`).join('\n')}
            OUTPUT: JSON Array.
        `;
        
        try {
            const response = await callGeminiWithRetry(async () => {
                return await genAI.models.generateContent({
                    model: "gemini-3-pro-preview",
                    contents: batchPrompt,
                    config: {
                        thinkingConfig: { thinkingBudget: 10000 },
                        responseMimeType: "application/json",
                        responseSchema: {
                             type: Type.ARRAY,
                             items: {
                                 type: Type.OBJECT,
                                 properties: {
                                     index: { type: Type.NUMBER },
                                     relevanceScore: { type: Type.NUMBER },
                                     matchReason: { type: Type.STRING },
                                     scriptSummary: { type: Type.STRING }
                                 }
                             }
                        }
                    }
                });
            });
            
            if (response.text) {
                const results = JSON.parse(response.text);
                results.forEach((res: any) => {
                    if (batch[res.index]) {
                        rankedVideos.push({
                            ...batch[res.index],
                            relevanceScore: res.relevanceScore,
                            matchReason: res.matchReason,
                            scriptSummary: res.scriptSummary
                        });
                    }
                });
            }
        } catch (e) {
            batch.forEach(v => rankedVideos.push({ ...v, relevanceScore: 0, matchReason: "Analysis Failed" }));
        }
        
        if (onProgress) onProgress(Math.min(videos.length, i + batchSize));
    }
    
    return rankedVideos.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
};

export const generateVideoAnalysis = async (video: TikTokVideo, signal?: AbortSignal): Promise<ContentAnalysis> => {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  
  let mediaBase64: string | null = null;
  let mimeType = "";
  let mode: 'video' | 'image' = 'video';

  if (video.downloadUrl) {
      try {
          const blob = await fetchBinaryWithProxyFallback(video.downloadUrl, signal);
          if (blob && blob.size < 25 * 1024 * 1024) { 
              mediaBase64 = await blobToBase64(blob);
              mimeType = "video/mp4";
              mode = 'video';
          }
      } catch (err) { console.warn("Video download failed.", err); }
  }

  if (!mediaBase64 && video.thumbnail) {
      try {
          const blob = await fetchBinaryWithProxyFallback(video.thumbnail, signal);
          if (blob) {
              mediaBase64 = await blobToBase64(blob);
              mimeType = blob.type.startsWith('image/') ? blob.type : 'image/jpeg'; 
              mode = 'image';
          }
      } catch (err) { console.warn("Image download failed.", err); }
  }

  try {
    const scoringRules = ` hookScore (INT 0-10), viralScore (INT 0-10). `;
    const scriptDoctorRule = `If hookScore < 8, generate 3 new hooks (Nỗi đau, Tò mò, Lợi ích) and a body structure optimization (AIDA or PAS). Use Vietnamese natural slang.`;
    const prompt = `
        ROLE: Senior TikTok Creator & Specialist (10 years exp).
        TASK: Analyze: "${video.title}" by ${video.author}. Views: ${video.playCount}. 
        MISSION: Act as 'AI Script Doctor'. Provide actionable suggestions to improve retention and viral potential.
        RULES:
        - Natural, conversational Vietnamese (không dùng văn phong báo chí).
        - Targeted at target audience insight.
        - ${scoringRules}
        - ${scriptDoctorRule}
        OUTPUT: Vietnamese. JSON.
    `;

    return await callGeminiWithRetry(async () => {
        const response = await genAI.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: { parts: [
                ...(mediaBase64 ? [{ inlineData: { mimeType, data: mediaBase64 } }] : []),
                { text: prompt }
            ] },
            config: {
                thinkingConfig: { thinkingBudget: 25000 },
                responseMimeType: "application/json",
                responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING },
                    niche: { type: Type.STRING },
                    hookScore: { type: Type.INTEGER },
                    hookAnalysis: { type: Type.STRING },
                    structure: { type: Type.ARRAY, items: { type: Type.STRING } },
                    scriptTable: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                        scene: { type: Type.STRING },
                        visual: { type: Type.STRING },
                        audio: { type: Type.STRING }
                        },
                        required: ["scene", "visual", "audio"]
                    }
                    },
                    style: { type: Type.STRING },
                    voice: { type: Type.STRING },
                    visualHooks: { type: Type.ARRAY, items: { type: Type.STRING } },
                    viralScore: { type: Type.INTEGER },
                    improvementTips: { type: Type.ARRAY, items: { type: Type.STRING } },
                    salesEstimate: {
                        type: Type.OBJECT,
                        properties: {
                            estimatedOrders: { type: Type.STRING },
                            revenuePotential: { type: Type.STRING, enum: ["Cao", "Trung bình", "Thấp"] },
                            conversionRate: { type: Type.STRING },
                            reasoning: { type: Type.STRING }
                        },
                        required: ["estimatedOrders", "revenuePotential", "conversionRate", "reasoning"]
                    },
                    scriptDoctor: {
                        type: Type.OBJECT,
                        properties: {
                            newHooks: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        type: { type: Type.STRING },
                                        content: { type: Type.STRING }
                                    },
                                    required: ["type", "content"]
                                }
                            },
                            bodyOptimization: {
                                type: Type.OBJECT,
                                properties: {
                                    framework: { type: Type.STRING },
                                    suggestion: { type: Type.STRING }
                                },
                                required: ["framework", "suggestion"]
                            }
                        },
                        required: ["newHooks", "bodyOptimization"]
                    }
                },
                required: ["summary", "niche", "hookScore", "hookAnalysis", "structure", "scriptTable", "style", "voice", "visualHooks", "viralScore", "improvementTips"]
                }
            }
        });

        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        if (response.text) return JSON.parse(response.text) as ContentAnalysis;
        throw new Error("Empty response");
    });

  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    return {
      summary: "Cannot analyze content (DRM/Private).", 
      niche: "Unknown", hookScore: 0, hookAnalysis: "No Data", structure: [], 
      scriptTable: [], style: "N/A", voice: "N/A", visualHooks: [], viralScore: 0, 
      improvementTips: ["Check privacy settings"]
    };
  }
};

export const reEditVideoScript = async (originalScript: ScriptItem[]): Promise<{script: ScriptItem[], reasoning: string}> => {
    try {
        const prompt = `ROLE: Master Video Editor. TASK: "Remix" script to improve retention. Vietnamese. JSON. SCRIPT: ${JSON.stringify(originalScript)}`;

        const response = await callGeminiWithRetry(async () => {
            return await genAI.models.generateContent({
                model: "gemini-3-pro-preview",
                contents: prompt,
                config: {
                    thinkingConfig: { thinkingBudget: 15000 },
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            script: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        scene: { type: Type.STRING },
                                        visual: { type: Type.STRING },
                                        audio: { type: Type.STRING }
                                    },
                                    required: ["scene", "visual", "audio"]
                                }
                            },
                            reasoning: { type: Type.STRING }
                        },
                        required: ["script", "reasoning"]
                    }
                }
            });
        });

        if (response.text) return JSON.parse(response.text);
        throw new Error("Empty AI response");
    } catch (error) { throw error; }
};

export const generateSimilarContent = async (analysis: ContentAnalysis, newProductName: string, productInfo: string): Promise<RemixContent> => {
    try {
        const prompt = `ROLE: TikTok Creative. TASK: Rewrite script for: "${newProductName}". Vietnamese. JSON.`;

        const response = await callGeminiWithRetry(async () => {
            return await genAI.models.generateContent({
                model: "gemini-3-pro-preview",
                contents: prompt,
                config: {
                    thinkingConfig: { thinkingBudget: 20000 },
                    responseMimeType: "application/json",
                    maxOutputTokens: 8192,
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            productName: { type: Type.STRING },
                            title: { type: Type.STRING },
                            hooks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, content: { type: Type.STRING } } } },
                            visualTrends: { type: Type.ARRAY, items: { type: Type.STRING } },
                            thumbnailIdeas: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { concept: { type: Type.STRING }, textOverlay: { type: Type.STRING }, color: { type: Type.STRING }, visualDescription: { type: Type.STRING } } } },
                            scriptTable: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { scene: { type: Type.STRING }, visual: { type: Type.STRING }, audio: { type: Type.STRING } } } },
                            filmingNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
                            whyItWorks: { type: Type.STRING }
                        },
                        required: ["productName", "title", "hooks", "visualTrends", "thumbnailIdeas", "scriptTable", "filmingNotes", "whyItWorks"]
                    }
                }
            });
        });

        if (response.text) return JSON.parse(response.text) as RemixContent;
        throw new Error("Empty AI response");
    } catch (error) { throw error; }
};

export const analyzeNicheTrends = async (niche: string, signal?: AbortSignal): Promise<TrendReport> => {
    try {
        const query = `#xuhuong ${niche}`;
        const videos = await searchTikTokVideos(query, signal);
        if (videos.length === 0) throw new Error("No data found.");
        const candidates = videos.slice(0, 15);
        
        const prompt = `ROLE: Trend Hunter. TASK: Analyze trends in "${niche}". Vietnamese. JSON. DATA: ${candidates.map(v => v.title).join(', ')}`;

        const response = await callGeminiWithRetry(async () => {
             return await genAI.models.generateContent({
                model: "gemini-3-pro-preview",
                contents: prompt,
                config: {
                    thinkingConfig: { thinkingBudget: 20000 },
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            niche: { type: Type.STRING },
                            overallVibe: { type: Type.STRING },
                            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                            trends: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        id: { type: Type.STRING },
                                        name: { type: Type.STRING },
                                        type: { type: Type.STRING },
                                        explosionScore: { type: Type.NUMBER },
                                        growthRate: { type: Type.STRING },
                                        description: { type: Type.STRING },
                                        viralFactors: { 
                                            type: Type.ARRAY, 
                                            items: { 
                                                type: Type.OBJECT, 
                                                properties: { 
                                                    type: { type: Type.STRING, enum: ['Emotional', 'Practical', 'Social'] },
                                                    description: { type: Type.STRING },
                                                    intensity: { type: Type.NUMBER }
                                                }
                                            }
                                        },
                                        exampleVideoIds: { type: Type.ARRAY, items: { type: Type.STRING } }
                                    }
                                }
                            }
                        },
                        required: ["niche", "overallVibe", "keywords", "trends"]
                    }
                }
             });
        });

        if (response.text) {
             const report = JSON.parse(response.text) as TrendReport;
             report.topVideos = candidates; 
             return report;
        }
        throw new Error("AI Analysis Failed");
    } catch (error) { throw error; }
};

export const generateAudiencePulse = async (topic: string, signal?: AbortSignal): Promise<AudienceInsight> => {
    try {
        const videos = await searchTikTokVideos(topic, signal);
        if (videos.length === 0) throw new Error("Không tìm thấy dữ liệu mẫu cho chủ đề này.");
        const topVideos = videos.slice(0, 15);
        const contextData = topVideos.map(v => `- "${v.title}" (${v.playCount} views)`).join('\n');

        const prompt = `
            ROLE: Senior Strategic Deep Research Analyst & Consumer Psychologist.
            TASK: Perform a DEEP RESEARCH analysis on the audience interested in: "${topic}".
            CONTEXT DATA (Latest TikTok Trends):
            ${contextData}
            
            GOAL:
            - Analyze latent motives.
            - Create detailed personas.
            
            LANGUAGE: VIETNAMESE (Tiếng Việt).
            OUTPUT: Strict JSON based on the provided schema.
        `;

        const response = await callGeminiWithRetry(async () => {
             return await genAI.models.generateContent({
                model: "gemini-3-pro-preview",
                contents: prompt,
                config: {
                    thinkingConfig: { thinkingBudget: 32768 }, 
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            topic: { type: Type.STRING },
                            summary: {
                                type: Type.OBJECT,
                                properties: {
                                    topOpportunity: { type: Type.STRING },
                                    criticalWarning: { type: Type.STRING },
                                    keyStrength: { type: Type.STRING }
                                },
                                required: ["topOpportunity", "criticalWarning", "keyStrength"]
                            },
                            personas: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        name: { type: Type.STRING },
                                        percentage: { type: Type.NUMBER }, 
                                        ageRange: { type: Type.STRING },
                                        description: { type: Type.STRING },
                                        painPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                                        buyingTriggers: { type: Type.ARRAY, items: { type: Type.STRING } },
                                        interestScore: { type: Type.NUMBER },
                                        strategy: {
                                            type: Type.OBJECT,
                                            properties: {
                                                hook: { type: Type.STRING },
                                                format: { type: Type.STRING },
                                                postingTime: { type: Type.STRING },
                                                keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
                                            },
                                            required: ["hook", "format", "postingTime", "keywords"]
                                        },
                                        journey: {
                                            type: Type.OBJECT,
                                            properties: {
                                                awareness: { type: Type.STRING },
                                                consideration: { type: Type.STRING },
                                                decision: { type: Type.STRING }
                                            },
                                            required: ["awareness", "consideration", "decision"]
                                        }
                                    },
                                    required: ["name", "percentage", "ageRange", "description", "painPoints", "buyingTriggers", "interestScore", "strategy", "journey"]
                                }
                            },
                            contentGaps: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        topic: { type: Type.STRING },
                                        demandLevel: { type: Type.NUMBER }, 
                                        competitionLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
                                        opportunityScore: { type: Type.NUMBER }, 
                                        suggestion: { type: Type.STRING }
                                    },
                                    required: ["topic", "demandLevel", "competitionLevel", "opportunityScore", "suggestion"]
                                }
                            },
                            sentimentAnalysis: {
                                type: Type.OBJECT,
                                properties: {
                                    positive: { type: Type.STRING },
                                    negative: { type: Type.STRING },
                                    dominantEmotion: { type: Type.STRING }
                                },
                                required: ["positive", "negative", "dominantEmotion"]
                            },
                            contentCalendar30Days: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        week: { type: Type.INTEGER },
                                        focus: { type: Type.STRING },
                                        ideas: { type: Type.ARRAY, items: { type: Type.STRING } }
                                    },
                                    required: ["week", "focus", "ideas"]
                                }
                            }
                        },
                        required: ["topic", "summary", "personas", "contentGaps", "sentimentAnalysis", "contentCalendar30Days"]
                    }
                }
             });
        });

        if (response.text) return JSON.parse(response.text) as AudienceInsight;
        throw new Error("AI Audience Analysis Failed");
    } catch (error) { throw error; }
};

export const generateBatchSummary = async (items: {video: TikTokVideo, analysis: ContentAnalysis}[], signal?: AbortSignal): Promise<BatchSummaryAnalysis> => {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  try {
    const prompt = `ROLE: Content Director. TASK: Strategic summary of ${items.length} videos. Vietnamese. JSON.`;

    return await callGeminiWithRetry(async () => {
        const response = await genAI.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
            thinkingConfig: { thinkingBudget: 25000 },
            responseMimeType: "application/json",
            responseSchema: {
            type: Type.OBJECT,
            properties: {
                username: { type: Type.STRING },
                healthScore: { type: Type.INTEGER },
                healthAnalysis: { type: Type.STRING },
                channelStyle: { type: Type.STRING },
                channelVoice: { type: Type.STRING },
                channelVisuals: { type: Type.ARRAY, items: { type: Type.STRING } },
                contentCategories: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: {type:Type.STRING}, percentage: {type:Type.NUMBER}, description: {type:Type.STRING} }, required: ["name", "percentage"] } },
                productsServices: { type: Type.ARRAY, items: { type: Type.STRING } },
                contentPillars: { type: Type.ARRAY, items: { type: Type.STRING } },
                audiencePersona: { type: Type.STRING },
                winningFormula: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { videoId: {type:Type.STRING}, title: {type:Type.STRING}, reason: {type:Type.STRING}, performance: {type:Type.STRING} }, required: ["title", "reason"] } },
                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                strategicAdvice: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["username", "healthScore", "healthAnalysis", "channelStyle", "channelVoice", "channelVisuals", "contentCategories", "productsServices", "contentPillars", "audiencePersona", "winningFormula", "weaknesses", "strategicAdvice"]
            }
        }
        });

        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        if (response.text) {
            const result = JSON.parse(response.text) as BatchSummaryAnalysis;
            result.topVideos = items.slice(0, 6).map(i => i.video);
            return result;
        }
        throw new Error("Empty response");
    });
  } catch (error: any) {
     if (error.name === 'AbortError') throw error;
     throw error;
  }
};

export const analyzeCaseStudy = async (video: TikTokVideo, signal?: AbortSignal): Promise<CaseStudy> => {
    const prompt = `ROLE: Marketing Case Study. Analyze: "${video.title}". Vietnamese. JSON.`;
    try {
        const response = await callGeminiWithRetry(async () => {
             return await genAI.models.generateContent({
                model: "gemini-3-pro-preview",
                contents: prompt,
                config: {
                    thinkingConfig: { thinkingBudget: 15000 },
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            niche: { type: Type.STRING },
                            whyItViral: { type: Type.OBJECT, properties: { hook: { type: Type.STRING }, timing: { type: Type.STRING }, emotion: { type: Type.STRING } }, required: ["hook", "timing", "emotion"] },
                            smartTemplate: { type: Type.OBJECT, properties: { structure: { type: Type.ARRAY, items: { type: Type.STRING } }, tips: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["structure", "tips"] }
                        },
                        required: ["niche", "whyItViral", "smartTemplate"]
                    }
                }
             });
        });

        if (response.text) {
             const result = JSON.parse(response.text);
             return {
                 id: Date.now().toString(),
                 videoData: video,
                 niche: result.niche,
                 month: new Date().toISOString().slice(0, 7), 
                 whyItViral: result.whyItViral,
                 smartTemplate: result.smartTemplate,
                 savedAt: Date.now()
             };
        }
        throw new Error("AI Case Study Failed");
    } catch (error: any) {
        if (error.name === 'AbortError') throw error;
        throw error;
    }
};
