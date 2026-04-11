export function createSafeClientStore(storage = globalThis?.localStorage, options = {}) {
    const onError = typeof options.onError === 'function' ? options.onError : (() => {});

    const getItem = (key, fallback = null) => {
        try {
            const value = storage?.getItem?.(key);
            return value === null || value === undefined ? fallback : value;
        } catch (error) {
            onError(error, key, 'getItem');
            return fallback;
        }
    };

    const setItem = (key, value) => {
        try {
            storage?.setItem?.(key, String(value));
            return true;
        } catch (error) {
            onError(error, key, 'setItem');
            return false;
        }
    };

    const removeItem = (key) => {
        try {
            storage?.removeItem?.(key);
            return true;
        } catch (error) {
            onError(error, key, 'removeItem');
            return false;
        }
    };

    const getJSON = (key, fallback = null) => {
        const raw = getItem(key, null);
        if (raw === null || raw === '') return fallback;
        try {
            return JSON.parse(raw);
        } catch (error) {
            onError(error, key, 'getJSON');
            return fallback;
        }
    };

    const setJSON = (key, value) => setItem(key, JSON.stringify(value));

    return {
        getItem,
        setItem,
        removeItem,
        getJSON,
        setJSON
    };
}
