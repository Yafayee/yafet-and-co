const { chromium } = require('playwright');
const [,, base, data, shots] = process.argv;
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => log('PAGEERROR', e.message.slice(0, 300)));
  p.on('console', m => { if (m.type() === 'error') log('CONSOLE', m.text().slice(0, 300)); });
  await p.clock.install();
  await p.goto(base + '/', { waitUntil: 'networkidle' });
  const pw = p.locator('input[type=password]');
  for (const bad of ['short', 'password12345', '111111111111', 'aaaaaaaaaaaaaaa']) {
    await pw.nth(0).fill(bad); await pw.nth(1).fill(bad); await p.click('button:has-text("Create workspace")');
    log('rejected', JSON.stringify(bad), '->', await p.locator('p[role=alert]').innerText());
  }
  await pw.nth(0).fill('blauer Tisch Wolke 47 Fenster');
  log('meter:', await p.locator('div[role=status] p').innerText());
  await pw.nth(1).fill('blauer Tisch Wolke 47 Fenster'); await p.click('button:has-text("Create workspace")');
  await p.waitForSelector('text=Your workspace is ready');
  log('version notice on a fresh workspace:', await p.locator('button:has-text("OK, noted")').count());
  await p.click('nav a:has-text("Import")'); await p.setInputFiles('input[type=file]', data + '/wohn.csv'); await p.click('button:has-text("Create 3")'); await p.waitForSelector('text=Import finished');
  log('backup reminder shown:', await p.locator('text=You have no backup yet').count());
  await p.click('nav a:has-text("Settings")'); await p.waitForSelector('text=Security checklist');
  log('checklist:', await p.locator('section:has-text("Security checklist") .chip').first().innerText());
  log('auto items:', (await p.locator('section:has-text("Security checklist") ul >> nth=0 >> li').evaluateAll(ls => ls.map(l => (l.querySelector('svg').getAttribute('aria-label')) + ': ' + l.innerText.split('\n')[0]))).join(' | '));
  await p.locator('section:has-text("Security checklist") input[type=checkbox]').first().check();
  const [bk] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Download encrypted backup")')]);
  await p.waitForTimeout(300);
  log('checklist after 2FA tick + backup:', await p.locator('section:has-text("Security checklist") .chip').first().innerText(), '|', await p.locator('text=Last backup downloaded').innerText());
  await p.click('button:has-text("Export customers")');
  log('export warning:', (await p.locator('div[role=alert]:has-text("plain text")').innerText()).slice(0, 70));
  const [csv] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Download the plain file anyway")')]);
  log('csv file:', csv.suggestedFilename());
  await p.screenshot({ path: shots + '/s_settings.png', fullPage: true });
  // weak change rejected
  const f = p.locator('form:has(button:has-text("Change passphrase"))');
  await f.locator('input').nth(0).fill('blauer Tisch Wolke 47 Fenster'); await f.locator('input').nth(1).fill('qwertz123456'); await f.locator('input').nth(2).fill('qwertz123456');
  await f.locator('button:has-text("Change passphrase")').click(); await p.waitForTimeout(300);
  log('weak change:', await f.locator('p[role=status] >> nth=-1').innerText());
  // clock-based auto lock: simulate the computer sleeping for 20 minutes
  await p.waitForTimeout(600);
  await p.clock.fastForward('00:20:00');
  await p.waitForSelector('text=Unlock your workspace', { timeout: 20000 });
  log('locked after 20 idle minutes: yes');
  await p.fill('input[type=password]', 'blauer Tisch Wolke 47 Fenster'); await p.click('button:has-text("Unlock")'); await p.waitForSelector('nav');
  log('after unlock: weak banner', await p.locator('text=Your passphrase is weak').count(), '| backup reminder', await p.locator('text=You have no backup yet').count(), '| version notice', await p.locator('button:has-text("OK, noted")').count());
  const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 800 });
  await m.goto(base + '/settings/', { waitUntil: 'networkidle' }); await m.click('button:has-text("Open the demo")'); await m.waitForSelector('text=Security checklist');
  log('mobile overflow settings:', await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
  log('done'); await b.close();
})().catch(e => { console.log('FAILED', e.message.slice(0, 600)); process.exit(1); });
