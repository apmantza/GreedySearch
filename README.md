# GreedySearch

A Claude Code skill that searches Perplexity, Bing Copilot, and Google AI simultaneously and returns clean, synthesized AI answers — not just links. Gemini acts as an optional synthesizer via `--synthesize`.

Treats three AI engines as peer reviewers: where they agree, confidence is high; where they diverge, you see both perspectives.

## Why

Claude's training has a cutoff. For current library APIs, new framework releases, recent breaking changes, dependency selection, or error diagnosis — asking three live AI engines beats guessing from stale training data.

## What you get

- **Parallel AI answers** from Perplexity, Bing Copilot, and Google AI in one shot, with optional Gemini synthesis
- **Automatic triggering** — Claude invokes it without being asked when questions touch post-cutoff topics
- **Auto-launch** — Chrome starts automatically if not running, no manual setup per session
- **Gemini synthesis** — `--synthesize` deduplicates sources across all engines and feeds them to Gemini for a single grounded answer
- **Deep research** — `--deep-research` fetches full article content from top sources before synthesis
- **Source fetching** — `--fetch-top-source` pulls full article content from the best source URL
- **Fresh isolated tabs** — each search gets a clean browser tab, preventing SPA navigation bugs and stale DOM state
- **Regex-based citation extraction** — sources are parsed from clipboard Markdown (`[title](url)` links), not fragile DOM selectors
- **Resilient verification handling** — auto-dismisses Cloudflare, Microsoft, and generic human-verification modals
- **Zero dependencies** — no `npm install`, pure Node.js built-ins, `cdp.mjs` is bundled natively
- **macOS / Linux / Windows** — detects Chrome path automatically per platform

## Prerequisites

- **Node.js 18+**
- **Google Chrome** (standard install — detected automatically on all platforms)

On non-standard Chrome installs, set `CHROME_PATH`:

```bash
export CHROME_PATH="/path/to/chrome"
```

## Install

```bash
git clone https://github.com/apmantza/GreedySearch-claude
cd GreedySearch
node setup.mjs
```

Then **restart your Claude Code session** to pick up the skill and CLAUDE.md changes.

Verify:

```bash
node setup.mjs --check
```

## Usage

### Search

Chrome launches automatically on first use. No manual setup needed.

```bash
# All engines in parallel (recommended)
node ~/.claude/skills/greedysearch/search.mjs all "what changed in Next.js 15"

# All engines + Gemini synthesis of deduplicated sources
node ~/.claude/skills/greedysearch/search.mjs all --synthesize "react server components"

# Deep Research option (fetches full article content for all top sources before synthesis)
node ~/.claude/skills/greedysearch/search.mjs all --deep-research "auth patterns 2026"

# Write results to file (keeps raw JSON off Claude's context)
node ~/.claude/skills/greedysearch/search.mjs all --out /tmp/gs.json "query"

# Fetch full article content from best source (1500 chars)
node ~/.claude/skills/greedysearch/search.mjs all --fetch-top-source "query"

# Single engine
node ~/.claude/skills/greedysearch/search.mjs p "react server components explained"    # Perplexity
node ~/.claude/skills/greedysearch/search.mjs b "fix: cannot read property of undefined" # Bing
node ~/.claude/skills/greedysearch/search.mjs g "best orm for node.js 2025"             # Google AI
node ~/.claude/skills/greedysearch/search.mjs gem "explain transformer attention mechanism" # Gemini
```

### Coding Tasks & Code Review

Delegate coding tasks to Gemini and Copilot for parallel "second opinions". Supported modes: `code`, `review`, `plan`, `test`, `debug`.

```bash
# Get a second opinion on a refactoring plan
node ~/.claude/skills/greedysearch/coding-task.mjs "Refactor this component" --engine all --mode plan

# Deep root-cause debug analysis
node ~/.claude/skills/greedysearch/coding-task.mjs "Find the root cause of this error" --engine gemini --mode debug
```

### Chrome management (optional — auto-handled)

```bash
node ~/.claude/skills/greedysearch/launch.mjs           # start manually
node ~/.claude/skills/greedysearch/launch.mjs --status  # check
node ~/.claude/skills/greedysearch/launch.mjs --kill    # stop + restore your main Chrome's CDP
```

### Let Claude use it automatically

After install, Claude invokes GreedySearch without being asked when:

- You ask about a library, framework, or API (especially version-specific)
- You paste an error message or stack trace
- You ask "best way to do X", "is X still recommended", "what changed in X"
- You're picking between dependencies or tools
- Anything where training data is likely stale (post-2024)

## Engines

| Alias | Engine | Best for |
|-------|--------|----------|
| `p` | Perplexity | Breaking changes, release notes, research with citations, CVEs |
| `b` | Bing Copilot | Error diagnosis, "how to implement X", code examples |
| `g` | Google AI | "What is X", official docs, API references, canonical sources |
| `gem` | Gemini | Deep technical explanations, synthesis of multiple sources |
| `all` | All three | Dependency selection, architecture validation, anything uncertain |

## Flags

| Flag | Description |
|------|-------------|
| `--synthesize` | Deduplicate sources across engines, feed to Gemini for a single grounded answer |
| `--deep-research` | Fetches full article content from top sources, then runs `--synthesize` |
| `--out <file>` | Write JSON to file instead of stdout — keeps context clean |
| `--fetch-top-source` | Fetch content of article body from the best source URL |

## Output format

Standard output (Perplexity, Bing, Google):

```json
{
  "perplexity": {
    "query": "what is memoization",
    "answer": "Memoization is...",
    "sources": [{ "url": "...", "title": "..." }]
  },
  "bing": { "answer": "...", "sources": [] },
  "google": { "answer": "...", "sources": [...] },
  "_topSource": { "url": "...", "content": "full article text..." }
}
```

With `--synthesize`, two additional fields are added:

```json
{
  "perplexity": { "answer": "...", "sources": [...] },
  "bing": { "answer": "...", "sources": [] },
  "google": { "answer": "...", "sources": [...] },
  "_sources": [
    { "url": "...", "title": "...", "engineCount": 2, "sourceType": "official-docs" }
  ],
  "_synthesis": {
    "answer": "Gemini's single grounded answer...",
    "agreement": { "level": "high", "summary": "..." },
    "claims": [{ "claim": "...", "support": "strong", "sourceIds": ["S1"] }],
    "recommendedSources": ["S1", "S2"]
  }
}
```

`_sources` is ranked by consensus (how many engines cited the same URL) then by source type (official-docs > repo > maintainer-blog > website > community). `_synthesis` includes agreement level, source-linked claims, and recommended reads.

## How it works

1. `search.mjs` checks if Chrome is running — launches it automatically if not
2. `launch.mjs` starts a dedicated Chrome on port 9222 with an isolated profile — no "Allow remote debugging?" dialogs, never touches your main Chrome session
3. A **fresh browser tab** is created for each engine on every search, preventing SPA navigation failures and stale DOM state from prior queries
4. Extractors run in parallel: each navigates to its engine, submits the query, polls for stream completion, then copies the answer via a clipboard interceptor; **sources are extracted by regex-parsing Markdown links** (`[title](url)`) from the clipboard text rather than fragile DOM selectors
5. Consent/verification banners (cookie notices, Cloudflare Turnstile, Microsoft "Verify you're human") are detected and dismissed automatically; tabs are closed when done
6. When `--synthesize` is set, sources are deduplicated by consensus across engines and sent to Gemini for a final grounded synthesis
7. Chrome is controlled via the [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) through the bundled `cdp.mjs` script

## File structure

```text
setup.mjs          ← installer — run once
SKILL.md           ← Claude Code skill definition
search.mjs         ← unified CLI: search.mjs <engine> [flags] "<query>"
launch.mjs         ← Chrome launcher / manager (cross-platform)
extractors/
  perplexity.mjs   ← Perplexity AI extractor
  bing-copilot.mjs ← Bing Copilot extractor
  google-ai.mjs    ← Google AI Mode extractor
  gemini.mjs       ← Gemini extractor / synthesizer
  consent.mjs      ← shared cookie/consent/verification dismissal
  selectors.mjs    ← CSS selector registry (one place to update on UI changes)
cdp.mjs            ← Chrome DevTools Protocol CLI for browser automation
coding-task.mjs    ← multi-engine coding assistant
```

## License

MIT
