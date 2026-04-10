# Iteration Scope and Success Criteria

## Primary Goal
Bu iterasyonun birincil hedefi: **stability + security hardening + maintainability groundwork**.

Öncelik sırası:
1. Frontend/backend socket kontrat uyuşmazlıklarını kapatmak
2. Yetki ve girdi doğrulamalarını güçlendirmek
3. Monolit dosyaları modüler yapıya kademeli hazırlamak

## Acceptance Checklist
- [x] Kritik öğrenci/öğretmen/admin akışları korunur
- [x] Bilinen socket event mismatch’leri için uyumluluk veya karşılık gelen handler sağlanır
- [x] Ortak ve yüksek riskli iş kuralları için test kapsamı genişletilir
- [x] Deploy-safe runtime config yolu tanımlanır (`/app-config`)
- [x] Güvenlik odaklı input validation ve yetki kontrolü eklenir

## System Boundaries (Baseline)
- Backend: `index.js` (Express + Socket.IO + Firebase Admin + Gemini + JSON file storage)
- Frontend: `public/app.js` (auth, classroom, notebook, trial/game, reporting, PWA)
- Shared utility layer: `utils/question-utils.js`
- New service layer (incremental): `services/*`
