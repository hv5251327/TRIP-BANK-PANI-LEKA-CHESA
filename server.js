const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'trip_data.json');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jbupkhdchvyyhwapsgln.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidXBraGRjaHZ5eWh3YXBzZ2xuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0Mjg0NTMsImV4cCI6MjEwNjAwNDQ1M30.K_E381uDZCOmNEnVVbQ1JbvBEHH9uP9FQ9WezEGSacA';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.sql':  'text/plain; charset=utf-8'
};

// ─── In-memory cache (backed by file fallback) ──────────────────────────────
let tripData = null;

function loadDataFile() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      tripData = JSON.parse(raw);
    }
  } catch {
    tripData = null;
  }
}

function saveDataFile(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data), 'utf-8');
  } catch {}
  tripData = data;
}

// Load once on startup
loadDataFile();

// ─── Supabase API Helpers ───────────────────────────────────────────────────
async function supabaseFetch(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers
  };
  return fetch(url, { ...options, headers });
}

async function loadFromSupabase() {
  try {
    const [pRes, eRes, bRes] = await Promise.all([
      supabaseFetch('people?select=name&order=id.asc'),
      supabaseFetch('expenses?select=*&order=created_at.asc'),
      supabaseFetch('default_all_spends?select=*&order=id.asc')
    ]);

    if (!pRes.ok || !eRes.ok) {
      return null;
    }

    const pData = await pRes.json();
    const eData = await eRes.json();
    const bData = bRes.ok ? await bRes.json() : [];

    const people = pData.map(r => r.name);
    const expenses = eData.map(r => ({
      id: r.id,
      spentBy: r.spent_by,
      amount: Number(r.amount) || 0,
      spentFor: Array.isArray(r.spent_for) ? r.spent_for : (typeof r.spent_for === 'string' ? JSON.parse(r.spent_for) : []),
      description: r.description || '',
      date: r.date || '',
      secretKey: r.secret_key || '',
      isBorrow: !!r.is_borrow,
      isSelfSpend: !!r.is_self_spend,
      createdAt: Number(r.created_at) || Date.now()
    }));
    const defaultAllSpends = bData.map(r => ({
      amount: Number(r.amount) || 0,
      description: r.description || '',
      date: r.date || ''
    }));

    return { people, expenses, defaultAllSpends };
  } catch (err) {
    console.error('Supabase load error:', err.message);
    return null;
  }
}

async function saveToSupabase(data) {
  try {
    const people = Array.isArray(data.people) ? data.people : [];
    const expenses = Array.isArray(data.expenses) ? data.expenses : [];
    const defaultAllSpends = Array.isArray(data.defaultAllSpends) ? data.defaultAllSpends : [];

    // 1. Sync people
    if (people.length > 0) {
      await supabaseFetch('people', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(people.map(name => ({ name })))
      });
      const pNames = people.map(p => `"${encodeURIComponent(p)}"`).join(',');
      await supabaseFetch(`people?name=not.in.(${pNames})`, { method: 'DELETE' });
    } else {
      await supabaseFetch('people?id=gt.0', { method: 'DELETE' });
    }

    // 2. Sync expenses
    if (expenses.length > 0) {
      const expRows = expenses.map(e => ({
        id: e.id,
        spent_by: e.spentBy,
        amount: Number(e.amount) || 0,
        spent_for: e.spentFor || [],
        description: e.description || '',
        date: e.date || '',
        secret_key: e.secretKey || '',
        is_borrow: !!e.isBorrow,
        is_self_spend: !!e.isSelfSpend,
        created_at: Number(e.createdAt) || Date.now()
      }));
      await supabaseFetch('expenses', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(expRows)
      });
      const expIds = expenses.map(e => `"${e.id}"`).join(',');
      await supabaseFetch(`expenses?id=not.in.(${expIds})`, { method: 'DELETE' });
    } else {
      await supabaseFetch('expenses?id=neq.', { method: 'DELETE' });
    }

    // 3. Sync default_all_spends
    await supabaseFetch('default_all_spends?id=gt.0', { method: 'DELETE' });
    if (defaultAllSpends.length > 0) {
      const bulkRows = defaultAllSpends.map(b => ({
        amount: Number(b.amount) || 0,
        description: b.description || '',
        date: b.date || ''
      }));
      await supabaseFetch('default_all_spends', {
        method: 'POST',
        body: JSON.stringify(bulkRows)
      });
    }

    return true;
  } catch (err) {
    console.error('Supabase save error:', err.message);
    return false;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function sendJson(res, statusCode, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const pathname = (req.url || '/').split('?')[0];
  const method   = req.method.toUpperCase();

  // ── CORS preflight ──────────────────────────────────────────────────────────
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // ── GET /api/data – return shared trip data ──────────────────────────────────
  if (pathname === '/api/data' && method === 'GET') {
    // Try Supabase first
    const sbData = await loadFromSupabase();
    if (sbData) {
      saveDataFile(sbData); // keep local file backup updated
      sendJson(res, 200, sbData);
      return;
    }
    // Fallback to local cache if Supabase tables not yet created
    sendJson(res, 200, tripData || {});
    return;
  }

  // ── POST /api/data – save shared trip data ───────────────────────────────────
  if (pathname === '/api/data' && method === 'POST') {
    try {
      const body = await readBody(req);
      const incoming = JSON.parse(body);
      saveDataFile(incoming); // always persist locally as instant backup
      saveToSupabase(incoming); // sync to Supabase tables
      sendJson(res, 200, { ok: true });
    } catch {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    }
    return;
  }

  // ── Static file serving ──────────────────────────────────────────────────────
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  // Prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback to index.html for SPA routes
        fs.readFile(path.join(__dirname, 'index.html'), (err2, indexContent) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(indexContent, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`TripSplit server is running at http://localhost:${PORT}`);
});
