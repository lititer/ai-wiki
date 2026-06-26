# AI Wiki 项目进度文档

> 最后更新：2026-06-24
> 状态：✅ 项目完成并可运行

---

## 📋 项目概述

**AI Wiki** 是一个基于 AI 的智能知识库系统，灵感来自 Karpathy 的 LLM Wiki 理念。

### 核心理念
> 知识应该被"编译"一次，然后保持最新，而不是每次查询时重新派生。

### 四大 AI 功能
1. **智能问答（RAG）** — 基于 wiki 内容的问答，附带引用来源
2. **知识自动编译** — 上传文档，AI 自动提取概念、生成摘要、建立交叉引用
3. **语义搜索** — 用 Embedding 替代关键词搜索
4. **写作助手** — 编辑时 AI 帮忙润色、续写、纠错、生成大纲

---

## 🛠️ 技术栈

| 层 | 技术 | 说明 |
|---|------|------|
| **前端** | Next.js 16 + React 19 + TypeScript + Tailwind CSS | 最主流前端框架 |
| **后端** | Python FastAPI | AI 生态最强 |
| **数据库** | PostgreSQL 16.3 | 结构化数据存储 |
| **AI** | 小米 MiMo API (mimo-v2.5-pro) | LLM 服务 |
| **UI 设计** | Impeccable + UI UX Pro Max 理念 | 专业前端设计 |

---

## ✅ 已完成的工作

### 1. 后端 API
- `app/api/pages.py` — 页面 CRUD API
- `app/api/ai.py` — AI 功能 API
- `app/api/search.py` — 搜索 API
- `app/services/ai_service.py` — AI 服务核心逻辑

### 2. 前端页面
- 首页：`src/app/page.tsx`
- 页面列表：`src/app/pages/page.tsx`
- 页面详情：`src/app/pages/[slug]/page.tsx`
- 页面编辑：`src/app/pages/[slug]/edit/page.tsx`
- 新建页面：`src/app/pages/new/page.tsx`
- 搜索：`src/app/search/page.tsx`
- AI 问答：`src/app/ask/page.tsx`
- 知识编译：`src/app/compile/page.tsx`

### 3. UI 组件库
- Button, Input, Textarea, Card, Badge, Tag, EmptyState, Loading

### 4. 国际化
- 中英文切换功能（默认中文）
- 切换按钮在导航栏右上角

### 5. 设计改进
- 参考 Impeccable 理念：避免紫色渐变、使用系统字体
- 参考 UI UX Pro Max 理念：AI-Native UI 风格

---

## 🚀 运行方式

```bash
# 后端
cd D:\ai-wiki\backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 前端
cd D:\ai-wiki\frontend
npm run dev
```

## 🌐 访问地址
- 前端：http://localhost:3000
- 后端 API：http://localhost:8000
- API 文档：http://localhost:8000/docs

---

## 🔑 环境变量配置

`backend/.env` 文件：
```env
DATABASE_URL=postgresql://aiwiki:aiwiki123@localhost:5432/aiwiki
LLM_API_BASE=https://token-plan-cn.xiaomimimo.com/anthropic
LLM_API_KEY=your_llm_api_key_here
LLM_MODEL=mimo-v2.5-pro
```

---

## 🎯 面试展示要点

1. **架构设计** — 前后端分离 + 微服务
2. **AI 能力** — RAG、语义搜索、知识编译、写作助手
3. **工程实践** — 数据库设计、API 设计、国际化
4. **产品思维** — 完整的用户体验、专业的 UI 设计
5. **技术深度** — LLM 集成、知识图谱、中英文双语支持
