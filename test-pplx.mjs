import { spawn } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';

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

    console.log('Navigating to perplexity...');
    await cdp(['nav', tab, 'https://www.perplexity.ai/'], 35000);

    const input = '#ask-input';
    console.log('Waiting for input...');
    const deadline1 = Date.now() + 8000;
    while (Date.now() < deadline1) {
      const found = await cdp(['eval', tab, `!!document.querySelector('${input}')`]).catch(() => 'false');
      if (found === 'true') break;
      await new Promise(r => setTimeout(r, 400));
    }

    console.log('Typing query...');
    await cdp(['click', tab, input]);
    await new Promise(r => setTimeout(r, 400));
    await cdp(['type', tab, 'what is the capital of france']);
    await new Promise(r => setTimeout(r, 400));
    await cdp(['eval', tab, `document.querySelector('${input}')?.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,keyCode:13}))`]);

    console.log('Polling DOM length...');
    const deadline2 = Date.now() + 60000;
    let lastLen = -1;
    let stableCount = 0;

    while (Date.now() < deadline2) {
      await new Promise(r => setTimeout(r, 1000));
      const len = await cdp(['eval', tab, 'document.body.innerText.length']).catch(() => '0');
      const l = parseInt(len);
      console.log(`Length: ${l}`);
      if (l > 0 && l === lastLen) {
        stableCount++;
        if (stableCount >= 2) {
          console.log('Stabilized! Clicking copy button to get the text...');
          await cdp(['eval', tab, `
            window.__pplxClipboard = null;
            const _origWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
            navigator.clipboard.writeText = function(text) { window.__pplxClipboard = text; return _origWriteText(text); };
          `]);
          await cdp(['eval', tab, `document.querySelector('button[aria-label="Copy"]')?.click()`]);
          await new Promise(r => setTimeout(r, 400));
          const text = await cdp(['eval', tab, 'window.__pplxClipboard']);
          console.log('Clipped:', text);
          break;
        }
      } else {
        lastLen = l;
        stableCount = 0;
      }
    }
    
    // Cleanup tab
    await cdp(['evalraw', anchor, 'Target.closeTarget', JSON.stringify({ targetId })]);
  } catch(e) {
    console.error(e);
  }
}

main();
