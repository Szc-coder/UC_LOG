import { useState, useEffect } from 'react';
import { GlassCard, GlassButton, GlassInput, useToast } from '../components/ui';
import { User, Save, Heart, Shield, Stethoscope, Phone } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface PersonalProfile {
  id: string;
  name: string | null;
  gender: string | null;
  birth_date: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  blood_type: string | null;
  diagnosis_date: string | null;
  disease_type: string | null;
  disease_location: string | null;
  disease_severity: string | null;
  allergies: string | null;
  surgical_history: string | null;
  family_history: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  doctor_name: string | null;
  doctor_phone: string | null;
  hospital: string | null;
  notes: string | null;
}

const genderOptions = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
];

const bloodTypes = ['A', 'B', 'AB', 'O'];

const diseaseTypes = [
  { value: 'UC', label: '溃疡性结肠炎 (UC)' },
  { value: 'CD', label: '克罗恩病 (CD)' },
  { value: 'IBD-U', label: '未分类IBD (IBD-U)' },
];

const diseaseLocations = [
  { value: 'E1', label: 'E1 - 直肠炎' },
  { value: 'E2', label: 'E2 - 左侧结肠炎' },
  { value: 'E3', label: 'E3 - 广泛性结肠炎' },
];

const diseaseSeverities = [
  { value: 'remission', label: '缓解期' },
  { value: 'mild', label: '轻度活动' },
  { value: 'moderate', label: '中度活动' },
  { value: 'severe', label: '重度活动' },
];

function calcBMI(height: number | null, weight: number | null): string {
  if (!height || !weight || height <= 0) return '-';
  const bmi = weight / ((height / 100) ** 2);
  return bmi.toFixed(1);
}

function calcAge(birthDate: string | null): string {
  if (!birthDate) return '-';
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return `${age}岁`;
}

export function PersonalDataPage() {
  const [profile, setProfile] = useState<PersonalProfile>({
    id: 'default', name: null, gender: null, birth_date: null,
    height_cm: null, weight_kg: null, blood_type: null,
    diagnosis_date: null, disease_type: null, disease_location: null, disease_severity: null,
    allergies: null, surgical_history: null, family_history: null,
    emergency_contact: null, emergency_phone: null,
    doctor_name: null, doctor_phone: null, hospital: null, notes: null,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const data = await invoke<PersonalProfile | null>('profile_get');
      if (data) setProfile(data);
    } catch (err) {
      console.error('加载个人资料失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await invoke('profile_save', { profile });
      toast.success('个人资料已保存');
    } catch (err) {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof PersonalProfile, value: any) => {
    setProfile({ ...profile, [field]: value });
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-400">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
          <User className="w-5 h-5" />
          个人资料
        </h1>
        <GlassButton variant="primary" size="sm" onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4" />
          保存
        </GlassButton>
      </div>

      {/* 基本信息 */}
      <GlassCard variant="elevated">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-semibold text-gray-700">基本信息</h3>
        </div>
        <div className="space-y-3">
          <GlassInput label="姓名" value={profile.name || ''} onChange={(e) => update('name', e.target.value || null)} placeholder="请输入姓名" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">性别</label>
              <select value={profile.gender || ''} onChange={(e) => update('gender', e.target.value || null)}
                className="w-full px-3 py-2 bg-white/50 border border-white/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/50">
                <option value="">未设置</option>
                {genderOptions.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <GlassInput label="出生日期" type="date" value={profile.birth_date || ''} onChange={(e) => update('birth_date', e.target.value || null)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <GlassInput label="身高 (cm)" type="number" value={profile.height_cm?.toString() || ''} onChange={(e) => update('height_cm', e.target.value ? parseFloat(e.target.value) : null)} placeholder="170" />
            <GlassInput label="体重 (kg)" type="number" value={profile.weight_kg?.toString() || ''} onChange={(e) => update('weight_kg', e.target.value ? parseFloat(e.target.value) : null)} placeholder="65" />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">BMI</label>
              <div className="px-3 py-2 bg-gray-50/50 border border-white/50 rounded-xl text-sm text-gray-600">
                {calcBMI(profile.height_cm, profile.weight_kg)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">血型</label>
              <select value={profile.blood_type || ''} onChange={(e) => update('blood_type', e.target.value || null)}
                className="w-full px-3 py-2 bg-white/50 border border-white/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/50">
                <option value="">未设置</option>
                {bloodTypes.map(b => <option key={b} value={b}>{b}型</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">年龄</label>
              <div className="px-3 py-2 bg-gray-50/50 border border-white/50 rounded-xl text-sm text-gray-600">
                {calcAge(profile.birth_date)}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 疾病信息 */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-semibold text-gray-700">疾病信息</h3>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">疾病类型</label>
              <select value={profile.disease_type || ''} onChange={(e) => update('disease_type', e.target.value || null)}
                className="w-full px-3 py-2 bg-white/50 border border-white/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/50">
                <option value="">未设置</option>
                {diseaseTypes.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <GlassInput label="确诊日期" type="date" value={profile.diagnosis_date || ''} onChange={(e) => update('diagnosis_date', e.target.value || null)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">病变范围</label>
              <select value={profile.disease_location || ''} onChange={(e) => update('disease_location', e.target.value || null)}
                className="w-full px-3 py-2 bg-white/50 border border-white/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/50">
                <option value="">未设置</option>
                {diseaseLocations.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">疾病活动度</label>
              <select value={profile.disease_severity || ''} onChange={(e) => update('disease_severity', e.target.value || null)}
                className="w-full px-3 py-2 bg-white/50 border border-white/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/50">
                <option value="">未设置</option>
                {diseaseSeverities.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </div>
          <GlassInput label="过敏史" value={profile.allergies || ''} onChange={(e) => update('allergies', e.target.value || null)} placeholder="例如：青霉素过敏、海鲜过敏" />
          <GlassInput label="手术史" value={profile.surgical_history || ''} onChange={(e) => update('surgical_history', e.target.value || null)} placeholder="例如：2024年阑尾切除术" />
          <GlassInput label="家族病史" value={profile.family_history || ''} onChange={(e) => update('family_history', e.target.value || null)} placeholder="例如：父亲有IBD病史" />
        </div>
      </GlassCard>

      {/* 医疗联系人 */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-700">主治医生信息</h3>
        </div>
        <div className="space-y-3">
          <GlassInput label="主治医生" value={profile.doctor_name || ''} onChange={(e) => update('doctor_name', e.target.value || null)} placeholder="医生姓名" />
          <div className="grid grid-cols-2 gap-3">
            <GlassInput label="医生电话" value={profile.doctor_phone || ''} onChange={(e) => update('doctor_phone', e.target.value || null)} placeholder="联系电话" />
            <GlassInput label="就诊医院" value={profile.hospital || ''} onChange={(e) => update('hospital', e.target.value || null)} placeholder="医院名称" />
          </div>
        </div>
      </GlassCard>

      {/* 紧急联系人 */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Phone className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-gray-700">紧急联系人</h3>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <GlassInput label="联系人姓名" value={profile.emergency_contact || ''} onChange={(e) => update('emergency_contact', e.target.value || null)} placeholder="姓名" />
            <GlassInput label="联系电话" value={profile.emergency_phone || ''} onChange={(e) => update('emergency_phone', e.target.value || null)} placeholder="手机号" />
          </div>
        </div>
      </GlassCard>

      {/* 备注 */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">其他备注</h3>
        </div>
        <textarea
          value={profile.notes || ''}
          onChange={(e) => update('notes', e.target.value || null)}
          placeholder="其他需要记录的医疗信息..."
          rows={4}
          className="w-full px-3 py-2 bg-white/50 border border-white/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-500/50 resize-none"
        />
      </GlassCard>

      {/* 保存按钮 */}
      <GlassButton variant="primary" size="lg" onClick={handleSave} loading={saving} className="w-full">
        <Save className="w-4 h-4" />
        保存个人资料
      </GlassButton>
    </div>
  );
}
