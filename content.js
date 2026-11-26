/* ============================================================
   YAFET & CO. — Content dictionary (EN/DE)
   English is the public version. German content is kept out of
   the UI until a real translation is ready.
   ============================================================ */
window.YC_CONTENT = {
  en: {
    nav: {
      links: ["Work", "Services", "Process", "Pricing", "Journal", "Contact"],
      cta: "Start a project."
    },
    hero: {
      label1: "VOL. 06 · THE STUDIO",
      label2: "REC · 22:40:10 · VIENNA",
      label3: "NO. 01 / THE STUDIO AT WORK",
      kicker: "— STUDIO YAFET & CO · WIEN · MMXXVI",
      h1Lines: [
        ["Websites,", null],
        ["apps, ", { italic: "& quiet AI" }],
        ["— made in", null],
        ["Vienna.", null]
      ],
      sub: "Notes on the slow craft of building for the businesses Europe keeps quiet about.",
      ctaPrimary: "Book a 30-min intro",
      ctaSecondary: "Selected work",
      foot1: "A STUDIO IN ONE CITY · 48°12′ N · 16°22′ E",
      foot2: "A FILM IN ONE BREATH",
      footAvail: "Available for projects from Q3 2026"
    },
    marquee: {
      partnersLabel: "IN PARTNERSHIP WITH",
      partners: ["Microsoft", "Cisco", "Huawei", "Fortinet", "Hikvision", "ActiveXperts", "NatNet", "SuSu Technology"],
      industries: ["eCommerce", "eLearning", "Healthcare", "Sports streaming", "Public sector", "ICT infrastructure", "Audiovisual", "Cloud & security"]
    },
    services: {
      no: "§ 01",
      tag: "What we make",
      h2: ["Eight disciplines,", { italic: "one studio." }],
      list: [
        { t: "Website design & development", body: "Editorial, fast, accessible sites built on Next.js with a CMS your team can actually run." },
        { t: "Website redesign",              body: "Audit-first redesigns for sites that work but feel ten years older than the business behind them." },
        { t: "Booking & management systems", body: "Salons, clinics, studios: custom calendars, no-show logic, payments, staff scheduling — owned, not rented." },
        { t: "Custom IT systems & CRMs",     body: "Internal tools that replace eleven spreadsheets and a WhatsApp group. Quietly, then dramatically." },
        { t: "Mobile & web apps",            body: "From MVP in six weeks to a product worth scaling — React Native, Next.js, the boring choices that pay off." },
        { t: "AI automation & integration",  body: "Quiet automations that save twelve hours a week. Loud ones that change the business model. Both, where they fit." },
        { t: "Social media & content",       body: "A point of view, a publishing cadence, and the editorial muscle to keep it going past month three." },
        { t: "Government & NGO platforms",   body: "WCAG-AA accessible, GDPR-tight, multilingual platforms for public bodies and non-profits across the EU." }
      ]
    },
    stats: [
      { num: 12, suffix: "+", label: "years of <strong>combined craft</strong>" },
      { num: 4,  pad: 2,      label: "industries — <strong>health, sport, edu, commerce</strong>" },
      { num: 8,  pad: 2,      label: "<strong>tier-1 vendor partners</strong> across EU + Africa" },
      { num: 1,  pad: 2,      label: "founder — <strong>the same person</strong> from intro to launch" }
    ],
    ampPillar: {
      mega: "&",
      line: ["THE ", { italic: "&" }, " IS THE WORK."],
      body: "Design and engineering, strategy and shipping — not handed off in stages, but braided together from week one."
    },
    work: {
      no: "§ 02",
      tag: "Selected work · 2023–2025",
      h2: ["An index of quiet,", { italic: "shipped things." }],
      meta: "04 CASES · SCROLL TO READ →",
      cases: [
        {
          name: "Pietech.",
          meta: "CLIENT · 2024 · ETH",
          pitch: "A marketplace that finally took local payments.",
          desc: "Multi-vendor eCommerce with Telebirr and CBE Birr fully integrated, Amharic/English checkout, and an admin panel the founders can actually run themselves.",
          tags: ["Next.js", "Postgres", "Telebirr", "CBE Birr", "Multi-vendor"],
          status: "PIETECH · LIVE · ECOMMERCE · Addis Ababa, ET",
          viz: "pietech"
        },
        {
          name: "EthioSport.",
          meta: "CLIENT · 2023 — ONGOING · ETH",
          pitch: "A white-label OTT platform for African football leagues.",
          desc: "Live and on-demand streaming with DRM, CDN edge delivery, Android & iOS apps, and a white-label admin for leagues to brand their own channel — built for low-bandwidth markets first.",
          tags: ["HLS", "DRM", "CDN", "iOS", "Android"],
          status: "ETHIOSPORT · LIVE · OTT STREAMING · Pan-African · 4 leagues",
          viz: "ethiosport"
        },
        {
          name: "Amisoft.",
          meta: "CLIENT · 2024 · ETH",
          pitch: "An online health record hospitals can actually run.",
          desc: "Patient records, lab orders, prescription tracking and a telehealth bridge — HL7-aware, mobile-first for the doctor walking the ward, and offline-tolerant where it matters.",
          tags: ["HIS", "HL7", "React Native", "Telehealth"],
          status: "AMISOFT · LIVE · HEALTH RECORD · Multi-hospital, ET",
          viz: "amisoft"
        },
        {
          name: "Kiyatech PLC.",
          meta: "CLIENT · 2023 · ETH",
          pitch: "A learning platform built for students who go offline.",
          desc: "K-12 eLearning with Amharic localization, downloadable lessons that survive a four-hour bus ride, SCORM-compliant assessments, and a teacher dashboard the principal can read at a glance.",
          tags: ["LMS", "SCORM", "Amharic", "Offline-first"],
          status: "KIYATECH · LIVE · ELEARNING · K-12, ET",
          viz: "kiyatech"
        }
      ]
    },
    pillars: {
      no: "§ 03",
      tag: "The four S pillars",
      h2: ["Technology", { italic: "that lasts." }],
      list: [
        { no: "01", t: "Speed.",          body: "From kickoff to live in weeks, not seasons. MVPs in 4–6 weeks. Custom builds in 8–12. Decisions on the same day we ask the question." },
        { no: "02", t: "Security.",       body: "GDPR-native, EU-hosted, audited stack. Fortinet, Cisco and Microsoft inside. The unsexy guarantees that keep boards and regulators on side." },
        { no: "03", t: "Scalability.",    body: "From a salon with three chairs to a streaming network across four countries — same architecture, no rebuilds. We design for the version of you in 2029." },
        { no: "04", t: "Sustainability.", body: "Code, contracts and CMS your team can actually run after we leave. No vendor lock-in, no monthly retainer trap. We build it; you own it." }
      ],
      note: "In delivery partnership with <strong>SuSu Technology Trading</strong> — twelve years of ICT infrastructure, audiovisual and integration work across the Horn of Africa."
    },
    process: {
      no: "§ 04",
      tag: "How we work",
      h2: ["Five steps.", { italic: "No re-treatments." }],
      steps: [
        { no: "01", key: "LISTEN",  when: "Week 1",      t: "Listen, then disagree carefully.",     body: "A long-form intro call, a desk audit of what you have, and a written one-pager that disagrees with at least one thing you told us. If we agree with everything, we're not paying attention.", deliv: "Audit deck · Risk register · Scope letter" },
        { no: "02", key: "SKETCH",  when: "Week 2–3",    t: "Sketch in public.",                    body: "A shared Figma file you can comment on at 11pm. Three directions on the first review, one by the third. No black-box reveals.", deliv: "Wireframes · 3 visual routes · Component map" },
        { no: "03", key: "BUILD",   when: "Week 3–6",    t: "Build the boring parts first.",        body: "Auth, payments, CMS, GDPR. We get the un-screenshot-able infrastructure done first, so the last weeks are for craft, not catch-up.", deliv: "Stack: Next.js · Sanity · Stripe · i18n" },
        { no: "04", key: "POLISH",  when: "Week 6–10",   t: "Polish, then polish again.",           body: "Lighthouse 95+, accessibility audit, copy pass with a real editor, an OG-image for every page. The unglamorous week that decides how the site is remembered.", deliv: "A11y · Perf · Copy · SEO" },
        { no: "05", key: "STAY",    when: "After launch", t: "Stay close, quietly.",                 body: "A 30-day after-care window, then a light retainer if you want one. We don't pretend the launch is the finish line, and we don't camp on your inbox either.", deliv: "30-day after-care · Quarterly review" }
      ]
    },
    testimonial: {
      quote: "They were the only studio that pushed back on our brief — and the only one that delivered something we couldn't have written into the brief in the first place. Six weeks. Two languages. One taxi from the airport.",
      who: "Anneliese R.",
      role: "CEO, Donau Capital · Vienna"
    },
    pricing: {
      no: "§ 05",
      tag: "Pricing",
      h2: ["Three doors,", { italic: "all of them open." }],
      tiers: [
        {
          name: "Quickstart",
          tag: "SOLO · 4 WK",
          from: "€7.400",
          list: [
            "5-page editorial site on Next.js",
            "One language, bilingual-ready",
            "Sanity CMS, GDPR setup, Impressum",
            "Lighthouse 95+ on launch"
          ],
          cta: "Begin",
          door: "quickstart"
        },
        {
          name: "Atelier",
          tag: "MOST CHOSEN · 8–12 WK",
          from: "€18.000",
          list: [
            "Full custom site, system or app",
            "Bilingual DE/EN from day one",
            "One AI workflow built in",
            "Booking · CRM · payments where needed",
            "30-day after-care included"
          ],
          cta: "Talk to Yafet",
          door: "atelier",
          feat: true
        },
        {
          name: "Long view",
          tag: "RETAINER · 6+ MO",
          from: "€4.800/mo",
          list: [
            "Embedded design + engineering",
            "Roadmap reviewed every six weeks",
            "Direct line to Yafet",
            "Cancel any month with 30 days notice"
          ],
          cta: "Enquire",
          door: "longview"
        }
      ]
    },
    journal: {
      no: "§ 06",
      tag: "Journal",
      h2: ["Notes from", { italic: "the studio." }],
      articles: [
        { meta: "FIELD NOTES · 18.04.26", t: ["Why your booking system should ", { italic: "not be your CRM." }], read: "6 min" },
        { meta: "ESSAY · 02.04.26",       t: ["The unsexy AI workflow that saved a salon ", { italic: "9 hrs/week." }], read: "9 min" },
        { meta: "STUDIO · 14.03.26",      t: ["On Vienna, and why ", { italic: "\"small\" is the point." }], read: "4 min" }
      ]
    },
    contact: {
      h2: ["Let's build something", { italic: "worth keeping" }],
      email: "contact@yafetandco.com",
      phone: "+43 1 928 73 73",
      calendly: "Calendly → open · Tuesdays & Thursdays · CET",
      studio: "Schottenring 14/3, 1010 Wien · By appointment only",
      note: "An independent, founder-led digital studio in Vienna. Available for projects from Q3 2026."
    },
    faq: {
      tag: "TL;DR",
      h2: ["The quick answers,", { italic: "for the skim-readers." }],
      items: [
        { q: "What does Yafet & Co. do, in one line?", a: "We are an independent, founder-led digital studio in Vienna building websites, apps and quiet AI workflows for European SMEs, NGOs and public bodies." },
        { q: "Where are you based, and who do you work with?", a: "Vienna, Austria. We work primarily with Vienna and EU clients, with delivery partnerships across the Horn of Africa via SuSu Technology Trading." },
        { q: "Which languages do you build and write in?", a: "German and English are both first-class. Every Atelier project ships bilingual DE/EN from day one. Amharic localisation is available for African deployments." },
        { q: "How long does a typical project take?", a: "Quickstart sites: 4 weeks. Atelier custom builds: 8–12 weeks. MVPs for apps: 4–6 weeks. Long-view retainers: six months and up." },
        { q: "What does it cost to start?", a: "Quickstart from €7.400. Atelier from €18.000. Long view from €4.800/month. Estimates are firm before we begin — no scope creep that goes silent on price." },
        { q: "Who actually does the work?", a: "Yafet leads every project from intro call to launch. Specialists from our trusted bench join for delivery. The person who answered your first email is the person at the launch dinner." }
      ]
    },
    footer: {
      cols: [
        { h: "Studio", links: ["About", "Journal", "Careers", "Contact"] },
        { h: "Work",   links: ["Selected projects", "Services", "Process", "Pricing"] },
        { h: "Legal",  links: ["Impressum", "Privacy", "Terms", "Cookies"] }
      ],
      copy: "© 2021–2026 Yafet & Co · Vienna · Reg. 547382b",
      signature: "Made slowly, in Vienna.",
      blurb: "Notes on the slow craft of building for the businesses Europe keeps quiet about."
    },
    estimator: {
      h2: ["Project estimator.", { italic: " A first sketch." }],
      sub: "A live, in-browser sketch — not a quote. Move the levers; we'll show you which door you fit through.",
      services: ["Website", "App / Platform", "Booking / CRM", "AI Workflow"],
      addons: ["Booking", "CRM", "AI workflow", "Payments", "Bilingual DE/EN"],
      pagesLabel: "Pages / screens",
      timelineLabel: "Timeline (weeks)",
      summaryLabel: "Indicative budget",
      lineDefault: "Pick a service to begin — the line will follow you.",
      doors: { quickstart: "Quickstart", atelier: "Atelier", longview: "Long view" }
    },
    aiWidget: {
      label: "Ask the studio",
      title: "Ask the studio →",
      intro: "I'm a quiet assistant trained on this studio's services, process, pricing and availability. Ask me anything — I'll answer in Yafet's voice.",
      suggestions: [
        "How long does an Atelier project take?",
        "Do you build in German?",
        "What does an MVP cost?",
        "When is Yafet next available?"
      ],
      placeholder: "Ask about services, timelines, pricing…",
      send: "Send",
      thinking: "Thinking…",
      fallback: "I can answer about services, process, pricing and availability — try one of the prompts above, or ask me directly."
    },
    booking: {
      title: "Book a 30-min intro",
      intro: "A 30-minute introductory call with Yafet. No deck, no pitch — a conversation. Tuesdays & Thursdays, CET.",
      cta: "Open Calendly →",
      note: "Or write directly to contact@yafetandco.com."
    }
  },

  /* -----------------------------------------------------------
     German — [DE: …] placeholders. Fill in with real translation.
     ----------------------------------------------------------- */
  de: {
    nav: {
      links: ["[DE: Work]", "[DE: Services]", "[DE: Process]", "[DE: Pricing]", "[DE: Journal]", "[DE: Contact]"],
      cta: "[DE: Start a project.]"
    },
    hero: {
      label1: "VOL. 06 · DAS STUDIO",
      label2: "REC · 22:40:10 · WIEN",
      label3: "NR. 01 / DAS STUDIO BEI DER ARBEIT",
      kicker: "— STUDIO YAFET & CO · WIEN · MMXXVI",
      h1Lines: [
        ["[DE: Websites,]", null],
        ["[DE: apps, ]", { italic: "[DE: & quiet AI]" }],
        ["[DE: — made in]", null],
        ["[DE: Vienna.]", null]
      ],
      sub: "[DE: Notes on the slow craft of building for the businesses Europe keeps quiet about.]",
      ctaPrimary: "[DE: Book a 30-min intro]",
      ctaSecondary: "[DE: Selected work]",
      foot1: "EIN STUDIO, EINE STADT · 48°12′ N · 16°22′ E",
      foot2: "[DE: A FILM IN ONE BREATH]",
      footAvail: "[DE: Available for projects from Q3 2026]"
    },
    marquee: {
      partnersLabel: "[DE: IN PARTNERSHIP WITH]",
      partners: ["Microsoft", "Cisco", "Huawei", "Fortinet", "Hikvision", "ActiveXperts", "NatNet", "SuSu Technology"],
      industries: ["[DE: eCommerce]", "[DE: eLearning]", "[DE: Healthcare]", "[DE: Sports streaming]", "[DE: Public sector]", "[DE: ICT infrastructure]", "[DE: Audiovisual]", "[DE: Cloud & security]"]
    },
    services: {
      no: "§ 01",
      tag: "[DE: What we make]",
      h2: ["[DE: Eight disciplines,]", { italic: "[DE: one studio.]" }],
      list: [
        { t: "[DE: Website design & development]", body: "[DE: Editorial, fast, accessible sites built on Next.js with a CMS your team can actually run.]" },
        { t: "[DE: Website redesign]",              body: "[DE: Audit-first redesigns for sites that work but feel ten years older than the business behind them.]" },
        { t: "[DE: Booking & management systems]", body: "[DE: Salons, clinics, studios: custom calendars, no-show logic, payments, staff scheduling — owned, not rented.]" },
        { t: "[DE: Custom IT systems & CRMs]",     body: "[DE: Internal tools that replace eleven spreadsheets and a WhatsApp group. Quietly, then dramatically.]" },
        { t: "[DE: Mobile & web apps]",            body: "[DE: From MVP in six weeks to a product worth scaling — React Native, Next.js, the boring choices that pay off.]" },
        { t: "[DE: AI automation & integration]",  body: "[DE: Quiet automations that save twelve hours a week. Loud ones that change the business model. Both, where they fit.]" },
        { t: "[DE: Social media & content]",       body: "[DE: A point of view, a publishing cadence, and the editorial muscle to keep it going past month three.]" },
        { t: "[DE: Government & NGO platforms]",   body: "[DE: WCAG-AA accessible, GDPR-tight, multilingual platforms for public bodies and non-profits across the EU.]" }
      ]
    },
    stats: [
      { num: 12, suffix: "+", label: "[DE: years of <strong>combined craft</strong>]" },
      { num: 4,  pad: 2,      label: "[DE: industries — <strong>health, sport, edu, commerce</strong>]" },
      { num: 8,  pad: 2,      label: "[DE: <strong>tier-1 vendor partners</strong> across EU + Africa]" },
      { num: 1,  pad: 2,      label: "[DE: founder — <strong>the same person</strong> from intro to launch]" }
    ],
    ampPillar: {
      mega: "&",
      line: ["[DE: THE ]", { italic: "&" }, "[DE:  IS THE WORK.]"],
      body: "[DE: Design and engineering, strategy and shipping — not handed off in stages, but braided together from week one.]"
    },
    work: {
      no: "§ 02",
      tag: "[DE: Selected work · 2023–2025]",
      h2: ["[DE: An index of quiet,]", { italic: "[DE: shipped things.]" }],
      meta: "[DE: 04 CASES · SCROLL TO READ →]",
      cases: [
        { name: "Pietech.",      meta: "[DE: CLIENT · 2024 · ETH]",          pitch: "[DE: A marketplace that finally took local payments.]",       desc: "[DE: Multi-vendor eCommerce with Telebirr and CBE Birr fully integrated, Amharic/English checkout, and an admin panel the founders can actually run themselves.]", tags: ["Next.js","Postgres","Telebirr","CBE Birr","Multi-vendor"], status: "PIETECH · LIVE · ECOMMERCE · Addis Ababa, ET", viz: "pietech" },
        { name: "EthioSport.",   meta: "[DE: CLIENT · 2023 — ONGOING · ETH]", pitch: "[DE: A white-label OTT platform for African football leagues.]", desc: "[DE: Live and on-demand streaming with DRM, CDN edge delivery, Android & iOS apps, and a white-label admin for leagues to brand their own channel — built for low-bandwidth markets first.]", tags: ["HLS","DRM","CDN","iOS","Android"], status: "ETHIOSPORT · LIVE · OTT STREAMING · Pan-African · 4 leagues", viz: "ethiosport" },
        { name: "Amisoft.",      meta: "[DE: CLIENT · 2024 · ETH]",          pitch: "[DE: An online health record hospitals can actually run.]",   desc: "[DE: Patient records, lab orders, prescription tracking and a telehealth bridge — HL7-aware, mobile-first for the doctor walking the ward, and offline-tolerant where it matters.]", tags: ["HIS","HL7","React Native","Telehealth"], status: "AMISOFT · LIVE · HEALTH RECORD · Multi-hospital, ET", viz: "amisoft" },
        { name: "Kiyatech PLC.", meta: "[DE: CLIENT · 2023 · ETH]",          pitch: "[DE: A learning platform built for students who go offline.]", desc: "[DE: K-12 eLearning with Amharic localization, downloadable lessons that survive a four-hour bus ride, SCORM-compliant assessments, and a teacher dashboard the principal can read at a glance.]", tags: ["LMS","SCORM","Amharic","Offline-first"], status: "KIYATECH · LIVE · ELEARNING · K-12, ET", viz: "kiyatech" }
      ]
    },
    pillars: {
      no: "§ 03",
      tag: "[DE: The four S pillars]",
      h2: ["[DE: Technology]", { italic: "[DE: that lasts.]" }],
      list: [
        { no: "01", t: "[DE: Speed.]",          body: "[DE: From kickoff to live in weeks, not seasons. MVPs in 4–6 weeks. Custom builds in 8–12. Decisions on the same day we ask the question.]" },
        { no: "02", t: "[DE: Security.]",       body: "[DE: GDPR-native, EU-hosted, audited stack. Fortinet, Cisco and Microsoft inside. The unsexy guarantees that keep boards and regulators on side.]" },
        { no: "03", t: "[DE: Scalability.]",    body: "[DE: From a salon with three chairs to a streaming network across four countries — same architecture, no rebuilds. We design for the version of you in 2029.]" },
        { no: "04", t: "[DE: Sustainability.]", body: "[DE: Code, contracts and CMS your team can actually run after we leave. No vendor lock-in, no monthly retainer trap. We build it; you own it.]" }
      ],
      note: "[DE: In delivery partnership with <strong>SuSu Technology Trading</strong> — twelve years of ICT infrastructure, audiovisual and integration work across the Horn of Africa.]"
    },
    process: {
      no: "§ 04",
      tag: "[DE: How we work]",
      h2: ["[DE: Five steps.]", { italic: "[DE: No re-treatments.]" }],
      steps: [
        { no: "01", key: "LISTEN",  when: "[DE: Week 1]",      t: "[DE: Listen, then disagree carefully.]",     body: "[DE: A long-form intro call, a desk audit of what you have, and a written one-pager that disagrees with at least one thing you told us. If we agree with everything, we're not paying attention.]", deliv: "[DE: Audit deck · Risk register · Scope letter]" },
        { no: "02", key: "SKETCH",  when: "[DE: Week 2–3]",    t: "[DE: Sketch in public.]",                    body: "[DE: A shared Figma file you can comment on at 11pm. Three directions on the first review, one by the third. No black-box reveals.]", deliv: "[DE: Wireframes · 3 visual routes · Component map]" },
        { no: "03", key: "BUILD",   when: "[DE: Week 3–6]",    t: "[DE: Build the boring parts first.]",        body: "[DE: Auth, payments, CMS, GDPR. We get the un-screenshot-able infrastructure done first, so the last weeks are for craft, not catch-up.]", deliv: "[DE: Stack: Next.js · Sanity · Stripe · i18n]" },
        { no: "04", key: "POLISH",  when: "[DE: Week 6–10]",   t: "[DE: Polish, then polish again.]",           body: "[DE: Lighthouse 95+, accessibility audit, copy pass with a real editor, an OG-image for every page. The unglamorous week that decides how the site is remembered.]", deliv: "[DE: A11y · Perf · Copy · SEO]" },
        { no: "05", key: "STAY",    when: "[DE: After launch]", t: "[DE: Stay close, quietly.]",                 body: "[DE: A 30-day after-care window, then a light retainer if you want one. We don't pretend the launch is the finish line, and we don't camp on your inbox either.]", deliv: "[DE: 30-day after-care · Quarterly review]" }
      ]
    },
    testimonial: {
      quote: "[DE: They were the only studio that pushed back on our brief — and the only one that delivered something we couldn't have written into the brief in the first place. Six weeks. Two languages. One taxi from the airport.]",
      who: "Anneliese R.",
      role: "[DE: CEO, Donau Capital · Vienna]"
    },
    pricing: {
      no: "§ 05",
      tag: "[DE: Pricing]",
      h2: ["[DE: Three doors,]", { italic: "[DE: all of them open.]" }],
      tiers: [
        { name: "Quickstart", tag: "[DE: SOLO · 4 WK]",  from: "€7.400",     list: ["[DE: 5-page editorial site on Next.js]","[DE: One language, bilingual-ready]","[DE: Sanity CMS, GDPR setup, Impressum]","[DE: Lighthouse 95+ on launch]"], cta: "[DE: Begin]", door: "quickstart" },
        { name: "Atelier",    tag: "[DE: MOST CHOSEN · 8–12 WK]", from: "€18.000", list: ["[DE: Full custom site, system or app]","[DE: Bilingual DE/EN from day one]","[DE: One AI workflow built in]","[DE: Booking · CRM · payments where needed]","[DE: 30-day after-care included]"], cta: "[DE: Talk to Yafet]", door: "atelier", feat: true },
        { name: "Long view",  tag: "[DE: RETAINER · 6+ MO]", from: "€4.800/mo", list: ["[DE: Embedded design + engineering]","[DE: Roadmap reviewed every six weeks]","[DE: Direct line to Yafet]","[DE: Cancel any month with 30 days notice]"], cta: "[DE: Enquire]", door: "longview" }
      ]
    },
    journal: {
      no: "§ 06",
      tag: "[DE: Journal]",
      h2: ["[DE: Notes from]", { italic: "[DE: the studio.]" }],
      articles: [
        { meta: "[DE: FIELD NOTES · 18.04.26]", t: ["[DE: Why your booking system should ]", { italic: "[DE: not be your CRM.]" }], read: "[DE: 6 min]" },
        { meta: "[DE: ESSAY · 02.04.26]",       t: ["[DE: The unsexy AI workflow that saved a salon ]", { italic: "[DE: 9 hrs/week.]" }], read: "[DE: 9 min]" },
        { meta: "[DE: STUDIO · 14.03.26]",      t: ["[DE: On Vienna, and why ]", { italic: "[DE: \"small\" is the point.]" }], read: "[DE: 4 min]" }
      ]
    },
    contact: {
      h2: ["[DE: Let's build something]", { italic: "[DE: worth keeping]" }],
      email: "contact@yafetandco.com",
      phone: "+43 1 928 73 73",
      calendly: "[DE: Calendly → open · Tuesdays & Thursdays · CET]",
      studio: "[DE: Schottenring 14/3, 1010 Wien · By appointment only]",
      note: "[DE: An independent, founder-led digital studio in Vienna. Available for projects from Q3 2026.]"
    },
    faq: {
      tag: "[DE: TL;DR]",
      h2: ["[DE: The quick answers,]", { italic: "[DE: for the skim-readers.]" }],
      items: [
        { q: "[DE: What does Yafet & Co. do, in one line?]", a: "[DE: We are an independent, founder-led digital studio in Vienna…]" },
        { q: "[DE: Where are you based, and who do you work with?]", a: "[DE: Vienna, Austria. We work primarily with Vienna and EU clients…]" },
        { q: "[DE: Which languages do you build and write in?]", a: "[DE: German and English are both first-class…]" },
        { q: "[DE: How long does a typical project take?]", a: "[DE: Quickstart: 4 weeks. Atelier: 8–12 weeks. MVPs: 4–6 weeks.]" },
        { q: "[DE: What does it cost to start?]", a: "[DE: Quickstart from €7.400. Atelier from €18.000. Long view from €4.800/month.]" },
        { q: "[DE: Who actually does the work?]", a: "[DE: Yafet leads every project from intro call to launch.]" }
      ]
    },
    footer: {
      cols: [
        { h: "[DE: Studio]", links: ["[DE: About]", "[DE: Journal]", "[DE: Careers]", "[DE: Contact]"] },
        { h: "[DE: Work]",   links: ["[DE: Selected projects]", "[DE: Services]", "[DE: Process]", "[DE: Pricing]"] },
        { h: "[DE: Legal]",  links: ["Impressum", "[DE: Privacy]", "[DE: Terms]", "[DE: Cookies]"] }
      ],
      copy: "© 2021–2026 Yafet & Co · Wien · Reg. 547382b",
      signature: "[DE: Made slowly, in Vienna.]",
      blurb: "[DE: Notes on the slow craft of building for the businesses Europe keeps quiet about.]"
    },
    estimator: {
      h2: ["[DE: Project estimator.]", { italic: "[DE:  A first sketch.]" }],
      sub: "[DE: A live, in-browser sketch — not a quote. Move the levers; we'll show you which door you fit through.]",
      services: ["[DE: Website]", "[DE: App / Platform]", "[DE: Booking / CRM]", "[DE: AI Workflow]"],
      addons: ["[DE: Booking]", "[DE: CRM]", "[DE: AI workflow]", "[DE: Payments]", "[DE: Bilingual DE/EN]"],
      pagesLabel: "[DE: Pages / screens]",
      timelineLabel: "[DE: Timeline (weeks)]",
      summaryLabel: "[DE: Indicative budget]",
      lineDefault: "[DE: Pick a service to begin — the line will follow you.]",
      doors: { quickstart: "Quickstart", atelier: "Atelier", longview: "[DE: Long view]" }
    },
    aiWidget: {
      label: "[DE: Ask the studio]",
      title: "[DE: Ask the studio →]",
      intro: "[DE: I'm a quiet assistant trained on this studio's services, process, pricing and availability.]",
      suggestions: [
        "[DE: How long does an Atelier project take?]",
        "[DE: Do you build in German?]",
        "[DE: What does an MVP cost?]",
        "[DE: When is Yafet next available?]"
      ],
      placeholder: "[DE: Ask about services, timelines, pricing…]",
      send: "[DE: Send]",
      thinking: "[DE: Thinking…]",
      fallback: "[DE: I can answer about services, process, pricing and availability — try one of the prompts above.]"
    },
    booking: {
      title: "[DE: Book a 30-min intro]",
      intro: "[DE: A 30-minute introductory call with Yafet. No deck, no pitch — a conversation. Tuesdays & Thursdays, CET.]",
      cta: "[DE: Open Calendly →]",
      note: "[DE: Or write directly to contact@yafetandco.com.]"
    }
  }
};

// Keep the disabled DE toggle safe if it is re-enabled before translation.
window.YC_CONTENT.de = window.YC_CONTENT.en;
