import { useState, useEffect } from 'react';
import { GlassCard, GlassButton, GlassInput, useToast } from '../components/ui';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { FlaskConical, Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface FCRecord {
  id: string;
  date: string;
  value: number;
  unit: string;
  notes: string;
}

function getFCStatus(value: number) {
  if (value < 50) return { level: 'remission', label: '缓解', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', emoji: '🟢' };
  if (value <= 250) return { level: 'mild', label: '轻度活动', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', emoji: '🟡' };
  if (value <= 500) return { level: 'moderate', label: '中重度活动', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', emoji: '🟠' };
  return { level: 'severe', label: '重度活动', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', emoji: '🔴' };
}

function getTrend(records: FCRecord[]) {
  if (records.length < 2) return { direction: 'stable', label: '数据不足', icon: Minus };
  const last = records[records.length - 1].value;
  const prev = records[records.length - 2].value;
  const change = last - prev;
  const pctChange = (change / prev) * 100;

  if (pctChange < -15) return { direction: 'improving', label: '持续改善', icon: TrendingDown, color: 'text-green-600' };
  if (pctChange > 15) return { direction: 'worsening', label: '恶化趋势', icon: TrendingUp, color: 'text-red-600' };
  return { direction: 'stable', label: '平台期', icon: Minus, color: 'text-yellow-600' };
}

function getMucosalHealingProb(records: FCRecord[]) {
  if (records.length === 0) return 0;
  const latest = records[records.length - 1].value;
  if (latest < 50) return 95;
  if (latest < 100) return 70;
  if (latest < 150) return 50;
  if (latest < 250) return 30;
  return 10;
}

export function FCTrackerPage() {
  const [records, setRecords] = useState<FCRecord[]>([]);
  const [newValue, setNewValue] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNotes, setNewNotes] = useState('');
  const toast = useToast();

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const data = await invoke<FCRecord[]>('fc_list_all');
      setRecords(data);
    } catch (err) {
      console.error('加载FC记录失败:', err);
    }
  };

  const latestFC = records.length > 0 ? records[records.length - 1] : null;
  const fcStatus = latestFC ? getFCStatus(latestFC.value) : null;
  const trend = getTrend(records);
  const healingProb = getMucosalHealingProb(records);

  const chartData = records.map(r => ({
    date: r.date.slice(5),
    value: r.value,
    fullDate: r.date,
  }));

  const handleAdd = async () => {
    if (!newValue || !newDate) return;
    const val = parseFloat(newValue);
    if (isNaN(val) || val < 0) return;

    try {
      const newRecord = await invoke<FCRecord>('fc_create', {
        record: {
          id: null,
          date: newDate,
          value: val,
          unit: 'µg/g',
          notes: newNotes || null,
        },
      });
      setRecords([...records, newRecord].sort((a, b) => a.date.localeCompare(b.date)));
      setNewValue('');
      setNewNotes('');
      toast.success('FC 记录保存成功');
    } catch (err) {
      console.error('保存FC记录失败:', err);
      toast.error('保存失败，请重试');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await invoke('fc_delete', { id });
      setRecords(records.filter(r => r.id !== id));
      toast.success('FC 记录已删除');
    } catch (err) {
      console.error('删除FC记录失败:', err);
      toast.error('删除失败，请重试');
    }
  };

  const TrendIcon = trend.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
          <FlaskConical className="w-5 h-5" />
          FC 追踪
        </h1>
      </div>

      {/* 空状态 */}
      {records.length === 0 && (
        <GlassCard>
          <div className="text-center py-12 text-gray-400">
            <div className="text-3xl mb-2">🧪</div>
            <div className="text-sm">暂无 FC 检测记录</div>
            <div className="text-xs mt-1">在下方添加您的粪便钙卫蛋白检测结果</div>
          </div>
        </GlassCard>
      )}

      {/* 最新状态卡片 */}
      {latestFC && fcStatus && (
        <GlassCard variant="elevated">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">最新 FC 值</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-800">{latestFC.value}</span>
                <span className="text-sm text-gray-500">µg/g</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{latestFC.date}</div>
            </div>
            <div className={`px-3 py-2 rounded-xl ${fcStatus.bg} ${fcStatus.border} border`}>
              <div className={`text-sm font-medium ${fcStatus.color}`}>
                {fcStatus.emoji} {fcStatus.label}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 趋势 */}
            <div className="p-3 rounded-xl bg-white/40 border border-white/50">
              <div className="text-xs text-gray-500 mb-1">趋势</div>
              <div className={`flex items-center gap-1.5 text-sm font-medium ${trend.color}`}>
                <TrendIcon className="w-4 h-4" />
                {trend.label}
              </div>
            </div>

            {/* 黏膜愈合概率 */}
            <div className="p-3 rounded-xl bg-white/40 border border-white/50">
              <div className="text-xs text-gray-500 mb-1">黏膜愈合概率</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      healingProb >= 70 ? 'bg-green-500' : healingProb >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${healingProb}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">{healingProb}%</span>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* 趋势图表 */}
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-medium text-gray-500">FC 趋势图</label>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-teal-500 rounded"></span>
            <span className="text-[10px] text-gray-400">FC值</span>
            <span className="w-3 h-0.5 bg-green-400 rounded ml-2"></span>
            <span className="text-[10px] text-gray-400">目标线 (50)</span>
          </div>
        </div>
        {chartData.length > 1 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`${value} µg/g`, 'FC值']}
                  labelFormatter={(label) => `日期: ${label}`}
                />
                <ReferenceLine y={50} stroke="#22c55e" strokeDasharray="5 5" label={{ value: '缓解', position: 'right', fontSize: 10, fill: '#22c55e' }} />
                <ReferenceLine y={250} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: '轻度', position: 'right', fontSize: 10, fill: '#f59e0b' }} />
                <Line type="monotone" dataKey="value" stroke="#14b8a6" strokeWidth={2.5} dot={{ fill: '#14b8a6', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400 text-sm">
            需要至少2条记录才能显示趋势图
          </div>
        )}
      </GlassCard>

      {/* 添加新记录 */}
      <GlassCard>
        <label className="block text-xs font-medium text-gray-500 mb-3">
          添加 FC 检测记录
        </label>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <GlassInput
              label="检测日期"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
            <GlassInput
              label="FC 值 (µg/g)"
              type="number"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="例如：120"
            />
          </div>
          <GlassInput
            label="备注（可选）"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="例如：治疗第4周"
          />
          <GlassButton
            variant="primary"
            size="sm"
            onClick={handleAdd}
            className="w-full"
          >
            <Plus className="w-4 h-4" />
            添加记录
          </GlassButton>
        </div>
      </GlassCard>

      {/* 历史记录列表 */}
      <GlassCard>
        <label className="block text-xs font-medium text-gray-500 mb-3">
          历史记录
        </label>
        {records.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            暂无 FC 检测记录
          </div>
        ) : (
          <div className="space-y-2">
            {[...records].reverse().map((record) => {
              const status = getFCStatus(record.value);
              return (
                <div key={record.id} className="flex items-center justify-between p-3 rounded-xl bg-white/40 border border-white/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${status.bg}`}>
                      <span className="text-sm">{status.emoji}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">{record.value} µg/g</div>
                      <div className="text-xs text-gray-400">{record.date}{record.notes ? ` · ${record.notes}` : ''}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(record.id)}
                      className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <span className="text-xs">×</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* FC 参考值说明 */}
      <GlassCard>
        <label className="block text-xs font-medium text-gray-500 mb-3">
          FC 参考值说明
        </label>
        <div className="space-y-2">
          {[
            { range: '< 50 µg/g', status: '缓解', action: '维持治疗，可考虑减量', color: 'bg-green-100 text-green-700', emoji: '🟢' },
            { range: '50-250 µg/g', status: '轻度活动', action: '优化治疗，4-8周复查', color: 'bg-yellow-100 text-yellow-700', emoji: '🟡' },
            { range: '> 250 µg/g', status: '中重度活动', action: '评估升级治疗', color: 'bg-orange-100 text-orange-700', emoji: '🟠' },
            { range: '> 500 µg/g', status: '重度活动', action: '紧急评估', color: 'bg-red-100 text-red-700', emoji: '🔴' },
          ].map((item) => (
            <div key={item.range} className="flex items-center gap-3 p-2 rounded-lg bg-white/30">
              <span className="text-sm">{item.emoji}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-700">{item.range}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${item.color}`}>{item.status}</span>
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">{item.action}</div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
