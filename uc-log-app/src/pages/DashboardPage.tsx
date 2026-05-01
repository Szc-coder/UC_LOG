import { useState, useEffect } from 'react';
import { GlassCard } from '../components/ui';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Area, AreaChart, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell,
} from 'recharts';

interface DailyStoolSummary {
  date: string;
  total_count: number;
  b1_count: number;
  b2_count: number;
  b3_count: number;
  b4_count: number;
  b5_count: number;
  b6_count: number;
  b7_count: number;
  blood_occurrences: number;
  mucus_occurrences: number;
  urgency_avg: number | null;
  pain_episodes: number;
}

interface DailySymptomSummary {
  date: string;
  record_count: number;
  avg_wellbeing: number | null;
  avg_fatigue: number | null;
  pain_count: number;
  tenesmus_count: number;
  bloating_count: number;
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[150px] text-gray-300">
      <div className="text-center">
        <div className="text-2xl mb-1">📊</div>
        <div className="text-xs">{text}</div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [todaySummary, setTodaySummary] = useState<DailyStoolSummary | null>(null);
  const [stoolTrend, setStoolTrend] = useState<DailyStoolSummary[]>([]);
  const [symptomTrend, setSymptomTrend] = useState<DailySymptomSummary[]>([]);
  const [alertLevel, setAlertLevel] = useState<'green' | 'yellow' | 'orange' | 'red'>('green');

  useEffect(() => {
    loadTodayData();
    loadTrendData();
  }, []);

  const loadTodayData = async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const data = await invoke<DailyStoolSummary>('stool_daily_summary', { date: today });
      setTodaySummary(data);
      calculateAlertLevel(data);
    } catch (err) {
      console.error('加载今日数据失败:', err);
    }
  };

  const loadTrendData = async () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    const startDate = start.toISOString().split('T')[0];
    const endDate = end.toISOString().split('T')[0];

    try {
      const [stoolData, symptomData] = await Promise.all([
        invoke<DailyStoolSummary[]>('stool_summary_range', { startDate, endDate }),
        invoke<DailySymptomSummary[]>('symptom_summary_range', { startDate, endDate }),
      ]);
      setStoolTrend(stoolData);
      setSymptomTrend(symptomData);
    } catch (err) {
      console.error('加载趋势数据失败:', err);
    }
  };

  const calculateAlertLevel = (data: DailyStoolSummary) => {
    if (data.total_count > 8 || data.blood_occurrences > 3) {
      setAlertLevel('red');
    } else if (data.total_count > 6 || data.blood_occurrences >= 2 || (data.urgency_avg && data.urgency_avg >= 7)) {
      setAlertLevel('orange');
    } else if (data.total_count > 4 || data.blood_occurrences >= 1 || (data.urgency_avg && data.urgency_avg >= 5)) {
      setAlertLevel('yellow');
    } else {
      setAlertLevel('green');
    }
  };

  const alertConfig = {
    green: { emoji: '🟢', label: '缓解期', desc: '维持当前方案', color: 'text-green-700', bg: 'bg-green-50/40', border: 'border-green-200/60' },
    yellow: { emoji: '🟡', label: '轻度活动', desc: '加强监测', color: 'text-yellow-700', bg: 'bg-yellow-50/40', border: 'border-yellow-200/60' },
    orange: { emoji: '🟠', label: '中度活动', desc: '48h内就医', color: 'text-orange-700', bg: 'bg-orange-50/40', border: 'border-orange-200/60' },
    red: { emoji: '🔴', label: '重度活动', desc: '立即急诊', color: 'text-red-700', bg: 'bg-red-50/40', border: 'border-red-200/60' },
  };

  const alert = alertConfig[alertLevel];

  const stoolTrendData = stoolTrend.map(d => ({
    date: d.date.slice(5),
    便次: d.total_count,
    便血: d.blood_occurrences,
  }));

  const bristolDistData = [
    { name: '1型', value: stoolTrend.reduce((s, d) => s + d.b1_count, 0) },
    { name: '2型', value: stoolTrend.reduce((s, d) => s + d.b2_count, 0) },
    { name: '3型', value: stoolTrend.reduce((s, d) => s + d.b3_count, 0) },
    { name: '4型', value: stoolTrend.reduce((s, d) => s + d.b4_count, 0) },
    { name: '5型', value: stoolTrend.reduce((s, d) => s + d.b5_count, 0) },
    { name: '6型', value: stoolTrend.reduce((s, d) => s + d.b6_count, 0) },
    { name: '7型', value: stoolTrend.reduce((s, d) => s + d.b7_count, 0) },
  ];

  const symptomTrendData = symptomTrend.map(d => ({
    date: d.date.slice(5),
    健康感: d.avg_wellbeing ? Math.round(d.avg_wellbeing * 10) / 10 : null,
    疲劳: d.avg_fatigue ? Math.round(d.avg_fatigue * 10) / 10 : null,
  }));

  const todaySymptom = symptomTrend.find(d => d.date === new Date().toISOString().split('T')[0]);
  const avgWellbeing = symptomTrend.length > 0
    ? symptomTrend.reduce((s, d) => s + (d.avg_wellbeing || 0), 0) / symptomTrend.filter(d => d.avg_wellbeing).length
    : 0;
  const avgFatigue = symptomTrend.length > 0
    ? symptomTrend.reduce((s, d) => s + (d.avg_fatigue || 0), 0) / symptomTrend.filter(d => d.avg_fatigue).length
    : 0;

  const radarData = [
    { subject: '健康感', 今日: todaySymptom?.avg_wellbeing || 0, 均值: Math.round(avgWellbeing * 10) / 10 },
    { subject: '疲劳', 今日: todaySymptom?.avg_fatigue || 0, 均值: Math.round(avgFatigue * 10) / 10 },
    { subject: '腹痛', 今日: todaySymptom?.pain_count || 0, 均值: Math.round(symptomTrend.reduce((s, d) => s + d.pain_count, 0) / Math.max(symptomTrend.length, 1) * 10) / 10 },
    { subject: '里急后重', 今日: todaySymptom?.tenesmus_count || 0, 均值: Math.round(symptomTrend.reduce((s, d) => s + d.tenesmus_count, 0) / Math.max(symptomTrend.length, 1) * 10) / 10 },
    { subject: '腹胀', 今日: todaySymptom?.bloating_count || 0, 均值: Math.round(symptomTrend.reduce((s, d) => s + d.bloating_count, 0) / Math.max(symptomTrend.length, 1) * 10) / 10 },
  ];

  const bristolColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#22c55e', '#eab308', '#ef4444'];
  const hasStoolData = stoolTrendData.length > 0;
  const hasBristolData = bristolDistData.some(d => d.value > 0);
  const hasSymptomData = symptomTrend.length > 0;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-gray-700">仪表盘</h1>

      {/* 顶部状态卡片 */}
      <div className="grid grid-cols-2 gap-4">
        <GlassCard variant="elevated">
          <h3 className="text-xs font-medium text-gray-400 mb-3">今日状态</h3>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">便次</span>
              <span className="font-medium text-gray-700">{todaySummary?.total_count ?? 0}次</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Bristol</span>
              <span className="font-medium text-gray-700">
                {todaySummary ? (todaySummary.b4_count + todaySummary.b5_count > 0 ? '4-5型' : '-') : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">便血</span>
              <span className="font-medium text-gray-700">{todaySummary ? (todaySummary.blood_occurrences > 0 ? `${todaySummary.blood_occurrences}次` : '无') : '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">腹痛</span>
              <span className="font-medium text-gray-700">{todaySummary ? (todaySummary.pain_episodes > 0 ? `${todaySummary.pain_episodes}次` : '无') : '-'}</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard variant="elevated">
          <h3 className="text-xs font-medium text-gray-400 mb-3">预警等级</h3>
          <div className={`p-4 rounded-xl border ${alert.border} ${alert.bg} backdrop-blur-sm text-center`}>
            <div className="text-2xl mb-1">{alert.emoji}</div>
            <div className={`text-base font-semibold ${alert.color}`}>{alert.label}</div>
            <div className={`text-xs ${alert.color} mt-0.5`}>{alert.desc}</div>
          </div>
        </GlassCard>
      </div>

      {/* 7天排便趋势 */}
      <GlassCard>
        <h3 className="text-xs font-medium text-gray-400 mb-3">7天排便趋势</h3>
        {hasStoolData ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stoolTrendData}>
              <defs>
                <linearGradient id="colorStool" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorBlood" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb40" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="便次" stroke="#14b8a6" fill="url(#colorStool)" strokeWidth={2} />
              <Area type="monotone" dataKey="便血" stroke="#ef4444" fill="url(#colorBlood)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart text="暂无排便数据，开始记录后查看趋势" />
        )}
      </GlassCard>

      {/* Bristol分布 + 症状雷达图 */}
      <div className="grid grid-cols-2 gap-4">
        <GlassCard>
          <h3 className="text-xs font-medium text-gray-400 mb-3">7天Bristol分布</h3>
          {hasBristolData ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={bristolDistData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb40" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="value" name="次数" radius={[4, 4, 0, 0]}>
                  {bristolDistData.map((_, index) => (
                    <Cell key={index} fill={bristolColors[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart text="暂无Bristol数据" />
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="text-xs font-medium text-gray-400 mb-3">今日 vs 7天均值</h3>
          {hasSymptomData ? (
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb60" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#6b7280' }} />
                <PolarRadiusAxis tick={{ fontSize: 9, fill: '#9ca3af' }} />
                <Radar name="今日" dataKey="今日" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.3} strokeWidth={2} />
                <Radar name="7天均值" dataKey="均值" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={1} strokeDasharray="4 4" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart text="暂无症状数据" />
          )}
        </GlassCard>
      </div>

      {/* 症状健康感趋势 */}
      <GlassCard>
        <h3 className="text-xs font-medium text-gray-400 mb-3">7天健康感 & 疲劳趋势</h3>
        {hasSymptomData && symptomTrendData.some(d => d.健康感 !== null) ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={symptomTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb40" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="健康感" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="疲劳" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart text="暂无症状数据，开始记录后查看趋势" />
        )}
      </GlassCard>

      {/* 快速操作 */}
      <GlassCard>
        <h3 className="text-xs font-medium text-gray-400 mb-3">快速操作</h3>
        <div className="grid grid-cols-4 gap-3">
          <button type="button" onClick={() => navigate('/stool')} className="p-3 rounded-xl bg-white/40 hover:bg-white/60 transition-all duration-150 text-center outline-none">
            <div className="text-xl mb-1">🚽</div>
            <div className="text-xs text-gray-600">记录排便</div>
          </button>
          <button type="button" onClick={() => navigate('/diet')} className="p-3 rounded-xl bg-white/40 hover:bg-white/60 transition-all duration-150 text-center outline-none">
            <div className="text-xl mb-1">🍽️</div>
            <div className="text-xs text-gray-600">记录饮食</div>
          </button>
          <button type="button" onClick={() => navigate('/medication')} className="p-3 rounded-xl bg-white/40 hover:bg-white/60 transition-all duration-150 text-center outline-none">
            <div className="text-xl mb-1">💊</div>
            <div className="text-xs text-gray-600">记录用药</div>
          </button>
          <button type="button" onClick={() => navigate('/analysis')} className="p-3 rounded-xl bg-white/40 hover:bg-white/60 transition-all duration-150 text-center outline-none">
            <div className="text-xl mb-1">📊</div>
            <div className="text-xs text-gray-600">查看分析</div>
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
