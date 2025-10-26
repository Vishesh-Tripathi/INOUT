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
    getStudentByBarcode,
    logs 
  } = useData();
  
  const [recentScans, setRecentScans] = useState([]);
  const [studentsInside, setStudentsInside] = useState([]);
  const [studentsOutside, setStudentsOutside] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupData, setPopupData] = useState(null);
  const [time, setTime] = useState(
    new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
  );
   useEffect(() => {
    const interval = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })
      );
    }, 1000);

    return () => clearInterval(interval); // cleanup
  }, []);

  useEffect(() => {
    // Update counters
    setStudentsInside(getStudentsInside());
    setStudentsOutside(getStudentsOutside());
    
    // Load recent scans from dedicated localStorage key
    loadRecentScans();
  }, [getStudentsInside, getStudentsOutside]);

  // Load recent scans from localStorage
  const loadRecentScans = () => {
    try {
      const storedRecentScans = localStorage.getItem('recentScans');
      if (storedRecentScans) {
        const parsed = JSON.parse(storedRecentScans);
        setRecentScans(parsed);
      }
    } catch (error) {
      console.error('Error loading recent scans:', error);
    }
  };

  // Save a new scan to recent scans
  const addToRecentScans = (student, action) => {
    const newScan = {
      student_id: student.student_id,
      student: student,
      action: action,
      timestamp: new Date().toISOString()
    };

    try {
      // Get existing recent scans
      const storedRecentScans = localStorage.getItem('recentScans');
      let recent = storedRecentScans ? JSON.parse(storedRecentScans) : [];
      
      // Add new scan to the beginning
      recent.unshift(newScan);
      
      // Keep only the latest 5 scans
      recent = recent.slice(0, 5);
      
      // Save back to localStorage
      localStorage.setItem('recentScans', JSON.stringify(recent));
      
      // Update state
      setRecentScans(recent);
    } catch (error) {
      console.error('Error saving recent scan:', error);
    }
  };

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
        
        // Add to recent scans
        addToRecentScans(updatedStudent, logEntry.action);
        
        // Show popup with student details
        setPopupData({
          student: updatedStudent,
          action: logEntry.action,
          timestamp: logEntry.timestamp
        });
        setShowPopup(true);

        // Auto-hide popup after 2 seconds
        setTimeout(() => {
          setShowPopup(false);
          setPopupData(null);
        }, 500);

        // Update counters and recent scans
        setStudentsInside(getStudentsInside());
        setStudentsOutside(getStudentsOutside());
      }
    } catch (error) {
      console.error('Scan error:', error);
    }
  };
  console.log(studentsInside)

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Hidden Barcode Scanner */}
      <BarcodeScanner onScan={handleScan} />
      
      {/* Left Sidebar - Recent Scans */}
      <div className="w-80 bg-white shadow-sm border-r border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Recent Scans</h2>
          <p className="text-sm text-gray-500">Last 5 student activities</p>
        </div>

        <div className="space-y-4">
          {recentScans.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm text-gray-500">No recent scans</p>
            </div>
          ) : (
            recentScans.map((log, index) => {
              // Get student data - either from log.student or find by student_id
              const studentData = log.student || getStudentByBarcode(log.student_id);
              
              return (
                <div key={`${log.student_id}-${log.timestamp}-${index}`} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  {/* Student Photo/Avatar */}
                  <div className="flex-shrink-0">
                    {studentData?.imageUrl ? (
                      <img
                        className="w-10 h-10 rounded-full object-cover"
                        src={studentData.imageUrl}
                        alt={studentData?.name || 'Student'}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center ${studentData?.imageUrl ? 'hidden' : ''}`}>
                      <span className="text-sm font-medium text-white">
                        {studentData?.name?.charAt(0).toUpperCase() || log.student_id?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                  </div>

                  {/* Student Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {studentData?.name || 'Unknown Student'}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">{log.student_id}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        log.action === 'in' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {log.action === 'in' ? 'IN' : 'OUT'}
                      </span>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="text-xs text-gray-400">
                    {formatTime(log.timestamp)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student In-Out System</h1>
              <p className="text-sm text-gray-500 mt-1">
                {time}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-mono font-bold text-gray-900">
                  {new Date().toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </div>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Admin
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Students Inside</p>
                  <p className="text-3xl font-bold text-gray-900">{studentsInside.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Students Outside</p>
                  <p className="text-3xl font-bold text-gray-900">{studentsOutside.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Scanner Area */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V4a1 1 0 00-1-1H5a1 1 0 00-1 1v3a1 1 0 001 1zm12 0h2a1 1 0 001-1V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v3a1 1 0 001 1zM5 20h2a1 1 0 001-1v-3a1 1 0 00-1-1H5a1 1 0 00-1 1v3a1 1 0 001 1z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Scan</h2>
              <p className="text-gray-600 mb-4">
                Point your barcode scanner at a student ID to track entry and exit
              </p>
              <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                System Active
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Student Details Popup */}
      {showPopup && popupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"></div>
          
          {/* Popup Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-md w-full transform animate-in slide-in-from-bottom-4 duration-300">
            <div className="text-center">
              {/* Student Photo/Avatar */}
              <div className="mb-4">
                {popupData.student.imageUrl ? (
                  <img
                    className="w-20 h-20 rounded-full object-cover mx-auto"
                    src={popupData.student.imageUrl}
                    alt={popupData.student.name}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`w-20 h-20 rounded-full bg-indigo-500 flex items-center justify-center mx-auto ${popupData.student.imageUrl ? 'hidden' : ''}`}>
                  <span className="text-2xl font-bold text-white">
                    {popupData.student.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Student Details */}
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{popupData.student.name}</h3>
              <p className="text-gray-600 mb-1">{popupData.student.student_id}</p>
              <p className="text-gray-500 mb-4">{popupData.student.department}</p>
              
              {/* Action Status */}
              <div className={`inline-flex items-center px-6 py-3 rounded-full text-lg font-semibold ${
                popupData.action === 'in'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                <svg className={`w-6 h-6 mr-2 ${popupData.action === 'in' ? 'text-green-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {popupData.action === 'in' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  )}
                </svg>
                {popupData.action === 'in' ? 'Checked In' : 'Checked Out'}
              </div>

              <p className="text-sm text-gray-500 mt-4">
                {new Date(popupData.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScannerInterface;