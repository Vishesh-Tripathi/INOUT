import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { ActivityProvider } from "./context/ActivityContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navigation from "./components/Navigation";
import ScannerInterface from "./components/ScannerInterface";
import DetailsView from "./components/DetailsView";
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
      <ActivityProvider>
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
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register-student" element={<StudentRegistration />} />
              
              {/* Protected landing page */}
              <Route path="/" element={
                <ProtectedRoute>
                  <DataProvider>
                    <Navigation />
                    <ScannerInterface />
                  </DataProvider>
                </ProtectedRoute>
              } />
              
              {/* Protected details page for big screen display */}
              <Route path="/details" element={
                <ProtectedRoute>
                  <DataProvider>
                    <DetailsView />
                  </DataProvider>
                </ProtectedRoute>
              } />
              
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
      </ActivityProvider>
    </AuthProvider>
  );
}

export default App;
