# AI Wiki 面试演示脚本

> 5 分钟演示流程，核心主线：**这是一个「动态知识库」，不是静态仓库**。

## 核心卖点（开场 30 秒必讲）

> "传统知识库只是把笔记存起来，写完就死了。AI Wiki 不一样——它是**动态的**：
> - 知识会**自动生长**：每加一条，AI 自动发现交叉引用，长成关联网络
> - 知识会被**实时编译**：自动产出摘要/概念/标签，比原始内容更易用
> - 问答是**动态推导**：RAG 实时生成答案 + 来源，问法千变万化都能答
> - 搜索是**动态语义**：换词也能找到，不死匹配关键词
>
> 一句话：它是越用越聪明、越写越互联的活知识库。"

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

> "这是一个基于 AI 的动态知识库，灵感来自 Karpathy 的 LLM Wiki 理念——知识应该被编译一次并保持最新。"

技术栈：Next.js 16 + React 19 + FastAPI + PostgreSQL，支持中英文双语。

### 2. 创建 Wiki 页面（1 分钟）—— 展示「实时编译」

- 访问 http://localhost:3000
- 点击「创建第一个页面」
- 输入标题和 Markdown 内容
- 提交后自动跳转详情页，展示：
  - AI **自动生成的摘要**（实时编译）
  - Markdown 渲染
  - 标签

**讲解点（动态加工）**：创建时 AI 实时把原始内容编译成摘要 + embedding，知识一进来就被加工成更易用的资产，不是存完就完。

### 3. 语义搜索（1 分钟）—— 展示「动态检索」

- 进入「搜索」页
- 输入与页面内容相关但**用词不同**的查询（如页面讲 FastAPI，搜 "Python web 框架"）
- 展示三种搜索模式：语义 / 关键词 / 混合
- 点击搜索结果跳转详情页

**讲解点（动态语义）**：语义搜索理解意图，换词也能找到——传统关键词匹配做不到。

### 4. AI 问答 RAG（1 分钟）—— 展示「动态应答」

- 进入「AI 问答」页
- 提问，如 "这个知识库包含哪些主题？"
- 展示 AI 回答 + 来源引用 + 置信度

**讲解点（动态推导）**：RAG 实时检索相关 chunk + 实时生成答案，不是预写的固定 FAQ，问法千变万化都能答。

### 5. 知识编译（1 分钟）—— 展示「自动生长」

- 进入「知识编译」页
- 粘贴一段较长文本
- 点击「编译知识」
- 展示结果：摘要、提取的概念、**交叉引用**、建议标签

**讲解点（自动生长）**：重点看交叉引用——AI 自动发现新内容和已有页面的关联，知识库越写越互联，自动长成网络而不是孤岛。

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
- 知识编译 4 个 LLM 调用 `asyncio.gather` 并发优化
- 密钥安全脱敏

## 常见提问应对

### Q：和 Notion / Obsidian 有什么区别？
> Notion/Obsidian 是静态存储——你写完，它帮你存和整理，但知识之间不自动关联，问答靠你自己翻。AI Wiki 是动态的：知识进来就被 AI 编译（摘要/概念/交叉引用），自动长成关联网络；问答是 RAG 实时推导，搜索是语义级的。它不只是存，而是让知识"活"起来。

### Q：「动态」具体体现在哪？
> 四个层面：① 自动生长——交叉引用让知识成网络；② 实时编译——摘要/概念/标签动态产出；③ 动态应答——RAG 实时生成答案；④ 动态检索——语义搜索换词也能找到。

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
