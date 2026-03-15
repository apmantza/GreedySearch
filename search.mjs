#!/usr/bin/env node
// search.mjs — unified CLI for GreedySearch extractors
//
// Usage:
//   node search.mjs <engine> "<query>"
//   node search.mjs all "<query>"
//
// Engines:
//   perplexity | pplx | p
//   bing       | copilot | b
//   google     | g
//   stackoverflow | so | stack
//   all        — fan-out to all engines in parallel
//
// Output: JSON to stdout, errors to stderr
//
// Examples:
//   node search.mjs p "what is memoization"
//   node search.mjs so "node.js event loop explained"
//   node search.mjs all "how does TCP congestion control work"

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { readFileSync, existsSync } from 'fs';
import { tmpdir, homedir } from 'os';

const __dir = dirname(fileURLToPath(import.meta.url));
const CDP = join(homedir(), '.claude', 'skills', 'chrome-cdp', 'scripts', 'cdp.mjs');
const PAGES_CACHE = `${tmpdir().replace(/\\/g, '/')}/cdp-pages.json`;

const ENGINES = {
  perplexity: 'perplexity.mjs',
  pplx:       'perplexity.mjs',
  p:          'perplexity.mjs',
  bing:       'bing-copilot.mjs',
  copilot:    'bing-copilot.mjs',
  b:          'bing-copilot.mjs',
  google:     'google-ai.mjs',
  g:          'google-ai.mjs',
  stackoverflow: 'stackoverflow-ai.mjs',
  so:         'stackoverflow-ai.mjs',
  stack:      'stackoverflow-ai.mjs',
};

const ALL_ENGINES = ['perplexity', 'bing', 'google']; // stackoverflow: disabled until polling fix

const ENGINE_DOMAINS = {
  perplexity: 'perplexity.ai',
  bing:       'copilot.microsoft.com',
  google:     'google.com',
  stackoverflow: 'stackoverflow.com',
};

function getTabFromCache(engine) {
  try {
    if (!existsSync(PAGES_CACHE)) return null;
    const pages = JSON.parse(readFileSync(PAGES_CACHE, 'utf8'));
    const found = pages.find(p => p.url.includes(ENGINE_DOMAINS[engine]));
    return found ? found.targetId.slice(0, 8) : null;
  } catch { return null; }
}

function cdp(args, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [CDP, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    proc.stdout.on('data', d => out += d);
    proc.stderr.on('data', d => err += d);
    const t = setTimeout(() => { proc.kill(); reject(new Error(`cdp timeout: ${args[0]}`)); }, timeoutMs);
    proc.on('close', code => {
      clearTimeout(t);
      if (code !== 0) reject(new Error(err.trim() || `cdp exit ${code}`));
      else resolve(out.trim());
    });
  });
}

async function getAnyTab() {
  const list = await cdp(['list']);
  const first = list.split('\n')[0];
  if (!first) throw new Error('No Chrome tabs found');
  return first.slice(0, 8);
}

async function getOrReuseBlankTab() {
  // Reuse an existing about:blank tab rather than always creating a new one
  const listOut = await cdp(['list']);
  const lines = listOut.split('\n').filter(Boolean);
  for (const line of lines) {
    if (line.includes('about:blank')) {
      return line.slice(0, 8); // prefix of the blank tab's targetId
    }
  }
  // No blank tab — open a new one
  const anchor = await getAnyTab();
  const raw = await cdp(['evalraw', anchor, 'Target.createTarget', '{"url":"about:blank"}']);
  const { targetId } = JSON.parse(raw);
  return targetId;
}

async function openNewTab() {
  const anchor = await getAnyTab();
  const raw = await cdp(['evalraw', anchor, 'Target.createTarget', '{"url":"about:blank"}']);
  const { targetId } = JSON.parse(raw);
  return targetId;
}

async function closeTab(targetId) {
  try {
    const anchor = await getAnyTab();
    await cdp(['evalraw', anchor, 'Target.closeTarget', JSON.stringify({ targetId })]);
  } catch { /* best-effort */ }
}

function runExtractor(script, query, tabPrefix = null, short = false) {
  const extraArgs = [
    ...(tabPrefix ? ['--tab', tabPrefix] : []),
    ...(short    ? ['--short']          : []),
  ];
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [join(__dir, 'extractors', script), query, ...extraArgs], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    proc.stdout.on('data', d => out += d);
    proc.stderr.on('data', d => err += d);
    proc.on('close', code => {
      if (code !== 0) reject(new Error(err.trim() || `extractor exit ${code}`));
      else {
        try { resolve(JSON.parse(out.trim())); }
        catch { reject(new Error(`bad JSON from ${script}: ${out.slice(0, 100)}`)); }
      }
    });
  });
}


async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2 || args[0] === '--help') {
    process.stderr.write([
      'Usage: node search.mjs <engine> "<query>"',
      '',
      'Engines: perplexity (p), bing (b), google (g), stackoverflow (so), all',
      '',
      'Examples:',
      '  node search.mjs p "what is memoization"',
      '  node search.mjs so "node.js event loop explained"',
      '  node search.mjs all "TCP congestion control"',
    ].join('\n') + '\n');
    process.exit(1);
  }

  const short  = args.includes('--short');
  const rest   = args.filter(a => a !== '--short');
  const engine = rest[0].toLowerCase();
  const query  = rest.slice(1).join(' ');

  if (engine === 'all') {
    await cdp(['list']); // refresh pages cache

    // Assign tabs: reuse existing engine tabs from cache, open new ones only where needed.
    // Track opened tabs separately so we only close what we created.
    const tabs = [];
    const openedTabs = [];
    let blankReused = false;

    for (const e of ALL_ENGINES) {
      const existing = getTabFromCache(e);
      if (existing) {
        tabs.push(existing);
      } else if (!blankReused) {
        const tab = await getOrReuseBlankTab();
        tabs.push(tab);
        openedTabs.push(tab);
        blankReused = true;
      } else {
        await new Promise(r => setTimeout(r, 500));
        const tab = await openNewTab();
        tabs.push(tab);
        openedTabs.push(tab);
      }
    }

    // All tabs assigned — run extractors in parallel
    const results = await Promise.allSettled(
      ALL_ENGINES.map((e, i) =>
        runExtractor(ENGINES[e], query, tabs[i], short).then(r => ({ engine: e, ...r }))
      )
    );

    // Close only tabs we opened (not pre-existing ones)
    await Promise.allSettled(openedTabs.map(closeTab));

    const out = {};
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled') {
        out[r.value.engine] = r.value;
      } else {
        out[ALL_ENGINES[i]] = { error: r.reason?.message || 'unknown error' };
      }
    }

    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    return;
  }

  const script = ENGINES[engine];
  if (!script) {
    process.stderr.write(`Unknown engine: "${engine}"\nAvailable: ${Object.keys(ENGINES).join(', ')}\n`);
    process.exit(1);
  }

  try {
    const result = await runExtractor(script, query, null, short);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (e) {
    process.stderr.write(`Error: ${e.message}\n`);
    process.exit(1);
  }
}

main();
