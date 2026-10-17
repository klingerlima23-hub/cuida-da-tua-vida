// api/track.js — registra visitantes no Neon Postgres (Vercel Serverless, Node)
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

let ready = false;
async function ensureTable() {
  if (ready) return;
  await sql`
    CREATE TABLE IF NOT EXISTS visitas (
      id            BIGSERIAL PRIMARY KEY,
      criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
      evento        TEXT,
      ip            TEXT,
      pais          TEXT,
      regiao        TEXT,
      cidade        TEXT,
      latitude      TEXT,
      longitude     TEXT,
      tz_servidor   TEXT,
      pagina        TEXT,
      url           TEXT,
      referrer      TEXT,
      user_agent    TEXT,
      plataforma    TEXT,
      mobile        BOOLEAN,
      touch         BOOLEAN,
      idioma        TEXT,
      idiomas       TEXT,
      tela          TEXT,
      viewport      TEXT,
      dpr           REAL,
      cores_cpu     INT,
      memoria_gb    REAL,
      cor_prof      INT,
      timezone_cli  TEXT,
      conexao       TEXT,
      downlink      REAL,
      dnt           TEXT,
      utm           JSONB,
      parcela       TEXT,
      payload       JSONB
    )`;
  ready = true;
}

function firstIp(h) {
  const xff = h['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return h['x-real-ip'] || h['x-vercel-forwarded-for'] || null;
}
function dec(v) { try { return v ? decodeURIComponent(v) : null; } catch { return v || null; } }

async function readBody(req) {
  if (req.body) {
    if (typeof req.body === 'object') return req.body;
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return await new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req, res) {
  // CORS básico (mesma origem, mas evita surpresa com sendBeacon)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ erro: 'use POST' });

  try {
    const h = req.headers || {};
    const b = (await readBody(req)) || {};

    if (!process.env.DATABASE_URL) {
      // Sem banco configurado ainda: não derruba a página.
      return res.status(202).json({ ok: false, motivo: 'DATABASE_URL ausente' });
    }

    await ensureTable();

    await sql`
      INSERT INTO visitas (
        evento, ip, pais, regiao, cidade, latitude, longitude, tz_servidor,
        pagina, url, referrer, user_agent, plataforma, mobile, touch,
        idioma, idiomas, tela, viewport, dpr, cores_cpu, memoria_gb, cor_prof,
        timezone_cli, conexao, downlink, dnt, utm, parcela, payload
      ) VALUES (
        ${b.event || 'pageview'},
        ${firstIp(h)},
        ${h['x-vercel-ip-country'] || null},
        ${dec(h['x-vercel-ip-country-region'])},
        ${dec(h['x-vercel-ip-city'])},
        ${h['x-vercel-ip-latitude'] || null},
        ${h['x-vercel-ip-longitude'] || null},
        ${h['x-vercel-ip-timezone'] || null},
        ${b.page || null},
        ${b.url || null},
        ${b.referrer || null},
        ${b.ua || h['user-agent'] || null},
        ${b.platform || null},
        ${b.ua_mobile ?? null},
        ${b.touch ?? null},
        ${b.lang || null},
        ${b.langs || null},
        ${b.tela_w ? b.tela_w + 'x' + b.tela_h : null},
        ${b.viewport_w ? b.viewport_w + 'x' + b.viewport_h : null},
        ${b.dpr || null},
        ${b.cores || null},
        ${b.memoria_gb || null},
        ${b.cor_profundidade || null},
        ${b.timezone || null},
        ${b.conexao || null},
        ${b.downlink || null},
        ${b.dnt || null},
        ${b.utm ? JSON.stringify(b.utm) : null},
        ${b.parcela || null},
        ${JSON.stringify(b)}
      )`;

    return res.status(204).end();
  } catch (err) {
    console.error('track error:', err && err.message);
    // Nunca quebrar a experiência do visitante por erro de log.
    return res.status(204).end();
  }
}
