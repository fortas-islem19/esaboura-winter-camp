/* =====================================================================
   مخيم المهارات 03 — سلوك الصفحة
   - تطبيق الإعدادات (config.js)
   - العدّاد التنازلي، الظهور التدريجي، الشريط الثابت
   - استمارة التسجيل → FormBold + أحداث بيكسل ميتا
   ===================================================================== */
(function () {
  'use strict';

  var CFG = window.SITE_CONFIG || {};
  var CONTACT = CFG.contact || {};
  var FORM_LABEL = 'مخيم المهارات 03';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function hasValue(v) { return v !== undefined && v !== null && String(v).trim() !== ''; }
  var REDUCE_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- Meta Pixel + Conversions API ----------
     كل حدث يُرسل مرتين بنفس event_id: من المتصفح (البيكسل) ومن الخادم (/api/capi)،
     فتعتبرهما ميتا حدثًا واحدًا وتحتفظ بالأكمل. */
  var PIXEL_ON = /^\d{6,20}$/.test(String(CFG.metaPixelId || ''));
  var CAPI_URL = PIXEL_ON && hasValue(CFG.capiEndpoint) ? String(CFG.capiEndpoint).trim() : '';

  function newEventId(name) {
    return String(name).toLowerCase() + '.' + Date.now().toString(36) + '.' + Math.random().toString(36).slice(2, 10);
  }
  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function storageGet(store, key) { try { return window[store].getItem(key) || ''; } catch (e) { return ''; } }
  function storageSet(store, key, value) { try { window[store].setItem(key, value); } catch (e) { /* لا شيء */ } }

  // معرّف زائر ثابت (يُشفَّر في الخادم) لربط أحداث الزائر نفسه
  function visitorId() {
    var id = storageGet('localStorage', 'sk03_vid');
    if (!id) {
      id = 'v.' + Date.now().toString(36) + '.' + Math.random().toString(36).slice(2, 12);
      storageSet('localStorage', 'sk03_vid', id);
    }
    return id;
  }
  // معرّف النقرة على الإعلان: من ملف تعريف البيكسل، أو يُبنى من fbclid في الرابط
  function clickId() {
    var fbc = getCookie('_fbc') || storageGet('localStorage', 'sk03_fbc');
    if (fbc) { return fbc; }
    var fbclid = '';
    try { fbclid = new URLSearchParams(window.location.search).get('fbclid') || ''; } catch (e) { /* لا شيء */ }
    if (!fbclid) { return ''; }
    fbc = 'fb.1.' + Date.now() + '.' + fbclid;
    storageSet('localStorage', 'sk03_fbc', fbc);
    return fbc;
  }

  function sendCapi(eventName, eventId, customData, userData) {
    if (!CAPI_URL) { return; }
    var user = { fbp: getCookie('_fbp'), fbc: clickId(), external_id: visitorId() };
    Object.keys(userData || {}).forEach(function (k) { user[k] = userData[k]; });
    var body = JSON.stringify({
      event_name: eventName,
      event_id: eventId,
      event_source_url: window.location.href.split('#')[0],
      custom_data: customData || {},
      user_data: user
    });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(CAPI_URL, new Blob([body], { type: 'application/json' }))) { return; }
    } catch (e) { /* ننتقل إلى fetch */ }
    try {
      fetch(CAPI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true })
        .catch(function () { /* لا شيء */ });
    } catch (e) { /* لا شيء */ }
  }

  function track(event, params, opts) {
    opts = opts || {};
    if (!PIXEL_ON) { return; }
    var eventId = opts.eventId || newEventId(event);
    try {
      if (typeof window.fbq === 'function') {
        window.fbq(opts.custom ? 'trackCustom' : 'track', event, params || {}, { eventID: eventId });
      }
    } catch (e) { /* لا شيء */ }
    sendCapi(event, eventId, params, opts.userData);
  }

  // PageView من الخادم بنفس معرّف البيكسل (بعد التحميل ليكون ملف _fbp جاهزًا)
  if (CAPI_URL && window.__sk03PageViewId) {
    window.addEventListener('load', function () {
      setTimeout(function () { sendCapi('PageView', window.__sk03PageViewId, {}); }, 300);
    });
  }


  /* ---------- الإعدادات: الأسعار ---------- */
  var PRICES = CFG.prices || {};
  function priceNumber(v) {
    var n = Number(String(v).replace(/[^\d.]/g, ''));
    return isFinite(n) && n > 0 ? n : 0;
  }
  function formatPrice(v) {
    var n = priceNumber(v);
    if (!n) { return String(v); }
    // الفاصلة (18,000) تُبقي الرقم كتلة واحدة؛ المسافة (18 000) تجعله يظهر معكوسًا في النص العربي
    return n.toLocaleString('en-US') + ' دج';
  }
  $$('[data-price]').forEach(function (el) {
    var v = PRICES[el.getAttribute('data-price')];
    if (hasValue(v)) {
      var out = $('[data-price-value]', el);
      if (out) { out.textContent = formatPrice(v); }
      el.hidden = false;
    }
  });
  // باقة المخيم كاملاً: السعر الأصلي (مجموع الدورات) ومقدار التوفير
  (function bundleSavings() {
    var bundle = priceNumber(PRICES.all || 0);
    var sum = priceNumber(PRICES.writing || 0) + priceNumber(PRICES.datascience || 0) + priceNumber(PRICES.spss || 0);
    if (!bundle || sum <= bundle) { return; }
    var was = $('[data-price-was]');
    var save = $('[data-price-save]');
    if (was) { was.textContent = formatPrice(sum); was.hidden = false; }
    if (save) { save.textContent = 'وفّر ' + formatPrice(sum - bundle); save.hidden = false; }
    var inline = $('[data-price-inline="all"]');
    if (inline) { inline.setAttribute('data-price-suffix', ' · وفّر ' + formatPrice(sum - bundle)); }
  })();

  // السعر بجانب كل خيار في الاستمارة
  $$('[data-price-inline]').forEach(function (el) {
    var v = PRICES[el.getAttribute('data-price-inline')];
    if (hasValue(v)) {
      el.textContent = formatPrice(v) + (el.getAttribute('data-price-suffix') || '');
      el.hidden = false;
    }
  });

  /* ---------- الإعدادات: التواصل ---------- */
  var phone = hasValue(CONTACT.phone) ? String(CONTACT.phone).trim() : '';
  var wa = hasValue(CONTACT.whatsapp) ? String(CONTACT.whatsapp).replace(/\D/g, '') : '';
  var WA_DEFAULT_MSG = 'السلام عليكم، أودّ الاستفسار عن ' + FORM_LABEL + ' بمدرسة السبورة سطيف.';

  function waLink(text) {
    return 'https://wa.me/' + wa + (text ? '?text=' + encodeURIComponent(text) : '');
  }

  $$('[data-contact]').forEach(function (el) {
    var type = el.getAttribute('data-contact');
    var label = $('[data-contact-label]', el);
    var href = '';
    var text = '';
    switch (type) {
      case 'phone':
        if (phone) { href = 'tel:' + phone.replace(/[^\d+]/g, ''); text = phone; }
        break;
      case 'whatsapp':
      case 'whatsapp-float':
        if (wa) { href = waLink(WA_DEFAULT_MSG); text = 'راسلنا عبر واتساب'; }
        break;
      case 'email':
        if (hasValue(CONTACT.email)) { href = 'mailto:' + String(CONTACT.email).trim(); text = String(CONTACT.email).trim(); }
        break;
      case 'facebook':
      case 'instagram':
        if (hasValue(CONTACT[type])) { href = String(CONTACT[type]).trim(); }
        break;
      case 'address':
        if (hasValue(CONTACT.address)) {
          text = String(CONTACT.address).trim();
          if (hasValue(CONTACT.mapUrl)) {
            href = String(CONTACT.mapUrl).trim();
            el.target = '_blank';
            el.rel = 'noopener';
          }
        }
        break;
    }
    if (href) { el.href = href; }
    if (label && text) { label.textContent = text; }
    var show = type === 'address' ? !!text : !!href;
    el.hidden = !show;
    var li = el.closest('li');
    if (li) { li.hidden = !show; }
  });

  // إخفاء مجموعات التواصل الفارغة
  $$('[data-contact-group]').forEach(function (group) {
    var visible = $$('[data-contact]', group).some(function (a) { return !a.hidden; });
    group.hidden = !visible;
  });

  // حدث «Contact» عند النقر على الهاتف أو واتساب
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-contact="phone"], [data-contact="whatsapp"], [data-contact="whatsapp-float"], [data-success-wa]');
    if (a) { track('Contact', { content_name: FORM_LABEL }); }
  });

  /* ---------- معلومات الدفع: CCP / بريدي موب / نقدًا ---------- */
  var PAY = CFG.payment || {};
  var PAY_METHODS = [
    { key: 'ccp', tab: 'الحساب البريدي', name: 'الحساب البريدي CCP', icon: 'i-mail', title: 'الدفع عبر الحساب البريدي الجاري (CCP)', ok: hasValue(PAY.ccp) },
    { key: 'baridimob', tab: 'بريدي موب', name: 'بريدي موب (BaridiMob)', icon: 'i-phone', title: 'الدفع عبر تطبيق بريدي موب (BaridiMob)', ok: hasValue(PAY.rib) },
    { key: 'cash', tab: 'نقدًا (كاش)', name: 'نقدًا (كاش)', icon: 'i-cash', title: 'الدفع نقدًا (كاش)', ok: true }
  ].filter(function (m) { return m.ok; });

  function esc(v) {
    return String(v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function iconSvg(id) { return '<svg class="i" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function payField(label, sub, value, copyKey) {
    return '<div class="pay-field"><dt>' + label + (sub ? ' <small>' + sub + '</small>' : '') + '</dt><dd>' +
      '<bdi dir="ltr">' + esc(String(value).trim()) + '</bdi>' +
      (copyKey ? '<button type="button" class="copy" data-copy-from="' + copyKey + '" aria-label="نسخ ' + label + '">' + iconSvg('i-copy') + '<span>نسخ</span></button>' : '') +
      '</dd></div>';
  }
  function paySteps(list) {
    return '<ol class="pay-steps">' + list.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ol>';
  }
  function payPanel(key) {
    var holder = hasValue(PAY.holder) ? payField('الاسم', 'Nom', PAY.holder) : '';
    if (key === 'ccp') {
      return '<dl class="pay-fields">' + payField('رقم الحساب', 'Compte CCP', PAY.ccp, 'ccp') +
        (hasValue(PAY.ccpKey) ? payField('المفتاح', 'Clé', PAY.ccpKey) : '') + holder + '</dl>' +
        paySteps(['ادفع المبلغ في أي مكتب بريد إلى الحساب أعلاه.', 'صوّر الوصل بوضوح.', 'أرسل صورة الوصل عبر واتساب للتحقق وتأكيد مقعدك.']);
    }
    if (key === 'baridimob') {
      return '<dl class="pay-fields">' + payField('RIB', '', PAY.rib, 'rib') + holder + '</dl>' +
        paySteps(['حوّل المبلغ من تطبيق بريدي موب إلى الـ RIB أعلاه.', 'التقط صورة لوصل التحويل.', 'أرسل الصورة عبر واتساب للتحقق وتأكيد مقعدك.']);
    }
    var place = hasValue(PAY.cashPlace) ? String(PAY.cashPlace).trim() : 'مقر مدرسة السبورة — سطيف';
    var map = hasValue(CONTACT.mapUrl) ? ' <a href="' + esc(CONTACT.mapUrl) + '" target="_blank" rel="noopener">الخريطة</a>' : '';
    return '<dl class="pay-fields"><div class="pay-field"><dt>المكان</dt><dd><span>' + esc(place) + '</span>' + map + '</dd></div></dl>' +
      paySteps(['راسلنا عبر واتساب لتحديد موعد الدفع.', 'ادفع المبلغ نقدًا في مقر المدرسة واستلم وصلك.', 'يُؤكَّد مقعدك فور الدفع.']);
  }
  function renderPayWidget(box, selected) {
    if (!PAY_METHODS.length) { box.hidden = true; return null; }
    if (box._payShow) { box._payShow(selected); return box._payShow; }
    box.innerHTML =
      '<div class="pay-tabs" role="tablist" aria-label="طريقة الدفع">' +
      PAY_METHODS.map(function (m) {
        return '<button type="button" role="tab" class="pay-tab" data-method="' + m.key + '" aria-selected="false">' + iconSvg(m.icon) + '<span>' + m.tab + '</span></button>';
      }).join('') +
      '</div><div class="pay-panel" role="tabpanel"></div>';
    function show(key) {
      var m = PAY_METHODS.filter(function (x) { return x.key === key; })[0] || PAY_METHODS[0];
      $$('.pay-tab', box).forEach(function (t) { t.setAttribute('aria-selected', String(t.getAttribute('data-method') === m.key)); });
      $('.pay-panel', box).innerHTML = '<p class="pay-title">' + iconSvg(m.icon) + m.title + '</p>' + payPanel(m.key);
      if (typeof box._onMethod === 'function') { box._onMethod(m.key); }
    }
    box.addEventListener('click', function (e) {
      var tab = e.target.closest('.pay-tab');
      if (tab && box.contains(tab)) { show(tab.getAttribute('data-method')); }
    });
    box._payShow = show;
    show(selected);
    return show;
  }
  function payMethodName(key) {
    var m = PAY_METHODS.filter(function (x) { return x.key === key; })[0];
    return m ? m.name : key;
  }
  // صندوق «معلومات الدفع» في قسم التسجيل
  $$('[data-pay-widget]').forEach(function (box) {
    if (!box.hasAttribute('data-pay-success')) { renderPayWidget(box, 'ccp'); }
  });

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) { return navigator.clipboard.writeText(text); }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) { resolve(); } else { reject(new Error('copy failed')); }
    });
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-copy-from]');
    if (!btn) { return; }
    var value = String(PAY[btn.getAttribute('data-copy-from')] || '').trim();
    if (!value) { return; }
    var label = $('span', btn);
    copyText(value).then(function () {
      btn.classList.add('is-copied');
      if (label) { label.textContent = 'تم النسخ'; }
      setTimeout(function () {
        btn.classList.toggle('is-copied', false);
        if (label) { label.textContent = 'نسخ'; }
      }, 1800);
    }).catch(function () { /* المستخدم يستطيع النسخ يدويًا */ });
  });

  /* ---------- السنة في التذييل ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* ---------- الترويسة عند التمرير ---------- */
  var header = $('[data-header]');
  function onScroll() {
    if (header) { header.classList.toggle('is-scrolled', window.scrollY > 24); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- العدّاد التنازلي ---------- */
  (function countdown() {
    var box = $('[data-countdown]');
    if (!box) { return; }
    var target = Date.parse(CFG.campStart || '2026-12-17T08:00:00+01:00');
    if (isNaN(target)) { box.hidden = true; return; }
    var parts = {
      days: $('[data-cd="days"]', box),
      hours: $('[data-cd="hours"]', box),
      minutes: $('[data-cd="minutes"]', box),
      seconds: $('[data-cd="seconds"]', box)
    };
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    var first = true;
    function setPart(el, value) {
      if (el.textContent === value) { return; }
      el.textContent = value;
      if (first || REDUCE_MOTION) { return; }
      el.classList.toggle('cd-tick', false);
      void el.offsetWidth; // إعادة تشغيل الحركة
      el.classList.toggle('cd-tick', true);
    }
    var timer;
    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) {
        box.hidden = true;
        if (timer) { clearInterval(timer); }
        return;
      }
      var s = Math.floor(diff / 1000);
      setPart(parts.days, String(Math.floor(s / 86400)));
      setPart(parts.hours, pad(Math.floor((s % 86400) / 3600)));
      setPart(parts.minutes, pad(Math.floor((s % 3600) / 60)));
      setPart(parts.seconds, pad(s % 60));
    }
    tick();
    first = false;
    timer = setInterval(tick, 1000);
  })();

  /* ---------- ثلج خفيف في الواجهة (مخيم شتوي) ---------- */
  (function snow() {
    var hero = $('.hero');
    if (!hero || REDUCE_MOTION) { return; }
    var box = document.createElement('div');
    box.className = 'snow';
    box.setAttribute('aria-hidden', 'true');
    var count = window.innerWidth < 640 ? 12 : 24;
    for (var i = 0; i < count; i++) {
      var f = document.createElement('span');
      f.className = 'flake';
      var size = 2 + Math.random() * 4;
      f.style.cssText =
        '--x:' + (Math.random() * 100).toFixed(1) + '%;' +
        '--s:' + size.toFixed(1) + 'px;' +
        '--o:' + (0.25 + Math.random() * 0.45).toFixed(2) + ';' +
        '--b:' + (size > 4.5 ? 1.2 : 0) + 'px;' +
        '--t:' + (9 + Math.random() * 9).toFixed(1) + 's;' +
        '--delay:' + (Math.random() * 9).toFixed(1) + 's;' +
        '--sway:' + (Math.random() * 60 - 30).toFixed(0) + 'px;';
      box.appendChild(f);
    }
    hero.insertBefore(box, hero.firstChild);

    // إيقاف الحركات المستمرّة حين تخرج الواجهة من الشاشة
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        hero.classList.toggle('is-offscreen', !entries[0].isIntersecting);
      }).observe(hero);
    }
  })();

  /* ---------- عدّاد الأرقام في شريط الإحصائيات ---------- */
  (function countUp() {
    var els = $$('[data-count]');
    if (!els.length || REDUCE_MOTION || !('IntersectionObserver' in window)) { return; }
    function format(el, n) {
      var width = parseInt(el.getAttribute('data-pad') || '0', 10);
      var txt = String(n);
      while (txt.length < width) { txt = '0' + txt; }
      return (el.getAttribute('data-prefix') || '') + txt;
    }
    function run(el, delay) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      var start = null;
      var duration = 1100;
      setTimeout(function () {
        requestAnimationFrame(function step(ts) {
          if (start === null) { start = ts; }
          var t = Math.min(1, (ts - start) / duration);
          var eased = 1 - Math.pow(1 - t, 3);
          el.textContent = format(el, Math.round(target * eased));
          if (t < 1) { requestAnimationFrame(step); }
        });
      }, delay);
    }
    els.forEach(function (el) { el.textContent = format(el, 0); });
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) { return; }
      io.disconnect();
      els.forEach(function (el, i) { run(el, i * 140); });
    }, { threshold: 0.4 });
    io.observe(els[0].closest('.stats') || els[0]);
  })();

  /* ---------- الظهور التدريجي + أحداث المشاهدة ---------- */
  var reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { revealObserver.observe(el); });

    var program = $('#program');
    if (program) {
      var viewObserver = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          track('ViewContent', { content_name: FORM_LABEL + ' — البرنامج', content_category: 'Training' });
          viewObserver.disconnect();
        }
      }, { threshold: 0, rootMargin: '0px 0px -50% 0px' }); // عند بلوغ القسم منتصف الشاشة
      viewObserver.observe(program);
    }
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- الشريط الثابت على الهاتف ---------- */
  (function stickyCta() {
    var bar = $('[data-sticky-cta]');
    if (!bar || !('IntersectionObserver' in window)) { return; }
    var link = $('a', bar);
    var waFloat = $('.wa-float');
    var hidden = { hero: true, register: false, footer: false };
    var targets = { hero: $('.hero'), register: $('#register'), footer: $('.site-footer') };
    function update() {
      var show = !hidden.hero && !hidden.register && !hidden.footer;
      bar.classList.toggle('is-visible', show);
      bar.setAttribute('aria-hidden', show ? 'false' : 'true');
      if (link) { link.tabIndex = show ? 0 : -1; }
      // قسم التسجيل فيه زر واتساب خاص به، فنُخفي الزر العائم كي لا يغطّي حقول الاستمارة
      if (waFloat) { waFloat.classList.toggle('is-tucked', hidden.register); }
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        Object.keys(targets).forEach(function (key) {
          if (targets[key] === entry.target) { hidden[key] = entry.isIntersecting; }
        });
      });
      update();
    }, { threshold: 0 });
    Object.keys(targets).forEach(function (key) { if (targets[key]) { io.observe(targets[key]); } });
  })();

  /* =====================================================================
     استمارة التسجيل
     ===================================================================== */
  var form = $('#register-form');
  if (!form) { return; }
  form.noValidate = true; // نتولّى التحقق بالعربية بدل رسائل المتصفح

  var successBox = $('#form-success');
  var statusEl = $('.form-status', form);
  var submitBtn = $('.btn-submit', form);
  var coursesHidden = $('#f-courses', form);
  var boxes = $$('input[data-course]', form);
  var allBox = boxes.filter(function (b) { return b.getAttribute('data-course') === 'all'; })[0];
  var singles = boxes.filter(function (b) { return b !== allBox; });
  var fields = {
    name: $('#f-name', form),
    phone: $('#f-phone', form),
    email: $('#f-email', form),
    wilaya: $('#f-wilaya', form),
    status: $('#f-status', form)
  };
  var coursesField = $('.courses-field', form);
  var payMethodField = $('.paymethod-field', form);
  $$('input[name="payment_method"]', form).forEach(function (r) {
    r.addEventListener('change', function () { clearError(payMethodField, $('#e-paymethod')); });
  });

  /* --- بيانات الحملة (UTM) --- */
  (function captureUtm() {
    var params;
    try { params = new URLSearchParams(window.location.search); } catch (e) { return; }
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'].forEach(function (key) {
      var input = form.elements[key];
      var value = params.get(key);
      if (!value) {
        try { value = sessionStorage.getItem('sk03_' + key) || ''; } catch (e) { value = ''; }
      } else {
        try { sessionStorage.setItem('sk03_' + key, value); } catch (e) { /* لا شيء */ }
      }
      if (input && value) { input.value = value.slice(0, 200); }
    });
  })();

  /* --- اختيار الدورات --- */
  function selectedCourses() {
    if (allBox && allBox.checked) { return [allBox.value]; }
    return singles.filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
  }
  function selectedKeys() {
    if (allBox && allBox.checked) { return ['writing', 'datascience', 'spss']; }
    return singles.filter(function (b) { return b.checked; }).map(function (b) { return b.getAttribute('data-course'); });
  }
  function syncCourses() {
    var list = selectedCourses();
    coursesHidden.value = list.join(' + ');
    if (list.length) { clearError(coursesField, $('#e-courses')); }
  }
  if (allBox) {
    allBox.addEventListener('change', function () {
      singles.forEach(function (b) { b.checked = allBox.checked; });
      syncCourses();
    });
  }
  singles.forEach(function (b) {
    b.addEventListener('change', function () {
      if (allBox) { allBox.checked = singles.every(function (x) { return x.checked; }); }
      syncCourses();
    });
  });

  function setCourse(key) {
    if (key === 'all') {
      if (allBox) { allBox.checked = true; }
      singles.forEach(function (b) { b.checked = true; });
    } else {
      boxes.forEach(function (b) { if (b.getAttribute('data-course') === key) { b.checked = true; } });
      if (allBox) { allBox.checked = singles.every(function (x) { return x.checked; }); }
    }
    syncCourses();
  }
  $$('[data-select-course]').forEach(function (btn) {
    btn.addEventListener('click', function () { setCourse(btn.getAttribute('data-select-course')); });
  });

  /* --- التحقق --- */
  function fieldWrap(input) { return input.closest('.field'); }
  function setError(wrap, errEl, msg, input) {
    if (wrap) { wrap.classList.add('is-invalid'); }
    if (errEl) { errEl.textContent = msg; }
    if (input) { input.setAttribute('aria-invalid', 'true'); }
  }
  function clearError(wrap, errEl, input) {
    if (wrap) { wrap.classList.remove('is-invalid'); }
    if (errEl) { errEl.textContent = ''; }
    if (input) { input.removeAttribute('aria-invalid'); }
  }

  function normalizePhone(v) {
    var s = String(v || '').replace(/[\s\-().]/g, '');
    // تحويل الأرقام العربية-الهندية إن وُجدت
    s = s.replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
         .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); });
    return s;
  }
  function isValidPhone(v) {
    var s = normalizePhone(v);
    var dz = /^(?:(?:\+|00)213|0)(?:[5-7]\d{8}|[2-4]\d{7})$/; // جوّال أو ثابت جزائري
    var intl = /^(?:\+|00)\d{8,15}$/;                         // رقم دولي
    return dz.test(s) || intl.test(s);
  }
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var rules = [
    { input: fields.name, err: '#e-name', check: function (v) { return v.trim().length >= 3; }, msg: 'يرجى إدخال الاسم واللقب.' },
    { input: fields.phone, err: '#e-phone', check: isValidPhone, msg: 'يرجى إدخال رقم هاتف صحيح، مثال: 0555 12 34 56' },
    { input: fields.email, err: '#e-email', check: function (v) { return !v.trim() || EMAIL_RE.test(v.trim()); }, msg: 'صيغة البريد الإلكتروني غير صحيحة.' },
    { input: fields.wilaya, err: '#e-wilaya', check: function (v) { return v.trim().length >= 2; }, msg: 'يرجى إدخال ولايتك.' },
    { input: fields.status, err: '#e-status', check: function (v) { return !!v; }, msg: 'يرجى اختيار صفتك.' }
  ];

  function validate() {
    var firstInvalid = null;
    rules.forEach(function (r) {
      if (!r.input) { return; }
      var ok = r.check(r.input.value || '');
      if (ok) {
        clearError(fieldWrap(r.input), $(r.err), r.input);
      } else {
        setError(fieldWrap(r.input), $(r.err), r.msg, r.input);
        if (!firstInvalid) { firstInvalid = r.input; }
      }
    });
    syncCourses();
    if (!coursesHidden.value) {
      setError(coursesField, $('#e-courses'), 'اختر دورة واحدة على الأقل.');
      if (!firstInvalid) { firstInvalid = singles[0]; }
    }
    if (payMethodField && !form.querySelector('input[name="payment_method"]:checked')) {
      setError(payMethodField, $('#e-paymethod'), 'اختر طريقة الدفع.');
      if (!firstInvalid) { firstInvalid = form.querySelector('input[name="payment_method"]'); }
    }
    if (firstInvalid) {
      firstInvalid.focus({ preventScroll: true });
      var target = firstInvalid.closest('.field') || firstInvalid;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  }

  // إزالة رسالة الخطأ أثناء التصحيح
  rules.forEach(function (r) {
    if (!r.input) { return; }
    var evt = r.input.tagName === 'SELECT' ? 'change' : 'input';
    r.input.addEventListener(evt, function () {
      if (fieldWrap(r.input).classList.contains('is-invalid') && r.check(r.input.value || '')) {
        clearError(fieldWrap(r.input), $(r.err), r.input);
      }
    });
    r.input.addEventListener('blur', function () {
      var v = r.input.value || '';
      if (v.trim() && !r.check(v)) { setError(fieldWrap(r.input), $(r.err), r.msg, r.input); }
    });
  });

  /* --- حدث بدء التعبئة (مرة واحدة) --- */
  var started = false;
  form.addEventListener('focusin', function () {
    if (started) { return; }
    started = true;
    track('FormStart', { content_name: FORM_LABEL }, { custom: true });
  });

  /* --- الإرسال --- */
  var submitting = false;

  function setLoading(on) {
    submitting = on;
    submitBtn.classList.toggle('is-loading', on);
    submitBtn.setAttribute('aria-busy', on ? 'true' : 'false');
    $('.btn-label', submitBtn).textContent = on ? 'جارٍ الإرسال…' : 'أرسل طلب التسجيل';
  }

  function makeId() {
    return 'SK03-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function algiersTime() {
    try {
      return new Date().toLocaleString('fr-DZ', { timeZone: 'Africa/Algiers', dateStyle: 'short', timeStyle: 'medium' });
    } catch (e) {
      return new Date().toISOString();
    }
  }

  function buildPayload() {
    form.elements.submission_id.value = makeId();
    form.elements.submitted_at.value = algiersTime();
    form.elements.page_url.value = window.location.href.split('#')[0];
    var fd = new FormData(form);
    fd.delete('website');
    fd.delete('courses_list');
    fd.set('courses', coursesHidden.value);
    fd.set('phone', normalizePhone(fields.phone.value));
    fd.set('full_name', fields.name.value.trim());
    var due = leadValue();
    fd.set('amount_due', due > 0 ? formatPrice(due) : '');
    return fd;
  }

  function leadValue() {
    var keys = selectedKeys();
    var total = 0;
    if (allBox && allBox.checked && hasValue(PRICES.all)) {
      total = priceNumber(PRICES.all);
    } else {
      keys.forEach(function (k) { total += priceNumber(PRICES[k]); });
    }
    return total;
  }

  function onSuccess() {
    var name = fields.name.value.trim();
    var phoneVal = normalizePhone(fields.phone.value);
    var courses = coursesHidden.value;

    // حدث Purchase (هدف حملات المبيعات): القيمة = رسوم الدورات المختارة بالدينار
    var value = leadValue();
    var keys = (allBox && allBox.checked) ? ['all'] : selectedKeys();
    var params = {
      content_name: courses,
      content_category: FORM_LABEL,
      content_type: 'product',
      content_ids: keys,
      num_items: keys.length,
      value: value,
      currency: 'DZD'
    };
    // بيانات المطابقة تُرسل إلى خادمنا فقط، ويشفّرها (SHA-256) قبل إرسالها إلى ميتا
    track('Purchase', params, {
      userData: { full_name: name, ph: phoneVal, em: (fields.email.value || '').trim() }
    });

    $('[data-success-name]', successBox).textContent = name.split(/\s+/)[0] || name;
    $('[data-success-courses]', successBox).textContent = courses ? 'الدورات المختارة: ' + courses.split(' + ').join('، ') : '';
    var amountRow = $('[data-success-amount-row]', successBox);
    if (amountRow) {
      $('[data-success-amount]', successBox).textContent = value > 0 ? formatPrice(value) : '';
      amountRow.hidden = !(value > 0);
    }

    var methodInput = form.querySelector('input[name="payment_method"]:checked');
    var methodKey = methodInput ? methodInput.getAttribute('data-method') : 'ccp';
    var waBtn = $('[data-success-wa]', successBox);
    var waLabel = waBtn ? $('[data-wa-label]', waBtn) : null;
    function updateWa(key) {
      if (!wa || !waBtn) { return; }
      var cash = key === 'cash';
      waBtn.href = waLink(
        'السلام عليكم، سجّلت في ' + FORM_LABEL + ' بمدرسة السبورة سطيف' +
        (cash ? '، وأودّ تحديد موعد للدفع نقدًا.' : '، وهذه صورة وصل الدفع.') + '\n' +
        'الاسم: ' + name + '\n' +
        'الهاتف: ' + phoneVal + '\n' +
        'الدورات: ' + courses.split(' + ').join('، ') +
        (value > 0 ? '\nالمبلغ: ' + formatPrice(value) : '') + '\n' +
        'طريقة الدفع: ' + payMethodName(key)
      );
      if (waLabel) { waLabel.textContent = cash ? 'راسلنا عبر واتساب لتحديد موعد الدفع' : 'أرسل صورة الوصل عبر واتساب'; }
      waBtn.hidden = false;
    }
    var payBox = $('[data-pay-success]', successBox);
    if (payBox) {
      payBox._onMethod = updateWa;
      renderPayWidget(payBox, methodKey);
    } else {
      updateWa(methodKey);
    }

    form.hidden = true;
    successBox.hidden = false;
    successBox.focus({ preventScroll: true });
    successBox.closest('.form-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function onError() {
    var alt = '';
    if (wa) {
      alt = ' أو <a href="' + waLink(WA_DEFAULT_MSG) + '" target="_blank" rel="noopener">راسلنا عبر واتساب</a>';
    } else if (phone) {
      alt = ' أو اتصل بنا على <a href="tel:' + phone.replace(/[^\d+]/g, '') + '" dir="ltr">' + phone.replace(/[<>&"]/g, '') + '</a>';
    }
    statusEl.innerHTML = 'تعذّر إرسال الاستمارة. تحقّق من اتصالك بالإنترنت ثم أعد المحاولة' + alt + '.';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submitting) { return; }
    statusEl.textContent = '';

    // روبوت: نتظاهر بالنجاح دون إرسال
    if (form.elements.website && form.elements.website.value) {
      form.hidden = true;
      successBox.hidden = false;
      return;
    }

    if (!validate()) {
      statusEl.textContent = 'يرجى تصحيح الحقول المشار إليها أعلاه.';
      return;
    }

    var endpoint = CFG.formEndpoint || form.getAttribute('action');
    var payload = buildPayload();
    setLoading(true);

    fetch(endpoint, { method: 'POST', body: payload, headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        onSuccess();
      })
      .catch(function (err) {
        // TypeError = خطأ شبكة أو منع CORS لقراءة الرد. نعيد المحاولة بوضع no-cors
        // الذي يضمن وصول الطلب حتى إن تعذّرت قراءة الرد (المعرّف submission_id نفسه يكشف أي تكرار).
        if (err && err.name === 'TypeError') {
          return fetch(endpoint, { method: 'POST', body: payload, mode: 'no-cors' })
            .then(onSuccess)
            .catch(onError);
        }
        onError();
      })
      .then(function () { setLoading(false); });
  });

  /* --- تسجيل شخص آخر --- */
  var again = $('[data-new-registration]');
  if (again) {
    again.addEventListener('click', function () {
      form.reset();
      syncCourses();
      $$('.is-invalid', form).forEach(function (el) { el.classList.remove('is-invalid'); });
      $$('.field-error', form).forEach(function (el) { el.textContent = ''; });
      statusEl.textContent = '';
      successBox.hidden = true;
      $('[data-success-wa]', successBox).hidden = true;
      form.hidden = false;
      fields.name.focus();
    });
  }
})();
