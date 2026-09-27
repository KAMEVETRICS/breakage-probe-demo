# Bob task session summaries

The hackathon asks for each team member's IBM Bob task session summary in the public repository.

- `bob-task-72bbcbb14c1c793a9c93771f5a5ea9a0-2026-09-26.md`: the exported task history. Bob loaded `probe/skills/breakage-probe/SKILL.md`, ran the Cart, Auth, and Search probes as three parallel subagents, and named the route file behind each failure.
- `task 1.png`, `task 2.png`, `task 3.png`: screenshots of that task session.

In that run Bob's cart probe sent a bare JSON array, because the skill described the body that way, so it reported a total of 0. The route reads `{ items: [...] }`. The skill now gives that body, and the runner sends it; with it, the unfixed cart route returns 25 instead of 35.
