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
