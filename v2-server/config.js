const DEFAULT_PORT = 3000;
const HEALTH_STATUS_MESSAGE = 'V2 Ultimate Server is SECURE and running perfectly!';

function normalizePort(rawPort) {
  const parsedPort = Number.parseInt(rawPort, 10);
  if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    return { port: DEFAULT_PORT, wasInvalid: Boolean(rawPort) };
  }

  return { port: parsedPort, wasInvalid: false };
}

export function resolveSupabaseConfig(env = process.env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const key = env.SUPABASE_KEY || env.VITE_SUPABASE_ANON_KEY || '';

  return {
    url,
    key,
    hasConfig: Boolean(url && key),
    usesLegacyFallback: Boolean(!env.SUPABASE_URL || !env.SUPABASE_KEY),
    missing: {
      url: !url,
      key: !key
    }
  };
}

export function getStartupDiagnostics(env = process.env) {
  const { port, wasInvalid } = normalizePort(env.PORT);
  const supabase = resolveSupabaseConfig(env);
  const isProduction = env.NODE_ENV === 'production';
  const warnings = [];

  if (wasInvalid) {
    warnings.push('PORT is invalid; falling back to 3000.');
  }

  if (supabase.usesLegacyFallback && !supabase.missing.url && !supabase.missing.key) {
    warnings.push('Using legacy VITE_SUPABASE_* fallback variables; prefer SUPABASE_URL and SUPABASE_KEY.');
  }

  if (supabase.missing.url || supabase.missing.key) {
    warnings.push('Supabase configuration is incomplete; related features will be limited.');
  }

  return {
    nodeEnv: env.NODE_ENV || 'development',
    isProduction,
    port,
    supabase,
    warnings
  };
}

export function buildHealthPayload({ diagnostics, startedAt }) {
  return {
    status: HEALTH_STATUS_MESSAGE,
    ok: true,
    service: 'mertyk-kpss-v2-server',
    env: diagnostics.nodeEnv,
    port: diagnostics.port,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
    supabaseConfigured: diagnostics.supabase.hasConfig
  };
}

export function getHealthStatusMessage() {
  return HEALTH_STATUS_MESSAGE;
}
