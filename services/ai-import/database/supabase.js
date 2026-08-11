const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

let supabase = null;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.warn("⚠️ UYARI: Supabase kimlik bilgileri eksik (SUPABASE_URL veya SUPABASE_ANON_KEY). AI Import sistemi veritabanına bağlanamayacak.");
}

module.exports = {
    supabase,
    isSupabaseConfigured: () => !!supabase
};
