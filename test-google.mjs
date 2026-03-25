import { spawn } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';
import { writeFileSync } from 'fs';

process.env.CDP_PROFILE_DIR = `${tmpdir().replace(/\\/g, '/')}/greedysearch-chrome-profile`;
const CDP = join(process.cwd(), 'cdp.mjs');

function cdp(args, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [CDP, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    proc.stdout.on('data', d => out += d);
    proc.stderr.on('data', d => err += d);
    const timer = setTimeout(() => { proc.kill(); reject(new Error(`cdp timeout: ${args[0]}`)); }, timeoutMs);
    proc.on('close', code => {
      clearTimeout(timer);
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

async function main() {
  try {
    const anchor = await getAnyTab();
    const raw = await cdp(['evalraw', anchor, 'Target.createTarget', '{"url":"about:blank"}']);
    const { targetId } = JSON.parse(raw);
    const tab = targetId;

    await cdp(['list']);

    console.log('Navigating to google ai...');
    await cdp(['nav', tab, 'https://www.google.com/search?q=what+is+the+capital+of+france&udm=50'], 35000);
    await new Promise(r => setTimeout(r, 6000));
    
    // Dump full DOM to inspect the answer container classes
    const html = await cdp(['eval', tab, 'document.body.innerHTML']).catch(() => '');
    writeFileSync('google-answer-dom.html', html);
    console.log('Dumped search DOM to google-answer-dom.html');
    
    // Cleanup tab
    await cdp(['evalraw', anchor, 'Target.closeTarget', JSON.stringify({ targetId })]);
  } catch(e) {
    console.error(e);
  }
}

main();
