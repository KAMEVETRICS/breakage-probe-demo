<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Breakage Probe

Hackathon project for IBM Bob 2.0. The product is a parallel-agent workflow that probes a small Next.js demo app for functional breakages, then shows the findings on the dashboard.

## Important paths

- Dashboard: `src/app/page.tsx`
- Demo storefront: `src/app/demo/page.tsx`
- Planted bugs: `src/app/api/cart/total/route.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/search/route.ts`
- Mechanical parallel runner: `probes/run-all.mjs`
- Report file: `reports/breakage-latest.json`
- Bob skill: `skills/breakage-probe/SKILL.md`

## Default workflow

1. `npm run dev`
2. Follow `skills/breakage-probe/SKILL.md`
3. Launch Cart, Auth, and Search probes as parallel subagents
4. Or run `npm run probe` while the app is up
5. Refresh `/` to read the report

## Security

Never read or print `.env` values. Keep IBM Cloud keys out of prompts and commits.
