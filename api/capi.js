/* =====================================================================
   Meta Conversions API — Vercel Serverless Function  (POST /api/capi)

   يستقبل الأحداث من الصفحة ويرسلها إلى ميتا من الخادم، بنفس event_id
   الذي يستعمله البيكسل في المتصفح، فتحذف ميتا التكرار تلقائيًا.

   متغيّرات البيئة (Vercel ← Settings ← Environment Variables):
     META_ACCESS_TOKEN     إجباري — رمز الوصول من Events Manager (لا يُكتب في الشيفرة أبدًا)
     META_PIXEL_ID         اختياري — افتراضيًا 1084066284668146
     META_TEST_EVENT_CODE  اختياري — رمز «Test events» للتجربة، احذفه بعد التأكد
     META_API_VERSION      اختياري — افتراضيًا v24.0
     ALLOWED_HOSTS         اختياري — النطاقات المسموح لها، مفصولة بفواصل (مثال: example.com,www.example.com)
   ===================================================================== */
'use strict';

const crypto = require('crypto');

const PIXEL_ID = (process.env.META_PIXEL_ID || '1084066284668146').trim();
const API_VERSION = (process.env.META_API_VERSION || 'v24.0').trim();
const ALLOWED_EVENTS = new Set(['PageView', 'ViewContent', 'FormStart', 'Purchase', 'Contact']);
const ALLOWED_CONTENT_IDS = new Set(['writing', 'datascience', 'digital', 'all']);

const sha256 = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
const text = (value, max = 300) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/* ---------- توحيد البيانات قبل التشفير (حسب توصيات ميتا) ---------- */
function normalizePhone(value) {
  let digits = text(value, 40).replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (/^0\d{8,9}$/.test(digits)) digits = '213' + digits.slice(1); // 0555… → 213555…
  return digits.length >= 8 && digits.length <= 15 ? digits : '';
}

function normalizeEmail(value) {
  const email = text(value, 200).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function normalizeName(value) {
  return text(value, 80).toLowerCase().replace(/[^\p{L}\p{M}\s]/gu, '').replace(/\s+/g, ' ').trim();
}

function splitFullName(fullName) {
  const parts = normalizeName(fullName).split(' ').filter(Boolean);
  return { fn: parts[0] || '', ln: parts.slice(1).join(' ') };
}

/* ---------- حماية بسيطة: قبول الطلبات من نطاق الموقع فقط ---------- */
function isAllowedOrigin(req) {
  const origin = req.headers.origin || '';
  if (!origin) return false;
  let host;
  try { host = new URL(origin).host; } catch (e) { return false; }
  const allowed = (process.env.ALLOWED_HOSTS || '').split(',').map((h) => h.trim()).filter(Boolean);
  if (allowed.length) return allowed.includes(host);
  return host === req.headers['x-forwarded-host'] || host === req.headers.host;
}

function readBody(req) {
  const body = req.body;
  if (!body) return {};
  if (typeof body === 'object' && !Buffer.isBuffer(body)) return body;
  try { return JSON.parse(String(body)); } catch (e) { return {}; }
}

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers['x-real-ip'] || '') || (req.socket && req.socket.remoteAddress) || '';
}

/* ---------- بناء الحدث ---------- */
function buildEvent(req, input) {
  const eventName = text(input.event_name, 40);
  const eventId = text(input.event_id, 100);
  const sourceUrl = text(input.event_source_url, 1000);
  if (!ALLOWED_EVENTS.has(eventName) || !eventId || !/^https?:\/\//.test(sourceUrl)) return null;

  const raw = input.user_data && typeof input.user_data === 'object' ? input.user_data : {};
  const userData = {
    client_ip_address: clientIp(req) || undefined,
    client_user_agent: text(req.headers['user-agent'], 500) || undefined,
    fbp: /^fb\.\d\.\d+\.\d+$/.test(text(raw.fbp, 100)) ? text(raw.fbp, 100) : undefined,
    fbc: /^fb\.\d\.\d+\..+$/.test(text(raw.fbc, 500)) ? text(raw.fbc, 500) : undefined,
    country: [sha256('dz')]
  };

  const externalId = text(raw.external_id, 100);
  if (externalId) userData.external_id = [sha256(externalId)];

  const email = normalizeEmail(raw.em);
  if (email) userData.em = [sha256(email)];

  const phone = normalizePhone(raw.ph);
  if (phone) userData.ph = [sha256(phone)];

  if (raw.full_name) {
    const { fn, ln } = splitFullName(raw.full_name);
    if (fn) userData.fn = [sha256(fn)];
    if (ln) userData.ln = [sha256(ln)];
  }

  const rawCustom = input.custom_data && typeof input.custom_data === 'object' ? input.custom_data : {};
  const customData = {};
  if (text(rawCustom.content_name)) customData.content_name = text(rawCustom.content_name);
  if (text(rawCustom.content_category)) customData.content_category = text(rawCustom.content_category);
  if (Array.isArray(rawCustom.content_ids)) {
    const ids = rawCustom.content_ids.map((id) => text(id, 20)).filter((id) => ALLOWED_CONTENT_IDS.has(id));
    if (ids.length) {
      customData.content_ids = ids;
      customData.content_type = 'product';
      customData.num_items = ids.length;
    }
  }
  const value = Number(rawCustom.value);
  if (isFinite(value) && value > 0 && value < 10000000) {
    customData.value = value;
    customData.currency = /^[A-Z]{3}$/.test(text(rawCustom.currency, 3)) ? text(rawCustom.currency, 3) : 'DZD';
  }

  const event = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    event_source_url: sourceUrl,
    action_source: 'website',
    user_data: JSON.parse(JSON.stringify(userData)) // يحذف الحقول الفارغة
  };
  if (Object.keys(customData).length) event.custom_data = customData;
  return event;
}

/* ---------- المعالج ---------- */
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const token = (process.env.META_ACCESS_TOKEN || '').trim();
  if (!token) {
    console.error('[capi] META_ACCESS_TOKEN is not set');
    return res.status(500).json({ ok: false, error: 'not_configured' });
  }

  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ ok: false, error: 'forbidden_origin' });
  }

  const event = buildEvent(req, readBody(req));
  if (!event) {
    return res.status(400).json({ ok: false, error: 'invalid_event' });
  }

  const payload = { data: [event] };
  const testCode = (process.env.META_TEST_EVENT_CODE || '').trim();
  if (testCode) payload.test_event_code = testCode;

  const url = 'https://graph.facebook.com/' + API_VERSION + '/' + encodeURIComponent(PIXEL_ID) +
              '/events?access_token=' + encodeURIComponent(token);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = result && result.error ? result.error.message : 'HTTP ' + response.status;
      console.error('[capi] Meta rejected', event.event_name, '-', message);
      return res.status(502).json({ ok: false, error: 'meta_error' });
    }
    return res.status(200).json({ ok: true, events_received: result.events_received || 0 });
  } catch (err) {
    console.error('[capi] request failed', event.event_name, '-', err && err.name);
    return res.status(502).json({ ok: false, error: 'network_error' });
  } finally {
    clearTimeout(timer);
  }
};
