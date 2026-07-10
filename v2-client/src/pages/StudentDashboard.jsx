import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Play, User, Library, Plus, Swords } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function StudentDashboard() {
  const [classCode, setClassCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (classCode.trim().length < 3) return;
    setLoading(true);
    setTimeout(() => {
      navigate(`/room/${classCode.toUpperCase()}`);
    }, 800);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      <header className="bg-white shadow-sm border-b border-slate-200 px-4 py-3 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center text-primary-600 font-bold text-lg">Mertyk KPSS</div>
        <button onClick={handleLogout} className="text-slate-500 p-2 hover:bg-slate-100 rounded-full transition-colors"><LogOut className="w-5 h-5" /></button>
      </header>

      <main className="flex-1 flex flex-col justify-center px-6 py-6 max-w-md mx-auto w-full pb-24 space-y-6">
        
        {/* Canlı Sınav Odası */}
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-400 to-primary-600"></div>
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 text-primary-600 ml-1" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Canlı Derse Katıl</h2>
          <p className="text-slate-500 text-sm mb-6">Öğretmeninizin verdiği oda kodunu girerek canlı sınava katılın.</p>
          <form onSubmit={handleJoinRoom} className="space-y-4">
            <input type="text" placeholder="Oda Kodu (Örn: 4X9P2)" required
              className="w-full text-center text-2xl font-bold tracking-widest px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-primary-500 uppercase placeholder:text-slate-400 placeholder:text-lg"
              value={classCode} onChange={(e) => setClassCode(e.target.value)} />
            <button type="submit" disabled={loading || classCode.trim().length < 3}
              className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98]">
              {loading ? 'Bağlanıyor...' : 'Sınıfa Gir'}
            </button>
          </form>
        </div>

        {/* Düello Modu (Okey Masası) Kartı */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl shadow-lg text-white text-center relative overflow-hidden cursor-pointer hover:shadow-xl transition-shadow active:scale-[0.98]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Swords className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-1">Meydan Okuma</h2>
          <p className="text-indigo-100 text-sm mb-4">Arkadaşlarının havuzundaki yanlış sorularla kapış! (Çok Yakında)</p>
          <button className="px-6 py-2 bg-white text-indigo-600 font-bold rounded-full text-sm shadow-sm hover:bg-indigo-50">
            Masa Kur
          </button>
        </div>

      </main>

      {/* FAB (Floating Action Button) - Soru Ekle */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
        <button onClick={() => navigate('/student/add-question')}
          className="w-16 h-16 bg-primary-600 hover:bg-primary-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-primary-500/40 transition-transform active:scale-95 border-4 border-slate-50">
          <Plus className="w-8 h-8" />
        </button>
      </div>

      {/* Mobil Alt Menü */}
      <nav className="bg-white border-t border-slate-200 pb-safe fixed bottom-0 w-full z-10 h-16 px-6">
        <div className="flex justify-between items-center h-full max-w-md mx-auto">
          <button className="flex flex-col items-center justify-center w-1/3 text-primary-600">
            <Play className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Sınav</span>
          </button>
          <div className="w-1/3"></div>
          <button onClick={() => navigate('/student/library')} className="flex flex-col items-center justify-center w-1/3 text-slate-400 hover:text-slate-600 transition-colors">
            <Library className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Kumbaram</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
