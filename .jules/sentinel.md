## 2026-04-30 - [Remove static root exposure and hardcoded keys]
**Vulnerability:** Root directory of the application was publicly accessible via `app.use(express.static(path.join(__dirname)))` exposing source code and keys. Supabase Anon keys were hardcoded into frontend JS.
**Learning:** Hardcoded static assets routes can unintentionally expose sensitive backend files. Client side should fetch config from a backend endpoint instead of hardcoding keys.
**Prevention:** Avoid wildcard static routing from backend root. Use `/app-config` endpoints to dynamically serve keys.
