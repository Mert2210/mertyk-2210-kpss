import os
import json

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. Update package.json for PWA and Joyride
with open('v2-client/package.json', 'r', encoding='utf-8') as f:
    client_pkg = json.load(f)

client_pkg['dependencies']['react-joyride'] = '^2.7.2'
client_pkg['devDependencies']['vite-plugin-pwa'] = '^0.19.7'

write_file('v2-client/package.json', json.dumps(client_pkg, indent=2))

# 2. Update vite.config.js for PWA
vite_config = """import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Mertyk KPSS V2',
        short_name: 'Mertyk KPSS',
        description: 'Dijital Soru Kumbarası',
        theme_color: '#4f46e5',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
"""
write_file('v2-client/vite.config.js', vite_config)

# 3. Create ProtectedRoute Component
protected_route_jsx = """import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ProtectedRoute({ children, allowedRole }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        // Gerçekte role tablosundan bakılır, şimdilik mock
        const mockRole = session.user.email?.includes('admin') ? 'admin' 
                        : session.user.email?.includes('teacher') ? 'teacher' 
                        : 'student';
        setRole(mockRole);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && role !== allowedRole) return <Navigate to="/unauthorized" replace />;

  return children;
}
"""
write_file('v2-client/src/components/ProtectedRoute.jsx', protected_route_jsx)

# 4. Modify App.jsx to include ProtectedRoutes and Admin
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
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<div className="p-10 text-center text-red-500 font-bold">Yetkiniz Yok! (Güvenlik Duvarı)</div>} />
        
        {/* YÖNETİCİ (Admin) Paneli */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRole="admin">
            <div className="p-10 font-bold text-2xl">Mertyk KPSS - Kurucu Yönetici Paneli</div>
          </ProtectedRoute>
        } />

        {/* Öğretmen Rotaları */}
        <Route path="/dashboard" element={<ProtectedRoute allowedRole="teacher"><Dashboard /></ProtectedRoute>} />
        <Route path="/class/:id" element={<ProtectedRoute allowedRole="teacher"><ClassDetail /></ProtectedRoute>} />
        <Route path="/teacher/add-question" element={<ProtectedRoute allowedRole="teacher"><TeacherAddQuestion /></ProtectedRoute>} />
        
        {/* Öğrenci Rotaları */}
        <Route path="/student" element={<ProtectedRoute allowedRole="student"><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/library" element={<ProtectedRoute allowedRole="student"><StudentLibrary /></ProtectedRoute>} />
        <Route path="/student/add-question" element={<ProtectedRoute allowedRole="student"><StudentAddQuestion /></ProtectedRoute>} />
        <Route path="/student/analytics" element={<ProtectedRoute allowedRole="student"><StudentAnalytics /></ProtectedRoute>} />
        
        <Route path="/room/:code" element={<ProtectedRoute><QuizRoom /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
"""
write_file('v2-client/src/App.jsx', app_jsx)

print("Packages, PWA config, and Security Routing added.")
