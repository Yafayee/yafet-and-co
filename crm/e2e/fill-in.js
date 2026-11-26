// Browser test of the "Complete profiles" screen: products, consent and personal
// facts are set with single clicks and are stored on the profile.
const { chromium } = require('playwright');
const [,, base, data, shots] = process.argv;
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  p.on('pageerror', e => log('PAGEERROR', e.message.slice(0, 300)));
  await p.goto(base + '/', { waitUntil: 'networkidle' });
  const pw = p.locator('input[type=password]');
  await pw.nth(0).fill('blauer Tisch Wolke 47 Fenster'); await pw.nth(1).fill('blauer Tisch Wolke 47 Fenster'); await p.click('button:has-text("Create workspace")');
  await p.waitForSelector('text=Your workspace is ready');
  await p.click('nav a:has-text("Import")'); await p.setInputFiles('input[type=file]', data + '/wohn.csv'); await p.click('button:has-text("Create 3")'); await p.waitForSelector('text=Import finished');
  await p.click('nav a:has-text("Customers")'); await p.click('a:has-text("Complete profiles")');
  await p.waitForSelector('h1:has-text("Complete profiles")');
  log('subtitle:', await p.locator('h1 + p').innerText(), '| rows:', await p.locator('[data-testid=fill-row]').count());
  const row = p.locator('[data-testid=fill-row]').first();
  const name = await row.locator('a').first().innerText();
  log('first row:', name, '|', await row.locator('.chip').last().innerText());
  await row.locator('button:has-text("Accident")').click();
  for (const k of ['Email', 'WhatsApp', 'Product offers']) { const btn = row.locator(`button:has-text("${k}")`); if ((await btn.getAttribute('aria-pressed')) !== 'true') await btn.click(); }
  for (const [label, value] of [['Owns a car', 'yes'], ['Home', 'rent'], ['Children', 'no'], ['Marital status', 'single'], ['Work', 'employed']]) await row.locator(`label:has-text("${label}") select`).selectOption(value);
  await p.waitForTimeout(700);
  log('after filling:', await row.locator('.chip').last().innerText(), '| still listed while working:', (await row.locator('a').first().innerText()) === name);
  log('accident pressed:', await row.locator('button:has-text("Accident")').getAttribute('aria-pressed'));
  await p.screenshot({ path: shots + '/i_fill.png', fullPage: true });
  await row.locator('a').first().click(); await p.waitForSelector('text=Cover check');
  const txt = await p.locator('main').innerText();
  log('profile shows:', ['Owns a car', 'Rents', 'Single', 'Employed', 'Accident'].map((w) => w + '=' + txt.includes(w)).join(' '));
  log('consent event in history:', /Consent for .* given/.test(txt));
  await p.goBack(); await p.waitForSelector('h1:has-text("Complete profiles")');
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(300);
  log('mobile overflow:', await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
  await b.close(); log('done');
})().catch(e => { log('FAILED', e.message.slice(0, 500)); process.exit(1); });
