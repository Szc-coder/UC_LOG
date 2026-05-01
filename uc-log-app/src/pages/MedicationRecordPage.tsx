import { useState, useEffect } from 'react';
import { GlassCard, GlassButton, GlassInput, GlassModal, useToast } from '../components/ui';
import { Pill, Plus, Trash2, CheckCircle, XCircle, Settings, Search } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { DateNavigator } from '../components/shared';

interface MedicationPlan {
  id: string;
  name: string;
  category: string;
  route: string;
  dose: string;
  scheduled_time: string;
  active: boolean;
  created_at: string;
}

interface MedicationRecord {
  id: string;
  timestamp: string;
  items: { id: string; name: string; taken: boolean; dose: string; category: string; scheduled_time: string }[];
}

interface MedicationLibraryItem {
  id: string;
  name: string;
  category: string;
  route: string;
  default_dose: string;
  default_scheduled_time: string;
}

const drugCategories = [
  { value: '5ASA', label: '5-ASA' },
  { value: 'steroid', label: '激素' },
  { value: 'biologic', label: '生物制剂' },
  { value: 'immunomodulator', label: '免疫调节剂' },
  { value: 'JAKi', label: 'JAK抑制剂' },
  { value: 'S1Pi', label: 'S1P调节剂' },
  { value: 'probiotic', label: '益生菌' },
  { value: 'laxative', label: '通便药' },
  { value: 'other', label: '其他' },
];

const drugRoutes = [
  { value: 'oral', label: '口服' },
  { value: 'rectal_suppository', label: '栓剂' },
  { value: 'rectal_enema', label: '灌肠' },
  { value: 'rectal_foam', label: '泡沫剂' },
  { value: 'IV', label: '静脉注射' },
  { value: 'SC', label: '皮下注射' },
];

const scheduledTimes = [
  { value: 'morning', label: '早晨' },
  { value: 'noon', label: '中午' },
  { value: 'evening', label: '晚上' },
  { value: 'bedtime', label: '睡前' },
];

const categoryLabels: Record<string, string> = {
  '5ASA': '5-ASA', steroid: '激素', biologic: '生物制剂', immunomodulator: '免疫调节剂',
  JAKi: 'JAK抑制剂', S1Pi: 'S1P调节剂', probiotic: '益生菌', laxative: '通便药', other: '其他',
};

const routeLabels: Record<string, string> = {
  oral: '口服', rectal_suppository: '栓剂', rectal_enema: '灌肠',
  rectal_foam: '泡沫剂', IV: '静脉注射', SC: '皮下注射',
};

const timeLabels: Record<string, string> = {
  morning: '早晨', noon: '中午', evening: '晚上', bedtime: '睡前',
};

const timeOrder: Record<string, number> = {
  morning: 0, noon: 1, evening: 2, bedtime: 3,
};

const _today = new Date().toISOString().split('T')[0];

export function MedicationRecordPage() {
  const [plans, setPlans] = useState<MedicationPlan[]>([]);
  const [records, setRecords] = useState<MedicationRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(_today);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [medLibrary, setMedLibrary] = useState<MedicationLibraryItem[]>([]);
  const [medSearch, setMedSearch] = useState('');
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanCategory, setNewPlanCategory] = useState('5ASA');
  const [newPlanRoute, setNewPlanRoute] = useState('oral');
  const [newPlanDose, setNewPlanDose] = useState('');
  const [newPlanTime, setNewPlanTime] = useState('morning');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadPlans();
    loadMedLibrary();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [selectedDate]);

  const loadPlans = async () => {
    try {
      const data = await invoke<MedicationPlan[]>('medication_plan_list');
      setPlans(data);
    } catch (err) {
      console.error('加载用药计划失败:', err);
    }
  };

  const loadRecords = async () => {
    try {
      const data = await invoke<MedicationRecord[]>('medication_list_by_date', { date: selectedDate });
      setRecords(data);
    } catch (err) {
      console.error('加载记录失败:', err);
    }
  };

  const loadMedLibrary = async () => {
    try {
      const data = await invoke<MedicationLibraryItem[]>('medication_library_list');
      setMedLibrary(data);
    } catch (err) {
      console.error('加载药物库失败:', err);
    }
  };

  // Check if a plan item has been taken on the selected date
  const isPlanTaken = (plan: MedicationPlan): boolean => {
    for (const record of records) {
      for (const item of record.items) {
        if (item.name === plan.name && item.scheduled_time === plan.scheduled_time && item.taken) {
          return true;
        }
      }
    }
    return false;
  };

  const handleQuickTake = async (plan: MedicationPlan, taken: boolean) => {
    try {
      await invoke('medication_quick_take', { planId: plan.id, date: selectedDate, taken });
      loadRecords();
      toast.success(taken ? '已标记为已服用' : '已取消服用');
    } catch (err) {
      toast.error('操作失败');
    }
  };

  const handleAddPlan = async () => {
    if (!newPlanName || !newPlanDose) {
      toast.warning('请填写药物名称和剂量');
      return;
    }
    setSaving(true);
    try {
      await invoke('medication_plan_add', {
        name: newPlanName,
        category: newPlanCategory,
        route: newPlanRoute,
        dose: newPlanDose,
        scheduledTime: newPlanTime,
      });
      setNewPlanName('');
      setNewPlanDose('');
      setShowAddPlanModal(false);
      loadPlans();
      toast.success('用药计划已添加');
    } catch (err) {
      toast.error('添加失败');
    } finally {
      setSaving(false);
    }
  };

  const addFromLibrary = (med: MedicationLibraryItem) => {
    setNewPlanName(med.name);
    setNewPlanCategory(med.category);
    setNewPlanRoute(med.route);
    setNewPlanDose(med.default_dose);
    setNewPlanTime(med.default_scheduled_time);
    setShowAddPlanModal(true);
    setShowPlanModal(false);
  };

  const handleDeletePlan = async (id: string) => {
    try {
      await invoke('medication_plan_delete', { id });
      setPlans(plans.filter(p => p.id !== id));
      toast.success('已删除');
    } catch (err) {
      toast.error('删除失败');
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      await invoke('medication_delete', { id });
      setRecords(records.filter(r => r.id !== id));
      toast.success('记录已删除');
    } catch (err) {
      toast.error('删除失败');
    }
  };

  const formatTime = (ts: string) => {
    try { return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
  };

  const activePlans = plans.filter(p => p.active);
  const groupedPlans: Record<string, MedicationPlan[]> = {};
  activePlans.forEach(p => {
    if (!groupedPlans[p.scheduled_time]) groupedPlans[p.scheduled_time] = [];
    groupedPlans[p.scheduled_time].push(p);
  });
  const sortedTimeKeys = Object.keys(groupedPlans).sort((a, b) => (timeOrder[a] ?? 99) - (timeOrder[b] ?? 99));

  const takenCount = activePlans.filter(p => isPlanTaken(p)).length;
  const totalCount = activePlans.length;
  const adherence = totalCount > 0 ? Math.round(takenCount / totalCount * 100) : 0;

  const filteredMeds = medSearch
    ? medLibrary.filter(m => m.name.includes(medSearch) || (categoryLabels[m.category] || '').includes(medSearch))
    : medLibrary;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
          <Pill className="w-5 h-5" />
          用药记录
        </h1>
        <div className="flex items-center gap-2">
          <DateNavigator date={selectedDate} onChange={setSelectedDate} />
          <GlassButton variant="secondary" size="sm" onClick={() => setShowPlanModal(true)}>
            <Settings className="w-4 h-4" />
            管理计划
          </GlassButton>
        </div>
      </div>

      {/* 今日用药计划 */}
      <GlassCard variant="elevated">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-gray-400 mb-1">用药依从率</div>
            <div className="text-2xl font-bold text-purple-600">{adherence}%</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 mb-1">已服用</div>
            <div className="text-2xl font-bold text-gray-800">{takenCount}/{totalCount}</div>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${adherence}%` }} />
        </div>

        {activePlans.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <div className="text-sm">暂无用药计划</div>
            <div className="text-xs mt-1">点击右上角"管理计划"添加</div>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTimeKeys.map(timeKey => (
              <div key={timeKey}>
                <div className="text-[10px] font-medium text-gray-400 mb-1.5 px-1">{timeLabels[timeKey] || timeKey}</div>
                <div className="space-y-1.5">
                  {groupedPlans[timeKey].map(plan => {
                    const taken = isPlanTaken(plan);
                    return (
                      <div key={plan.id} className={`flex items-center justify-between py-2 px-3 rounded-xl transition-all ${taken ? 'bg-green-50/50 border border-green-200/50' : 'bg-white/30 border border-white/50'}`}>
                        <div className="flex items-center gap-2">
                          {taken ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-300" />
                          )}
                          <div>
                            <div className={`text-sm font-medium ${taken ? 'text-green-700' : 'text-gray-700'}`}>{plan.name}</div>
                            <div className="text-[10px] text-gray-400">{plan.dose} · {routeLabels[plan.route] || plan.route}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleQuickTake(plan, !taken)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            taken
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          }`}
                        >
                          {taken ? '已服用 ✓' : '服用'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* 当日记录 */}
      {records.length > 0 && (
        <GlassCard>
          <h3 className="text-xs font-medium text-gray-400 mb-2">当日记录</h3>
          <div className="space-y-2">
            {records.map(record => (
              <div key={record.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{formatTime(record.timestamp)}</span>
                  <span className="text-xs text-gray-600">{record.items.map(i => i.name).join('、')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteRecord(record.id)}
                  className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* 管理计划弹窗 */}
      <GlassModal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} title="用药计划管理" size="2xl">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-500">当前计划 ({plans.length})</label>
            <GlassButton variant="primary" size="sm" onClick={() => { setShowAddPlanModal(true); setShowPlanModal(false); }}>
              <Plus className="w-3.5 h-3.5" />
              添加计划
            </GlassButton>
          </div>

          {plans.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">暂无用药计划</div>
          ) : (
            <div className="space-y-2">
              {plans.map(plan => (
                <div key={plan.id} className="flex items-center justify-between p-3 rounded-xl bg-white/40 border border-white/50">
                  <div>
                    <div className="text-sm font-medium text-gray-700">{plan.name}</div>
                    <div className="text-[10px] text-gray-400">
                      {plan.dose} · {routeLabels[plan.route] || plan.route} · {timeLabels[plan.scheduled_time] || plan.scheduled_time}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${plan.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      {plan.active ? '启用' : '停用'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeletePlan(plan.id)}
                      className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 药物库快捷添加 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500">从药物库添加</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={medSearch}
                  onChange={(e) => setMedSearch(e.target.value)}
                  placeholder="搜索..."
                  className="pl-7 pr-3 py-1.5 bg-white/50 border border-white/50 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500/50 w-32"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 max-h-32 overflow-y-auto p-1">
              {filteredMeds.map(med => (
                <button
                  key={med.id}
                  type="button"
                  onClick={() => addFromLibrary(med)}
                  className="p-2 rounded-lg bg-white/30 hover:bg-purple-50/60 border border-white/50 text-left outline-none transition-all"
                >
                  <div className="text-xs font-medium text-gray-700 truncate">{med.name}</div>
                  <div className="text-[10px] text-gray-400">{med.default_dose}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassModal>

      {/* 添加计划弹窗 */}
      <GlassModal isOpen={showAddPlanModal} onClose={() => setShowAddPlanModal(false)} title="添加用药计划" size="lg">
        <div className="space-y-4">
          <GlassInput label="药物名称" value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)} placeholder="例如：美沙拉嗪肠溶片" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">分类</label>
              <select value={newPlanCategory} onChange={(e) => setNewPlanCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white/50 border border-white/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/50">
                {drugCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">给药途径</label>
              <select value={newPlanRoute} onChange={(e) => setNewPlanRoute(e.target.value)}
                className="w-full px-3 py-2 bg-white/50 border border-white/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/50">
                {drugRoutes.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <GlassInput label="剂量" value={newPlanDose} onChange={(e) => setNewPlanDose(e.target.value)} placeholder="例如：1g" />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">服药时间</label>
              <select value={newPlanTime} onChange={(e) => setNewPlanTime(e.target.value)}
                className="w-full px-3 py-2 bg-white/50 border border-white/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/50">
                {scheduledTimes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <GlassButton variant="primary" size="lg" onClick={handleAddPlan} loading={saving} className="w-full">
            添加到计划
          </GlassButton>
        </div>
      </GlassModal>
    </div>
  );
}
