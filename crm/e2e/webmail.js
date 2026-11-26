// Browser test of sending through the company webmail: the panel opens, the
// address, subject and text are copied, and "Mark as sent" records the message.
const { chromium } = require('playwright');
const [,, base, , shots] = process.argv;
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  p.on('pageerror', e => log('PAGEERROR', e.message.slice(0, 300)));
  await p.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective)); });
  await p.goto(base + '/', { waitUntil: 'networkidle' });
  await p.click('button:has-text("Open the demo")'); await p.waitForSelector('h1:has-text("Dashboard")');
  await p.click('nav a:has-text("Settings")');
  await p.selectOption('label:has-text("Send emails with") select', 'webmail');
  log('default webmail address:', await p.locator('label:has-text("Address of the company webmail") input').inputValue());
  await p.click('nav a:has-text("Approvals")'); await p.waitForTimeout(600);
  const card = p.locator('button:has-text("Send via company webmail")').first();
  log('webmail buttons:', await p.locator('button:has-text("Send via company webmail")').count(), '| mailto/gmail links:', await p.locator('a[href^="mailto:"], a[href^="https://mail.google.com"]').count());
  await card.click();
  const panel = p.locator('[data-testid=webmail-panel]').first();
  await panel.waitFor();
  const clip = () => p.evaluate(() => navigator.clipboard.readText());
  log('copied on open:', /@/.test(await clip()) ? 'an email address' : 'NOTHING');
  log('open link:', await panel.locator('a:has-text("Open company webmail")').getAttribute('href'), await panel.locator('a:has-text("Open company webmail")').getAttribute('target'));
  await panel.locator('button:has-text("Copy subject")').click(); log('subject copied:', (await clip()).slice(0, 40));
  await panel.locator('button:has-text("Copy text")').click(); log('text copied starts:', (await clip()).slice(0, 25).replace(/\n/g, ' '));
  await p.screenshot({ path: shots + '/j_webmail.png' });
  const firstName = async () => (await p.locator('button:has-text("Send via company webmail")').first().locator('xpath=ancestor::*[contains(concat(" ", @class, " "), " card ")][1]').innerText()).split('\n').map((x) => x.trim()).filter((x) => x.length > 3)[0];
  const before = await firstName();
  await panel.locator('button:has-text("Mark as sent")').click(); await p.waitForTimeout(600);
  const after = await firstName();
  log('first suggestion before/after marking sent:', before, '->', after); if (before === after) log('FAILED message was not recorded');
  log('policy violations:', JSON.stringify(await p.evaluate(() => window.__csp)));
  await b.close(); log('done');
})().catch(e => { log('FAILED', e.message.slice(0, 500)); process.exit(1); });
