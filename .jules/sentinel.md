## 2026-04-30 - [Remove static root exposure and hardcoded keys]
**Vulnerability:** Root directory of the application was publicly accessible via `app.use(express.static(path.join(__dirname)))` exposing source code and keys. Supabase Anon keys were hardcoded into frontend JS.
**Learning:** Hardcoded static assets routes can unintentionally expose sensitive backend files. Client side should fetch config from a backend endpoint instead of hardcoding keys.
**Prevention:** Avoid wildcard static routing from backend root. Use `/app-config` endpoints to dynamically serve keys.

## 2025-05-01 - [XSS via Unescaped Socket Payload rendered with innerHTML]
**Vulnerability:** Player usernames transmitted via WebSocket events (`updatePlayerList` and `gameOver`) were injected directly into the DOM using `innerHTML` without HTML escaping in `public/app.js`. Since the backend sanitization (`sanitizeString`) only trims strings and limits their length without encoding HTML entities, this allowed Stored/Reflected XSS on all other connected clients if a user chose a malicious username.
**Learning:** Client-side rendering frameworks/vanilla JS often fail to automatically sanitize inputs when using `innerHTML`. While backend input validation exists, it does not always escape HTML entities.
**Prevention:** Always wrap variables containing user-controlled data with a sanitization function like `escapeHtml()` before interpolating them into HTML templates that will be rendered using `innerHTML`, or prefer `textContent`/`innerText` where HTML formatting is not required.
