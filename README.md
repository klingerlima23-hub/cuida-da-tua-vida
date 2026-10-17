# Cuida da Tua Vida — Carteira Oficial do Intrometido

Landing page de humor que compartilha boletos (com dados pessoais **censurados**)
e desafia os curiosos a "pagar pelo crédito de intrometido". Responsiva
(mobile + desktop), com rastreamento de visitantes em Neon Postgres.

## Stack
- Front: HTML + CSS + JS puro (sem build). Fontes Google (Fraunces + Inter).
- Back: Vercel Serverless Functions (Node, ESM).
- Banco: Neon Postgres (`@neondatabase/serverless`).

## Estrutura
```
index.html            Landing page
painel.html           Painel privado de visitantes (/painel)
css/style.css         Estilos
js/app.js             Interações + coleta de dados do visitante
api/track.js          POST: grava a visita no Neon
api/visitas.js        GET: lista visitas (exige ADMIN_KEY)
assets/boletos/*.webp Boletos censurados (ficha + página inteira)
```

## Variáveis de ambiente (Vercel)
| Nome           | Para quê                                             |
|----------------|------------------------------------------------------|
| `DATABASE_URL` | Conexão Neon Postgres (criada pela integração Neon). |
| `ADMIN_KEY`    | Chave de acesso ao painel `/painel` e à `/api/visitas`. |

A tabela `visitas` é criada automaticamente na primeira visita (`CREATE TABLE IF NOT EXISTS`).

## Rastreamento
Coleta: IP, país/região/cidade e lat/long aproximados (headers da Vercel),
aparelho, SO, idioma, tela/viewport, fuso, conexão, referrer e UTMs.

Há um **banner de consentimento** pronto, desligado por padrão. Para ligar:
em `js/app.js`, mude `TRACK_CONSENT_REQUIRED` para `true`.

## Painel
Acesse `/painel`, informe a `ADMIN_KEY`. Lista as visitas, com link para o
mapa quando há coordenadas.

> Página de humor. Os boletos têm os dados pessoais do titular censurados
> (redação real: texto removido + rasterização). Permanecem visíveis apenas
> os dados da empresa recebedora.
