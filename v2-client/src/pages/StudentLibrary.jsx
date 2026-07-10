import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookX, Trophy, Flame, Play, Plus, Library } from 'lucide-react';

export default function StudentLibrary() {
  const navigate = useNavigate();
  const [wrongAnswers, setWrongAnswers] = useState([
    {
      id: 1,
      questionText: 'Milli Mücadele döneminde "Ordular ilk hedefiniz Akdeniz'dir!" emri nerede verilmiştir?',
      studentAnswer: 'Sakarya Meydan Muharebesi',
      correctAnswer: 'Büyük Taarruz',
      date: '10 Temmuz 2026',
      videoLink: 'https://youtube.com/watch?v=ornek'
    }
  ]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 relative">
      <header className="bg-white shadow-sm px-4 py-4 flex items-center sticky top-0 z-10">
        <button onClick={() => navigate('/student')} className="text-slate-500 p-1 mr-3 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-slate-800 text-lg">Yanlış Kumbaram</h1>
        </div>
      </header>

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
            <div className="text-xs text-primary-100">Kumbaramda</div>
          </div>
        </div>
      </div>

      <main className="flex-1 p-4 max-w-lg mx-auto w-full mt-4">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
          <BookX className="w-5 h-5 mr-2 text-red-500" />
          Tekrar Edilecek Sorular
        </h2>
        
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
      </main>

      {/* FAB - Soru Ekle */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
        <button onClick={() => navigate('/student/add-question')}
          className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-primary-500/40 active:scale-95 border-4 border-slate-50">
          <Plus className="w-8 h-8" />
        </button>
      </div>

      {/* Mobil Alt Menü */}
      <nav className="bg-white border-t border-slate-200 pb-safe fixed bottom-0 w-full z-10 h-16 px-6">
        <div className="flex justify-between items-center h-full max-w-md mx-auto">
          <button onClick={() => navigate('/student')} className="flex flex-col items-center justify-center w-1/3 text-slate-400">
            <Play className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Sınav</span>
          </button>
          <div className="w-1/3"></div>
          <button className="flex flex-col items-center justify-center w-1/3 text-primary-600">
            <Library className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Kumbaram</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
