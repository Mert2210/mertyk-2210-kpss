# Day 1 / Day 2 Stabilization Checklist

## 1) Local setup

1. Root dependencies:
   - `npm install`
2. V2 server dependencies:
   - `cd /home/runner/work/mertyk-2210-kpss/mertyk-2210-kpss/v2-server && npm install`
3. Frontend build smoke:
   - `npm run build:client`

## 2) Environment preparation

Use `/home/runner/work/mertyk-2210-kpss/mertyk-2210-kpss/v2-server/.env.example` as base.

Required for v2 server:
- `PORT` (Render automatically injects this in production)
- `SUPABASE_URL`
- `SUPABASE_KEY`

Backward-compatible fallback (supported but not preferred):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 3) Diagnostics commands (root)

Run from `/home/runner/work/mertyk-2210-kpss/mertyk-2210-kpss`:

1. Syntax check:
   - `npm run check:syntax`
2. V2 config/health unit checks:
   - `npm run test:v2-config`
3. Existing regression suite:
   - `npm test`

## 4) V2 startup + health smoke test

1. Start v2 server:
   - `cd /home/runner/work/mertyk-2210-kpss/mertyk-2210-kpss/v2-server && npm start`
2. Confirm startup logs:
   - Port log includes `env=...`
   - Supabase configuration status log is printed
   - Missing/invalid critical config warnings are visible (without secret values)
3. Health check:
   - `GET http://localhost:3000/api/health` (or your `PORT`)
   - Expect `200` with machine-readable fields (`ok`, `service`, `env`, `port`, `timestamp`) and no secrets.

## 5) Render checks (Day 2)

1. Confirm Render service uses:
   - `rootDir: v2-server`
   - `buildCommand: npm run build:client && npm install`
   - `startCommand: npm start`
   - `healthCheckPath: /api/health`
2. In Render environment variables, set:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. After deploy:
   - Open `https://<render-app>/api/health` and verify HTTP `200`
   - Check logs for startup diagnostics and absence of crashes
   - Open app root URL and verify frontend is served (basic smoke test)
