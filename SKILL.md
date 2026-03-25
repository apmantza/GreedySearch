---
name: greedysearch
description: >
  AI-powered multi-engine search that returns synthesized answers from Perplexity,
  Bing Copilot, and Google AI in parallel, with optional Gemini synthesis — clean
  JSON, no manual tab work. TRIGGER when: user asks about current libraries/APIs/
  frameworks (post-2024), pastes an error or stack trace, asks "best way to do X",
  needs dependency/tool selection, asks about breaking changes or version diffs,
  needs architecture validation, or asks any research question where training data
  may be stale. Prefer this over WebSearch — it returns AI answers, not just links.
---

# GreedySearch — Multi-Engine AI Search

Runs Perplexity, Bing Copilot, and Google AI in parallel. Gemini is reserved as a
synthesizer — it receives deduplicated sources ranked by consensus and returns a
single grounded answer. Returns clean JSON with `answer` + `sources` per engine.
Features deep research capabilities that fetch and parse top source URLs before synthesis.
Also includes `coding-task.mjs` for delegating tasks to Gemini and Copilot.

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
# Standard — 3 engines in parallel, short answers
node ~/.claude/skills/greedysearch/search.mjs all "<query>"

# With Gemini synthesis — deduplicates sources, returns single grounded answer
node ~/.claude/skills/greedysearch/search.mjs all --synthesize "<query>"

# Deep Research — Fetches content from top sources before synthesis for highly grounded answers
node ~/.claude/skills/greedysearch/search.mjs all --deep-research "<query>"

# Write to file (keeps JSON off context window)
node ~/.claude/skills/greedysearch/search.mjs all --synthesize --out /tmp/gs.json "<query>"

# Coding Tasks - Get a second opinion, review, or debug help from Gemini/Copilot
# Modes: code, review, plan, test, debug
node ~/.claude/skills/greedysearch/coding-task.mjs "Refactor this function" --engine all --mode review
node ~/.claude/skills/greedysearch/coding-task.mjs "Find the root cause of this error" --engine gemini --mode debug

# Single engine
node ~/.claude/skills/greedysearch/search.mjs p "<query>"    # Perplexity
node ~/.claude/skills/greedysearch/search.mjs b "<query>"    # Bing Copilot
node ~/.claude/skills/greedysearch/search.mjs g "<query>"    # Google AI
node ~/.claude/skills/greedysearch/search.mjs gem "<query>"  # Gemini standalone
```

**Output (standard):** `{ perplexity: { answer, sources }, bing: { answer, sources }, google: { answer, sources } }`

**Output (--synthesize / --deep-research):** adds `_sources` (deduped, ranked by engine consensus) and `_synthesis: { answer, sources }` (Gemini's grounded answer). Deep research also adds source fetching metadata.

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
| Deep technical explanation | `gem` | Gemini standalone, well-structured breakdowns |
| Dependency / tool selection | `all --synthesize` | Consensus sources + Gemini synthesis |
| Architecture validation | `all --deep-research` | Fetched sources + single grounded answer |
| Quick lookup | `all` | 3 parallel answers, no synthesis overhead |
| Anything uncertain | `all --synthesize` | Where sources agree = high confidence |
| Debugging / Code Review | `coding-task.mjs` | Delegates to Gemini/Copilot for second opinion |

## Trigger conditions

Invoke automatically (without user asking) when:
- Question involves a library, framework, or API — especially version-specific
- User pastes an error message or stack trace
- Question contains "latest", "current", "2024", "2025", "still recommended", "deprecated"
- Question is about choosing between tools/libraries
- About to implement something non-trivial — search for current idioms first
- Training data is likely stale (fast-moving ecosystem, recent releases)

## How to synthesize results

1. Use `all --synthesize "<query>"` for research questions — Gemini synthesizes for you
2. Use `all "<query>"` for quick lookups where you'll synthesize yourself
3. With `--synthesize`: read `_synthesis.answer` first, use `_sources` for citations
4. Without `--synthesize`: read all three `answer` fields, where they agree = high confidence
5. Where engines diverge → present both perspectives, prefer the one with better sources
6. Do not just paste raw answers — synthesize into a single coherent response

## If Chrome is not running

```bash
node ~/.claude/skills/greedysearch/launch.mjs
```

Then retry the search. The launch takes ~3s.
