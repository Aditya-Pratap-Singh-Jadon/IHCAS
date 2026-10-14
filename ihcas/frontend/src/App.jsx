import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Landing from './pages/Landing';
import StudentDashboard from './pages/StudentDashboard';
import StudentCounselling from './pages/StudentCounselling';
import StudentLayout from './components/StudentLayout';
import WardenLayout from './components/WardenLayout';
import AdminLayout from './components/AdminLayout';
import WardenDashboard from './pages/WardenDashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Landing />} />
          
          <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
            <Route element={<StudentLayout />}>
              <Route path="/dashboard/student" element={<StudentDashboard />} />
              <Route path="/counselling" element={<StudentCounselling />} />
            </Route>
          </Route>
          
          <Route element={<ProtectedRoute allowedRoles={['WARDEN']} />}>
            <Route element={<WardenLayout />}>
              <Route path="/dashboard/warden" element={<WardenDashboard />} />
            </Route>
          </Route>
          
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/dashboard/admin" element={<AdminDashboard />} />
            </Route>
          </Route>
          
          <Route path="/unauthorized" element={<div>Unauthorized Access</div>} />
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
