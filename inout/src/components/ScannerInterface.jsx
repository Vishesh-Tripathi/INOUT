import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useActivity } from '../context/ActivityContext';
import BarcodeScanner from '../Component/BarcodeScanner';
import apiService from '../services/api';
import toast from 'react-hot-toast';
import logo from '../assets/logo.png';

const ScannerInterface = () => {
  const navigate = useNavigate();
  const { 
    toggleStudentStatus, 
    getStudentsInside, 
    getStudentsOutside, 
    getStudentByBarcode,
    logs,
    students, // Add students to track changes
    broadcastDataChange
  } = useData();
  
  const { addActivity } = useActivity();
  
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



  // Save a new activity using ActivityContext
  const addToRecentActivities = async (student, action) => {
    try {
      await addActivity(student.student_id, student, action);
    } catch (error) {
      console.error('Error saving activity:', error);
    }
  };

  const handleScan = async (scannedData) => {
    console.log('Scanned:', scannedData);
    console.log('Current students:', students);
    console.log('Students length:', students.length);
    
    const student = getStudentByBarcode(scannedData);
    console.log('Found student:', student);
    
    if (!student) {
      toast.error(`Student with ID ${scannedData} not found`);
      return;
    }

    try {
      const result = await toggleStudentStatus(scannedData);
      
      if (result && !result.requiresVerification) {
        const { student: updatedStudent, logEntry } = result;
        
        // Add to recent activities in MongoDB
        await addToRecentActivities(updatedStudent, logEntry.action);
        
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

        // Note: counters will update automatically via useEffect
      } else if (result && result.requiresVerification) {
        // Handle verification required case
        console.log('Student requires verification:', result.error);
        // The toast message is already shown by the DataContext
      }
    } catch (error) {
      console.error('Scan error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      {/* Hidden Barcode Scanner */}
      <BarcodeScanner onScan={handleScan} />
      
      {/* Scanner Interface */}
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          {/* Logo and Header */}
          <div className="mb-8">
            <img 
              src={logo} 
              alt="College Logo" 
              className="w-20 h-16 object-contain mx-auto mb-4"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Student Scanner</h1>
            <p className="text-gray-600">Scan your barcode to check in/out</p>
          </div>

          {/* Scanner Animation */}
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-16 h-16 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h-.01M12 12v4.01M12 12V8.99" />
              </svg>
            </div>
            <div className="mt-4">
              <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 animate-pulse"></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Ready to scan...</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-green-600">{getStudentsInside().length}</div>
              <div className="text-sm text-green-700">Inside</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-blue-600">{getStudentsOutside().length}</div>
              <div className="text-sm text-blue-700">Outside</div>
            </div>
          </div>

          {/* Time */}
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-gray-900 mb-1">
              {time}
            </div>
            <div className="text-sm text-gray-600">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
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