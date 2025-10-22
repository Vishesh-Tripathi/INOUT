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

// Protected content component that includes DataProvider
const ProtectedContent = () => {
  return (
    <DataProvider>
      <Navigation />
      <Routes>
        <Route path="/" element={<ScannerInterface />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/students" element={<StudentManagement />} />
      </Routes>
    </DataProvider>
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
          
          <ProtectedRoute>
            <ProtectedContent />
          </ProtectedRoute>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
