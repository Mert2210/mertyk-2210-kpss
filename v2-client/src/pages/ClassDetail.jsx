import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Send, Trash2, BookOpen } from 'lucide-react';
import { io } from 'socket.io-client';

export default function ClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [students, setStudents] = useState([]);
  const [className, setClassName] = useState('12A Sayısal');

  useEffect(() => {
    // Socket.io bağlantısı kurulacak (Backend adresi girilecek)
    const newSocket = io('http://localhost:3000', {
      transports: ['websocket'],
      autoConnect: false // Şimdilik manuel bağlanacak
    });
    setSocket(newSocket);

    // Test Öğrencileri
    setStudents([
      { id: 1, name: 'Ahmet Yılmaz', score: 120 },
      { id: 2, name: 'Ayşe Kaya', score: 95 },
      { id: 3, name: 'Mehmet Demir', score: 200 }
    ]);

    return () => newSocket.close();
  }, [id]);

  const handleSendQuestion = () => {
    alert('Soru kütüphanesi açılacak ve canlı soru gönderilecek!');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center cursor-pointer" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-6 w-6 text-slate-500 hover:text-slate-800 transition-colors" />
              <span className="ml-4 text-xl font-bold text-slate-800">{className}</span>
            </div>
            <div className="flex items-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                Oda Kodu: 4X9P2
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Sol Panel: Sınıf Yönetimi & Öğrenciler */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-primary-500" />
                  Öğrenciler ({students.length})
                </h2>
              </div>
              <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {students.map(student => (
                  <li key={student.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">
                    <span className="font-medium text-slate-700">{student.name}</span>
                    <span className="text-sm font-bold text-primary-600">{student.score} Puan</span>
                  </li>
                ))}
              </ul>
              
              <div className="mt-6 pt-4 border-t border-slate-100">
                <button className="w-full flex items-center justify-center px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sınıfı Sil
                </button>
              </div>
            </div>
          </div>

          {/* Sağ Panel: Kütüphane ve Soru Gönderimi */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mb-6">
                <BookOpen className="h-10 w-10 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Canlı Soru Gönder</h2>
              <p className="text-slate-500 mb-8 max-w-md">
                Kütüphanenizden bir soru seçerek sınıftaki tüm öğrencilerin ekranına anında düşmesini sağlayın.
              </p>
              <button 
                onClick={handleSendQuestion}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700 transition-colors"
              >
                <Send className="h-5 w-5 mr-2" />
                Soru Kütüphanesini Aç
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
