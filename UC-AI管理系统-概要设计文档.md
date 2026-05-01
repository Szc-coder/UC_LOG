# UC AI管理系统 - 概要设计文档

> **项目名称**：UC Log - 溃疡性结肠炎AI智能管理系统
>
> **文档版本**：v1.0
>
> **编写日期**：2026-05-01
>
> **文档状态**：待评审

---

## 一、设计约束与目标

### 1.1 开发环境约束

| 约束项 | 说明 | 设计决策 |
|--------|------|----------|
| 开发工具 | 仅VSCode | 选择前端友好、调试便捷的技术栈 |
| 数据库 | 未安装数据库软件 | 使用嵌入式数据库SQLite，无需安装 |
| 部署平台 | Windows桌面应用 | 选择跨平台桌面框架 |

### 1.2 设计目标

| 目标 | 说明 |
|------|------|
| **轻量级** | 单文件安装，无需额外依赖 |
| **离线优先** | 核心功能完全离线可用 |
| **美观清新** | iOS 26风格玻璃质感UI |
| **易开发** | VSCode友好，热重载开发 |

---

## 二、技术选型

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    UC Log 桌面应用                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │    前端层        │    │    后端层        │                │
│  │  React + TS     │◄──►│   Tauri (Rust)  │                │
│  │  + TailwindCSS  │ IPC│   + SQLite      │                │
│  └────────┬────────┘    └────────┬────────┘                │
│           │                      │                          │
│  ┌────────▼────────┐    ┌────────▼────────┐                │
│  │   UI组件库       │    │   数据层         │                │
│  │  玻璃质感设计    │    │  SQLite本地存储  │                │
│  └─────────────────┘    └─────────────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│   AI服务层      │
│  可配置 LLM API │
│ (DeepSeek/千问等│
│  用户可自定义)  │
└─────────────────┘
```

### 2.2 技术栈详细选型

| 层级 | 技术选择 | 版本 | 选择理由 |
|------|----------|------|----------|
| **桌面框架** | Tauri | 2.x | 轻量级（~5MB），比Electron小10倍 |
| **前端框架** | React | 18.x | 生态成熟，组件丰富 |
| **类型系统** | TypeScript | 5.x | 类型安全，开发体验好 |
| **样式方案** | TailwindCSS | 3.x | 原子化CSS，快速实现玻璃质感 |
| **UI组件** | Radix UI | 最新 | 无样式原语，配合Tailwind定制 |
| **本地数据库** | SQLite | 3.x | 嵌入式，无需安装，单文件存储 |
| **ORM** | Prisma | 5.x | 类型安全的数据库操作 |
| **图表库** | Recharts | 2.x | React友好，支持响应式 |
| **状态管理** | Zustand | 4.x | 轻量级状态管理 |
| **AI集成** | OpenAI 兼容 SDK | 最新 | 支持 DeepSeek/通义千问/智谱等国内模型 |

### 2.3 选型理由详解

#### 为什么选择Tauri？

| 对比项 | Tauri | Electron |
|--------|-------|----------|
| 安装包大小 | ~5-10MB | ~150MB+ |
| 内存占用 | ~30MB | ~200MB+ |
| 后端语言 | Rust（高性能） | Node.js |
| 安全性 | 更高（Rust内存安全） | 一般 |
| 学习曲线 | 中等 | 低 |

**结论**：Tauri更轻量，适合单机桌面应用。

#### 为什么选择SQLite？

| 特性 | 说明 |
|------|------|
| 无需安装 | 嵌入式数据库，随应用一起分发 |
| 单文件存储 | 数据库就是一个.db文件 |
| 性能优秀 | 读写速度足够满足本应用需求 |
| 跨平台 | Windows/Mac/Linux通用 |
| 备份简单 | 复制.db文件即可备份 |

---

## 三、项目结构

### 3.1 目录结构

```
uc-log/
├── src-tauri/                    # Tauri后端（Rust）
│   ├── src/
│   │   ├── main.rs              # 入口
│   │   ├── commands/            # Tauri命令（IPC）
│   │   │   ├── mod.rs
│   │   │   ├── stool.rs         # 排便记录命令
│   │   │   ├── diet.rs          # 饮食记录命令
│   │   │   ├── symptom.rs       # 症状记录命令
│   │   │   ├── medication.rs    # 用药记录命令
│   │   │   └── ai.rs            # AI分析命令
│   │   ├── db/                  # 数据库模块
│   │   │   ├── mod.rs
│   │   │   ├── schema.rs        # 数据库Schema
│   │   │   └── migrations/      # 数据库迁移
│   │   └── utils/               # 工具函数
│   ├── Cargo.toml               # Rust依赖
│   └── tauri.conf.json          # Tauri配置
│
├── src/                          # 前端（React + TypeScript）
│   ├── main.tsx                 # 入口
│   ├── App.tsx                  # 根组件
│   │
│   ├── components/              # 通用组件
│   │   ├── ui/                  # 基础UI组件
│   │   │   ├── GlassCard.tsx    # 玻璃卡片
│   │   │   ├── GlassButton.tsx  # 玻璃按钮
│   │   │   ├── GlassInput.tsx   # 玻璃输入框
│   │   │   ├── GlassModal.tsx   # 玻璃弹窗
│   │   │   └── GlassSidebar.tsx # 玻璃侧边栏
│   │   ├── charts/              # 图表组件
│   │   │   ├── StoolTrend.tsx   # 排便趋势图
│   │   │   ├── SymptomHeatmap.tsx # 症状热力图
│   │   │   └── FCTrend.tsx      # FC趋势图
│   │   └── shared/              # 业务共享组件
│   │       ├── BristolSelector.tsx # Bristol量表选择器
│   │       ├── PainSlider.tsx   # 疼痛滑块
│   │       └── FoodSearch.tsx   # 食物搜索
│   │
│   ├── pages/                   # 页面组件
│   │   ├── Dashboard.tsx        # 仪表盘（首页）
│   │   ├── StoolRecord.tsx      # 排便记录页
│   │   ├── DietRecord.tsx       # 饮食记录页
│   │   ├── SymptomRecord.tsx    # 症状记录页
│   │   ├── MedicationRecord.tsx # 用药记录页
│   │   ├── Analysis.tsx         # 分析页（归因/推荐）
│   │   ├── FCTracker.tsx        # FC追踪页
│   │   ├── Efficacy.tsx         # 疗效评估页
│   │   ├── Report.tsx           # 复诊报告页
│   │   └── Settings.tsx         # 设置页
│   │
│   ├── hooks/                   # 自定义Hooks
│   │   ├── useStool.ts
│   │   ├── useDiet.ts
│   │   ├── useSymptom.ts
│   │   └── useAI.ts
│   │
│   ├── stores/                  # 状态管理
│   │   ├── stoolStore.ts
│   │   ├── dietStore.ts
│   │   ├── symptomStore.ts
│   │   └── appStore.ts
│   │
│   ├── services/                # 服务层
│   │   ├── tauri.ts             # Tauri IPC封装
│   │   ├── ai.ts                # AI服务
│   │   └── export.ts            # 导出服务
│   │
│   ├── types/                   # TypeScript类型
│   │   ├── stool.ts
│   │   ├── diet.ts
│   │   ├── symptom.ts
│   │   └── common.ts
│   │
│   └── utils/                   # 工具函数
│       ├── mayo.ts              # Mayo评分计算
│       ├── attribution.ts       # 归因分析
│       └── validation.ts        # 数据验证
│
├── prisma/                      # Prisma Schema
│   ├── schema.prisma            # 数据库模型定义
│   └── migrations/              # 数据库迁移文件
│
├── package.json                 # 前端依赖
├── tailwind.config.js           # Tailwind配置
├── tsconfig.json                # TypeScript配置
├── vite.config.ts               # Vite配置
└── README.md                    # 项目说明
```

---

## 四、数据库设计

### 4.1 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./uc-log.db"
}

// 排便记录
model StoolRecord {
  id              String   @id @default(uuid())
  timestamp       DateTime
  sequenceNumber  Int      // 当日第几次

  // Bristol量表
  bristolType     Int      // 1-7
  color           String   // yellow/brown/dark_brown/black/red/bloody
  consistency     String   // formed/soft/mushy/watery
  volume          String?  // small/medium/large
  odor            String?  // normal/foul/fishy

  // 便血
  bloodPresent    Boolean  @default(false)
  bloodAmount     String?  // none/trace/coin_size/moderate/heavy
  bloodLocation   String?  // on_surface/mixed/pure_blood
  bloodColor      String?  // bright_red/dark_red/maroon

  // 黏液
  mucusPresent    Boolean  @default(false)
  mucusAmount     String?  // none/small/moderate/large
  mucusColor      String?  // clear/white/yellow/pink/bloody

  // 急迫感
  urgencyLevel    Int?     // 0-10
  urgencySudden   Boolean?

  // 腹痛
  painBeforePresent    Boolean?
  painBeforeLocation   String?
  painBeforeIntensity  Int?     // 0-10
  painAfterPresent     Boolean?
  painAfterLocation    String?
  painAfterIntensity   Int?     // 0-10

  // 关联
  dailySummary    DailyStoolSummary? @relation(fields: [id], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// 每日排便汇总
model DailyStoolSummary {
  id                String   @id @default(uuid())
  date              String   @unique // YYYY-MM-DD
  totalCount        Int
  nighttimeCount    Int      @default(0)

  // Bristol分布
  b1Count           Int      @default(0)
  b2Count           Int      @default(0)
  b3Count           Int      @default(0)
  b4Count           Int      @default(0)
  b5Count           Int      @default(0)
  b6Count           Int      @default(0)
  b7Count           Int      @default(0)

  bloodOccurrences  Int      @default(0)
  maxBloodAmount    String?
  mucusOccurrences  Int      @default(0)
  urgencyAvg        Float?
  painEpisodes      Int      @default(0)

  records           StoolRecord[]
  createdAt         DateTime @default(now())
}

// 饮食记录
model DietRecord {
  id              String   @id @default(uuid())
  timestamp       DateTime
  mealType        String   // breakfast/lunch/dinner/snack
  mealNotes       String?

  // 餐后症状追踪
  postprandialTracked    Boolean  @default(false)
  postprandialOccurred   Boolean?
  postprandialDetails    String?

  items           DietItem[]
  createdAt       DateTime @default(now())
}

// 饮食项目
model DietItem {
  id              String   @id @default(uuid())
  dietRecordId    String
  dietRecord      DietRecord @relation(fields: [dietRecordId], references: [id], onDelete: Cascade)

  foodName        String
  category        String   // grain/protein/vegetable/fruit/fat/dairy/beverage/supplement
  subcategory     String?
  amountGrams     Int
  cookingMethod   String?  // steamed/boiled/stir_fried/baked/raw/mashed/pureed
  oilAddedMl      Int      @default(0)
  temperature     String?  // hot/warm/room_temp/cold
  isNewFood       Boolean  @default(false)
  allergenFlag    Boolean  @default(false)
  notes           String?

  createdAt       DateTime @default(now())
}

// 症状记录
model SymptomRecord {
  id                String   @id @default(uuid())
  date              String   @unique // YYYY-MM-DD

  // 腹痛
  abdominalPainPresent     Boolean  @default(false)
  abdominalPainLocation    String?  // left/right/diffuse/rectal
  abdominalPainIntensity   Int?     // 0-10
  abdominalPainCharacter   String?  // cramping/aching/sharp/burning
  abdominalPainDuration    Int?     // 分钟
  abdominalPainRelievedByBm Boolean?

  // 里急后重
  tenesmusPresent    Boolean  @default(false)
  tenesmusIntensity  Int?     // 0-10
  tenesmusFrequency  Int?

  // 腹胀
  bloatingPresent    Boolean  @default(false)
  bloatingSeverity   Int?     // 0-10

  // 肠外表现
  feverPresent       Boolean  @default(false)
  feverTemperature   Float?

  jointPainPresent   Boolean  @default(false)
  jointPainLocation  String?
  jointPainIntensity Int?

  skinRashPresent    Boolean  @default(false)
  skinRashLocation   String?
  skinRashDescription String?

  mouthUlcersPresent Boolean  @default(false)
  mouthUlcersCount   Int?

  fatigueLevel       Int?     // 0-10

  // 整体评估
  overallWellbeing   Int      // 0-10

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

// 用药记录
model MedicationRecord {
  id              String   @id @default(uuid())
  date            String   // YYYY-MM-DD

  // 栓剂技巧
  suppositoryLubricationAdequate Boolean?
  suppositoryRetentionHours      Float?
  suppositoryPositionMins        Int?

  items           MedicationItem[]
  createdAt       DateTime @default(now())
}

// 用药项目
model MedicationItem {
  id              String   @id @default(uuid())
  recordId        String
  record          MedicationRecord @relation(fields: [recordId], references: [id], onDelete: Cascade)

  name            String
  category        String   // 5ASA/steroid/biologic/immunomodulator/JAKi/S1Pi/probiotic/laxative/other
  route           String   // oral/rectal_suppository/rectal_enema/rectal_foam/IV/SC
  dose            String
  scheduledTime   String?  // morning/noon/evening/bedtime
  actualTime      DateTime?
  taken           Boolean
  missedReason    String?
  sideEffects     String?

  createdAt       DateTime @default(now())
}

// 生活方式记录
model LifestyleRecord {
  id              String   @id @default(uuid())
  date            String   @unique // YYYY-MM-DD

  // 压力
  stressLevel     Int?     // 0-10
  stressSources   String?  // JSON数组

  // 情绪
  mood            String?  // happy/calm/anxious/depressed/irritable

  // 睡眠
  sleepDurationHours    Float?
  sleepQuality          String?  // excellent/good/fair/poor
  sleepDifficulty       Boolean?
  sleepNightWaking      Int?

  // 运动
  activityType          String?  // walking/yoga/cycling/swimming/none
  activityDuration      Int?     // 分钟
  activityIntensity     String?  // light/moderate/vigorous

  // 烟酒
  smokingSmoked         Boolean?
  smokingCigarettes     Int?
  alcoholConsumed       Boolean?
  alcoholType           String?
  alcoholAmount         String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

// FC检测记录
model FCRecord {
  id              String   @id @default(uuid())
  testDate        String   // YYYY-MM-DD
  collectionDate  String?  // 粪便采集日期

  value           Float
  unit            String   @default("µg/g")
  interpretation  String   // normal/elevated_mild/elevated_moderate/elevated_severe
  testMethod      String?  // ELISA/quantum_dot/other
  sampleType      String?  // single/3-day_pooled

  // 同期症状
  symptomsBloodAmount   String?
  symptomsStoolCount    Int?
  symptomsAbdominalPain Int?
  symptomsBristolType   Int?

  // 关联信息
  currentMedications    String?  // JSON数组
  clinicalContext       String?
  doctorNotes           String?

  createdAt       DateTime @default(now())
}

// 食物耐受库
model FoodTolerance {
  id              String   @id @default(uuid())
  foodName        String   @unique
  category        String

  // 耐受等级
  toleranceLevel  String   // safe/caution/avoid/allergen

  // 统计数据
  exposureCount   Int      @default(0)
  triggerCount    Int      @default(0)
  triggerRate     Float    @default(0)

  // 最后反应
  lastReactionDate  String?
  lastReactionType  String?

  notes           String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// 归因分析记录
model AttributionRecord {
  id              String   @id @default(uuid())

  // 症状信息
  symptomType     String   // bloody_stool/abdominal_pain/urgency等
  symptomTime     DateTime
  symptomIntensity Int?

  // 候选食物（JSON）
  candidateFoods  String   // JSON数组

  // 混杂因素
  stressLevel     Int?
  sleepQuality    String?
  medicationAdherence String?

  // AI分析结果
  aiRecommendation String?

  createdAt       DateTime @default(now())
}

// AI推荐记录
model AIRecommendation {
  id              String   @id @default(uuid())
  date            String   // YYYY-MM-DD
  diseasePhase    String   // acute_severe/active_mild/transitioning/maintenance

  // 推荐内容（JSON）
  meals           String   // JSON对象
  nutritionSummary String  // JSON对象
  avoidReminder   String?  // JSON数组
  aiTips          String?  // JSON数组

  // 执行反馈
  executed        Boolean  @default(false)
  feedback        String?

  createdAt       DateTime @default(now())
}

// 复诊报告
model ClinicReport {
  id              String   @id @default(uuid())
  reportDate      String   // YYYY-MM-DD
  periodStart     String
  periodEnd       String
  nextVisitDate   String?

  // 报告内容（JSON）
  symptomSummary  String   // JSON对象
  dietSummary     String   // JSON对象
  medicationSummary String  // JSON对象
  labData         String?  // JSON对象

  // Mayo评分
  partialMayo     Int?
  diseaseActivity String?

  // AI生成内容
  executiveSummary String?
  aiQuestions     String?  // JSON数组
  recommendations String?  // JSON数组

  // 导出状态
  exportedPdf     Boolean  @default(false)

  createdAt       DateTime @default(now())
}

// AI配置（单例）
model AIConfig {
  id              String   @id @default("default")
  apiBaseUrl      String   // API 请求地址
  apiKey          String   // 加密存储的 API Key
  modelName       String   // 模型名称
  maxTokens       Int      @default(4096)
  temperature     Float    @default(0.7)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## 五、UI设计规范

### 5.1 设计风格：iOS 26玻璃质感

#### 核心设计元素

| 元素 | 实现方式 | 说明 |
|------|----------|------|
| **毛玻璃背景** | `backdrop-filter: blur(20px)` | 半透明模糊效果 |
| **半透明卡片** | `bg-white/70` 或 `bg-white/50` | 70%/50%白色透明度 |
| **圆角** | `rounded-2xl` 或 `rounded-3xl` | 16px/24px圆角 |
| **柔和阴影** | `shadow-lg shadow-black/5` | 淡淡的阴影 |
| **渐变背景** | 线性渐变 | 清新色彩渐变 |

#### 色彩方案

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // 主色调：清新蓝绿
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        // 辅助色：柔和紫
        accent: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
        },
        // 背景色：淡雅灰
        glass: {
          bg: 'rgba(255, 255, 255, 0.70)',
          border: 'rgba(255, 255, 255, 0.50)',
          hover: 'rgba(255, 255, 255, 0.85)',
        }
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      backdropBlur: {
        '20': '20px',
        '30': '30px',
      }
    }
  }
}
```

#### 玻璃质感组件示例

```tsx
// components/ui/GlassCard.tsx
import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className = '', hover = true }: GlassCardProps) {
  return (
    <div
      className={`
        bg-white/70
        backdrop-blur-xl
        rounded-3xl
        border border-white/50
        shadow-lg shadow-black/5
        p-6
        ${hover ? 'hover:bg-white/85 hover:shadow-xl transition-all duration-300' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
```

```tsx
// components/ui/GlassButton.tsx
import { ReactNode, ButtonHTMLAttributes } from 'react';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function GlassButton({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '',
  ...props 
}: GlassButtonProps) {
  const baseStyles = 'rounded-2xl font-medium transition-all duration-200 backdrop-blur-sm';
  
  const variants = {
    primary: 'bg-primary-500/80 hover:bg-primary-500 text-white shadow-lg shadow-primary-500/25',
    secondary: 'bg-white/70 hover:bg-white/90 text-gray-700 border border-white/50',
    ghost: 'bg-transparent hover:bg-white/50 text-gray-600',
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

### 5.2 页面布局

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌─────────────────────────────────────────────┐  │
│  │          │  │                                             │  │
│  │  Logo    │  │  📅 2026年5月1日  周四                      │  │
│  │          │  │                                             │  │
│  ├──────────┤  ├─────────────────────────────────────────────┤  │
│  │          │  │                                             │  │
│  │ 🏠 仪表盘 │  │                                             │  │
│  │          │  │                                             │  │
│  │ 📝 记录  │  │            主内容区域                        │  │
│  │  ├ 排便   │  │         (玻璃质感卡片)                      │  │
│  │  ├ 饮食   │  │                                             │  │
│  │  ├ 症状   │  │                                             │  │
│  │  └ 用药   │  │                                             │  │
│  │          │  │                                             │  │
│  │ 📊 分析  │  │                                             │  │
│  │  ├ 归因   │  │                                             │  │
│  │  ├ 推荐   │  │                                             │  │
│  │  └ FC    │  │                                             │  │
│  │          │  │                                             │  │
│  │ 🏥 医疗  │  │                                             │  │
│  │  ├ 疗效   │  │                                             │  │
│  │  └ 报告   │  │                                             │  │
│  │          │  │                                             │  │
│  │ ⚙️ 设置  │  │                                             │  │
│  │          │  │                                             │  │
│  └──────────┘  └─────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 状态栏：今日便次3 | 微量血 | 腹痛2/10 | 🟡轻度活动       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 六、核心模块设计

### 6.1 排便记录模块

#### UI组件

```
┌─────────────────────────────────────────────────────────────┐
│  📝 记录排便                                    ✕ 关闭      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Bristol 大便性状量表                                │   │
│  │                                                     │   │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │   │
│  │  │  1  │ │  2  │ │  3  │ │  4  │ │  5  │ │  6  │  │   │
│  │  │ 🔴  │ │ 🔴  │ │ 🟡  │ │ 🟢  │ │ 🟢  │ │ 🟡  │  │   │
│  │  │硬球 │ │成块 │ │裂痕 │ │光滑 │ │软块 │ │糊状 │  │   │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘  │   │
│  │                                                     │   │
│  │  ┌─────┐                                           │   │
│  │  │  7  │                                           │   │
│  │  │ 🔴  │                                           │   │
│  │  │水样 │                                           │   │
│  │  └─────┘                                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  便血                                                │   │
│  │                                                     │   │
│  │  ○ 无  ○ 微量  ○ 硬币大小  ○ 明显  ○ 大量         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  黏液                                                │   │
│  │                                                     │   │
│  │  ○ 无  ○ 少量  ○ 中等  ○ 大量                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  腹痛                                                │   │
│  │                                                     │   │
│  │  强度：[━━━━━━━━━━━━━━━━━━━━━] 3/10               │   │
│  │                                                     │   │
│  │  部位：○ 左侧  ○ 右侧  ○ 全腹  ○ 直肠            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  急迫感                                              │   │
│  │                                                     │   │
│  │  程度：[━━━━━━━━━━━━━━━━━━━━━] 5/10               │   │
│  │                                                     │   │
│  │  ☐ 突然强烈                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│        ┌─────────────────────────────────┐                 │
│        │          💾 保存记录            │                 │
│        └─────────────────────────────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 仪表盘模块

#### UI组件

```
┌─────────────────────────────────────────────────────────────────┐
│  🏠 仪表盘                                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │ 今日状态            │  │ 预警等级            │              │
│  │                     │  │                     │              │
│  │ 便次：3次           │  │    🟡 黄色          │              │
│  │ Bristol：4型        │  │                     │              │
│  │ 便血：微量          │  │  轻度活动           │              │
│  │ 腹痛：2/10         │  │  加强监测           │              │
│  │                     │  │                     │              │
│  │ 📈 较昨日 ↓        │  │                     │              │
│  └─────────────────────┘  └─────────────────────┘              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  7天趋势                                                │   │
│  │                                                         │   │
│  │  便次  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  3.2次/日   │   │
│  │  便血  ████████████░░░░░░░░░░░░░░░░░░░░░░░░  2/7天      │   │
│  │  腹痛  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  2.5/10     │   │
│  │                                                         │   │
│  │  [图表区域 - 折线图]                                    │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │ 今日用药            │  │ AI建议              │              │
│  │                     │  │                     │              │
│  │ ✅ 美沙拉秦 3g     │  │ • 猪里脊泥减量观察  │              │
│  │ ✅ 栓剂 0.5g       │  │ • 继续低渣饮食      │              │
│  │ ✅ 益生菌          │  │ • 左侧腹痛需关注    │              │
│  │ ✅ 乳果糖 10mL     │  │                     │              │
│  │                     │  │                     │              │
│  └─────────────────────┘  └─────────────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 七、AI集成设计

### 7.1 AI服务架构

```
┌─────────────────────────────────────────────────────────────┐
│                      AI服务层                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │ 本地计算     │    │ API调用     │    │ 缓存层      │    │
│  │             │    │             │    │             │    │
│  │ • Mayo评分  │    │ • 归因分析  │    │ • 推荐结果  │    │
│  │ • 预警判断  │    │ • 饮食推荐  │    │ • 报告缓存  │    │
│  │ • 统计分析  │    │ • 复诊报告  │    │             │    │
│  │             │    │ • FC解读    │    │             │    │
│  └─────────────┘    └──────┬──────┘    └─────────────┘    │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    无需网络            可配置 LLM          本地SQLite
    即时计算            API 调用            持久化存储
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
         DeepSeek      通义千问       其他兼容 API
         (默认)        智谱AI         用户自定义
```

### 7.2 AI配置管理

```typescript
// src/types/ai-config.ts

export interface AIConfig {
  api_base_url: string;     // API 请求地址
  api_key: string;          // API Key
  model_name: string;       // 模型名称
  max_tokens: number;       // 最大输出 Token
  temperature: number;      // 温度参数 (0-2)
}

// 预设的 AI 提供商配置
export const AI_PRESETS: Record<string, Partial<AIConfig>> = {
  deepseek: {
    api_base_url: 'https://api.deepseek.com/v1',
    model_name: 'deepseek-chat',
  },
  qwen: {
    api_base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model_name: 'qwen-turbo',
  },
  zhipu: {
    api_base_url: 'https://open.bigmodel.cn/api/paas/v4',
    model_name: 'glm-4-flash',
  },
  moonshot: {
    api_base_url: 'https://api.moonshot.cn/v1',
    model_name: 'moonshot-v1-8k',
  },
  openai: {
    api_base_url: 'https://api.openai.com/v1',
    model_name: 'gpt-4o-mini',
  },
};
```

### 7.3 AI调用封装

```typescript
// src/services/ai.ts

import { invoke } from '@tauri-apps/api/tauri';
import { AIConfig } from '../types/ai-config';

// AI 配置管理
export class AIConfigManager {
  private static CONFIG_KEY = 'ai_config';

  // 获取当前配置
  static async getConfig(): Promise<AIConfig> {
    return await invoke('get_ai_config');
  }

  // 保存配置
  static async saveConfig(config: AIConfig): Promise<void> {
    await invoke('save_ai_config', { config });
  }

  // 测试连接
  static async testConnection(config: AIConfig): Promise<boolean> {
    return await invoke('test_ai_connection', { config });
  }
}

// AI 服务调用
export class AIService {
  // 归因分析
  static async analyzeAttribution(symptomId: string): Promise<AttributionResult> {
    return await invoke('ai_analyze_attribution', { symptomId });
  }

  // 生成每日饮食推荐
  static async generateMealRecommendation(date: string): Promise<MealRecommendation> {
    return await invoke('ai_generate_meal_recommendation', { date });
  }

  // 生成复诊报告
  static async generateClinicReport(periodDays: number = 30): Promise<string> {
    return await invoke('ai_generate_clinic_report', { periodDays });
  }

  // FC趋势分析
  static async analyzeFCTrend(): Promise<any> {
    return await invoke('ai_analyze_fc_trend');
  }

  // 疗效评估
  static async assessEfficacy(drugName: string): Promise<any> {
    return await invoke('ai_assess_efficacy', { drugName });
  }
}
```

---

## 八、开发环境配置

### 8.1 VSCode扩展推荐

```json
// .vscode/extensions.json
{
  "recommendations": [
    "tauri-apps.tauri-vscode",
    "rust-lang.rust-analyzer",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "prisma.prisma"
  ]
}
```

### 8.2 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器（前端 + Tauri）
npm run tauri dev

# 构建生产版本
npm run tauri build

# 数据库迁移
npx prisma migrate dev

# 生成Prisma客户端
npx prisma generate
```

### 8.3 环境变量

```env
# .env
VITE_AI_API_KEY=your_claude_api_key
VITE_AI_MODEL=claude-3-sonnet-20240229
```

---

## 九、构建与部署

### 9.1 构建产物

```
release/
├── UC Log_1.0.0_x64-setup.exe    # Windows安装包（~10MB）
├── UC Log_1.0.0_x64.msi          # Windows MSI包
└── uc-log.db                      # 示例数据库（可选）
```

### 9.2 安装流程

1. 用户下载安装包（~10MB）
2. 双击安装，自动创建应用目录
3. 首次启动自动创建SQLite数据库
4. 无需额外依赖，开箱即用

---

## 十、总结

### 10.1 技术选型汇总

| 组件 | 选择 | 理由 |
|------|------|------|
| 桌面框架 | Tauri | 轻量、高性能、安全性好 |
| 前端框架 | React + TypeScript | 生态成熟、类型安全 |
| 样式方案 | TailwindCSS | 快速实现玻璃质感UI |
| 数据库 | SQLite | 无需安装、单文件存储 |
| ORM | Prisma | 类型安全、迁移方便 |
| 图表库 | Recharts | React友好、响应式 |
| AI服务 | 可配置 LLM API | 支持 DeepSeek/千问等国内模型，用户可自定义 |

### 10.2 设计亮点

- **iOS 26玻璃质感**：毛玻璃背景、圆角卡片、柔和阴影
- **离线优先**：核心功能完全离线可用
- **轻量级**：安装包仅~10MB，内存占用~30MB
- **类型安全**：全栈TypeScript + Prisma类型推导
- **模块化**：清晰的组件和目录结构

---

**文档结束**

> 📝 本文档为概要设计文档，详细实现请参考各模块设计。
>
> 📅 下一步：与用户共同编写详细设计文档，明确各模块实现细节。
