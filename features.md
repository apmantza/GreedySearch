# GreedySearch — Feature Backlog

Prioritized by impact. Items marked ✓ are shipped.

---

## 1. macOS / Linux support ← IN PROGRESS
`launch.mjs` hardcodes a Windows Chrome path and a Windows-only `DevToolsActivePort` location.
Anyone on macOS or Linux cannot use the skill at all.
**Fix:** detect platform, try standard Chrome paths per OS, use platform-correct system port path.

## 2. Auto-launch Chrome on failure ← IN PROGRESS
If Chrome isn't running, the extractor throws a cryptic WebSocket error and Claude gives up.
Every session starts with uncertainty about whether Chrome is up.
**Fix:** `search.mjs` catches the connection error, auto-runs `launch.mjs`, retries once.

---

## 3. Fix Stack Overflow extractor
SO is disabled (`stackoverflow-ai.mjs` times out in `all` mode and standalone).
It's the highest-signal source for coding questions — real developer answers, not AI summaries.
**Fix:** proper debug session; the submit works manually, the issue is in the polling or timing.

## 4. `--out <file>` flag — write results to disk ← IN PROGRESS
Multi-search sessions accumulate raw JSON in context and it stays there.
A `--out` flag writes results to a temp file; Claude reads it once and the raw data doesn't compound.
**Fix:** add `--out <path>` to `search.mjs`; write JSON to file instead of stdout when set.

## 5. Source fetching layer ← IN PROGRESS
GreedySearch surfaces the tip of the iceberg. Sources array has URLs to real articles.
A `--fetch-top-source` flag could fetch the first source from the best answer via CDP.
**Fix:** after extraction, pick the top source URL, nav a tab to it, extract body text.

## 6. Query decomposition — research mode
Complex topics need 2-3 angles, not one query.
A `research` mode decomposes a topic into sub-queries, runs them, returns merged results.
**Fix:** new `research` engine alias in `search.mjs`; LLM-decompose or use heuristic splits.

---

## Done ✓

- [x] Parallel multi-engine search (Perplexity, Bing Copilot, Google AI)
- [x] `--short` flag — 300-char truncation for token efficiency
- [x] Tab reuse — open engine tabs reused across runs
- [x] Auto-dismiss cookie/consent banners
- [x] Dedicated Chrome instance — no "Allow remote debugging?" dialogs
- [x] Claude Code skill with trigger conditions + engine routing table
- [x] `setup.mjs` installer with chrome-cdp auto-clone
- [x] `CLAUDE.md` injection — Claude prefers GreedySearch over built-in WebSearch
