# Breakage Probe

A sample storefront with three functional bugs, and a dashboard that checks those paths in parallel.

The cart route adds each price once and ignores quantity, so two items at $10 and one at $15 come back as $25 instead of $35. The login route accepts any prefix of the sample password `shipit-now`, so `ship` signs in. The search route reads `category` and then discards it, so `category=kitchen` returns all four products.

The dashboard runs those three checks together and lists each failure with the request, the expected value, and the actual value. Check a fix, run the probes again, and the lane that changed goes green or returns to red. IBM Bob can launch the same three probes as parallel subagents. The skill for that is `probe/skills/breakage-probe/SKILL.md`.

## Run locally

```bash
cd probe
npm.cmd install
npm.cmd run dev
```

- Dashboard: http://127.0.0.1:3000
- Storefront: http://127.0.0.1:3000/demo

Press **Run parallel probes** on the dashboard. From another terminal, `npm.cmd run probe` writes the same result to `probe/reports/breakage-latest.json`.

## Host the demo on Vercel

The Next.js app is the `probe` folder. In the Vercel project, set the root directory to `probe`. No environment variables are required. The dashboard button runs the three checks against that deployment.
