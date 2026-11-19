// Browser test of the security hardening: script policy, recovery code,
// passkey as a second factor (with a virtual passkey), guess throttling,
// upgrade of data stored in the old format, privacy screen and frame refusal.
const { chromium } = require('playwright');
const [,, base, data, shots] = process.argv;
const log = (...a) => console.log(...a);
const PASS = 'blauer Tisch Wolke 47 Fenster', PASS2 = 'gruene Lampe Fluss 82 Garten', PASS3 = 'roter Stuhl Berg 19 Wiese';
const fail = (m) => { log('FAILED', m); };
const stored = (p) => p.evaluate(() => new Promise((res) => { const r = indexedDB.open('cp-crm', 1); r.onsuccess = () => { const g = r.result.transaction('vault').objectStore('vault').get('workspace'); g.onsuccess = () => res(g.result); }; }));

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + (e.blockedURI || '') + ' @' + (e.sourceFile || '').split('/').pop() + ':' + e.lineNumber), true); });
  const p = await ctx.newPage();
  p.on('pageerror', e => log('PAGEERROR', e.message.slice(0, 300)));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', ctap2Version: 'ctap2_1', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true, hasPrf: true } });

  const unlock = async (pass) => { await p.locator('input[type=password]').fill(pass); await p.click('button:has-text("Unlock")'); };
  const lock = async () => { await p.click('button:has-text("Lock")'); await p.waitForSelector('text=Unlock your workspace'); };
  const settings = async () => { await p.click('nav a:has-text("Settings")'); await p.waitForSelector('text=Extra protection'); };

  // 1. create a workspace, visit every page: the tightened policy must not block anything
  await p.goto(base + '/', { waitUntil: 'networkidle' });
  const policy = await p.locator('meta[http-equiv="Content-Security-Policy"]').first().getAttribute('content');
  log('script policy:', /script-src 'self'( 'sha256-[^']+')+;/.test(policy) && !/script-src [^;]*unsafe/.test(policy) ? 'hashes only' : 'FAILED ' + policy);
  const pw = p.locator('input[type=password]');
  await pw.nth(0).fill(PASS); await pw.nth(1).fill(PASS); await p.click('button:has-text("Create workspace")');
  await p.waitForSelector('text=Your workspace is ready');
  await p.click('nav a:has-text("Import")'); await p.setInputFiles('input[type=file]', data + '/wohn.csv'); await p.click('button:has-text("Create 3")'); await p.waitForSelector('text=Import finished');
  for (const name of ['Dashboard', 'Customers', 'Opportunities', 'Approvals', 'Replies & tasks', 'Campaigns', 'Product guide', 'Settings']) { await p.click(`nav a:has-text("${name}")`); await p.waitForTimeout(350); }
  await p.click('nav a:has-text("Customers")'); await p.click('text=Karl Kreditnehmer'); await p.waitForTimeout(500);
  log('policy violations while using the app:', JSON.stringify(await p.evaluate(() => window.__csp)));
  // an injected inline script must not run
  const ran = await p.evaluate(() => { const s = document.createElement('script'); s.textContent = 'window.__injected = true'; document.body.appendChild(s); return Boolean(window.__injected); });
  const blocked = await p.evaluate(() => window.__csp.some((v) => v.startsWith('script-src') && v.includes('inline')));
  log('injected script ran:', ran, '| blocked by policy:', blocked); if (ran || !blocked) fail('injected script was not blocked');
  await p.evaluate(() => { window.__csp = []; });

  // 2. stored format
  const env = await stored(p);
  log('stored format v' + env.v, '| rounds', env.pass.iter, '| recovery', Boolean(env.recovery), '| passkey', Boolean(env.pass.passkey), '| readable name inside:', JSON.stringify(env).includes('Kreditnehmer'));
  if (env.v !== 2 || env.pass.iter < 1000000 || JSON.stringify(env).includes('Kreditnehmer')) fail('stored format');

  // 3. recovery code
  await settings();
  await p.click('button:has-text("Create a recovery code")');
  const code = await p.locator('[data-testid=recovery-code]').innerText();
  log('recovery code shape ok:', /^([0-9A-Z]{5}-){5}[0-9A-Z]{5}$/.test(code));
  await p.click('button:has-text("I have written it down")');
  await p.waitForTimeout(700);
  log('code kept in stored data:', JSON.stringify(await stored(p)).includes(code.replace(/-/g, '')), '| chip:', await p.locator('h3:has-text("Recovery code") .chip').innerText());

  // 4. guess throttling
  await lock();
  for (let i = 0; i < 5; i++) { await unlock('falsches Wort Nummer ' + i + ' xx'); await p.waitForSelector('p[role=alert]'); await p.waitForTimeout(150); }
  const waitMsg = await p.locator('p[role=status]').innerText().catch(() => '');
  log('after 5 wrong attempts:', waitMsg, '| unlock disabled:', await p.locator('button:has-text("Unlock")').isDisabled());
  if (!/seconds/.test(waitMsg)) fail('no throttling');
  await p.reload({ waitUntil: 'networkidle' });
  log('still waiting after reload:', await p.locator('button:has-text("Unlock")').isDisabled());
  await p.evaluate(() => localStorage.removeItem('cp-crm-attempts')); await p.reload({ waitUntil: 'networkidle' });

  // 5. forgotten passphrase: recovery code, new passphrase
  await p.click('button:has-text("Use recovery code")');
  await p.locator('input[placeholder^="XXXXX"]').fill('00000-00000-00000-00000-00000-00000');
  await p.locator('input[type=password]').nth(0).fill(PASS2); await p.locator('input[type=password]').nth(1).fill(PASS2);
  await p.click('button:has-text("Open and set new passphrase")'); await p.waitForSelector('p[role=alert]');
  log('wrong code:', (await p.locator('p[role=alert]').innerText()).slice(0, 50));
  await p.locator('input[placeholder^="XXXXX"]').fill(code.toLowerCase().replace(/-/g, ' '));
  await p.click('button:has-text("Open and set new passphrase")'); await p.waitForSelector('button:has-text("Lock workspace")');
  await p.click('nav a:has-text("Customers")'); await p.waitForSelector('text=of 3 profiles');
  log('opened with the code, customers:', await p.locator('text=Karl Kreditnehmer').count());
  await p.evaluate(() => localStorage.removeItem('cp-crm-attempts'));
  await lock(); await unlock(PASS); await p.waitForSelector('p[role=alert]');
  log('old passphrase after recovery:', await p.locator('p[role=alert]').innerText());
  await unlock(PASS2); await p.waitForSelector('button:has-text("Lock workspace")');
  await settings();
  log('code withdrawn after use:', await p.locator('h3:has-text("Recovery code") .chip').innerText());

  // 6. passkey as a second factor
  log('passkey button before a recovery code exists, disabled:', await p.locator('button:has-text("Switch passkey on")').isDisabled());
  await p.click('button:has-text("Create a recovery code")');
  const code2 = await p.locator('[data-testid=recovery-code]').innerText();
  await p.click('button:has-text("I have written it down")');
  await p.locator('section:has-text("Passkey as a second factor") input[type=password]').fill('falsch falsch falsch'); await p.click('button:has-text("Switch passkey on")'); await p.waitForSelector('section:has-text("Passkey as a second factor") p[role=status]');
  log('passkey with wrong passphrase:', await p.locator('section:has-text("Passkey as a second factor") p[role=status]').innerText());
  await p.locator('section:has-text("Passkey as a second factor") input[type=password]').fill(PASS2); await p.click('button:has-text("Switch passkey on")');
  await p.waitForSelector('button:has-text("Switch passkey off")');
  log('passkey on:', await p.locator('section:has-text("Passkey as a second factor") p[role=status]').innerText());
  await p.waitForTimeout(600);
  const env2 = await stored(p);
  log('stored lock names a passkey:', Boolean(env2.pass.passkey), '| recovery kept:', Boolean(env2.recovery));
  await p.screenshot({ path: shots + '/h_extra_protection.png', fullPage: true });
  const [bk] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("Download encrypted backup")')]);
  const backupPath = shots + '/passkey.crmbackup'; await bk.saveAs(backupPath);
  await lock(); await unlock(PASS2); await p.waitForSelector('button:has-text("Lock workspace")');
  log('unlock with passphrase + passkey: ok');
  // the passkey disappears (lost device): the passphrase alone must not open the data
  await lock();
  await cdp.send('WebAuthn.clearCredentials', { authenticatorId });
  await unlock(PASS2); await p.waitForSelector('p[role=alert]');
  log('passphrase without the passkey:', (await p.locator('p[role=alert]').innerText()).slice(0, 60));
  if (await p.locator('button:has-text("Lock workspace")').count()) fail('opened without passkey');
  // direct attack on the stored data with the right passphrase but no passkey secret
  const direct = await p.evaluate(async (pass) => {
    const env = await new Promise((res) => { const r = indexedDB.open('cp-crm', 1); r.onsuccess = () => { const g = r.result.transaction('vault').objectStore('vault').get('workspace'); g.onsuccess = () => res(g.result); }; });
    const u = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); const e = (s) => new TextEncoder().encode(s);
    try {
      const base = await crypto.subtle.importKey('raw', e(pass), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: u(env.pass.salt), iterations: env.pass.iter, hash: 'SHA-256' }, base, 256);
      for (const info of ['cp-crm:2:passphrase', 'cp-crm:2:passphrase+passkey']) {
        const k = await crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: u(env.pass.salt), info: e(info) }, await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']), { name: 'AES-GCM', length: 256 }, false, ['unwrapKey']);
        try { await crypto.subtle.unwrapKey('raw', u(env.pass.key), k, { name: 'AES-GCM', iv: u(env.pass.iv), additionalData: e('cp-crm:2:pass') }, { name: 'AES-GCM', length: 256 }, true, ['decrypt']); return 'OPENED'; } catch { /* expected */ }
      }
      return 'could not open';
    } catch (err) { return 'error ' + err.message; }
  }, PASS2);
  log('decrypting the stored data with only the passphrase:', direct); if (direct !== 'could not open') fail('passkey not binding');
  // lost passkey: recovery code
  await p.click('button:has-text("Use recovery code")');
  await p.locator('input[placeholder^="XXXXX"]').fill(code2);
  await p.locator('input[type=password]').nth(0).fill(PASS3); await p.locator('input[type=password]').nth(1).fill(PASS3);
  await p.click('button:has-text("Open and set new passphrase")'); await p.waitForSelector('button:has-text("Lock workspace")');
  await settings();
  log('after recovery, passkey:', await p.locator('h3:has-text("Passkey as a second factor") .chip').innerText(), '| activity:', (await p.locator('section:has-text("Activity record") li').first().innerText()).replace(/\n/g, ' ').slice(0, 90));

  // 7. privacy screen
  await p.locator('label:has-text("Privacy screen") input').check({ force: true });
  await p.evaluate(() => window.dispatchEvent(new Event('blur'))); await p.waitForTimeout(150);
  const hidden = await p.locator('[data-testid=privacy-screen]').count();
  await p.evaluate(() => window.dispatchEvent(new Event('focus'))); await p.waitForTimeout(150);
  log('privacy screen when the window loses focus:', hidden, '| back in focus:', await p.locator('[data-testid=privacy-screen]').count());
  log('policy violations in the security flows:', JSON.stringify(await p.evaluate(() => window.__csp)));

  // 8. another browser: the backup made with a passkey opens only with the recovery code
  const ctx2 = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const q = await ctx2.newPage(); q.on('pageerror', e => log('PAGEERROR', e.message.slice(0, 300)));
  await q.goto(base + '/', { waitUntil: 'networkidle' });
  await q.click('button:has-text("Restore from a backup")');
  await q.click('button:has-text("Open the backup with a recovery code instead")');
  await q.setInputFiles('input[type=file]', backupPath); await q.locator('input[placeholder^="XXXXX"]').fill(code2);
  await q.locator('input[type=password]').nth(0).fill(PASS3); await q.locator('input[type=password]').nth(1).fill(PASS3);
  await q.click('button:has-text("Open and set new passphrase")'); await q.waitForSelector('button:has-text("Lock workspace")');
  await q.click('nav a:has-text("Customers")'); await q.waitForSelector('text=of 3 profiles');
  log('backup opened with the recovery code, customers:', await q.locator('text=Karl Kreditnehmer').count());

  // 9. data stored in the old format still opens and is upgraded
  const ctx3 = await b.newContext(); const o = await ctx3.newPage(); o.on('pageerror', e => log('PAGEERROR', e.message.slice(0, 300)));
  await o.goto(base + '/', { waitUntil: 'networkidle' });
  await o.evaluate(async (pass) => {
    const b64 = (u) => btoa(String.fromCharCode(...u)); const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const db = { version: 1, customers: [{ id: 'x1', firstName: 'Alt', lastName: 'Bestand', email: '', phone: '', dob: '', street: '', postcode: '', city: '', language: 'de', occupation: '', ownsCar: 'unknown', interests: [], policies: [], consent: { email: false, sms: false, whatsapp: false, marketing: false }, consentUpdated: '', consentSource: '', preferredChannel: 'email', notes: '', createdAt: '2026-01-01' }], events: [], tasks: [], opp: {}, campaigns: [], audit: [] };
    const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(db))));
    const env = { v: 1, app: 'cp-crm', iter: 600000, salt: b64(salt), iv: b64(iv), data: b64(data), savedAt: Date.now() };
    await new Promise((res) => { const r = indexedDB.open('cp-crm', 1); r.onupgradeneeded = () => r.result.createObjectStore('vault'); r.onsuccess = () => { const t = r.result.transaction('vault', 'readwrite'); t.objectStore('vault').put(env, 'workspace'); t.oncomplete = res; }; });
  }, PASS);
  await o.reload({ waitUntil: 'networkidle' });
  await o.locator('input[type=password]').fill(PASS); await o.click('button:has-text("Unlock")'); await o.waitForSelector('button:has-text("Lock workspace")');
  await o.click('nav a:has-text("Customers")'); await o.waitForTimeout(900);
  const up = await stored(o);
  log('old format: customer visible', await o.locator('text=Alt Bestand').count(), '| stored format now v' + up.v, '| rounds', up.pass && up.pass.iter);
  if (up.v !== 2) fail('old format not upgraded');

  // 10. inside another site's frame the app refuses to run
  const f = await ctx3.newPage();
  await f.setContent(`<iframe src="${base}/" width="900" height="600"></iframe>`); await f.waitForTimeout(2000);
  const inner = f.frames()[1];
  log('inside a frame:', (await inner.locator('main').innerText()).slice(0, 70), '| password fields:', await inner.locator('input[type=password]').count());
  if (await inner.locator('input[type=password]').count()) fail('runs inside a frame');

  await b.close();
  log('done');
})().catch(e => { log('FAILED', e.message.slice(0, 500)); process.exit(1); });
