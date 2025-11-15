import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import apiService from '../services/api';

const AdminDashboard = () => {
  const { students, logs, getStudentsInside, getStudentsOutside, clearAllData, loadStudents } = useData();
  const { logout, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [dateFilter, setDateFilter] = useState('');
  const [studentIdFilter, setStudentIdFilter] = useState('');
  
  // State for username and password update
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // State for verification tab
  const [pendingStudents, setPendingStudents] = useState([]);
  const [verificationStats, setVerificationStats] = useState({
    pending: 0,
    verified: 0,
    rejected: 0,
    total: 0
  });
  const [loadingVerification, setLoadingVerification] = useState(false);

  // Load verification data when verification tab is active
  const loadVerificationData = async () => {
    if (activeTab === 'verification') {
      setLoadingVerification(true);
      try {
        const [pendingResponse, statsResponse] = await Promise.all([
          apiService.getPendingVerifications(),
          apiService.getVerificationStats()
        ]);
        
        if (pendingResponse.success) {
          setPendingStudents(pendingResponse.data.students);
        }
        
        if (statsResponse.success) {
          setVerificationStats(statsResponse.data);
        }
      } catch (error) {
        console.error('Error loading verification data:', error);
        toast.error('Failed to load verification data');
      } finally {
        setLoadingVerification(false);
      }
    }
  };

  const studentsInside = getStudentsInside();
  const studentsOutside = getStudentsOutside();

  // Load verification data when tab changes
  React.useEffect(() => {
    loadVerificationData();
  }, [activeTab]);

  const handleApproveStudent = async (studentId, studentName) => {
    try {
      const response = await apiService.approveStudent(studentId);
      if (response.success) {
        toast.success(`Student ${studentName} approved successfully`);
        // Reload verification data
        await loadVerificationData();
        // Reload students data to update the main list
        await loadStudents();
      }
    } catch (error) {
      console.error('Error approving student:', error);
      toast.error('Failed to approve student: ' + error.message);
    }
  };

  const handleRejectStudent = async (studentId, studentName) => {
    const rejectionReason = prompt(`Please enter reason for rejecting ${studentName}:`);
    if (!rejectionReason || rejectionReason.trim() === '') {
      toast.error('Rejection reason is required');
      return;
    }

    try {
      const response = await apiService.rejectStudent(studentId, rejectionReason.trim());
      if (response.success) {
        toast.success(`Student ${studentName} registration rejected`);
        // Reload verification data
        await loadVerificationData();
      }
    } catch (error) {
      console.error('Error rejecting student:', error);
      toast.error('Failed to reject student: ' + error.message);
    }
  };

  // Filter logs based on date and student ID
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesDate = !dateFilter || 
        new Date(log.timestamp).toDateString() === new Date(dateFilter).toDateString();
      const matchesStudentId = !studentIdFilter || 
        log.studentId.toLowerCase().includes(studentIdFilter.toLowerCase());
      return matchesDate && matchesStudentId;
    });
  }, [logs, dateFilter, studentIdFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayLogs = logs.filter(log => 
      new Date(log.timestamp).toDateString() === today
    );
    
    return {
      totalStudents: students.length,
      studentsInside: studentsInside.length,
      studentsOutside: studentsOutside.length,
      totalLogsToday: todayLogs.length,
      checkInsToday: todayLogs.filter(log => log.action === 'in').length,
      checkOutsToday: todayLogs.filter(log => log.action === 'out').length
    };
  }, [students, studentsInside, studentsOutside, logs]);

  const exportToCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('No data to export');
      return;
    }

    const csvData = filteredLogs.map(log => ({
      'Student ID': log.student_id,
      'Student Name': log.student_name,
      'Department': log.department,
      'Action': log.action.toUpperCase(),
      'Timestamp': new Date(log.timestamp).toLocaleString(),
      'Date': new Date(log.timestamp).toLocaleDateString(),
      'Time': new Date(log.timestamp).toLocaleTimeString()
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `student_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('CSV exported successfully');
  };

  const exportToExcel = () => {
    if (filteredLogs.length === 0) {
      toast.error('No data to export');
      return;
    }

    const excelData = filteredLogs.map(log => ({
      'Student ID': log.studentId,
      'Student Name': log.studentName,
      'Department': log.department,
      'Action': log.action.toUpperCase(),
      'Timestamp': new Date(log.timestamp).toLocaleString(),
      'Date': new Date(log.timestamp).toLocaleDateString(),
      'Time': new Date(log.timestamp).toLocaleTimeString()
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student Logs');
    XLSX.writeFile(wb, `student_logs_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success('Excel file exported successfully');
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      clearAllData();
      toast.success('All data cleared successfully');
    }
  };

  const handleClearActivities = async () => {
    if (window.confirm('Are you sure you want to clear all recent activities? This action cannot be undone.')) {
      try {
        const response = await apiService.clearAllActivities();
        if (response.success) {
          toast.success(`Cleared ${response.deletedCount} activity records`);
        }
      } catch (error) {
        console.error('Error clearing activities:', error);
        toast.error('Failed to clear activities');
      }
    }
  };

  const handleDailyCleanup = async () => {
    try {
      const response = await apiService.clearAllActivities();
      if (response.success) {
        toast.success(`Daily cleanup completed. Deleted ${response.deletedCount} records`);
      }
    } catch (error) {
      console.error('Error running daily cleanup:', error);
      toast.error('Failed to run daily cleanup');
    }
  };

  const handleUpdateCredentials = async (e) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      // Validation
      if (!currentPassword) {
        toast.error('Please enter your current password');
        return;
      }

      if (newPassword && newPassword !== confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }

      if (newPassword && newPassword.length < 6) {
        toast.error('New password must be at least 6 characters long');
        return;
      }

      // Only proceed if there's something to update
      if (!newUsername && !newPassword) {
        toast.error('Please provide a new username or password to update');
        return;
      }

      // Call the updateProfile method from AuthContext
      const result = await updateProfile(
        currentPassword,
        newUsername || undefined,
        newPassword || undefined
      );

      if (result.success) {
        // Clear form
        setCurrentPassword('');
        setNewUsername('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error('Error updating credentials:', error);
      toast.error('Failed to update credentials');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };
  console.log(students)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      {/* <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header> */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'students', name: 'Students' },
              { id: 'verification', name: 'Verification', count: verificationStats.pending || 0 },
              { id: 'logs', name: 'Activity Logs' },
              { id: 'settings', name: 'Settings' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  {tab.id === 'verification' && (
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {tab.name}
                  {tab.count > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {tab.count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Students</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalStudents}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Students Inside</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.studentsInside}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Students Outside</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.studentsOutside}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Today's Activity</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalLogsToday}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Check-ins Today</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.checkInsToday}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Check-outs Today</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.checkOutsToday}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
              </div>
              <div className="p-6">
                {logs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        log.action === 'in' ? 'bg-green-400' : 'bg-red-400'
                      }`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{log.student_name}</p>
                        <p className="text-xs text-gray-500">ID: {log.student_id} • {log.department}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        log.action === 'in' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {log.action === 'in' ? 'Checked In' : 'Checked Out'}
                      </p>
                      <p className="text-xs text-gray-500">{formatTime(log.timestamp)}</p>
                    </div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No activity yet</p>
                )}
              </div>
            </div>
          </div>
        )}

    
          {activeTab === 'students' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">All Students</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
              <img 
                src={student.imageUrl || '/default-avatar.png'} 
                alt={student.name}
                className="h-10 w-10 rounded-full object-cover"
              />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm font-medium text-gray-900">{student.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm text-gray-900">{student.student_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm text-gray-900">{student.department}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                student.status === 'in' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {student.status === 'in' ? 'Inside' : 'Outside'}
              </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              <div>{student.email}</div>
              <div>{student.phone}</div>
                  </td>
                </tr>
              ))}
            </tbody>
                </table>
                {students.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No students found</p>
            </div>
                )}
              </div>
            </div>
          )}

        {/* Verification Tab */}
        {activeTab === 'verification' && (
          <div>
            {/* Verification Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending Verification</p>
                    <p className="text-2xl font-semibold text-gray-900">{verificationStats.pending || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Verified Students</p>
                    <p className="text-2xl font-semibold text-gray-900">{verificationStats.verified || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Rejected</p>
                    <p className="text-2xl font-semibold text-gray-900">{verificationStats.rejected || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Registrations</p>
                    <p className="text-2xl font-semibold text-gray-900">{verificationStats.total || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Students List */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Pending Student Registrations ({pendingStudents.length})
                </h3>
                <button
                  onClick={() => loadVerificationData()}
                  disabled={loadingVerification}
                  className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center"
                >
                  {loadingVerification ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </>
                  )}
                </button>
              </div>
              
              {loadingVerification ? (
                <div className="p-8 text-center">
                  <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-gray-500">Loading pending registrations...</p>
                </div>
              ) : pendingStudents.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
                  <p className="text-gray-500">No pending student registrations to review.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Details</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Info</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Academic</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pendingStudents.map((student) => (
                        <tr key={student.student_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {student.imageUrl ? (
                                <img
                                  className="h-10 w-10 rounded-full object-cover mr-3"
                                  src={student.imageUrl}
                                  alt={student.name}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className={`h-10 w-10 rounded-full bg-yellow-500 flex items-center justify-center mr-3 ${student.imageUrl ? 'hidden' : ''}`}>
                                <span className="text-sm font-medium text-white">
                                  {student.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                <div className="text-sm text-gray-500">ID: {student.student_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{student.email || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{student.phone || 'N/A'}</div>
                            {student.city && student.state && (
                              <div className="text-xs text-gray-400">{student.city}, {student.state}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{student.department}</div>
                            {student.semester && (
                              <div className="text-sm text-gray-500">Semester {student.semester}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(student.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(student.createdAt).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleApproveStudent(student.student_id, student.name)}
                                className="bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-3 rounded transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectStudent(student.student_id, student.name)}
                                className="bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-3 rounded transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div>
            {/* Filters and Export */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Date</label>
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Student ID</label>
                    <input
                      type="text"
                      value={studentIdFilter}
                      onChange={(e) => setStudentIdFilter(e.target.value)}
                      placeholder="Enter Student ID"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={exportToCSV}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={exportToExcel}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Export Excel
                  </button>
                </div>
              </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Activity Logs ({filteredLogs.length} records)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{log.student_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{log.student_id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{log.department}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            log.action === 'in' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {log.action === 'in' ? 'Check In' : 'Check Out'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(log.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredLogs.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No logs found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Account Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Account Settings</h3>
              <form onSubmit={handleUpdateCredentials} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter current password"
                      required
                    />
                  </div>
                  <div></div> {/* Empty div for grid spacing */}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Username (optional)
                    </label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Leave blank to keep current username"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password (optional)
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Leave blank to keep current password"
                      minLength="6"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Confirm new password"
                      disabled={!newPassword}
                    />
                  </div>
                </div>
                
                <div className="flex justify-start">
                  <button
                    type="submit"
                    disabled={isUpdating || !currentPassword}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center"
                  >
                    {isUpdating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating...
                      </>
                    ) : (
                      'Update Credentials'
                    )}
                  </button>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-blue-800">Security Tips</h4>
                      <div className="mt-2 text-sm text-blue-700">
                        <ul className="list-disc list-inside space-y-1">
                          <li>Use a strong password with at least 6 characters</li>
                          <li>Include a mix of letters, numbers, and special characters</li>
                          <li>Don't use the same password for multiple accounts</li>
                          <li>Keep your credentials secure and don't share them</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Danger Zone</h3>
              
              {/* Clear Activities Section */}
              <div className="border border-orange-200 rounded-lg p-4 mb-4">
                <h4 className="text-md font-semibold text-orange-800 mb-2">Clear Recent Activities</h4>
                <p className="text-sm text-orange-600 mb-4">
                  This action will clear all recent activity records from the landing page display.
                </p>
                <div className="space-x-3">
                  <button
                    onClick={handleClearActivities}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Clear Activities
                  </button>
                  <button
                    onClick={handleDailyCleanup}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Run Daily Cleanup
                  </button>
                </div>
              </div>

              {/* Clear All Data Section */}
              <div className="border border-red-200 rounded-lg p-4">
                <h4 className="text-md font-semibold text-red-800 mb-2">Clear All Data</h4>
                <p className="text-sm text-red-600 mb-4">
                  This action will permanently delete all student data and activity logs. This cannot be undone.
                </p>
                <button
                  onClick={handleClearData}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Clear All Data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;