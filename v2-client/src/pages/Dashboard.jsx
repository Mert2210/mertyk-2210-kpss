import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, BookOpen, Users } from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [classes, setClasses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Session kontrolü
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setUser(session.user);
        // Örnek: Gerçekte Supabase'den hocanın sınıfları çekilecek
        setClasses([
          { id: 1, name: '12A Sayısal', code: '4X9P2', studentCount: 24 },
          { id: 2, name: 'KPSS Genel Kültür', code: 'KPSS24', studentCount: 150 }
        ]);
      }
    });
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (!user) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-slate-800">Mertyk Panel</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-slate-600 mr-4">{user.email}</span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">Sınıflarım</h1>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Sınıf Oluştur
            </button>
          </div>

          {/* Sınıf Kartları Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <div key={cls.id} className="bg-white overflow-hidden shadow-sm rounded-xl border border-slate-200 hover:shadow-md transition-shadow cursor-pointer">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg leading-6 font-medium text-slate-900">{cls.name}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      {cls.code}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center text-sm text-slate-500">
                    <Users className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" />
                    {cls.studentCount} Öğrenci
                  </div>
                </div>
                <div className="bg-slate-50 px-4 py-4 sm:px-6 border-t border-slate-100">
                  <div className="text-sm">
                    <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                      Sınıfı Yönet <span aria-hidden="true">&rarr;</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
