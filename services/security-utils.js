function sanitizeString(value, maxLength = 100) {
    if (typeof value !== "string") return "";
    return value.trim().slice(0, maxLength);
}

function isValidImageDataUrl(value, maxLength = 10 * 1024 * 1024) {
    if (!value || typeof value !== "string") return false;
    if (value.length > maxLength) return false;
    return /^data:image\/(jpeg|jpg|png|gif|webp);base64,[a-zA-Z0-9+/=]+$/.test(value);
}

function isTeacherRole(role) {
    return role === "teacher" || role === "admin";
}

function isAdminRole(role) {
    return role === "admin";
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
    isValidEmail
};
