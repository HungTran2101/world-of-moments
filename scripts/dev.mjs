import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createInterface } from 'node:readline';
import { stripVTControlCharacters } from 'node:util';

const require = createRequire(import.meta.url);
const next = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', ...process.argv.slice(2)], {
  stdio: ['inherit', 'pipe', 'inherit'],
});

async function openBrowser(url) {
  const debugPort = process.env.DEV_BROWSER_DEBUG_PORT;

  if (debugPort) {
    const port = Number(debugPort);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('DEV_BROWSER_DEBUG_PORT must be a valid port number.');
    }

    const endpoint = `http://127.0.0.1:${port}/json`;
    const response = await fetch(`${endpoint}/list`, { signal: AbortSignal.timeout(2000) });
    if (!response.ok) throw new Error(`Could not list browser tabs (HTTP ${response.status}).`);

    const tabs = await response.json();
    const origin = new URL(url).origin;
    if (tabs.some((tab) => tab.type === 'page' && URL.canParse(tab.url) && new URL(tab.url).origin === origin)) {
      return;
    }

    const opened = await fetch(`${endpoint}/new?${encodeURIComponent(url)}`, {
      method: 'PUT',
      signal: AbortSignal.timeout(2000),
    });
    if (!opened.ok) throw new Error(`Could not open a browser tab (HTTP ${opened.status}).`);
    return;
  }

  const command = { win32: 'explorer.exe', darwin: 'open' }[process.platform] ?? 'xdg-open';
  const browser = spawn(command, [url], { stdio: 'ignore', windowsHide: true });
  browser.on('error', (error) => console.warn(`Could not open the browser: ${error.message}`));
  browser.unref();
}

let localUrl;
let browserRequested = false;
const output = createInterface({ input: next.stdout });
output.on('line', (line) => {
  console.log(line);
  if (browserRequested || process.env.DEV_OPEN === '0' || process.env.CI) return;

  // Lấy URL từ Next.js để dùng đúng cổng khi cổng mặc định đang bận.
  const message = stripVTControlCharacters(line);
  localUrl = message.match(/^\s*-\s+Local:\s+(https?:\/\/\S+)/)?.[1] ?? localUrl;
  if (!localUrl || !/\bReady in\s/.test(message)) return;

  browserRequested = true;
  openBrowser(localUrl).catch((error) => console.warn(`Could not open the browser: ${error.message}`));
});

next.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
next.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal === 'SIGINT' ? 130 : 143);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    // Trên Windows, Ctrl+C đã được gửi đến cả nhóm tiến trình trong terminal.
    if (process.platform !== 'win32' || signal !== 'SIGINT') next.kill(signal);
  });
}
