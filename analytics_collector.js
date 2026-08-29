const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3001;

try {
  const fs = require('fs');
  const envPath = require('path').join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(function(line) {
      var m = line.match(/^([^=]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    });
  }
} catch(e) {}

const ANALYTICS_KEY = process.env.ANALYTICS_KEY || '';

app.use(cors({
  origin: ['https://bitmapcore.net', 'https://www.bitmapcore.net', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '50kb' }));

const dbPath = path.join(__dirname, 'data', 'analytics.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    user_id TEXT,
    event_type TEXT NOT NULL,
    event_data TEXT,
    page_url TEXT,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    user_agent TEXT,
    ip_hash TEXT,
    device_type TEXT,
    browser TEXT,
    viewport_w INTEGER,
    viewport_h INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT,
    first_page TEXT,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    user_agent TEXT,
    ip_hash TEXT,
    device_type TEXT,
    browser TEXT,
    country TEXT,
    started_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    page_count INTEGER DEFAULT 1,
    event_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    user_id TEXT,
    page_url TEXT,
    page_title TEXT,
    referrer TEXT,
    load_time_ms INTEGER,
    scroll_depth INTEGER DEFAULT 0,
    time_on_page_ms INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS daily_aggregates (
    date TEXT NOT NULL,
    metric TEXT NOT NULL,
    value REAL NOT NULL,
    dimension TEXT,
    PRIMARY KEY (date, metric, dimension)
  );

  CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
  CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
  CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
  CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at);
  CREATE INDEX IF NOT EXISTS idx_page_views_page ON page_views(page_url);
  CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
`);

// Migracion: agregar columna visit_id a events si no existe
const eventCols = db.prepare(`PRAGMA table_info(events)`).all().map(c => c.name);
if (!eventCols.includes('visit_id')) {
  db.exec(`ALTER TABLE events ADD COLUMN visit_id TEXT`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_events_visit ON events(visit_id)`);
}

// Migracion: agregar columna country a events si no existe (header CF-IPCountry de Cloudflare)
if (!eventCols.includes('country')) {
  db.exec(`ALTER TABLE events ADD COLUMN country TEXT`);
}

const RATE_LIMIT = new Map();
const RATE_WINDOW = 60000;
const RATE_MAX = 100;

function rateLimit(ip) {
  const now = Date.now();
  const entry = RATE_LIMIT.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW) {
    RATE_LIMIT.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count++;
  return entry.count > RATE_MAX;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of RATE_LIMIT) {
    if (now - entry.start > RATE_WINDOW * 2) RATE_LIMIT.delete(ip);
  }
}, 60000);

function hashIp(ip) {
  return crypto.createHash('sha256').update(ip + 'bitmapcore-salt-2024').digest('hex').slice(0, 16);
}

function parseUserAgent(ua) {
  if (!ua) return { device: 'unknown', browser: 'unknown' };
  let device = 'desktop';
  if (/mobile|android|iphone|ipad/i.test(ua)) device = /ipad|tablet/i.test(ua) ? 'tablet' : 'mobile';
  let browser = 'other';
  if (/chrome/i.test(ua) && !/edge|opr/i.test(ua)) browser = 'chrome';
  else if (/firefox/i.test(ua)) browser = 'firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'safari';
  else if (/edge/i.test(ua)) browser = 'edge';
  else if (/opr|opera/i.test(ua)) browser = 'opera';
  return { device, browser };
}

const stmts = {
  insertEvent: db.prepare(`INSERT INTO events (session_id, user_id, event_type, event_data, page_url, referrer, utm_source, utm_medium, utm_campaign, user_agent, ip_hash, device_type, browser, viewport_w, viewport_h, created_at, visit_id, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  insertPageView: db.prepare(`INSERT INTO page_views (session_id, user_id, page_url, page_title, referrer, load_time_ms, scroll_depth, time_on_page_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  upsertSession: db.prepare(`INSERT INTO sessions (session_id, user_id, first_page, referrer, utm_source, utm_medium, utm_campaign, user_agent, ip_hash, device_type, browser, country, started_at, last_seen_at, page_count, event_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0) ON CONFLICT(session_id) DO UPDATE SET last_seen_at = excluded.last_seen_at, page_count = page_count + 1, event_count = event_count + 1, country = COALESCE(excluded.country, sessions.country)`),
  updateSessionLastSeen: db.prepare(`UPDATE sessions SET last_seen_at = ? WHERE session_id = ?`),
  updateSessionCountry: db.prepare(`UPDATE sessions SET country = COALESCE(?, country) WHERE session_id = ?`),
};

function parseUrl(url) {
  try {
    const u = new URL(url, 'https://bitmapcore.net');
    return {
      utm_source: u.searchParams.get('utm_source'),
      utm_medium: u.searchParams.get('utm_medium'),
      utm_campaign: u.searchParams.get('utm_campaign'),
    };
  } catch { return {}; }
}

app.post('/event', (req, res) => {
  const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (rateLimit(ip)) return res.status(429).json({ error: 'rate limited' });

  const { session_id, user_id, event_type, event_data, page_url, referrer, user_agent, viewport_w, viewport_h, load_time_ms, scroll_depth, time_on_page_ms, visit_id } = req.body;
  if (!session_id || !event_type) return res.status(400).json({ error: 'session_id and event_type required' });

  const now = Date.now();
  const ipHash = hashIp(ip);
  const country = req.headers['cf-ipcountry'] || null;
  const { device, browser } = parseUserAgent(user_agent || req.headers['user-agent']);
  const utms = parseUrl(page_url || '');

  const transaction = db.transaction(() => {
    stmts.insertEvent.run(session_id, user_id || null, event_type, event_data ? JSON.stringify(event_data) : null, page_url || null, referrer || null, utms.utm_source || null, utms.utm_medium || null, utms.utm_campaign || null, user_agent || null, ipHash, device, browser, viewport_w || null, viewport_h || null, now, visit_id || null, country);

    if (event_type === 'page_view' && page_url) {
      stmts.insertPageView.run(session_id, user_id || null, page_url || null, event_data?.title || null, referrer || null, load_time_ms || null, scroll_depth || 0, time_on_page_ms || 0, now);
    }

    stmts.upsertSession.run(session_id, user_id || null, page_url || null, referrer || null, utms.utm_source || null, utms.utm_medium || null, utms.utm_campaign || null, user_agent || null, ipHash, device, browser, country, now, now);
  });

  try {
    transaction();
    res.json({ ok: true });
  } catch (err) {
    console.error('Event insert error:', err.message);
    res.status(500).json({ error: 'db error' });
  }
});

app.post('/events', (req, res) => {
  const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (rateLimit(ip)) return res.status(429).json({ error: 'rate limited' });

  const { events } = req.body;
  if (!Array.isArray(events) || events.length === 0) return res.status(400).json({ error: 'events array required' });

  const now = Date.now();
  const ipHash = hashIp(ip);
  const country = req.headers['cf-ipcountry'] || null;
  const { device, browser } = parseUserAgent(req.headers['user-agent']);

  const transaction = db.transaction(() => {
    for (const ev of events.slice(0, 20)) {
      const { session_id, user_id, event_type, event_data, page_url, referrer, viewport_w, viewport_h, visit_id } = ev;
      if (!session_id || !event_type) continue;
      const utms = parseUrl(page_url || '');
      stmts.insertEvent.run(session_id, user_id || null, event_type, event_data ? JSON.stringify(event_data) : null, page_url || null, referrer || null, utms.utm_source || null, utms.utm_medium || null, utms.utm_campaign || null, req.headers['user-agent'] || null, ipHash, device, browser, viewport_w || null, viewport_h || null, ev.timestamp || now, visit_id || null, country);
    if (event_type === 'page_view' && page_url) {
        stmts.insertPageView.run(session_id, user_id || null, page_url || null, event_data?.title || null, referrer || null, ev.load_time_ms || null, ev.scroll_depth || 0, ev.time_on_page_ms || 0, ev.timestamp || now);
      }
      stmts.upsertSession.run(session_id, user_id || null, page_url || null, referrer || null, utms.utm_source || null, utms.utm_medium || null, utms.utm_campaign || null, req.headers['user-agent'] || null, ipHash, device, browser, country, ev.timestamp || now, ev.timestamp || now);
    }
  });

  try {
    transaction();
    res.json({ ok: true, count: Math.min(events.length, 20) });
  } catch (err) {
    console.error('Batch insert error:', err.message);
    res.status(500).json({ error: 'db error' });
  }
});

app.post('/heartbeat', (req, res) => {
  const { session_id, page_url, scroll_depth, time_on_page_ms } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id required' });
  const now = Date.now();
  const country = req.headers['cf-ipcountry'] || null;
  try {
    stmts.updateSessionLastSeen.run(now, session_id);
    if (country) {
      stmts.updateSessionCountry.run(country, session_id);
    }
    if (page_url) {
      db.prepare(`UPDATE page_views SET scroll_depth = MAX(scroll_depth, ?), time_on_page_ms = ? WHERE session_id = ? AND page_url = ? AND id = (SELECT MAX(id) FROM page_views WHERE session_id = ? AND page_url = ?)`).run(scroll_depth || 0, time_on_page_ms || 0, session_id, page_url, session_id, page_url);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'db error' });
  }
});

app.get('/health', (req, res) => {
  try {
    const eventCount = db.prepare('SELECT COUNT(*) as c FROM events').get().c;
    const sessionCount = db.prepare('SELECT COUNT(*) as c FROM sessions').get().c;
    const pageCount = db.prepare('SELECT COUNT(*) as c FROM page_views').get().c;
    const todayCount = db.prepare('SELECT COUNT(*) as c FROM events WHERE created_at > ?').get(Date.now() - 86400000).c;
    res.json({ ok: true, events: eventCount, sessions: sessionCount, pageViews: pageCount, todayEvents: todayCount });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/stats/realtime', (req, res) => {
  try {
    const last5min = Date.now() - 300000;
    const activeSessions = db.prepare('SELECT COUNT(DISTINCT session_id) as c FROM events WHERE created_at > ?').get(last5min).c;
    const topPages = db.prepare('SELECT page_url, COUNT(*) as views FROM page_views WHERE created_at > ? GROUP BY page_url ORDER BY views DESC LIMIT 10').all(Date.now() - 86400000);
    const recentEvents = db.prepare('SELECT event_type, COUNT(*) as c FROM events WHERE created_at > ? GROUP BY event_type ORDER BY c DESC').all(Date.now() - 86400000);
    res.json({ activeSessions, topPages, recentEvents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function authMiddleware(req, res, next) {
  if (!ANALYTICS_KEY) return res.status(503).json({ error: 'Analytics not configured' });
  const key = req.query.key || req.headers['x-analytics-key'];
  if (key !== ANALYTICS_KEY) return res.status(403).json({ error: 'Acceso denegado' });
  next();
}

function parseRange(range) {
  const now = Date.now();
  const map = { '24h': 86400000, '7d': 604800000, '30d': 2592000000, '90d': 7776000000 };
  return { start: now - (map[range] || 604800000), end: now };
}

app.get('/dashboard', authMiddleware, (req, res) => {
  try {
    const { start, end } = parseRange(req.query.range);
    const prevStart = start - (end - start);
    const prevEnd = start;
    const countMode = req.query.count || 'all';
    const countExpr = countMode === 'unique' ? 'COUNT(DISTINCT session_id)' : 'COUNT(*)';

    const sessions = db.prepare('SELECT COUNT(DISTINCT session_id) as c FROM events WHERE created_at BETWEEN ? AND ?').get(start, end).c;
    const prevSessions = db.prepare('SELECT COUNT(DISTINCT session_id) as c FROM events WHERE created_at BETWEEN ? AND ?').get(prevStart, prevEnd).c;
    const users = db.prepare('SELECT COUNT(DISTINCT user_id) as c FROM events WHERE created_at BETWEEN ? AND ?').get(start, end).c;
    const prevUsers = db.prepare('SELECT COUNT(DISTINCT user_id) as c FROM events WHERE created_at BETWEEN ? AND ?').get(prevStart, prevEnd).c;
    const pageViews = db.prepare('SELECT COUNT(*) as c FROM page_views WHERE created_at BETWEEN ? AND ?').get(start, end).c;
    const prevPageViews = db.prepare('SELECT COUNT(*) as c FROM page_views WHERE created_at BETWEEN ? AND ?').get(prevStart, prevEnd).c;

    const avgDuration = db.prepare('SELECT AVG(last_seen_at - started_at) as avg FROM sessions WHERE last_seen_at > started_at AND started_at BETWEEN ? AND ?').get(start, end).avg || 0;
    const prevAvgDuration = db.prepare('SELECT AVG(last_seen_at - started_at) as avg FROM sessions WHERE last_seen_at > started_at AND started_at BETWEEN ? AND ?').get(prevStart, prevEnd).avg || 0;

    const bounces = db.prepare('SELECT COUNT(*) as c FROM sessions WHERE page_count <= 1 AND started_at BETWEEN ? AND ?').get(start, end).c;
    const bounceRate = sessions > 0 ? bounces / sessions : 0;
    const prevBounces = db.prepare('SELECT COUNT(*) as c FROM sessions WHERE page_count <= 1 AND started_at BETWEEN ? AND ?').get(prevStart, prevEnd).c;
    const prevBounceRate = prevSessions > 0 ? prevBounces / prevSessions : 0;

    // Rebotes por VISITA: visitas (visit_id) con una sola pagina distinta / total visitas
    const visitBounces = db.prepare(`SELECT COUNT(*) as c FROM (
      SELECT visit_id FROM events
      WHERE event_type = 'page_view' AND visit_id IS NOT NULL AND visit_id != '' AND created_at BETWEEN ? AND ?
      GROUP BY visit_id HAVING COUNT(DISTINCT page_url) = 1
    )`).get(start, end).c;
    const totalVisits = db.prepare(`SELECT COUNT(DISTINCT visit_id) as c FROM events WHERE event_type = 'page_view' AND visit_id IS NOT NULL AND visit_id != '' AND created_at BETWEEN ? AND ?`).get(start, end).c;
    const prevVisitBounces = db.prepare(`SELECT COUNT(*) as c FROM (
      SELECT visit_id FROM events
      WHERE event_type = 'page_view' AND visit_id IS NOT NULL AND visit_id != '' AND created_at BETWEEN ? AND ?
      GROUP BY visit_id HAVING COUNT(DISTINCT page_url) = 1
    )`).get(prevStart, prevEnd).c;
    const prevTotalVisits = db.prepare(`SELECT COUNT(DISTINCT visit_id) as c FROM events WHERE event_type = 'page_view' AND visit_id IS NOT NULL AND visit_id != '' AND created_at BETWEEN ? AND ?`).get(prevStart, prevEnd).c;
    const visitBounceRate = totalVisits > 0 ? visitBounces / totalVisits : 0;
    const prevVisitBounceRate = prevTotalVisits > 0 ? prevVisitBounces / prevTotalVisits : 0;

    const buyActions = db.prepare(`SELECT COUNT(*) as c FROM events WHERE event_type IN ('buy_initiated','buy_confirmed','buy_completed') AND created_at BETWEEN ? AND ?`).get(start, end).c;
    const listActions = db.prepare(`SELECT COUNT(*) as c FROM events WHERE event_type IN ('list_initiated','list_confirmed','list_submitted') AND created_at BETWEEN ? AND ?`).get(start, end).c;
    const walletConns = db.prepare(`SELECT COUNT(*) as c FROM events WHERE event_type = 'wallet_connected' AND created_at BETWEEN ? AND ?`).get(start, end).c;
    const conversionRate = sessions > 0 ? buyActions / sessions : 0;
    const prevBuyActions = db.prepare(`SELECT COUNT(*) as c FROM events WHERE event_type IN ('buy_initiated','buy_confirmed','buy_completed') AND created_at BETWEEN ? AND ?`).get(prevStart, prevEnd).c;
    const prevConversionRate = prevSessions > 0 ? prevBuyActions / prevSessions : 0;

    const topPages = db.prepare('SELECT page_url, COUNT(*) as views, AVG(time_on_page_ms) as avgTime, AVG(scroll_depth) as avgScroll FROM page_views WHERE created_at BETWEEN ? AND ? AND page_url IS NOT NULL GROUP BY page_url ORDER BY views DESC LIMIT 15').all(start, end);

    const eventTypes = db.prepare('SELECT event_type, COUNT(*) as c FROM events WHERE created_at BETWEEN ? AND ? GROUP BY event_type ORDER BY c DESC').all(start, end);

    const devices = db.prepare(`SELECT device_type, ${countExpr} as c FROM events WHERE created_at BETWEEN ? AND ? GROUP BY device_type ORDER BY c DESC`).all(start, end);

    const browsers = db.prepare(`SELECT browser, ${countExpr} as c FROM events WHERE created_at BETWEEN ? AND ? GROUP BY browser ORDER BY c DESC`).all(start, end);

    const utmSources = db.prepare(`SELECT utm_source, COUNT(*) as c FROM events WHERE utm_source IS NOT NULL AND utm_source != '' AND created_at BETWEEN ? AND ? GROUP BY utm_source ORDER BY c DESC LIMIT 10`).all(start, end);

    const jsErrors = db.prepare(`SELECT COUNT(*) as c FROM events WHERE event_type = 'error' AND created_at BETWEEN ? AND ?`).get(start, end).c;

    const walletTypes = db.prepare(`SELECT event_data, COUNT(*) as c FROM events WHERE event_type = 'wallet_connected' AND created_at BETWEEN ? AND ? GROUP BY event_data ORDER BY c DESC`).all(start, end);

    const countries = db.prepare(`SELECT country, COUNT(*) as c FROM sessions WHERE country IS NOT NULL AND country != '' AND started_at BETWEEN ? AND ? GROUP BY country ORDER BY c DESC LIMIT 15`).all(start, end);

    // Countries series: top 5 countries over time (for evolution chart)
    const top5Countries = countries.slice(0, 5).map(c => c.country);
    const countriesSeries = [];
    if (top5Countries.length > 0) {
      const range = end - start;
      const intervalMs = range <= 86400000 ? 3600000 : 86400000; // hour for 24h, day otherwise
      const timeFmt = range <= 86400000 ? '%Y-%m-%dT%H:00' : '%Y-%m-%d';
      const buckets = [];
      for (let t = start; t < end; t += intervalMs) {
        buckets.push({ ts: t, tsEnd: Math.min(t + intervalMs, end) });
      }
      const placeholders = top5Countries.map(() => '?').join(',');
      const stmtCountry = db.prepare(`SELECT country, COUNT(*) as c FROM sessions WHERE country IN (${placeholders}) AND started_at >= ? AND started_at < ? GROUP BY country`);
      for (const b of buckets) {
        const rows = stmtCountry.all(...top5Countries, b.ts, b.tsEnd);
        for (const r of rows) {
          countriesSeries.push({ ts: b.ts, country: r.country, count: r.c });
        }
      }
    }

    res.json({
      summary: {
        sessions, prevSessions, users, prevUsers, pageViews, prevPageViews,
        avgSessionDuration: Math.round(avgDuration), prevAvgSessionDuration: Math.round(prevAvgDuration),
        bounceRate, prevBounceRate, buyActions, listActions, walletConns, jsErrors,
        conversionRate, prevConversionRate,
        visitBounceRate, prevVisitBounceRate, totalVisits, prevTotalVisits
      },
      topPages, eventTypes, devices, browsers, utmSources, walletTypes, countries, countriesSeries
    });
  } catch (err) {
    console.error('Dashboard error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/timeseries', authMiddleware, (req, res) => {
  try {
    const { start, end } = parseRange(req.query.range);
    const metric = req.query.metric || 'sessions';
    const interval = req.query.interval || '1h';

    const intervalMs = { '15m': 900000, '1h': 3600000, '1d': 86400000 }[interval] || 3600000;

    const buckets = [];
    for (let t = start; t < end; t += intervalMs) {
      buckets.push({ ts: t, tsEnd: Math.min(t + intervalMs, end) });
    }

    let query;
    if (metric === 'sessions') {
      query = 'SELECT COUNT(DISTINCT session_id) as c FROM events WHERE created_at >= ? AND created_at < ?';
    } else if (metric === 'pageViews') {
      query = 'SELECT COUNT(*) as c FROM page_views WHERE created_at >= ? AND created_at < ?';
    } else if (metric === 'buyActions') {
      query = `SELECT COUNT(*) as c FROM events WHERE event_type IN ('buy_initiated','buy_confirmed','buy_completed') AND created_at >= ? AND created_at < ?`;
    } else if (metric === 'walletConns') {
      query = `SELECT COUNT(*) as c FROM events WHERE event_type = 'wallet_connected' AND created_at >= ? AND created_at < ?`;
    } else if (metric === 'users') {
      query = 'SELECT COUNT(DISTINCT user_id) as c FROM events WHERE created_at >= ? AND created_at < ?';
    } else {
      query = 'SELECT COUNT(*) as c FROM events WHERE created_at >= ? AND created_at < ?';
    }

    const stmt = db.prepare(query);
    const series = buckets.map(b => ({ ts: b.ts, value: stmt.get(b.ts, b.tsEnd).c }));

    res.json({ metric, interval, series });
  } catch (err) {
    console.error('Timeseries error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/heatmap', authMiddleware, (req, res) => {
  try {
    const { start, end } = parseRange(req.query.range);
    const rows = db.prepare(`
      SELECT
        CAST(strftime('%w', started_at/1000, 'unixepoch', 'localtime') AS INTEGER) as dow,
        CAST(strftime('%H', started_at/1000, 'unixepoch', 'localtime') AS INTEGER) as hour,
        COUNT(*) as sessions
      FROM sessions
      WHERE started_at BETWEEN ? AND ?
      GROUP BY dow, hour
    `).all(start, end);
    res.json({ heatmap: rows });
  } catch (err) {
    console.error('Heatmap error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/realtime', authMiddleware, (req, res) => {
  try {
    const last5min = Date.now() - 300000;
    const last1h = Date.now() - 3600000;
    const last24h = Date.now() - 86400000;

    const activeSessions = db.prepare('SELECT COUNT(DISTINCT session_id) as c FROM events WHERE created_at > ?').get(last5min).c;
    const sessionsLast1h = db.prepare('SELECT COUNT(DISTINCT session_id) as c FROM events WHERE created_at > ?').get(last1h).c;
    const sessionsLast24h = db.prepare('SELECT COUNT(DISTINCT session_id) as c FROM events WHERE created_at > ?').get(last24h).c;
    const eventsLast1h = db.prepare('SELECT COUNT(*) as c FROM events WHERE created_at > ?').get(last1h).c;

    const topPagesLive = db.prepare('SELECT page_url, COUNT(*) as views FROM page_views WHERE created_at > ? AND page_url IS NOT NULL GROUP BY page_url ORDER BY views DESC LIMIT 10').all(last24h);

    const recentEvents = db.prepare('SELECT event_type, COUNT(*) as c FROM events WHERE created_at > ? GROUP BY event_type ORDER BY c DESC').all(last1h);

    const liveActivity = db.prepare('SELECT event_type, page_url, created_at FROM events WHERE created_at > ? ORDER BY created_at DESC LIMIT 20').all(last1h);

    res.json({ activeSessions, sessionsLast1h, sessionsLast24h, eventsLast1h, topPagesLive, recentEvents, liveActivity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== WALLET STATS: 3 secciones independientes =====
// A) Conexiones de wallet (todas, incluye repeticiones del mismo usuario)
// B) Wallets unicas conectadas (historial, aunque ya no esten activas)
// C) Wallets activas AHORA (unicamente las conectadas en este momento)
app.get('/wallet-stats', authMiddleware, (req, res) => {
  try {
    const now = Date.now();
    const ranges = { '24h': 86400000, '7d': 604800000, '30d': 2592000000, '90d': 7776000000 };

    const connectionsStmt = db.prepare(`SELECT COUNT(*) as c FROM events WHERE event_type = 'wallet_connected' AND created_at BETWEEN ? AND ?`);
    const uniqueStmt = db.prepare(`SELECT COUNT(DISTINCT json_extract(event_data, '$.address')) as c FROM events WHERE event_type = 'wallet_connected' AND json_extract(event_data, '$.address') IS NOT NULL AND json_extract(event_data, '$.address') != '' AND created_at BETWEEN ? AND ?`);

    const byRange = {};
    for (const [range, ms] of Object.entries(ranges)) {
      const start = now - ms;
      byRange[range] = {
        connections: connectionsStmt.get(start, now).c,
        uniqueWallets: uniqueStmt.get(start, now).c
      };
    }

    // C) Activas ahora: wallets con conexion en los ultimos 5 minutos
    const activeNow = db.prepare(`
      SELECT json_extract(event_data, '$.address') as address, MAX(created_at) as lastConnected
      FROM events
      WHERE event_type = 'wallet_connected'
        AND json_extract(event_data, '$.address') IS NOT NULL
        AND json_extract(event_data, '$.address') != ''
        AND created_at > ?
      GROUP BY json_extract(event_data, '$.address')
      ORDER BY lastConnected DESC
    `).all(now - 300000);

    res.json({ byRange, activeNow: { count: activeNow.length, wallets: activeNow } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Analytics collector running on port ${PORT}`);
});
