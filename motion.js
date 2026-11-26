/* ============================================================
   YAFET & CO. — motion.js
   GSAP + ScrollTrigger + Lenis (loaded from CDN). Adds:
   - Lenis smooth scroll, synced with ScrollTrigger
   - IntersectionObserver reveals (.reveal / .reveal-stagger)
   - Animated counters
   - Pinned horizontal Selected Work scroll
   - Sticky process-rail highlighter
   - Hero amp draw-in on load
   ============================================================ */
(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ----------------- Lenis smooth scroll -----------------
  let lenis = null;
  function initLenis() {
    if (reduced || typeof Lenis === 'undefined') return;
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Sync with GSAP ScrollTrigger
    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    // Smooth anchor scroll
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (href.length < 2) return;
      const tgt = document.querySelector(href);
      if (!tgt) return;
      e.preventDefault();
      lenis.scrollTo(tgt, { offset: -40, duration: 1.4 });
    });

    window.__lenis = lenis;
  }

  // ----------------- IntersectionObserver reveals -----------------
  function initReveals() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    document.querySelectorAll('.reveal, .reveal-stagger').forEach((el) => io.observe(el));
  }

  // ----------------- Counters -----------------
  function initCounters() {
    const els = document.querySelectorAll('[data-counter]');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const end = parseInt(el.getAttribute('data-counter'), 10) || 0;
        const pad = parseInt(el.getAttribute('data-pad'), 10) || 0;
        if (reduced) {
          el.textContent = String(end).padStart(pad, '0');
          io.unobserve(el);
          return;
        }
        const start = performance.now();
        const dur = 1600;
        function tick(now) {
          const p = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          const v = Math.round(end * eased);
          el.textContent = String(v).padStart(pad, '0');
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        io.unobserve(el);
      });
    }, { threshold: 0.4 });
    els.forEach((el) => io.observe(el));
  }

  // ----------------- Pinned horizontal scroll: Selected Work -----------------
  function initPinnedWork() {
    if (reduced || !window.gsap || !window.ScrollTrigger) return;
    const pin = document.querySelector('.work__pin');
    const track = document.querySelector('.work__track');
    if (!pin || !track || window.innerWidth <= 760) return;

    gsap.registerPlugin(ScrollTrigger);

    // Compute scroll distance
    const getDist = () => Math.max(0, track.scrollWidth - window.innerWidth);

    const tween = gsap.to(track, {
      x: () => -getDist(),
      ease: 'none',
      scrollTrigger: {
        trigger: pin,
        start: 'top top',
        end: () => '+=' + getDist(),
        pin: true,
        scrub: 0.5,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          const bar = document.querySelector('.work__progress span');
          if (bar) bar.style.width = (self.progress * 100).toFixed(1) + '%';
        }
      }
    });

    // Nav buttons jump to next/prev case
    const cases = track.querySelectorAll('.case');
    function scrollToCase(i) {
      i = Math.max(0, Math.min(cases.length - 1, i));
      const c = cases[i];
      if (!c) return;
      const dist = getDist();
      if (dist <= 0) return;
      const trackLeft = parseInt(getComputedStyle(track).paddingLeft, 10) || 0;
      const targetX = c.offsetLeft - trackLeft;
      const progress = Math.min(1, targetX / dist);
      const st = tween.scrollTrigger;
      const y = st.start + (st.end - st.start) * progress;
      if (lenis) lenis.scrollTo(y, { duration: 1.2 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
    }
    let curIdx = 0;
    document.querySelector('.work__nav-prev')?.addEventListener('click', () => scrollToCase(--curIdx));
    document.querySelector('.work__nav-next')?.addEventListener('click', () => scrollToCase(++curIdx));
    // Track which case is mostly visible (use the ScrollTrigger we just made)
    const st = tween.scrollTrigger;
    if (st && typeof st.scroll === 'function') {
      ScrollTrigger.create({
        trigger: pin,
        start: 'top top',
        end: () => '+=' + getDist(),
        onUpdate: (self) => { curIdx = Math.round(self.progress * (cases.length - 1)); }
      });
    }
  }

  // ----------------- Process rail (active step) -----------------
  function initStepsRail() {
    const railItems = document.querySelectorAll('.steps__rail-item');
    const steps = document.querySelectorAll('.step');
    if (!railItems.length) return;

    railItems.forEach((it, i) => {
      it.addEventListener('click', () => {
        const tgt = steps[i];
        if (!tgt) return;
        if (lenis) lenis.scrollTo(tgt, { offset: -120, duration: 1.2 });
        else tgt.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const idx = parseInt(e.target.getAttribute('data-step'), 10);
          railItems.forEach((r) => r.classList.remove('is-active'));
          railItems[idx]?.classList.add('is-active');
        }
      });
    }, { rootMargin: '-40% 0px -50% 0px' });
    steps.forEach((s) => io.observe(s));
  }

  // ----------------- Hero ampersand draw-in -----------------
  function initHeroAmp() {
    const svgPaths = document.querySelectorAll('.hero__amp-bg .stroke');
    if (!svgPaths.length) return;
    svgPaths.forEach((p) => {
      try {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
        if (reduced) {
          p.style.strokeDashoffset = 0;
          return;
        }
        requestAnimationFrame(() => {
          p.style.transition = 'stroke-dashoffset 2400ms cubic-bezier(.22,1,.36,1) 600ms';
          p.style.strokeDashoffset = 0;
        });
      } catch (err) { /* paths not measurable -> ignore */ }
    });
  }

  // ----------------- Mega ampersand parallax in pillar -----------------
  function initAmpPillar() {
    if (reduced || !window.gsap || !window.ScrollTrigger) return;
    const mega = document.querySelector('.amp-pillar .mega-amp');
    if (!mega) return;
    gsap.to(mega, {
      yPercent: -12,
      scale: 1.04,
      ease: 'none',
      scrollTrigger: {
        trigger: '.amp-pillar',
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    });

    // Footer amp parallax
    const footAmp = document.querySelector('.footer__amp');
    if (footAmp) {
      gsap.to(footAmp, {
        yPercent: -8,
        ease: 'none',
        scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true }
      });
    }
  }

  // ----------------- Nav scroll state -----------------
  function initNavScroll() {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    let last = 0;
    function onScroll() {
      const y = window.scrollY || window.pageYOffset;
      nav.classList.toggle('is-scrolled', y > 24);
      last = y;
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ----------------- Timecode tick -----------------
  function initTimecode() {
    const els = document.querySelectorAll('[data-timecode]');
    if (!els.length) return;
    function pad(n) { return String(n).padStart(2, '0'); }
    function tick() {
      const d = new Date();
      // Vienna is CET/CEST; simple "local hh:mm:ss" is fine for the cinematic effect.
      const tc = `REC · ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} · VIENNA`;
      els.forEach((el) => el.textContent = tc);
    }
    tick();
    setInterval(tick, 1000);
  }

  // ----------------- Loader handoff -----------------
  function dismissLoader() {
    const ldr = document.getElementById('loader');
    if (!ldr) return;
    document.body.classList.add('is-loaded');
    setTimeout(() => {
      ldr.classList.add('is-gone');
      // Refresh ScrollTrigger AFTER hero is visible to re-measure pin distances
      if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 200);
    }, reduced ? 0 : 1500);
  }

  // ----------------- Boot -----------------
  function boot() {
    initLenis();
    initReveals();
    initCounters();
    initStepsRail();
    initHeroAmp();
    initAmpPillar();
    initNavScroll();
    initTimecode();
    // Pin after a tick so layout is settled
    requestAnimationFrame(() => requestAnimationFrame(initPinnedWork));
    dismissLoader();

    window.addEventListener('resize', () => {
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  }

  window.YC_initMotion = boot;
})();
