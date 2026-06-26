# AI Wiki 架构设计

## 总体架构

```
┌─────────────┐     HTTP/JSON     ┌──────────────┐     SQL      ┌──────────────┐
│   Browser    │ ◄──────────────► │  FastAPI     │ ◄──────────► │ PostgreSQL   │
│  Next.js 16  │                  │  Backend     │              │  16 + pgvec  │
│  React 19    │                  │  (port 8000) │              │  (port 5432) │
│  (port 3000) │                  │              │              │              │
└─────────────┘                   └──────┬───────┘              └──────────────┘
                                         │
                                         │ httpx (Anthropic 兼容 API)
                                         ▼
                                  ┌──────────────┐
                                  │  LLM Provider │
                                  │  (MiMo / 等)  │
                                  └──────────────┘
```

## 技术选型

| 层 | 技术 | 版本 | 选型理由 |
|---|---|---|---|
| 前端框架 | Next.js | 16.2.9 | App Router、React 19、Turbopack 构建 |
| 前端语言 | TypeScript | 5.x | 类型安全 |
| 样式 | Tailwind CSS | 4.x | 实用优先，快速迭代 |
| 后端框架 | FastAPI | 0.115.0 | 异步、自动 OpenAPI 文档、Pydantic 校验 |
| ORM | SQLAlchemy | 2.0.35 | async session、类型友好 |
| 数据库 | PostgreSQL | 16.3 | 成熟关系型，支持 ARRAY/JSON |
| 向量扩展 | pgvector | pg16 | 预留语义搜索升级（当前未启用） |
| LLM 通信 | httpx | 0.27.0 | 异步 HTTP，调用 Anthropic 兼容 API |

## 前端架构

```
frontend/src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 首页
│   ├── pages/             # 页面列表/详情/编辑/新建
│   ├── search/            # 搜索
│   ├── ask/               # AI 问答
│   ├── compile/           # 知识编译
│   └── layout.tsx         # 根布局（LanguageProvider 包裹）
├── components/
│   ├── ui/                # UI 组件库（Button/Input/Card/Badge/Tag/Loading...）
│   ├── layout/            # Header/Footer
│   └── providers/         # LanguageProvider（i18n Context）
└── lib/
    ├── api.ts             # 统一 API client + ApiError
    ├── i18n.ts            # 中英文文案字典
    └── utils.ts           # 工具函数
```

### 关键设计

- **统一 API client**：所有后端调用走 `ApiClient`，错误封装为结构化 `ApiError`（保留 `status`/`endpoint`/`detail`）
- **i18n Context**：`LanguageProvider` 通过 `useMemo`/`useCallback` 稳定化，避免不必要重渲染；语言存 localStorage
- **客户端组件**：数据交互页面用 `"use client"`，纯展示页可静态生成

## 后端架构

```
backend/app/
├── main.py                 # FastAPI 入口，lifespan 初始化数据库
├── core/
│   ├── config.py          # Pydantic Settings（读 .env）
│   └── database.py        # async engine + session
├── api/
│   ├── pages.py           # 页面 CRUD + slug 生成 + embedding 生成
│   ├── ai.py              # AI 功能（ask/compile/write/summarize）
│   └── search.py          # 语义/关键词/混合搜索
├── models/page.py         # SQLAlchemy 模型
├── schemas/page.py        # Pydantic 请求/响应 schema
└── services/
    └── ai_service.py      # LLM 调用 + embedding + 相似度
```

### 数据模型

| 表 | 用途 |
|---|---|
| `pages` | Wiki 页面（title/slug/content/summary/tags/status） |
| `embeddings` | 页面分块的向量（page_id/chunk_text/embedding） |
| `concepts` | 知识编译提取的概念 |
| `cross_references` | 页面间交叉引用关系 |
| `qa_history` | 问答历史记录 |

## 核心流程

### 1. 创建页面 + 生成摘要/embedding

```
用户提交页面
    │
    ▼
POST /api/pages/
    │
    ├─► create_slug(title)         # 生成 URL slug
    ├─► generate_summary(content)  # LLM 生成摘要
    ├─► 存入 pages 表
    └─► chunk_text + generate_embedding  # 分块 + 生成向量
            │
            └─► 存入 embeddings 表
```

### 2. RAG 问答流程

```
用户提问
    │
    ▼
POST /api/ai/ask
    │
    ├─► generate_embedding(question)        # 问题向量化
    ├─► 加载所有 embeddings
    ├─► cosine_similarity 计算相似度         # 检索 top-K chunks
    ├─► 组装 context（相关 chunk + 来源）
    ├─► call_llm(question, context)         # LLM 基于上下文回答
    └─► 返回 answer + sources + confidence
            │
            └─► 存入 qa_history
```

### 3. 知识编译流程（并发优化）

```
用户提交内容
    │
    ▼
POST /api/ai/compile
    │
    ├─► 先查 existing pages（交叉引用需要）
    │
    └─► asyncio.gather 并发执行：           # Phase 6 优化
            ├─ generate_summary
            ├─ extract_concepts
            ├─ generate_tags
            └─ find_cross_references
                    │
                    ▼
            每个 try/except 降级
                    │
                    ▼
            顺序执行 DB 写入（concept upsert / cross_ref persist）
                    │
                    ▼
            返回 summary + concepts + tags + cross_references
```

**性能改进**：从串行（4 次 LLM 耗时之和）改为并发（≈ 最慢单次耗时）。

### 4. 搜索流程

```
用户搜索
    │
    ▼
POST /api/search/
    │
    ├─ semantic：问题 embedding → 全量 cosine 相似度 → top-K
    ├─ keyword：ILIKE 匹配 title/content/summary
    └─ hybrid：两者结果合并去重，按 score 排序
```

## 部署架构

### 本地开发

```
Browser ──► Next.js dev (3000) ──► FastAPI (8000) ──► PostgreSQL (5432)
```

### Docker Compose

```
Browser ──► frontend 容器 (3000) ──► backend 容器 (8000) ──► db 容器 (5432)
                                                                  │
                                                          宿主映射 5433:5432
                                                          （避免本机 5432 冲突）
```

## 已知限制与演进方向

| 当前状态 | 演进方向 |
|---|---|
| hash-based 演示 embedding | 真实 embedding 模型 + pgvector 索引 |
| 全量 Python 相似度计算 | pgvector 向量索引 + SQL 检索 |
| `create_all` 建表 | Alembic 迁移 |
| 同步 compile（等 LLM 完成） | 后台任务 + SSE 进度推送 |
| 单用户 | 认证 + 多用户知识库隔离 |
| 最小测试闭环 | 完整 API 集成测试 + CI/CD |
