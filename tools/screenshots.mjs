#!/usr/bin/env node
// Captures the documentation screenshots from a running Muxarr instance with
// headless Chrome over the DevTools protocol. No dependencies beyond Node 22+.
//
//   node tools/screenshots.mjs [--base http://localhost:8183] [--out img/docs] [--only name,name]
//
// Every entry in SHOTS is a page plus optional steps (click, type, wait, eval)
// and an optional clip selector. Retina (2x) PNGs land in --out.

import { spawn } from 'node:child_process';
import { mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) =>
    a.startsWith('--') ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true] : []).filter(Boolean));
const BASE = args.base ?? 'http://localhost:8183';
const OUT = args.out ?? 'img/docs';
const ONLY = args.only ? String(args.only).split(',') : null;
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const WIDTH = 1440, HEIGHT = 900, SCALE = 2;

// --- what to capture ---------------------------------------------------------
// steps: {click: css} | {type: [css, text]} | {select: [css, value]} | {wait: ms}
//        | {eval: js} | {hover: css}
// clip:  css selector to crop to (with a little padding), default full viewport
const SHOTS = [
    { name: 'dashboard', url: '/', height: 800 },
    { name: 'library', url: '/library' },
    { name: 'library-selection', url: '/library', steps: [
        { eval: `document.querySelectorAll('tbody input[type=checkbox]')[1].click()` }, { wait: 300 },
        { eval: `document.querySelectorAll('tbody input[type=checkbox]')[4].dispatchEvent(new MouseEvent('click', {bubbles: true, shiftKey: true}))` }, { wait: 500 } ] },
    { name: 'library-advanced', url: '/library', steps: [ { click: 'button.btn-outline-primary:has(.bi-funnel)' }, { wait: 500 } ] },
    { name: 'file-details', url: '/library/__INCEPTION__', height: 1160 },
    { name: 'custom-conversion', url: '/library/__INCEPTION__', steps: [ { click: 'button:has(.bi-sliders)' }, { wait: 800 } ], height: 1300 },
    { name: 'batch-edit', url: '/library', height: 1400, steps: [
        { eval: `[...document.querySelectorAll('tbody tr')].filter(r => r.textContent.includes('Dark S01')).forEach(r => r.querySelector('input[type=checkbox]').click())` }, { wait: 500 },
        { eval: `[...document.querySelectorAll('button')].find(b => b.textContent.includes('Batch edit')).click()` }, { wait: 2500 } ] },
    { name: 'conversions', url: '/conversions' },
    { name: 'conversion-details', url: '/conversions/__CONV__', height: 1500 },
    { name: 'statistics', url: '/statistics', height: 1400 },
    { name: 'logs', url: '/logs', height: 800 },
    { name: 'settings-profiles', url: '/settings', height: 700 },
    { name: 'settings-integrations', url: '/settings', height: 1500, steps: [ { eval: `[...document.querySelectorAll('.nav-link')].find(b => b.textContent.trim().startsWith('Integrations')).click()` }, { wait: 800 } ] },
    { name: 'settings-processing', url: '/settings', height: 1500, steps: [ { eval: `[...document.querySelectorAll('.nav-link')].find(b => b.textContent.trim().startsWith('Processing')).click()` }, { wait: 800 } ] },
    { name: 'settings-notifications', url: '/settings', height: 620, steps: [ { eval: `[...document.querySelectorAll('.nav-link')].find(b => b.textContent.trim().startsWith('Notifications')).click()` }, { wait: 800 } ] },
    { name: 'notification-edit', url: '/settings', steps: [
        { eval: `[...document.querySelectorAll('.nav-link')].find(b => b.textContent.trim().startsWith('Notifications')).click()` }, { wait: 800 },
        { eval: `[...document.querySelectorAll('button')].find(b => b.textContent.includes('Add Notification')).click()` }, { wait: 800 },
        { select: ['.modal select', 'Jellyfin'] }, { wait: 500 } ] },
    { name: 'settings-security', url: '/settings', height: 760, steps: [ { eval: `[...document.querySelectorAll('.nav-link')].find(b => b.textContent.trim().startsWith('Security')).click()` }, { wait: 800 } ] },
    { name: 'settings-api', url: '/settings', height: 1300, steps: [ { eval: `[...document.querySelectorAll('.nav-link')].find(b => b.textContent.trim().startsWith('API')).click()` }, { wait: 800 } ] },
    { name: 'profile-general', url: '/settings/profile/1', height: 820 },
    { name: 'profile-video', url: '/settings/profile/1', height: 700, steps: [ { eval: `[...document.querySelectorAll('.nav-link, button')].find(b => b.textContent.trim() === 'Video').click()` }, { wait: 500 } ] },
    { name: 'profile-audio', url: '/settings/profile/1', height: 1450, steps: [ { eval: `[...document.querySelectorAll('.nav-link, button')].find(b => b.textContent.trim() === 'Audio').click()` }, { wait: 500 } ] },
    { name: 'profile-subtitles', url: '/settings/profile/1', height: 1450, steps: [ { eval: `[...document.querySelectorAll('.nav-link, button')].find(b => b.textContent.trim() === 'Subtitles').click()` }, { wait: 500 } ] },
    { name: 'language-editor-fallback', url: '/settings/profile/1', clip: 'div:has(> .lpe-container)', steps: [ { eval: `[...document.querySelectorAll('.nav-link, button')].find(b => b.textContent.trim() === 'Subtitles').click()` }, { wait: 500 } ] },
    { name: 'language-editor-settings', url: '/settings/profile/1', clip: 'div:has(> .lpe-container)', steps: [
        { eval: `[...document.querySelectorAll('.nav-link, button')].find(b => b.textContent.trim() === 'Audio').click()` }, { wait: 500 },
        { eval: `document.querySelectorAll('.lpe-item')[1].querySelector('button:has(.bi-gear, .bi-gear-fill)').click()` }, { wait: 500 } ] },
    // The wizard only renders while setup is incomplete; see README for the flag.
    { name: 'setup-security', url: '/setup', clip: '.mux-setup-card' },
    { name: 'setup-integrations', url: '/setup', height: 1100, clip: '.mux-setup-card', steps: [ { eval: `[...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith('Skip')).click()` }, { wait: 800 } ] },
    { name: 'setup-profiles', url: '/setup', clip: '.mux-setup-card', steps: [
        { eval: `[...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith('Skip')).click()` }, { wait: 800 },
        { eval: `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Skip').click()` }, { wait: 800 } ] },
];
const SETUP_SHOTS = ['setup-security', 'setup-integrations', 'setup-profiles'];

// --- tiny CDP client ---------------------------------------------------------
class Cdp {
    constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.events = []; }
    static async connect(url) {
        const ws = new WebSocket(url);
        await new Promise((ok, err) => { ws.onopen = ok; ws.onerror = err; });
        const c = new Cdp(ws);
        ws.onmessage = (m) => {
            const msg = JSON.parse(m.data);
            if (msg.id && c.pending.has(msg.id)) {
                const { ok, err } = c.pending.get(msg.id); c.pending.delete(msg.id);
                msg.error ? err(new Error(msg.error.message)) : ok(msg.result);
            } else if (msg.method) {
                c.events.push(msg);
            }
        };
        return c;
    }
    send(method, params = {}, sessionId) {
        const id = ++this.id;
        this.ws.send(JSON.stringify({ id, method, params, sessionId }));
        return new Promise((ok, err) => this.pending.set(id, { ok, err }));
    }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
    const profileDir = await mkdtemp(join(tmpdir(), 'muxarr-shots-'));
    const chrome = spawn(CHROME, [
        '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`,
        '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', `--window-size=${WIDTH},${HEIGHT}`, 'about:blank',
    ], { stdio: ['ignore', 'ignore', 'pipe'] });

    const wsUrl = await new Promise((ok, err) => {
        let buf = '';
        chrome.stderr.on('data', (d) => {
            buf += d;
            const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
            if (m) ok(m[1]);
        });
        chrome.on('exit', () => err(new Error('Chrome exited before DevTools was ready:\n' + buf)));
    });

    const cdp = await Cdp.connect(wsUrl);
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const s = (method, params) => cdp.send(method, params, sessionId);
    await s('Page.enable');
    await s('Runtime.enable');
    await mkdir(OUT, { recursive: true });

    // Ids that differ per instance are looked up once, by name.
    const ids = await lookupIds(s);

    for (const shot of SHOTS) {
        if (ONLY ? !ONLY.includes(shot.name) : SETUP_SHOTS.includes(shot.name)) continue;
        const height = shot.height ?? HEIGHT;
        await s('Emulation.setDeviceMetricsOverride', { width: WIDTH, height, deviceScaleFactor: SCALE, mobile: false });
        const url = BASE + shot.url.replace('__INCEPTION__', ids.inception).replace('__CONV__', ids.conversion);
        await s('Page.navigate', { url });
        await waitForBlazor(s);
        for (const step of shot.steps ?? []) {
            await runStep(s, step);
        }
        await sleep(400);
        const clip = shot.clip ? await clipFor(s, shot.clip) : undefined;
        const { data } = await s('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: false });
        await writeFile(join(OUT, `${shot.name}.png`), Buffer.from(data, 'base64'));
        console.log(`✓ ${shot.name}`);
    }

    chrome.kill();
    await rm(profileDir, { recursive: true, force: true, maxRetries: 5 }).catch(() => {});
}

async function lookupIds(s) {
    await s('Page.navigate', { url: BASE + '/library' });
    await waitForBlazor(s);
    const inception = await evalJs(s, `(() => { const a = [...document.querySelectorAll('tbody a[href^="/library/"]')].find(a => a.textContent.includes('Inception')); return a ? a.getAttribute('href').split('/').pop() : '1'; })()`);
    await s('Page.navigate', { url: BASE + '/conversions' });
    await waitForBlazor(s);
    const conversion = await evalJs(s, `(() => { const a = [...document.querySelectorAll('a[href^="/conversions/"]')].find(a => a.textContent.includes('Matrix')) || document.querySelector('a[href^="/conversions/"]'); return a ? a.getAttribute('href').split('/').pop() : '1'; })()`);
    return { inception, conversion };
}

// Blazor Server pages render twice: prerender, then the interactive circuit
// takes over. Wait for the circuit and let the first interactive render settle.
async function waitForBlazor(s) {
    for (let i = 0; i < 50; i++) {
        const ready = await evalJs(s, `!!(window.Blazor && document.querySelector('.mux-page-wrapper, .setup-page, form'))`);
        if (ready) break;
        await sleep(100);
    }
    await sleep(1200);
}

async function evalJs(s, expression) {
    const { result } = await s('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return result.value;
}

async function runStep(s, step) {
    if (step.wait) return sleep(step.wait);
    if (step.eval) return evalJs(s, step.eval);
    if (step.click) return evalJs(s, `document.querySelector(${JSON.stringify(step.click)}).click()`);
    if (step.hover) return evalJs(s, `document.querySelector(${JSON.stringify(step.hover)}).dispatchEvent(new MouseEvent('mouseover', {bubbles: true}))`);
    if (step.select) {
        const [sel, text] = step.select;
        return evalJs(s, `(() => { const el = document.querySelector(${JSON.stringify(sel)}); const o = [...el.options].find(o => o.textContent.trim() === ${JSON.stringify(text)} || o.value === ${JSON.stringify(text)}); el.value = o.value; el.dispatchEvent(new Event('change', {bubbles: true})); })()`);
    }
    if (step.type) {
        const [sel, text] = step.type;
        await evalJs(s, `document.querySelector(${JSON.stringify(sel)}).focus()`);
        await s('Input.insertText', { text });
        return evalJs(s, `document.querySelector(${JSON.stringify(sel)}).dispatchEvent(new Event('change', {bubbles: true}))`);
    }
    throw new Error('unknown step ' + JSON.stringify(step));
}

async function clipFor(s, selector) {
    const box = await evalJs(s, `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const r = el.getBoundingClientRect(); return {x: r.x, y: r.y, w: r.width, h: r.height}; })()`);
    if (!box) return undefined;
    const pad = 24;
    return { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.w + pad * 2, height: box.h + pad * 2, scale: 1 };
}

main().catch((e) => { console.error(e); process.exit(1); });
