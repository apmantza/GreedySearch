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
    const tab = await getAnyTab();

    console.log('Navigating to google ai...');
    await cdp(['nav', tab, 'https://www.google.com/search?q=who+is+the+creator+of+java&udm=50'], 35000);
    await new Promise(r => setTimeout(r, 6000));
    
    const len = await cdp(['eval', tab, `
      (function() {
        var el = document.querySelector('.pWvJNd');
        return el ? el.innerText.length : -1;
      })()
    `]);
    console.log('Length of first .pWvJNd: ', len);
    
  } catch(e) {
    console.error(e);
  }
}

main();
