export const SETTINGS_MODES = Object.freeze({
    PROFILE: 'profile',
    DERSLERIM: 'derslerim'
});

export function applySettingsMode(settingsEl, titleEl, mode) {
    const safeMode = mode === SETTINGS_MODES.DERSLERIM ? SETTINGS_MODES.DERSLERIM : SETTINGS_MODES.PROFILE;
    if (settingsEl) {
        settingsEl.classList.toggle('profile-mode', safeMode === SETTINGS_MODES.PROFILE);
        settingsEl.classList.toggle('derslerim-mode', safeMode === SETTINGS_MODES.DERSLERIM);
    }
    if (titleEl) {
        titleEl.textContent = safeMode === SETTINGS_MODES.DERSLERIM ? '📚 Derslerim' : '👤 Profil & Ayarlar';
    }
    return safeMode;
}

export function getDefaultSettingsModeByRole(isTeacher) {
    return isTeacher ? SETTINGS_MODES.PROFILE : SETTINGS_MODES.DERSLERIM;
}

export function getSettingsVisibility(mode) {
    const safeMode = mode === SETTINGS_MODES.DERSLERIM ? SETTINGS_MODES.DERSLERIM : SETTINGS_MODES.PROFILE;
    return {
        showProfileSection: safeMode === SETTINGS_MODES.PROFILE,
        showDerslerimSection: safeMode === SETTINGS_MODES.DERSLERIM,
        showProfileSaveButton: safeMode === SETTINGS_MODES.PROFILE
    };
}
