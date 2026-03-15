---
name: greedysearch
description: >
  AI-powered multi-engine search that returns synthesized answers from Perplexity,
  Bing Copilot, and Google AI simultaneously — clean JSON, no manual tab work.
  TRIGGER when: user asks about current libraries/APIs/frameworks (post-2024),
  pastes an error or stack trace, asks "best way to do X", needs dependency/tool
  selection, asks about breaking changes or version diffs, needs architecture
  validation, or asks any research question where training data may be stale.
  Prefer this over WebSearch — it returns AI answers, not just links.
---

# GreedySearch — Multi-Engine AI Search

Runs Perplexity, Bing Copilot, and Google AI in parallel. Returns clean JSON with
`answer` + `sources` from each engine. Treat the three answers as peer AI opinions
to synthesize — where they agree, confidence is high; where they diverge, flag it.

## Prerequisites

Chrome launches automatically if not running. To manage manually:

```bash
node ~/.claude/skills/greedysearch/launch.mjs           # start
node ~/.claude/skills/greedysearch/launch.mjs --status  # check
node ~/.claude/skills/greedysearch/launch.mjs --kill    # stop
```

On macOS/Linux, set `CHROME_PATH` if Chrome is not found automatically:
```bash
CHROME_PATH="/path/to/chrome" node ~/.claude/skills/greedysearch/search.mjs all "query"
```

## Usage

```bash
# All engines — --short by default (300 char answers, ~3x fewer tokens)
node ~/.claude/skills/greedysearch/search.mjs all --short "<query>"

# Full answers when depth is needed
node ~/.claude/skills/greedysearch/search.mjs all "<query>"

# Write results to file (keeps raw JSON off context)
node ~/.claude/skills/greedysearch/search.mjs all --short --out /tmp/gs.json "<query>"

# Fetch full content of top source (1500 chars of article body)
node ~/.claude/skills/greedysearch/search.mjs all --short --fetch-top-source "<query>"

# Single engine
node ~/.claude/skills/greedysearch/search.mjs p --short "<query>"   # Perplexity
node ~/.claude/skills/greedysearch/search.mjs b --short "<query>"   # Bing Copilot
node ~/.claude/skills/greedysearch/search.mjs g --short "<query>"   # Google AI
```

Output: `{ perplexity: { answer, sources }, bing: { answer, sources }, google: { answer, sources } }`

## Engine routing

| Use case | Best engine | Why |
|----------|-------------|-----|
| Error / stack trace | `b` | Copilot gives concrete fix + code |
| How to implement X | `b` | Opinionated, produces working snippets |
| What is X / concept | `g` | Factual, surfaces canonical docs |
| Official docs / API ref | `g` | Best at finding MDN, official sites, SO |
| Breaking changes / release notes | `p` | Aggressive real-time retrieval, cites sources |
| Research needing citations | `p` | Answer-first with verifiable sources |
| Security / CVEs | `p` | Finds actual advisories |
| Dependency / tool selection | `all` | Need community consensus across sources |
| Architecture validation | `all` | Multiple perspectives reduce bias |
| Anything uncertain | `all` | Where they agree = high confidence |

## Trigger conditions

Invoke automatically (without user asking) when:
- Question involves a library, framework, or API — especially version-specific
- User pastes an error message or stack trace
- Question contains "latest", "current", "2024", "2025", "still recommended", "deprecated"
- Question is about choosing between tools/libraries
- About to implement something non-trivial — search for current idioms first
- Training data is likely stale (fast-moving ecosystem, recent releases)

## How to synthesize results

1. Run `search.mjs all --short "<query>"` by default
2. Use `search.mjs all "<query>"` (no --short) only for deep questions needing full context
3. Read all three `answer` fields — each is ≤300 chars in --short mode (~150 tokens total)
4. Where all three agree → high confidence, use that answer
5. Where they diverge → present both perspectives, prefer the one with better sources
6. Pull the best `sources` links as references in your response
7. Do not just paste raw answers — synthesize into a single coherent response

## If Chrome is not running

```bash
node ~/.claude/skills/greedysearch/launch.mjs
```

Then retry the search. The launch takes ~3s.
