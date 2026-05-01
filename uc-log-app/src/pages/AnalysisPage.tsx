import { useState, useEffect, useRef, Component, type ReactNode } from 'react';
import { GlassCard, GlassButton, useToast } from '../components/ui';
import { Brain, Sparkles, Apple, AlertTriangle, ChevronDown, ChevronUp, Clock, ArrowRight, Lightbulb, RefreshCw, BarChart3, ShieldCheck, ShieldAlert } from 'lucide-react';
import { callAI, getAIConfig, runLocalAnalysis, extractJSON } from '../services';
import { invoke } from '@tauri-apps/api/core';

// ── Error Boundary ──────────────────────────────────────────
interface EBState { hasError: boolean; error: Error | null; }
class ErrorBoundary extends Component<{ children: ReactNode; onError?: (e: Error) => void }, EBState> {
  state: EBState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error) { console.error('[AnalysisPage ErrorBoundary]', error); this.props.onError?.(error); }
  render() {
    if (this.state.hasError) {
      return (
        <GlassCard>
          <div className="flex items-center gap-3 text-red-600">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">渲染出错</p>
              <p className="text-xs text-gray-500 mt-1">{this.state.error?.message}</p>
            </div>
          </div>
        </GlassCard>
      );
    }
    return this.props.children;
  }
}

// ── Types ───────────────────────────────────────────────────
interface LocalFoodAttr { food: string; score: number; frequency: number; totalEaten: number; symptomRate: number; avgHoursBefore: number; confidence: 'high' | 'medium' | 'low'; reason: string; }
interface LocalAttrResult { symptomType: string; symptomLabel: string; symptomCount: number; candidates: LocalFoodAttr[]; }
interface LocalAnalysis { period: string; totalDietDays: number; totalSymptomDays: number; attributions: LocalAttrResult[]; safeFoods: string[]; triggerFoods: string[]; summary: string; }
interface LLMAttribution { id: string; symptom: string; symptomLabel: string; candidateFoods: { rank: number; food: string; meal: string; hoursBefore: number; score: number; confidence: 'high' | 'medium' | 'low'; reason: string }[]; aiRecommendation: string; }
interface MealRecommendation { overallStrategy: string; meals: { type: string; label: string; emoji: string; items: { food: string; amount: string; cooking: string; note?: string }[] }[]; nutritionSummary: { calories: number; protein: number }; avoidReminder: string[]; aiTips: string[]; }

const confidenceConfig = {
  high: { label: '高', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  medium: { label: '中', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  low: { label: '低', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
};

// ── Normalize LLM data ──────────────────────────────────────
function normalizeAttributions(raw: any): LLMAttribution[] {
  console.log('[AnalysisPage] normalizeAttributions input:', typeof raw, Array.isArray(raw) ? `array[${raw.length}]` : '');
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : (raw.attributions || raw.results || [raw]);
  const result = arr.map((item: any, idx: number) => ({
    id: item?.id || `attr_${idx}`,
    symptom: item?.symptom || '',
    symptomLabel: item?.symptomLabel || item?.symptom_label || item?.symptom || '未知症状',
    candidateFoods: Array.isArray(item?.candidateFoods || item?.candidate_foods || item?.foods)
      ? (item.candidateFoods || item.candidate_foods || item.foods).map((f: any, fi: number) => ({
          rank: f?.rank ?? fi + 1,
          food: f?.food || f?.name || '未知食物',
          meal: f?.meal || f?.meal_type || '-',
          hoursBefore: f?.hoursBefore ?? f?.hours_before ?? 0,
          score: typeof f?.score === 'number' ? f.score : 0,
          confidence: ['high', 'medium', 'low'].includes(f?.confidence) ? f.confidence : 'low',
          reason: f?.reason || '',
        }))
      : [],
    aiRecommendation: item?.aiRecommendation || item?.ai_recommendation || item?.recommendation || '',
  }));
  console.log('[AnalysisPage] normalizeAttributions output:', result.length, 'items');
  return result;
}

function normalizeMealRec(raw: any): MealRecommendation | null {
  console.log('[AnalysisPage] normalizeMealRec input:', typeof raw, raw ? Object.keys(raw) : 'null');
  if (!raw || typeof raw !== 'object') return null;

  const mealEmoji: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍪', 早餐: '🌅', 午餐: '☀️', 晚餐: '🌙', 加餐: '🍪' };
  const mealLabel: Record<string, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' };

  // Find meals — LLM may return: array, object with meal keys, or nested variations
  let mealsRaw = raw.meals || raw.meal_plans || raw.mealPlans;
  let mealsArray: any[] = [];

  if (Array.isArray(mealsRaw)) {
    // Case 1: meals is already an array
    mealsArray = mealsRaw;
  } else if (mealsRaw && typeof mealsRaw === 'object') {
    // Case 2: meals is an object like {breakfast: {...}, lunch: {...}, dinner: {...}, snack: {...}}
    for (const [key, val] of Object.entries(mealsRaw)) {
      if (val && typeof val === 'object') {
        const mealObj = val as any;
        // Each meal may have: recommendations, items, foods, dishes, or be a flat list
        const recs = mealObj.recommendations || mealObj.items || mealObj.foods || mealObj.dishes || [];
        const items = Array.isArray(recs) ? recs.map((it: any) => ({
          food: it?.food_name || it?.food || it?.name || it?.dish || String(it) || '',
          amount: it?.amount || it?.portion || it?.quantity || it?.ingredients?.amount || '',
          cooking: it?.cooking || it?.cooking_method || it?.preparation || it?.ingredients?.cooking_method || '',
          note: it?.note || it?.notes || it?.benefits || undefined,
        })) : [];
        mealsArray.push({
          type: key,
          label: mealLabel[key] || mealObj.label || mealObj.name || key,
          emoji: mealEmoji[key] || mealObj.emoji || '🍽️',
          items,
        });
      }
    }
  }

  // Fallback: scan all values for any array that looks like meals
  if (mealsArray.length === 0) {
    for (const v of Object.values(raw)) {
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && (v[0].items || v[0].type || v[0].name)) {
        mealsArray = v;
        break;
      }
    }
  }

  // Find nutrition summary
  let nutrition = raw.nutritionSummary || raw.nutrition_summary || raw.nutrition_estimate || raw.nutrition;
  if (!nutrition || typeof nutrition !== 'object') {
    const calories = raw.calories || raw.total_calories || 0;
    const protein = raw.protein || raw.total_protein || 0;
    nutrition = { calories, protein };
  }

  const result: MealRecommendation = {
    overallStrategy: raw.overallStrategy || raw.overall_strategy || raw.strategy || raw.summary || raw.patient_condition || '',
    meals: mealsArray.map((m: any) => ({
      type: m?.type || m?.name || m?.meal_type || '',
      label: m?.label || m?.name || mealLabel[m?.type] || m?.type || m?.meal_type || '',
      emoji: m?.emoji || mealEmoji[m?.type] || '🍽️',
      items: Array.isArray(m?.items) ? m.items.map((it: any) => ({
        food: it?.food || it?.food_name || it?.name || it?.dish || String(it) || '',
        amount: it?.amount || it?.portion || it?.quantity || '',
        cooking: it?.cooking || it?.cooking_method || it?.preparation || '',
        note: it?.note || it?.notes || undefined,
      })) : [],
    })),
    nutritionSummary: { calories: nutrition?.calories ?? nutrition?.kcal ?? 0, protein: nutrition?.protein ?? 0 },
    avoidReminder: Array.isArray(raw.avoidReminder || raw.avoid_reminder || raw.avoid) ? (raw.avoidReminder || raw.avoid_reminder || raw.avoid) : [],
    aiTips: Array.isArray(raw.aiTips || raw.ai_tips || raw.tips || raw.suggestions) ? (raw.aiTips || raw.ai_tips || raw.tips || raw.suggestions) : [],
  };
  console.log('[AnalysisPage] normalizeMealRec output:', { mealsCount: result.meals.length, strategy: result.overallStrategy.slice(0, 50) });
  return result;
}

// ── Attribution Card ─────────────────────────────────────────
function AttributionCard({ result, idx }: { result: LLMAttribution; idx: number }) {
  const foods = Array.isArray(result?.candidateFoods) ? result.candidateFoods : [];
  return (
    <GlassCard key={result?.id || `attr_${idx}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-semibold text-gray-700">症状：{result?.symptomLabel || '未知'}</span>
        </div>
      </div>
      <div className="space-y-2 mb-3">
        {foods.map((food, fi) => {
          const conf = confidenceConfig[food?.confidence as keyof typeof confidenceConfig] || confidenceConfig.low;
          return (
            <div key={fi} className="p-3 rounded-xl bg-white/40 border border-white/50">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] flex items-center justify-center font-bold">{food?.rank ?? fi + 1}</span>
                  <span className="text-sm font-medium text-gray-700">{food?.food || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${conf.bg} ${conf.color} ${conf.border} border`}>置信度{conf.label}</span>
                  <span className="text-xs font-bold text-purple-600">{((food?.score ?? 0) * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <Clock className="w-3 h-3" />{food?.meal || '-'}
                <span>{food?.hoursBefore ?? 0}h前</span>
                <ArrowRight className="w-3 h-3" /><span>{food?.reason || ''}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                <div className={`h-full rounded-full ${(food?.score ?? 0) >= 0.6 ? 'bg-red-400' : (food?.score ?? 0) >= 0.3 ? 'bg-yellow-400' : 'bg-gray-400'}`} style={{ width: `${(food?.score ?? 0) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {result?.aiRecommendation && (
        <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-200/50">
          <div className="flex items-center gap-1.5 mb-1"><Sparkles className="w-3.5 h-3.5 text-purple-600" /><span className="text-[10px] font-medium text-purple-700">AI 建议</span></div>
          <p className="text-xs text-gray-600 leading-relaxed">{result.aiRecommendation}</p>
        </div>
      )}
    </GlassCard>
  );
}

// ── Meal Card ────────────────────────────────────────────────
function MealCard({ mealRec }: { mealRec: MealRecommendation }) {
  const emoji: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍪' };
  const meals = Array.isArray(mealRec?.meals) ? mealRec.meals : [];
  const aiTips = Array.isArray(mealRec?.aiTips) ? mealRec.aiTips : [];
  return (
    <>
      <GlassCard variant="elevated">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl">🎯</span>
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-1">今日饮食策略</div>
            <p className="text-xs text-gray-500 leading-relaxed">{mealRec?.overallStrategy || '-'}</p>
          </div>
        </div>
        {mealRec?.nutritionSummary && (
          <div className="flex gap-3">
            <div className="flex-1 p-2 rounded-lg bg-white/40 border border-white/50 text-center">
              <div className="text-lg font-bold text-gray-800">{mealRec.nutritionSummary?.calories ?? '-'}</div>
              <div className="text-[10px] text-gray-400">预计热量 (kcal)</div>
            </div>
            <div className="flex-1 p-2 rounded-lg bg-white/40 border border-white/50 text-center">
              <div className="text-lg font-bold text-gray-800">{mealRec.nutritionSummary?.protein ?? '-'}g</div>
              <div className="text-[10px] text-gray-400">预计蛋白质</div>
            </div>
          </div>
        )}
      </GlassCard>

      {meals.map((meal, mi) => {
        const items = Array.isArray(meal?.items) ? meal.items : [];
        return (
          <GlassCard key={meal?.type || `meal_${mi}`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{emoji[meal?.type] || '🍽️'}</span>
              <span className="text-sm font-semibold text-gray-700">{meal?.label || meal?.type || '-'}</span>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-white/40 border border-white/50">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                    <span className="text-sm text-gray-700">{item?.food || '-'}</span>
                    {item?.note && <span className="px-1.5 py-0.5 rounded text-[10px] bg-yellow-50 text-yellow-700 border border-yellow-200">{item.note}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{item?.amount || '-'}</span>
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{item?.cooking || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        );
      })}

      {aiTips.length > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-3"><Lightbulb className="w-4 h-4 text-amber-500" /><span className="text-xs font-medium text-gray-500">AI 小贴士</span></div>
          <div className="space-y-2">
            {aiTips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-[10px] flex items-center justify-center mt-0.5">{i + 1}</span>
                <span className="text-xs text-gray-600">{tip}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </>
  );
}

// ── Main Page ───────────────────────────────────────────────
export function AnalysisPage() {
  const [mode, setMode] = useState<'local' | 'llm'>('local');
  const [tab, setTab] = useState<'attribution' | 'recommendation'>('attribution');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [localResult, setLocalResult] = useState<LocalAnalysis | null>(null);
  const [llmAttributions, setLlmAttributions] = useState<LLMAttribution[]>(() => {
    try { const cached = localStorage.getItem('uc_llm_attributions'); return cached ? JSON.parse(cached) : []; } catch { return []; }
  });
  const [mealRec, setMealRec] = useState<MealRecommendation | null>(() => {
    try { const cached = localStorage.getItem('uc_llm_meal_rec'); return cached ? JSON.parse(cached) : null; } catch { return null; }
  });
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const toast = useToast();

  useEffect(() => { loadLocal(); }, []);

  const loadLocal = async () => {
    setLoading(true); setError(null);
    try { setLocalResult(await runLocalAnalysis()); }
    catch (err) { const msg = `本地分析失败: ${err instanceof Error ? err.message : String(err)}`; setError(msg); toast.error(msg); }
    finally { setLoading(false); }
  };

  // Accept tab as parameter to avoid stale closure over `tab` state
  const loadLLM = async (currentTab?: 'attribution' | 'recommendation') => {
    const effectiveTab = currentTab ?? tab;
    const myRequestId = ++requestIdRef.current;
    console.log('[AnalysisPage] loadLLM start, tab:', effectiveTab, 'requestId:', myRequestId);

    setLoading(true); setError(null);
    if (effectiveTab === 'attribution') setLlmAttributions([]);
    else setMealRec(null);

    try {
      const config = await getAIConfig();
      if (!config) { setError('AI 配置未设置，请在设置页面配置 AI 服务'); setLoading(false); return; }
      console.log('[AnalysisPage] AI config OK, model:', config.model_name);

      const symptoms: any[] = [];
      const diet: any[] = [];
      for (let i = 0; i < 3; i++) {
        const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
        try {
          symptoms.push(...await invoke<any[]>('symptom_list_by_date', { date: d }));
          diet.push(...await invoke<any[]>('diet_list_by_date', { date: d }));
        } catch { /* */ }
      }
      console.log('[AnalysisPage] 数据加载: symptoms=', symptoms.length, 'diet=', diet.length);

      if (effectiveTab === 'attribution') {
        const parts: string[] = [];
        symptoms.forEach(s => {
          const date = s.timestamp?.slice(0, 10);
          if (s.abdominal_pain_present) parts.push(`${date}腹痛${s.abdominal_pain_intensity}/10`);
          if (s.bloating_present) parts.push(`${date}腹胀${s.bloating_severity}/10`);
          if (s.tenesmus_present) parts.push(`${date}里急后重`);
        });
        const dietParts: string[] = [];
        diet.forEach(d => {
          const date = d.timestamp?.slice(0, 10);
          const foods = d.items?.map((i: any) => `${i.food_name}${i.amount_grams}g`).join('、') || '';
          dietParts.push(`${date}${d.meal_type}: ${foods}`);
        });

        console.log('[AnalysisPage] 开始归因分析...');
        const result = await callAI(
          [
            { role: 'system', content: `你是一个专业的UC（溃疡性结肠炎）饮食-症状归因分析助手。基于贝叶斯推理方法，分析症状出现前72小时内的饮食记录，找出可能的触发食物。\n分析维度包括：时间接近度（权重0.30）、历史反应率（权重0.25）、剂量效应（权重0.20）、排除度（权重0.15）、症状特异性（权重0.10）。\n请用JSON格式输出分析结果。` },
            { role: 'user', content: `请分析以下症状和饮食数据：\n\n症状数据：${parts.join('; ') || '无症状'}\n\n饮食历史：${dietParts.join('; ') || '无饮食'}\n\n请给出Top 3候选食物，包含：食物名称、对应餐次、距症状出现时间、归因得分(0-1)、置信度(高/中/低)、原因分析，以及AI建议。` },
          ]
        );
        console.log('[AnalysisPage] 归因分析响应完成, 长度:', result.length);
        console.log('[AnalysisPage] 响应前200字:', result.slice);

        const parsed = extractJSON<any>(result);
        console.log('[AnalysisPage] JSON解析:', parsed ? '成功' : '失败', parsed ? Object.keys(parsed) : '');
        const normalized = normalizeAttributions(parsed);
        if (requestIdRef.current !== myRequestId) { console.log('[AnalysisPage] 归因分析: 请求已过期, 跳过'); return; }
        if (normalized.length > 0) {
          setLlmAttributions(normalized);
          try { localStorage.setItem('uc_llm_attributions', JSON.stringify(normalized)); } catch {}
          toast.success('归因分析完成');
        } else {
          const msg = `AI 返回格式无法解析（响应长度: ${result.length}字符）。请重试。`;
          console.error('[AnalysisPage]', msg, '原始:', result.slice(0, 500));
          setError(msg); toast.error(msg);
        }
      } else {
        const latest = symptoms[symptoms.length - 1];
        let status = '无明显症状';
        if (latest) {
          const p: string[] = [];
          if (latest.abdominal_pain_present) p.push(`腹痛${latest.abdominal_pain_intensity}/10`);
          if (latest.bloating_present) p.push(`腹胀${latest.bloating_severity}/10`);
          if (latest.tenesmus_present) p.push('里急后重');
          p.push(`整体健康感${latest.overall_wellbeing}/10`);
          status = p.join('，');
        }
        const foodLib = await invoke<any[]>('food_library_list').catch(() => []);
        const safeFoods = foodLib.map((f: any) => f.name).slice(0, 10).join('、') || '白米饭、鸡蛋、南瓜';

        console.log('[AnalysisPage] 开始饮食推荐...');
        const result = await callAI(
          [
            { role: 'system', content: `你是一个专业的UC（溃疡性结肠炎）饮食推荐助手。基于患者当前症状状态、已知耐受食物库和营养需求，生成个性化每日饮食推荐。\n推荐原则：\n1. 活动期采用低渣、低纤维饮食\n2. 避免已知过敏原和不耐受食物\n3. 一定要保证足够蛋白质和热量摄入\n4. 食物以蒸、煮、泥状为主\n请用JSON格式输出推荐。` },
            { role: 'user', content: `当前症状状态：${status}\n\n安全食物：${safeFoods}\n\n避免食物：\n\n请生成今日四餐（早餐、午餐、晚餐、加餐）的饮食推荐，包含每道菜的食物名称、份量(克)、烹饪方式，以及整体营养估算和AI小贴士。` },
          ]
        );
        console.log('[AnalysisPage] 饮食推荐响应完成, 长度:', result.length);
        console.log('[AnalysisPage] 响应前200字:', result.slice(0, 200));

        const parsed = extractJSON<any>(result);
        console.log('[AnalysisPage] JSON解析:', parsed ? '成功' : '失败', parsed ? Object.keys(parsed) : '');
        const normalized = normalizeMealRec(parsed);
        if (requestIdRef.current !== myRequestId) { console.log('[AnalysisPage] 饮食推荐: 请求已过期, 跳过'); return; }
        if (normalized) {
          setMealRec(normalized);
          try { localStorage.setItem('uc_llm_meal_rec', JSON.stringify(normalized)); } catch {}
          toast.success('饮食推荐生成完成');
        } else {
          const msg = `AI 返回格式无法解析（响应长度: ${result.length}字符）。请重试。`;
          console.error('[AnalysisPage]', msg, '原始:', result.slice(0, 500));
          setError(msg); toast.error(msg);
        }
      }
    } catch (err: any) {
      const msg = `AI 分析失败: ${err?.message ?? String(err)}`;
      console.error('[AnalysisPage] 异常:', err);
      setError(msg); toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-700 flex items-center gap-2"><Brain className="w-5 h-5" />AI 分析</h1>
        <GlassButton variant="secondary" size="sm" onClick={() => mode === 'local' ? loadLocal() : loadLLM(tab)} loading={loading}><RefreshCw className="w-3.5 h-3.5" />刷新</GlassButton>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => { setMode('local'); loadLocal(); }} className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all outline-none ${mode === 'local' ? 'bg-teal-500 text-white shadow-md' : 'bg-white/40 text-gray-600 border border-white/60 hover:bg-white/60'}`}>
          <div className="flex items-center justify-center gap-2"><BarChart3 className="w-4 h-4" />本地统计分析</div>
        </button>
        <button type="button" onClick={() => { setMode('llm'); }} className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all outline-none ${mode === 'llm' ? 'bg-purple-500 text-white shadow-md' : 'bg-white/40 text-gray-600 border border-white/60 hover:bg-white/60'}`}>
          <div className="flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" />LLM 深度分析</div>
        </button>
      </div>

      {/* LOCAL */}
      {mode === 'local' && (
        <ErrorBoundary onError={(e) => toast.error(`渲染出错: ${e.message}`)}>
          {error && <GlassCard><div className="flex items-center gap-3 text-orange-600"><AlertTriangle className="w-5 h-5 flex-shrink-0" /><p className="text-sm">{error}</p></div></GlassCard>}
          {localResult && (
            <>
              <GlassCard variant="elevated">
                <div className="flex items-start gap-3 mb-3"><BarChart3 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" /><div><div className="text-sm font-semibold text-gray-700 mb-1">本地统计分析</div><p className="text-xs text-gray-500 leading-relaxed">{localResult.summary}</p></div></div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-2 rounded-lg bg-white/40 border border-white/50 text-center"><div className="text-lg font-bold text-gray-800">{localResult.totalDietDays}</div><div className="text-[10px] text-gray-400">记录天数</div></div>
                  <div className="p-2 rounded-lg bg-white/40 border border-white/50 text-center"><div className="text-lg font-bold text-orange-500">{localResult.totalSymptomDays}</div><div className="text-[10px] text-gray-400">症状天数</div></div>
                  <div className="p-2 rounded-lg bg-white/40 border border-white/50 text-center"><div className="text-lg font-bold text-red-500">{localResult.triggerFoods.length}</div><div className="text-[10px] text-gray-400">疑似触发食物</div></div>
                </div>
              </GlassCard>
              {localResult.triggerFoods.length > 0 && <GlassCard><div className="flex items-center gap-2 mb-2"><ShieldAlert className="w-4 h-4 text-red-500" /><span className="text-xs font-medium text-gray-500">疑似触发食物</span></div><div className="flex flex-wrap gap-1.5">{localResult.triggerFoods.map(f => <span key={f} className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs border border-red-200">{f}</span>)}</div></GlassCard>}
              {localResult.safeFoods.length > 0 && <GlassCard><div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-4 h-4 text-green-500" /><span className="text-xs font-medium text-gray-500">表现安全的食物</span></div><div className="flex flex-wrap gap-1.5">{localResult.safeFoods.map(f => <span key={f} className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs border border-green-200">{f}</span>)}</div></GlassCard>}
              {localResult.attributions.map((attr) => (
                <GlassCard key={attr.symptomType}>
                  <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" /><span className="text-sm font-semibold text-gray-700">{attr.symptomLabel}</span><span className="text-xs text-gray-400">({attr.symptomCount}次)</span></div><button type="button" onClick={() => setExpandedItem(expandedItem === attr.symptomType ? null : attr.symptomType)} className="p-1 rounded-lg hover:bg-white/60 text-gray-400">{expandedItem === attr.symptomType ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button></div>
                  <div className="space-y-2">
                    {attr.candidates.slice(0, expandedItem === attr.symptomType ? undefined : 3).map((food, i) => {
                      const conf = confidenceConfig[food.confidence];
                      return (<div key={food.food} className="p-3 rounded-xl bg-white/40 border border-white/50"><div className="flex items-center justify-between mb-1.5"><div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] flex items-center justify-center font-bold">{i + 1}</span><span className="text-sm font-medium text-gray-700">{food.food}</span></div><div className="flex items-center gap-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${conf.bg} ${conf.color} ${conf.border} border`}>置信度{conf.label}</span><span className="text-xs font-bold text-teal-600">{(food.score * 100).toFixed(0)}%</span></div></div><div className="flex items-center gap-3 text-[11px] text-gray-400"><span>症状前出现{food.frequency}次</span><span>平均{food.avgHoursBefore.toFixed(0)}h前</span><span>共吃{food.totalEaten}次</span></div><div className="w-full h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden"><div className={`h-full rounded-full transition-all ${food.score >= 0.6 ? 'bg-red-400' : food.score >= 0.3 ? 'bg-yellow-400' : 'bg-gray-400'}`} style={{ width: `${food.score * 100}%` }} /></div></div>);
                    })}
                  </div>
                </GlassCard>
              ))}
              {localResult.attributions.length === 0 && <GlassCard><div className="text-center py-8 text-gray-400"><div className="text-3xl mb-2">📊</div><div className="text-sm">未发现明显的食物-症状关联</div><div className="text-xs mt-1">继续记录，数据越多分析越准确</div></div></GlassCard>}
              <div className="text-center py-4 text-xs text-gray-400">分析基于过去30天数据 · 本地计算无需联网</div>
            </>
          )}
        </ErrorBoundary>
      )}

      {/* LLM */}
      {mode === 'llm' && (
        <ErrorBoundary onError={(e) => toast.error(`渲染出错: ${e.message}`)}>
          <div className="flex gap-2">
            <button type="button" onClick={() => setTab('attribution')} className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all outline-none ${tab === 'attribution' ? 'bg-teal-500 text-white' : 'bg-white/40 text-gray-600 border border-white/60 hover:bg-white/60'}`}><Sparkles className="w-3.5 h-3.5 inline mr-1" />归因分析</button>
            <button type="button" onClick={() => setTab('recommendation')} className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all outline-none ${tab === 'recommendation' ? 'bg-teal-500 text-white' : 'bg-white/40 text-gray-600 border border-white/60 hover:bg-white/60'}`}><Apple className="w-3.5 h-3.5 inline mr-1" />饮食推荐</button>
          </div>

          {error && <GlassCard><div className="flex items-center gap-3 text-orange-600"><AlertTriangle className="w-5 h-5 flex-shrink-0" /><p className="text-sm">{error}</p></div></GlassCard>}

          {loading && (
            <GlassCard variant="elevated">
              <div className="flex items-center gap-3 py-6"><div className="w-8 h-8 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin" /><div><div className="text-sm font-medium text-gray-700">正在连接 AI 服务...</div><div className="text-xs text-gray-400 mt-1">等待 AI 响应</div></div></div>
            </GlassCard>
          )}

          {!loading && !error && llmAttributions.length === 0 && tab === 'attribution' && (
            <GlassCard><div className="text-center py-8"><div className="text-3xl mb-2">🤖</div><div className="text-sm text-gray-500 mb-4">基于近3天饮食与症状数据，AI分析可能的触发食物</div><GlassButton variant="primary" size="lg" onClick={() => loadLLM('attribution')} loading={loading}>开始归因分析</GlassButton></div></GlassCard>
          )}

          {tab === 'attribution' && llmAttributions.map((result, ri) => <AttributionCard key={result?.id || `attr_${ri}`} result={result} idx={ri} />)}

          {tab === 'recommendation' && mealRec && <MealCard mealRec={mealRec} />}

          {!loading && !mealRec && tab === 'recommendation' && !error && (
            <GlassCard><div className="text-center py-8"><div className="text-3xl mb-2">🍎</div><div className="text-sm text-gray-500 mb-4">基于当前症状状态生成个性化饮食推荐</div><GlassButton variant="primary" size="lg" onClick={() => loadLLM('recommendation')} loading={loading}>生成饮食推荐</GlassButton></div></GlassCard>
          )}

          <div className="text-center py-4 text-xs text-gray-400">LLM 分析需要配置 AI 服务 · 在设置页面中配置</div>
        </ErrorBoundary>
      )}
    </div>
  );
}
