function sanitizeString(value, maxLength = 100) {
    if (typeof value !== "string") return "";
    return value.trim().slice(0, maxLength);
}

function isValidImageDataUrl(value, maxLength = 10 * 1024 * 1024) {
    if (!value || typeof value !== "string") return false;
    if (value.length > maxLength) return false;
    if (value.startsWith("http://") || value.startsWith("https://")) return true;
    return /^data:image\/(jpeg|jpg|png|gif|webp);base64,[a-zA-Z0-9+/=]+$/.test(value);
}

function isTeacherRole(role) {
    return role === "teacher" || role === "admin";
}

function isAdminRole(role) {
    return role === "admin";
}

function sanitizeQuestionReport(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;

    const report = {
        id: sanitizeString(value.id, 120),
        soru: sanitizeString(value.soru || value.not, 1000),
        dogru: sanitizeString(String(value.dogru ?? ""), 50)
    };

    if (Array.isArray(value.siklar)) {
        report.siklar = value.siklar
            .slice(0, 10)
            .map((option) => sanitizeString(String(option ?? ""), 200));
    } else if (value.siklar && typeof value.siklar === "object") {
        report.siklar = {};
        Object.keys(value.siklar).slice(0, 10).forEach((key) => {
            const safeKey = sanitizeString(String(key), 10);
            if (safeKey) {
                report.siklar[safeKey] = sanitizeString(String(value.siklar[key] ?? ""), 200);
            }
        });
    }

    return report;
}

/**
 * E-posta adresinin temel format geçerliliğini kontrol eder.
 * Gerçek teslimat edilebilirliğini doğrulamaz; yalnızca açık hatalı
 * girdileri reddeder.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
    if (!email || typeof email !== "string") return false;
    const trimmed = email.trim();
    if (trimmed.length > 254) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

module.exports = {
    sanitizeString,
    isValidImageDataUrl,
    isTeacherRole,
    isAdminRole,
    sanitizeQuestionReport,
    isValidEmail
};
