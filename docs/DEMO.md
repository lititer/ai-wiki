# AI Wiki 面试演示脚本

> 5 分钟演示流程，覆盖项目核心能力与工程化亮点。

## 准备（演示前 2 分钟）

启动服务：

```bash
# 方式一：Docker Compose 一键启动
cd "D:/ai-wiki"
cp .env.example .env   # 填入真实 LLM_API_KEY
docker compose up --build

# 方式二：本地分别启动
cd "D:/ai-wiki/backend"
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

cd "D:/ai-wiki/frontend"
npm run dev
```

确认可访问：

- 前端：http://localhost:3000
- 后端：http://localhost:8000/health → `{"status":"healthy"}`
- API 文档：http://localhost:8000/docs

## 演示流程（5 分钟）

### 1. 项目定位（30 秒）

> "这是一个基于 AI 的智能知识库，灵感来自 Karpathy 的 LLM Wiki 理念——知识应该被编译一次并保持最新，而不是每次查询重新派生。"

技术栈：Next.js 16 + React 19 + FastAPI + PostgreSQL，支持中英文双语。

### 2. 创建 Wiki 页面（1 分钟）

- 访问 http://localhost:3000
- 点击「创建第一个页面」
- 输入标题和 Markdown 内容
- 提交后自动跳转详情页，展示：
  - AI 自动生成的摘要
  - Markdown 渲染
  - 标签

**讲解点**：创建时会自动调用 LLM 生成摘要，并生成 embedding 存入数据库用于后续语义搜索。

### 3. 语义搜索（1 分钟）

- 进入「搜索」页
- 输入与页面内容相关但用词不同的查询（如页面讲 FastAPI，搜 "Python web 框架"）
- 展示三种搜索模式：语义 / 关键词 / 混合
- 点击搜索结果跳转详情页

**讲解点**：语义搜索基于 embedding 向量相似度，即使用词不同也能匹配。

### 4. AI 问答 RAG（1 分钟）

- 进入「AI 问答」页
- 提问，如 "这个知识库包含哪些主题？"
- 展示 AI 回答 + 来源引用 + 置信度

**讲解点**：这是 RAG 流程——问题先 embedding，检索相关 chunk，再交给 LLM 基于上下文回答，附来源引用。

### 5. 知识编译（1 分钟）

- 进入「知识编译」页
- 粘贴一段较长文本
- 点击「编译知识」
- 展示结果：摘要、提取的概念、交叉引用、建议标签

**讲解点**：4 个 AI 任务（摘要/概念/标签/交叉引用）通过 `asyncio.gather` 并发执行，性能优化从串行改为并发。

### 6. 工程化亮点（30 秒）

```bash
# 展示测试全绿
cd "D:/ai-wiki/backend" && python -m pytest      # 7 passed
cd "D:/ai-wiki/frontend" && npm run lint         # 0 error
cd "D:/ai-wiki/frontend" && npm run test:e2e     # 3 passed
```

**讲解点**：
- 前后端分离，统一 API client + 结构化 ApiError
- Docker Compose 一键启动
- Playwright E2E + pytest 单元测试
- 中英文 i18n 完整覆盖
- 密钥安全脱敏

## 常见提问应对

### Q：embedding 是怎么做的？
> 当前是演示版的 hash-based 向量，用于跑通语义搜索流程。生产会接入真实 embedding 模型 + pgvector 向量索引，这是已知限制，写在 README 里。

### Q：为什么知识编译要并发？
> 4 个 LLM 调用互相独立，串行执行总耗时是 4 次之和，并发后约等于最慢的那次。用 `asyncio.gather` 实现，每个任务 try/except 降级，单个失败不影响整体。

### Q：数据库怎么设计的？
> 5 张表：pages、embeddings、concepts、cross_references、qa_history。支持页面 CRUD、向量存储、概念抽取、交叉引用、问答历史。当前用 `create_all` 建表，后续规划接入 Alembic 迁移。

### Q：前后端怎么通信？
> 前端统一 API client（`api.ts`），结构化 `ApiError` 保留 status/detail。集合端点统一尾斜杠避免 307。CORS 在 FastAPI 配置。

### Q：如何扩展到多用户？
> 当前是单用户演示。多用户需加认证层（JWT/Session）、用户表、知识库归属字段、行级权限。已在后续规划中。
