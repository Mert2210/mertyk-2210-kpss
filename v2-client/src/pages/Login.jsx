import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Key, Mail, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Mod: 'login', 'register', 'forgot'
  const [mode, setMode] = useState('login');

  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Rol kontrolü (Geçici olarak doğrudan öğrenciye yolluyoruz)
        navigate('/student');
      } else if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Kayıt başarılı! Lütfen giriş yapın.');
        setMode('login');
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        alert('Şifre sıfırlama bağlantısı e-postanıza gönderildi!');
        setMode('login');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-primary-600 p-8 text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Key className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Mertyk KPSS V2</h1>
          <p className="text-primary-100 opacity-90 text-sm">Dijital Soru Kumbarası</p>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
            {mode === 'login' ? 'Giriş Yap' : mode === 'register' ? 'Yeni Hesap Oluştur' : 'Şifremi Unuttum'}
          </h2>
          
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input type="email" placeholder="E-posta Adresi" required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            {mode !== 'forgot' && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="password" placeholder="Şifre" required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                  value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center justify-center">
              {loading ? 'Bekleniyor...' : (mode === 'login' ? 'Giriş Yap' : mode === 'register' ? 'Kayıt Ol' : 'Şifremi Sıfırla')}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-6 space-y-2 text-center text-sm font-medium">
              <button onClick={() => setMode('forgot')} className="text-slate-500 hover:text-primary-600 block w-full">Şifremi unuttum</button>
              <button onClick={() => setMode('register')} className="text-primary-600 hover:text-primary-800 block w-full">Hesabım yok, Kayıt Ol</button>
            </div>
          )}
          {mode !== 'login' && (
            <div className="mt-6 text-center text-sm font-medium">
              <button onClick={() => setMode('login')} className="text-primary-600 hover:text-primary-800 block w-full">Zaten hesabım var, Giriş Yap</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
