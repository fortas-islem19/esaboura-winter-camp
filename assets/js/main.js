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

  /* ---------- Meta Pixel ---------- */
  function track(event, params, custom) {
    try {
      if (typeof window.fbq === 'function') {
        window.fbq(custom ? 'trackCustom' : 'track', event, params || {});
      }
    } catch (e) { /* لا شيء */ }
  }

  /* ---------- الإعدادات: موعد SPSS ---------- */
  if (hasValue(CFG.spssDate)) {
    $$('[data-spss-date]').forEach(function (el) { el.textContent = String(CFG.spssDate).trim(); });
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
    return n.toLocaleString('en-US').replace(/,/g, ' ') + ' دج';
  }
  $$('[data-price]').forEach(function (el) {
    var v = PRICES[el.getAttribute('data-price')];
    if (hasValue(v)) {
      var out = $('[data-price-value]', el);
      if (out) { out.textContent = formatPrice(v); }
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
    var timer;
    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) {
        box.hidden = true;
        if (timer) { clearInterval(timer); }
        return;
      }
      var s = Math.floor(diff / 1000);
      parts.days.textContent = String(Math.floor(s / 86400));
      parts.hours.textContent = pad(Math.floor((s % 86400) / 3600));
      parts.minutes.textContent = pad(Math.floor((s % 3600) / 60));
      parts.seconds.textContent = pad(s % 60);
    }
    tick();
    timer = setInterval(tick, 1000);
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
    var hidden = { hero: true, register: false, footer: false };
    var targets = { hero: $('.hero'), register: $('#register'), footer: $('.site-footer') };
    function update() {
      var show = !hidden.hero && !hidden.register && !hidden.footer;
      bar.classList.toggle('is-visible', show);
      bar.setAttribute('aria-hidden', show ? 'false' : 'true');
      if (link) { link.tabIndex = show ? 0 : -1; }
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
    track('FormStart', { content_name: FORM_LABEL }, true);
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

    var params = { content_name: courses, content_category: FORM_LABEL };
    var value = leadValue();
    if (value > 0) { params.value = value; params.currency = 'DZD'; }
    track('Lead', params);

    $('[data-success-name]', successBox).textContent = name.split(/\s+/)[0] || name;
    $('[data-success-phone]', successBox).textContent = phoneVal;
    $('[data-success-courses]', successBox).textContent = courses ? 'الدورات المختارة: ' + courses.split(' + ').join('، ') : '';

    var waBtn = $('[data-success-wa]', successBox);
    if (wa && waBtn) {
      waBtn.href = waLink(
        'السلام عليكم، سجّلت للتوّ في ' + FORM_LABEL + ' بمدرسة السبورة سطيف.\n' +
        'الاسم: ' + name + '\n' +
        'الهاتف: ' + phoneVal + '\n' +
        'الدورات: ' + courses.split(' + ').join('، ')
      );
      waBtn.hidden = false;
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
