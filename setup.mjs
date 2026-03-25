#!/usr/bin/env node
// setup.mjs — install GreedySearch as a Claude Code skill
//
// Usage:
//   node setup.mjs          — install / update
//   node setup.mjs --check  — verify installation without changing anything

import { existsSync, mkdirSync, cpSync, readFileSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { execSync } from 'child_process';

const __dir   = dirname(fileURLToPath(import.meta.url));
const SKILLS  = join(homedir(), '.claude', 'skills');
const SKILL_DIR = join(SKILLS, 'greedysearch');
const CLAUDE_MD = join(homedir(), '.claude', 'CLAUDE.md');

const CHECK_ONLY = process.argv.includes('--check');

// ---------------------------------------------------------------------------

function log(msg)  { console.log(`  ✓ ${msg}`); }
function warn(msg) { console.log(`  ! ${msg}`); }
function fail(msg) { console.error(`  ✗ ${msg}`); process.exit(1); }
function section(msg) { console.log(`\n${msg}`); }

// ---------------------------------------------------------------------------

section('Checking dependencies...');

// 1. Node.js version
const [major] = process.versions.node.split('.').map(Number);
if (major < 18) fail(`Node.js 18+ required (found ${process.versions.node})`);
log(`Node.js ${process.versions.node}`);

// ---------------------------------------------------------------------------

section('Installing GreedySearch skill...');

if (CHECK_ONLY) {
  const installed = existsSync(join(SKILL_DIR, 'search.mjs'));
  installed ? log(`skill installed at ${SKILL_DIR}`) : warn(`skill not installed at ${SKILL_DIR}`);
} else {
  mkdirSync(SKILL_DIR, { recursive: true });

  // Copy scripts
  const filesToCopy = ['cdp.mjs', 'search.mjs', 'launch.mjs', 'coding-task.mjs', 'SKILL.md'];
  for (const f of filesToCopy) {
    const src = join(__dir, f);
    if (!existsSync(src)) fail(`Missing source file: ${f}`);
    cpSync(src, join(SKILL_DIR, f));
  }

  // Copy extractors directory
  cpSync(join(__dir, 'extractors'), join(SKILL_DIR, 'extractors'), { recursive: true });

  log(`scripts copied to ${SKILL_DIR}`);
}

// ---------------------------------------------------------------------------

section('Updating ~/.claude/CLAUDE.md...');

const GREEDYSEARCH_BLOCK = `
## Web Search — GreedySearch

IMPORTANT: Do NOT use the built-in WebSearch or WebFetch tools for research or
coding questions. Use GreedySearch instead — it returns AI-synthesized answers
(not just links) from Perplexity, Bing Copilot, and Google AI simultaneously.

When to invoke automatically (without being asked):
- Any question about a library, framework, API, or tool — especially version-specific
- User pastes an error message or stack trace
- Question contains "latest", "current", "2025", "still recommended", "deprecated"
- Choosing between dependencies or tools
- About to implement something non-trivial (search for current idioms first)
- Fast-moving ecosystems where training data may be stale

How to run:
  node ~/.claude/skills/greedysearch/search.mjs all "<query>"   # 3 engines in parallel
  node ~/.claude/skills/greedysearch/search.mjs p "<query>"     # Perplexity only
  node ~/.claude/skills/greedysearch/search.mjs b "<query>"     # Bing Copilot only
  node ~/.claude/skills/greedysearch/search.mjs g "<query>"     # Google AI only

Chrome must be running first:
  node ~/.claude/skills/greedysearch/launch.mjs

Synthesize the three AI answers into one coherent response. Where they agree,
confidence is high. Where they diverge, present both perspectives.
`;

if (CHECK_ONLY) {
  const hasMd = existsSync(CLAUDE_MD);
  const hasBlock = hasMd && readFileSync(CLAUDE_MD, 'utf8').includes('GreedySearch');
  hasBlock ? log('CLAUDE.md already has GreedySearch block') : warn('CLAUDE.md missing GreedySearch block');
} else {
  const hasMd = existsSync(CLAUDE_MD);
  const content = hasMd ? readFileSync(CLAUDE_MD, 'utf8') : '';

  if (content.includes('GreedySearch')) {
    log('CLAUDE.md already configured (skipped)');
  } else {
    appendFileSync(CLAUDE_MD, GREEDYSEARCH_BLOCK, 'utf8');
    log('GreedySearch block appended to CLAUDE.md');
  }
}

// ---------------------------------------------------------------------------

section('Done.\n');
console.log('  Start Chrome:   node ~/.claude/skills/greedysearch/launch.mjs');
console.log('  Test search:    node ~/.claude/skills/greedysearch/search.mjs all "what is memoization"');
console.log('  Stop Chrome:    node ~/.claude/skills/greedysearch/launch.mjs --kill');
console.log('');
console.log('  Restart your Claude Code session to pick up the skill and CLAUDE.md changes.\n');
