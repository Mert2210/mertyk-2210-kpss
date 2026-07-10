export const EGITIM_SEVIYELERI = [
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
    id: "kpss_gygk",
    ad: "KPSS (Genel Yetenek - Genel Kültür)",
    kategoriler: [
      { id: "turkce_gy", ad: "Türkçe", konular: ["Sözcükte Anlam", "Cümlede Anlam", "Paragrafta Anlam", "Dil Bilgisi", "Sözel Mantık"] },
      { id: "matematik_gy", ad: "Matematik", konular: ["Sayılar", "Problemler", "Kümeler", "Olasılık", "Sayısal Mantık"] },
      { id: "tarih", ad: "Tarih", konular: ["İslamiyet Öncesi", "Osmanlı", "İnkılap Tarihi"] },
      { id: "cografya", ad: "Coğrafya", konular: ["Fiziki Coğrafya", "Beşeri Coğrafya", "Ekonomik Coğrafya"] },
      { id: "vatandaslik", ad: "Vatandaşlık", konular: ["Hukukun Temel Kavramları", "Anayasa Hukuku", "İdare Hukuku", "Güncel Bilgiler"] }
    ]
  },
  {
    id: "kpss_a",
    ad: "KPSS A Grubu (Alan Bilgisi)",
    kategoriler: [
      { id: "hukuk", ad: "Hukuk", konular: ["Anayasa Hukuku", "İdare Hukuku", "Ceza Hukuku", "Medeni Hukuk", "Borçlar Hukuku", "Ticaret Hukuku", "İcra ve İflas Hukuku"] },
      { id: "maliye", ad: "Maliye", konular: ["Maliye Teorisi", "Kamu Giderleri", "Kamu Gelirleri", "Devlet Bütçesi", "Vergi Hukuku"] },
      { id: "iktisat", ad: "İktisat", konular: ["Mikro İktisat", "Makro İktisat", "Türkiye Ekonomisi", "Uluslararası İktisat"] },
      { id: "muhasebe", ad: "Muhasebe", konular: ["Genel Muhasebe", "Maliyet Muhasebesi", "Şirketler Muhasebesi", "Muhasebe Standartları"] },
      { id: "isletme", ad: "İşletme", konular: ["Temel Kavramlar", "Yönetim Organizasyon", "Üretim Yönetimi", "Pazarlama"] },
      { id: "kamu_yonetimi", ad: "Kamu Yönetimi", konular: ["Siyaset Bilimi", "Yönetim Bilimi", "Kentleşme ve Çevre Sorunları"] }
    ]
  },
  {
    id: "ags",
    ad: "AGS (Akademi Giriş Sınavı)",
    kategoriler: [
      { id: "ags_genel", ad: "Eğitim Akademisi Giriş", konular: ["Mesleki Eğilim", "Kavramsal Beceriler", "Okuduğunu Anlama ve Yorumlama", "Eğitimde Genel Yaklaşımlar"] }
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
