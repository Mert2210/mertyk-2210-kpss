import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

student_lib_jsx = """import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookX, Trophy, Flame } from 'lucide-react';

export default function StudentLibrary() {
  const navigate = useNavigate();
  // Simüle edilmiş veriler
  const [wrongAnswers, setWrongAnswers] = useState([
    {
      id: 1,
      questionText: 'Aşağıdakilerden hangisi Türkiye\\'nin en yüksek dağıdır?',
      studentAnswer: 'Erciyes Dağı',
      correctAnswer: 'Ağrı Dağı',
      date: '10 Temmuz 2026'
    },
    {
      id: 2,
      questionText: 'Cumhuriyet hangi yıl ilan edilmiştir?',
      studentAnswer: '1920',
      correctAnswer: '1923',
      date: '9 Temmuz 2026'
    }
  ]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
      {/* Üst Bar */}
      <header className="bg-white shadow-sm px-4 py-4 flex items-center sticky top-0 z-10">
        <button onClick={() => navigate('/student')} className="text-slate-500 p-1 mr-3 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-slate-800 text-lg">Öğrenci Kütüphanesi</h1>
        </div>
      </header>

      {/* İstatistikler */}
      <div className="p-4 bg-primary-600 text-white shadow-md">
        <div className="flex justify-around items-center">
          <div className="text-center">
            <Trophy className="w-8 h-8 mx-auto mb-1 text-yellow-300" />
            <div className="font-bold text-xl">1,250</div>
            <div className="text-xs text-primary-100">Toplam Puan</div>
          </div>
          <div className="w-px h-12 bg-primary-500"></div>
          <div className="text-center">
            <Flame className="w-8 h-8 mx-auto mb-1 text-orange-400" />
            <div className="font-bold text-xl">12</div>
            <div className="text-xs text-primary-100">Seri Soru</div>
          </div>
          <div className="w-px h-12 bg-primary-500"></div>
          <div className="text-center">
            <BookX className="w-8 h-8 mx-auto mb-1 text-red-300" />
            <div className="font-bold text-xl">{wrongAnswers.length}</div>
            <div className="text-xs text-primary-100">Yanlışım</div>
          </div>
        </div>
      </div>

      {/* Ana İçerik */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full mt-4">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
          <BookX className="w-5 h-5 mr-2 text-red-500" />
          Yanlış Yaptığım Sorular (Arşiv)
        </h2>
        
        {wrongAnswers.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-500">Harika! Hiç yanlış cevabın yok.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {wrongAnswers.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <p className="text-xs text-slate-400 mb-2">{item.date}</p>
                <p className="font-semibold text-slate-800 mb-4 text-sm sm:text-base leading-snug">
                  {item.questionText}
                </p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-start p-3 bg-red-50 border border-red-100 rounded-lg">
                    <span className="font-bold text-red-600 w-24 flex-shrink-0">Senin Cevabın:</span>
                    <span className="text-red-700 line-through">{item.studentAnswer}</span>
                  </div>
                  <div className="flex items-start p-3 bg-green-50 border border-green-100 rounded-lg">
                    <span className="font-bold text-green-600 w-24 flex-shrink-0">Doğru Cevap:</span>
                    <span className="text-green-700 font-medium">{item.correctAnswer}</span>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <button className="text-sm font-semibold text-primary-600 hover:text-primary-700 px-4 py-2 bg-primary-50 rounded-lg">
                    Tekrar Çöz
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
"""
write_file('v2-client/src/pages/StudentLibrary.jsx', student_lib_jsx)

# Modify App.jsx to route to /student/library
app_jsx = """import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClassDetail from './pages/ClassDetail';
import StudentDashboard from './pages/StudentDashboard';
import QuizRoom from './pages/QuizRoom';
import StudentLibrary from './pages/StudentLibrary';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        {/* Öğretmen Rotaları */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/class/:id" element={<ClassDetail />} />
        
        {/* Öğrenci Rotaları */}
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/student/library" element={<StudentLibrary />} />
        <Route path="/room/:code" element={<QuizRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
"""
write_file('v2-client/src/App.jsx', app_jsx)

# We need to update StudentDashboard to link to the library in the bottom navigation
student_dashboard_jsx = """import React, { useState } from 'react';
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
"""
write_file('v2-client/src/pages/StudentDashboard.jsx', student_dashboard_jsx)

print("Student Library added.")
