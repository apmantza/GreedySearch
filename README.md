# GreedySearch

A Claude Code skill that searches Perplexity, Bing Copilot, and Google AI simultaneously and returns clean, synthesized AI answers — not just links.

Treats three AI engines as peer reviewers: where they agree, confidence is high; where they diverge, you see both perspectives.

## Why

Claude's training has a cutoff. For current library APIs, new framework releases, recent breaking changes, dependency selection, or error diagnosis — asking three live AI engines beats guessing from stale training data.

## What you get

- **Parallel AI answers** from Perplexity, Bing Copilot, and Google AI in one shot
- **Clean JSON output** — `{ answer, sources }` per engine, ready to synthesize
- **Automatic triggering** — Claude invokes it without being asked when questions touch post-cutoff topics
- **Zero manual tab work** — fully automated via Chrome CDP, no clicking required

## Prerequisites

- **Node.js 18+** — uses only built-in modules, no `npm install` needed
- **Google Chrome** (standard install)
- **Git** — used by `setup.mjs` to clone [chrome-cdp-skill](https://github.com/pasky/chrome-cdp-skill) if not already present

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

### Start Chrome (once per session)

```bash
node ~/.claude/skills/greedysearch/launch.mjs
```

This starts a dedicated Chrome instance on port 9223 with remote debugging enabled and no "Allow remote debugging?" dialogs.

### Search manually

```bash
# All engines in parallel (recommended)
node ~/.claude/skills/greedysearch/search.mjs all "what changed in Next.js 15"

# Single engine
node ~/.claude/skills/greedysearch/search.mjs p "react server components explained"   # Perplexity
node ~/.claude/skills/greedysearch/search.mjs b "fix: cannot read property of undefined" # Bing
node ~/.claude/skills/greedysearch/search.mjs g "best orm for node.js 2025"            # Google AI
```

### Let Claude use it automatically

After install, Claude will invoke GreedySearch automatically when:

- You ask about a library, framework, or API (especially version-specific)
- You paste an error message or stack trace
- You ask "best way to do X", "is X still recommended", "what changed in X"
- You're picking between dependencies or tools
- Anything where training data is likely stale

### Stop Chrome

```bash
node ~/.claude/skills/greedysearch/launch.mjs --kill
```

## Engines

| Alias | Engine | Best for |
|-------|--------|----------|
| `p` | Perplexity | Breaking changes, release notes, research with citations, CVEs |
| `b` | Bing Copilot | Error diagnosis, "how to implement X", code examples |
| `g` | Google AI | "What is X", official docs, API references, canonical sources |
| `all` | All three | Dependency selection, architecture validation, anything uncertain |

## Output format

```json
{
  "perplexity": {
    "query": "what is memoization",
    "answer": "Memoization is...",
    "sources": [{ "url": "...", "title": "..." }]
  },
  "bing": { "answer": "...", "sources": [] },
  "google": { "answer": "...", "sources": [...] }
}
```

## How it works

1. `launch.mjs` starts a dedicated Chrome instance with `--disable-features=DevToolsPrivacyUI` — no permission dialogs, separate profile so it never touches your main Chrome session
2. `search.mjs` opens one tab per engine, runs all extractors in parallel
3. Each extractor navigates to the engine, submits the query, polls for stream completion, and returns the answer as JSON
4. Chrome is controlled via the [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/) through **[chrome-cdp-skill](https://github.com/pasky/chrome-cdp-skill)** — a reusable CDP toolkit for Claude Code skills, also installed automatically by `setup.mjs`

## File structure

```
setup.mjs          ← installer — run once
SKILL.md           ← Claude Code skill definition
search.mjs         ← unified CLI: search.mjs <engine> "<query>"
launch.mjs         ← Chrome launcher / manager
extractors/
  perplexity.mjs   ← Perplexity AI extractor
  bing-copilot.mjs ← Bing Copilot extractor
  google-ai.mjs    ← Google AI Mode extractor
  consent.mjs      ← shared cookie/consent banner dismissal
```

## License

MIT
