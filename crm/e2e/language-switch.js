const { chromium } = require('playwright');
const [,, base, shots, proxy] = process.argv;
(async () => {
  const b = await chromium.launch(proxy ? { proxy: { server: process.env.HTTPS_PROXY } } : {}); const p = await b.newPage({ viewport: { width: 1366, height: 900 }, ignoreHTTPSErrors: true });
  p.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 200)));
  await p.goto(base + '/', { waitUntil: 'networkidle' });
  await p.click('button:text-is("Deutsch")'); console.log('lock screen ->', await p.locator('h1').innerText());
  await p.click('button:has-text("Demo mit erfundenen Kunden öffnen")'); await p.waitForSelector('aside');
  console.log('desktop switch visible:', await p.locator('main button:text-is("English")').isVisible(), '| h1', await p.locator('h1').innerText());
  await p.screenshot({ path: shots + '/sw_desktop.png' });
  await p.click('main button:text-is("English")'); await p.waitForTimeout(200); console.log('-> EN h1', await p.locator('h1').innerText());
  await p.click('aside nav a >> nth=1'); await p.waitForSelector('tbody tr');
  await p.click('main button:text-is("Deutsch")'); await p.waitForTimeout(200); console.log('on customers -> DE h1', await p.locator('h1').innerText());
  await p.setViewportSize({ width: 390, height: 800 }); await p.waitForTimeout(200);
  console.log('mobile switch visible:', await p.locator('header button:text-is("EN")').isVisible(), '| overflow', await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
  await p.click('header button:text-is("EN")'); await p.waitForTimeout(200); console.log('mobile -> EN h1', await p.locator('h1').innerText());
  await p.screenshot({ path: shots + '/sw_mobile.png' });
  await b.close();
})().catch(e => { console.log('FAILED', e.message.slice(0, 400)); process.exit(1); });
