# Breakage Probe

Use this skill when the user asks to probe, rehearse, or find functional breakages in this app.

## Goal

Run three focused probes in parallel against the local demo app, write `reports/breakage-latest.json`, and summarize the breakages with repro steps. Prefer Bob Agent mode with parallel subagents.

## Parallel agents

Launch these subagents together. Do not run them one after another unless parallel execution is unavailable.

1. **Cart Probe**
   - Hit `POST /api/cart/total` with `[{price:10,qty:2},{price:15,qty:1}]`
   - Expect total `35`
   - If wrong, explain the bug and point at `src/app/api/cart/total/route.ts`

2. **Auth Probe**
   - Hit `POST /api/auth/login` with `buyer@demo.test` / `ship`
   - Expect rejection
   - If accepted, explain the prefix bug in `src/app/api/auth/login/route.ts`

3. **Search Probe**
   - Hit `GET /api/search?q=&category=kitchen`
   - Expect only kitchen items (2 results)
   - If gear items appear, explain the ignored filter in `src/app/api/search/route.ts`

## Mechanical runner

If the Next.js app is already on `http://127.0.0.1:3000`, the dashboard button **Run parallel probes** calls the same runner. You may also run:

```bash
npm.cmd run probe
```

That script uses `Promise.all` for the same three probes and overwrites `reports/breakage-latest.json`.

## Report shape

Keep the existing JSON schema in `reports/breakage-latest.json`. Set `source` to `bob-parallel-subagents` when Bob produced the report, or leave the script source when the mechanical runner did.

## After findings

1. Summarize failed agents first.
2. Offer fixes for each planted bug.
3. Re-run probes after fixes.
4. Remind the human to export Bob task session summary screenshots into `../bob_sessions/` for the hackathon submission.
