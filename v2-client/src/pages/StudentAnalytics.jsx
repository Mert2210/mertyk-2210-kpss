import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, TrendingUp, Target } from 'lucide-react';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell } from 'recharts';

export default function StudentAnalytics() {
  const navigate = useNavigate();

  const radarData = [
    { subject: 'Matematik', A: 80, fullMark: 100 },
    { subject: 'Türkçe', A: 90, fullMark: 100 },
    { subject: 'Tarih', A: 60, fullMark: 100 },
    { subject: 'Coğrafya', A: 40, fullMark: 100 },
    { subject: 'Vatandaşlık', A: 85, fullMark: 100 },
  ];

  const pieData = [
    { name: 'Doğru Telafi', value: 350, color: '#10b981' }, // Green
    { name: 'Hâlâ Yanlış', value: 150, color: '#ef4444' }, // Red
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 md:flex-row md:pb-0">
      
      {/* MASAÜSTÜ SIDEBAR (Sol Menü - Sadece PC'de görünür) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0 p-4">
        <div className="text-xl font-bold text-primary-600 mb-8 px-4">Mertyk KPSS</div>
        <nav className="flex-1 space-y-2">
          <button onClick={()=>navigate('/student')} className="flex items-center w-full px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium"><Brain className="w-5 h-5 mr-3"/> Canlı Sınav</button>
          <button onClick={()=>navigate('/student/library')} className="flex items-center w-full px-4 py-3 text-slate-600 hover:bg-slate-50 rounded-xl font-medium"><Target className="w-5 h-5 mr-3"/> Kumbaram</button>
          <button className="flex items-center w-full px-4 py-3 bg-primary-50 text-primary-600 rounded-xl font-bold"><TrendingUp className="w-5 h-5 mr-3"/> İstatistiklerim</button>
        </nav>
      </aside>

      {/* ANA İÇERİK */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm px-4 py-4 flex items-center sticky top-0 z-10 md:hidden">
          <button onClick={() => navigate('/student/library')} className="text-slate-500 p-1 mr-3 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-slate-800 text-lg">Yapay Zeka Karnesi</h1>
        </header>

        <main className="p-4 max-w-4xl mx-auto w-full space-y-6">
          <div className="bg-gradient-to-r from-primary-600 to-indigo-600 p-6 rounded-2xl text-white shadow-lg">
            <h2 className="text-2xl font-bold mb-2">Harika İlerliyorsun! 🚀</h2>
            <p className="text-primary-100 opacity-90">Bu hafta tam 45 eski yanlışını doğruya çevirdin. En zayıf halkan şu an "Coğrafya".</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Zayıf Nokta Analizi (Radar) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4 text-center">Zayıf Nokta Analizi (Radar)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{fill: '#64748b', fontSize: 12}} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar name="Başarı" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Telafi Oranı (Pie) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4 text-center">Yanlışları Telafi Oranı</h3>
              <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                  <span className="text-3xl font-bold text-slate-800">%70</span>
                  <span className="text-xs text-slate-500 font-medium">Başarı</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobil Alt Menü */}
      <nav className="md:hidden bg-white border-t border-slate-200 pb-safe fixed bottom-0 w-full z-10 h-16 px-6">
        <div className="flex justify-between items-center h-full max-w-md mx-auto">
          <button onClick={() => navigate('/student')} className="flex flex-col items-center justify-center w-1/3 text-slate-400">
            <Brain className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Sınav</span>
          </button>
          <button onClick={() => navigate('/student/library')} className="flex flex-col items-center justify-center w-1/3 text-slate-400">
            <Target className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Kumbaram</span>
          </button>
          <button className="flex flex-col items-center justify-center w-1/3 text-primary-600">
            <TrendingUp className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Analiz</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
