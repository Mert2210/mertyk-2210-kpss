const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const securityModuleUrl = pathToFileURL(path.resolve(__dirname, '../public/modules/security.mjs')).href;

async function importSecurity() {
    return import(securityModuleUrl);
}

test('escapeHtml: handles null and undefined', async () => {
    const { escapeHtml } = await importSecurity();
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
});

test('escapeHtml: escapes basic HTML characters', async () => {
    const { escapeHtml } = await importSecurity();
    assert.equal(escapeHtml('&'), '&amp;');
    assert.equal(escapeHtml('<'), '&lt;');
    assert.equal(escapeHtml('>'), '&gt;');
    assert.equal(escapeHtml('"'), '&quot;');
    assert.equal(escapeHtml("'"), '&#39;');
});

test('escapeHtml: escapes typical HTML strings', async () => {
    const { escapeHtml } = await importSecurity();
    assert.equal(
        escapeHtml('<script>alert("xss")</script>'),
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
    assert.equal(
        escapeHtml('Hello & Welcome'),
        'Hello &amp; Welcome'
    );
    assert.equal(
        escapeHtml("It's a trap!"),
        'It&#39;s a trap!'
    );
});

test('escapeHtml: handles non-string inputs by converting to string', async () => {
    const { escapeHtml } = await importSecurity();
    assert.equal(escapeHtml(123), '123');
    assert.equal(escapeHtml(true), 'true');
    assert.equal(escapeHtml({ toString: () => '<div>' }), '&lt;div&gt;');
});
