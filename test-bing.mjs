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

    console.log('Navigating to copilot...');
    await cdp(['nav', tab, 'https://copilot.microsoft.com/'], 35000);
    await new Promise(r => setTimeout(r, 4000));
    
    const html = await cdp(['eval', tab, 'document.body.innerHTML']).catch(() => '');
    writeFileSync('bing-initial-dom.html', html);
    
    const input = '#userInput';
    console.log('Checking for input...');
    const found = await cdp(['eval', tab, `!!document.querySelector('${input}')`]);
    console.log(`Input active: ${found}`);

    // dump any dialogs or iframes
    const dialogs = await cdp(['eval', tab, `
      Array.from(document.querySelectorAll('div'))
        .filter(d => d.innerText.toLowerCase().includes('verify') || d.innerText.toLowerCase().includes('human'))
        .map(d => d.outerHTML.slice(0, 500))
        .join('\\n---\\n')
    `]);
    if (dialogs && dialogs !== 'null') writeFileSync('bing-verify-elements.txt', dialogs);
    
    // Cleanup tab
    await cdp(['evalraw', anchor, 'Target.closeTarget', JSON.stringify({ targetId })]);
  } catch(e) {
    console.error(e);
  }
}

main();
