function sanitizeString(value, maxLength = 100) {
    if (typeof value !== "string") return "";
    return value.trim().slice(0, maxLength);
}

function isValidImageDataUrl(value, maxLength = 2 * 1024 * 1024) {
    if (!value || typeof value !== "string") return false;
    if (value.length > maxLength) return false;
    return /^data:image\/(jpeg|jpg|png|gif|webp);base64,[a-zA-Z0-9+/=\s]+$/.test(value);
}

function isTeacherRole(role) {
    return role === "teacher" || role === "admin";
}

function isAdminRole(role) {
    return role === "admin";
}

module.exports = {
    sanitizeString,
    isValidImageDataUrl,
    isTeacherRole,
    isAdminRole
};
