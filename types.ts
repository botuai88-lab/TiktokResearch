
export interface TikTokVideo {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  duration?: string;
  downloadUrl: string;
  musicUrl?: string; // URL for the audio track
  coverUrl: string;
  playCount?: number; // Estimated or actual views if available
  diggCount?: number; // Likes
  commentCount?: number;
  shareCount?: number;
  isCommerce?: boolean; // True if video has shopping cart/anchors
  createTime?: number; // Unix timestamp for Date Posted
}

export interface RankedVideo extends TikTokVideo {
  relevanceScore?: number;
  matchReason?: string;
  scriptSummary?: string; // New: AI predicted summary of the video script (short)
}

export interface ScriptItem {
  scene: string; // Số cảnh hoặc Tiêu đề cảnh
  visual: string; // Mô tả hình ảnh
  audio: string; // Lời thoại/Âm thanh
}

export interface SalesEstimate {
  estimatedOrders: string; // E.g., "100 - 500 orders"
  revenuePotential: string; // E.g., "High", "Medium", "Low"
  conversionRate: string; // E.g., "0.5% - 1.2%"
  reasoning: string; // Why AI thinks this
}

export interface ScriptDoctorResult {
  newHooks: {
    type: "Nỗi đau" | "Tò mò" | "Lợi ích";
    content: string;
  }[];
  bodyOptimization: {
    framework: "PAS" | "AIDA";
    suggestion: string;
  };
}

export interface ReEditResult {
    script: ScriptItem[];
    reasoning: string;
}

export interface RemixContent {
  productName: string;
  title: string;
  hooks: {
      type: string;
      content: string;
  }[];
  visualTrends: string[];
  thumbnailIdeas: {
      concept: string;
      textOverlay: string;
      color: string;
      visualDescription: string;
  }[];
  scriptTable: ScriptItem[];
  filmingNotes: string[];
  whyItWorks: string;
}

export interface ContentAnalysis {
  summary: string;
  niche: string;
  hookScore: number;
  hookAnalysis: string;
  structure: string[];
  fullScript?: string;
  scriptTable?: ScriptItem[];
  viralScore: number;
  improvementTips: string[];
  style: string;
  voice: string;
  visualHooks: string[];
  salesEstimate?: SalesEstimate; 
  reEditedScript?: ReEditResult;
  remixContent?: RemixContent;
  scriptDoctor?: ScriptDoctorResult;
}

export interface AnalysisHistoryItem {
  id: string;
  video?: TikTokVideo;
  channel?: { username: string; avatar: string };
  competitor?: { channelA: string; channelB: string };
  analysis: ContentAnalysis | ChannelAnalysis | CompetitorAnalysis | MarketIntelligenceReport | KOCAuditReport;
  type: 'video' | 'channel' | 'batch_summary' | 'competitor' | 'market_intel' | 'koc_audit';
  timestamp: number;
}

// --- UPDATED: MARKET INTELLIGENCE TYPES (Expert Version) ---
export interface MarketPersona {
    name: string;
    description: string;
    buyingMotives: string[];
    mainConcerns: string[];
    contentPreference: string; 
}

export interface MarketIntelligenceReport {
    topic: string;
    executiveSummary: string;
    marketMaturity: 'Mới nổi' | 'Đang bùng nổ' | 'Bão hòa' | 'Suy thoái';
    marketParadox: string; 
    
    // NEW: Keyword Analysis
    topKeywords: {
        word: string;
        frequency: number; // Percentage 0-100
        sentiment: 'Tích cực' | 'Tiêu cực' | 'Trung lập';
    }[];

    // Deep Persona & Behavior
    personas: MarketPersona[];
    behavioralAnalysis: {
        trigger: string; 
        barrier: string; 
        trustFactor: string; 
    };

    // Strategic Insights
    topPainPoints: {
        issue: string;
        description: string;
        impactScore: number; 
    }[];
    contentGap: {
        opportunity: string;
        reasoning: string;
        difficulty: 'Dễ' | 'Trung bình' | 'Khó';
    }[];
    uspProposed: {
        angle: string;
        explanation: string;
        hookSample: string;
    }[];
    competitorWeaknesses: string[];
    actionRoadmap: string[]; 
}

export interface KOCAuditReport {
    username: string;
    audienceQualityScore: number;
    seedingRate: string;
    audiencePersona: {
        age: string;
        gender: string;
        buyingPower: string;
    };
    brandSafety: {
        riskLevel: 'Low' | 'Medium' | 'High';
        warnings: string[];
    };
    commercialFit: string[];
    verdict: 'Recommended' | 'Caution' | 'Not Recommended';
    verdictReason: string;
}

export interface WinningContent {
  videoId: string;
  title: string;
  reason: string;
  performance: string;
}

export interface ChannelCategory {
  name: string;
  percentage: number;
  description: string;
}

export interface ChannelAnalysis {
  username: string;
  healthScore: number;
  healthAnalysis: string;
  channelStyle: string;
  channelVoice: string;
  channelVisuals: string[];
  contentCategories: ChannelCategory[];
  productsServices: string[];
  contentPillars: string[];
  audiencePersona: string;
  topVideos: TikTokVideo[];
  winningFormula: WinningContent[];
  weaknesses: string[];
  strategicAdvice: string[];
}

export type BatchSummaryAnalysis = ChannelAnalysis;

export interface CompetitorMetric {
    category: 'Chiến Lược' | 'Sản Phẩm' | 'Hiệu Suất';
    metricName: string;
    valueA: string;
    valueB: string;
    benchmark: string;
    winner: 'A' | 'B' | 'Draw';
    explanation: string;
    isCritical: boolean;
}

export interface TodoTask {
    task: string;
    role: string;
    kpi: string;
}

export interface CompetitorAnalysis {
    channelA: string;
    channelB: string;
    winner: 'A' | 'B' | 'Draw';
    scoreA: number;
    scoreB: number;
    analyzedVideoCount: number;
    timeRange: string;
    metrics: CompetitorMetric[];
    keyFindings: string[];
    todoTimeline: {
        week: number;
        focus: string;
        tasks: TodoTask[];
    }[];
}

export interface SearchStrategy {
  searchQuery: string;
  relatedHashtags: string[];
  visualCues: string[];
  audioCues: string[];
  targetMood: string;
}

export interface ViralFactor {
    type: 'Emotional' | 'Practical' | 'Social';
    description: string;
    intensity: number;
}

export interface LifecycleForecast {
    phase: 'Emerging' | 'Exploding' | 'Peaking' | 'Declining';
    peakTime: string;
    bestPostTime: string;
    decayWarning: boolean;
}

export interface ActionPlan {
    timeline: '24h' | '48h' | '72h';
    action: string;
    formatSuggestion: string;
}

export interface TrendStats {
    totalReach: string;
    competitionLevel: 'Low' | 'Medium' | 'High' | 'Saturated';
    topNiche: string;
}

export interface TrendItem {
    id: string;
    name: string;
    type: 'Audio' | 'Challenge' | 'Visual' | 'Topic';
    explosionScore: number;
    growthRate: string;
    growthChartData: number[];
    description: string;
    viralFactors: ViralFactor[];
    hookTactics: string[];
    lifecycle: LifecycleForecast;
    actionPlan: ActionPlan[];
    stats: TrendStats;
    similarPastTrend: string;
    exampleVideoIds: string[];
}

export interface TrendReport {
    niche: string;
    overallVibe: string;
    trends: TrendItem[];
    keywords: string[];
    topVideos: TikTokVideo[];
}

export interface PersonaStrategy {
    hook: string;
    format: string;
    postingTime: string;
    keywords: string[];
}

export interface AudiencePersona {
    name: string; 
    percentage: number;
    ageRange: string;
    description: string;
    painPoints: string[];
    buyingTriggers: string[];
    interestScore: number;
    strategy: PersonaStrategy;
    journey: {
        awareness: string;
        consideration: string;
        decision: string;
    };
}

export interface ContentGap {
    topic: string;
    demandLevel: number;
    competitionLevel: 'Low' | 'Medium' | 'High';
    opportunityScore: number;
    suggestion: string;
}

export interface ExecutiveSummary {
    topOpportunity: string;
    criticalWarning: string;
    keyStrength: string;
}

export interface AudienceInsight {
    topic: string;
    summary: ExecutiveSummary;
    personas: AudiencePersona[];
    contentGaps: ContentGap[];
    sentimentAnalysis: {
        positive: string; 
        negative: string; 
        dominantEmotion: string; 
    };
    contentCalendar30Days: {
        week: number;
        focus: string;
        ideas: string[];
    }[];
}

export interface CaseStudy {
    id: string;
    videoData: TikTokVideo;
    niche: string;
    month: string;
    whyItViral: {
        hook: string;
        timing: string;
        emotion: string;
    };
    smartTemplate: {
        structure: string[];
        tips: string[];
    };
    savedAt: number;
}

export interface ROIRecord {
    id: string;
    videoId: string;
    videoTitle: string;
    thumbnail: string;
    views: number;
    productionCost: number;
    revenue: number;
    orders: number;
    cpa: number;
    roas: number;
    conversionRate: number;
    status: 'Good' | 'Warning' | 'Critical';
    date: string;
}
