import { useState, useEffect } from 'react';
import { GlassCard, GlassButton, GlassModal, useToast } from '../components/ui';
import { PainSlider, DateNavigator } from '../components/shared';
import { Activity, Plus, Trash2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

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

interface SymptomFormData {
  abdominalPainPresent: boolean;
  abdominalPainIntensity: number;
  tenesmusPresent: boolean;
  tenesmusIntensity: number;
  bloatingPresent: boolean;
  bloatingSeverity: number;
  feverPresent: boolean;
  feverTemperature: string;
  jointPainPresent: boolean;
  fatigueLevel: number;
  overallWellbeing: number;
}

const initialFormData: SymptomFormData = {
  abdominalPainPresent: false,
  abdominalPainIntensity: 0,
  tenesmusPresent: false,
  tenesmusIntensity: 0,
  bloatingPresent: false,
  bloatingSeverity: 0,
  feverPresent: false,
  feverTemperature: '',
  jointPainPresent: false,
  fatigueLevel: 0,
  overallWellbeing: 5,
};

const _today = new Date().toISOString().split('T')[0];

export function SymptomRecordPage() {
  const [records, setRecords] = useState<SymptomRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<SymptomFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(_today);
  const toast = useToast();

  useEffect(() => {
    loadRecords();
  }, [selectedDate]);

  const loadRecords = async () => {
    try {
      const data = await invoke<SymptomRecord[]>('symptom_list_by_date', { date: selectedDate });
      setRecords(data);
    } catch (err) {
      console.error('加载记录失败:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await invoke('symptom_delete', { id });
      setRecords(records.filter(r => r.id !== id));
      toast.success('记录已删除');
    } catch (err) {
      toast.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const record = {
        id: null,
        timestamp: `${selectedDate}T${new Date().toTimeString().slice(0, 8)}Z`,
        abdominal_pain_present: formData.abdominalPainPresent,
        abdominal_pain_location: null,
        abdominal_pain_intensity: formData.abdominalPainIntensity,
        abdominal_pain_character: null,
        abdominal_pain_duration: 0,
        abdominal_pain_relieved_by_bm: false,
        tenesmus_present: formData.tenesmusPresent,
        tenesmus_intensity: formData.tenesmusIntensity,
        bloating_present: formData.bloatingPresent,
        bloating_severity: formData.bloatingSeverity,
        fever_present: formData.feverPresent,
        fever_temperature: formData.feverTemperature || null,
        joint_pain_present: formData.jointPainPresent,
        joint_pain_location: null,
        joint_pain_intensity: 0,
        skin_rash_present: false,
        skin_rash_location: null,
        mouth_ulcers_present: false,
        mouth_ulcers_count: 0,
        fatigue_level: formData.fatigueLevel,
        overall_wellbeing: formData.overallWellbeing,
      };

      await invoke('symptom_create', { record });
      setFormData(initialFormData);
      setShowModal(false);
      loadRecords();
      toast.success('症状记录保存成功');
    } catch (err) {
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (ts: string) => {
    try { return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
  };

  const getWellbeingLabel = (v: number) => {
    if (v >= 8) return '良好';
    if (v >= 6) return '还行';
    if (v >= 4) return '一般';
    if (v >= 2) return '较差';
    return '极差';
  };

  const getWellbeingColor = (v: number) => {
    if (v >= 8) return 'text-green-600 bg-green-50 border-green-200';
    if (v >= 6) return 'text-lime-600 bg-lime-50 border-lime-200';
    if (v >= 4) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (v >= 2) return 'text-orange-500 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          症状记录
        </h1>
        <div className="flex items-center gap-2">
          <DateNavigator date={selectedDate} onChange={setSelectedDate} />
          <GlassButton variant="primary" size="sm" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
            添加
          </GlassButton>
        </div>
      </div>

      {/* 今日概况 */}
      {records.length > 0 && (
        <GlassCard variant="elevated">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400 mb-1">最新整体健康感</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-800">{records[records.length - 1].overall_wellbeing}/10</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getWellbeingColor(records[records.length - 1].overall_wellbeing)}`}>
                  {getWellbeingLabel(records[records.length - 1].overall_wellbeing)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 mb-1">今日记录</div>
              <div className="text-2xl font-bold text-gray-800">{records.length}次</div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* 记录列表 */}
      {records.length === 0 ? (
        <GlassCard>
          <div className="text-center py-12 text-gray-400">
            <div className="text-3xl mb-2">🩺</div>
            <div className="text-sm">今日暂无症状记录</div>
            <div className="text-xs mt-1">点击右上角"添加"按钮记录</div>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <GlassCard key={record.id}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{formatTime(record.timestamp)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getWellbeingColor(record.overall_wellbeing)}`}>
                    健康感 {record.overall_wellbeing}/10
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(record.id)}
                  className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {record.abdominal_pain_present && (
                  <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-xs border border-orange-200">
                    腹痛 {record.abdominal_pain_intensity}/10
                  </span>
                )}
                {record.tenesmus_present && (
                  <span className="px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 text-xs border border-yellow-200">
                    里急后重 {record.tenesmus_intensity}/10
                  </span>
                )}
                {record.bloating_present && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs border border-blue-200">
                    腹胀 {record.bloating_severity}/10
                  </span>
                )}
                {record.fever_present && (
                  <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs border border-red-200">发热</span>
                )}
                {record.joint_pain_present && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 text-xs border border-purple-200">关节痛</span>
                )}
                {record.fatigue_level > 3 && (
                  <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 text-xs border border-gray-200">
                    疲劳 {record.fatigue_level}/10
                  </span>
                )}
                {!record.abdominal_pain_present && !record.tenesmus_present && !record.bloating_present && !record.fever_present && (
                  <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-xs border border-green-200">无明显症状</span>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* 添加记录弹窗 */}
      <GlassModal isOpen={showModal} onClose={() => setShowModal(false)} title="记录症状" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* 腹痛 */}
          <div className="p-3 rounded-xl bg-white/40 border border-white/50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500">腹痛</label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.abdominalPainPresent}
                  onChange={(e) => setFormData({ ...formData, abdominalPainPresent: e.target.checked })}
                  className="rounded border-gray-300" />
                <span className="text-xs text-gray-600">有腹痛</span>
              </label>
            </div>
            {formData.abdominalPainPresent && (
              <PainSlider value={formData.abdominalPainIntensity}
                onChange={(v) => setFormData({ ...formData, abdominalPainIntensity: v })}
                label="疼痛强度" mode="pain" />
            )}
          </div>

          {/* 里急后重 */}
          <div className="p-3 rounded-xl bg-white/40 border border-white/50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500">里急后重</label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.tenesmusPresent}
                  onChange={(e) => setFormData({ ...formData, tenesmusPresent: e.target.checked })}
                  className="rounded border-gray-300" />
                <span className="text-xs text-gray-600">有里急后重</span>
              </label>
            </div>
            {formData.tenesmusPresent && (
              <PainSlider value={formData.tenesmusIntensity}
                onChange={(v) => setFormData({ ...formData, tenesmusIntensity: v })}
                label="严重程度" mode="severity" />
            )}
          </div>

          {/* 腹胀 */}
          <div className="p-3 rounded-xl bg-white/40 border border-white/50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500">腹胀</label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.bloatingPresent}
                  onChange={(e) => setFormData({ ...formData, bloatingPresent: e.target.checked })}
                  className="rounded border-gray-300" />
                <span className="text-xs text-gray-600">有腹胀</span>
              </label>
            </div>
            {formData.bloatingPresent && (
              <PainSlider value={formData.bloatingSeverity}
                onChange={(v) => setFormData({ ...formData, bloatingSeverity: v })}
                label="严重程度" mode="severity" />
            )}
          </div>

          {/* 肠外表现 */}
          <div className="p-3 rounded-xl bg-white/40 border border-white/50 space-y-3">
            <label className="text-xs font-medium text-gray-500">肠外表现</label>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">发热</span>
              <input type="checkbox" checked={formData.feverPresent}
                onChange={(e) => setFormData({ ...formData, feverPresent: e.target.checked })}
                className="rounded border-gray-300" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">关节痛</span>
              <input type="checkbox" checked={formData.jointPainPresent}
                onChange={(e) => setFormData({ ...formData, jointPainPresent: e.target.checked })}
                className="rounded border-gray-300" />
            </div>
          </div>

          {/* 疲劳 */}
          <PainSlider value={formData.fatigueLevel}
            onChange={(v) => setFormData({ ...formData, fatigueLevel: v })}
            label="疲劳程度" mode="fatigue" />

          {/* 整体健康感 */}
          <PainSlider value={formData.overallWellbeing}
            onChange={(v) => setFormData({ ...formData, overallWellbeing: v })}
            label="整体健康感" mode="wellbeing" />

          <GlassButton variant="primary" size="lg" onClick={handleSubmit} loading={saving} className="w-full">
            保存记录
          </GlassButton>
        </div>
      </GlassModal>
    </div>
  );
}
