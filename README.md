# Site de Aniversário do Dante

Projeto de convite com confirmação de presença (RSVP) e relatório protegido por senha.

## Stack

- Node.js + Express
- Frontend estático em `public/`
- Banco:
  - `SQLite` local (desenvolvimento automático)
  - `PostgreSQL` via `DATABASE_URL` (produção, recomendado para hospedagem grátis)

## Rodar localmente

1. Instale dependências:
   - `npm install`
2. Inicie:
   - `npm start`
3. Abra:
   - Convite: `http://localhost:3000`
   - Relatório: `http://localhost:3000/relatorio`

Senha padrão do relatório: `Qu1m3rr4_`

## Deploy grátis (Render + Supabase)

### 1) Criar banco grátis no Supabase

1. Crie conta em `https://supabase.com`.
2. Crie um projeto novo (free tier).
3. Em **Project Settings > Database**, copie a connection string `URI` (PostgreSQL).
4. Garanta que a string tenha `sslmode=require`.

Exemplo:

`postgresql://postgres:senha@db.xxx.supabase.co:5432/postgres?sslmode=require`

### 2) Publicar no Render

1. Suba este projeto para um repositório no GitHub.
2. Em `https://render.com`, clique em **New + > Web Service**.
3. Conecte o repositório.
4. Render detecta `render.yaml` automaticamente.
5. Configure variáveis de ambiente no serviço:
   - `DATABASE_URL` = string do Supabase
   - `REPORT_PASSWORD` = senha desejada (pode manter `Qu1m3rr4_`)
   - `HOST` = `0.0.0.0`
6. Faça deploy.

### 3) Verificar

- Abra a URL gerada pelo Render.
- Envie uma confirmação no convite.
- Entre em `/relatorio` com senha e confirme se os dados aparecem.

## Variáveis de ambiente

Veja `.env.example`:

- `PORT`: porta do servidor
- `HOST`: host de bind (use `0.0.0.0` em produção)
- `REPORT_PASSWORD`: senha do relatório
- `DATABASE_URL`: se preenchida, usa PostgreSQL; se vazia, usa SQLite local (`rsvps.db`)

## Observações

- Em produção, use **sempre PostgreSQL** para persistência estável.
- O `SQLite` local é ideal para testes no seu computador.
