/**
 * Headless rendering harness: a Vite server + Chromium driven by Playwright.
 *
 * By default Chromium renders WebGL through SwiftShader (CPU). It is slower
 * than a GPU but bit-for-bit reproducible on any machine — the right choice
 * for a master. Pass `gpu: true` to use the hardware GPU for fast previews.
 */
import { chromium, type Browser, type Page } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export interface Session {
  server: ViteDevServer;
  browser: Browser;
  page: Page;
  info: EngineInfo;
  close(): Promise<void>;
}

export interface EngineInfo {
  width: number;
  height: number;
  fps: number;
  duration: number;
  frames: number;
  seed: number;
  quality: string;
  timeline: string;
  dataset: string;
  datasetHash: string;
  renderer: string;
}

export interface OpenOptions {
  quality: string;
  seed?: number;
  timeline?: string;
  gpu?: boolean;
  extraParams?: Record<string, string>;
}

function chromiumExecutable(): string | undefined {
  // Use the Playwright-managed browser when present; allow an override.
  const override = process.env.SINTESI_CHROMIUM;
  if (override && existsSync(override)) return override;
  return undefined;
}

export async function openEngine(opts: OpenOptions): Promise<Session> {
  const server = await createServer({
    root: ROOT,
    logLevel: 'error',
    server: { port: 0, host: '127.0.0.1', hmr: false },
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Vite server did not start');
  const url = new URL(`http://127.0.0.1:${address.port}/`);
  url.searchParams.set('mode', 'render');
  url.searchParams.set('quality', opts.quality);
  if (opts.seed !== undefined) url.searchParams.set('seed', String(opts.seed));
  if (opts.timeline) url.searchParams.set('timeline', opts.timeline);
  for (const [k, v] of Object.entries(opts.extraParams ?? {})) url.searchParams.set(k, v);

  const args = opts.gpu
    ? ['--ignore-gpu-blocklist', '--enable-gpu-rasterization']
    : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  const browser = await chromium.launch({ args, executablePath: chromiumExecutable() });
  const page = await browser.newPage({ viewport: { width: 800, height: 800 }, deviceScaleFactor: 1 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  let shaderError: string | null = null;
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
    if (/Shader Error|ERROR: \d+:\d+/.test(msg.text())) shaderError ??= msg.text().slice(0, 2000);
    if (process.env.SINTESI_VERBOSE) console.log(`[page] ${msg.text()}`);
  });
  await page.goto(url.toString());
  try {
    // Fail fast on a page error instead of waiting for the timeout.
    await Promise.race([
      page.waitForFunction(() => (window as any).__SINTESI__?.ready === true, undefined, { timeout: 900_000, polling: 250 }),
      new Promise((_, reject) => page.on('pageerror', (e) => reject(e))),
    ]);
  } catch (e) {
    await browser.close();
    await server.close();
    throw new Error(`Engine failed to start:\n${errors.join('\n') || String(e)}`);
  }
  if (shaderError) {
    await browser.close();
    await server.close();
    throw new Error(`Shader compilation failed:\n${shaderError}`);
  }
  const info = (await page.evaluate(() => (window as any).__SINTESI__.info())) as EngineInfo;
  return {
    server,
    browser,
    page,
    info,
    close: async () => {
      await browser.close();
      await server.close();
    },
  };
}

/** Renders one frame and returns the encoded image bytes. */
export async function captureFrame(page: Page, frame: number, format: 'png' | 'jpeg' = 'png'): Promise<Buffer> {
  const dataUrl = (await page.evaluate(
    ([f, fmt]) => (window as any).__SINTESI__.captureFrame(f, fmt),
    [frame, format] as const,
  )) as string;
  return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
}

export function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (m) out[m[1]] = m[2] ?? 'true';
    else (out._ ??= '', (out._ += (out._ ? ' ' : '') + a));
  }
  return out;
}
