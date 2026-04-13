const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const appShellModuleUrl = pathToFileURL(path.resolve(__dirname, '../public/modules/app-shell.mjs')).href;

async function importAppShell() {
    return import(appShellModuleUrl);
}

test('buildRelativeResourceUrl kök bağımsız göreli kaynak yolu üretir', async () => {
    const { buildRelativeResourceUrl } = await importAppShell();

    assert.equal(buildRelativeResourceUrl('/sw.js'), './sw.js');
    assert.equal(buildRelativeResourceUrl('questions.json'), './questions.json');
    assert.equal(buildRelativeResourceUrl('./manifest.json'), './manifest.json');
});

test('shouldRegisterServiceWorker yalnızca http/https protokollerinde izin verir', async () => {
    const { shouldRegisterServiceWorker } = await importAppShell();

    assert.equal(shouldRegisterServiceWorker('https:'), true);
    assert.equal(shouldRegisterServiceWorker('http:'), true);
    assert.equal(shouldRegisterServiceWorker('file:'), false);
    assert.equal(shouldRegisterServiceWorker('capacitor:'), false);
});

test('getShareableAppLink web origin yoksa fallback link döndürür', async () => {
    const { getShareableAppLink } = await importAppShell();

    assert.equal(getShareableAppLink({ origin: 'https://example.com' }), 'https://example.com');
    assert.equal(getShareableAppLink({ origin: 'null' }, 'https://fallback.test'), 'https://fallback.test');
    assert.equal(getShareableAppLink({ origin: 'file://' }, 'https://fallback.test'), 'https://fallback.test');
});
