import sys

index_path = "index.js"
with open(index_path, "r", encoding="utf-8") as f:
    js = f.read()

# 1. Add 'gazililer_global' subscription for students
old_sub = "await admin.messaging().subscribeToTopic([safeToken], studentTopic);"
new_sub = """await admin.messaging().subscribeToTopic([safeToken], studentTopic);
            await admin.messaging().subscribeToTopic([safeToken], "gazililer_global");"""

if old_sub in js:
    js = js.replace(old_sub, new_sub)
    print("Added gazililer_global to studentTopic")

# Also add to classCode subscription just in case
old_class_sub = "await admin.messaging().subscribeToTopic([safeToken], safeClassCode);"
new_class_sub = """await admin.messaging().subscribeToTopic([safeToken], safeClassCode);
            await admin.messaging().subscribeToTopic([safeToken], "gazililer_global");"""

if old_class_sub in js:
    js = js.replace(old_class_sub, new_class_sub)
    print("Added gazililer_global to classCode")

# 2. Add Daily Notification Cron Job
# I will append it near the end of index.js, just before `server.listen`
daily_cron_logic = """
// --- GÜNLÜK TOPLU BİLDİRİM (CRON JOB YERİNE setInterval) ---
let lastDailyPushDate = "";
setInterval(() => {
    const now = new Date();
    // Saat kontrolü: Türkiye saati (UTC+3) ile 20:00 (Yani UTC saati ile 17:00'ye denk geliyor, ama sunucu yerel saatini veya toLocaleString kullanabiliriz)
    const options = { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hour12: false };
    const trTimeStr = now.toLocaleTimeString('tr-TR', options);
    const currentDateStr = now.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' });
    
    // Saat 20:00 (Akşam 8) olduğunda ve bugün henüz gönderilmediyse
    if (trTimeStr === "20:00" && lastDailyPushDate !== currentDateStr) {
        lastDailyPushDate = currentDateStr;
        sendPushNotification(
            "gazililer_global", 
            "📚 Hatırlatma Zamanı!", 
            "Kumbaranda biriken güncel yanlışların var. Günü geçen yanlışlarını tekrar etme vakti!"
        ).catch(e => console.error("Günlük bildirim hatası:", e));
        console.log("✅ Günlük (20:00) toplu bildirim tetiklendi.");
    }
}, 60000); // Her dakika kontrol et
"""

if "server.listen(" in js and "GÜNLÜK TOPLU BİLDİRİM" not in js:
    js = js.replace("server.listen(", daily_cron_logic + "\nserver.listen(")
    print("Added Daily Push Notification Cron")

with open(index_path, "w", encoding="utf-8") as f:
    f.write(js)
