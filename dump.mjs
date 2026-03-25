import { spawn } from 'child_process';
import { join } from 'path';

const CDP = 'C:\\Users\\R3LiC\\Desktop\\GreedySearch\\cdp.mjs';

function cdp(args, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [CDP, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    proc.stdout.on('data', d => out += d);
    proc.stderr.on('data', d => err += d);
    const timer = setTimeout(() => { proc.kill(); reject(new Error('timeout')); }, timeoutMs);
    proc.on('close', code => {
      clearTimeout(timer);
      resolve(out.trim());
    });
  });
}

async function main() {
  const tabs = await cdp(['list']);
  const tab = tabs.split('\n')[0].slice(0,8);
  
  await cdp(['nav', tab, 'https://www.perplexity.ai/'], 35000);
  await new Promise(r => setTimeout(r, 3000));
  
  await cdp(['click', tab, '#ask-input']);
  await new Promise(r => setTimeout(r, 400));
  await cdp(['type', tab, 'what is python']);
  await new Promise(r => setTimeout(r, 400));
  await cdp(['eval', tab, "document.querySelector('#ask-input')?.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,keyCode:13})), 'ok'"]);
  
  console.log("Waiting 15 seconds for answer to generate...");
  await new Promise(r => setTimeout(r, 15000));
  
  const buttons = await cdp(['eval', tab, `
    JSON.stringify(Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.innerText.trim(),
      aria: b.getAttribute('aria-label'),
      classes: b.className,
      svg: b.querySelector('svg')?.innerHTML || ''
    })))
  `]);
  
  console.log(buttons);
}
main();
