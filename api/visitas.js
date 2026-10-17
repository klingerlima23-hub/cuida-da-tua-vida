// api/visitas.js — lista as últimas visitas (painel protegido por chave).
// Uso: GET /api/visitas?key=SUACHAVE&limit=200
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  const key = (req.query && req.query.key) || '';
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ erro: 'chave inválida' });
  }
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ erro: 'DATABASE_URL ausente' });
  }
  try {
    let limit = parseInt((req.query && req.query.limit) || '200', 10);
    if (isNaN(limit) || limit < 1) limit = 200;
    if (limit > 1000) limit = 1000;

    const rows = await sql`
      SELECT id, criado_em, evento, ip, pais, regiao, cidade, latitude, longitude,
             pagina, referrer, plataforma, mobile, tela, viewport, idioma,
             timezone_cli, conexao, user_agent, parcela
      FROM visitas
      ORDER BY id DESC
      LIMIT ${limit}`;

    const total = await sql`SELECT count(*)::int AS n FROM visitas`;
    const unicos = await sql`SELECT count(DISTINCT ip)::int AS n FROM visitas`;

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      total: total[0].n,
      ips_unicos: unicos[0].n,
      mostrando: rows.length,
      visitas: rows
    });
  } catch (err) {
    return res.status(500).json({ erro: String(err && err.message) });
  }
}
