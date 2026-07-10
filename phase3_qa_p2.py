import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

app_jsx = """import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClassDetail from './pages/ClassDetail';
import TeacherAddQuestion from './pages/TeacherAddQuestion';
import StudentDashboard from './pages/StudentDashboard';
import QuizRoom from './pages/QuizRoom';
import StudentLibrary from './pages/StudentLibrary';
import StudentAddQuestion from './pages/StudentAddQuestion';
import StudentAnalytics from './pages/StudentAnalytics';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        {/* Öğretmen Rotaları */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/class/:id" element={<ClassDetail />} />
        <Route path="/teacher/add-question" element={<TeacherAddQuestion />} />
        
        {/* Öğrenci Rotaları */}
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/student/library" element={<StudentLibrary />} />
        <Route path="/student/add-question" element={<StudentAddQuestion />} />
        <Route path="/student/analytics" element={<StudentAnalytics />} />
        <Route path="/room/:code" element={<QuizRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
"""
write_file('v2-client/src/App.jsx', app_jsx)

student_dashboard_jsx = """import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Play, Brain, Target, TrendingUp, Swords, Plus, Star } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row pb-24 md:pb-0 relative">
      
      {/* MASAÜSTÜ SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0 p-4 z-20">
        <div className="text-xl font-bold text-primary-600 mb-8 px-4 flex items-center justify-between">
          Mertyk KPSS
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-500"><LogOut className="w-5 h-5"/></button>
        </div>
        <nav className="flex-1 space-y-2">
          <button className="flex items-center w-full px-4 py-3 bg-primary-50 text-primary-600 rounded-xl font-bold"><Brain className="w-5 h-5 mr-3"/> Canlı Sınav</button>
          <button onClick={()=>navigate('/student/library')} className="flex items-center w-full px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium"><Target className="w-5 h-5 mr-3"/> Kumbaram</button>
          <button onClick={()=>navigate('/student/analytics')} className="flex items-center w-full px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium"><TrendingUp className="w-5 h-5 mr-3"/> İstatistiklerim</button>
        </nav>
        <div className="mt-auto bg-gradient-to-r from-amber-200 to-yellow-400 rounded-xl p-4 cursor-pointer hover:shadow-lg transition-shadow">
          <div className="flex items-center font-bold text-yellow-900 mb-1"><Star className="w-4 h-4 mr-1"/> Premium</div>
          <p className="text-xs text-yellow-800 font-medium">Sınırsız soru eklemek için yükseltin.</p>
        </div>
      </aside>

      {/* ANA İÇERİK */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b border-slate-200 px-4 py-3 flex justify-between items-center sticky top-0 z-10 md:hidden">
          <div className="flex items-center text-primary-600 font-bold text-lg">Mertyk KPSS</div>
          <button onClick={handleLogout} className="text-slate-500 p-2 hover:bg-slate-100 rounded-full transition-colors"><LogOut className="w-5 h-5" /></button>
        </header>

        <main className="flex-1 flex flex-col justify-center px-6 py-6 max-w-lg mx-auto w-full space-y-6">
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
      </div>

      {/* FAB - Soru Ekle */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
        <button onClick={() => navigate('/student/add-question')}
          className="w-16 h-16 bg-primary-600 hover:bg-primary-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-primary-500/40 transition-transform active:scale-95 border-4 border-slate-50">
          <Plus className="w-8 h-8" />
        </button>
      </div>

      {/* Mobil Alt Menü */}
      <nav className="md:hidden bg-white border-t border-slate-200 pb-safe fixed bottom-0 w-full z-10 h-16 px-6">
        <div className="flex justify-between items-center h-full max-w-md mx-auto">
          <button className="flex flex-col items-center justify-center w-1/3 text-primary-600">
            <Brain className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Sınav</span>
          </button>
          <button onClick={() => navigate('/student/library')} className="flex flex-col items-center justify-center w-1/3 text-slate-400 hover:text-slate-600">
            <Target className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Kumbaram</span>
          </button>
          <button onClick={() => navigate('/student/analytics')} className="flex flex-col items-center justify-center w-1/3 text-slate-400 hover:text-slate-600">
            <TrendingUp className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Analiz</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
"""
write_file('v2-client/src/pages/StudentDashboard.jsx', student_dashboard_jsx)

student_lib_jsx = """import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookX, Trophy, Flame, Play, Plus, Target, Brain, TrendingUp, Download, Loader2 } from 'lucide-react';

export default function StudentLibrary() {
  const navigate = useNavigate();
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [wrongAnswers, setWrongAnswers] = useState([
    {
      id: 1,
      questionText: 'Milli Mücadele döneminde "Ordular ilk hedefiniz Akdeniz\'dir!" emri nerede verilmiştir?',
      studentAnswer: 'Sakarya Meydan Muharebesi',
      correctAnswer: 'Büyük Taarruz',
      date: '10 Temmuz 2026',
      videoLink: 'https://youtube.com/watch?v=ornek'
    }
  ]);

  // Sonsuz Kaydırma Simülasyonu
  const handleScroll = (e) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop === e.target.clientHeight;
    if (bottom && !loadingMore) {
      setLoadingMore(true);
      setTimeout(() => {
        setWrongAnswers(prev => [...prev, { ...prev[0], id: Date.now() }]);
        setLoadingMore(false);
      }, 1500);
    }
  };

  const handleExportPDF = () => {
    alert('PDF Oluşturuluyor... Seçili sorularınız baskıya hazır A4 formatına dönüştürülecektir.');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 md:flex-row md:pb-0" onScroll={handleScroll} style={{overflowY: 'auto'}}>
      
      {/* MASAÜSTÜ SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0 p-4 z-20">
        <div className="text-xl font-bold text-primary-600 mb-8 px-4">Mertyk KPSS</div>
        <nav className="flex-1 space-y-2">
          <button onClick={()=>navigate('/student')} className="flex items-center w-full px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium"><Brain className="w-5 h-5 mr-3"/> Canlı Sınav</button>
          <button className="flex items-center w-full px-4 py-3 bg-primary-50 text-primary-600 rounded-xl font-bold"><Target className="w-5 h-5 mr-3"/> Kumbaram</button>
          <button onClick={()=>navigate('/student/analytics')} className="flex items-center w-full px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium"><TrendingUp className="w-5 h-5 mr-3"/> İstatistiklerim</button>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm px-4 py-4 flex items-center sticky top-0 z-10 md:hidden">
          <button onClick={() => navigate('/student')} className="text-slate-500 p-1 mr-3 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-slate-800 text-lg">Yanlış Kumbaram</h1>
          </div>
        </header>

        <div className="p-4 bg-primary-600 text-white shadow-md">
          <div className="flex justify-around items-center max-w-4xl mx-auto">
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
              <div className="font-bold text-xl">{wrongAnswers.length} / 50</div>
              <div className="text-xs text-primary-100">Kota Durumu</div>
            </div>
          </div>
        </div>

        <main className="flex-1 p-4 max-w-2xl mx-auto w-full mt-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center">
              <BookX className="w-5 h-5 mr-2 text-red-500" />
              Tekrar Edilecek Sorular
            </h2>
            <button onClick={handleExportPDF} className="flex items-center px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700 shadow-sm transition-colors">
              <Download className="w-4 h-4 mr-2" /> PDF İndir
            </button>
          </div>
          
          <div className="space-y-4">
            {wrongAnswers.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <p className="text-xs text-slate-400 mb-2">{item.date}</p>
                <p className="font-semibold text-slate-800 mb-4 text-sm sm:text-base leading-snug">
                  {item.questionText}
                </p>
                
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-start p-3 bg-red-50 border border-red-100 rounded-lg">
                    <span className="font-bold text-red-600 w-24 flex-shrink-0">Senin Cevabın:</span>
                    <span className="text-red-700 line-through">{item.studentAnswer}</span>
                  </div>
                  <div className="flex items-start p-3 bg-green-50 border border-green-100 rounded-lg">
                    <span className="font-bold text-green-600 w-24 flex-shrink-0">Doğru Cevap:</span>
                    <span className="text-green-700 font-medium">{item.correctAnswer}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-4">
                  {item.videoLink ? (
                    <a href={item.videoLink} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-semibold text-red-600 hover:text-red-700">
                      <Play className="w-4 h-4 mr-1" />
                      Çözüm Videosu
                    </a>
                  ) : (
                    <span></span>
                  )}
                  <button className="text-sm font-semibold text-primary-600 px-4 py-2 bg-primary-50 rounded-lg">
                    Tekrar Çöz
                  </button>
                </div>
              </div>
            ))}
          </div>

          {loadingMore && (
            <div className="flex justify-center p-4 text-primary-500">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
        </main>
      </div>

      {/* FAB - Soru Ekle */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 md:hidden">
        <button onClick={() => navigate('/student/add-question')}
          className="w-16 h-16 bg-primary-600 hover:bg-primary-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-primary-500/40 active:scale-95 border-4 border-slate-50">
          <Plus className="w-8 h-8" />
        </button>
      </div>

      {/* Mobil Alt Menü */}
      <nav className="md:hidden bg-white border-t border-slate-200 pb-safe fixed bottom-0 w-full z-10 h-16 px-6">
        <div className="flex justify-between items-center h-full max-w-md mx-auto">
          <button onClick={() => navigate('/student')} className="flex flex-col items-center justify-center w-1/3 text-slate-400">
            <Brain className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Sınav</span>
          </button>
          <button className="flex flex-col items-center justify-center w-1/3 text-primary-600">
            <Target className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Kumbaram</span>
          </button>
          <button onClick={() => navigate('/student/analytics')} className="flex flex-col items-center justify-center w-1/3 text-slate-400">
            <TrendingUp className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Analiz</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
"""
write_file('v2-client/src/pages/StudentLibrary.jsx', student_lib_jsx)

print("UI modifications for Phase 3 QA complete.")
