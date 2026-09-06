// Planroom API — runs as a Netlify Function.
// Handles: POST /api/login, POST /api/logout, GET /api/data, PUT /api/data
// Data is stored in Netlify Blobs so it persists across deploys and devices
// (a plain file on the function's filesystem would NOT persist — that's why
// the earlier attempt to just "put it on Netlify" needed this change).

import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

const COOKIE_NAME = 'planroom_session';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function makeSessionCookie(secret) {
  const exp = Date.now() + SESSION_MAX_AGE_MS;
  const payload = String(exp);
  const token = `${payload}.${sign(payload, secret)}`;
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${Math.floor(SESSION_MAX_AGE_MS / 1000)}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

function getCookie(req, name) {
  const header = req.headers.get('cookie') || '';
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function isValidSession(req, secret) {
  const token = getCookie(req, COOKIE_NAME);
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload, secret);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  return Number(payload) > Date.now();
}

// password comparison uses a timing-safe check against the APP_PASSWORD
// environment variable (set directly in the Netlify dashboard — no terminal
// command needed). It is never exposed to the browser; only people with
// access to your Netlify site's environment variables can see it.
function verifyPassword(password, expected) {
  const a = Buffer.from(String(password));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) {
    // still run a comparison of equal length to avoid leaking length via timing
    crypto.timingSafeEqual(Buffer.alloc(b.length), Buffer.alloc(b.length));
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  });
}

export default async (req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/?/, '');
  const secret = process.env.SESSION_SECRET;
  const password = process.env.APP_PASSWORD;

  if (!secret || !password) {
    return json({ error: 'server not configured: set SESSION_SECRET and APP_PASSWORD in Netlify environment variables' }, { status: 500 });
  }

  if (path === 'login' && req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    if (!verifyPassword(String(body.password || ''), password)) {
      return json({ error: 'invalid password' }, { status: 401 });
    }
    return json({ ok: true }, { headers: { 'set-cookie': makeSessionCookie(secret) } });
  }

  if (path === 'logout' && req.method === 'POST') {
    return json({ ok: true }, { headers: { 'set-cookie': clearSessionCookie() } });
  }

  if (!isValidSession(req, secret)) {
    return json({ error: 'unauthorized' }, { status: 401 });
  }

  const store = getStore('planroom');

  if (path === 'data' && req.method === 'GET') {
    const raw = await store.get('data');
    return new Response(raw ?? 'null', { status: 200, headers: { 'content-type': 'application/json' } });
  }

  if (path === 'data' && req.method === 'PUT') {
    const text = await req.text();
    try {
      JSON.parse(text);
    } catch {
      return json({ error: 'invalid json body' }, { status: 400 });
    }
    await store.set('data', text);
    return json({ ok: true });
  }

  return json({ error: 'not found' }, { status: 404 });
};

// This makes Netlify route /api/* straight to this function — no separate
// redirect rule needed.
export const config = { path: '/api/*' };
