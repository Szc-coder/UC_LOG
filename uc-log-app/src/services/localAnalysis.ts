import { invoke } from '@tauri-apps/api/core';

interface DietRecord {
  id: string;
  timestamp: string;
  meal_type: string;
  items: { food_name: string; amount_grams: number; cooking_method: string }[];
}

interface SymptomRecord {
  id: string;
  timestamp: string;
  abdominal_pain_present: boolean;
  abdominal_pain_intensity: number;
  tenesmus_present: boolean;
  tenesmus_intensity: number;
  bloating_present: boolean;
  bloating_severity: number;
  fever_present: boolean;
  joint_pain_present: boolean;
  fatigue_level: number;
  overall_wellbeing: number;
}

interface FoodAttribution {
  food: string;
  score: number;
  frequency: number;        // how many times eaten before symptoms
  totalEaten: number;       // total times eaten
  symptomRate: number;      // % of times eaten that preceded symptoms
  avgHoursBefore: number;   // avg hours before symptom onset
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

interface LocalAttributionResult {
  symptomType: string;
  symptomLabel: string;
  symptomCount: number;
  candidates: FoodAttribution[];
}

interface LocalAnalysisResult {
  period: string;
  totalDietDays: number;
  totalSymptomDays: number;
  attributions: LocalAttributionResult[];
  safeFoods: string[];
  triggerFoods: string[];
  summary: string;
}

export async function runLocalAnalysis(): Promise<LocalAnalysisResult> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000).toISOString().split('T')[0];

  // Load all data for past 30 days
  const allDiet: DietRecord[] = [];
  const allSymptoms: SymptomRecord[] = [];

  for (let i = 0; i < 30; i++) {
    const d = new Date(today.getTime() - i * 86400000).toISOString().split('T')[0];
    try {
      const diet = await invoke<DietRecord[]>('diet_list_by_date', { date: d });
      allDiet.push(...diet);
      const symptoms = await invoke<SymptomRecord[]>('symptom_list_by_date', { date: d });
      allSymptoms.push(...symptoms);
    } catch { /* ignore */ }
  }

  if (allDiet.length === 0 || allSymptoms.length === 0) {
    return {
      period: `${thirtyDaysAgo} 至 ${todayStr}`,
      totalDietDays: 0,
      totalSymptomDays: 0,
      attributions: [],
      safeFoods: [],
      triggerFoods: [],
      summary: '数据不足，请先记录至少几天的饮食和症状数据。',
    };
  }

  // Build a list of symptom events (timestamp + type + intensity)
  interface SymptomEvent {
    timestamp: Date;
    type: string;
    label: string;
    intensity: number;
  }

  const symptomEvents: SymptomEvent[] = [];
  for (const s of allSymptoms) {
    const ts = new Date(s.timestamp);
    if (s.abdominal_pain_present && s.abdominal_pain_intensity > 2) {
      symptomEvents.push({ timestamp: ts, type: 'abdominal_pain', label: '腹痛', intensity: s.abdominal_pain_intensity });
    }
    if (s.tenesmus_present && s.tenesmus_intensity > 2) {
      symptomEvents.push({ timestamp: ts, type: 'tenesmus', label: '里急后重', intensity: s.tenesmus_intensity });
    }
    if (s.bloating_present && s.bloating_severity > 2) {
      symptomEvents.push({ timestamp: ts, type: 'bloating', label: '腹胀', intensity: s.bloating_severity });
    }
    if (s.overall_wellbeing < 5) {
      symptomEvents.push({ timestamp: ts, type: 'low_wellbeing', label: '整体不适', intensity: 10 - s.overall_wellbeing });
    }
  }

  // Build food consumption timeline
  interface FoodEvent {
    timestamp: Date;
    food: string;
    amount: number;
    meal: string;
  }

  const foodEvents: FoodEvent[] = [];
  for (const d of allDiet) {
    const ts = new Date(d.timestamp);
    for (const item of d.items) {
      foodEvents.push({ timestamp: ts, food: item.food_name, amount: item.amount_grams, meal: d.meal_type });
    }
  }

  // For each symptom type, compute food attribution
  const symptomTypes = [...new Set(symptomEvents.map(e => e.type))];
  const attributions: LocalAttributionResult[] = [];

  // Track all food scores across symptom types
  const globalFoodScores: Record<string, { triggerScore: number; safeScore: number; count: number }> = {};

  // Count total times each food was eaten
  const foodTotalCount: Record<string, number> = {};
  for (const f of foodEvents) {
    foodTotalCount[f.food] = (foodTotalCount[f.food] || 0) + 1;
  }

  for (const symptomType of symptomTypes) {
    const events = symptomEvents.filter(e => e.type === symptomType);
    const symptomLabel = events[0].label;
    const symptomCount = events.length;

    // For each symptom event, find foods eaten in previous 72 hours
    const foodBeforeSymptom: Record<string, { count: number; totalHours: number; totalAmount: number }> = {};

    for (const event of events) {
      const windowStart = new Date(event.timestamp.getTime() - 72 * 3600000);
      const relevantFoods = foodEvents.filter(f => f.timestamp >= windowStart && f.timestamp <= event.timestamp);

      for (const food of relevantFoods) {
        if (!foodBeforeSymptom[food.food]) {
          foodBeforeSymptom[food.food] = { count: 0, totalHours: 0, totalAmount: 0 };
        }
        foodBeforeSymptom[food.food].count++;
        foodBeforeSymptom[food.food].totalHours += (event.timestamp.getTime() - food.timestamp.getTime()) / 3600000;
        foodBeforeSymptom[food.food].totalAmount += food.amount;
      }
    }

    // Compute attribution scores
    const candidates: FoodAttribution[] = [];
    for (const [food, data] of Object.entries(foodBeforeSymptom)) {
      const totalEaten = foodTotalCount[food] || 1;
      const symptomRate = data.count / totalEaten;
      const avgHoursBefore = data.totalHours / data.count;

      // Score: frequency_ratio * recency_boost * amount_factor
      // Higher score = more likely to be a trigger
      const frequencyRatio = symptomRate;
      const recencyBoost = Math.max(0, 1 - avgHoursBefore / 72); // closer = higher
      const amountFactor = Math.min(1, data.totalAmount / (data.count * 100)); // normalized
      const score = frequencyRatio * 0.5 + recencyBoost * 0.3 + amountFactor * 0.2;

      const confidence: 'high' | 'medium' | 'low' = score > 0.6 ? 'high' : score > 0.35 ? 'medium' : 'low';
      const reason = `在${data.count}次症状前出现，平均${avgHoursBefore.toFixed(0)}小时前`;

      candidates.push({ food, score, frequency: data.count, totalEaten, symptomRate, avgHoursBefore, confidence, reason });

      // Track global scores
      if (!globalFoodScores[food]) globalFoodScores[food] = { triggerScore: 0, safeScore: 0, count: 0 };
      globalFoodScores[food].triggerScore += score;
      globalFoodScores[food].count++;
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    attributions.push({
      symptomType,
      symptomLabel,
      symptomCount,
      candidates: candidates.slice(0, 5), // top 5
    });
  }

  // Classify foods as safe or trigger
  const triggerFoods: string[] = [];
  const safeFoods: string[] = [];

  for (const [food, data] of Object.entries(globalFoodScores)) {
    const avgScore = data.triggerScore / data.count;
    if (avgScore > 0.4 && data.count >= 2) {
      triggerFoods.push(food);
    }
  }

  // Foods eaten often but never before symptoms = safe
  for (const [food, count] of Object.entries(foodTotalCount)) {
    if (count >= 3 && !triggerFoods.includes(food) && (!globalFoodScores[food] || globalFoodScores[food].triggerScore / globalFoodScores[food].count < 0.15)) {
      safeFoods.push(food);
    }
  }

  // Generate summary
  const totalDietDays = new Set(allDiet.map(d => d.timestamp.slice(0, 10))).size;
  const totalSymptomDays = new Set(allSymptoms.filter(s =>
    s.abdominal_pain_present || s.tenesmus_present || s.bloating_present || s.overall_wellbeing < 5
  ).map(s => s.timestamp.slice(0, 10))).size;

  let summary = `过去30天共记录${totalDietDays}天饮食，${totalSymptomDays}天有症状。`;
  if (triggerFoods.length > 0) {
    summary += `发现${triggerFoods.length}种可能触发食物：${triggerFoods.join('、')}。`;
  }
  if (safeFoods.length > 0) {
    summary += `${safeFoods.length}种食物表现安全：${safeFoods.join('、')}。`;
  }

  return {
    period: `${thirtyDaysAgo} 至 ${todayStr}`,
    totalDietDays,
    totalSymptomDays,
    attributions,
    safeFoods,
    triggerFoods,
    summary,
  };
}
