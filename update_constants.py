import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

constants_js = """export const EGITIM_SEVIYELERI = [
  {
    id: "ortaokul_lgs",
    ad: "Ortaokul & LGS",
    kategoriler: [
      { id: "turkce", ad: "Türkçe", konular: ["Sözcükte Anlam", "Cümlede Anlam", "Paragrafta Anlam", "Yazım Kuralları", "Noktalama", "Sözel Mantık"] },
      { id: "matematik", ad: "Matematik", konular: ["Çarpanlar ve Katlar", "Üslü İfadeler", "Kareköklü İfadeler", "Veri Analizi", "Olasılık", "Cebirsel İfadeler"] },
      { id: "fen", ad: "Fen Bilimleri", konular: ["Mevsimler ve İklim", "DNA ve Genetik Kod", "Basınç", "Madde ve Endüstri"] },
      { id: "inkilap", ad: "İnkılap Tarihi", konular: ["Bir Kahraman Doğuyor", "Milli Uyanış", "Milli Bir Destan"] }
    ]
  },
  {
    id: "lise_yks",
    ad: "Lise (TYT & AYT)",
    kategoriler: [
      { id: "tyt_mat", ad: "TYT Matematik", konular: ["Temel Kavramlar", "Sayı Basamakları", "Rasyonel Sayılar", "Mutlak Değer", "Problemler"] },
      { id: "tyt_turkce", ad: "TYT Türkçe", konular: ["Sözcükte Anlam", "Dil Bilgisi", "Paragraf", "Anlatım Bozuklukları"] },
      { id: "ayt_mat", ad: "AYT Matematik", konular: ["Trigonometri", "Logaritma", "Türev", "İntegral", "Diziler"] },
      { id: "ayt_fizik", ad: "AYT Fizik", konular: ["Vektörler", "Hareket", "Dinamik", "Elektrik", "Manyetizma"] }
    ]
  },
  {
    id: "kpss",
    ad: "KPSS (GY-GK & Eğitim)",
    kategoriler: [
      { id: "tarih", ad: "Tarih", konular: ["İslamiyet Öncesi", "Osmanlı", "İnkılap Tarihi"] },
      { id: "cografya", ad: "Coğrafya", konular: ["Fiziki Coğrafya", "Beşeri Coğrafya", "Ekonomik Coğrafya"] },
      { id: "egitim", ad: "Eğitim Bilimleri", konular: ["Gelişim Psikolojisi", "Öğrenme Psikolojisi", "Rehberlik"] }
    ]
  },
  {
    id: "oabt",
    ad: "ÖABT (Öğretmenlik Alan Bilgisi)",
    kategoriler: [
      { id: "sinif", ad: "Sınıf Öğretmenliği", konular: ["Temel Matematik", "Alan Eğitimi", "Çevre Eğitimi"] },
      { id: "okul_oncesi", ad: "Okul Öncesi", konular: ["Çocuk Gelişimi", "Anne Çocuk Sağlığı", "Oyun Eğitimi"] },
      { id: "pdr", ad: "Rehberlik (PDR)", konular: ["Kişilik Kuramları", "Psikolojik Danışma İlke ve Teknikleri", "Davranış Bozuklukları"] },
      { id: "turkce_ogr", ad: "Türkçe Öğretmenliği", konular: ["Dil Bilimi", "Eski Türk Edebiyatı", "Yeni Türk Edebiyatı"] },
      { id: "ilk_mat", ad: "İlköğretim Matematik", konular: ["Analiz", "Cebir", "Geometri", "Alan Eğitimi"] },
      { id: "lise_mat", ad: "Lise Matematik", konular: ["İleri Analiz", "Soyut Cebir", "Diferansiyel Denklemler"] },
      { id: "fen_ogr", ad: "Fen Bilimleri", konular: ["Fizik", "Kimya", "Biyoloji", "Yer Bilimi"] },
      { id: "sosyal_ogr", ad: "Sosyal Bilgiler", konular: ["Tarih", "Coğrafya", "Siyaset Bilimi", "Alan Eğitimi"] },
      { id: "edebiyat", ad: "Türk Dili ve Edebiyatı", konular: ["Eski Türk Dili", "Halk Edebiyatı", "Yeni Türk Edebiyatı"] },
      { id: "tarih_ogr", ad: "Tarih Öğretmenliği", konular: ["Eskiçağ Tarihi", "İslam Tarihi", "Osmanlı Tarihi"] },
      { id: "cografya_ogr", ad: "Coğrafya Öğretmenliği", konular: ["Fiziki Coğrafya", "Beşeri Coğrafya", "Bölgeler Coğrafyası"] },
      { id: "fizik_ogr", ad: "Fizik Öğretmenliği", konular: ["Mekanik", "Elektromanyetizma", "Modern Fizik"] },
      { id: "kimya_ogr", ad: "Kimya Öğretmenliği", konular: ["Analitik Kimya", "Organik Kimya", "Fizikokimya"] },
      { id: "biyoloji_ogr", ad: "Biyoloji Öğretmenliği", konular: ["Hücre Biyolojisi", "Genetik", "Ekoloji"] },
      { id: "din_ogr", ad: "Din Kültürü (DKAB)", konular: ["Kur'an-ı Kerim", "Tefsir", "Hadis", "Kelam", "Fıkıh", "İslam Tarihi"] },
      { id: "ingilizce_ogr", ad: "İngilizce Öğretmenliği", konular: ["Dil Yeterliliği", "Dil Bilimi", "Edebiyat", "Alan Eğitimi"] },
      { id: "beden_ogr", ad: "Beden Eğitimi", konular: ["Anatomi", "Fizyoloji", "Antrenman Bilgisi", "Spor Psikolojisi"] }
    ]
  }
];
"""
write_file('v2-client/src/lib/constants.js', constants_js)
print("Updated constants.js with full ÖABT list.")
