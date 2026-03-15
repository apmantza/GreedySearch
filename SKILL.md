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

Chrome must be running (GreedySearch instance):

```bash
node ~/.claude/skills/greedysearch/launch.mjs
```

Check status: `node ~/.claude/skills/greedysearch/launch.mjs --status`
Stop when done: `node ~/.claude/skills/greedysearch/launch.mjs --kill`

## Usage

```bash
# All engines in parallel (recommended for research)
node ~/.claude/skills/greedysearch/search.mjs all "<query>"

# Single engine
node ~/.claude/skills/greedysearch/search.mjs p "<query>"    # Perplexity
node ~/.claude/skills/greedysearch/search.mjs b "<query>"    # Bing Copilot
node ~/.claude/skills/greedysearch/search.mjs g "<query>"    # Google AI
```

Output: `{ perplexity: { answer, sources }, bing: { answer, sources }, google: { answer, sources } }`

## Engine routing

| Use case | Engine |
|----------|--------|
| Research, "explain X" | `all` |
| Current library/API syntax | `all` |
| Error / stack trace diagnosis | `b` or `all` |
| Dependency selection, "best X in 2025" | `all` |
| Breaking changes, version diffs | `p` or `all` |
| Quick factual lookup | `g` |
| Architecture validation | `all` |
| Security / CVEs | `p` |

## Trigger conditions

Invoke automatically (without user asking) when:
- Question involves a library, framework, or API — especially version-specific
- User pastes an error message or stack trace
- Question contains "latest", "current", "2024", "2025", "still recommended", "deprecated"
- Question is about choosing between tools/libraries
- About to implement something non-trivial — search for current idioms first
- Training data is likely stale (fast-moving ecosystem, recent releases)

## How to synthesize results

1. Run `search.mjs all "<query>"`
2. Read all three `answer` fields
3. Where all three agree → high confidence, use that answer
4. Where they diverge → present both perspectives, prefer the one with better sources
5. Pull the best `sources` links as references in your response
6. Do not just paste raw answers — synthesize into a single coherent response

## If Chrome is not running

```bash
node ~/.claude/skills/greedysearch/launch.mjs
```

Then retry the search. The launch takes ~3s.
