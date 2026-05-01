import { useState, useEffect } from 'react';
import { GlassCard, GlassButton, GlassInput, GlassModal, useToast } from '../components/ui';
import { UtensilsCrossed, Plus, Trash2, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { DateNavigator } from '../components/shared';

interface DietItem {
  id: string;
  foodName: string;
  category: string;
  amountGrams: number;
  cookingMethod: string;
  oilAddedMl: number;
  isNewFood: boolean;
  allergenFlag: boolean;
}

interface DietRecord {
  id: string;
  timestamp: string;
  meal_type: string;
  items: { food_name: string; amount_grams: number; cooking_method: string }[];
  notes: string | null;
}

interface FoodLibraryItem {
  id: string;
  name: string;
  category: string;
  default_cooking_method: string;
  default_amount_grams: number;
}

const mealTypes = [
  { value: 'breakfast', label: '早餐', emoji: '🌅' },
  { value: 'lunch', label: '午餐', emoji: '☀️' },
  { value: 'dinner', label: '晚餐', emoji: '🌙' },
  { value: 'snack', label: '加餐', emoji: '🍪' },
];

const mealTypeLabels: Record<string, string> = {
  breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐',
};

const mealTypeEmojis: Record<string, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍪',
};

const cookingMethods = [
  { value: 'steamed', label: '蒸' },
  { value: 'boiled', label: '煮' },
  { value: 'stir_fried', label: '炒' },
  { value: 'baked', label: '烤' },
  { value: 'raw', label: '生食' },
  { value: 'mashed', label: '泥状' },
  { value: 'pureed', label: '糊状' },
];

const categoryLabels: Record<string, string> = {
  grain: '谷物', protein: '蛋白质', vegetable: '蔬菜', fruit: '水果',
  fat: '油脂', dairy: '乳制品', beverage: '饮品', supplement: '补充剂',
};

const cookingMethodLabels: Record<string, string> = {
  steamed: '蒸', boiled: '煮', stir_fried: '炒', baked: '烤',
  raw: '生食', mashed: '泥状', pureed: '糊状',
};

const _today = new Date().toISOString().split('T')[0];

export function DietRecordPage() {
  const [records, setRecords] = useState<DietRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [mealType, setMealType] = useState('breakfast');
  const [mealTime, setMealTime] = useState(new Date().toTimeString().slice(0, 5));
  const [items, setItems] = useState<DietItem[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [foodLibrary, setFoodLibrary] = useState<FoodLibraryItem[]>([]);
  const [foodSearch, setFoodSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(_today);
  const toast = useToast();

  useEffect(() => {
    loadFoodLibrary();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [selectedDate]);

  const loadRecords = async () => {
    try {
      const data = await invoke<DietRecord[]>('diet_list_by_date', { date: selectedDate });
      setRecords(data);
    } catch (err) {
      console.error('加载记录失败:', err);
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

  const addFromLibrary = (food: FoodLibraryItem) => {
    setItems([...items, {
      id: Date.now().toString(),
      foodName: food.name,
      category: food.category,
      amountGrams: food.default_amount_grams,
      cookingMethod: food.default_cooking_method,
      oilAddedMl: 0,
      isNewFood: false,
      allergenFlag: false,
    }]);
  };

  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      foodName: '',
      category: 'grain',
      amountGrams: 100,
      cookingMethod: 'boiled',
      oilAddedMl: 0,
      isNewFood: false,
      allergenFlag: false,
    }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof DietItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleDelete = async (id: string) => {
    try {
      await invoke('diet_delete', { id });
      setRecords(records.filter(r => r.id !== id));
      toast.success('记录已删除');
    } catch (err) {
      toast.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.warning('请添加至少一个食物');
      return;
    }

    setSaving(true);
    try {
      const record = {
        id: null,
        timestamp: `${selectedDate}T${mealTime}:00Z`,
        meal_type: mealType,
        items: items.map(item => ({
          id: null,
          food_name: item.foodName,
          category: item.category,
          amount_grams: item.amountGrams,
          cooking_method: item.cookingMethod,
          oil_added_ml: item.oilAddedMl,
          is_new_food: item.isNewFood,
          allergen_flag: item.allergenFlag,
        })),
        notes: notes || null,
      };

      await invoke('diet_create', { record });
      setItems([]);
      setNotes('');
      setShowModal(false);
      loadRecords();
      toast.success('饮食记录保存成功');
    } catch (err) {
      toast.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (ts: string) => {
    try { return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
  };

  const filteredFoods = foodSearch
    ? foodLibrary.filter(f => f.name.includes(foodSearch) || (categoryLabels[f.category] || '').includes(foodSearch))
    : foodLibrary;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5" />
          饮食记录
        </h1>
        <div className="flex items-center gap-2">
          <DateNavigator date={selectedDate} onChange={setSelectedDate} />
          <GlassButton variant="primary" size="sm" onClick={() => { setShowModal(true); setMealTime(new Date().toTimeString().slice(0, 5)); }}>
            <Plus className="w-4 h-4" />
            添加
          </GlassButton>
        </div>
      </div>

      {/* 今日餐次统计 */}
      <GlassCard variant="elevated">
        <div className="grid grid-cols-4 gap-3">
          {mealTypes.map((meal) => {
            const count = records.filter(r => r.meal_type === meal.value).length;
            return (
              <div key={meal.value} className="text-center">
                <div className="text-xl mb-0.5">{meal.emoji}</div>
                <div className="text-lg font-bold text-gray-800">{count}</div>
                <div className="text-[10px] text-gray-400">{meal.label}</div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* 记录列表 */}
      {records.length === 0 ? (
        <GlassCard>
          <div className="text-center py-12 text-gray-400">
            <div className="text-3xl mb-2">🍽️</div>
            <div className="text-sm">今日暂无饮食记录</div>
            <div className="text-xs mt-1">点击右上角"添加"按钮记录</div>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {records.map((record) => (
            <GlassCard key={record.id}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{mealTypeEmojis[record.meal_type] || '🍽️'}</span>
                  <span className="text-sm font-medium text-gray-700">
                    {mealTypeLabels[record.meal_type] || record.meal_type}
                  </span>
                  <span className="text-xs text-gray-400">{formatTime(record.timestamp)}</span>
                  <span className="text-xs text-gray-400">{record.items.length}道菜</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                    className="p-1 rounded-lg hover:bg-white/60 text-gray-400"
                  >
                    {expandedId === record.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(record.id)}
                    className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {(expandedId === record.id ? record.items : record.items.slice(0, 2)).map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/30 mb-1">
                  <span className="text-xs text-gray-600">{item.food_name}</span>
                  <span className="text-xs text-gray-400">{item.amount_grams}g · {cookingMethodLabels[item.cooking_method] || item.cooking_method}</span>
                </div>
              ))}
              {record.items.length > 2 && expandedId !== record.id && (
                <div className="text-[10px] text-gray-400 text-center mt-1">+{record.items.length - 2} 道菜</div>
              )}
              {record.notes && <div className="text-xs text-gray-400 mt-1.5 px-2">备注: {record.notes}</div>}
            </GlassCard>
          ))}
        </div>
      )}

      {/* 添加记录弹窗 */}
      <GlassModal isOpen={showModal} onClose={() => setShowModal(false)} title="记录饮食" size="2xl">
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* 餐次选择 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">餐次</label>
            <div className="grid grid-cols-4 gap-2">
              {mealTypes.map((meal) => (
                <button
                  key={meal.value}
                  type="button"
                  onClick={() => setMealType(meal.value)}
                  className={`p-3 rounded-xl border-2 transition-all outline-none text-center
                    ${mealType === meal.value ? 'border-teal-500 bg-teal-50/50 shadow-sm' : 'border-white/60 bg-white/40 hover:bg-white/60'}`}
                >
                  <div className="text-xl mb-1">{meal.emoji}</div>
                  <div className="text-xs font-medium text-gray-700">{meal.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 用餐时间 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">用餐时间</label>
            <input
              type="time"
              value={mealTime}
              onChange={(e) => setMealTime(e.target.value)}
              className="px-3 py-2 bg-white/50 border border-white/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/50"
            />
          </div>

          {/* 食物库选择 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500">食物库</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={foodSearch}
                  onChange={(e) => setFoodSearch(e.target.value)}
                  placeholder="搜索食物..."
                  className="pl-7 pr-3 py-1.5 bg-white/50 border border-white/50 rounded-lg text-xs outline-none focus:ring-2 focus:ring-teal-500/50 w-40"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto p-1">
              {filteredFoods.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => addFromLibrary(food)}
                  className="p-2 rounded-lg bg-white/40 hover:bg-teal-50/60 border border-white/50 hover:border-teal-300/50 transition-all text-center outline-none"
                >
                  <div className="text-xs font-medium text-gray-700 truncate">{food.name}</div>
                  <div className="text-[10px] text-gray-400">{categoryLabels[food.category] || food.category}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 已选食物列表 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500">已选食物 ({items.length})</label>
              <GlassButton variant="secondary" size="sm" onClick={addItem}>
                <Plus className="w-3.5 h-3.5" />
                手动添加
              </GlassButton>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-sm">从上方食物库选择，或手动添加</div>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={item.id} className="p-3 rounded-xl bg-white/40 border border-white/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">{item.foodName || `食物 #${index + 1}`}</span>
                      <button type="button" onClick={() => removeItem(item.id)} className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <GlassInput
                      label="食物名称"
                      value={item.foodName}
                      onChange={(e) => updateItem(item.id, 'foodName', e.target.value)}
                      placeholder="例如：白米饭"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">份量 (克)</label>
                        <input
                          type="number"
                          value={item.amountGrams}
                          onChange={(e) => updateItem(item.id, 'amountGrams', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-white/50 border border-white/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">烹饪方式</label>
                        <select
                          value={item.cookingMethod}
                          onChange={(e) => updateItem(item.id, 'cookingMethod', e.target.value)}
                          className="w-full px-3 py-2 bg-white/50 border border-white/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/50"
                        >
                          {cookingMethods.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <GlassInput label="备注（可选）" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="例如：餐后腹胀" />

          <GlassButton variant="primary" size="lg" onClick={handleSubmit} loading={saving} className="w-full">
            保存记录
          </GlassButton>
        </div>
      </GlassModal>
    </div>
  );
}
