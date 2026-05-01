import { useState, useEffect } from 'react';
import { GlassCard, GlassButton, GlassModal, useToast } from '../components/ui';
import { BristolSelector, BloodAmountSelector, PainSlider, MucusSelector, DateNavigator } from '../components/shared';
import { Plus, Trash2, Activity } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface StoolRecord {
  id: string;
  timestamp: string;
  bristol_type: number;
  color: string;
  consistency: string;
  blood_present: boolean;
  blood_amount: string | null;
  mucus_present: boolean;
  mucus_amount: string | null;
  urgency_level: number | null;
  pain_before_intensity: number | null;
  pain_after_intensity: number | null;
}

interface StoolFormData {
  bristolType: number | null;
  color: string;
  consistency: string;
  volume: string;
  bloodPresent: boolean;
  bloodAmount: string;
  mucusPresent: boolean;
  mucusAmount: string;
  urgencyLevel: number;
  urgencySudden: boolean;
  painBeforeIntensity: number;
  painAfterIntensity: number;
}

const initialFormData: StoolFormData = {
  bristolType: null,
  color: 'brown',
  consistency: 'formed',
  volume: 'medium',
  bloodPresent: false,
  bloodAmount: 'none',
  mucusPresent: false,
  mucusAmount: 'none',
  urgencyLevel: 0,
  urgencySudden: false,
  painBeforeIntensity: 0,
  painAfterIntensity: 0,
};

const bristolLabels: Record<number, string> = {
  1: '1型-坚果状', 2: '2型-香肠状成块', 3: '3型-香肠有裂痕',
  4: '4型-光滑软条', 5: '5型-软块边缘清', 6: '6型-糊状蓬松', 7: '7型-水样',
};

const bristolColors: Record<number, string> = {
  1: 'bg-red-100 text-red-700', 2: 'bg-orange-100 text-orange-700', 3: 'bg-yellow-100 text-yellow-700',
  4: 'bg-green-100 text-green-700', 5: 'bg-green-100 text-green-700', 6: 'bg-yellow-100 text-yellow-700', 7: 'bg-red-100 text-red-700',
};

const colorOptions = [
  { value: 'yellow', label: '黄色', color: 'bg-yellow-200' },
  { value: 'brown', label: '棕色', color: 'bg-amber-600' },
  { value: 'dark_brown', label: '深棕', color: 'bg-amber-800' },
  { value: 'black', label: '黑色', color: 'bg-gray-900' },
  { value: 'red', label: '红色', color: 'bg-red-600' },
  { value: 'bloody', label: '血便', color: 'bg-red-800' },
];

const consistencyOptions = [
  { value: 'formed', label: '成形' },
  { value: 'soft', label: '软便' },
  { value: 'mushy', label: '糊状' },
  { value: 'watery', label: '水样' },
];

const volumeOptions = [
  { value: 'small', label: '少量' },
  { value: 'medium', label: '中等' },
  { value: 'large', label: '大量' },
];

const today = new Date().toISOString().split('T')[0];

export function StoolRecordPage() {
  const [records, setRecords] = useState<StoolRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<StoolFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const toast = useToast();

  useEffect(() => {
    loadRecords();
  }, [selectedDate]);

  const loadRecords = async () => {
    try {
      const data = await invoke<StoolRecord[]>('stool_list_by_date', { date: selectedDate });
      setRecords(data);
    } catch (err) {
      console.error('加载记录失败:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await invoke('stool_delete', { id });
      setRecords(records.filter(r => r.id !== id));
      toast.success('记录已删除');
    } catch (err) {
      toast.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    if (!formData.bristolType) {
      toast.warning('请选择 Bristol 类型');
      return;
    }

    setSaving(true);
    try {
      const record = {
        id: null,
        timestamp: `${selectedDate}T${new Date().toTimeString().slice(0, 8)}Z`,
        sequence_number: 1,
        bristol_type: formData.bristolType,
        color: formData.color,
        consistency: formData.consistency,
        volume: formData.volume,
        blood_present: formData.bloodPresent,
        blood_amount: formData.bloodAmount,
        blood_location: null,
        blood_color: null,
        mucus_present: formData.mucusPresent,
        mucus_amount: formData.mucusAmount,
        mucus_color: null,
        urgency_level: formData.urgencyLevel,
        urgency_sudden: formData.urgencySudden,
        pain_before_present: formData.painBeforeIntensity > 0,
        pain_before_location: null,
        pain_before_intensity: formData.painBeforeIntensity,
        pain_after_present: formData.painAfterIntensity > 0,
        pain_after_location: null,
        pain_after_intensity: formData.painAfterIntensity,
      };

      await invoke('stool_create', { record });
      setFormData(initialFormData);
      setShowModal(false);
      loadRecords();
      toast.success('排便记录保存成功');
    } catch (err) {
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (ts: string) => {
    try { return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          排便记录
        </h1>
        <div className="flex items-center gap-2">
          <DateNavigator date={selectedDate} onChange={setSelectedDate} />
          <GlassButton variant="primary" size="sm" onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" />
            添加
          </GlassButton>
        </div>
      </div>

      {/* 今日汇总 */}
      <GlassCard variant="elevated">
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{records.length}</div>
            <div className="text-[10px] text-gray-400">今日便次</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">
              {records.length > 0 ? `${records[records.length - 1].bristol_type}型` : '-'}
            </div>
            <div className="text-[10px] text-gray-400">最新Bristol</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">
              {records.filter(r => r.blood_present).length}
            </div>
            <div className="text-[10px] text-gray-400">便血次数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-500">
              {records.filter(r => (r.urgency_level || 0) > 5).length}
            </div>
            <div className="text-[10px] text-gray-400">急迫次数</div>
          </div>
        </div>
      </GlassCard>

      {/* 记录列表 */}
      {records.length === 0 ? (
        <GlassCard>
          <div className="text-center py-12 text-gray-400">
            <div className="text-3xl mb-2">🚽</div>
            <div className="text-sm">今日暂无排便记录</div>
            <div className="text-xs mt-1">点击右上角"添加"按钮记录</div>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <GlassCard key={record.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`px-2 py-1 rounded-lg text-xs font-medium ${bristolColors[record.bristol_type] || 'bg-gray-100 text-gray-700'}`}>
                    {bristolLabels[record.bristol_type] || `${record.bristol_type}型`}
                  </div>
                  <span className="text-xs text-gray-400">{formatTime(record.timestamp)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {record.blood_present && (
                    <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs border border-red-200">便血</span>
                  )}
                  {record.mucus_present && (
                    <span className="px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 text-xs border border-yellow-200">黏液</span>
                  )}
                  {record.urgency_level && record.urgency_level > 5 && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-xs border border-orange-200">急迫</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(record.id)}
                    className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* 添加记录弹窗 */}
      <GlassModal isOpen={showModal} onClose={() => setShowModal(false)} title="记录排便" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <BristolSelector
            value={formData.bristolType}
            onChange={(type) => setFormData({ ...formData, bristolType: type })}
          />

          {/* 颜色 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">颜色</label>
            <div className="grid grid-cols-6 gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: option.value })}
                  className={`p-2 rounded-xl border-2 transition-all outline-none text-center
                    ${formData.color === option.value ? 'border-teal-500 bg-teal-50/50 shadow-sm' : 'border-white/60 bg-white/40 hover:bg-white/60'}`}
                >
                  <div className={`w-5 h-5 rounded-full ${option.color} mx-auto mb-0.5`} />
                  <div className="text-[10px] text-gray-600">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 性状 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">性状</label>
            <div className="grid grid-cols-4 gap-2">
              {consistencyOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, consistency: option.value })}
                  className={`p-2 rounded-xl border-2 transition-all outline-none text-center
                    ${formData.consistency === option.value ? 'border-teal-500 bg-teal-50/50 shadow-sm' : 'border-white/60 bg-white/40 hover:bg-white/60'}`}
                >
                  <div className="text-xs font-medium text-gray-700">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 份量 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">份量</label>
            <div className="grid grid-cols-3 gap-2">
              {volumeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, volume: option.value })}
                  className={`p-2 rounded-xl border-2 transition-all outline-none text-center
                    ${formData.volume === option.value ? 'border-teal-500 bg-teal-50/50 shadow-sm' : 'border-white/60 bg-white/40 hover:bg-white/60'}`}
                >
                  <div className="text-xs font-medium text-gray-700">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          <BloodAmountSelector
            value={formData.bloodAmount}
            onChange={(amount) => setFormData({ ...formData, bloodAmount: amount, bloodPresent: amount !== 'none' })}
          />

          <MucusSelector
            value={formData.mucusAmount}
            onChange={(amount) => setFormData({ ...formData, mucusAmount: amount, mucusPresent: amount !== 'none' })}
          />

          <PainSlider
            value={formData.urgencyLevel}
            onChange={(level) => setFormData({ ...formData, urgencyLevel: level })}
            label="排便急迫感"
            mode="urgency"
          />

          <PainSlider
            value={formData.painBeforeIntensity}
            onChange={(intensity) => setFormData({ ...formData, painBeforeIntensity: intensity })}
            label="排便前腹痛"
            mode="pain"
          />

          <PainSlider
            value={formData.painAfterIntensity}
            onChange={(intensity) => setFormData({ ...formData, painAfterIntensity: intensity })}
            label="排便后腹痛"
            mode="pain"
          />

          <GlassButton variant="primary" size="lg" onClick={handleSubmit} loading={saving} className="w-full">
            保存记录
          </GlassButton>
        </div>
      </GlassModal>
    </div>
  );
}
