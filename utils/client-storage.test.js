const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const clientStorageModuleUrl = pathToFileURL(path.resolve(__dirname, '../public/modules/client-storage.mjs')).href;

async function importClientStorage() {
    return import(clientStorageModuleUrl);
}

test('createSafeClientStore güvenli get/set/remove ve JSON erişimi sağlar', async () => {
    const { createSafeClientStore } = await importClientStorage();
    const backing = new Map();
    const events = [];
    const storage = {
        getItem(key) {
            if (key === 'explode-get') throw new Error('get fail');
            return backing.has(key) ? backing.get(key) : null;
        },
        setItem(key, value) {
            if (key === 'explode-set') throw new Error('set fail');
            backing.set(key, value);
        },
        removeItem(key) {
            if (key === 'explode-remove') throw new Error('remove fail');
            backing.delete(key);
        }
    };
    const store = createSafeClientStore(storage, {
        onError: (error, key, op) => events.push({ message: error.message, key, op })
    });

    assert.equal(store.getItem('missing', 'fallback'), 'fallback');
    assert.equal(store.setItem('a', 123), true);
    assert.equal(backing.get('a'), '123');
    assert.equal(store.getItem('a'), '123');
    assert.equal(store.removeItem('a'), true);
    assert.equal(backing.has('a'), false);

    backing.set('json', '{"ok":true}');
    assert.deepStrictEqual(store.getJSON('json', null), { ok: true });
    backing.set('broken', '{oops');
    assert.deepStrictEqual(store.getJSON('broken', { safe: true }), { safe: true });
    assert.deepStrictEqual(store.getJSON('empty', { safe: true }), { safe: true });

    assert.equal(store.setJSON('payload', { x: 1 }), true);
    assert.equal(backing.get('payload'), '{"x":1}');

    assert.equal(store.getItem('explode-get', 'fb'), 'fb');
    assert.equal(store.setItem('explode-set', 'x'), false);
    assert.equal(store.removeItem('explode-remove'), false);
    assert.equal(events.some((entry) => entry.op === 'getItem' && entry.key === 'explode-get'), true);
    assert.equal(events.some((entry) => entry.op === 'setItem' && entry.key === 'explode-set'), true);
    assert.equal(events.some((entry) => entry.op === 'removeItem' && entry.key === 'explode-remove'), true);
    assert.equal(events.some((entry) => entry.op === 'getJSON' && entry.key === 'broken'), true);
});

test('createSafeClientStore setItem null/undefined için false döner ve uyarı basar', async () => {
    const { createSafeClientStore } = await importClientStorage();
    const storage = { setItem() {} };
    const store = createSafeClientStore(storage);
    const originalWarn = console.warn;
    const warns = [];
    console.warn = (...args) => warns.push(args.join(' '));
    try {
        assert.equal(store.setItem('k', null), false);
        assert.equal(store.setItem('k', undefined), false);
        assert.equal(warns.length, 2);
    } finally {
        console.warn = originalWarn;
    }
});
