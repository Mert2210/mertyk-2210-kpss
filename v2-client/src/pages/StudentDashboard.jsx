import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Play, User, Library } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white shadow-sm border-b border-slate-200 px-4 py-3 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center text-primary-600 font-bold text-lg">
          Mertyk KPSS
        </div>
        <button onClick={handleLogout} className="text-slate-500 p-2 hover:bg-slate-100 rounded-full transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 flex flex-col justify-center px-6 py-12 max-w-md mx-auto w-full">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 text-center">
          <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Play className="w-10 h-10 text-primary-600 ml-1" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Derse Katıl</h2>
          <p className="text-slate-500 text-sm mb-8">
            Öğretmeninizin verdiği oda kodunu girerek canlı sınava katılın.
          </p>
          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Oda Kodu (Örn: 4X9P2)"
                required
                className="w-full text-center text-2xl font-bold tracking-widest px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all uppercase placeholder:text-slate-400 placeholder:text-lg placeholder:font-normal placeholder:tracking-normal"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading || classCode.trim().length < 3}
              className="w-full py-4 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              {loading ? 'Bağlanıyor...' : 'Odasına Gir'}
            </button>
          </form>
        </div>
      </main>

      {/* Mobil Alt Menü */}
      <nav className="bg-white border-t border-slate-200 pb-safe sticky bottom-0">
        <div className="flex justify-around items-center h-16">
          <button className="flex flex-col items-center justify-center w-full h-full text-primary-600">
            <Play className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Sınav</span>
          </button>
          <button onClick={() => navigate('/student/library')} className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-slate-600 transition-colors">
            <Library className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Kütüphanem</span>
          </button>
          <button className="flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-slate-600 transition-colors">
            <User className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Profil</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
