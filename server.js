const express = require('express');
const path = require('path');
const os = require('os');
const dns = require('dns');
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();

dns.setDefaultResultOrder('ipv4first');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const REPORT_PASSWORD = process.env.REPORT_PASSWORD || 'Qu1m3rr4_';
const REPORT_AUTH_COOKIE = 'report_auth';
const DATABASE_URL = process.env.DATABASE_URL;
const isPostgres = Boolean(DATABASE_URL);

const dbPath = path.join(__dirname, 'rsvps.db');
const sqliteDb = isPostgres ? null : new sqlite3.Database(dbPath);
const pgPool = isPostgres
  ? new Pool({
      connectionString: DATABASE_URL,
      family: 4,
      ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false }
    })
  : null;

async function initializeDatabase() {
  if (isPostgres) {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS rsvps (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        attendance TEXT NOT NULL CHECK (attendance IN ('sim', 'nao')),
        guests INTEGER NOT NULL DEFAULT 0,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    return;
  }

  await new Promise((resolve, reject) => {
    sqliteDb.serialize(() => {
      sqliteDb.run(
        `
          CREATE TABLE IF NOT EXISTS rsvps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            attendance TEXT NOT NULL CHECK (attendance IN ('sim', 'nao')),
            guests INTEGER NOT NULL DEFAULT 0,
            note TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )
        `,
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  });
}

async function insertRsvp({ name, attendance, guests, note }) {
  if (isPostgres) {
    const result = await pgPool.query(
      `
        INSERT INTO rsvps (name, attendance, guests, note)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [name, attendance, guests, note]
    );
    return result.rows[0]?.id;
  }

  return new Promise((resolve, reject) => {
    sqliteDb.run(
      `
        INSERT INTO rsvps (name, attendance, guests, note)
        VALUES (?, ?, ?, ?)
      `,
      [name, attendance, guests, note],
      function onInsert(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.lastID);
      }
    );
  });
}

async function getReportData() {
  if (isPostgres) {
    const summaryResult = await pgPool.query(`
      SELECT
        COUNT(*)::int as total_respostas,
        COALESCE(SUM(CASE WHEN attendance = 'sim' THEN 1 ELSE 0 END), 0)::int as total_sim,
        COALESCE(SUM(CASE WHEN attendance = 'nao' THEN 1 ELSE 0 END), 0)::int as total_nao,
        COALESCE(SUM(CASE WHEN attendance = 'sim' THEN guests ELSE 0 END), 0)::int as total_acompanhantes
      FROM rsvps
    `);

    const listResult = await pgPool.query(`
      SELECT id, name, attendance, guests, note, created_at
      FROM rsvps
      ORDER BY id DESC
    `);

    return {
      summaryRow: summaryResult.rows[0] || {},
      rows: listResult.rows || []
    };
  }

  const summaryRow = await new Promise((resolve, reject) => {
    sqliteDb.get(
      `
        SELECT
          COUNT(*) as total_respostas,
          SUM(CASE WHEN attendance = 'sim' THEN 1 ELSE 0 END) as total_sim,
          SUM(CASE WHEN attendance = 'nao' THEN 1 ELSE 0 END) as total_nao,
          SUM(CASE WHEN attendance = 'sim' THEN guests ELSE 0 END) as total_acompanhantes
        FROM rsvps
      `,
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row || {});
      }
    );
  });

  const rows = await new Promise((resolve, reject) => {
    sqliteDb.all(
      `
        SELECT id, name, attendance, guests, note, created_at
        FROM rsvps
        ORDER BY id DESC
      `,
      (err, dataRows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(dataRows || []);
      }
    );
  });

  return { summaryRow, rows };
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

function getCookieValue(req, cookieName) {
  const rawCookie = req.headers.cookie;
  if (!rawCookie) {
    return null;
  }

  const cookies = rawCookie.split(';').map((part) => part.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${cookieName}=`));
  if (!match) {
    return null;
  }

  return decodeURIComponent(match.split('=').slice(1).join('='));
}

function isReportAuthenticated(req) {
  return getCookieValue(req, REPORT_AUTH_COOKIE) === 'ok';
}

function ensureReportAuth(req, res, next) {
  if (isReportAuthenticated(req)) {
    return next();
  }

  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Acesso não autorizado ao relatório.' });
  }

  return res.sendFile(path.join(__dirname, 'public', 'report-login.html'));
}

app.post('/api/report-login', (req, res) => {
  const { password } = req.body;

  if (password !== REPORT_PASSWORD) {
    return res.status(401).json({ error: 'Senha inválida.' });
  }

  res.setHeader('Set-Cookie', `${REPORT_AUTH_COOKIE}=ok; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`);
  return res.json({ message: 'Autenticado com sucesso.' });
});

app.post('/api/report-logout', (_req, res) => {
  res.setHeader('Set-Cookie', `${REPORT_AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return res.json({ message: 'Sessão encerrada.' });
});

app.post('/api/rsvp', async (req, res) => {
  const { name, attendance, guests, note } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Nome é obrigatório.' });
  }

  if (attendance !== 'sim' && attendance !== 'nao') {
    return res.status(400).json({ error: 'Resposta inválida.' });
  }

  const parsedGuests = Number.isInteger(guests) ? guests : parseInt(guests, 10);
  const safeGuests = Number.isNaN(parsedGuests) || parsedGuests < 0 ? 0 : parsedGuests;

  try {
    const insertedId = await insertRsvp({
      name: name.trim(),
      attendance,
      guests: safeGuests,
      note: note ? String(note).trim() : null
    });

    return res.status(201).json({
      message: 'Confirmação registrada com sucesso.',
      id: insertedId
    });
  } catch (_error) {
    return res.status(500).json({ error: 'Erro ao salvar confirmação.' });
  }
});

app.get('/api/report', ensureReportAuth, async (_req, res) => {
  try {
    const { summaryRow, rows } = await getReportData();

    return res.json({
      summary: {
        totalRespostas: summaryRow?.total_respostas || 0,
        totalSim: summaryRow?.total_sim || 0,
        totalNao: summaryRow?.total_nao || 0,
        totalAcompanhantes: summaryRow?.total_acompanhantes || 0
      },
      responses: rows || []
    });
  } catch (_error) {
    return res.status(500).json({ error: 'Erro ao gerar relatório.' });
  }
});

app.get('/relatorio', ensureReportAuth, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'report.html'));
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, HOST, () => {
      const networkInterfaces = os.networkInterfaces();
      const addresses = [];

      Object.values(networkInterfaces).forEach((interfaceList) => {
        (interfaceList || []).forEach((iface) => {
          if (iface.family === 'IPv4' && !iface.internal) {
            addresses.push(iface.address);
          }
        });
      });

      console.log(`Servidor rodando em http://localhost:${PORT}`);
      console.log(`Banco ativo: ${isPostgres ? 'PostgreSQL (DATABASE_URL)' : 'SQLite local (rsvps.db)'}`);
      if (addresses.length) {
        console.log('Acesso na rede local:');
        addresses.forEach((address) => {
          console.log(`- http://${address}:${PORT}`);
        });
      }
    });
  })
  .catch((error) => {
    console.error('Falha ao inicializar banco de dados:', error.message);
    process.exit(1);
  });
