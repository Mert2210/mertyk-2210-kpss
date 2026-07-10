import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || 'placeholder'
);

export const initializeCronJobs = () => {
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
