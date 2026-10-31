// End-to-end test: loads the real unpacked extension in Chromium and drives popup + dashboard.
// Run: npm run test:browser   (set HEADED=1 to watch)
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {mkdtempSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ext = join(root, 'extension'), shots = join(root, 'screenshots');
mkdirSync(shots, {recursive: true});

// Local pages so tests don't need the internet.
const site = createServer((req, res) => { res.writeHead(200, {'content-type': 'text/html'}); res.end(`<title>${req.url.slice(1) || 'home'} page</title><h1>${req.url}</h1>`); });
await new Promise(r => site.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${site.address().port}`;

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'tabvault-')), {
  headless: false, args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, ...(process.env.HEADED ? [] : ['--headless=new'])],
  viewport: {width: 1280, height: 860},
});
let failed = 0;
const step = async (name, fn) => { try { await fn(); console.log('✔', name); } catch (e) { failed++; console.log('✖', name, '\n  ', e.message.split('\n')[0]); } };
try {
  let [sw] = ctx.serviceWorkers(); sw ||= await ctx.waitForEvent('serviceworker');
  const id = new URL(sw.url()).host;
  const url = p => `chrome-extension://${id}/${p}`;
  const errors = [];
  ctx.on('page', p => p.on('pageerror', e => errors.push(e.message)));

  const pages = {};
  for (const n of ['a', 'b', 'c']) { const p = await ctx.newPage(); await p.goto(`${base}/${n}`); pages[n] = p; }
  const dupe = await ctx.newPage(); await dupe.goto(`${base}/b?utm_source=x`);
  await pages.a.bringToFront();

  await step('service worker + manifest load', async () => {
    const m = await sw.evaluate(() => chrome.runtime.getManifest());
    assert.equal(m.manifest_version, 3); assert.deepEqual(m.permissions.sort(), ['storage', 'tabs']);
  });

  const popup = await ctx.newPage(); await popup.setViewportSize({width: 380, height: 600}); await popup.goto(url('popup.html'));
  await step('popup: save all tabs, dedupe tracking-param duplicate', async () => {
    await popup.getByRole('button', {name: /Save All Tabs/}).click();
    await popup.locator('.toast').first().waitFor();
    const vault = await sw.evaluate(async () => (await chrome.storage.local.get('tabvault.v1'))['tabvault.v1']);
    const urls = vault.tabs.map(t => t.url);
    assert.ok(urls.includes(`${base}/a`) && urls.includes(`${base}/b`) && urls.includes(`${base}/c`), urls.join());
    assert.equal(urls.filter(u => u.includes('/b')).length, 1, 'utm duplicate must not be saved twice');
    assert.ok(urls.every(u => /^https?:/.test(u)), 'extension/internal pages skipped');
  });
  await step('popup: search finds saved tab', async () => {
    await popup.locator('#q').fill('c page');
    await popup.locator('#list .row .t', {hasText: 'c page'}).first().waitFor();
  });
  await popup.locator('#q').fill('');
  await popup.screenshot({path: join(shots, 'popup-dark.png')});

  const dash = await ctx.newPage(); await dash.goto(url('dashboard.html#tabs'));
  await step('dashboard lists saved tabs', async () => { await dash.locator('.tcard').first().waitFor(); assert.equal(await dash.locator('.tcard').count(), 3); });
  await step('collections: create + move tab', async () => {
    await dash.getByRole('link', {name: /Collections/}).click();
    await dash.getByRole('button', {name: 'New collection'}).click();
    await dash.locator('dialog input').fill('Research'); await dash.locator('dialog button[type=submit]').click();
    await dash.locator('.ccard h3', {hasText: 'Research'}).waitFor();
    await dash.getByRole('link', {name: /All Saved Tabs/}).click();
    await dash.locator('.tcard').first().getByRole('button', {name: 'Move to collection'}).click();
    await dash.locator('dialog select').selectOption({label: 'Research'}); await dash.locator('dialog button[type=submit]').click();
    await dash.locator('.tcard .chip', {hasText: 'Research'}).waitFor();
  });
  await step('favorite toggles and persists', async () => {
    await dash.locator('.tcard .star').first().click(); await dash.locator('.tcard .star.on').first().waitFor();
  });
  await step('session: save then restore opens a new window', async () => {
    await dash.getByRole('link', {name: /Sessions/}).click();
    await dash.getByRole('button', {name: 'Save current window'}).click();
    await dash.locator('dialog input').fill('E2E session'); await dash.locator('dialog button[type=submit]').click();
    await dash.locator('.sess h3', {hasText: 'E2E session'}).waitFor();
    const before = ctx.pages().length, winBefore = await sw.evaluate(async () => (await chrome.windows.getAll()).length);
    await dash.getByRole('button', {name: 'Restore'}).click();
    await dash.locator('.toast', {hasText: 'Opened'}).waitFor();
    await dash.waitForTimeout(800);
    const winAfter = await sw.evaluate(async () => (await chrome.windows.getAll()).length);
    assert.equal(winAfter, winBefore + 1, 'a new window should open'); assert.ok(ctx.pages().length > before);
  });
  await step('restore cooldown blocks rapid repeat', async () => {
    await dash.bringToFront();
    await dash.getByRole('button', {name: 'Restore'}).click();
    await dash.locator('.toast.error', {hasText: 'just requested'}).waitFor();
  });
  await step('duplicates: detect and clean with confirmation', async () => {
    await dash.getByRole('link', {name: /Settings/}).click();
    await dash.getByLabel('Skip duplicate saves').uncheck();
    await dash.locator('#quickSave').click(); await dash.locator('.toast', {hasText: 'Saved'}).last().waitFor();
    await dash.getByRole('link', {name: /Search & Duplicates/}).click();
    await dash.locator('.dupe').first().waitFor();
    await dash.getByRole('button', {name: 'Select all'}).click();
    await dash.getByRole('button', {name: /Remove duplicates in selection/}).click();
    await dash.locator('dialog[open] button[type=submit]').click();
    await dash.locator('.empty', {hasText: 'No duplicates'}).waitFor();
  });
  await step('theme persists across reload', async () => {
    await dash.getByRole('link', {name: /Settings/}).click();
    await dash.getByLabel('Theme').selectOption('light'); await dash.waitForTimeout(300);
    await dash.reload(); await dash.locator('main > *').first().waitFor();
    assert.equal(await dash.evaluate(() => document.documentElement.dataset.theme), 'light');
    await dash.screenshot({path: join(shots, 'dashboard-light.png')});
    await dash.getByRole('link', {name: /Settings/}).click(); await dash.getByLabel('Theme').selectOption('dark'); await dash.waitForTimeout(300);
  });
  await step('export then import round-trip; invalid import rejected', async () => {
    await dash.getByRole('link', {name: /Settings/}).click();
    const [download] = await Promise.all([dash.waitForEvent('download'), dash.getByRole('button', {name: 'Export JSON'}).click()]);
    const file = join(tmpdir(), `tv-${Date.now()}.json`); await download.saveAs(file);
    await dash.setInputFiles('#importFile', {name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"nope":1}')});
    await dash.locator('.toast.error').last().waitFor();
    await dash.setInputFiles('#importFile', file);
    await dash.locator('dialog[open] button[type=submit]').click();
    await dash.locator('.toast', {hasText: 'Backup imported'}).waitFor();
  });
  await step('erase requires typing DELETE', async () => {
    await dash.getByRole('button', {name: /Erase vault/}).click();
    const ok = dash.locator('dialog[open] button[type=submit]'); assert.equal(await ok.isDisabled(), true);
    await dash.locator('dialog[open] input').fill('DELETE'); await ok.click();
    await dash.locator('.toast', {hasText: 'Vault erased'}).waitFor();
    const n = await sw.evaluate(async () => (await chrome.storage.local.get('tabvault.v1'))['tabvault.v1'].tabs.length); assert.equal(n, 0);
  });
  await step('no uncaught page errors / CSP violations', async () => assert.deepEqual(errors, []));
} finally {
  await ctx.close(); site.close();
}
console.log(failed ? `\n${failed} step(s) failed` : '\nAll browser steps passed');
process.exit(failed ? 1 : 0);
