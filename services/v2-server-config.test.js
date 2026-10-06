const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function loadConfigModule() {
  const modulePath = path.join(__dirname, '../v2-server/config.js');
  return import(pathToFileURL(modulePath).href);
}

test('resolveSupabaseConfig prefers SUPABASE_* variables', async () => {
  const { resolveSupabaseConfig } = await loadConfigModule();
  const config = resolveSupabaseConfig({
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_KEY: 'key-1',
    VITE_SUPABASE_URL: 'https://legacy.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'legacy-key'
  });

  assert.equal(config.url, 'https://example.supabase.co');
  assert.equal(config.key, 'key-1');
  assert.equal(config.hasConfig, true);
  assert.equal(config.usesLegacyFallback, false);
});

test('resolveSupabaseConfig supports VITE fallback for backward compatibility', async () => {
  const { resolveSupabaseConfig } = await loadConfigModule();
  const config = resolveSupabaseConfig({
    VITE_SUPABASE_URL: 'https://legacy.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'legacy-key'
  });

  assert.equal(config.hasConfig, true);
  assert.equal(config.usesLegacyFallback, true);
  assert.equal(config.missing.url, false);
  assert.equal(config.missing.key, false);
});

test('getStartupDiagnostics reports missing config and invalid port', async () => {
  const { getStartupDiagnostics } = await loadConfigModule();
  const diagnostics = getStartupDiagnostics({
    NODE_ENV: 'production',
    PORT: 'invalid'
  });

  assert.equal(diagnostics.port, 3000);
  assert.equal(diagnostics.supabase.hasConfig, false);
  assert.equal(diagnostics.warnings.some((warning) => warning.includes('PORT is invalid')), true);
  assert.equal(diagnostics.warnings.some((warning) => warning.includes('Supabase configuration is incomplete')), true);
});

test('buildHealthPayload returns machine-readable safe fields', async () => {
  const { buildHealthPayload, getStartupDiagnostics } = await loadConfigModule();
  const diagnostics = getStartupDiagnostics({
    NODE_ENV: 'development',
    PORT: '3100',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_KEY: 'masked-secret'
  });

  const payload = buildHealthPayload({ diagnostics, startedAt: Date.now() - 1200 });
  assert.equal(payload.ok, true);
  assert.equal(payload.port, 3100);
  assert.equal(payload.service, 'mertyk-kpss-v2-server');
  assert.equal(payload.supabaseConfigured, true);
  assert.equal(typeof payload.timestamp, 'string');
  assert.equal(payload.status.includes('SECURE'), true);
  assert.equal(JSON.stringify(payload).includes('masked-secret'), false);
});
