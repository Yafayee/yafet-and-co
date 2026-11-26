// Covers: one open tab at a time, phone normalisation, duplicate warning, quick search, sorting, undo import, task deletion.
const { chromium } = require('playwright');
const [,, base, data, shots] = process.argv;
const PASS = 'blauer Tisch Wolke 47 Fenster';
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => log('PAGEERROR', e.message.slice(0, 300)));
  await p.goto(base + '/', { waitUntil: 'networkidle' });
  const pw = p.locator('input[type=password]'); await pw.nth(0).fill(PASS); await pw.nth(1).fill(PASS); await p.click('button:has-text("Create workspace")');
  await p.waitForSelector('text=Your workspace is ready');

  // a second tab must not be able to open the same workspace
  const q = await ctx.newPage(); await q.goto(base + '/', { waitUntil: 'networkidle' });
  await q.fill('input[type=password]', PASS); await q.click('button:has-text("Unlock")'); await q.waitForSelector('p[role=alert]');
  log('second tab:', (await q.locator('p[role=alert]').innerText()).slice(0, 60));
  await p.click('aside button:has-text("Lock workspace")'); await p.waitForSelector('text=Unlock your workspace');
  await q.click('button:has-text("Unlock")'); await q.waitForSelector('text=Your workspace is ready'); log('second tab after the first locked: opened');
  await q.close();
  await p.fill('input[type=password]', PASS); await p.click('button:has-text("Unlock")'); await p.waitForSelector('text=Your workspace is ready');

  // add by hand: phone is stored with country code, a bad number is refused, a duplicate is flagged
  await p.click('a:has-text("Add one by hand")'); await p.waitForSelector('text=New customer');
  const field = (label) => p.locator(`form label:has(span:text-is("${label}")) input`);
  await field('First name').fill('Yafet'); await field('Last name').fill('Teshome'); await field('Email').fill('yafet@example.com');
  await p.locator('form label:has-text("Phone") input').fill('12'); await p.click('button:has-text("Create profile")');
  log('bad phone:', (await p.locator('form p[role=alert]').innerText()).slice(0, 40));
  await p.locator('form label:has-text("Phone") input').fill('0660 123 45 67'); await p.click('button:has-text("Create profile")');
  await p.waitForSelector('text=Cover check');
  log('stored phone:', (await p.locator('dl').first().innerText()).match(/\+\d+/)[0]);
  await p.click('nav a:has-text("Customers")'); await p.click('button:has-text("Add customer")');
  await field('First name').fill('Yafet'); await field('Last name').fill('Teshome'); await p.click('button:has-text("Create profile")');
  log('duplicate:', (await p.locator('form p[role=alert]').innerText()).slice(0, 50));
  await p.click('form button:has-text("Cancel")');

  // import, sort, quick search, undo
  await p.click('nav a:has-text("Import")'); await p.setInputFiles('input[type=file]', data + '/wohn.csv'); await p.click('button:has-text("Create 3")'); await p.waitForSelector('text=Import finished');
  await p.click('nav a:has-text("Customers")'); await p.waitForSelector('tbody tr');
  const names = async () => (await p.locator('tbody tr td:first-child a span span:first-child').allInnerTexts()).join(', ');
  log('by name:', await names());
  await p.selectOption('select[aria-label="Sort by"]', 'birthday'); log('by birthday:', await names());
  await p.selectOption('select[aria-label="Sort by"]', 'cover'); log('by cover:', await names());
  await p.fill('input[aria-label="Find a customer"]', 'kredit'); await p.waitForSelector('#quick-search-list button');
  log('quick search:', (await p.locator('#quick-search-list button').allInnerTexts()).map(x => x.split('\n')[0]).join(', '));
  await p.keyboard.press('Enter'); await p.waitForSelector('h1:has-text("Karl Kreditnehmer")'); log('enter opens:', await p.locator('h1').innerText());
  await p.fill('[data-testid=agenda-form] input[aria-label=What]', 'Rückruf'); await p.click('[data-testid=agenda-form] button:has-text("Plan")'); await p.click('button[aria-label="Delete task"]');
  log('tasks after delete:', await p.locator('button[aria-label="Delete task"]').count());
  await p.click('nav a:has-text("Import")'); await p.waitForSelector('text=Last import');
  await p.click('button:has-text("Undo this import")'); await p.click('button:has-text("Yes, undo the import")');
  await p.click('nav a:has-text("Customers")'); await p.waitForSelector('tbody tr');
  log('after undo:', await p.locator('h1 + p').innerText(), '|', await names());
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(200);
  log('mobile overflow:', await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
  log('done'); await b.close();
})().catch(e => { console.log('FAILED', e.message.slice(0, 600)); process.exit(1); });
