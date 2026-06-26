# AI Wiki Frontend

Next.js 16 + React 19 frontend for the AI Wiki intelligent knowledge base.

## Requirements

- Node.js >= 20.9.0
- npm 11+
- Backend API running at `http://127.0.0.1:8000`

## Environment

Create a local environment file when the backend URL differs from the default:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Do not put secrets in `NEXT_PUBLIC_*` variables. They are exposed to the browser bundle.

## Development

```bash
cd "D:/ai-wiki/frontend"
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Use `localhost`, not `127.0.0.1`, for the Next.js dev server unless `allowedDevOrigins` is configured.

## Quality Checks

```bash
npm run lint
npm run build
```

## Main Routes

- `/` — homepage
- `/pages` — wiki page list
- `/pages/new` — create page
- `/pages/[slug]` — page detail
- `/search` — semantic/keyword/hybrid search
- `/ask` — AI Q&A
- `/compile` — knowledge compilation
