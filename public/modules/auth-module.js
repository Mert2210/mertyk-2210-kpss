/**
 * Kimlik Doğrulama Modülü (Auth Module)
 *
 * Firebase Authentication ile ilgili yardımcı fonksiyonlar.
 * Kayıt, giriş, oturum yönetimi ve rol kontrolü.
 *
 * Not: Temel auth akışı public/app.js içindedir.
 * Bu modül, bağımsız test edilebilir saf fonksiyonları içerir.
 */

/**
 * E-posta adresinin geçerli formatında olduğunu kontrol eder.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
    if (typeof email !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Şifrenin minimum güvenlik gereksinimlerini karşılayıp karşılamadığını kontrol eder.
 * @param {string} password
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validatePassword(password) {
    if (typeof password !== 'string' || password.length < 6) {
        return { valid: false, reason: 'Şifre en az 6 karakter olmalıdır.' };
    }
    return { valid: true };
}

/**
 * Kullanıcı rolünü normalleştirir.
 * Bilinmeyen roller 'student' olarak döner.
 * @param {string} role
 * @returns {'student'|'teacher'|'admin'}
 */
export function normalizeUserRole(role) {
    const VALID_ROLES = ['student', 'teacher', 'admin'];
    const r = String(role || '').trim().toLowerCase();
    return VALID_ROLES.includes(r) ? r : 'student';
}

/**
 * Kullanıcının belirli bir role sahip olup olmadığını kontrol eder.
 * @param {object} user   - { role: string }
 * @param {string} role
 * @returns {boolean}
 */
export function hasRole(user, role) {
    return String(user?.role || '').toLowerCase() === String(role || '').toLowerCase();
}
