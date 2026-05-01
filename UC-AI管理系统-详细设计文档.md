# UC AI管理系统 - 详细设计文档

> **项目名称**：UC Log - 溃疡性结肠炎AI智能管理系统
>
> **文档版本**：v1.0
>
> **编写日期**：2026-05-01
>
> **文档状态**：评审通过

---

## 一、文档说明

### 1.1 文档目的

本文档在概要设计基础上，详细定义各模块的实现方案，包括：
- Tauri IPC接口定义
- 前端组件层级结构
- 状态管理设计
- 数据流与业务逻辑
- 算法实现细节

### 1.2 参考文档

| 文档 | 用途 |
|------|------|
| UC-AI管理系统-需求文档.md | 功能需求定义 |
| UC-AI管理系统-概要设计文档.md | 技术选型与架构 |
| uc-daily-record-schema.json | 数据模型定义 |

---

## 二、Tauri IPC接口设计

### 2.1 接口命名规范

```
模块前缀：
- stool_*     → 排便记录
- diet_*      → 饮食记录
- symptom_*   → 症状记录
- medication_* → 用药记录
- lifestyle_* → 生活方式
- fc_*        → FC追踪
- ai_*        → AI分析
- report_*    → 复诊报告
- tolerance_* → 食物耐受库
- export_*    → 数据导出
```

### 2.2 排便记录接口

```rust
// src-tauri/src/commands/stool.rs

use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct StoolRecord {
    pub id: Option<String>,
    pub timestamp: String,
    pub sequence_number: i32,
    pub form: StoolForm,
    pub blood: StoolBlood,
    pub mucus: StoolMucus,
    pub urgency: Option<StoolUrgency>,
    pub pain_before: Option<StoolPain>,
    pub pain_after: Option<StoolPain>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StoolForm {
    pub bristol_type: i32,      // 1-7
    pub color: String,          // yellow/brown/dark_brown/black/red/bloody
    pub consistency: String,    // formed/soft/mushy/watery
    pub volume: Option<String>, // small/medium/large
    pub odor: Option<String>,   // normal/foul/fishy
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StoolBlood {
    pub present: bool,
    pub amount: Option<String>,    // none/trace/coin_size/moderate/heavy
    pub location: Option<String>,  // on_surface/mixed/pure_blood
    pub color: Option<String>,     // bright_red/dark_red/maroon
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StoolMucus {
    pub present: bool,
    pub amount: Option<String>,    // none/small/moderate/large
    pub color: Option<String>,     // clear/white/yellow/pink/bloody
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StoolUrgency {
    pub level: i32,     // 0-10
    pub sudden: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StoolPain {
    pub present: bool,
    pub location: Option<String>,
    pub intensity: Option<i32>,    // 0-10
}

// ============ 接口定义 ============

/// 创建排便记录
#[command]
pub async fn stool_create(record: StoolRecord) -> Result<StoolRecord, String> {
    // 实现见数据库操作层
}

/// 更新排便记录
#[command]
pub async fn stool_update(id: String, record: StoolRecord) -> Result<StoolRecord, String> {
    // ...
}

/// 删除排便记录
#[command]
pub async fn stool_delete(id: String) -> Result<(), String> {
    // ...
}

/// 获取单条记录
#[command]
pub async fn stool_get(id: String) -> Result<StoolRecord, String> {
    // ...
}

/// 获取指定日期的所有记录
#[command]
pub async fn stool_list_by_date(date: String) -> Result<Vec<StoolRecord>, String> {
    // ...
}

/// 获取日期范围内的记录
#[command]
pub async fn stool_list_range(start_date: String, end_date: String) -> Result<Vec<StoolRecord>, String> {
    // ...
}

/// 获取每日汇总
#[command]
pub async fn stool_daily_summary(date: String) -> Result<DailyStoolSummary, String> {
    // ...
}

/// 获取日期范围内的汇总列表
#[command]
pub async fn stool_summary_range(start_date: String, end_date: String) -> Result<Vec<DailyStoolSummary>, String> {
    // ...
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DailyStoolSummary {
    pub date: String,
    pub total_count: i32,
    pub nighttime_count: i32,
    pub bristol_distribution: BristolDistribution,
    pub blood_occurrences: i32,
    pub max_blood_amount: Option<String>,
    pub mucus_occurrences: i32,
    pub urgency_avg: Option<f64>,
    pub pain_episodes: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BristolDistribution {
    pub b1: i32,
    pub b2: i32,
    pub b3: i32,
    pub b4: i32,
    pub b5: i32,
    pub b6: i32,
    pub b7: i32,
}
```

### 2.3 饮食记录接口

```rust
// src-tauri/src/commands/diet.rs

#[derive(Debug, Serialize, Deserialize)]
pub struct DietRecord {
    pub id: Option<String>,
    pub timestamp: String,
    pub meal_type: String,      // breakfast/lunch/dinner/snack
    pub meal_notes: Option<String>,
    pub items: Vec<DietItem>,
    pub postprandial: Option<PostprandialSymptoms>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DietItem {
    pub id: Option<String>,
    pub food_name: String,
    pub category: String,           // grain/protein/vegetable/fruit/fat/dairy
    pub subcategory: Option<String>,
    pub amount_grams: i32,
    pub cooking_method: Option<String>,
    pub oil_added_ml: i32,
    pub temperature: Option<String>,
    pub is_new_food: bool,
    pub allergen_flag: bool,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PostprandialSymptoms {
    pub tracked: bool,
    pub symptoms_occurred: Option<bool>,
    pub symptom_details: Option<String>,
}

// ============ 接口定义 ============

/// 创建饮食记录
#[command]
pub async fn diet_create(record: DietRecord) -> Result<DietRecord, String> {
    // ...
}

/// 更新饮食记录
#[command]
pub async fn diet_update(id: String, record: DietRecord) -> Result<DietRecord, String> {
    // ...
}

/// 删除饮食记录
#[command]
pub async fn diet_delete(id: String) -> Result<(), String> {
    // ...
}

/// 获取指定日期的所有饮食记录
#[command]
pub async fn diet_list_by_date(date: String) -> Result<Vec<DietRecord>, String> {
    // ...
}

/// 获取日期范围内的记录
#[command]
pub async fn diet_list_range(start_date: String, end_date: String) -> Result<Vec<DietRecord>, String> {
    // ...
}

/// 更新餐后症状
#[command]
pub async fn diet_update_postprandial(id: String, symptoms: PostprandialSymptoms) -> Result<(), String> {
    // ...
}
```

### 2.4 症状记录接口

```rust
// src-tauri/src/commands/symptom.rs

#[derive(Debug, Serialize, Deserialize)]
pub struct SymptomRecord {
    pub id: Option<String>,
    pub date: String,
    pub abdominal_pain: Option<AbdominalPain>,
    pub tenesmus: Option<Tenesmus>,
    pub bloating: Option<Bloating>,
    pub extraintestinal: Option<Extraintestinal>,
    pub overall_wellbeing: i32,  // 0-10
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AbdominalPain {
    pub present: bool,
    pub location: Option<String>,    // left/right/diffuse/rectal
    pub intensity: Option<i32>,      // 0-10
    pub character: Option<String>,   // cramping/aching/sharp/burning
    pub duration_minutes: Option<i32>,
    pub relieved_by_bm: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Tenesmus {
    pub present: bool,
    pub intensity: Option<i32>,  // 0-10
    pub frequency: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Bloating {
    pub present: bool,
    pub severity: Option<i32>,  // 0-10
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Extraintestinal {
    pub fever: Option<Fever>,
    pub joint_pain: Option<JointPain>,
    pub skin_rash: Option<SkinRash>,
    pub mouth_ulcers: Option<MouthUlcers>,
    pub fatigue_level: Option<i32>,  // 0-10
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Fever {
    pub present: bool,
    pub temperature_celsius: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct JointPain {
    pub present: bool,
    pub location: Option<String>,
    pub intensity: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SkinRash {
    pub present: bool,
    pub location: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MouthUlcers {
    pub present: bool,
    pub count: Option<i32>,
}

// ============ 接口定义 ============

/// 创建或更新症状记录（每天一条）
#[command]
pub async fn symptom_upsert(record: SymptomRecord) -> Result<SymptomRecord, String> {
    // ...
}

/// 获取指定日期的症状记录
#[command]
pub async fn symptom_get(date: String) -> Result<Option<SymptomRecord>, String> {
    // ...
}

/// 获取日期范围内的症状记录
#[command]
pub async fn symptom_list_range(start_date: String, end_date: String) -> Result<Vec<SymptomRecord>, String> {
    // ...
}
```

### 2.5 用药记录接口

```rust
// src-tauri/src/commands/medication.rs

#[derive(Debug, Serialize, Deserialize)]
pub struct MedicationRecord {
    pub id: Option<String>,
    pub date: String,
    pub medications: Vec<MedicationItem>,
    pub suppository_technique: Option<SuppositoryTechnique>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MedicationItem {
    pub id: Option<String>,
    pub name: String,
    pub category: String,       // 5ASA/steroid/biologic/JAKi/S1Pi/...
    pub route: String,          // oral/rectal_suppository/IV/SC
    pub dose: String,
    pub scheduled_time: Option<String>,  // morning/noon/evening/bedtime
    pub actual_time: Option<String>,
    pub taken: bool,
    pub missed_reason: Option<String>,
    pub side_effects: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SuppositoryTechnique {
    pub lubrication_adequate: Option<bool>,
    pub retention_hours: Option<f64>,
    pub position_maintained_mins: Option<i32>,
}

// ============ 接口定义 ============

/// 创建或更新用药记录（每天一条）
#[command]
pub async fn medication_upsert(record: MedicationRecord) -> Result<MedicationRecord, String> {
    // ...
}

/// 获取指定日期的用药记录
#[command]
pub async fn medication_get(date: String) -> Result<Option<MedicationRecord>, String> {
    // ...
}

/// 获取日期范围内的用药记录
#[command]
pub async fn medication_list_range(start_date: String, end_date: String) -> Result<Vec<MedicationRecord>, String> {
    // ...
}

/// 获取用药依从性统计
#[command]
pub async fn medication_adherence(start_date: String, end_date: String) -> Result<MedicationAdherence, String> {
    // ...
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MedicationAdherence {
    pub oral_5asa: AdherenceStats,
    pub rectal_5asa: AdherenceStats,
    pub probiotics: AdherenceStats,
    pub lactulose: AdherenceStats,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdherenceStats {
    pub scheduled: i32,
    pub taken: i32,
    pub missed: i32,
    pub adherence_rate: f64,
}
```

### 2.6 FC追踪接口

```rust
// src-tauri/src/commands/fc.rs

#[derive(Debug, Serialize, Deserialize)]
pub struct FCRecord {
    pub id: Option<String>,
    pub test_date: String,
    pub collection_date: Option<String>,
    pub value: f64,
    pub unit: String,           // µg/g
    pub interpretation: String, // normal/elevated_mild/elevated_moderate/elevated_severe
    pub test_method: Option<String>,
    pub sample_type: Option<String>,
    pub symptoms_at_collection: Option<FCSymptoms>,
    pub current_medications: Option<Vec<String>>,
    pub clinical_context: Option<String>,
    pub doctor_notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FCSymptoms {
    pub blood_amount: Option<String>,
    pub stool_count: Option<i32>,
    pub abdominal_pain: Option<i32>,
    pub bristol_type: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FCTrend {
    pub total_tests: i32,
    pub first_test_date: String,
    pub latest_test_date: String,
    pub trend: String,          // improving/stable/worsening/fluctuating
    pub values: Vec<FCValue>,
    pub percentage_change: f64,
    pub estimated_months_to_target: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FCValue {
    pub date: String,
    pub value: f64,
    pub interpretation: String,
}

// ============ 接口定义 ============

/// 创建FC记录
#[command]
pub async fn fc_create(record: FCRecord) -> Result<FCRecord, String> {
    // ...
}

/// 获取FC历史趋势
#[command]
pub async fn fc_trend(months: Option<i32>) -> Result<FCTrend, String> {
    // ...
}

/// 获取最新FC值
#[command]
pub async fn fc_latest() -> Result<Option<FCRecord>, String> {
    // ...
}

/// AI分析FC趋势
#[command]
pub async fn fc_analyze() -> Result<FCAnalysis, String> {
    // 调用AI服务
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FCAnalysis {
    pub fc_interpretation: String,
    pub consistency_with_symptoms: String,
    pub mucosal_healing_probability: f64,
    pub treatment_response: String,
    pub treatment_adjustment: String,
    pub next_fc_date: String,
    pub endoscopy_needed: bool,
    pub patient_education: Vec<String>,
    pub red_flag_symptoms: Vec<String>,
}
```

### 2.7 食物耐受库接口

```rust
// src-tauri/src/commands/tolerance.rs

#[derive(Debug, Serialize, Deserialize)]
pub struct FoodTolerance {
    pub id: Option<String>,
    pub food_name: String,
    pub category: String,
    pub tolerance_level: String,  // safe/caution/avoid/allergen
    pub exposure_count: i32,
    pub trigger_count: i32,
    pub trigger_rate: f64,
    pub last_reaction_date: Option<String>,
    pub last_reaction_type: Option<String>,
    pub notes: Option<String>,
}

// ============ 接口定义 ============

/// 获取完整耐受库
#[command]
pub async fn tolerance_list() -> Result<Vec<FoodTolerance>, String> {
    // ...
}

/// 获取指定等级的食物
#[command]
pub async fn tolerance_list_by_level(level: String) -> Result<Vec<FoodTolerance>, String> {
    // ...
}

/// 添加或更新食物耐受记录
#[command]
pub async fn tolerance_upsert(food: FoodTolerance) -> Result<FoodTolerance, String> {
    // ...
}

/// 记录食物暴露（更新统计）
#[command]
pub async fn tolerance_record_exposure(
    food_name: String,
    triggered: bool,
    reaction_type: Option<String>,
) -> Result<FoodTolerance, String> {
    // ...
}

/// 删除食物
#[command]
pub async fn tolerance_delete(food_name: String) -> Result<(), String> {
    // ...
}
```

### 2.8 AI配置接口

```rust
// src-tauri/src/commands/ai_config.rs

use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AIConfig {
    pub api_base_url: String,     // API 请求地址
    pub api_key: String,          // API Key
    pub model_name: String,       // 模型名称
    pub max_tokens: i32,          // 最大输出 Token
    pub temperature: f64,         // 温度参数 (0-2)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AIProviderPreset {
    pub name: String,
    pub display_name: String,
    pub api_base_url: String,
    pub default_model: String,
}

// ============ 接口定义 ============

/// 获取当前 AI 配置
#[command]
pub async fn get_ai_config() -> Result<AIConfig, String> {
    // 从数据库读取配置，若无则返回默认 DeepSeek 配置
}

/// 保存 AI 配置
#[command]
pub async fn save_ai_config(config: AIConfig) -> Result<(), String> {
    // 加密存储 API Key 后保存到数据库
}

/// 测试 AI 连接
#[command]
pub async fn test_ai_connection(config: AIConfig) -> Result<bool, String> {
    // 发送简单请求测试 API 连接是否正常
}

/// 获取预设的 AI 提供商列表
#[command]
pub async fn get_ai_presets() -> Result<Vec<AIProviderPreset>, String> {
    // 返回内置的 AI 提供商预设配置
}
```

**预设提供商列表**：

| 提供商 | 名称 | API 地址 | 默认模型 |
|--------|------|----------|----------|
| `deepseek` | DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| `qwen` | 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-turbo` |
| `zhipu` | 智谱 AI | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` |
| `moonshot` | 月之暗面 | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| `openai` | OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| `custom` | 自定义 | 用户填写 | 用户填写 |

### 2.9 AI分析接口

```rust
// src-tauri/src/commands/ai.rs

#[derive(Debug, Serialize, Deserialize)]
pub struct AttributionResult {
    pub symptom_type: String,
    pub symptom_time: String,
    pub candidate_foods: Vec<CandidateFood>,
    pub confounding_factors: ConfoundingFactors,
    pub ai_recommendation: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CandidateFood {
    pub rank: i32,
    pub food: String,
    pub meal: String,
    pub hours_before: f64,
    pub window_type: String,
    pub attribution_score: f64,
    pub confidence: String,
    pub reason: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConfoundingFactors {
    pub stress_level: Option<i32>,
    pub sleep_quality: Option<String>,
    pub medication_adherence: Option<String>,
    pub verdict: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MealRecommendation {
    pub date: String,
    pub disease_phase: String,
    pub overall_strategy: String,
    pub meals: Meals,
    pub new_food_introduction: Option<NewFoodIntroduction>,
    pub nutrition_summary: NutritionSummary,
    pub avoid_reminder: Vec<String>,
    pub ai_tips: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Meals {
    pub breakfast: MealPlan,
    pub lunch: MealPlan,
    pub dinner: MealPlan,
    pub snack: MealPlan,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MealPlan {
    pub total_calories_est: i32,
    pub items: Vec<MealItem>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MealItem {
    pub food: String,
    pub amount_g: i32,
    pub cooking: String,
    pub oil_ml: i32,
    pub reason: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewFoodIntroduction {
    pub attempt_today: bool,
    pub food_name: Option<String>,
    pub test_dose_g: Option<i32>,
    pub monitoring_hours: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NutritionSummary {
    pub estimated_calories: i32,
    pub estimated_protein_g: i32,
    pub estimated_fat_g: i32,
    pub estimated_fiber_g: f64,
    pub meets_target: bool,
}

// ============ 接口定义 ============

/// 归因分析：分析症状可能的食物原因
#[command]
pub async fn ai_analyze_attribution(symptom_date: String) -> Result<AttributionResult, String> {
    // 1. 获取该日期的症状记录
    // 2. 获取前72小时的饮食记录
    // 3. 获取生活方式记录（排除混杂因素）
    // 4. 调用归因分析算法
    // 5. 调用AI生成建议
}

/// 生成每日饮食推荐
#[command]
pub async fn ai_generate_meal_recommendation(date: String) -> Result<MealRecommendation, String> {
    // 1. 获取当前症状状态
    // 2. 获取耐受食物库
    // 3. 获取近期饮食历史
    // 4. 调用AI生成推荐
}

/// 预测食物风险
#[command]
pub async fn ai_predict_risk(food_name: String, amount_grams: i32) -> Result<RiskPrediction, String> {
    // ...
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RiskPrediction {
    pub food: String,
    pub historical_exposures: i32,
    pub trigger_probability: f64,
    pub risk_level: String,  // negligible/low/medium/high
    pub recommendation: String,
}

/// Mayo评分计算
#[command]
pub async fn ai_calculate_mayo(period_days: Option<i32>) -> Result<MayoCalculation, String> {
    // ...
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MayoCalculation {
    pub date: String,
    pub period_days: i32,
    pub components: MayoComponents,
    pub total: MayoTotal,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MayoComponents {
    pub stool_frequency: MayoComponent,
    pub rectal_bleeding: MayoComponent,
    pub mucosal_appearance: MayoComponent,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MayoComponent {
    pub score: i32,
    pub details: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MayoTotal {
    pub partial_mayo: i32,
    pub disease_activity: String,
    pub activity_interpretation: String,
}

/// 药物疗效评估
#[command]
pub async fn ai_assess_efficacy(drug_name: String) -> Result<EfficacyAssessment, String> {
    // ...
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EfficacyAssessment {
    pub drug_name: String,
    pub treatment_start_date: String,
    pub current_mayo: i32,
    pub baseline_mayo: i32,
    pub mayo_change: i32,
    pub mayo_change_pct: f64,
    pub efficacy_judgment: String,
    pub guideline_consistency: String,
    pub treatment_recommendation: TreatmentRecommendation,
    pub next_assessment_weeks: i32,
    pub risk_alerts: Vec<String>,
    pub patient_messages: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TreatmentRecommendation {
    pub action: String,
    pub specific_changes: Vec<String>,
    pub rationale: String,
}
```

### 2.10 复诊报告接口

```rust
// src-tauri/src/commands/report.rs

#[derive(Debug, Serialize, Deserialize)]
pub struct ClinicReport {
    pub id: Option<String>,
    pub report_date: String,
    pub period_start: String,
    pub period_end: String,
    pub next_visit_date: Option<String>,
    pub summary: ReportSummary,
    pub detailed_analysis: DetailedAnalysis,
    pub ai_questions: Vec<String>,
    pub recommendations: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReportSummary {
    pub overall_trend: String,
    pub key_changes: Vec<String>,
    pub partial_mayo: i32,
    pub disease_activity: String,
    pub adherence_rate: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DetailedAnalysis {
    pub stool_analysis: StoolAnalysis,
    pub pain_analysis: PainAnalysis,
    pub extraintestinal_analysis: ExtraintestinalAnalysis,
    pub diet_analysis: DietAnalysis,
    pub medication_analysis: MedicationAnalysis,
    pub lab_analysis: Option<LabAnalysis>,
}

// ... 子结构体定义

// ============ 接口定义 ============

/// 生成复诊报告
#[command]
pub async fn report_generate(period_days: Option<i32>) -> Result<ClinicReport, String> {
    // 1. 收集过去N天的所有数据
    // 2. 计算统计数据
    // 3. 调用AI生成报告内容
    // 4. 保存报告
}

/// 获取报告列表
#[command]
pub async fn report_list(limit: Option<i32>) -> Result<Vec<ClinicReportSummary>, String> {
    // ...
}

/// 获取单份报告详情
#[command]
pub async fn report_get(id: String) -> Result<ClinicReport, String> {
    // ...
}

/// 导出报告为Markdown
#[command]
pub async fn report_export_markdown(id: String) -> Result<String, String> {
    // ...
}

/// 导出报告为PDF
#[command]
pub async fn report_export_pdf(id: String, output_path: String) -> Result<String, String> {
    // ...
}
```

### 2.11 数据导出接口

```rust
// src-tauri/src/commands/export.rs

/// 导出所有数据为JSON
#[command]
pub async fn export_json(output_path: String) -> Result<String, String> {
    // ...
}

/// 导出指定日期范围数据为CSV
#[command]
pub async fn export_csv(start_date: String, end_date: String, output_path: String) -> Result<String, String> {
    // ...
}

/// 备份数据库
#[command]
pub async fn export_backup(output_path: String) -> Result<String, String> {
    // 复制SQLite文件
}

/// 恢复数据库
#[command]
pub async fn export_restore(backup_path: String) -> Result<(), String> {
    // 替换SQLite文件
}
```

---

## 三、前端组件设计

### 3.1 组件层级结构

```
App
├── Layout
│   ├── Sidebar (GlassSidebar)
│   │   ├── Logo
│   │   ├── NavMenu
│   │   │   ├── NavItem (仪表盘)
│   │   │   ├── NavGroup (记录)
│   │   │   │   ├── NavItem (排便)
│   │   │   │   ├── NavItem (饮食)
│   │   │   │   ├── NavItem (症状)
│   │   │   │   └── NavItem (用药)
│   │   │   ├── NavGroup (分析)
│   │   │   │   ├── NavItem (归因)
│   │   │   │   ├── NavItem (推荐)
│   │   │   │   └── NavItem (FC)
│   │   │   ├── NavGroup (医疗)
│   │   │   │   ├── NavItem (疗效)
│   │   │   │   └── NavItem (报告)
│   │   │   └── NavItem (设置)
│   │   └── StatusBar
│   │
│   └── MainContent
│       └── <Outlet /> (路由页面)
│
├── pages/
│   ├── DashboardPage
│   ├── StoolRecordPage
│   ├── DietRecordPage
│   ├── SymptomRecordPage
│   ├── MedicationRecordPage
│   ├── AttributionPage
│   ├── RecommendationPage
│   ├── FCTrackerPage
│   ├── EfficacyPage
│   ├── ReportPage
│   └── SettingsPage
│
└── shared/
    ├── GlassCard
    ├── GlassButton
    ├── GlassInput
    ├── GlassSelect
    ├── GlassModal
    ├── GlassToast
    ├── DatePicker
    ├── TimePicker
    ├── PainSlider
    ├── BristolSelector
    ├── BloodAmountSelector
    ├── FoodSearch
    └── TrendChart
```

### 3.2 基础UI组件库

#### GlassCard 组件

```tsx
// src/components/ui/GlassCard.tsx

import { ReactNode, HTMLAttributes } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function GlassCard({ 
  children, 
  variant = 'default',
  padding = 'md',
  className = '',
  ...props 
}: GlassCardProps) {
  const variantStyles = {
    default: 'bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg shadow-black/5',
    elevated: 'bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl shadow-black/10',
    flat: 'bg-white/50 backdrop-blur-lg border border-white/30',
  };

  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`
        rounded-3xl
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
```

#### GlassButton 组件

```tsx
// src/components/ui/GlassButton.tsx

import { ReactNode, ButtonHTMLAttributes } from 'react';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  loading?: boolean;
}

export function GlassButton({ 
  children, 
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled,
  className = '',
  ...props 
}: GlassButtonProps) {
  const baseStyles = `
    inline-flex items-center justify-center gap-2
    rounded-2xl font-medium
    transition-all duration-200
    backdrop-blur-sm
    disabled:opacity-50 disabled:cursor-not-allowed
  `;
  
  const variantStyles = {
    primary: 'bg-primary-500/80 hover:bg-primary-500 text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40',
    secondary: 'bg-white/70 hover:bg-white/90 text-gray-700 border border-white/50 hover:border-white/70',
    ghost: 'bg-transparent hover:bg-white/50 text-gray-600',
    danger: 'bg-red-500/80 hover:bg-red-500 text-white shadow-lg shadow-red-500/25',
  };
  
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };
  
  return (
    <button
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <LoadingSpinner size={size === 'sm' ? 16 : 20} />
      ) : icon ? (
        <span className="w-5 h-5">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
```

#### GlassInput 组件

```tsx
// src/components/ui/GlassInput.tsx

import { InputHTMLAttributes, ReactNode } from 'react';

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  suffix?: ReactNode;
}

export function GlassInput({
  label,
  error,
  icon,
  suffix,
  className = '',
  ...props
}: GlassInputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full
            bg-white/60
            backdrop-blur-sm
            border border-white/50
            rounded-2xl
            px-4 py-3
            text-gray-700
            placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50
            transition-all duration-200
            ${icon ? 'pl-12' : ''}
            ${suffix ? 'pr-12' : ''}
            ${error ? 'border-red-500/50 focus:ring-red-500/50' : ''}
            ${className}
          `}
          {...props}
        />
        {suffix && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
```

#### GlassModal 组件

```tsx
// src/components/ui/GlassModal.tsx

import { ReactNode, useEffect } from 'react';

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function GlassModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}: GlassModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div
        className={`
          relative
          ${sizeStyles[size]}
          w-full mx-4
          bg-white/80
          backdrop-blur-2xl
          border border-white/60
          rounded-3xl
          shadow-2xl
          p-6
          animate-in fade-in zoom-in-95 duration-200
        `}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/50 transition-colors"
            >
              <CloseIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
```

### 3.3 业务组件设计

#### BristolSelector 组件

```tsx
// src/components/shared/BristolSelector.tsx

import { useState } from 'react';

interface BristolSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

const BRISTOL_TYPES = [
  { type: 1, label: '坚果状', emoji: '🔴', description: '分散的硬块' },
  { type: 2, label: '成块状', emoji: '🔴', description: '香肠状但成块' },
  { type: 3, label: '有裂痕', emoji: '🟡', description: '香肠状表面有裂痕' },
  { type: 4, label: '光滑', emoji: '🟢', description: '像香肠，表面光滑' },
  { type: 5, label: '软块', emoji: '🟢', description: '软块，边缘清楚' },
  { type: 6, label: '糊状', emoji: '🟡', description: '蓬松块，糊状' },
  { type: 7, label: '水样', emoji: '🔴', description: '水样，无固体块' },
];

export function BristolSelector({ value, onChange }: BristolSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Bristol 大便性状量表
      </label>
      <div className="grid grid-cols-4 gap-3">
        {BRISTOL_TYPES.map(({ type, label, emoji, description }) => (
          <button
            key={type}
            onClick={() => onChange(type)}
            className={`
              p-4 rounded-2xl border-2 transition-all duration-200
              ${value === type
                ? 'border-primary-500 bg-primary-50/50 shadow-md shadow-primary-500/20'
                : 'border-white/50 bg-white/50 hover:border-white/80 hover:bg-white/70'
              }
            `}
          >
            <div className="text-2xl mb-1">{emoji}</div>
            <div className="text-lg font-semibold text-gray-800">{type}型</div>
            <div className="text-xs text-gray-500">{label}</div>
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-500">
        {BRISTOL_TYPES.find(t => t.type === value)?.description}
      </p>
    </div>
  );
}
```

#### PainSlider 组件

```tsx
// src/components/shared/PainSlider.tsx

import { useState } from 'react';

interface PainSliderProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}

const PAIN_LEVELS = [
  { value: 0, label: '无痛', color: 'bg-green-500' },
  { value: 1, label: '轻微', color: 'bg-green-400' },
  { value: 2, label: '轻微', color: 'bg-green-300' },
  { value: 3, label: '轻度', color: 'bg-yellow-400' },
  { value: 4, label: '轻度', color: 'bg-yellow-500' },
  { value: 5, label: '中度', color: 'bg-orange-400' },
  { value: 6, label: '中度', color: 'bg-orange-500' },
  { value: 7, label: '明显', color: 'bg-red-400' },
  { value: 8, label: '明显', color: 'bg-red-500' },
  { value: 9, label: '剧烈', color: 'bg-red-600' },
  { value: 10, label: '剧烈', color: 'bg-red-700' },
];

export function PainSlider({ value, onChange, label = '疼痛程度' }: PainSliderProps) {
  const currentLevel = PAIN_LEVELS[value];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className={`
          px-3 py-1 rounded-full text-sm font-medium text-white
          ${currentLevel.color}
        `}>
          {value}/10 · {currentLevel.label}
        </span>
      </div>
      
      <input
        type="range"
        min="0"
        max="10"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-6
          [&::-webkit-slider-thumb]:h-6
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-primary-500
          [&::-webkit-slider-thumb]:transition-all
          [&::-webkit-slider-thumb]:duration-150
          [&::-webkit-slider-thumb]:hover:scale-110
        "
      />
      
      <div className="flex justify-between text-xs text-gray-400">
        <span>无痛</span>
        <span>剧烈</span>
      </div>
    </div>
  );
}
```

---

## 四、页面设计

### 4.1 仪表盘页面

```tsx
// src/pages/DashboardPage.tsx

import { useState, useEffect } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { invoke } from '@tauri-apps/api/tauri';

interface DashboardData {
  today: {
    stoolCount: number;
    bristolMain: number;
    bloodAmount: string;
    painIntensity: number;
    alertLevel: 'green' | 'yellow' | 'orange' | 'red';
  };
  weeklyTrend: {
    avgStoolCount: number;
    bloodDays: number;
    avgPain: number;
    trend: 'improving' | 'stable' | 'worsening';
  };
  medication: {
    oral5asa: boolean;
    rectal5asa: boolean;
    probiotics: boolean;
    lactulose: boolean;
  };
  aiTips: string[];
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const result = await invoke<DashboardData>('dashboard_get_data');
      setData(result);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  const alertColors = {
    green: 'bg-green-500/20 text-green-700 border-green-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
    orange: 'bg-orange-500/20 text-orange-700 border-orange-500/30',
    red: 'bg-red-500/20 text-red-700 border-red-500/30',
  };

  const alertLabels = {
    green: '🟢 缓解期',
    yellow: '🟡 轻度活动',
    orange: '🟠 中度活动',
    red: '🔴 重度活动',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">仪表盘</h1>
      
      {/* 今日状态 + 预警 */}
      <div className="grid grid-cols-2 gap-6">
        <GlassCard variant="elevated">
          <h3 className="text-sm font-medium text-gray-500 mb-4">今日状态</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">便次</span>
              <span className="font-semibold">{data.today.stoolCount}次</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Bristol</span>
              <span className="font-semibold">{data.today.bristolMain}型</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">便血</span>
              <span className="font-semibold">{data.today.bloodAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">腹痛</span>
              <span className="font-semibold">{data.today.painIntensity}/10</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard variant="elevated">
          <h3 className="text-sm font-medium text-gray-500 mb-4">预警等级</h3>
          <div className={`
            p-6 rounded-2xl border text-center
            ${alertColors[data.today.alertLevel]}
          `}>
            <div className="text-3xl font-bold mb-2">
              {alertLabels[data.today.alertLevel]}
            </div>
            <p className="text-sm opacity-75">
              {data.today.alertLevel === 'green' && '维持当前方案'}
              {data.today.alertLevel === 'yellow' && '加强监测'}
              {data.today.alertLevel === 'orange' && '48小时内就医'}
              {data.today.alertLevel === 'red' && '立即急诊'}
            </p>
          </div>
        </GlassCard>
      </div>

      {/* 7天趋势 */}
      <GlassCard>
        <h3 className="text-sm font-medium text-gray-500 mb-4">7天趋势</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <div className="text-2xl font-bold text-primary-600">
              {data.weeklyTrend.avgStoolCount}
            </div>
            <div className="text-sm text-gray-500">平均便次/日</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {data.weeklyTrend.bloodDays}/7
            </div>
            <div className="text-sm text-gray-500">便血天数</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {data.weeklyTrend.avgPain}
            </div>
            <div className="text-sm text-gray-500">平均腹痛/10</div>
          </div>
        </div>
        {/* 图表区域 */}
        <div className="h-48">
          <TrendChart data={data.weeklyTrend} />
        </div>
      </GlassCard>

      {/* 今日用药 */}
      <GlassCard>
        <h3 className="text-sm font-medium text-gray-500 mb-4">今日用药</h3>
        <div className="grid grid-cols-2 gap-3">
          <MedicationCheck label="美沙拉秦 3g" checked={data.medication.oral5asa} />
          <MedicationCheck label="栓剂 0.5g" checked={data.medication.rectal5asa} />
          <MedicationCheck label="益生菌" checked={data.medication.probiotics} />
          <MedicationCheck label="乳果糖 10mL" checked={data.medication.lactulose} />
        </div>
      </GlassCard>

      {/* AI建议 */}
      <GlassCard>
        <h3 className="text-sm font-medium text-gray-500 mb-4">AI建议</h3>
        <ul className="space-y-2">
          {data.aiTips.map((tip, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-primary-500 mt-1">•</span>
              <span className="text-gray-700">{tip}</span>
            </li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}
```

### 4.2 排便记录页面

```tsx
// src/pages/StoolRecordPage.tsx

import { useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { BristolSelector } from '../components/shared/BristolSelector';
import { PainSlider } from '../components/shared/PainSlider';
import { BloodAmountSelector } from '../components/shared/BloodAmountSelector';
import { MucusAmountSelector } from '../components/shared/MucusAmountSelector';
import { invoke } from '@tauri-apps/api/tauri';

interface StoolFormData {
  bristolType: number;
  color: string;
  consistency: string;
  volume: string;
  bloodPresent: boolean;
  bloodAmount: string;
  bloodLocation: string;
  mucusPresent: boolean;
  mucusAmount: string;
  urgencyLevel: number;
  urgencySudden: boolean;
  painBeforePresent: boolean;
  painBeforeIntensity: number;
  painBeforeLocation: string;
  painAfterPresent: boolean;
  painAfterIntensity: number;
}

export function StoolRecordPage() {
  const [formData, setFormData] = useState<StoolFormData>({
    bristolType: 4,
    color: 'yellow',
    consistency: 'formed',
    volume: 'medium',
    bloodPresent: false,
    bloodAmount: 'none',
    bloodLocation: 'on_surface',
    mucusPresent: false,
    mucusAmount: 'none',
    urgencyLevel: 0,
    urgencySudden: false,
    painBeforePresent: false,
    painBeforeIntensity: 0,
    painBeforeLocation: 'left',
    painAfterPresent: false,
    painAfterIntensity: 0,
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await invoke('stool_create', {
        record: {
          timestamp: new Date().toISOString(),
          sequenceNumber: 1, // 需要查询当日已有记录数
          form: {
            bristolType: formData.bristolType,
            color: formData.color,
            consistency: formData.consistency,
            volume: formData.volume,
          },
          blood: {
            present: formData.bloodPresent,
            amount: formData.bloodAmount,
            location: formData.bloodLocation,
          },
          mucus: {
            present: formData.mucusPresent,
            amount: formData.mucusAmount,
          },
          urgency: {
            level: formData.urgencyLevel,
            sudden: formData.urgencySudden,
          },
          painBefore: {
            present: formData.painBeforePresent,
            intensity: formData.painBeforeIntensity,
            location: formData.painBeforeLocation,
          },
          painAfter: {
            present: formData.painAfterPresent,
            intensity: formData.painAfterIntensity,
          },
        },
      });
      // 成功提示
      showToast('记录已保存');
    } catch (error) {
      console.error('Failed to save stool record:', error);
      showToast('保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">记录排便</h1>

      {/* Bristol量表 */}
      <GlassCard>
        <BristolSelector
          value={formData.bristolType}
          onChange={(type) => setFormData({ ...formData, bristolType: type })}
        />
      </GlassCard>

      {/* 便血 */}
      <GlassCard>
        <BloodAmountSelector
          value={formData.bloodAmount}
          onChange={(amount) => setFormData({ 
            ...formData, 
            bloodAmount: amount,
            bloodPresent: amount !== 'none',
          })}
        />
      </GlassCard>

      {/* 黏液 */}
      <GlassCard>
        <MucusAmountSelector
          value={formData.mucusAmount}
          onChange={(amount) => setFormData({ 
            ...formData, 
            mucusAmount: amount,
            mucusPresent: amount !== 'none',
          })}
        />
      </GlassCard>

      {/* 腹痛 */}
      <GlassCard>
        <PainSlider
          value={formData.painBeforeIntensity}
          onChange={(intensity) => setFormData({ 
            ...formData, 
            painBeforeIntensity: intensity,
            painBeforePresent: intensity > 0,
          })}
          label="排便前腹痛"
        />
      </GlassCard>

      {/* 急迫感 */}
      <GlassCard>
        <PainSlider
          value={formData.urgencyLevel}
          onChange={(level) => setFormData({ ...formData, urgencyLevel: level })}
          label="排便急迫感"
        />
        <label className="flex items-center gap-2 mt-3">
          <input
            type="checkbox"
            checked={formData.urgencySudden}
            onChange={(e) => setFormData({ ...formData, urgencySudden: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm text-gray-600">突然强烈</span>
        </label>
      </GlassCard>

      {/* 保存按钮 */}
      <GlassButton
        variant="primary"
        size="lg"
        onClick={handleSubmit}
        loading={saving}
        className="w-full"
      >
        💾 保存记录
      </GlassButton>
    </div>
  );
}
```

### 4.3 设置页面（AI配置）

```tsx
// src/pages/SettingsPage.tsx

import { useState, useEffect } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { GlassInput } from '../components/ui/GlassInput';
import { GlassSelect } from '../components/ui/GlassSelect';
import { invoke } from '@tauri-apps/api/tauri';

interface AIConfig {
  api_base_url: string;
  api_key: string;
  model_name: string;
  max_tokens: number;
  temperature: number;
}

interface AIProviderPreset {
  name: string;
  display_name: string;
  api_base_url: string;
  default_model: string;
}

export function SettingsPage() {
  const [config, setConfig] = useState<AIConfig>({
    api_base_url: 'https://api.deepseek.com/v1',
    api_key: '',
    model_name: 'deepseek-chat',
    max_tokens: 4096,
    temperature: 0.7,
  });
  const [presets, setPresets] = useState<AIProviderPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState('deepseek');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
    loadPresets();
  }, []);

  const loadConfig = async () => {
    try {
      const result = await invoke<AIConfig>('get_ai_config');
      setConfig(result);
    } catch (error) {
      console.error('Failed to load AI config:', error);
    }
  };

  const loadPresets = async () => {
    try {
      const result = await invoke<AIProviderPreset[]>('get_ai_presets');
      setPresets(result);
    } catch (error) {
      console.error('Failed to load AI presets:', error);
    }
  };

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    const preset = presets.find(p => p.name === presetName);
    if (preset) {
      setConfig({
        ...config,
        api_base_url: preset.api_base_url,
        model_name: preset.default_model,
      });
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const success = await invoke<boolean>('test_ai_connection', { config });
      setTestResult(success ? 'success' : 'fail');
    } catch (error) {
      setTestResult('fail');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await invoke('save_ai_config', { config });
    } catch (error) {
      console.error('Failed to save AI config:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">设置</h1>

      {/* AI 服务配置 */}
      <GlassCard variant="elevated">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">AI 服务配置</h3>
        <p className="text-sm text-gray-500 mb-6">
          配置 AI 服务提供商，支持 OpenAI 兼容的 API 格式（DeepSeek、通义千问、智谱 AI 等）
        </p>

        <div className="space-y-4">
          {/* 提供商预设选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              选择提供商
            </label>
            <div className="grid grid-cols-3 gap-3">
              {presets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetChange(preset.name)}
                  className={`
                    p-3 rounded-xl border-2 transition-all
                    ${selectedPreset === preset.name
                      ? 'border-teal-500 bg-teal-50/50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="font-medium text-sm">{preset.display_name}</div>
                  <div className="text-xs text-gray-500 mt-1">{preset.default_model}</div>
                </button>
              ))}
            </div>
          </div>

          {/* API 地址 */}
          <GlassInput
            label="API 请求地址"
            value={config.api_base_url}
            onChange={(e) => setConfig({ ...config, api_base_url: e.target.value })}
            placeholder="https://api.deepseek.com/v1"
          />

          {/* API Key */}
          <GlassInput
            label="API Key"
            type="password"
            value={config.api_key}
            onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
            placeholder="sk-..."
          />

          {/* 模型名称 */}
          <GlassInput
            label="模型名称"
            value={config.model_name}
            onChange={(e) => setConfig({ ...config, model_name: e.target.value })}
            placeholder="deepseek-chat"
          />

          {/* 高级设置 */}
          <div className="grid grid-cols-2 gap-4">
            <GlassInput
              label="最大输出 Token"
              type="number"
              value={config.max_tokens.toString()}
              onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) || 4096 })}
            />
            <GlassInput
              label="温度参数 (0-2)"
              type="number"
              step="0.1"
              value={config.temperature.toString()}
              onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) || 0.7 })}
            />
          </div>

          {/* 测试结果 */}
          {testResult && (
            <div className={`
              p-3 rounded-xl text-sm
              ${testResult === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
              }
            `}>
              {testResult === 'success' ? '✓ 连接成功' : '✗ 连接失败，请检查配置'}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3 pt-2">
            <GlassButton
              variant="secondary"
              onClick={handleTestConnection}
              loading={testing}
            >
              测试连接
            </GlassButton>
            <GlassButton
              variant="primary"
              onClick={handleSave}
              loading={saving}
            >
              保存配置
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* 其他设置项 */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-gray-700 mb-4">数据管理</h3>
        <div className="space-y-3">
          <GlassButton variant="secondary" className="w-full">
            导出数据 (JSON)
          </GlassButton>
          <GlassButton variant="secondary" className="w-full">
            导出数据 (CSV)
          </GlassButton>
          <GlassButton variant="ghost" className="w-full text-red-600">
            清除所有数据
          </GlassButton>
        </div>
      </GlassCard>
    </div>
  );
}
```

---

## 五、状态管理设计

### 5.1 Zustand Store 结构

```tsx
// src/stores/stoolStore.ts

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/tauri';

interface StoolRecord {
  id: string;
  timestamp: string;
  sequenceNumber: number;
  form: {
    bristolType: number;
    color: string;
    consistency: string;
  };
  blood: {
    present: boolean;
    amount: string;
  };
  // ... 其他字段
}

interface DailySummary {
  date: string;
  totalCount: number;
  bristolDistribution: Record<string, number>;
  bloodOccurrences: number;
  // ... 其他字段
}

interface StoolStore {
  // 状态
  records: StoolRecord[];
  todaySummary: DailySummary | null;
  loading: boolean;
  error: string | null;

  // 操作
  fetchRecordsByDate: (date: string) => Promise<void>;
  fetchSummaryByDate: (date: string) => Promise<void>;
  createRecord: (record: Omit<StoolRecord, 'id'>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
}

export const useStoolStore = create<StoolStore>((set, get) => ({
  records: [],
  todaySummary: null,
  loading: false,
  error: null,

  fetchRecordsByDate: async (date: string) => {
    set({ loading: true, error: null });
    try {
      const records = await invoke<StoolRecord[]>('stool_list_by_date', { date });
      set({ records, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  fetchSummaryByDate: async (date: string) => {
    try {
      const summary = await invoke<DailySummary>('stool_daily_summary', { date });
      set({ todaySummary: summary });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  createRecord: async (record) => {
    set({ loading: true, error: null });
    try {
      await invoke('stool_create', { record });
      // 重新加载数据
      const today = new Date().toISOString().split('T')[0];
      await get().fetchRecordsByDate(today);
      await get().fetchSummaryByDate(today);
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  deleteRecord: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await invoke('stool_delete', { id });
      // 重新加载数据
      const today = new Date().toISOString().split('T')[0];
      await get().fetchRecordsByDate(today);
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },
}));
```

```tsx
// src/stores/appStore.ts

import { create } from 'zustand';

interface AppState {
  // 全局状态
  currentDate: string;
  sidebarCollapsed: boolean;
  alertLevel: 'green' | 'yellow' | 'orange' | 'red';
  
  // 操作
  setCurrentDate: (date: string) => void;
  toggleSidebar: () => void;
  setAlertLevel: (level: 'green' | 'yellow' | 'orange' | 'red') => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentDate: new Date().toISOString().split('T')[0],
  sidebarCollapsed: false,
  alertLevel: 'green',

  setCurrentDate: (date) => set({ currentDate: date }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setAlertLevel: (level) => set({ alertLevel: level }),
}));
```

```tsx
// src/stores/aiConfigStore.ts

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/tauri';

interface AIConfig {
  api_base_url: string;
  api_key: string;
  model_name: string;
  max_tokens: number;
  temperature: number;
}

interface AIProviderPreset {
  name: string;
  display_name: string;
  api_base_url: string;
  default_model: string;
}

interface AIConfigStore {
  // 状态
  config: AIConfig;
  presets: AIProviderPreset[];
  loading: boolean;
  error: string | null;

  // 操作
  loadConfig: () => Promise<void>;
  loadPresets: () => Promise<void>;
  saveConfig: (config: AIConfig) => Promise<void>;
  testConnection: (config: AIConfig) => Promise<boolean>;
}

const defaultConfig: AIConfig = {
  api_base_url: 'https://api.deepseek.com/v1',
  api_key: '',
  model_name: 'deepseek-chat',
  max_tokens: 4096,
  temperature: 0.7,
};

export const useAIConfigStore = create<AIConfigStore>((set, get) => ({
  config: defaultConfig,
  presets: [],
  loading: false,
  error: null,

  loadConfig: async () => {
    set({ loading: true, error: null });
    try {
      const config = await invoke<AIConfig>('get_ai_config');
      set({ config, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  loadPresets: async () => {
    try {
      const presets = await invoke<AIProviderPreset[]>('get_ai_presets');
      set({ presets });
    } catch (error) {
      set({ error: String(error) });
    }
  },

  saveConfig: async (config: AIConfig) => {
    set({ loading: true, error: null });
    try {
      await invoke('save_ai_config', { config });
      set({ config, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  testConnection: async (config: AIConfig) => {
    try {
      return await invoke<boolean>('test_ai_connection', { config });
    } catch (error) {
      set({ error: String(error) });
      return false;
    }
  },
}));
```

---

## 六、算法实现细节

### 6.1 Mayo评分计算

```typescript
// src/utils/mayo.ts

export interface MayoComponents {
  stoolFrequency: number;  // 0-3
  rectalBleeding: number;  // 0-3
  mucosalAppearance: number;  // 0-3
}

export interface MayoResult {
  components: MayoComponents;
  partialMayo: number;  // 0-9
  diseaseActivity: 'remission' | 'mild' | 'moderate' | 'severe';
}

/**
 * 计算排便次数评分
 */
export function calculateStoolScore(avgDailyCount: number): number {
  if (avgDailyCount <= 1) return 0;      // 正常
  if (avgDailyCount <= 3) return 1;      // 1-2次增加
  if (avgDailyCount <= 4) return 2;      // 3-4次增加
  return 3;                               // ≥5次增加
}

/**
 * 计算便血评分
 */
export function calculateBleedingScore(maxBloodAmount: string): number {
  const scoreMap: Record<string, number> = {
    'none': 0,
    'trace': 1,
    'coin_size': 1,
    'moderate': 2,
    'heavy': 3,
  };
  return scoreMap[maxBloodAmount] ?? 0;
}

/**
 * 基于FC值估算黏膜表现评分
 */
export function estimateMucosalScore(fcValue: number | null): number {
  if (fcValue === null) return -1;  // 无法估算
  
  if (fcValue < 50) return 0;      // 黏膜愈合
  if (fcValue < 250) return 1;     // 轻度炎症
  if (fcValue < 500) return 2;     // 中度炎症
  return 3;                         // 重度炎症
}

/**
 * 计算部分Mayo评分
 */
export function calculatePartialMayo(
  avgStoolCount: number,
  maxBloodAmount: string,
  fcValue: number | null
): MayoResult {
  const stoolScore = calculateStoolScore(avgStoolCount);
  const bleedingScore = calculateBleedingScore(maxBloodAmount);
  const mucosaScore = estimateMucosalScore(fcValue);
  
  // 如果没有FC数据，基于症状估算
  const finalMucosaScore = mucosaScore === -1
    ? estimateMucosaFromSymptoms(bleedingScore, stoolScore)
    : mucosaScore;
  
  const partialMayo = stoolScore + bleedingScore + finalMucosaScore;
  
  let diseaseActivity: MayoResult['diseaseActivity'];
  if (partialMayo <= 2) diseaseActivity = 'remission';
  else if (partialMayo <= 5) diseaseActivity = 'mild';
  else if (partialMayo <= 8) diseaseActivity = 'moderate';
  else diseaseActivity = 'severe';
  
  return {
    components: {
      stoolFrequency: stoolScore,
      rectalBleeding: bleedingScore,
      mucosalAppearance: finalMucosaScore,
    },
    partialMayo,
    diseaseActivity,
  };
}

/**
 * 无FC时基于症状估算黏膜表现
 */
function estimateMucosaFromSymptoms(bleedingScore: number, stoolScore: number): number {
  if (bleedingScore === 0 && stoolScore <= 1) return 0;
  if (bleedingScore <= 1 && stoolScore <= 2) return 1;
  if (bleedingScore <= 2) return 2;
  return 3;
}

/**
 * 判断疗效类型
 */
export function judgeEfficacy(
  currentMayo: number,
  baselineMayo: number,
  weekNumber: number
): string {
  const change = baselineMayo - currentMayo;
  const changePct = (change / baselineMayo) * 100;
  
  // 临床缓解
  if (currentMayo <= 2) return 'clinical_remission';
  
  // 临床应答
  if (change >= 3 && changePct >= 30) return 'clinical_response';
  
  // 部分应答
  if (change >= 1) return 'partial_response';
  
  // 原发性无效
  if (weekNumber >= 8) return 'primary_non_response';
  
  // 继发性失应答（需要历史数据）
  return 'insufficient_data';
}
```

### 6.2 归因分析算法

```typescript
// src/utils/attribution.ts

export interface DietRecord {
  id: string;
  timestamp: string;
  mealType: string;
  items: Array<{
    foodName: string;
    category: string;
    amountGrams: number;
  }>;
}

export interface SymptomRecord {
  date: string;
  abdominalPain: {
    present: boolean;
    intensity: number;
  };
  stoolSummary?: {
    maxBloodAmount: string;
  };
}

export interface AttributionCandidate {
  food: string;
  meal: string;
  mealTime: string;
  hoursBefore: number;
  windowType: 'immediate' | 'short_term' | 'delayed';
  timeScore: number;
  historyTriggerRate: number;
  doseScore: number;
  finalScore: number;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

/**
 * 时间窗口匹配
 */
export function findCandidatesInWindow(
  symptomTime: Date,
  dietRecords: DietRecord[],
  windowHours: number = 72
): Array<{ diet: DietRecord; hoursBefore: number; windowType: string }> {
  const candidates: Array<{ diet: DietRecord; hoursBefore: number; windowType: string }> = [];
  
  for (const diet of dietRecords) {
    const mealTime = new Date(diet.timestamp);
    const hoursBefore = (symptomTime.getTime() - mealTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursBefore < 0 || hoursBefore > windowHours) continue;
    
    let windowType: string;
    if (hoursBefore <= 4) windowType = 'immediate';
    else if (hoursBefore <= 24) windowType = 'short_term';
    else windowType = 'delayed';
    
    candidates.push({ diet, hoursBefore, windowType });
  }
  
  // 按时间接近度排序
  candidates.sort((a, b) => a.hoursBefore - b.hoursBefore);
  
  return candidates;
}

/**
 * 计算归因得分
 */
export function calculateAttributionScore(
  hoursBefore: number,
  historyTriggerRate: number,
  doseRatio: number,
  windowHours: number = 72
): number {
  // 时间接近度得分 (权重0.30)
  const timeScore = 1.0 - (hoursBefore / windowHours);
  
  // 历史反应率得分 (权重0.25)
  const historyScore = historyTriggerRate;
  
  // 剂量效应得分 (权重0.20)
  const doseScore = Math.min(doseRatio, 1.5) / 1.5;
  
  // 综合得分
  const finalScore = 
    timeScore * 0.30 +
    historyScore * 0.25 +
    doseScore * 0.20 +
    0.25;  // 基础分（排除度和特异性需要更多数据）
  
  return Math.min(finalScore, 1.0);
}

/**
 * 确定置信度
 */
export function determineConfidence(score: number, exposureCount: number): 'high' | 'medium' | 'low' {
  if (score >= 0.7 && exposureCount >= 5) return 'high';
  if (score >= 0.4 && exposureCount >= 3) return 'medium';
  return 'low';
}

/**
 * 完整的归因分析流程
 */
export async function performAttributionAnalysis(
  symptomDate: string,
  getDietRecords: (startDate: string, endDate: string) => Promise<DietRecord[]>,
  getFoodTolerance: (foodName: string) => Promise<{ exposureCount: number; triggerCount: number }>
): Promise<AttributionCandidate[]> {
  // 1. 获取症状时间
  const symptomTime = new Date(symptomDate + 'T12:00:00');
  
  // 2. 获取前72小时的饮食记录
  const startDate = new Date(symptomTime.getTime() - 72 * 60 * 60 * 1000).toISOString();
  const dietRecords = await getDietRecords(startDate, symptomDate + 'T23:59:59');
  
  // 3. 时间窗口匹配
  const windowCandidates = findCandidatesInWindow(symptomTime, dietRecords);
  
  // 4. 计算每个候选食物的归因得分
  const results: AttributionCandidate[] = [];
  
  for (const candidate of windowCandidates) {
    for (const item of candidate.diet.items) {
      const tolerance = await getFoodTolerance(item.foodName);
      const triggerRate = tolerance.exposureCount > 0 
        ? tolerance.triggerCount / tolerance.exposureCount 
        : 0;
      
      const score = calculateAttributionScore(
        candidate.hoursBefore,
        triggerRate,
        1.0  // 假设正常剂量
      );
      
      results.push({
        food: item.foodName,
        meal: candidate.diet.mealType,
        mealTime: candidate.diet.timestamp,
        hoursBefore: candidate.hoursBefore,
        windowType: candidate.windowType as any,
        timeScore: 1.0 - (candidate.hoursBefore / 72),
        historyTriggerRate: triggerRate,
        doseScore: 1.0,
        finalScore: score,
        confidence: determineConfidence(score, tolerance.exposureCount),
        reason: generateReason(candidate, tolerance, triggerRate),
      });
    }
  }
  
  // 5. 排序并返回Top N
  results.sort((a, b) => b.finalScore - a.finalScore);
  
  return results.slice(0, 5);
}

function generateReason(
  candidate: { hoursBefore: number; windowType: string },
  tolerance: { exposureCount: number; triggerCount: number },
  triggerRate: number
): string {
  const timeDesc = candidate.hoursBefore <= 4 
    ? `${candidate.hoursBefore.toFixed(1)}小时前（即时窗口）`
    : `${candidate.hoursBefore.toFixed(1)}小时前（短期窗口）`;
  
  const historyDesc = tolerance.exposureCount > 0
    ? `历史${tolerance.exposureCount}次暴露，${tolerance.triggerCount}次触发（${(triggerRate * 100).toFixed(0)}%）`
    : '首次暴露，无历史数据';
  
  return `${timeDesc} + ${historyDesc}`;
}
```

---

## 七、数据流设计

### 7.1 日常记录流

```
用户输入
    │
    ▼
前端表单组件
    │
    ▼
Zustand Store (状态管理)
    │
    ▼
Tauri IPC 调用
    │
    ▼
Rust Command 处理
    │
    ▼
Prisma ORM (数据验证 + 写入)
    │
    ▼
SQLite 数据库
    │
    ▼
返回结果
    │
    ▼
更新 Store + UI 刷新
    │
    ▼
触发实时分析
    ├─ 预警检查
    ├─ 归因分析（若有新症状）
    └─ 更新耐受库（若有新反馈）
```

### 7.2 AI分析流

```
触发条件
    │
    ├─ 用户手动请求
    ├─ 症状变化
    └─ 定时触发
    │
    ▼
前端调用 AI Service
    │
    ▼
Tauri IPC → Rust Command
    │
    ▼
数据收集
    ├─ 症状记录
    ├─ 饮食记录
    ├─ 用药记录
    └─ FC记录
    │
    ▼
本地计算（无需网络）
    ├─ Mayo评分
    ├─ 预警等级
    └─ 统计数据
    │
    ▼
AI API调用（需联网）
    ├─ 归因分析
    ├─ 饮食推荐
    └─ 复诊报告
    │
    ▼
结果缓存（SQLite）
    │
    ▼
返回前端展示
```

---

## 八、错误处理设计

### 8.1 错误类型定义

```typescript
// src/types/errors.ts

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'info' | 'warning' | 'error' = 'error'
  ) {
    super(message);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 'DATABASE_ERROR');
  }
}

export class AIError extends AppError {
  constructor(message: string, public isNetworkError: boolean = false) {
    super(message, 'AI_ERROR', isNetworkError ? 'warning' : 'error');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field: string) {
    super(message, 'VALIDATION_ERROR', 'warning');
  }
}
```

### 8.2 全局错误处理

```tsx
// src/components/ErrorBoundary.tsx

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // 可以发送错误报告到后端
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <GlassCard className="max-w-md text-center">
            <div className="text-6xl mb-4">😵</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              出现了一些问题
            </h2>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || '未知错误'}
            </p>
            <GlassButton
              variant="primary"
              onClick={() => window.location.reload()}
            >
              重新加载
            </GlassButton>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 九、开发流程

### 9.1 开发命令

```bash
# 1. 初始化项目
npm create tauri-app uc-log -- --template react-ts
cd uc-log

# 2. 安装前端依赖
npm install zustand recharts react-router-dom
npm install -D tailwindcss postcss autoprefixer

# 3. 安装Rust依赖
cd src-tauri
cargo add serde serde_json tauri prisma-client
cd ..

# 4. 初始化Prisma
npx prisma init --datasource-provider sqlite

# 5. 启动开发服务器
npm run tauri dev

# 6. 构建生产版本
npm run tauri build
```

### 9.2 开发阶段

| 阶段 | 内容 | 预计时间 |
|------|------|----------|
| Phase 1 | 项目初始化 + 基础UI组件 | 2天 |
| Phase 2 | 数据库设计 + 基础CRUD | 3天 |
| Phase 3 | 排便/饮食/症状/用药记录 | 5天 |
| Phase 4 | 仪表盘 + 预警系统 | 3天 |
| Phase 5 | 归因分析 + AI推荐 | 5天 |
| Phase 6 | FC追踪 + Mayo评分 | 3天 |
| Phase 7 | 复诊报告 + 导出 | 3天 |
| Phase 8 | 测试 + 优化 + 打包 | 2天 |

总计：约26天

---

## 十、总结

### 10.1 详细设计要点

| 模块 | 设计要点 |
|------|----------|
| **Tauri IPC** | 10个模块、50+接口，类型安全 |
| **前端组件** | 玻璃质感UI组件库，可复用 |
| **状态管理** | Zustand Store，按模块划分 |
| **算法实现** | Mayo评分、归因分析、风险预测 |
| **数据流** | 离线优先，AI按需调用 |
| **错误处理** | 分级处理，友好提示 |

### 10.2 与概要设计的关系

```
概要设计                    详细设计
├─ 技术选型        →    ├─ 具体版本号
├─ 项目结构        →    ├─ 详细目录树
├─ 数据库设计      →    ├─ 完整Prisma Schema
├─ UI设计规范      →    ├─ 组件代码实现
├─ 核心模块设计    →    ├─ 页面代码实现
└─ AI集成设计      →    ├─ 算法代码实现
```

---

**文档结束**

> 📝 本文档为详细设计文档，开发人员可直接参考实现。
>
> 📅 下一步：进入编码阶段，按Phase顺序实现各模块。
