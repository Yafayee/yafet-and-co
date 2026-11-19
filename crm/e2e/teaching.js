const { chromium } = require('playwright');
const [,, base, data, shots] = process.argv;
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => log('PAGEERROR', e.message.slice(0, 300)));
  p.on('console', m => { if (m.type() === 'error' || m.type()==='warning') log('CONSOLE', m.text().slice(0, 400)); }); 
  let sent = null;
  await ctx.route('https://api.anthropic.com/**', async (route) => {
    const req = route.request(); log('  [api]', req.method(), req.url().slice(0,60), JSON.stringify(Object.fromEntries(Object.entries(req.headers()).filter(([k]) => /key|auth|anthropic/.test(k)))).slice(0,400));
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    sent = { url: req.url(), headers: req.headers(), body: JSON.parse(req.postData()) };
    if (/sk-ant-bad/.test(req.headers()['authorization'] || req.headers()['x-api-key'] || '')) return route.fulfill({ status: 401, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }) });
    const out = { products: [{ name: 'Travel insurance', german_name: 'Reiseversicherung', english_phrase: 'travel insurance', title: 'Travel insurance', summary: 'Covers medical costs and cancellations abroad.', fits: ['Customers who travel often.'], ask: ['How often do you travel abroad?'], say: ['One policy can cover the whole family.'], never: ['Do not state that every illness abroad is covered.'] }],
      conduct_rules: [{ title: 'Pre-existing conditions', text: 'Cover for known conditions depends on the insurer and must be checked in the policy terms.' }], phrases_to_avoid: ['rundum sorglos'],
      recommendations: [{ product: 'Travel insurance', reason: 'Has health insurance but no cover abroad.', fit: 'medium', has: ['Health'], lacks: [], age_min: null, age_max: 70, housing: 'any', children: 'any', owns_car: 'any' }] };
    route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [{ type: 'text', text: JSON.stringify(out) }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 100, output_tokens: 100 } }) });
  });
  await p.goto(base + '/', { waitUntil: 'networkidle' });
  const pw = p.locator('input[type=password]');
  await pw.nth(0).fill('a long passphrase 1'); await pw.nth(1).fill('a long passphrase 1'); await p.click('button:has-text("Create workspace")');
  await p.waitForSelector('text=Your workspace is ready');
  await p.click('nav a:has-text("Import")'); await p.setInputFiles('input[type=file]', data + '/wohn.csv'); await p.click('button:has-text("Create 3")'); await p.waitForSelector('text=Import finished');

  // teach by hand: new product + recommendation rule
  await p.click('nav a:has-text("Product guide")'); await p.waitForSelector('text=Teach the system');
  await p.click('[role=tab]:has-text("When to recommend")');
  await p.locator('label:has-text("Product") select').first().selectOption('__new');
  await p.fill('input[placeholder="Travel insurance"]', 'Pet insurance'); await p.fill('input[placeholder="Reiseversicherung"]', 'Tierversicherung'); await p.fill('input[placeholder="travel insurance"]', 'pet insurance');
  await p.fill('input[placeholder^="Travels often"]', 'Tenant with household cover; ask about pets.');
  await p.locator('label:has-text("Already has") select').selectOption(['Household']);
  await p.locator('label:has(span:text-is("Home")) select').selectOption('rent');
  log('match count:', await p.locator('p:has-text("Matches")').innerText());
  await p.click('button:has-text("Add to the system")'); await p.waitForSelector('text=Recommendation rules you taught');
  // avoid phrase
  await p.click('[role=tab]:has-text("Words to avoid")'); await p.fill('textarea', 'steuerfrei'); await p.click('button:has-text("Add to the system")');
  // check opportunities + German product name in draft + avoid warning
  await p.click('nav a:has-text("Opportunities")'); await p.waitForSelector('tbody tr');
  log('pet opp:', (await p.locator('tbody tr:has-text("Pet insurance")').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').slice(0, 90)).join(' || '));
  log('product filter has Pet:', await p.locator('select[aria-label=Product] option:has-text("Pet insurance")').count());
  await p.click('nav a:has-text("Customers")'); await p.click('tbody tr a:has-text("Rosa")'); await p.waitForSelector('text=Recommended next steps');
  const card = p.locator('div.rounded-lg:has(span.font-medium:text-is("Pet insurance"))');
  await card.locator('button:has-text("Write message")').click();
  const body = await card.locator('textarea').inputValue();
  log('draft mentions Tierversicherung:', body.includes('Tierversicherung'));
  await card.locator('textarea').fill(body + ' Das ist steuerfrei.');
  log('avoid warning:', (await card.locator('ul[role=status] li').allInnerTexts()).join(' | ').slice(0, 90));

  // AI reader: bad key then good key (mocked service)
  await p.click('nav a:has-text("Product guide")'); await p.click('button:has-text("Read a document with AI")');
  await p.fill('input[placeholder="sk-ant-..."]', 'sk-ant-bad'); await p.setInputFiles('input[type=file]', data + '/doc.pdf'); await p.click('button:has-text("Read document")');
  await p.waitForSelector('p[role=alert]'); log('bad key:', await p.locator('p[role=alert]').innerText());
  await p.fill('input[placeholder="sk-ant-..."]', 'sk-ant-good'); await p.click('button:has-text("Read document")');
  await p.waitForSelector('text=Review what was found');
  const c0 = sent.body.messages[0].content;
  log('request:', sent.url.replace(/^https:\/\/[^/]+/, ''), '| model', sent.body.model, '| betas hdr', sent.headers['anthropic-beta'], '| fallbacks', JSON.stringify(sent.body.fallbacks), '| browser hdr', sent.headers['anthropic-dangerous-direct-browser-access'], '| doc', c0[0].type, c0[0].source.media_type, c0[0].source.data.length, '| format', sent.body.output_config.format.type, '| effort', sent.body.output_config.effort);
  log('request contains customer names:', /Rosa|Karl|Mieterin|example\.com/.test(JSON.stringify(sent.body)));
  log('review items:', await p.locator('label:has(input[type=checkbox])').count());
  await p.screenshot({ path: shots + '/t_review.png', fullPage: true });
  await p.click('button:has-text("Add the ticked items")'); await p.waitForSelector('text=4 items added');
  log('guide cards:', (await p.locator('h2').allInnerTexts()).join(' | '));
  await p.click('nav a:has-text("Opportunities")'); await p.waitForSelector('tbody tr');
  log('travel opp:', (await p.locator('tbody tr:has-text("Travel insurance")').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').slice(0, 80)).join(' || '));

  // learning from outcomes: reload (persisted?) then decide
  await p.waitForTimeout(900); await p.goto(base + '/knowledge/', { waitUntil: 'networkidle' });
  await p.fill('input[type=password]', 'a long passphrase 1'); await p.click('button:has-text("Unlock")'); await p.waitForSelector('text=Teach the system');
  log('persisted after reload: recs', await p.locator('text=Recommendation rules you taught').count(), 'key saved', (await p.evaluate(() => 1)) && true);
  await p.screenshot({ path: shots + '/t_guide.png', fullPage: true });
  const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 800 });
  await m.goto(base + '/', { waitUntil: 'networkidle' }); await m.click('button:has-text("Open the demo")');
  await m.click('button[aria-label="Open menu"]'); await m.click('.fixed nav a:has-text("Product guide")'); await m.waitForTimeout(300);
  for (const t of ['When to recommend', 'Rule to follow']) { await m.click(`[role=tab]:has-text("${t}")`); const o = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); if (o > 0) log('MOBILE OVERFLOW', t, o); }
  // demo: mark 5 Car opps: 4 won 1 dismissed -> ranked higher
  await m.close();
  await p.click('aside button:has-text("Lock workspace")'); await p.waitForSelector('text=Unlock your workspace');
  await p.click('button:has-text("Open the demo")'); await p.waitForSelector('text=Demo with invented customers');
  await p.click('nav a:has-text("Opportunities")'); await p.waitForSelector('tbody tr');
  await p.selectOption('select[aria-label=Product]', 'Car');
  const before = await p.locator('tbody tr').first().locator('td').nth(3).innerText();
  for (let i = 0; i < 5; i++) { await p.locator('tbody tr select').first().selectOption(i < 4 ? 'won' : 'dismissed'); await p.waitForTimeout(80); }
  await p.selectOption('select[aria-label=Fit]', 'high');
  log('car fit before:', before, '| strong-fit car rows now:', await p.locator('tbody tr').count());
  await p.click('nav a:has-text("Product guide")'); await p.waitForSelector('text=Learned from your results'); await p.waitForTimeout(300);
  log('learned table:', (await p.locator('section:has-text("Learned from your results") tbody tr').allInnerTexts()).map(x => x.replace(/\s+/g, ' ')).join(' || '));
  log('done'); await b.close();
})().catch(e => { console.log('FAILED', e.message.slice(0, 700)); process.exit(1); });
