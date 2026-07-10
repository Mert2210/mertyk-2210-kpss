import React from 'react';
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
