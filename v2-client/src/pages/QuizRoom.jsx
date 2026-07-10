import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ArrowLeft, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function QuizRoom() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState('waiting'); // waiting, question, result
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  useEffect(() => {
    // Gerçekte burada sunucuya bağlanılacak
    const newSocket = io('http://localhost:3000', { transports: ['websocket'], autoConnect: false });
    setSocket(newSocket);
    
    // Simülasyon: 5 saniye sonra soru gelsin
    const timer = setTimeout(() => {
      setStatus('question');
      setActiveQuestion({
        text: 'Aşağıdakilerden hangisi Türkiye\'nin en yüksek dağıdır?',
        options: ['Erciyes Dağı', 'Süphan Dağı', 'Ağrı Dağı', 'Uludağ']
      });
    }, 3000);

    return () => {
      newSocket.close();
      clearTimeout(timer);
    };
  }, []);

  const handleAnswer = (index) => {
    // Telefonlarda titreşim efekti (Native app hissi verir)
    if (navigator.vibrate) navigator.vibrate(50);
    
    setSelectedAnswer(index);
    
    // Simülasyon: 1 saniye sonra cevabı göster
    setTimeout(() => {
      setStatus('result');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Üst Bar */}
      <header className="bg-white shadow-sm px-4 py-4 flex items-center sticky top-0 z-10">
        <button onClick={() => navigate('/student')} className="text-slate-500 p-1 mr-3">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-slate-800 text-lg leading-tight">Canlı Sınıf</h1>
          <p className="text-xs text-primary-600 font-medium">Oda: {code}</p>
        </div>
      </header>

      {/* Bekleme Ekranı */}
      {status === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-6"></div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Sınıftasınız!</h2>
          <p className="text-slate-500">Öğretmeninizin soruyu ekrana yansıtması bekleniyor...</p>
        </div>
      )}

      {/* Soru Ekranı */}
      {status === 'question' && activeQuestion && (
        <div className="flex-1 flex flex-col p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6 flex-1 flex flex-col justify-center text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 leading-snug">
              {activeQuestion.text}
            </h2>
          </div>
          
          <div className="space-y-3 mb-4">
            {activeQuestion.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                className={`w-full p-4 rounded-xl text-left font-medium text-lg border-2 transition-all active:scale-[0.98] ${
                  selectedAnswer === idx 
                    ? 'border-primary-500 bg-primary-50 text-primary-700' 
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="inline-block w-8 text-slate-400">{['A', 'B', 'C', 'D'][idx]}</span>
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sonuç Ekranı */}
      {status === 'result' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-300">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2">Harika!</h2>
          <p className="text-slate-600 mb-8">Cevabınız öğretmene başarıyla iletildi.</p>
          <div className="w-full max-w-xs p-4 bg-white rounded-xl shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Sıradaki soru bekleniyor...</p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-primary-500 w-1/2 h-full rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
