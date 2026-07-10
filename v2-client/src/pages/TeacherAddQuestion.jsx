import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, CheckCircle } from 'lucide-react';
import { EGITIM_SEVIYELERI } from '../lib/constants';

export default function TeacherAddQuestion() {
  const navigate = useNavigate();
  const [seviye, setSeviye] = useState('');
  const [ders, setDers] = useState('');
  const [file, setFile] = useState(null);

  const handleUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0].name);
    }
  };

  const handleSave = () => {
    alert('Soru(lar) başarıyla kütüphanenize eklendi!');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white shadow-sm px-4 py-4 flex items-center sticky top-0 z-10">
        <button onClick={() => navigate('/dashboard')} className="text-slate-500 p-1 mr-3 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-slate-800 text-lg">Öğretmen Soru Havuzuna Ekle</h1>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full mt-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Canlı Sınav İçin Soru Yükle</h2>
            <p className="text-slate-500 text-sm">Öğrencilerinize göndereceğiniz soruları buraya yükleyip etiketleyin.</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Hedef Kitle / Seviye</label>
              <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-700"
                value={seviye} onChange={(e) => setSeviye(e.target.value)}>
                <option value="">Seviye Seçin...</option>
                {EGITIM_SEVIYELERI.map(s => <option key={s.id} value={s.id}>{s.ad}</option>)}
              </select>
            </div>

            {seviye && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Ders Seçimi</label>
                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-700"
                  value={ders} onChange={(e) => setDers(e.target.value)}>
                  <option value="">Ders Seçin...</option>
                  {EGITIM_SEVIYELERI.find(s => s.id === seviye)?.kategoriler.map(d => <option key={d.id} value={d.id}>{d.ad}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Soru Görseli veya PDF</label>
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {file ? (
                    <>
                      <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                      <p className="mb-2 text-sm text-slate-700 font-semibold">{file}</p>
                      <p className="text-xs text-slate-500">Değiştirmek için tıklayın</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-slate-400 mb-3" />
                      <p className="mb-2 text-sm text-slate-700 font-semibold"><span className="text-primary-600">Yüklemek için tıklayın</span> veya sürükleyin</p>
                      <p className="text-xs text-slate-500">PNG, JPG veya PDF (Max: 5MB)</p>
                    </>
                  )}
                </div>
                <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleUpload} />
              </label>
            </div>

            <button onClick={handleSave} disabled={!file || !ders}
              className="w-full py-4 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center mt-8">
              <FileText className="w-5 h-5 mr-2" />
              Soru Havuzuna Kaydet
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
