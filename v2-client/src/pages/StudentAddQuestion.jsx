import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Image as ImageIcon, Save, Calendar, Play, Crop, Check } from 'lucide-react';
import { EGITIM_SEVIYELERI } from '../lib/constants';

export default function StudentAddQuestion() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [photo, setPhoto] = useState(null);
  
  // Form States
  const [seviye, setSeviye] = useState('');
  const [ders, setDers] = useState('');
  const [dogruCevap, setDogruCevap] = useState('');
  const [cozumLinki, setCozumLinki] = useState('');
  
  // Hatırlatma State'i (Gün/Ay/Yıl)
  const [hatirlatmaTipi, setHatirlatmaTipi] = useState('gun');
  const [hatirlatmaDegeri, setHatirlatmaDegeri] = useState(3);

  const handlePhotoUpload = (e) => {
    if(e.target.files && e.target.files[0]) {
      setPhoto(URL.createObjectURL(e.target.files[0]));
      setStep(1.5); // Kırpma Adımı
    }
  };

  const handleCropComplete = () => {
    // Gerçekte burada react-easy-crop vb. ile resim kesilir
    setStep(2);
  };

  const handleSave = () => {
    alert('Soru başarıyla kütüphaneye eklendi! Hatırlatma kuruldu.');
    navigate('/student/library');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
      <header className="bg-white shadow-sm px-4 py-4 flex items-center sticky top-0 z-10">
        <button onClick={() => navigate('/student/library')} className="text-slate-500 p-1 mr-3 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-slate-800 text-lg">
            {step === 1.5 ? 'Soruyu Kırp' : 'Kumbaraya Soru At'}
          </h1>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-md mx-auto w-full mt-4">
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
              <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-10 h-10 text-primary-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Soru Fotoğrafı</h2>
              <p className="text-sm text-slate-500 mb-6">Kitaptaki çözemediğin sorunun fotoğrafını çek veya galeriden seç.</p>
              
              <div className="flex flex-col space-y-3">
                <label className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center">
                  <Camera className="w-5 h-5 mr-2" />
                  Kamerayı Aç
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
                </label>
                <label className="w-full py-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Galeriden Seç
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>
            </div>
          </div>
        )}

        {step === 1.5 && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-slate-900 rounded-2xl overflow-hidden relative border-4 border-slate-800 h-[400px] flex items-center justify-center">
              <img src={photo} alt="Kırpılacak Soru" className="opacity-60 max-h-full object-contain" />
              {/* Sahte Kırpma Kutusu */}
              <div className="absolute w-3/4 h-1/2 border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] z-10">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary-500 -ml-1 -mt-1"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary-500 -mr-1 -mt-1"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary-500 -ml-1 -mb-1"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary-500 -mr-1 -mb-1"></div>
              </div>
            </div>
            
            <p className="text-center text-sm text-slate-500 font-medium">Lütfen sadece kaydetmek istediğiniz soruyu karenin içine alın.</p>

            <button onClick={handleCropComplete}
              className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center">
              <Crop className="w-5 h-5 mr-2" />
              Kırp ve Devam Et
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center relative overflow-hidden group">
              <img src={photo} alt="Soru" className="w-full max-h-48 object-cover rounded-lg border border-slate-100" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                 <button onClick={() => setStep(1.5)} className="text-white font-bold flex items-center"><Crop className="w-4 h-4 mr-1"/> Yeniden Kırp</button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-5">
              <h3 className="font-bold text-slate-800 text-lg border-b pb-2">Soru Detayları</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Eğitim Seviyesi</label>
                <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  value={seviye} onChange={(e) => setSeviye(e.target.value)}>
                  <option value="">Seviye Seçin...</option>
                  {EGITIM_SEVIYELERI.map(s => <option key={s.id} value={s.id}>{s.ad}</option>)}
                </select>
              </div>

              {seviye && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ders</label>
                  <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    value={ders} onChange={(e) => setDers(e.target.value)}>
                    <option value="">Ders Seçin...</option>
                    {EGITIM_SEVIYELERI.find(s => s.id === seviye)?.kategoriler.map(d => <option key={d.id} value={d.id}>{d.ad}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Doğru Cevap (Opsiyonel)</label>
                <div className="flex space-x-2">
                  {['A', 'B', 'C', 'D', 'E'].map(opt => (
                    <button key={opt} onClick={() => setDogruCevap(opt)}
                      className={`flex-1 py-2 rounded-lg font-bold border-2 ${dogruCevap === opt ? 'bg-primary-100 border-primary-500 text-primary-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Çözüm Videosu / Linki</label>
                <div className="flex items-center">
                  <Play className="w-5 h-5 text-slate-400 absolute ml-3" />
                  <input type="url" placeholder="https://youtube.com/..." 
                    className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-primary-500"
                    value={cozumLinki} onChange={(e) => setCozumLinki(e.target.value)} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <label className="block text-sm font-medium text-slate-700 mb-3 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-primary-500" />
                  Akıllı Tekrar (Ne zaman hatırlatayım?)
                </label>
                <div className="flex items-center space-x-3">
                  <input type="number" min="1" value={hatirlatmaDegeri} onChange={(e)=>setHatirlatmaDegeri(e.target.value)} 
                    className="w-20 p-3 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold" />
                  <select value={hatirlatmaTipi} onChange={(e)=>setHatirlatmaTipi(e.target.value)}
                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-lg font-medium">
                    <option value="gun">Gün Sonra</option>
                    <option value="hafta">Hafta Sonra</option>
                    <option value="ay">Ay Sonra</option>
                  </select>
                </div>
              </div>

              <button onClick={handleSave}
                className="w-full mt-6 py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center">
                <Save className="w-5 h-5 mr-2" />
                Kumbaraya Kaydet
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
