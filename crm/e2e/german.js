const { chromium } = require('playwright');
const [,, base, shots, which] = process.argv;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('cp-crm-lang', 'de'); } catch {} });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 300)));
  p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
  await p.goto(base + '/', { waitUntil: 'networkidle' });
  await p.waitForSelector('text=Sicheren Arbeitsbereich einrichten');
  const dump = async (name) => { const txt = await p.evaluate(() => document.querySelector('main')?.innerText || document.body.innerText); if (!which || which === name) console.log(`\n===== ${name}\n` + txt.replace(/\n{2,}/g, '\n').slice(0, 60000)); await p.screenshot({ path: `${shots}/de_${name}.png`, fullPage: true }); };
  await dump('setup');
  await p.click('button:has-text("Demo mit erfundenen Kunden öffnen")'); await p.waitForSelector('nav');
  if (!which || which === 'nav') console.log('\n===== nav\n' + (await p.locator('aside').innerText()).replace(/\n+/g, ' | '));
  await p.waitForTimeout(300); await dump('dashboard');
  await p.click('aside nav a >> nth=1'); await p.waitForSelector('tbody tr'); await dump('customers');
  await p.click('tbody tr a >> nth=0'); await p.waitForSelector('text=Deckungscheck'); await dump('profile');
  for (const [i, name] of [[2, 'opportunities'], [3, 'approvals'], [4, 'inbox'], [5, 'campaigns'], [6, 'guide'], [7, 'import'], [8, 'settings']]) { await p.click(`aside nav a >> nth=${i}`); await p.waitForTimeout(500); await dump(name); }
  const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); console.log('\noverflow desktop', o);
  await p.setViewportSize({ width: 390, height: 800 }); 
  for (const u of ['/', '/customers/', '/settings/']) { await p.click('button[aria-label="Menü öffnen"]'); await p.click(`.fixed nav a[href$="${u === '/' ? '/crm-none' : u}"]`).catch(async () => { await p.click('.fixed nav a >> nth=0'); }); await p.waitForTimeout(300); const m = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); if (m > 0) console.log('MOBILE OVERFLOW', u, m); }
  console.log('done'); await b.close();
})().catch(e => { console.log('FAILED', e.message.slice(0, 500)); process.exit(1); });
