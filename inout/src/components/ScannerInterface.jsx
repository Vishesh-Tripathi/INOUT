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
      
      // Keep only the latest 10 scans for TV display
      recent = recent.slice(0, 10);
      
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
    <div className="min-h-screen bg-white text-gray-900">
      {/* Hidden Barcode Scanner */}
      <BarcodeScanner onScan={handleScan} />
      
      {/* Top Navigation Header */}
      

      {/* Main Content - Recent Scans Table */}
      <div className="">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-300">
          {/* Table Header */}
          <div className="px-12 py-4 border-b border-gray-300 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Recent Student Activity</h2>
              <p className="text-xl text-gray-600">Latest check-ins and check-outs</p>
            </div>
            <div className="flex items-center space-x-12 ml-16">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{studentsInside.length}</div>
                <div className="text-lg text-gray-700">Inside</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{studentsOutside.length}</div>
                <div className="text-lg text-gray-700">Outside</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-mono font-bold text-gray-900">
                {time}
              </div>
              <div className="text-lg text-gray-600">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
            
          </div>

          {/* Table Content */}
          <div className="p-12">
            {recentScans.length === 0 ? (
              <div className="text-center py-20">
                <svg className="w-24 h-24 text-gray-400 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-2xl text-gray-600 mb-4">No recent activity</p>
                <p className="text-xl text-gray-500">Waiting for student scans...</p>
              </div>
            ) : (
              <div className="overflow-hidden">
                {/* Table Headers */}
                <div className="grid grid-cols-12 gap-8 px-8 py-6 bg-gray-100 rounded-t-xl border-b border-gray-300">
                  <div className="col-span-2 text-lg font-semibold text-gray-800">Photo</div>
                  <div className="col-span-4 text-lg font-semibold text-gray-800">Student Details</div>
                  <div className="col-span-2 text-lg font-semibold text-gray-800">Status</div>
                  <div className="col-span-2 text-lg font-semibold text-gray-800">Time</div>
                  <div className="col-span-2 text-lg font-semibold text-gray-800">Date</div>
                </div>

                {/* Table Rows */}
                <div className="space-y-4 mt-4">
                  {recentScans.map((log, index) => {
                    const studentData = log.student || getStudentByBarcode(log.student_id);
                    
                    return (
                      <div 
                        key={`${log.student_id}-${log.timestamp}-${index}`} 
                        className="grid grid-cols-12 gap-8 px-8 py-8 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all duration-300 hover-scale animate-fadeInUp"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        {/* Student Photo */}
                        <div className="col-span-2 flex items-center">
                          {studentData?.imageUrl ? (
                            <img
                              className="w-20 h-20 rounded-full object-cover ring-4 ring-gray-300"
                              src={studentData.imageUrl}
                              alt={studentData?.name || 'Student'}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center ring-4 ring-gray-300 ${studentData?.imageUrl ? 'hidden' : ''}`}>
                            <span className="text-2xl font-bold text-white">
                              {studentData?.name?.charAt(0).toUpperCase() || log.student_id?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                        </div>

                        {/* Student Details */}
                        <div className="col-span-4 flex flex-col justify-center">
                          <h3 className="text-2xl font-bold text-gray-900 mb-1">
                            {studentData?.name || 'Unknown Student'}
                          </h3>
                          <p className="text-lg text-indigo-600 font-medium">{log.student_id}</p>
                          <p className="text-lg text-gray-600">{studentData?.department || 'N/A'}</p>
                        </div>

                        {/* Status */}
                        <div className="col-span-2 flex items-center">
                          <span className={`inline-flex items-center px-6 py-3 rounded-full text-lg font-bold ${
                            log.action === 'in' 
                              ? 'bg-green-100 text-green-800 ring-2 ring-green-200' 
                              : 'bg-blue-100 text-blue-800 ring-2 ring-blue-200'
                          }`}>
                            <svg className={`w-6 h-6 mr-2 ${log.action === 'in' ? 'text-green-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {log.action === 'in' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              )}
                            </svg>
                            {log.action === 'in' ? 'CHECK IN' : 'CHECK OUT'}
                          </span>
                        </div>

                        {/* Time */}
                        <div className="col-span-2 flex items-center">
                          <div className="text-2xl font-mono font-bold text-gray-900">
                            {formatTime(log.timestamp)}
                          </div>
                        </div>

                        {/* Date */}
                        <div className="col-span-2 flex items-center">
                          <div className="text-lg text-gray-600">
                            {formatDate(log.timestamp)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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