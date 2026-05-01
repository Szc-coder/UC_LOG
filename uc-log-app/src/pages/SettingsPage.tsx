import { useState, useEffect } from 'react';
import { GlassCard, GlassButton, GlassInput, GlassModal, useToast } from '../components/ui';
import { Settings, Save, Wifi, Trash2, Plus, Apple, Pill, Download, FileText, Database } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';

interface AIProvider {
  id: string;
  name: string;
  url: string;
  model: string;
}

interface FoodLibraryItem {
  id: string;
  name: string;
  category: string;
  default_cooking_method: string;
  default_amount_grams: number;
}

interface MedicationLibraryItem {
  id: string;
  name: string;
  category: string;
  route: string;
  default_dose: string;
  default_scheduled_time: string;
}

const commonProviders: AIProvider[] = [
  { id: 'deepseek', name: 'DeepSeek', url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { id: 'qwen', name: '通义千问', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-turbo' },
  { id: 'zhipu', name: '智谱 AI', url: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  { id: 'moonshot', name: '月之暗面', url: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { id: 'openai', name: 'OpenAI', url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
];

const foodCategories = [
  { value: 'grain', label: '谷物' },
  { value: 'protein', label: '蛋白质' },
  { value: 'vegetable', label: '蔬菜' },
  { value: 'fruit', label: '水果' },
  { value: 'fat', label: '油脂' },
  { value: 'dairy', label: '乳制品' },
  { value: 'beverage', label: '饮品' },
  { value: 'supplement', label: '补充剂' },
];

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

const cookingMethods = [
  { value: 'steamed', label: '蒸' },
  { value: 'boiled', label: '煮' },
  { value: 'stir_fried', label: '炒' },
  { value: 'baked', label: '烤' },
  { value: 'raw', label: '生食' },
  { value: 'mashed', label: '泥状' },
  { value: 'pureed', label: '糊状' },
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

export function SettingsPage() {
  const [selectedProvider, setSelectedProvider] = useState<string>('deepseek');
  const [customMode, setCustomMode] = useState(false);
  const [apiUrl, setApiUrl] = useState('https://api.deepseek.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('deepseek-chat');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);
  const [saving, setSaving] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const toast = useToast();

  // Library state
  const [foodLibrary, setFoodLibrary] = useState<FoodLibraryItem[]>([]);
  const [medLibrary, setMedLibrary] = useState<MedicationLibraryItem[]>([]);
  const [showAddFood, setShowAddFood] = useState(false);
  const [showAddMed, setShowAddMed] = useState(false);
  const [newFoodName, setNewFoodName] = useState('');
  const [newFoodCategory, setNewFoodCategory] = useState('grain');
  const [newFoodCooking, setNewFoodCooking] = useState('boiled');
  const [newFoodAmount, setNewFoodAmount] = useState('100');
  const [newMedName, setNewMedName] = useState('');
  const [newMedCategory, setNewMedCategory] = useState('5ASA');
  const [newMedRoute, setNewMedRoute] = useState('oral');
  const [newMedDose, setNewMedDose] = useState('');
  const [newMedTime, setNewMedTime] = useState('morning');

  useEffect(() => {
    loadConfig();
    loadFoodLibrary();
    loadMedLibrary();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await invoke<{ api_base_url: string; api_key: string; model_name: string } | null>('ai_config_get');
      if (config) {
        setApiUrl(config.api_base_url);
        setApiKey(config.api_key);
        setModelName(config.model_name);
        const matched = commonProviders.find(p => p.url === config.api_base_url && p.model === config.model_name);
        if (matched) {
          setSelectedProvider(matched.id);
          setCustomMode(false);
        } else {
          setSelectedProvider('custom');
          setCustomMode(true);
        }
      }
    } catch (err) {
      console.error('加载AI配置失败:', err);
    }
  };

  const loadFoodLibrary = async () => {
    try {
      const data = await invoke<FoodLibraryItem[]>('food_library_list');
      setFoodLibrary(data);
    } catch (err) {
      console.error('加载食物库失败:', err);
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

  const handleProviderChange = (providerId: string) => {
    if (providerId === 'custom') {
      setCustomMode(true);
      setSelectedProvider('custom');
      return;
    }
    setCustomMode(false);
    setSelectedProvider(providerId);
    const provider = commonProviders.find(p => p.id === providerId);
    if (provider) {
      setApiUrl(provider.url);
      setModelName(provider.model);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await invoke('ai_config_test', {
        config: {
          api_base_url: apiUrl,
          api_key: apiKey,
          model_name: modelName,
          max_tokens: 4096,
          temperature: 0.7,
        },
      });
      setTestResult('success');
    } catch (err) {
      setTestResult('fail');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await invoke('ai_config_save', {
        config: {
          api_base_url: apiUrl,
          api_key: apiKey,
          model_name: modelName,
          max_tokens: 4096,
          temperature: 0.7,
        },
      });
      toast.success('AI 配置已保存');
    } catch (err) {
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleAddFood = async () => {
    if (!newFoodName) { toast.warning('请输入食物名称'); return; }
    try {
      await invoke('food_library_add', {
        name: newFoodName,
        category: newFoodCategory,
        defaultCookingMethod: newFoodCooking,
        defaultAmountGrams: parseInt(newFoodAmount) || 100,
      });
      setNewFoodName('');
      setShowAddFood(false);
      loadFoodLibrary();
      toast.success('食物已添加');
    } catch (err) {
      toast.error('添加失败');
    }
  };

  const handleDeleteFood = async (id: string) => {
    try {
      await invoke('food_library_delete', { id });
      setFoodLibrary(foodLibrary.filter(f => f.id !== id));
      toast.success('已删除');
    } catch (err) {
      toast.error('删除失败');
    }
  };

  const handleAddMed = async () => {
    if (!newMedName || !newMedDose) { toast.warning('请填写药物名称和剂量'); return; }
    try {
      await invoke('medication_library_add', {
        name: newMedName,
        category: newMedCategory,
        route: newMedRoute,
        defaultDose: newMedDose,
        defaultScheduledTime: newMedTime,
      });
      setNewMedName('');
      setNewMedDose('');
      setShowAddMed(false);
      loadMedLibrary();
      toast.success('药物已添加');
    } catch (err) {
      toast.error('添加失败');
    }
  };

  const handleDeleteMed = async (id: string) => {
    try {
      await invoke('medication_library_delete', { id });
      setMedLibrary(medLibrary.filter(m => m.id !== id));
      toast.success('已删除');
    } catch (err) {
      toast.error('删除失败');
    }
  };

  const handleExportJSON = async () => {
    try {
      const filePath = await save({
        defaultPath: `uc-log-export-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (!filePath) return;
      const data = await invoke<string>('export_all_json');
      await invoke('save_file', { path: filePath, content: data });
      toast.success('JSON 导出成功');
    } catch (err) {
      toast.error('导出失败');
    }
  };

  const handleExportCSV = async () => {
    try {
      const filePath = await save({
        defaultPath: `uc-log-export-${new Date().toISOString().slice(0, 10)}.csv`,
        filters: [{ name: 'CSV', extensions: ['csv'] }],
      });
      if (!filePath) return;
      const data = await invoke<string>('export_all_csv');
      await invoke('save_file', { path: filePath, content: data });
      toast.success('CSV 导出成功');
    } catch (err) {
      toast.error('导出失败');
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
        <Settings className="w-5 h-5" />
        设置
      </h1>

      {/* AI 服务配置 */}
      <GlassCard variant="elevated">
        <h3 className="text-base font-semibold text-gray-700 mb-2">AI 服务配置</h3>
        <p className="text-xs text-gray-400 mb-4">
          选择或自定义 AI 服务提供商（支持 OpenAI 兼容 API）
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">选择提供商</label>
            <div className="grid grid-cols-3 gap-2">
              {commonProviders.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => handleProviderChange(provider.id)}
                  className={`p-2.5 rounded-xl border-2 transition-all outline-none text-center
                    ${selectedProvider === provider.id && !customMode
                      ? 'border-teal-500 bg-teal-50/50 shadow-sm'
                      : 'border-white/60 bg-white/40 hover:bg-white/60'
                    }`}
                >
                  <div className="text-xs font-medium text-gray-700">{provider.name}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{provider.model}</div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleProviderChange('custom')}
                className={`p-2.5 rounded-xl border-2 transition-all outline-none text-center
                  ${customMode
                    ? 'border-purple-500 bg-purple-50/50 shadow-sm'
                    : 'dashed border-gray-300 bg-white/40 hover:bg-white/60'
                  }`}
              >
                <div className="text-xs font-medium text-gray-700">自定义</div>
                <div className="text-[10px] text-gray-400 mt-0.5">手动填写</div>
              </button>
            </div>
          </div>

          <GlassInput label="API 请求地址" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://api.example.com/v1" disabled={!customMode} />
          <GlassInput label="API Key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
          <GlassInput label="模型名称" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="deepseek-chat" disabled={!customMode} />

          {testResult && (
            <div className={`p-3 rounded-xl text-sm ${testResult === 'success' ? 'bg-green-50/50 text-green-700 border border-green-200' : 'bg-red-50/50 text-red-700 border border-red-200'}`}>
              {testResult === 'success' ? '连接成功' : '连接失败，请检查配置'}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <GlassButton variant="secondary" onClick={handleTestConnection} loading={testing} size="sm">
              <Wifi className="w-4 h-4" />
              测试连接
            </GlassButton>
            <GlassButton variant="primary" onClick={handleSave} loading={saving} size="sm">
              <Save className="w-4 h-4" />
              保存配置
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* 食物库管理 */}
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Apple className="w-4 h-4 text-green-600" />
            <h3 className="text-base font-semibold text-gray-700">食物库</h3>
            <span className="text-xs text-gray-400">({foodLibrary.length})</span>
          </div>
          <GlassButton variant="primary" size="sm" onClick={() => setShowAddFood(true)}>
            <Plus className="w-3.5 h-3.5" />
            添加
          </GlassButton>
        </div>
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {foodLibrary.map(food => (
            <div key={food.id} className="flex items-center justify-between p-2 rounded-lg bg-white/30 border border-white/40">
              <div>
                <span className="text-sm text-gray-700">{food.name}</span>
                <span className="text-[10px] text-gray-400 ml-2">{food.default_amount_grams}g</span>
              </div>
              <button type="button" onClick={() => handleDeleteFood(food.id)} className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* 药物库管理 */}
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-purple-600" />
            <h3 className="text-base font-semibold text-gray-700">药物库</h3>
            <span className="text-xs text-gray-400">({medLibrary.length})</span>
          </div>
          <GlassButton variant="primary" size="sm" onClick={() => setShowAddMed(true)}>
            <Plus className="w-3.5 h-3.5" />
            添加
          </GlassButton>
        </div>
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {medLibrary.map(med => (
            <div key={med.id} className="flex items-center justify-between p-2 rounded-lg bg-white/30 border border-white/40">
              <div>
                <span className="text-sm text-gray-700">{med.name}</span>
                <span className="text-[10px] text-gray-400 ml-2">{med.default_dose}</span>
              </div>
              <button type="button" onClick={() => handleDeleteMed(med.id)} className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* 数据管理 */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-gray-600" />
          <h3 className="text-base font-semibold text-gray-700">数据管理</h3>
        </div>
        <div className="space-y-2">
          <GlassButton variant="secondary" className="w-full" size="sm" loading={seeding} onClick={async () => {
            setSeeding(true);
            try {
              const msg = await invoke<string>('seed_sample_data');
              toast.success(msg);
            } catch (err) {
              toast.error('添加示例数据失败');
            } finally {
              setSeeding(false);
            }
          }}>
            <Plus className="w-4 h-4" />
            添加示例数据
          </GlassButton>
          <GlassButton variant="secondary" className="w-full" size="sm" onClick={handleExportJSON}>
            <Download className="w-4 h-4" />
            导出数据 (JSON)
          </GlassButton>
          <GlassButton variant="secondary" className="w-full" size="sm" onClick={handleExportCSV}>
            <FileText className="w-4 h-4" />
            导出数据 (CSV)
          </GlassButton>
          <GlassButton variant="ghost" className="w-full text-red-500" size="sm" onClick={() => setShowClearConfirm(true)}>
            <Trash2 className="w-4 h-4" />
            清除所有数据
          </GlassButton>
        </div>
      </GlassCard>

      {/* 添加食物弹窗 */}
      <GlassModal isOpen={showAddFood} onClose={() => setShowAddFood(false)} title="添加食物到库" size="md">
        <div className="space-y-4">
          <GlassInput label="食物名称" value={newFoodName} onChange={(e) => setNewFoodName(e.target.value)} placeholder="例如：白米饭" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">分类</label>
              <select value={newFoodCategory} onChange={(e) => setNewFoodCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white/50 border border-white/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/50">
                {foodCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">默认烹饪方式</label>
              <select value={newFoodCooking} onChange={(e) => setNewFoodCooking(e.target.value)}
                className="w-full px-3 py-2 bg-white/50 border border-white/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/50">
                {cookingMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <GlassInput label="默认份量 (克)" type="number" value={newFoodAmount} onChange={(e) => setNewFoodAmount(e.target.value)} placeholder="100" />
          <GlassButton variant="primary" size="lg" onClick={handleAddFood} className="w-full">
            添加到食物库
          </GlassButton>
        </div>
      </GlassModal>

      {/* 添加药物弹窗 */}
      <GlassModal isOpen={showAddMed} onClose={() => setShowAddMed(false)} title="添加药物到库" size="md">
        <div className="space-y-4">
          <GlassInput label="药物名称" value={newMedName} onChange={(e) => setNewMedName(e.target.value)} placeholder="例如：美沙拉嗪肠溶片" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">分类</label>
              <select value={newMedCategory} onChange={(e) => setNewMedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white/50 border border-white/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/50">
                {drugCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">给药途径</label>
              <select value={newMedRoute} onChange={(e) => setNewMedRoute(e.target.value)}
                className="w-full px-3 py-2 bg-white/50 border border-white/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/50">
                {drugRoutes.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <GlassInput label="默认剂量" value={newMedDose} onChange={(e) => setNewMedDose(e.target.value)} placeholder="例如：1g" />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">默认服药时间</label>
              <select value={newMedTime} onChange={(e) => setNewMedTime(e.target.value)}
                className="w-full px-3 py-2 bg-white/50 border border-white/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/50">
                {scheduledTimes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <GlassButton variant="primary" size="lg" onClick={handleAddMed} className="w-full">
            添加到药物库
          </GlassButton>
        </div>
      </GlassModal>

      {/* 清除数据确认弹窗 */}
      <GlassModal isOpen={showClearConfirm} onClose={() => setShowClearConfirm(false)} title="确认清除数据" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            确定要清除所有记录数据吗？此操作不可撤销，将删除所有排便、饮食、症状、用药和FC记录。
          </p>
          <p className="text-xs text-gray-400">
            食物库和药物库数据不会被清除。
          </p>
          <div className="flex gap-3">
            <GlassButton variant="secondary" className="flex-1" onClick={() => setShowClearConfirm(false)}>
              取消
            </GlassButton>
            <GlassButton
              variant="primary"
              className="flex-1 bg-red-500 hover:bg-red-600"
              loading={clearing}
              onClick={async () => {
                setClearing(true);
                try {
                  await invoke('clear_all_data');
                  setShowClearConfirm(false);
                  toast.success('所有数据已清除');
                } catch (err) {
                  toast.error('清除失败');
                } finally {
                  setClearing(false);
                }
              }}
            >
              确认清除
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
