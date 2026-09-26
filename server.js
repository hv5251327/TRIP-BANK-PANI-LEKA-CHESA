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
      // on_conflict=name is required for upsert on a non-PK unique column
      const upsertRes = await supabaseFetch('people?on_conflict=name', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify(people.map(name => ({ name })))
      });
      if (!upsertRes.ok) {
        const errText = await upsertRes.text();
        console.error('people upsert error:', errText);
      }
      // Delete members who have been removed — PostgREST not.in.() uses plain comma-separated values, no quotes/encoding
      const namesCsv = people.map(p => p.replace(/,/g, ' ')).join(',');
      await supabaseFetch(`people?name=not.in.(${namesCsv})`, { method: 'DELETE' });
    } else {
      // Delete all people
      await supabaseFetch('people?id=gte.0', { method: 'DELETE' });
    }

    // 2. Sync expenses — upsert by primary key id
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
      // on_conflict=id is required for upsert on the primary key via PostgREST
      const expUpsertRes = await supabaseFetch('expenses?on_conflict=id', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(expRows)
      });
      if (!expUpsertRes.ok) {
        const errText = await expUpsertRes.text();
        console.error('expenses upsert error:', errText);
      }
      // Delete removed expenses — IDs are plain strings (no quotes in PostgREST filter)
      const idsCsv = expenses.map(e => e.id).join(',');
      await supabaseFetch(`expenses?id=not.in.(${idsCsv})`, { method: 'DELETE' });
    } else {
      // Delete all expenses — use a filter that always matches
      await supabaseFetch('expenses?created_at=gte.0', { method: 'DELETE' });
    }

    // 3. Sync default_all_spends — simpler: delete all then re-insert
    await supabaseFetch('default_all_spends?id=gte.0', { method: 'DELETE' });
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

// ─── Recycle Bin (shared, server-side Undo/Redo history) ────────────────────
// Every save() from any client goes through POST /api/data. Before that new
// state overwrites the old one, we snapshot the *previous* state into the
// `recycle_bin` table as an 'undo' entry (and clear any 'redo' entries, since
// a fresh action invalidates the redo trail). /api/undo and /api/redo pop the
// most recent entry off the relevant stack and restore it — this way ANY
// person, on ANY device, can undo or redo the most recent change made by
// anyone on the trip, not just their own local edits.
const RECYCLE_LIMIT = 50; // keep at most this many entries per stack

async function pushRecycleBin(stackType, snapshot) {
  try {
    const insertRes = await supabaseFetch('recycle_bin', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify([{ stack_type: stackType, snapshot }])
    });
    if (!insertRes.ok) {
      console.error('recycle_bin insert error:', await insertRes.text());
      return;
    }
    // Trim old entries beyond the limit so the table doesn't grow unbounded
    const overflowRes = await supabaseFetch(
      `recycle_bin?stack_type=eq.${stackType}&select=id&order=id.desc&offset=${RECYCLE_LIMIT}`
    );
    if (overflowRes.ok) {
      const rows = await overflowRes.json();
      if (rows.length) {
        const ids = rows.map(r => r.id).join(',');
        await supabaseFetch(`recycle_bin?id=in.(${ids})`, { method: 'DELETE' });
      }
    }
  } catch (err) {
    console.error('pushRecycleBin error:', err.message);
  }
}

async function popRecycleBin(stackType) {
  try {
    const res = await supabaseFetch(`recycle_bin?stack_type=eq.${stackType}&select=*&order=id.desc&limit=1`);
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows.length) return null;
    const row = rows[0];
    await supabaseFetch(`recycle_bin?id=eq.${row.id}`, { method: 'DELETE' });
    return row.snapshot;
  } catch (err) {
    console.error('popRecycleBin error:', err.message);
    return null;
  }
}

async function clearRecycleBin(stackType) {
  try {
    await supabaseFetch(`recycle_bin?stack_type=eq.${stackType}`, { method: 'DELETE' });
  } catch (err) {
    console.error('clearRecycleBin error:', err.message);
  }
}

async function countRecycleBin() {
  try {
    const [uRes, rRes] = await Promise.all([
      supabaseFetch('recycle_bin?stack_type=eq.undo&select=id'),
      supabaseFetch('recycle_bin?stack_type=eq.redo&select=id')
    ]);
    const u = uRes.ok ? await uRes.json() : [];
    const r = rRes.ok ? await rRes.json() : [];
    return { undoCount: u.length, redoCount: r.length };
  } catch (err) {
    console.error('countRecycleBin error:', err.message);
    return { undoCount: 0, redoCount: 0 };
  }
}

/** Returns the current shared trip state (Supabase first, local file as fallback). */
async function getCurrentState() {
  const sb = await loadFromSupabase();
  if (sb) return sb;
  return tripData || { people: [], expenses: [], defaultAllSpends: [] };
}

/** Writes `data` as the new current state (local file + Supabase). */
async function commitState(data) {
  saveDataFile(data);
  await saveToSupabase(data);
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

      // Snapshot the state as it stood BEFORE this write, so it can be undone.
      // Any new, ordinary save invalidates the redo trail (a fresh action was taken).
      const previous = await getCurrentState();
      const hadAnyData = (previous.people && previous.people.length) || (previous.expenses && previous.expenses.length);
      if (hadAnyData) {
        await pushRecycleBin('undo', previous);
        await clearRecycleBin('redo');
      }

      await commitState(incoming); // always persist locally as instant backup + sync to Supabase
      sendJson(res, 200, { ok: true });
    } catch {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    }
    return;
  }

  // ── POST /api/undo – restore the most recent shared undo snapshot ────────────
  if (pathname === '/api/undo' && method === 'POST') {
    const snap = await popRecycleBin('undo');
    if (!snap) {
      sendJson(res, 200, { ok: false, error: 'empty' });
      return;
    }
    const current = await getCurrentState();
    await pushRecycleBin('redo', current);
    await commitState(snap);
    sendJson(res, 200, { ok: true, data: snap });
    return;
  }

  // ── POST /api/redo – restore the most recent shared redo snapshot ────────────
  if (pathname === '/api/redo' && method === 'POST') {
    const snap = await popRecycleBin('redo');
    if (!snap) {
      sendJson(res, 200, { ok: false, error: 'empty' });
      return;
    }
    const current = await getCurrentState();
    await pushRecycleBin('undo', current);
    await commitState(snap);
    sendJson(res, 200, { ok: true, data: snap });
    return;
  }

  // ── GET /api/history-status – undo/redo counts, for badges on any device ─────
  if (pathname === '/api/history-status' && method === 'GET') {
    const counts = await countRecycleBin();
    sendJson(res, 200, counts);
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
