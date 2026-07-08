import sys

app_path = "public/app.js"
with open(app_path, "r", encoding="utf-8", errors="ignore") as f:
    js = f.read()

replacements = {
    '"\\u274C Kullan\\u0131c\\u0131 bulunamad\\u0131."': '"\\u274c Sistemimizde bu e-posta adresiyle e\\u015fle\\u015fen bir hesap bulunamad\\u0131."',
    '"\\u274C \\u015eifreniz yanl\\u0131\\u015f."': '"\\u274c Girdi\\u011finiz \\u015fifre hatal\\u0131. L\\u00fctfen kontrol edip tekrar deneyiniz."',
    '"\\u274C Ge\\u00e7ersiz e-posta adresi."': '"\\u274c L\\u00fctfen ge\\u00e7erli bir e-posta adresi girdi\\u011finizden emin olunuz."',
    '"\\u274C E-posta veya \\u015fifre hatal\\u0131."': '"\\u274c E-posta adresiniz veya \\u015fifreniz hatal\\u0131. L\\u00fctfen bilgilerinizi kontrol ediniz."',
    '"\\u274C Giri\\u015f Ba\\u015far\\u0131s\\u0131z: E-posta veya \\u015fifre hatal\\u0131."': '"\\u274c Giri\\u015f Ba\\u015far\\u0131s\\u0131z: Bilgilerinizi kontrol edip tekrar deneyiniz."',
    '"\\u274C \\u015eifreler uymuyor!"': '"\\u274c Girdi\\u011finiz \\u015fifreler birbiriyle uyu\\u015fmuyor. L\\u00fctfen tekrar kontrol ediniz."',
    '"\\u2705 Kay\\u0131t ba\\u015far\\u0131l\\u0131! L\\u00fctfen do\\u011frulama maili i\\u00e7in Gelen Kutunuzu ve SPAM (Gereksiz) klas\\u00f6r\\u00fcn\\u00fc kontrol etmeyi unutmay\\u0131n!"': '"\\u2705 Kayd\\u0131n\\u0131z ba\\u015far\\u0131yla olu\\u015fturuldu! Hesab\\u0131n\\u0131z\\u0131 aktifle\\u015ftirmek i\\u00e7in l\\u00fctfen do\\u011frulama e-postas\\u0131n\\u0131 (Gelen Kutusu veya Spam klas\\u00f6r\\u00fcnde) kontrol ediniz."',
    '"\\u274C Bu e-posta zaten kullan\\u0131mda."': '"\\u274c Bu e-posta adresi sistemimizde zaten kay\\u0131tl\\u0131. L\\u00fctfen giri\\u015f yapmay\\u0131 deneyiniz."',
    '"\\u26a0\\ufe0f L\\u00fctfen \\u00f6nce e-posta adresinizi yaz\\u0131n."': '"\\u26a0\\ufe0f \\u015eifre s\\u0131f\\u0131rlama i\\u015flemi i\\u00e7in l\\u00fctfen \\u00f6nce e-posta adresinizi giriniz."',
    '"\\u26a0\\ufe0f L\\u00fctfen Ders ve Konu alanlar\\u0131n\\u0131 doldurun!"': '"\\u26a0\\ufe0f \\u0130\\u015fleme devam edebilmek i\\u00e7in l\\u00fctfen \\"Ders\\" ve \\"Konu\\" se\\u00e7imlerinizi eksiksiz tamamlay\\u0131n\\u0131z."',
    '"\\ud83d\\udea8 L\\u00fctfen \\u00f6nce bir s\\u0131n\\u0131f se\\u00e7in veya olu\\u015fturun!"': '"\\u26a0\\ufe0f L\\u00fctfen i\\u015fleme ba\\u015flamadan \\u00f6nce aktif bir s\\u0131n\\u0131f se\\u00e7iniz veya yeni bir s\\u0131n\\u0131f olu\\u015fturunuz."',
    '"L\\u00fctfen bir foto\\u011fraf y\\u00fckleyin veya kendinize bir not yaz\\u0131n!"': '"\\u26a0\\ufe0f L\\u00fctfen soru kaydetmeden \\u00f6nce bir g\\u00f6rsel ekleyiniz veya metin alan\\u0131na bir i\\u00e7erik yaz\\u0131n\\u0131z."',
    '"Komutan\\u0131m, l\\u00fctfen \\u00f6nce K\\u00fct\\u00fcphane/Ders se\\u00e7imini tamamlay\\u0131n!"': '"\\u26a0\\ufe0f L\\u00fctfen i\\u015fleme ba\\u015flamadan \\u00f6nce eklenecek k\\u00fct\\u00fcphane veya ders se\\u00e7imini ger\\u00e7ekle\\u015ftiriniz."',
    '"Sunucuya ba\\u011flan\\u0131lamad\\u0131!"': '"\\u26a0\\ufe0f Sunucu ile ba\\u011flant\\u0131 kurulamad\\u0131. L\\u00fctfen internet ba\\u011flant\\u0131n\\u0131z\\u0131 kontrol edip tekrar deneyiniz."',
    '"\\u26a0\\ufe0f G\\u00f6rsel optimize edilemedi. L\\u00fctfen farkl\\u0131 bir g\\u00f6rsel deneyin."': '"\\u26a0\\ufe0f Y\\u00fckledi\\u011finiz g\\u00f6rsel optimize edilemedi. L\\u00fctfen farkl\\u0131 veya daha d\\u00fc\\u015f\\u00fck boyutlu bir g\\u00f6rsel se\\u00e7erek tekrar deneyiniz."',
    '"L\\u00fctfen rapor almak istedi\\u011finiz s\\u0131n\\u0131f\\u0131 se\\u00e7in!"': '"\\u26a0\\ufe0f Rapor olu\\u015fturabilmek i\\u00e7in l\\u00fctfen listeden bir s\\u0131n\\u0131f se\\u00e7iniz."',
    '"Bu s\\u0131n\\u0131fa hen\\u00fcz \\u00f6\\u011fretmen taraf\\u0131ndan soru eklenmemi\\u015f."': '"\\u2139\\ufe0f Bu s\\u0131n\\u0131fa y\\u00f6netici/\\u00f6\\u011fretmen taraf\\u0131ndan hen\\u00fcz herhangi bir i\\u00e7erik eklenmemi\\u015ftir."'
}

# The terminal reads UTF-8 but Python's literal matching against the source might be tricky if emojis are present. 
# We'll replace the exact matched substrings in the raw read.
for old, new in replacements.items():
    # Convert unicode escapes to actual characters for matching
    old_str = old.encode().decode('unicode_escape')
    new_str = new.encode().decode('unicode_escape')
    js = js.replace(old_str, new_str)

# Handle cases where the source had different exact characters or encoding mismatches
js = js.replace('alert("Lütfen Ders ve Konu alanlarını doldurun!");', 'alert("⚠️ İşleme devam edebilmek için lütfen \'Ders\' ve \'Konu\' seçimlerinizi eksiksiz tamamlayınız.");')
js = js.replace('alert("Komutanım, lütfen önce Kütüphane/Ders seçimini tamamlayın!");', 'alert("⚠️ Lütfen işleme başlamadan önce hedef kütüphane ve ders seçimini tamamlayınız.");')
js = js.replace('alert("Sunucuya bağlanılamadı!");', 'alert("⚠️ Sunucu ile bağlantı kurulamadı. Lütfen internet bağlantınızı kontrol edip tekrar deneyiniz.");')
js = js.replace('alert("Lütfen rapor almak istediğiniz sınıfı seçin!");', 'alert("⚠️ Rapor oluşturabilmek için lütfen listeden bir sınıf seçiniz.");')
js = js.replace('alert("Bu sınıfa henüz öğretmen tarafından soru eklenmemiş.");', 'alert("ℹ️ Bu sınıfa yönetici/öğretmen tarafından henüz herhangi bir içerik eklenmemiştir.");')
js = js.replace('alert("Lütfen bir fotoğraf yükleyin veya kendinize bir not yazın!");', 'alert("⚠️ Lütfen soru kaydetmeden önce bir görsel ekleyiniz veya metin alanına bir içerik yazınız.");')


with open(app_path, "w", encoding="utf-8") as f:
    f.write(js)

print("Applied polite alerts")
