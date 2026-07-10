import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClassDetail from './pages/ClassDetail';
import StudentDashboard from './pages/StudentDashboard';
import QuizRoom from './pages/QuizRoom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        {/* Öğretmen Rotaları */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/class/:id" element={<ClassDetail />} />
        
        {/* Öğrenci Rotaları */}
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/room/:code" element={<QuizRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
