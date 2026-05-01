# UC Log - 溃疡性结肠炎 AI 管理系统

一款专为溃疡性结肠炎（UC）患者设计的智能健康管理桌面应用，结合本地统计分析与 LLM 深度分析，帮助患者追踪饮食、症状、用药，并生成复诊报告。

> **本项目由 AI（Claude）编写**，涵盖前端 React + TypeScript、后端 Rust + Tauri、SQLite 数据库及 AI 对接的全部代码。

## 功能特性

### 饮食记录
- 按餐次（早餐/午餐/晚餐/加餐）记录食物，支持精确到分钟的时间选择
- 内置食物库，一键快速添加常用食物
- 记录烹饪方式、份量（克）、是否新食物、过敏标记

### 排便记录
- Bristol 便型分类（1-7 型）
- 记录颜色、稠度、体积、紧急程度
- 便血/黏液标记及详细描述

### 症状记录
- 腹痛、腹胀、里急后重等症状评分
- 疲劳程度、整体健康感评估
- 关节痛、皮疹等肠外表现记录

### 用药管理
- 记录每次用药及服药情况
- 用药计划管理，支持快速打卡
- 用药依从性统计

### 粪便钙卫蛋白（FC）追踪
- 记录 FC 检测结果及趋势
- 参考值自动评估（缓解/轻度/中重度/重度）

### AI 智能分析

#### 本地统计分析
- 基于历史数据的食物-症状关联分析
- 贝叶斯推理算法计算触发食物概率
- 安全食物/疑似触发食物识别

#### LLM 深度分析
- **归因分析**：AI 分析近 3 天饮食与症状，找出可能的触发食物
- **饮食推荐**：基于当前症状状态生成个性化四餐推荐
- 支持 OpenAI 兼容 API（DeepSeek、OpenAI、Claude 等）

### 复诊报告
- 基于 30 天数据自动生成结构化复诊摘要
- 包含排便趋势图、症状趋势图、用药依从性图表
- AI 生成建议问医生的问题
- 报告历史记录，支持查看和删除
- 支持打印

### 数据管理
- 数据导出（JSON / CSV）
- 个人档案管理
- 示例数据一键填充

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Tauri v2 + React 19 |
| 语言 | TypeScript + Rust |
| 样式 | Tailwind CSS v4 |
| 图表 | Recharts |
| 数据库 | SQLite（rusqlite） |
| AI | OpenAI 兼容 API |
| 状态管理 | React Hooks |

## 安装与运行

### 环境要求
- Node.js >= 18
- Rust + Cargo（[安装指南](https://rustup.rs/)）

### 开发模式

```bash
# 安装依赖
npm install

# 启动开发服务器
npx tauri dev
```

### 构建安装包

```bash
npx tauri build
```

构建完成后，安装包位于 `src-tauri/target/release/bundle/` 目录下：
- `msi/` — Windows MSI 安装包
- `nsis/` — Windows NSIS 安装程序

### 配置 AI 服务

1. 打开应用，进入「设置」页面
2. 填写 AI 服务配置：
   - **API 地址**：如 `https://api.deepseek.com`（需兼容 OpenAI 格式）
   - **API Key**：你的 API 密钥
   - **模型名称**：如 `deepseek-chat`
3. 点击「测试连接」验证配置

## 项目结构

```
uc-log-app/
├── src/                    # 前端源码
│   ├── pages/              # 页面组件
│   │   ├── AnalysisPage    # AI 分析（本地 + LLM）
│   │   ├── ReportPage      # 复诊报告
│   │   ├── DietRecordPage  # 饮食记录
│   │   ├── StoolPage       # 排便记录
│   │   ├── SymptomPage     # 症状记录
│   │   ├── MedicationPage  # 用药管理
│   │   ├── FCPage          # 粪便钙卫蛋白
│   │   └── SettingsPage    # 设置
│   ├── services/           # AI 服务封装
│   ├── components/         # 通用组件
│   └── App.tsx             # 路由入口
├── src-tauri/              # Rust 后端
│   ├── src/
│   │   ├── commands/       # Tauri 命令（CRUD）
│   │   ├── db.rs           # 数据库初始化
│   │   └── lib.rs          # 应用入口
│   └── Cargo.toml
└── package.json
```

## 免责声明

本应用仅供健康管理参考，不构成医疗建议。诊断和治疗请遵循专业医生指导。

## License

MIT
