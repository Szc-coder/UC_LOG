import { useState, useEffect, Component, type ReactNode } from 'react';
import { GlassCard, GlassButton, useToast } from '../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FileText, Printer, Calendar, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Pill, Apple, Activity, History, Trash2, Eye } from 'lucide-react';
import { callAI, getAIConfig, extractJSON } from '../services/ai';
import { invoke } from '@tauri-apps/api/core';

// ── Error Boundary ──────────────────────────────────────────
interface EBState { hasError: boolean; error: Error | null; }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: any) { console.error('[ReportPage] ErrorBoundary caught:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <GlassCard>
          <div className="flex items-center gap-3 text-red-600 p-4">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">报告渲染出错</p>
              <p className="text-xs text-gray-500 mt-1">{this.state.error?.message}</p>
              <button className="mt-2 text-xs text-teal-600 underline" onClick={() => this.setState({ hasError: false, error: null })}>重试</button>
            </div>
          </div>
        </GlassCard>
      );
    }
    return this.props.children;
  }
}

// ── Types ───────────────────────────────────────────────────
interface ReportData {
  period: string;
  overallAssessment: 'improving' | 'stable' | 'worsening';
  stoolSummary: { avgDaily: number; trend: string; bloodDays: number; bristolDistribution: { type: string; count: number }[] };
  symptomSummary: { avgPain: number; painDays: number; extraintestinal: string[] };
  dietTolerance: { safe: string[]; caution: string[]; avoid: string[] };
  medicationAdherence: { overall: number; details: { name: string; adherence: number }[] };
  aiQuestions: string[];
  nextSteps: string[];
}
interface ReportSummary { id: string; created_at: string; }
interface ChartData {
  stoolTrend: { date: string; count: number; blood: number }[];
  symptomTrend: { date: string; wellbeing: number; pain: number }[];
  medAdherence: { name: string; taken: number; total: number; rate: number }[];
  bristolDist: { type: string; count: number }[];
}

/** Map any LLM response shape to the expected ReportData interface */
function normalizeReport(raw: any): ReportData | null {
  if (!raw || typeof raw !== 'object') return null;

  // Helper: find a value by trying multiple key candidates
  const findVal = (obj: any, ...keys: string[]) => {
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return undefined;
  };

  // Helper: ensure array
  const ensureArr = (val: any): any[] => Array.isArray(val) ? val : [];

  // 1. overallAssessment — may be overall_assessment, assessment, status, etc.
  const rawAssessment = findVal(raw, 'overallAssessment', 'overall_assessment', 'assessment', 'status', '整体评估', '趋势评估') || 'stable';
  let overallAssessment: 'improving' | 'stable' | 'worsening' = 'stable';
  const assessStr = String(rawAssessment).toLowerCase();
  if (assessStr.includes('improv') || assessStr.includes('好转') || assessStr.includes('改善')) overallAssessment = 'improving';
  else if (assessStr.includes('worsen') || assessStr.includes('恶化') || assessStr.includes('加重')) overallAssessment = 'worsening';

  // 2. period
  const period = findVal(raw, 'period', '报告周期', '时间范围', 'dateRange', 'date_range') || '';

  // 3. stoolSummary
  const rawStool = findVal(raw, 'stoolSummary', 'stool_summary', '排便', '排便趋势', 'stool', 'bowel') || {};
  const stoolSummary = {
    avgDaily: Number(findVal(rawStool, 'avgDaily', 'avg_daily', '日均', 'average', 'avg') ?? 0),
    trend: String(findVal(rawStool, 'trend', '趋势', 'direction') ?? ''),
    bloodDays: Number(findVal(rawStool, 'bloodDays', 'blood_days', '便血天数', 'blood') ?? 0),
    bristolDistribution: ensureArr(findVal(rawStool, 'bristolDistribution', 'bristol_distribution', 'bristol', '布里斯托分布', 'distribution')).map((item: any) => ({
      type: String(findVal(item, 'type', '类型', 'name', 'bristol_type') ?? ''),
      count: Number(findVal(item, 'count', '数量', 'value', '次数') ?? 0),
    })),
  };

  // 4. symptomSummary
  const rawSymptom = findVal(raw, 'symptomSummary', 'symptom_summary', '症状', '症状摘要', 'symptoms') || {};
  const symptomSummary = {
    avgPain: Number(findVal(rawSymptom, 'avgPain', 'avg_pain', '平均腹痛', 'pain_avg', 'pain') ?? 0),
    painDays: Number(findVal(rawSymptom, 'painDays', 'pain_days', '腹痛天数') ?? 0),
    extraintestinal: ensureArr(findVal(rawSymptom, 'extraintestinal', '肠外表现', 'extra', 'other_symptoms')).map(String),
  };

  // 5. dietTolerance
  const rawDiet = findVal(raw, 'dietTolerance', 'diet_tolerance', '饮食', '饮食耐受', 'diet', 'food') || {};
  const dietTolerance = {
    safe: ensureArr(findVal(rawDiet, 'safe', '安全', 'safe_foods', 'tolerated')).map(String),
    caution: ensureArr(findVal(rawDiet, 'caution', '谨慎', 'caution_foods', 'moderate')).map(String),
    avoid: ensureArr(findVal(rawDiet, 'avoid', '避免', 'avoid_foods', 'trigger')).map(String),
  };

  // 6. medicationAdherence
  const rawMed = findVal(raw, 'medicationAdherence', 'medication_adherence', '用药', '用药依从', 'medication', 'adherence') || {};
  const medicationAdherence = {
    overall: Number(findVal(rawMed, 'overall', '整体', 'total', 'rate', 'percentage') ?? 0),
    details: ensureArr(findVal(rawMed, 'details', '详情', 'medications', 'drugs', 'items')).map((item: any) => ({
      name: String(findVal(item, 'name', '药物', 'medication', 'drug') ?? ''),
      adherence: Number(findVal(item, 'adherence', '依从率', 'rate', 'percentage', 'compliance') ?? 0),
    })),
  };

  // 7. aiQuestions — may be questions, ai_questions, ask_doctor, etc.
  const rawQuestions = findVal(raw, 'aiQuestions', 'ai_questions', 'questions', '问题', 'askDoctor', 'ask_doctor', '医生问题');
  const aiQuestions = ensureArr(rawQuestions).map(String);

  // 8. nextSteps — may be suggestions, recommendations, next_steps, etc.
  const rawSteps = findVal(raw, 'nextSteps', 'next_steps', 'suggestions', 'recommendations', '建议', '治疗建议', '下一步');
  const nextSteps = ensureArr(rawSteps).map(String);

  // If we got at least some useful data, return it
  if (aiQuestions.length === 0 && nextSteps.length === 0 && stoolSummary.avgDaily === 0 && symptomSummary.avgPain === 0) {
    console.warn('[normalizeReport] 无法从 LLM 响应中提取足够的报告字段, keys:', Object.keys(raw));
    return null;
  }

  return { period, overallAssessment, stoolSummary, symptomSummary, dietTolerance, medicationAdherence, aiQuestions, nextSteps };
}

const assessmentConfig = {
  improving: { label: '好转', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', emoji: '🟢' },
  stable: { label: '稳定', icon: Minus, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', emoji: '🟡' },
  worsening: { label: '恶化', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', emoji: '🔴' },
};

// ── Report Content ───────────────────────────────────────────
function ReportContent({ report, chartData }: { report: ReportData; chartData?: ChartData }) {
  console.log('[ReportContent] 渲染, report keys:', Object.keys(report), 'chartData:', !!chartData);
  const config = assessmentConfig[report?.overallAssessment] || assessmentConfig.stable;
  const Icon = config.icon;

  return (
    <>
      <GlassCard variant="elevated">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">UC 复诊报告</h2>
            <p className="text-xs text-gray-400 mt-1">{report?.period || ''}</p>
          </div>
        </div>
        <div className={`p-4 rounded-xl ${config.bg} ${config.border} border`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bg}`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>
            <div className={`text-sm font-semibold ${config.color}`}>
              30天整体评估：{config.emoji} {config.label}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 排便趋势 — 带图表 */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-teal-600" />
          <label className="text-xs font-medium text-gray-500">排便趋势分析</label>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-white/40 border border-white/50 text-center">
            <div className="text-2xl font-bold text-gray-800">{report?.stoolSummary?.avgDaily ?? '-'}</div>
            <div className="text-[10px] text-gray-400">日均便次</div>
          </div>
          <div className="p-3 rounded-xl bg-white/40 border border-white/50 text-center">
            <div className="text-2xl font-bold text-green-600">{report?.stoolSummary?.trend ?? '-'}</div>
            <div className="text-[10px] text-gray-400">趋势</div>
          </div>
          <div className="p-3 rounded-xl bg-white/40 border border-white/50 text-center">
            <div className="text-2xl font-bold text-red-500">{report?.stoolSummary?.bloodDays ?? '-'}</div>
            <div className="text-[10px] text-gray-400">便血天数</div>
          </div>
        </div>
        {/* 30天排便趋势折线图 */}
        {chartData?.stoolTrend && chartData.stoolTrend.length > 0 && (
          <div className="h-48">
            <div className="text-[10px] text-gray-400 mb-1">30天排便次数趋势</div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.stoolTrend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#9ca3af" interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="count" fill="#14b8a6" radius={[3, 3, 0, 0]} name="排便次数" />
                <Bar dataKey="blood" fill="#ef4444" radius={[3, 3, 0, 0]} name="便血次数" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {/* Bristol 分布 */}
        {Array.isArray(report?.stoolSummary?.bristolDistribution) && report.stoolSummary.bristolDistribution.length > 0 && (
          <div className="h-40 mt-3">
            <div className="text-[10px] text-gray-400 mb-1">Bristol 便型分布</div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.stoolSummary.bristolDistribution} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="type" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(value) => [`${value} 次`, '排便次数']} />
                <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>

      {/* 症状趋势 — 带图表 */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-orange-600" />
          <label className="text-xs font-medium text-gray-500">症状趋势分析</label>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="p-3 rounded-xl bg-white/40 border border-white/50">
            <div className="text-xs text-gray-400">平均腹痛评分</div>
            <div className="text-xl font-bold text-gray-800">{report?.symptomSummary?.avgPain ?? '-'}/10</div>
          </div>
          <div className="p-3 rounded-xl bg-white/40 border border-white/50">
            <div className="text-xs text-gray-400">腹痛天数</div>
            <div className="text-xl font-bold text-gray-800">{report?.symptomSummary?.painDays ?? '-'}天</div>
          </div>
        </div>
        {/* 30天症状趋势折线图 */}
        {chartData?.symptomTrend && chartData.symptomTrend.length > 0 && (
          <div className="h-48">
            <div className="text-[10px] text-gray-400 mb-1">30天健康感与腹痛趋势</div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.symptomTrend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#9ca3af" interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" domain={[0, 10]} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="wellbeing" fill="#22c55e" radius={[3, 3, 0, 0]} name="健康感" />
                <Bar dataKey="pain" fill="#f97316" radius={[3, 3, 0, 0]} name="腹痛" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {Array.isArray(report?.symptomSummary?.extraintestinal) && report.symptomSummary.extraintestinal.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-gray-400 mb-2">肠外表现</div>
            <div className="flex flex-wrap gap-2">
              {report.symptomSummary.extraintestinal.map((item, i) => (
                <span key={i} className="px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-xs border border-orange-200">{item}</span>
              ))}
            </div>
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Apple className="w-4 h-4 text-green-600" />
          <label className="text-xs font-medium text-gray-500">饮食耐受性分析</label>
        </div>
        <div className="space-y-3">
          {Array.isArray(report?.dietTolerance?.safe) && report.dietTolerance.safe.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500" /><span className="text-xs font-medium text-green-700">安全食物</span></div>
              <div className="flex flex-wrap gap-1.5">{report.dietTolerance.safe.map((food, i) => <span key={i} className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs border border-green-200">{food}</span>)}</div>
            </div>
          )}
          {Array.isArray(report?.dietTolerance?.caution) && report.dietTolerance.caution.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5"><AlertTriangle className="w-3.5 h-3.5 text-yellow-500" /><span className="text-xs font-medium text-yellow-700">谨慎食物</span></div>
              <div className="flex flex-wrap gap-1.5">{report.dietTolerance.caution.map((food, i) => <span key={i} className="px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 text-xs border border-yellow-200">{food}</span>)}</div>
            </div>
          )}
          {Array.isArray(report?.dietTolerance?.avoid) && report.dietTolerance.avoid.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5"><AlertTriangle className="w-3.5 h-3.5 text-red-500" /><span className="text-xs font-medium text-red-700">避免食物</span></div>
              <div className="flex flex-wrap gap-1.5">{report.dietTolerance.avoid.map((food, i) => <span key={i} className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs border border-red-200">{food}</span>)}</div>
            </div>
          )}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Pill className="w-4 h-4 text-purple-600" />
          <label className="text-xs font-medium text-gray-500">用药依从性</label>
        </div>
        <div className="p-3 rounded-xl bg-white/40 border border-white/50 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">整体依从率</span>
            <span className="text-lg font-bold text-purple-600">{report?.medicationAdherence?.overall ?? '-'}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${report?.medicationAdherence?.overall ?? 0}%` }} />
          </div>
        </div>
        {/* 用药依从性图表 */}
        {chartData?.medAdherence && chartData.medAdherence.length > 0 && (
          <div className="h-40 mb-3">
            <div className="text-[10px] text-gray-400 mb-1">30天用药依从率</div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.medAdherence} margin={{ top: 5, right: 5, left: -20, bottom: 5 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="#9ca3af" domain={[0, 100]} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" width={80} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(value) => [`${value}%`, '依从率']} />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]} name="依从率">
                  {chartData.medAdherence.map((entry, index) => (
                    <Cell key={index} fill={entry.rate >= 90 ? '#22c55e' : entry.rate >= 70 ? '#eab308' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="space-y-2">
          {(report?.medicationAdherence?.details ?? []).map((med, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/30">
              <span className="text-xs text-gray-600">{med?.name}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${(med?.adherence ?? 0) >= 90 ? 'bg-green-500' : (med?.adherence ?? 0) >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${med?.adherence ?? 0}%` }} />
                </div>
                <span className="text-xs font-medium text-gray-700">{med?.adherence ?? 0}%</span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard variant="elevated">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🤖</span>
          <label className="text-xs font-medium text-gray-500">AI 建议问医生的问题</label>
        </div>
        <div className="space-y-2">
          {(report?.aiQuestions ?? []).map((q, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-xl bg-teal-50/50 border border-teal-200/50">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-500 text-white text-xs flex items-center justify-center font-medium">{i + 1}</span>
              <p className="text-xs text-gray-700 leading-relaxed">{q}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <label className="text-xs font-medium text-gray-500">下一步治疗建议</label>
        </div>
        <div className="space-y-2">
          {(report?.nextSteps ?? []).map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-green-100 text-green-600 text-[10px] flex items-center justify-center mt-0.5">{i + 1}</span>
              <span className="text-xs text-gray-600">{step}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </>
  );
}

// ── Main Page ───────────────────────────────────────────────
export function ReportPage() {
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [chartData, setChartData] = useState<ChartData | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ReportSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const toast = useToast();

  useEffect(() => { loadLatest(); loadHistory(); }, []);

  const loadLatest = async () => {
    try {
      const latest = await invoke<{ id: string; created_at: string; report_json: string } | null>('report_get_latest');
      if (latest?.report_json) {
        const raw = extractJSON<any>(latest.report_json);
        if (raw) {
          const parsed = normalizeReport(raw);
          console.log('[ReportPage] 加载最新报告成功, normalized:', !!parsed, 'raw keys:', Object.keys(raw));
          if (parsed) setReport(parsed);
        }
      }
    } catch (e) { console.log('[ReportPage] 无历史报告', e); }
  };

  const loadHistory = async () => {
    try { setHistory(await invoke<ReportSummary[]>('report_list')); } catch { /* */ }
  };

  const handleGenerate = async () => {
    console.log('[ReportPage] ====== 开始生成报告 ======');
    setGenerating(true);
    setError(null);
    setReport(null);
    setChartData(undefined);

    try {
      const config = await getAIConfig();
      if (!config) {
        const msg = 'AI 配置未设置';
        console.error('[ReportPage]', msg);
        setError(msg); toast.error(msg); setGenerating(false);
        return;
      }
      console.log('[ReportPage] config OK, model:', config.model_name);

      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

      // Collect 30-day detailed data
      const [stoolSummary, symptomSummary] = await Promise.all([
        invoke<any[]>('stool_summary_range', { startDate: thirtyDaysAgo, endDate: today }).catch(() => []),
        invoke<any[]>('symptom_summary_range', { startDate: thirtyDaysAgo, endDate: today }).catch(() => []),
      ]);

      // Collect diet and medication data for each of the last 30 days
      const allDiet: any[] = [];
      const allMed: any[] = [];
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
        promises.push(
          invoke<any[]>('diet_list_by_date', { date: d }).then(r => { allDiet.push(...r); }).catch(() => {}),
          invoke<any[]>('medication_list_by_date', { date: d }).then(r => { allMed.push(...r); }).catch(() => {})
        );
      }
      await Promise.all(promises);
      console.log('[ReportPage] 数据: stool=%d symptom=%d diet=%d med=%d', stoolSummary.length, symptomSummary.length, allDiet.length, allMed.length);

      // Build detailed stool data text
      const stoolLines = stoolSummary.map((d: any) =>
        `${d.date}: ${d.total_count}次, Bristol${(d.bristol_counts || []).map((c: number, i: number) => c > 0 ? `${i+1}(${c})` : '').filter(Boolean).join('/')}, 便血${d.blood_count}次`
      );

      // Build detailed symptom data text
      const symptomLines = symptomSummary.map((d: any) => {
        const parts = [`${d.date}:`];
        if (d.avg_wellbeing) parts.push(`健康感${d.avg_wellbeing}/10`);
        if (d.pain_count > 0) parts.push(`腹痛${d.pain_count}次`);
        if (d.bloating_count > 0) parts.push(`腹胀${d.bloating_count}次`);
        if (d.fatigue_avg) parts.push(`疲劳${d.fatigue_avg}/10`);
        return parts.join(' ');
      });

      // Build diet summary grouped by food
      const foodFreq: Record<string, number> = {};
      allDiet.forEach((d: any) => {
        (d.items || []).forEach((item: any) => {
          const name = item.food_name || '未知';
          foodFreq[name] = (foodFreq[name] || 0) + 1;
        });
      });
      const dietSummary = Object.entries(foodFreq).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([f, c]) => `${f}(${c}次)`).join('、');

      // Build medication summary
      const medFreq: Record<string, { taken: number; total: number }> = {};
      allMed.forEach((m: any) => {
        const name = m.medication_name || m.name || '未知';
        if (!medFreq[name]) medFreq[name] = { taken: 0, total: 0 };
        medFreq[name].total++;
        if (m.taken) medFreq[name].taken++;
      });
      const medSummary = Object.entries(medFreq).map(([name, v]) => `${name}: ${v.taken}/${v.total}次(${Math.round(v.taken / v.total * 100)}%)`).join('\n');

      const totalStools = stoolSummary.reduce((s: number, d: any) => s + (d.total_count || 0), 0);
      const avgDaily = stoolSummary.length > 0 ? (totalStools / stoolSummary.length).toFixed(1) : '0';
      const bloodDays = stoolSummary.filter((d: any) => d.blood_count > 0).length;
      const avgWellbeing = symptomSummary.length > 0 ? (symptomSummary.reduce((s: number, d: any) => s + (d.avg_wellbeing || 0), 0) / symptomSummary.length).toFixed(1) : 'N/A';
      const painDays = symptomSummary.filter((d: any) => d.pain_count > 0).length;

      // Build chart data
      const charts: ChartData = {
        stoolTrend: stoolSummary.map((d: any) => ({
          date: (d.date || '').slice(5), // MM-DD
          count: d.total_count || 0,
          blood: d.blood_count || 0,
        })),
        symptomTrend: symptomSummary.map((d: any) => ({
          date: (d.date || '').slice(5),
          wellbeing: d.avg_wellbeing || 0,
          pain: d.pain_count || 0,
        })),
        medAdherence: Object.entries(medFreq).map(([name, v]) => ({
          name,
          taken: v.taken,
          total: v.total,
          rate: v.total > 0 ? Math.round(v.taken / v.total * 100) : 0,
        })),
        bristolDist: (() => {
          const dist: Record<string, number> = {};
          stoolSummary.forEach((d: any) => {
            (d.bristol_counts || []).forEach((count: number, i: number) => {
              if (count > 0) {
                const key = `Bristol ${i + 1}`;
                dist[key] = (dist[key] || 0) + count;
              }
            });
          });
          return Object.entries(dist).map(([type, count]) => ({ type, count }));
        })(),
      };
      setChartData(charts);

      const dataText = `数据范围: ${thirtyDaysAgo} 至 ${today}

【排便记录 - 逐日】
${stoolLines.join('\n') || '无记录'}
总计: ${totalStools}次, 日均${avgDaily}次, 便血${bloodDays}天

【症状记录 - 逐日】
${symptomLines.join('\n') || '无记录'}
平均健康感: ${avgWellbeing}/10, 腹痛天数: ${painDays}天

【饮食记录 - 30天食物频次Top20】
${dietSummary || '无记录'}

【用药记录 - 依从性】
${medSummary || '无记录'}`;

      console.log('[ReportPage] 调用 AI...');
      const result = await callAI(
        [
          { role: 'system', content: `你是一个专业的UC（溃疡性结肠炎）复诊报告生成助手。基于患者过去30天的详细记录数据，生成结构化的复诊摘要。

报告JSON必须包含以下字段：
{
  "overallAssessment": "improving|stable|worsening",
  "period": "报告时间范围",
  "stoolSummary": {
    "avgDaily": 数字,
    "trend": "趋势描述",
    "bloodDays": 数字,
    "bristolDistribution": [{"type": "Bristol 1", "count": 数字}, ...]
  },
  "symptomSummary": {
    "avgPain": 数字,
    "painDays": 数字,
    "extraintestinal": ["肠外表现1", ...]
  },
  "dietTolerance": {
    "safe": ["安全食物1", ...],
    "caution": ["谨慎食物1", ...],
    "avoid": ["避免食物1", ...]
  },
  "medicationAdherence": {
    "overall": 百分比数字,
    "details": [{"name": "药物名", "adherence": 百分比数字}, ...]
  },
  "aiQuestions": ["问题1", "问题2", "问题3", "问题4", "问题5"],
  "nextSteps": ["建议1", "建议2", ...]
}

请直接输出JSON，不要输出其他文字。` },
          { role: 'user', content: `请基于以下30天详细数据生成复诊报告：\n\n${dataText}` },
        ]
      );

      console.log('[ReportPage] AI 完成, 长度:', result.length);
      console.log('[ReportPage] 响应前300字:', result.slice(0, 300));

      const raw = extractJSON<any>(result);
      console.log('[ReportPage] parseJSON:', raw ? '成功' : '失败');
      if (raw) console.log('[ReportPage] raw keys:', Object.keys(raw));

      const parsed = raw ? normalizeReport(raw) : null;
      console.log('[ReportPage] normalizeReport:', parsed ? '成功' : '失败');

      if (parsed) {
        console.log('[ReportPage] 设置 report state...');
        setReport(parsed);
        toast.success('报告生成成功');
        try { await invoke('report_save', { reportJson: result }); loadHistory(); } catch (e) { console.error('[ReportPage] 保存失败:', e); }
      } else {
        const msg = `AI 返回格式无法解析（${result.length}字符）`;
        console.error('[ReportPage]', msg, 'raw keys:', raw ? Object.keys(raw) : 'null', result.slice(0, 500));
        setError(msg); toast.error(msg);
      }
    } catch (err: any) {
      const msg = `报告生成失败: ${err?.message ?? String(err)}`;
      console.error('[ReportPage] 异常:', err);
      setError(msg); toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleViewHistory = async (id: string) => {
    try {
      const record = await invoke<{ id: string; created_at: string; report_json: string } | null>('report_get', { id });
      if (record?.report_json) {
        const raw = extractJSON<any>(record.report_json);
        const parsed = raw ? normalizeReport(raw) : null;
        if (parsed) { setReport(parsed); setShowHistory(false); }
        else { toast.error('报告数据损坏'); }
      }
    } catch { toast.error('加载报告失败'); }
  };

  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try { await invoke('report_delete', { id }); loadHistory(); } catch { toast.error('删除失败'); }
  };

  console.log('[ReportPage] render:', { generating, hasReport: !!report, error });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
          <FileText className="w-5 h-5" />复诊报告
        </h1>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <GlassButton variant="secondary" size="sm" onClick={() => setShowHistory(!showHistory)}>
              <History className="w-3.5 h-3.5" />历史 ({history.length})
            </GlassButton>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" /><span>{new Date().toLocaleString('zh-CN')}</span>
          </div>
        </div>
      </div>

      {/* 历史 */}
      {showHistory && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-3"><History className="w-4 h-4 text-gray-500" /><span className="text-sm font-medium text-gray-700">历史报告</span></div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {history.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/40 border border-white/50 cursor-pointer hover:bg-white/60 transition-colors" onClick={() => handleViewHistory(item.id)}>
                <div className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-gray-400" /><span className="text-xs text-gray-600">{new Date(item.created_at).toLocaleString('zh-CN')}</span></div>
                <div className="flex items-center gap-1">
                  <button type="button" className="p-1 rounded hover:bg-white/60 text-gray-400 hover:text-teal-600" onClick={(e) => { e.stopPropagation(); handleViewHistory(item.id); }}><Eye className="w-3.5 h-3.5" /></button>
                  <button type="button" className="p-1 rounded hover:bg-white/60 text-gray-400 hover:text-red-500" onClick={(e) => handleDeleteHistory(item.id, e)}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* 生成中 */}
      {generating && (
        <GlassCard variant="elevated">
          <div className="flex items-center gap-3 py-6">
            <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
            <div><div className="text-sm font-medium text-gray-700">AI 正在生成复诊报告...</div><div className="text-xs text-gray-400 mt-1">正在分析30天数据，请稍候</div></div>
          </div>
        </GlassCard>
      )}

      {/* 未生成 */}
      {!report && !generating && (
        <GlassCard variant="elevated">
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">生成复诊报告</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">基于过去30天的排便、饮食、症状、用药数据，AI将自动生成结构化复诊摘要。</p>
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-orange-50 border border-orange-200 text-sm text-orange-700 max-w-md mx-auto">
                <AlertTriangle className="w-4 h-4 inline mr-2" />{error}
              </div>
            )}
            <GlassButton variant="primary" size="lg" onClick={handleGenerate} loading={generating}>
              <FileText className="w-4 h-4" />生成30天复诊报告
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* 报告内容 */}
      {report && (
        <ErrorBoundary>
          <ReportContent report={report} chartData={chartData} />
          <div className="flex gap-2">
            <GlassButton variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" />打印
            </GlassButton>
            <GlassButton variant="secondary" size="lg" onClick={() => { setReport(null); setChartData(undefined); setError(null); }} className="flex-1">
              重新生成报告
            </GlassButton>
          </div>
        </ErrorBoundary>
      )}
    </div>
  );
}
