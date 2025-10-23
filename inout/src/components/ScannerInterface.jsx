import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import BarcodeScanner from '../Component/BarcodeScanner';
import toast from 'react-hot-toast';

const ScannerInterface = () => {
  const navigate = useNavigate();
  const { 
    toggleStudentStatus, 
    getStudentsInside, 
    getStudentsOutside, 
    getStudentByBarcode 
  } = useData();
  
  const [lastScan, setLastScan] = useState(null);
  const [studentsInside, setStudentsInside] = useState([]);
  const [studentsOutside, setStudentsOutside] = useState([]);

  useEffect(() => {
    // Update counters
    setStudentsInside(getStudentsInside());
    setStudentsOutside(getStudentsOutside());
  }, [getStudentsInside, getStudentsOutside]);

  const handleScan = async (scannedData) => {
    console.log('Scanned:', scannedData);
    
    const student = getStudentByBarcode(scannedData);
    
    if (!student) {
      toast.error(`Student with ID ${scannedData} not found`);
      return;
    }

    try {
      const result = await toggleStudentStatus(scannedData);
      
      if (result) {
        const { student: updatedStudent, logEntry } = result;
        setLastScan({
          student: updatedStudent,
          action: logEntry.action,
          timestamp: logEntry.timestamp
        });

        // Update counters
        setStudentsInside(getStudentsInside());
        setStudentsOutside(getStudentsOutside());
      }
    } catch (error) {
      console.error('Scan error:', error);
      // Error toast is handled in DataContext
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Hidden Barcode Scanner */}
      <BarcodeScanner onScan={handleScan} />
      
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Student In-Out System
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            {formatDate(new Date())}
          </p>
          <div className="text-2xl font-semibold text-indigo-600">
            {new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Students Inside</h3>
            <div className="text-4xl font-bold text-green-600 mb-2">
              {studentsInside.length}
            </div>
            <p className="text-sm text-gray-500">Currently on campus</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Students Outside</h3>
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {studentsOutside.length}
            </div>
            <p className="text-sm text-gray-500">Currently off campus</p>
          </div>
        </div>

        {/* Scanner Area */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="text-center">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V4a1 1 0 00-1-1H5a1 1 0 00-1 1v3a1 1 0 001 1zm12 0h2a1 1 0 001-1V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v3a1 1 0 001 1zM5 20h2a1 1 0 001-1v-3a1 1 0 00-1-1H5a1 1 0 00-1 1v3a1 1 0 001 1z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Scan</h2>
            <p className="text-lg text-gray-600 mb-2">
              Point your barcode scanner at a student ID barcode
            </p>
            <p className="text-sm text-gray-500">
              The system will automatically track student entry and exit
            </p>
          </div>
        </div>

        {/* Last Scan Result */}
        {lastScan && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Last Scan</h3>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-6">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  lastScan.action === 'in' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  {lastScan.action === 'in' ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  )}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    {lastScan.student.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    ID: {lastScan.student.student_id} • {lastScan.student.department}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  lastScan.action === 'in'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {lastScan.action === 'in' ? 'Checked In' : 'Checked Out'}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {formatTime(lastScan.timestamp)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Admin Login Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg transition-colors shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Admin Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScannerInterface;