# GreedySearch

A Claude Code skill that searches Perplexity, Bing Copilot, and Google AI simultaneously and returns clean, synthesized AI answers — not just links.

Treats three AI engines as peer reviewers: where they agree, confidence is high; where they diverge, you see both perspectives.

## Why

Claude's training has a cutoff. For current library APIs, new framework releases, recent breaking changes, dependency selection, or error diagnosis — asking three live AI engines beats guessing from stale training data.

## What you get

- **Parallel AI answers** from Perplexity, Bing Copilot, and Google AI in one shot
- **Automatic triggering** — Claude invokes it without being asked when questions touch post-cutoff topics
- **Auto-launch** — Chrome starts automatically if not running, no manual setup per session
- **Token-efficient** — `--short` flag caps answers at 300 chars; `--out` writes results to disk
- **Source fetching** — `--fetch-top-source` pulls full article content from the best source URL
- **Tab reuse** — existing engine tabs are reused across runs, no unnecessary tab churn
- **Zero dependencies** — no `npm install`, pure Node.js built-ins
- **macOS / Linux / Windows** — detects Chrome path automatically per platform

## Prerequisites

- **Node.js 18+**
- **Google Chrome** (standard install — detected automatically on all platforms)
- **Git** — used by `setup.mjs` to clone [chrome-cdp-skill](https://github.com/pasky/chrome-cdp-skill) if not already present

On non-standard Chrome installs, set `CHROME_PATH`:
```bash
export CHROME_PATH="/path/to/chrome"
```

## Install

```bash
git clone https://github.com/apmantza/GreedySearch
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

# Token-efficient mode (300-char answers, ~3x fewer tokens)
node ~/.claude/skills/greedysearch/search.mjs all --short "react server components"

# Write results to file (keeps raw JSON off Claude's context)
node ~/.claude/skills/greedysearch/search.mjs all --short --out /tmp/gs.json "query"

# Fetch full article content from best source (1500 chars)
node ~/.claude/skills/greedysearch/search.mjs all --short --fetch-top-source "query"

# Single engine
node ~/.claude/skills/greedysearch/search.mjs p "react server components explained"    # Perplexity
node ~/.claude/skills/greedysearch/search.mjs b "fix: cannot read property of undefined" # Bing
node ~/.claude/skills/greedysearch/search.mjs g "best orm for node.js 2025"             # Google AI
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
| `all` | All three | Dependency selection, architecture validation, anything uncertain |

## Flags

| Flag | Description |
|------|-------------|
| `--short` | Truncate answers to 300 chars at word boundary — use by default |
| `--out <file>` | Write JSON to file instead of stdout — keeps context clean |
| `--fetch-top-source` | Fetch 1500 chars of article body from the best source URL |

## Output format

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

## How it works

1. `search.mjs` checks if Chrome is running — launches it automatically if not
2. `launch.mjs` starts a dedicated Chrome on port 9223 with `--disable-features=DevToolsPrivacyUI` — no "Allow remote debugging?" dialogs, isolated profile that never touches your main Chrome session
3. Existing engine tabs are reused from cache; new tabs opened only when needed
4. Extractors run in parallel: each navigates to its engine, submits the query, polls for stream completion, returns clean JSON
5. Consent/cookie banners are dismissed automatically
6. Chrome is controlled via the [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) through **[chrome-cdp-skill](https://github.com/pasky/chrome-cdp-skill)**

## File structure

```
setup.mjs          ← installer — run once
SKILL.md           ← Claude Code skill definition
features.md        ← feature backlog
search.mjs         ← unified CLI: search.mjs <engine> [flags] "<query>"
launch.mjs         ← Chrome launcher / manager (cross-platform)
extractors/
  perplexity.mjs   ← Perplexity AI extractor
  bing-copilot.mjs ← Bing Copilot extractor
  google-ai.mjs    ← Google AI Mode extractor
  consent.mjs      ← shared cookie/consent banner dismissal
```

## License

MIT
