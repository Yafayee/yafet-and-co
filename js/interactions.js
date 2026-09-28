/* ============================================================
   YAFET & CO. — interactions.js
   - Custom cursor + magnetic buttons
   - EN/DE language toggle (re-renders text from window.YC_CONTENT)
   - FAQ accordion
   - Booking modal (Calendly hook)
   - AI assistant ("Ask the Studio") — wires to window.claude.complete
     when available, falls back to keyword logic.
   - Project estimator (live calc)
   - Contact form (validation + animated success)
   - Mobile menu sheet
   ============================================================ */
(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ============================================================
  //  Custom cursor + magnetic buttons
  // ============================================================
  function initCursor() {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const dot  = document.createElement('div'); dot.className  = 'cursor';
    const ring = document.createElement('div'); ring.className = 'cursor-ring';
    document.body.append(dot, ring);

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
    }, { passive: true });

    document.addEventListener('mouseleave', () => document.body.classList.add('is-hidden'));
    document.addEventListener('mouseenter', () => document.body.classList.remove('is-hidden'));

    function loop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    // pointer state
    const pointerSel = 'a, button, .chip, .disc, .article, .case, .faq__item, .nav__link, .stat, .dock__btn, [data-pointer]';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(pointerSel)) document.body.classList.add('is-pointer');
      else document.body.classList.remove('is-pointer');
      if (e.target.closest('h1, h2, blockquote, .step__t')) document.body.classList.add('is-text');
      else document.body.classList.remove('is-text');
    });
  }

  function initMagnetic() {
    if (reduced || window.matchMedia('(pointer: coarse)').matches) return;
    $$('[data-magnetic]').forEach((el) => {
      let rect;
      el.addEventListener('mouseenter', () => { rect = el.getBoundingClientRect(); });
      el.addEventListener('mousemove', (e) => {
        if (!rect) rect = el.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.25;
        const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.35;
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  // ============================================================
  //  EN / DE language toggle — re-renders all [data-i18n] nodes
  // ============================================================
  let CUR_LANG = 'en';

  function joinH2(arr) {
    // arr: array of strings | {italic:...}
    // Insert a single space between adjacent segments when neither side
    // already provides whitespace, so we don't get "Three doors,*all of them*".
    const parts = [];
    arr.forEach((seg, i) => {
      const isObj = seg && typeof seg === 'object' && seg.italic !== undefined;
      const cur   = isObj ? seg.italic : seg;
      const wrap  = isObj ? (s) => `<em>${s}</em>` : (s) => s;

      if (i > 0) {
        const prev = arr[i - 1];
        const prevIsObj = prev && typeof prev === 'object' && prev.italic !== undefined;
        const prevText  = prevIsObj ? prev.italic : prev;
        const prevEndsSpace = /\s$/.test(prevText);
        const curStartsSpace = /^\s/.test(cur);
        if (!prevEndsSpace && !curStartsSpace) parts.push(' ');
      }
      parts.push(wrap(cur));
    });
    return parts.join('');
  }

  function setLang(lang) {
    if (!window.YC_CONTENT[lang]) lang = 'en';
    CUR_LANG = lang;
    const C = window.YC_CONTENT[lang];
    document.documentElement.lang = lang;

    // Nav links
    $$('.nav__link').forEach((a, i) => { a.textContent = C.nav.links[i] || a.textContent; });
    const navCta = $('.nav__cta-text'); if (navCta) navCta.textContent = C.nav.cta;

    // Lang buttons
    $$('.lang-toggle button').forEach((b) => b.classList.toggle('is-active', b.dataset.lang === lang));

    // Hero
    $('[data-i18n="hero.label1"]').textContent = C.hero.label1;
    $('[data-i18n="hero.label2"]').innerHTML = `<span class="rec-dot"></span><span class="timecode" data-timecode>${C.hero.label2}</span>`;
    $('[data-i18n="hero.label3"]').textContent = C.hero.label3;
    $('[data-i18n="hero.kicker"]').textContent = C.hero.kicker;

    // Hero headline lines (re-render with the line-mask wrappers)
    const h1 = $('[data-i18n="hero.h1"]');
    h1.innerHTML = C.hero.h1Lines.map((seg) => {
      const main = seg[0];
      const tail = seg[1];
      const tailHtml = tail && tail.italic ? `<em>${tail.italic}</em>` : '';
      return `<span class="line-mask"><span class="line-inner">${main}${tailHtml}</span></span>`;
    }).join('');

    $('[data-i18n="hero.sub"]').textContent = C.hero.sub;
    $('[data-i18n="hero.cta1"]').innerHTML = `<span>${C.hero.ctaPrimary}</span><span class="arrow">→</span>`;
    $('[data-i18n="hero.cta2"]').innerHTML = `<span>${C.hero.ctaSecondary}</span><span class="arrow">↘</span>`;
    $('[data-i18n="hero.foot1"]').textContent = C.hero.foot1;
    $('[data-i18n="hero.foot2"]').textContent = C.hero.foot2;
    $('[data-i18n="hero.footAvail"]').textContent = C.hero.footAvail;

    // Marquees
    $('[data-i18n="marquee.partnersLabel"]').textContent = C.marquee.partnersLabel + ' ↓';
    renderMarquee('[data-marquee="partners"]', C.marquee.partners, 'mono');
    renderMarquee('[data-marquee="industries"]', C.marquee.industries, 'serif');

    // Services
    $('[data-i18n="services.no"]').textContent = C.services.no;
    $('[data-i18n="services.tag"]').textContent = C.services.tag;
    $('[data-i18n="services.h2"]').innerHTML = joinH2(C.services.h2);
    const discGrid = $('[data-i18n="services.list"]');
    discGrid.innerHTML = C.services.list.map((it, i) => `
      <div class="disc">
        <div class="disc__top">
          <span class="mono disc__no">${String(i + 1).padStart(2, '0')}</span>
          <span class="disc__arrow">↗</span>
        </div>
        <h3 class="disc__title">${it.t}</h3>
        <p class="disc__body">${it.body}</p>
      </div>`).join('');

    // Stats
    const sw = $('[data-i18n="stats"]');
    sw.innerHTML = C.stats.map((s) => {
      const suf = s.suffix ? `<sup>${s.suffix}</sup>` : '';
      return `<div class="stat">
        <span class="stat__num" data-counter="${s.num}" data-pad="${s.pad || 0}">${String(s.num).padStart(s.pad || 0, '0')}${suf ? '' : ''}</span>${suf ? `<span class="stat__num-suf">${suf}</span>` : ''}
        <p class="stat__lab">${s.label}</p>
      </div>`;
    }).join('').replace(/<span class="stat__num-suf"><sup>/g, '').replace(/<\/sup><\/span>/g, '');
    // Simpler re-render to also embed suffix inside the num span:
    sw.innerHTML = C.stats.map((s) => `
      <div class="stat">
        <span class="stat__num"><span data-counter="${s.num}" data-pad="${s.pad || 0}">${String(s.num).padStart(s.pad || 0, '0')}</span>${s.suffix ? `<sup>${s.suffix}</sup>` : ''}</span>
        <p class="stat__lab">${s.label}</p>
      </div>`).join('');

    // Amp pillar
    $('[data-i18n="ampPillar.mega"]').textContent = C.ampPillar.mega;
    $('[data-i18n="ampPillar.line"]').innerHTML = joinH2(C.ampPillar.line);
    $('[data-i18n="ampPillar.body"]').textContent = C.ampPillar.body;

    // Work
    $('[data-i18n="work.no"]').textContent = C.work.no;
    $('[data-i18n="work.tag"]').textContent = C.work.tag;
    $('[data-i18n="work.h2"]').innerHTML = joinH2(C.work.h2);
    $('[data-i18n="work.meta"]').textContent = C.work.meta;
    renderCases(C.work.cases);

    // Pillars
    $('[data-i18n="pillars.no"]').textContent = C.pillars.no;
    $('[data-i18n="pillars.tag"]').textContent = C.pillars.tag;
    $('[data-i18n="pillars.h2"]').innerHTML = joinH2(C.pillars.h2);
    const pg = $('[data-i18n="pillars.list"]');
    pg.innerHTML = C.pillars.list.map((p) => `
      <div class="pillar reveal">
        <div class="pillar__no">${p.no}</div>
        <h3 class="pillar__t">${p.t}</h3>
        <p class="pillar__body">${p.body}</p>
      </div>`).join('');
    $('[data-i18n="pillars.note"]').innerHTML = C.pillars.note;

    // Process
    $('[data-i18n="process.no"]').textContent = C.process.no;
    $('[data-i18n="process.tag"]').textContent = C.process.tag;
    $('[data-i18n="process.h2"]').innerHTML = joinH2(C.process.h2);
    const rail = $('[data-i18n="process.rail"]');
    rail.innerHTML = C.process.steps.map((s, i) => `<button class="steps__rail-item${i === 0 ? ' is-active' : ''}" data-step="${i}">${s.no} · ${s.key}</button>`).join('');
    const stepList = $('[data-i18n="process.list"]');
    stepList.innerHTML = C.process.steps.map((s, i) => `
      <article class="step reveal" data-step="${i}">
        <div>
          <div class="step__no">${s.no}</div>
          <span class="step__when">${s.when}</span>
        </div>
        <div>
          <h3 class="step__t">${s.t}</h3>
          <p class="step__body">${s.body}</p>
          <div class="step__del"><strong>Deliverables —</strong> ${s.deliv}</div>
        </div>
      </article>`).join('');

    // Testimonial
    $('[data-i18n="testimonial.quote"]').innerHTML = `<span class="quote">“</span>${C.testimonial.quote}<span class="quote">”</span>`;
    $('[data-i18n="testimonial.cite"]').innerHTML = `<strong>${C.testimonial.who}</strong>, ${C.testimonial.role}`;

    // Pricing
    $('[data-i18n="pricing.no"]').textContent = C.pricing.no;
    $('[data-i18n="pricing.tag"]').textContent = C.pricing.tag;
    $('[data-i18n="pricing.h2"]').innerHTML = joinH2(C.pricing.h2);
    const pricing = $('[data-i18n="pricing.list"]');
    pricing.innerHTML = C.pricing.tiers.map((t) => `
      <article class="price${t.feat ? ' price--feat' : ''} reveal">
        <span class="price__tag">${t.tag}</span>
        <h3 class="price__name">${t.name}</h3>
        <div class="price__from"><span class="from-lbl">from</span>${t.from}</div>
        <ul class="price__list">${t.list.map((li) => `<li>${li}</li>`).join('')}</ul>
        <a class="btn ${t.feat ? 'btn--primary' : ''}" data-magnetic href="#contact"><span>${t.cta}</span><span class="arrow">→</span></a>
      </article>`).join('');

    // Estimator
    $('[data-i18n="estimator.h2"]').innerHTML = joinH2(C.estimator.h2);
    $('[data-i18n="estimator.sub"]').textContent = C.estimator.sub;
    $('[data-i18n="estimator.servicesLabel"]').textContent = '01 · Service';
    $('[data-i18n="estimator.addonsLabel"]').textContent = '02 · Add-ons';
    $('[data-i18n="estimator.pagesLabel"]').textContent = '03 · ' + C.estimator.pagesLabel;
    $('[data-i18n="estimator.timelineLabel"]').textContent = '04 · ' + C.estimator.timelineLabel;
    $('[data-i18n="estimator.summaryLabel"]').textContent = C.estimator.summaryLabel;
    const estS = $('[data-i18n="estimator.services"]');
    estS.innerHTML = C.estimator.services.map((s, i) => `<button class="chip${i === 0 ? ' is-active' : ''}" data-svc="${i}">${s}</button>`).join('');
    const estA = $('[data-i18n="estimator.addons"]');
    estA.innerHTML = C.estimator.addons.map((a, i) => `<button class="chip" data-addon="${i}">${a}</button>`).join('');

    // Journal
    $('[data-i18n="journal.no"]').textContent = C.journal.no;
    $('[data-i18n="journal.tag"]').textContent = C.journal.tag;
    $('[data-i18n="journal.h2"]').innerHTML = joinH2(C.journal.h2);
    const jg = $('[data-i18n="journal.list"]');
    jg.innerHTML = C.journal.articles.map((a) => `
      <a href="#contact" class="article reveal">
        <div class="article__meta"><span class="amber">${a.meta.split(' · ')[0]}</span><span>${a.meta.split(' · ')[1] || ''}</span></div>
        <h3 class="article__t">${joinH2(a.t)}</h3>
        <div class="article__cta"><span>Read</span><span>${a.read}</span></div>
      </a>`).join('');

    // Contact
    $('[data-i18n="contact.h2"]').innerHTML = joinH2(C.contact.h2) + ' <span class="big-amp">&</span>';
    $('[data-i18n="contact.email"]').href = 'mailto:' + C.contact.email;
    $('[data-i18n="contact.email"]').textContent = C.contact.email;
    $('[data-i18n="contact.phone"]').href = 'tel:' + C.contact.phone.replace(/\s+/g, '');
    $('[data-i18n="contact.phone"]').textContent = C.contact.phone;
    $('[data-i18n="contact.calendly"]').textContent = C.contact.calendly;
    $('[data-i18n="contact.studio"]').textContent = C.contact.studio;
    $('[data-i18n="contact.note"]').textContent = C.contact.note;

    // FAQ
    $('[data-i18n="faq.tag"]').textContent = C.faq.tag;
    $('[data-i18n="faq.h2"]').innerHTML = joinH2(C.faq.h2);
    const fl = $('[data-i18n="faq.list"]');
    fl.innerHTML = C.faq.items.map((it) => `
      <div class="faq__item">
        <div class="faq__q">${it.q}<span class="faq__icon"></span></div>
        <div class="faq__a"><p>${it.a}</p></div>
      </div>`).join('');
    initFaq();

    // Footer
    $('[data-i18n="footer.signature"]').textContent = C.footer.signature;
    $('[data-i18n="footer.blurb"]').textContent = C.footer.blurb;
    const fcols = $('[data-i18n="footer.cols"]');
    fcols.innerHTML = C.footer.cols.map((c) => `
      <div class="footer__col">
        <h4>${c.h}</h4>
        <ul>${c.links.map((l) => `<li><a href="${footerHref(l)}">${l}</a></li>`).join('')}</ul>
      </div>`).join('');
    $('[data-i18n="footer.copy"]').textContent = C.footer.copy;

    // Dock label
    $('[data-i18n="dock.label"]').textContent = C.aiWidget.label;

    // After re-render, re-run motion bits that depend on new DOM
    // Re-init reveals for newly-injected .reveal elements
    document.querySelectorAll('.reveal, .reveal-stagger').forEach((el) => {
      if (!el.classList.contains('in')) {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) el.classList.add('in');
      }
    });

    // Re-trigger hero line build
    document.body.classList.remove('is-loaded');
    requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('is-loaded')));

    // Refresh ScrollTrigger if present
    if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 80);
  }

  function renderMarquee(sel, items, kind) {
    const el = document.querySelector(sel);
    if (!el) return;
    const make = (i) => `<span class="marquee__item"><span class="dot"></span>${i}</span>`;
    const html = items.map(make).join('');
    el.innerHTML = html + html; // duplicated for seamless loop
  }

  function renderCases(cases) {
    const track = $('[data-i18n="work.list"]');
    if (!track) return;
    track.innerHTML = cases.map((c, i) => `
      <article class="case" data-case="${i}">
        <header class="case__head">
          <span><span class="amber">${String(i + 1).padStart(2, '0')}</span> / 04</span>
          <span>${c.meta}</span>
        </header>
        <div class="case__media">
          <div class="case__placeholder">
            <span class="corner c-tl"></span><span class="corner c-tr"></span>
            <span class="corner c-bl"></span><span class="corner c-br"></span>
            <div class="case__viz">${caseViz(c.viz)}</div>
          </div>
        </div>
        <div class="case__body">
          <h3 class="case__name">${c.name}</h3>
          <p class="case__pitch">${c.pitch}</p>
          <p class="case__desc">${c.desc}</p>
          <div class="tag-row">${c.tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
          <div class="case__foot">
            <span class="mono mono-sm">${c.status}</span>
            <a class="case__cta" href="#contact" aria-label="Ask about the ${c.name} case study">Ask about this case</a>
          </div>
        </div>
      </article>`).join('');
  }

  function footerHref(label) {
    const key = label.toLowerCase();
    if (key.includes('journal')) return '#journal';
    if (key.includes('contact')) return '#contact';
    if (key.includes('work') || key.includes('project')) return '#work';
    if (key.includes('service')) return '#services';
    if (key.includes('process')) return '#process';
    if (key.includes('pricing')) return '#pricing';
    if (key.includes('privacy') || key.includes('terms') || key.includes('cookies') || key.includes('impressum')) return '#contact';
    return '#top';
  }

  // SVG visualisations per case (placeholders for real screenshots)
  function caseViz(kind) {
    const s = (children) => `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg">${children}</svg>`;
    const amber = '#C58E4A';
    const bone  = '#EDE6D6';
    const dim   = 'rgba(237,230,214,0.32)';
    switch (kind) {
      case 'pietech':
        return s(`
          <rect x="20" y="20" width="360" height="200" fill="none" stroke="${dim}" stroke-width="0.8"/>
          <line x1="20" y1="48" x2="380" y2="48" stroke="${dim}" stroke-width="0.6"/>
          <circle cx="34" cy="34" r="3" fill="${amber}"/>
          <text x="44" y="38" font-family="monospace" font-size="9" fill="${bone}" opacity="0.7">PIETECH · ETB 1,240</text>
          <rect x="40" y="64" width="100" height="120" fill="none" stroke="${dim}"/>
          <rect x="40" y="64" width="100" height="60" fill="${amber}" opacity="0.18"/>
          <text x="50" y="138" font-family="serif" font-style="italic" font-size="9" fill="${bone}">Habesha kemis</text>
          <text x="50" y="154" font-family="monospace" font-size="8" fill="${amber}">ETB 3,200</text>
          <rect x="150" y="64" width="100" height="120" fill="none" stroke="${dim}"/>
          <rect x="150" y="64" width="100" height="60" fill="${dim}" opacity="0.4"/>
          <text x="160" y="138" font-family="serif" font-style="italic" font-size="9" fill="${bone}">Buna ceremony set</text>
          <text x="160" y="154" font-family="monospace" font-size="8" fill="${amber}">ETB 1,840</text>
          <rect x="260" y="64" width="100" height="120" fill="none" stroke="${dim}"/>
          <rect x="260" y="64" width="100" height="60" fill="${dim}" opacity="0.25"/>
          <text x="270" y="138" font-family="serif" font-style="italic" font-size="9" fill="${bone}">Mesob basket</text>
          <text x="270" y="154" font-family="monospace" font-size="8" fill="${amber}">ETB 920</text>
          <rect x="40" y="194" width="320" height="14" fill="${amber}" opacity="0.85"/>
          <text x="200" y="204" font-family="monospace" font-size="8" fill="#0E0B08" text-anchor="middle" font-weight="700">PAY WITH TELEBIRR · CBE BIRR · CARD</text>
        `);
      case 'ethiosport':
        return s(`
          <rect x="20" y="20" width="360" height="200" fill="#14110D" stroke="${dim}"/>
          <circle cx="200" cy="120" r="48" fill="none" stroke="${bone}" stroke-width="0.8" opacity="0.4"/>
          <path d="M150 120 L200 80 L250 120 L200 160 Z" fill="none" stroke="${amber}" stroke-width="1.2"/>
          <circle cx="200" cy="120" r="4" fill="${amber}"/>
          <text x="200" y="50" font-family="monospace" font-size="9" fill="${bone}" text-anchor="middle" opacity="0.7">LIVE · ETHIOPIA PREMIER LEAGUE</text>
          <rect x="36" y="190" width="6" height="12" fill="#D44A39"/>
          <text x="50" y="200" font-family="monospace" font-size="8" fill="${bone}">REC · 73:42 · HD</text>
          <rect x="320" y="190" width="44" height="14" fill="${amber}" opacity="0.85"/>
          <text x="342" y="200" font-family="monospace" font-size="7" fill="#0E0B08" text-anchor="middle" font-weight="700">CC · HLS</text>
          <line x1="36" y1="180" x2="364" y2="180" stroke="${amber}"/>
          <circle cx="120" cy="180" r="2.5" fill="${bone}"/>
          <circle cx="240" cy="180" r="2.5" fill="${bone}"/>
          <circle cx="304" cy="180" r="2.5" fill="${amber}"/>
        `);
      case 'amisoft':
        return s(`
          <rect x="20" y="20" width="360" height="200" fill="none" stroke="${dim}"/>
          <text x="34" y="42" font-family="monospace" font-size="9" fill="${amber}">PT · MK-00342 · F · 34</text>
          <text x="34" y="56" font-family="serif" font-style="italic" font-size="14" fill="${bone}">Almaz Tesfaye</text>
          <line x1="20" y1="70" x2="380" y2="70" stroke="${dim}"/>
          <text x="34" y="92" font-family="monospace" font-size="8" fill="${bone}" opacity="0.5">VITALS</text>
          <text x="34" y="110" font-family="serif" font-size="11" fill="${bone}">BP 118/76 · HR 72 · SpO₂ 98</text>
          <text x="34" y="138" font-family="monospace" font-size="8" fill="${bone}" opacity="0.5">LAB · 14.04</text>
          <text x="34" y="156" font-family="serif" font-size="11" fill="${bone}">Hb 12.4 · WBC 6.1 · Glu 92</text>
          <text x="34" y="184" font-family="monospace" font-size="8" fill="${bone}" opacity="0.5">RX · CURRENT</text>
          <text x="34" y="202" font-family="serif" font-style="italic" font-size="11" fill="${amber}">Amoxicillin 500mg · 3×/d · 5d</text>
          <rect x="240" y="80" width="120" height="120" fill="none" stroke="${amber}" stroke-width="0.8"/>
          <path d="M260 140 Q280 90 300 140 T340 140" fill="none" stroke="${amber}" stroke-width="1.2"/>
          <text x="300" y="194" font-family="monospace" font-size="7" fill="${bone}" text-anchor="middle" opacity="0.6">7-DAY TREND · HL7</text>
        `);
      case 'kiyatech':
        return s(`
          <rect x="20" y="20" width="360" height="200" fill="none" stroke="${dim}"/>
          <text x="34" y="42" font-family="monospace" font-size="9" fill="${amber}">GRADE 8 · CHEMISTRY · UNIT 04</text>
          <text x="34" y="68" font-family="serif" font-style="italic" font-size="18" fill="${bone}">Periodic patterns &amp; the alkali metals</text>
          <line x1="20" y1="84" x2="380" y2="84" stroke="${dim}"/>
          <g transform="translate(34, 100)">
            <rect width="34" height="34" fill="${amber}" opacity="0.85"/>
            <text x="17" y="16" font-family="serif" font-size="8" fill="#0E0B08" text-anchor="middle">Li</text>
            <text x="17" y="28" font-family="monospace" font-size="6" fill="#0E0B08" text-anchor="middle">3</text>
          </g>
          <g transform="translate(74, 100)">
            <rect width="34" height="34" fill="none" stroke="${bone}" opacity="0.6"/>
            <text x="17" y="16" font-family="serif" font-size="8" fill="${bone}" text-anchor="middle">Na</text>
            <text x="17" y="28" font-family="monospace" font-size="6" fill="${bone}" text-anchor="middle">11</text>
          </g>
          <g transform="translate(114, 100)">
            <rect width="34" height="34" fill="none" stroke="${bone}" opacity="0.6"/>
            <text x="17" y="16" font-family="serif" font-size="8" fill="${bone}" text-anchor="middle">K</text>
            <text x="17" y="28" font-family="monospace" font-size="6" fill="${bone}" text-anchor="middle">19</text>
          </g>
          <text x="34" y="170" font-family="monospace" font-size="8" fill="${bone}" opacity="0.6">DOWNLOAD · 12 MB · OFFLINE-READY</text>
          <rect x="34" y="180" width="240" height="6" fill="${dim}"/>
          <rect x="34" y="180" width="180" height="6" fill="${amber}"/>
          <text x="290" y="186" font-family="monospace" font-size="8" fill="${amber}">75%</text>
        `);
      default:
        return s(`<text x="200" y="120" font-family="monospace" font-size="10" fill="${bone}" text-anchor="middle" opacity="0.5">CASE PLACEHOLDER</text>`);
    }
  }

  // ============================================================
  //  FAQ accordion
  // ============================================================
  function initFaq() {
    $$('.faq__item').forEach((it) => {
      it.addEventListener('click', () => it.classList.toggle('is-open'));
    });
  }

  // ============================================================
  //  Modals (booking, AI chat)
  // ============================================================
  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    if (window.__lenis) window.__lenis.stop();
  }
  function closeModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('is-open');
    document.body.style.overflow = '';
    if (window.__lenis) window.__lenis.start();
  }
  function initModals() {
    $$('[data-open-modal]').forEach((b) => {
      b.addEventListener('click', (e) => { e.preventDefault(); openModal(b.dataset.openModal); });
    });
    $$('.modal').forEach((m) => {
      m.addEventListener('click', (e) => { if (e.target === m) closeModal(m.id); });
      $$('.modal__close, [data-close-modal]', m).forEach((b) => b.addEventListener('click', () => closeModal(m.id)));
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $$('.modal.is-open').forEach((m) => closeModal(m.id)); });
  }

  // ============================================================
  //  AI assistant — "Ask the Studio"
  //  Wires to window.claude.complete if present; falls back to
  //  keyword logic.  *** connect real AI here ***
  // ============================================================
  const STUDIO_KB = `You are the "studio voice" for Yafet & Co., an independent founder-led digital studio in Vienna.
Voice: editorial, literary, cinematic, understated. Restraint is the brand. "Quiet" recurs. Never salesy.
Founder: Yafet — same person from intro call to launch.
One-liner: "Websites, apps, & quiet AI — made in Vienna."

SERVICES (8): Website design & development; Website redesign; Booking & management systems; Custom IT systems & CRMs; Mobile & web apps; AI automation & integration; Social media & content; Government & NGO platforms.

PROCESS (5 weeks-based): 01 Listen (Wk1); 02 Sketch (Wk2-3); 03 Build (Wk3-6); 04 Polish (Wk6-10); 05 Stay (post-launch 30 days).

PRICING DOORS:
- Quickstart — 4 weeks — from €7.400 — 5-page editorial site on Next.js, one language bilingual-ready, Sanity CMS + GDPR + Impressum, Lighthouse 95+.
- Atelier — 8–12 weeks — from €18.000 — full custom site/system/app, bilingual DE/EN from day one, one AI workflow built in, booking/CRM/payments where needed, 30-day after-care.
- Long view — 6+ months retainer — from €4.800/month — embedded design + engineering, roadmap reviewed every six weeks, cancel any month with 30 days notice.

AVAILABILITY: Available for projects from Q3 2026.
LANGUAGES: DE / EN first-class; Amharic localisation for African deployments.
LOCATION: Schottenring 14/3, 1010 Wien. By appointment only.
CONTACT: contact@yafetandco.com · +43 1 928 73 73 · Calendly intro Tuesdays & Thursdays CET.
PARTNERS: Microsoft, Cisco, Huawei, Fortinet, Dahua, Hikvision, ActiveXperts, NatNet, SuSu Technology.

Stay in voice. Keep replies short — 2-4 sentences. Use the word "quiet" sparingly but on-brand. Never invent prices, dates, or testimonials. If asked something outside the studio, redirect kindly to a booking call.`;

  function fallbackAnswer(q) {
    const x = q.toLowerCase();
    if (/(price|cost|budget|how much|euro|€|preis)/.test(x)) {
      return 'Three doors. Quickstart from €7.400 (4 weeks). Atelier from €18.000 (8–12 weeks) — most projects fit here. Long view from €4.800/month. Estimates are firm before we begin.';
    }
    if (/(time|long|when|fast|schedule|wann|dauer)/.test(x)) {
      return 'Quickstart sites in four weeks. Atelier custom builds in eight to twelve. MVPs for apps in four to six. We commit dates on the same day we agree scope.';
    }
    if (/(language|german|deutsch|bilingual|de\/en)/.test(x)) {
      return 'German and English are both first-class — every Atelier project ships bilingual DE/EN from day one. Amharic localisation is available where it fits.';
    }
    if (/(avail|free|when can|q3|q4|2026)/.test(x)) {
      return 'Available for new projects from Q3 2026. Intro calls are Tuesdays and Thursdays, CET — quiet half-hour, no deck.';
    }
    if (/(service|do|make|offer|build)/.test(x)) {
      return 'Eight disciplines, one studio: websites, redesigns, booking systems, custom CRMs, mobile & web apps, quiet AI automations, social/content, and government/NGO platforms. All led by Yafet.';
    }
    if (/(ai|automation|claude|gpt|workflow)/.test(x)) {
      return 'Quiet automations that save twelve hours a week. Loud ones that change the business model. Where they fit — never as decoration.';
    }
    if (/(yafet|founder|who|team)/.test(x)) {
      return 'Yafet leads every project from the intro call to the launch dinner. Specialists from our trusted bench join when delivery needs it.';
    }
    if (/(book|call|intro|meeting|calendly)/.test(x)) {
      return 'A thirty-minute intro call, Tuesdays and Thursdays CET. Open the Calendly card on this page — no deck needed, just a conversation.';
    }
    if (/(vienna|wien|where|location|office)/.test(x)) {
      return 'Schottenring 14/3, 1010 Wien — by appointment only. We work primarily with Vienna and EU clients; delivery partners across the Horn of Africa.';
    }
    return window.YC_CONTENT[CUR_LANG].aiWidget.fallback;
  }

  async function askStudio(q) {
    // *** connect real AI here ***  — uses Claude artifact bridge if present
    if (window.claude && typeof window.claude.complete === 'function') {
      try {
        const reply = await window.claude.complete({
          messages: [
            { role: 'user', content: `${STUDIO_KB}\n\n---\nVISITOR QUESTION: ${q}\n\nRespond in 2–4 sentences, in the studio voice. Do not invent facts.` }
          ]
        });
        return reply || fallbackAnswer(q);
      } catch (err) {
        console.warn('[claude] fallback', err);
      }
    }
    return fallbackAnswer(q);
  }

  function initChat() {
    const log = $('.chat__log');
    const input = $('.chat__input');
    const send = $('.chat__send');
    const sugg = $('.chat__suggest');
    if (!log) return;

    function append(role, text) {
      const div = document.createElement('div');
      div.className = `chat__msg chat__msg--${role}`;
      div.textContent = text;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
      return div;
    }

    function typingOn() {
      const t = document.createElement('div');
      t.className = 'chat__typing';
      t.textContent = window.YC_CONTENT[CUR_LANG].aiWidget.thinking;
      t.id = 'chat-typing';
      log.appendChild(t);
      log.scrollTop = log.scrollHeight;
    }
    function typingOff() { document.getElementById('chat-typing')?.remove(); }

    async function submit(q) {
      if (!q.trim()) return;
      append('me', q);
      input.value = '';
      typingOn();
      const reply = await askStudio(q);
      typingOff();
      append('ai', reply);
    }

    send?.addEventListener('click', () => submit(input.value));
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(input.value); });
    sugg?.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      submit(b.textContent);
    });

    // Seed intro message
    const C = window.YC_CONTENT[CUR_LANG];
    append('ai', C.aiWidget.intro);
  }

  // ============================================================
  //  Project estimator — live calculation
  // ============================================================
  function initEstimator() {
    const root = $('#estimator-card');
    if (!root) return;
    const svcBtns   = $$('[data-svc]', root);
    const addonBtns = $$('[data-addon]', root);
    const pages     = $('#est-pages');
    const weeks     = $('#est-weeks');
    const pagesVal  = $('#est-pages-val');
    const weeksVal  = $('#est-weeks-val');
    const numEl     = $('#est-num');
    const doorEl    = $('#est-door');
    const lineEl    = $('#est-line');

    // Base prices by service index (rough, indicative)
    const BASE = [7400, 18000, 14000, 12000];          // Website / App / Booking-CRM / AI workflow
    const SVC_LABEL = ['website', 'platform', 'booking system', 'AI workflow'];
    const ADDON_COST = [2200, 2600, 3400, 1800, 1600];  // Booking, CRM, AI workflow, Payments, Bilingual
    const ADDON_LABEL = ['booking', 'a CRM layer', 'an AI workflow', 'payments', 'a second language'];

    const state = { svc: 0, addons: new Set(), pages: 8, weeks: 8 };

    function fmtEUR(n) { return '€' + Math.round(n / 100) * 100; }

    function recalc() {
      const base = BASE[state.svc];
      const pagesAdd = Math.max(0, state.pages - 5) * 480;
      let addonAdd = 0;
      state.addons.forEach((i) => { addonAdd += ADDON_COST[i]; });
      const rushFactor = state.weeks < 8 ? 1.18 : (state.weeks > 14 ? 0.94 : 1);
      const total = (base + pagesAdd + addonAdd) * rushFactor;

      // Animate number
      numEl.classList.add('is-pulse');
      setTimeout(() => numEl.classList.remove('is-pulse'), 240);
      numEl.textContent = fmtEUR(total);

      // Door logic
      const C = window.YC_CONTENT[CUR_LANG].estimator;
      let door, line;
      if (total <= 9500 && state.svc === 0 && state.addons.size <= 1) {
        door = C.doors.quickstart;
        line = 'Likely a Quickstart: an editorial Next.js site in four weeks, on a CMS your team runs.';
      } else if (state.weeks >= 24 || state.addons.size >= 4) {
        door = C.doors.longview;
        line = 'This shape suits the Long view — embedded design + engineering, reviewed every six weeks.';
      } else {
        door = C.doors.atelier;
        line = `An Atelier project — a custom ${SVC_LABEL[state.svc]}${state.addons.size ? ' with ' + Array.from(state.addons).map((i) => ADDON_LABEL[i]).join(', ') : ''}, shipped in ${state.weeks} weeks.`;
      }
      doorEl.textContent = '↦  ' + door;
      lineEl.textContent = line;
    }

    svcBtns.forEach((b, i) => {
      b.addEventListener('click', () => {
        svcBtns.forEach((x) => x.classList.remove('is-active'));
        b.classList.add('is-active');
        state.svc = i;
        recalc();
      });
    });
    addonBtns.forEach((b, i) => {
      b.addEventListener('click', () => {
        b.classList.toggle('is-active');
        if (state.addons.has(i)) state.addons.delete(i); else state.addons.add(i);
        recalc();
      });
    });
    pages?.addEventListener('input', () => {
      state.pages = +pages.value;
      pagesVal.innerHTML = `<span>min 1</span><strong>${state.pages} pages</strong><span>max 40</span>`;
      recalc();
    });
    weeks?.addEventListener('input', () => {
      state.weeks = +weeks.value;
      weeksVal.innerHTML = `<span>4 wk</span><strong>${state.weeks} weeks</strong><span>40 wk</span>`;
      recalc();
    });

    // initial labels
    pagesVal.innerHTML = `<span>min 1</span><strong>${state.pages} pages</strong><span>max 40</span>`;
    weeksVal.innerHTML = `<span>4 wk</span><strong>${state.weeks} weeks</strong><span>40 wk</span>`;
    recalc();
  }

  // ============================================================
  //  Contact form (validation + mail client handoff)
  // ============================================================
  function initContactForm() {
    const form = $('#contact-form');
    if (!form) return;
    const status = $('.form-status', form);

    function setErr(name, on) {
      const field = $(`[data-field="${name}"]`, form);
      if (!field) return;
      field.classList.toggle('field--error', on);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      let bad = false;
      if (!data.name || data.name.trim().length < 2)       { setErr('name', true); bad = true; }  else setErr('name', false);
      if (!data.email || !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(data.email)) { setErr('email', true); bad = true; } else setErr('email', false);
      if (!data.message || data.message.trim().length < 12) { setErr('message', true); bad = true; } else setErr('message', false);
      if (bad) { status.textContent = '↯ One or two fields need a second look.'; return; }

      status.textContent = 'Opening your email app...';

      const subject = `Project inquiry from ${data.name}`;
      const body = [
        `Name: ${data.name}`,
        `Email: ${data.email}`,
        `Company: ${data.company || '-'}`,
        '',
        'What they are building:',
        data.message,
        '',
        'Sent from yafetandco.com'
      ].join('\n');

      window.location.href = `mailto:contact@yafetandco.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      await new Promise((r) => setTimeout(r, 500));

      // Animated success state
      form.querySelectorAll('.field').forEach((f) => f.style.display = 'none');
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.style.display = 'none';
      const success = document.createElement('div');
      success.innerHTML = `
        <div class="mono mono-amber" style="margin-bottom:0.6rem;">↪ EMAIL DRAFT READY · ${new Date().toLocaleTimeString()}</div>
        <h3 class="h3" style="margin-bottom:1rem;">Thank you, <em class="italic amber">${data.name.split(/\s+/)[0]}</em>.</h3>
        <p class="lead dim" style="margin-bottom:1rem;">Your email app should now have a message addressed to <strong style="color:var(--bone)">contact@yafetandco.com</strong>. Send it from there, and Yafet will read it personally.</p>
        <p class="mono dim">WHAT HAPPENS NEXT · 01 SEND THE EMAIL · 02 YAFET REPLIES · 03 A 30-MIN INTRO CALL</p>`;
      form.appendChild(success);
      status.textContent = '';
    });
  }

  // ============================================================
  //  Mobile menu
  // ============================================================
  function initMobileMenu() {
    const burger = $('.nav__burger');
    const sheet  = $('#menu-sheet');
    if (!burger || !sheet) return;
    function setOpen(on) {
      sheet.classList.toggle('is-open', on);
      burger.setAttribute('aria-expanded', String(on));
    }
    burger.addEventListener('click', () => setOpen(!sheet.classList.contains('is-open')));
    $$('a', sheet).forEach((a) => a.addEventListener('click', () => setOpen(false)));
  }

  // ============================================================
  //  EN/DE language buttons
  // ============================================================
  function initLangButtons() {
    $$('.lang-toggle button').forEach((b) => {
      b.addEventListener('click', () => {
        if (b.disabled) return;
        setLang(b.dataset.lang);
      });
    });
  }

  // ============================================================
  //  Theme toggle (light / dark) — in-memory only, no storage
  // ============================================================
  function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    let saved = null;
    try { saved = localStorage.getItem('yc-theme'); } catch (err) { saved = null; }
    if (saved === 'light' || (!saved && window.matchMedia('(prefers-color-scheme: light)').matches)) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
    btn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      if (cur === 'light') {
        document.documentElement.removeAttribute('data-theme');
        try { localStorage.setItem('yc-theme', 'dark'); } catch (err) {}
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        try { localStorage.setItem('yc-theme', 'light'); } catch (err) {}
      }
    });
  }

  // ============================================================
  //  Boot
  // ============================================================
  function boot() {
    initCursor();
    initMagnetic();
    initModals();
    initLangButtons();
    initThemeToggle();
    setLang('en'); // initial render
    initFaq();
    initChat();
    initEstimator();
    initContactForm();
    initMobileMenu();
    // After language render, kick motion engine
    if (window.YC_initMotion) window.YC_initMotion();
  }

  window.YC_initInteractions = boot;
})();
