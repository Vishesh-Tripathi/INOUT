import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navigation from "./components/Navigation";
import ScannerInterface from "./components/ScannerInterface";
import AdminDashboard from "./components/AdminDashboard";
import StudentManagement from "./components/StudentManagement";
import StudentRegistration from "./components/StudentRegistration";
import Login from "./components/Login";

// Admin layout component that includes authentication and navigation
const AdminLayout = ({ children }) => {
  return (
    <ProtectedRoute>
      <DataProvider>
        <Navigation />
        {children}
      </DataProvider>
    </ProtectedRoute>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
          
          <Routes>
            {/* Public routes - No DataProvider wrapper */}
            <Route path="/" element={
              <DataProvider>
                <ScannerInterface />
              </DataProvider>
            } />
            <Route path="/login" element={<Login />} />
            <Route path="/register-student" element={<StudentRegistration />} />
            
            {/* Protected admin routes */}
            <Route path="/dashboard" element={
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            } />
            <Route path="/students" element={
              <AdminLayout>
                <StudentManagement />
              </AdminLayout>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
