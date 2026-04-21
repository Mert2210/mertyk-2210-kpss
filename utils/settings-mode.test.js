const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const settingsModeModuleUrl = pathToFileURL(path.resolve(__dirname, '../public/modules/settings-mode.mjs')).href;

async function importSettingsMode() {
    return import(settingsModeModuleUrl);
}

function createMockElement() {
    const classes = new Set();
    return {
        classList: {
            toggle(name, enabled) {
                if (enabled) classes.add(name);
                else classes.delete(name);
            },
            has(name) {
                return classes.has(name);
            }
        },
        textContent: ''
    };
}

test('applySettingsMode varsayılanı profile yapar ve başlığı günceller', async () => {
    const { applySettingsMode } = await importSettingsMode();
    const settingsEl = createMockElement();
    const titleEl = createMockElement();

    const mode = applySettingsMode(settingsEl, titleEl, 'invalid');

    assert.equal(mode, 'profile');
    assert.equal(settingsEl.classList.has('profile-mode'), true);
    assert.equal(settingsEl.classList.has('derslerim-mode'), false);
    assert.equal(titleEl.textContent, '👤 Profil & Ayarlar');
});

test('applySettingsMode derslerim modunu uygular ve null elementlerde patlamaz', async () => {
    const { applySettingsMode, SETTINGS_MODES } = await importSettingsMode();
    const settingsEl = createMockElement();
    const titleEl = createMockElement();

    const mode = applySettingsMode(settingsEl, titleEl, SETTINGS_MODES.DERSLERIM);
    const nullSafeMode = applySettingsMode(null, null, SETTINGS_MODES.DERSLERIM);

    assert.equal(mode, SETTINGS_MODES.DERSLERIM);
    assert.equal(settingsEl.classList.has('profile-mode'), false);
    assert.equal(settingsEl.classList.has('derslerim-mode'), true);
    assert.equal(titleEl.textContent, '📚 Derslerim');
    assert.equal(nullSafeMode, SETTINGS_MODES.DERSLERIM);
});
