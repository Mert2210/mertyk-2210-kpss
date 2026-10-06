import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolveSupabaseConfig } from '../config.js';
dotenv.config();

export const initializeCronJobs = () => {
  const supabaseConfig = resolveSupabaseConfig(process.env);
  if (!supabaseConfig.hasConfig) {
    console.warn('⚠️ [CRON] Supabase yapılandırması eksik. Cron görevi başlatılmadı.');
    return;
  }

  const supabase = createClient(supabaseConfig.url, supabaseConfig.key);

  // Her gece 00:00'da çalışacak
  cron.schedule('0 0 * * *', async () => {
    console.log('⏳ [CRON] Akıllı Tekrar Motoru (Spaced Repetition) çalıştırılıyor...');
    
    // Hatırlatma tarihi bugüne veya öncesine gelmiş ve henüz çözülmemiş soruları bul
    const { data, error } = await supabase
      .from('questions')
      .select('id, user_id')
      .eq('is_solved', false)
      .lte('reminder_date', new Date().toISOString());

    if (error) {
      console.error('❌ [CRON] Hata:', error.message);
      return;
    }

    if (data && data.length > 0) {
      console.log(`✅ [CRON] ${data.length} adet sorunun tekrar vakti geldi!`);
      // Gelecekte buraya Push Notification (Bildirim) gönderme kodu eklenecek.
    } else {
      console.log('✅ [CRON] Bugün için tekrar edilecek soru bulunamadı.');
    }
  });
  
  console.log('⚙️ Akıllı Tekrar (Cron) Motoru Başlatıldı.');
};
