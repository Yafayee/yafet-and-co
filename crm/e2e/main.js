const { chromium } = require('playwright');
const fs = require('fs');
const [,, base, data, shots] = process.argv;
const PASS = 'correct horse battery 42';
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => log('PAGEERROR', e.message.slice(0, 300)));
  p.on('console', m => { if (m.type() === 'error') log('CONSOLE', m.text().slice(0, 300)); });
  const go = async (u) => { await p.goto(base + u, { waitUntil: 'networkidle' }); };
  const unlock = async (pw = PASS) => { await p.fill('input[type=password]', pw); await p.click('button:has-text("Unlock")'); };

  // 1. setup
  await go('/');
  await p.waitForSelector('text=Set up your secure workspace');
  await p.screenshot({ path: shots + '/e_setup.png' });
  const pw = p.locator('input[type=password]');
  await pw.nth(0).fill('short'); await pw.nth(1).fill('short'); await p.click('button:has-text("Create workspace")');
  log('short pass:', await p.locator('p[role=alert]').innerText());
  await pw.nth(0).fill(PASS); await pw.nth(1).fill(PASS); await p.click('button:has-text("Create workspace")');
  await p.waitForSelector('text=Your workspace is ready');
  await p.screenshot({ path: shots + '/e_empty.png' });

  // 2. import CSV (client-side nav keeps the workspace unlocked)
  await p.click('nav a:has-text("Import")');
  await p.setInputFiles('input[type=file]', data + '/kunden-1000.csv');
  await p.waitForSelector('text=Check before creating');
  log('mapping:', (await p.locator('thead select').evaluateAll(s => s.map(x => x.value))).join(' | '));
  log('summary:', (await p.locator('section:has-text("Check before creating") .chip').allInnerTexts()).join(' | '));
  log('first notes:', (await p.locator('section:has-text("Check before creating") li').allInnerTexts()).slice(0, 4).join(' || '));
  await p.screenshot({ path: shots + '/e_import.png', fullPage: true });
  let t = Date.now();
  await p.click('button:has-text("Create 1001")');
  await p.waitForSelector('text=Import finished');
  log('import done in ms', Date.now() - t, '|', await p.locator('text=profiles created').first().innerText());

  // 3. customers list
  t = Date.now();
  await p.click('nav a:has-text("Customers")');
  await p.waitForSelector('tbody tr');
  log('customers:', await p.locator('h1 + p').innerText(), 'rows on page', await p.locator('tbody tr').count(), 'render ms', Date.now() - t);
  await p.fill('input[placeholder^="Search"]', 'müller');
  log('search müller:', await p.locator('h1 + p').innerText());
  await p.fill('input[placeholder^="Search"]', '');
  await p.screenshot({ path: shots + '/e_customers.png' });

  // 4. dashboard with data
  await p.click('nav a:has-text("Dashboard")');
  await p.waitForSelector('text=Open opportunities');
  log('tiles:', (await p.locator('.card .label').allInnerTexts()).slice(0,5).join(',') , (await p.locator('.card .text-3xl').allInnerTexts()).join(','));
  await p.screenshot({ path: shots + '/e_dashboard.png', fullPage: true });

  // 5. wait for save, check stored blob is encrypted, reload -> locked
  await p.waitForTimeout(1500);
  const stored = await p.evaluate(() => new Promise(res => { const r = indexedDB.open('cp-crm'); r.onsuccess = () => { const g = r.result.transaction('vault').objectStore('vault').get('workspace'); g.onsuccess = () => res(JSON.stringify(g.result)); }; }));
  log('stored bytes', stored.length, 'contains plaintext name/email:', /Gruber|example\.com|Testgasse/.test(stored));
  await go('/customers/');
  await p.waitForSelector('text=Unlock your workspace');
  await unlock('wrong passphrase 1'); await p.waitForSelector('p[role=alert]');
  log('wrong pass:', await p.locator('p[role=alert]').innerText());
  t = Date.now(); await unlock(); await p.waitForSelector('tbody tr');
  log('after reload:', await p.locator('h1 + p').innerText(), 'unlock ms', Date.now() - t);

  // 6. profile: open first, consent toggle, log reply, add task, policy
  await p.locator('tbody tr a').first().click();
  await p.waitForSelector('text=Policies and products');
  const name = await p.locator('h1').innerText();
  await p.screenshot({ path: shots + '/e_profile.png', fullPage: true });
  await p.selectOption('form:has(button:has-text("Add")) select >> nth=0', 'reply').catch(() => {});
  await p.locator('select:has(option[value="reply"])').selectOption('reply');
  await p.fill('input[placeholder="What the customer wrote"]', 'Bitte um Rückruf wegen Kfz');
  await p.locator('label:has-text("Interested in") select').selectOption('Car');
  await p.locator('form:has(input[placeholder="What the customer wrote"]) button:has-text("Add")').click();
  await p.fill('[data-testid=agenda-form] input[aria-label=What]', 'Rückruf');
  await p.click('[data-testid=agenda-form] button:has-text("Plan")');
  log('profile', name, '| timeline entries', await p.locator('ol > li').count());
  await p.click('nav a:has-text("Replies")');
  await p.waitForSelector('text=Bitte um Rückruf');
  log('inbox:', (await p.locator('h2').allInnerTexts()).join(' | '));

  // 7. approvals: send first (block real navigation of mailto/wa)
  await p.click('nav a:has-text("Approvals")');
  await p.waitForSelector('article');
  const n1 = await p.locator('article').count();
  const badge1 = await p.locator('nav a:has-text("Approvals") span.rounded-full').first().innerText();
  await p.screenshot({ path: shots + '/e_approvals.png' });
  const link = p.locator('article a:has-text("Send via")').first();
  const href = await link.getAttribute('href');
  await link.evaluate(a => { a.addEventListener('click', e => e.preventDefault()); a.click(); });
  await p.waitForTimeout(300);
  log('approvals shown', n1, 'badge', badge1, '->', await p.locator('nav a:has-text("Approvals") span.rounded-full').first().innerText(), '| href', decodeURIComponent(href).slice(0, 120).replace(/\n/g, ' '));

  // 8. opportunities
  await p.click('nav a:has-text("Opportunities")');
  await p.waitForSelector('tbody tr');
  log('opps tabs:', (await p.locator('[role=tab]').allInnerTexts()).join(' | '));
  await p.locator('tbody tr select').first().selectOption('won');
  await p.waitForTimeout(200);
  log('after won:', (await p.locator('[role=tab]').allInnerTexts()).join(' | '));
  await p.screenshot({ path: shots + '/e_opps.png' });

  // 9. campaign + queue
  await p.click('nav a:has-text("Campaigns")');
  await p.click('button:has-text("New campaign")');
  await p.fill('input[placeholder="Christmas greetings"]', 'Weihnachten 2026');
  log('reach:', await p.locator('form p:has-text("Reaches")').innerText());
  await p.click('button:has-text("Create campaign")');
  await p.click('a:has-text("Open send list")');
  await p.waitForSelector('article');
  log('queue:', await p.locator('h1 + p').innerText());
  const ql = p.locator('article a:has-text("Send via")').first();
  await ql.evaluate(a => { a.addEventListener('click', e => e.preventDefault()); a.click(); });
  await p.waitForTimeout(300);
  log('queue after 1 send:', await p.locator('h1 + p').innerText());
  await p.screenshot({ path: shots + '/e_queue.png' });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Email list for mail merge")')]);
  const mm = fs.readFileSync(await dl.path(), 'utf8'); log('mail merge lines', mm.split('\r\n').length, '|', mm.split('\r\n')[1].slice(0, 90));

  // 10. settings: backup, erase, restore
  await p.click('nav a:has-text("Settings")');
  await p.waitForSelector('text=Security and backup');
  await p.screenshot({ path: shots + '/e_settings.png', fullPage: true });
  const [bk] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Download encrypted backup")')]);
  const bpath = shots + '/test.crmbackup'; await bk.saveAs(bpath);
  log('backup bytes', fs.statSync(bpath).size, 'plaintext?', /Gruber|example\.com/.test(fs.readFileSync(bpath, 'utf8')));
  await p.fill('input[placeholder="Type ERASE"]', 'ERASE'); await p.click('button:has-text("Erase workspace")');
  await p.waitForSelector('text=Set up your secure workspace');
  await p.click('button:has-text("Restore from a backup")');
  await p.setInputFiles('input[type=file]', bpath);
  await p.fill('input[type=password]', PASS); await p.click('button:has-text("Restore")');
  await p.waitForSelector('nav');
  await p.click('nav a:has-text("Customers")'); await p.waitForSelector('tbody tr');
  log('after restore:', await p.locator('h1 + p').innerText());

  // 11. xlsx import (updates nothing, adds 20)
  await p.click('nav a:has-text("Import")');
  await p.setInputFiles('input[type=file]', data + '/customers.xlsx');
  await p.waitForSelector('text=Check before creating', { timeout: 15000 });
  log('xlsx mapping:', (await p.locator('thead select').evaluateAll(s => s.map(x => x.value))).join(' | '));
  log('xlsx summary:', (await p.locator('section:has-text("Check before creating") .chip').allInnerTexts()).join(' | '));
  await p.click('button:has-text("Create 20")'); await p.waitForSelector('text=Import finished');
  // re-import same CSV: should create 0
  await p.setInputFiles('input[type=file]', data + '/kunden-1000.csv');
  await p.waitForSelector('text=Check before creating');
  log('re-import summary:', (await p.locator('section:has-text("Check before creating") .chip').allInnerTexts()).join(' | '));

  // 12. lock, demo mode, mobile overflow
  await p.click('aside button:has-text("Lock workspace")');
  await p.waitForSelector('text=Unlock your workspace');
  await p.click('button:has-text("Open the demo")');
  await p.waitForSelector('text=Demo with invented customers');
  log('demo tiles:', (await p.locator('.card .text-3xl').allInnerTexts()).join(','));
  await p.screenshot({ path: shots + '/e_demo.png', fullPage: true });
  const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 800 });
  m.on('pageerror', e => log('M PAGEERROR', e.message.slice(0, 200)));
  await m.goto(base + '/', { waitUntil: 'networkidle' }); await m.click('button:has-text("Open the demo")');
  for (const label of ['Dashboard', 'Customers', 'Opportunities', 'Approvals', 'Replies', 'Campaigns', 'Import', 'Settings']) {
    await m.click('button[aria-label="Open menu"]'); await m.click(`.fixed nav a:has-text("${label}")`); await m.waitForTimeout(250);
    const o = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (o > 0) log('MOBILE OVERFLOW', label, o);
    if (label === 'Customers') { await m.locator('tbody tr a').first().click(); await m.waitForSelector('text=Policies and products'); const o2 = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); if (o2 > 0) log('MOBILE OVERFLOW profile', o2); await m.screenshot({ path: shots + '/e_m_profile.png', fullPage: true }); }
  }
  log('done');
  await b.close();
})().catch(e => { console.log('FAILED', e.message.slice(0, 600)); process.exit(1); });
