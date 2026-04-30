## 2024-05-18 - Missing ARIA Labels on Icon Buttons
**Learning:** Found several icon-only buttons (like report, favorite, close) missing critical ARIA labels in public/index.html, which impairs screen reader accessibility.
**Action:** Always ensure any icon-only button uses an `aria-label` attribute and a `title` attribute for tooltip/accessibility support, following existing Turkish wording conventions (e.g., "Hatalı Soru Bildir", "Kapat").
