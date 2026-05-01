import { invoke } from '@tauri-apps/api/core';

interface AIConfig {
  api_base_url: string;
  api_key: string;
  model_name: string;
  max_tokens: number;
  temperature: number;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Robustly extract and parse JSON from LLM output that may contain
 * markdown code blocks, explanatory text, or trailing commas.
 */
export function extractJSON<T>(text: string): T | null {
  try {
    let cleaned = text.trim();

    // 1. Try to extract from ```json ... ``` code block
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim();
    }

    // 2. Find the outermost { ... } or [ ... ]
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let start = -1;
    let isArray = false;

    if (firstBrace === -1 && firstBracket === -1) return null;
    if (firstBrace === -1) { start = firstBracket; isArray = true; }
    else if (firstBracket === -1) { start = firstBrace; }
    else if (firstBrace < firstBracket) { start = firstBrace; }
    else { start = firstBracket; isArray = true; }

    // Find matching closing bracket by counting nesting depth
    const openChar = isArray ? '[' : '{';
    const closeChar = isArray ? ']' : '}';
    let depth = 0;
    let end = -1;
    let inString = false;
    let escape = false;

    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === openChar) depth++;
      if (ch === closeChar) {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }

    if (end === -1) end = cleaned.length;
    let jsonStr = cleaned.slice(start, end + 1);

    // 3. Remove trailing commas before } or ]
    jsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1');

    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

export async function getAIConfig(): Promise<AIConfig | null> {
  try {
    return await invoke<AIConfig | null>('ai_config_get');
  } catch {
    return null;
  }
}

export async function callAI(messages: ChatMessage[]): Promise<string> {
  const config = await getAIConfig();
  if (!config) {
    throw new Error('AI 配置未设置，请在设置页面配置 AI 服务');
  }

  const url = `${config.api_base_url.replace(/\/+$/, '')}/chat/completions`;
  console.log('[callAI] 请求:', url, 'model:', config.model_name, 'max_tokens:', config.max_tokens);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.api_key}`,
    },
    body: JSON.stringify({
      model: config.model_name,
      messages,
      temperature: config.temperature,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[callAI] HTTP错误:', response.status, text.slice(0, 300));
    throw new Error(`AI 请求失败 (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  console.log('[callAI] 响应 keys:', Object.keys(data));
  if (data.error) {
    console.error('[callAI] API错误:', data.error);
    throw new Error(`AI API 错误: ${data.error.message || JSON.stringify(data.error)}`);
  }
  const content = data.choices?.[0]?.message?.content ?? '';
  console.log('[callAI] content长度:', content.length, 'finish_reason:', data.choices?.[0]?.finish_reason);
  if (!content) {
    console.error('[callAI] 空响应, 完整data:', JSON.stringify(data).slice(0, 500));
    throw new Error('AI 返回空响应，请检查模型配置或稍后重试');
  }
  return content;
}

export async function callAIStream(
  messages: ChatMessage[],
  onProgress: (partial: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const config = await getAIConfig();
  if (!config) {
    throw new Error('AI 配置未设置，请在设置页面配置 AI 服务');
  }

  const url = `${config.api_base_url.replace(/\/+$/, '')}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.api_key}`,
    },
    body: JSON.stringify({
      model: config.model_name,
      messages,
      temperature: config.temperature,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI 请求失败 (${response.status}): ${text}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';
  let lastEmit = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          fullText += content;
          // Throttle onProgress to max once per 150ms to avoid UI freeze
          const now = Date.now();
          if (now - lastEmit >= 150) {
            lastEmit = now;
            onProgress(fullText);
          }
        }
      } catch {
        // skip malformed chunks
      }
    }
  }

  // Final emit
  onProgress(fullText);
  return fullText;
}

export async function analyzeAttribution(symptomData: string, dietHistory: string): Promise<string> {
  return callAI([
    {
      role: 'system',
      content: `你是一个专业的UC（溃疡性结肠炎）饮食-症状归因分析助手。基于贝叶斯推理方法，分析症状出现前72小时内的饮食记录，找出可能的触发食物。
分析维度包括：时间接近度（权重0.30）、历史反应率（权重0.25）、剂量效应（权重0.20）、排除度（权重0.15）、症状特异性（权重0.10）。
请用JSON格式输出分析结果。`,
    },
    {
      role: 'user',
      content: `请分析以下症状和饮食数据：

症状数据：${symptomData}

饮食历史：${dietHistory}

请给出Top 3候选食物，包含：食物名称、对应餐次、距症状出现时间、归因得分(0-1)、置信度(高/中/低)、原因分析，以及AI建议。`,
    },
  ]);
}

export async function generateMealRecommendation(symptomStatus: string, safeFoods: string, avoidFoods: string): Promise<string> {
  return callAI([
    {
      role: 'system',
      content: `你是一个专业的UC（溃疡性结肠炎）饮食推荐助手。基于患者当前症状状态、已知耐受食物库和营养需求，生成个性化每日饮食推荐。
推荐原则：
1. 活动期采用低渣、低纤维饮食
2. 避免已知过敏原和不耐受食物
3. 保证足够蛋白质和热量摄入
4. 食物以蒸、煮、泥状为主
请用JSON格式输出推荐。`,
    },
    {
      role: 'user',
      content: `当前症状状态：${symptomStatus}

安全食物：${safeFoods}

避免食物：${avoidFoods}

请生成今日四餐（早餐、午餐、晚餐、加餐）的饮食推荐，包含每道菜的食物名称、份量(克)、烹饪方式，以及整体营养估算和AI小贴士。`,
    },
  ]);
}

export async function generateReport(dataSummary: string): Promise<string> {
  return callAI([
    {
      role: 'system',
      content: `你是一个专业的UC（溃疡性结肠炎）复诊报告生成助手。基于患者过去30天的记录数据，生成结构化的复诊摘要，帮助患者与医生高效沟通。

报告应包含：
1. 执行摘要（200字以内）：30天整体评估（好转/稳定/恶化）、关键变化、治疗建议
2. 症状详细分析：排便趋势、腹痛变化、肠外表现
3. 饮食耐受性分析：安全/谨慎/避免食物清单
4. 用药依从性评估
5. AI建议问医生的5个问题
6. 下一步治疗建议

请用JSON格式输出报告。`,
    },
    {
      role: 'user',
      content: `请基于以下30天数据生成复诊报告：

${dataSummary}`,
    },
  ]);
}

export async function analyzeFC(fcHistory: string): Promise<string> {
  return callAI([
    {
      role: 'system',
      content: `你是一个专业的UC（溃疡性结肠炎）粪便钙卫蛋白(FC)分析助手。基于FC检测数据，评估黏膜愈合进度和治疗效果。

FC参考值：
- < 50 µg/g：缓解，维持治疗
- 50-250 µg/g：轻度活动，优化治疗
- > 250 µg/g：中重度活动，评估升级治疗
- > 500 µg/g：重度活动，紧急评估

请用JSON格式输出分析结果。`,
    },
    {
      role: 'user',
      content: `请分析以下FC检测数据：

${fcHistory}

请给出：当前状态评估、趋势分析（持续改善/平台期/恶化）、黏膜愈合概率、治疗建议。`,
    },
  ]);
}
