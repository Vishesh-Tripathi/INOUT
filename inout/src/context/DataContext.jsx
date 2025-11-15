import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';
import toast from 'react-hot-toast';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [students, setStudents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load initial data when component mounts
  useEffect(() => {
    // Add a small delay to ensure authentication is complete
    const timer = setTimeout(() => {
      loadInitialData();
    }, 100);

    // Listen for localStorage changes to sync across tabs/pages
    const handleStorageChange = (e) => {
      if (e.key === 'data_sync_trigger') {
        console.log('Data sync trigger detected, refreshing data...');
        loadInitialData();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Always try to load students for scanner functionality
      await loadStudents();
      
      // Only try to load logs if we have authentication
      const token = apiService.getToken();
      if (token) {
        await loadLogs();
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setError(error.message);
      // Don't show toast here as it might be annoying on every load
    } finally {
      setLoading(false);
    }
  };

  // Broadcast data change to other tabs/pages
  const broadcastDataChange = () => {
    // Use timestamp to ensure the event always triggers
    localStorage.setItem('data_sync_trigger', Date.now().toString());
    localStorage.removeItem('data_sync_trigger');
  };

  const loadStudents = async () => {
    console.log('Loading students...');
    try {
      const response = await apiService.getAllStudents();
      console.log('API Response:', response);
      if (response.success) {
        const studentsData = response.data.students || [];
        setStudents(studentsData);
        console.log('Students loaded successfully:', studentsData.length, 'students');
        console.log('First few students:', studentsData.slice(0, 3));
      } else {
        throw new Error(response.message || 'Failed to load students');
      }
    } catch (error) {
      console.error('Failed to load students:', error);
      
      // Fall back to localStorage for errors
      const storedStudents = localStorage.getItem('students');
      if (storedStudents) {
        const parsedStudents = JSON.parse(storedStudents);
        setStudents(parsedStudents);
        console.log('Loaded students from localStorage:', parsedStudents.length);
      } else {
        // Set empty array if no fallback data
        setStudents([]);
        console.log('No students found, setting empty array');
      }
    }
  };
  const loadLogs = async () => {
    try {
      const response = await apiService.getAllLogs(100, 0);
      if (response.success) {
        setLogs(response.data.logs || []);
        console.log('Logs loaded:', response.data.logs?.length || 0);
      } else {
        throw new Error(response.message || 'Failed to load logs');
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
      
      // Fall back to localStorage for errors
      const storedLogs = localStorage.getItem('logs');
      if (storedLogs) {
        const parsedLogs = JSON.parse(storedLogs);
        setLogs(parsedLogs);
        console.log('Loaded logs from localStorage:', parsedLogs.length);
      } else {
        // Set empty array if no fallback data
        setLogs([]);
        console.log('No logs found, setting empty array');
      }
    }
  };

  const addStudent = async (studentData) => {
    try {
      const response = await apiService.createStudent({
        student_id: studentData.studentId || studentData.student_id,
        name: studentData.name,
        department: studentData.department,
        email: studentData.email,
        phone: studentData.phone,
        address: studentData.address,
        city: studentData.city,
        state: studentData.state,
        pin: studentData.pin,
        country: studentData.country,
        semester: studentData.semester,
        imageUrl: studentData.imageUrl
      });

      if (response.success) {
        const newStudent = response.data.student;
        setStudents(prev => [newStudent, ...prev]);
        toast.success('Student added successfully');
        return newStudent;
      }
    } catch (error) {
      console.error('Failed to add student:', error);
      toast.error(error.message || 'Failed to add student');
      throw error;
    }
  };

  const addStudents = async (newStudents) => {
    try {
      const studentsData = newStudents.map(student => ({
        student_id: student.studentId || student.student_id,
        name: student.name,
        department: student.department,
        email: student.email,
        phone: student.phone,
        address: student.address,
        city: student.city,
        state: student.state,
        pin: student.pin,
        country: student.country,
        semester: student.semester,
        imageUrl: student.imageUrl
      }));

      const response = await apiService.createMultipleStudents(studentsData);

      if (response.success) {
        await loadStudents(); // Reload students after bulk insert
        toast.success(`${studentsData.length} students added successfully`);
        return response.data;
      }
    } catch (error) {
      console.error('Failed to add students:', error);
      toast.error(error.message || 'Failed to add students');
      throw error;
    }
  };

  const toggleStudentStatus = async (studentId) => {
    try {
      const response = await apiService.toggleStudentStatus(studentId);

      if (response.success) {
        const updatedStudent = response.data.student;
        const logEntry = response.data.logEntry;

        // Update students state
        setStudents(prev => prev.map(s => 
          s.student_id === studentId ? updatedStudent : s
        ));

        // Add log entry to logs state
        setLogs(prev => [logEntry, ...prev]);

        // Broadcast change to other tabs/pages
        broadcastDataChange();

        const actionText = logEntry.action === 'in' ? 'checked in' : 'checked out';
        toast.success(`${updatedStudent.name} ${actionText} successfully`);

        return { student: updatedStudent, logEntry };
      }
    } catch (error) {
      console.error('Failed to toggle student status:', error);
      
      // Handle verification error specifically
      if (error.message.includes('pending admin verification') || error.message.includes('Access denied')) {
        toast.error('Access denied: Your registration is pending admin verification');
        return { requiresVerification: true, error: error.message };
      }
      
      const message = error.message || 'Failed to update student status';
      toast.error(message);
      throw error;
    }
  };

  const updateStudent = async (studentId, updateData) => {
    try {
      const response = await apiService.updateStudent(studentId, updateData);

      if (response.success) {
        const updatedStudent = response.data.student;
        setStudents(prev => prev.map(s => 
          s.student_id === studentId ? updatedStudent : s
        ));
        toast.success('Student updated successfully');
        return updatedStudent;
      }
    } catch (error) {
      console.error('Failed to update student:', error);
      toast.error(error.message || 'Failed to update student');
      throw error;
    }
  };

  const deleteStudent = async (studentId) => {
    try {
      const response = await apiService.deleteStudent(studentId);

      if (response.success) {
        setStudents(prev => prev.filter(s => s.student_id !== studentId));
        toast.success('Student deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete student:', error);
      toast.error(error.message || 'Failed to delete student');
      throw error;
    }
  };

  const getStudentsInside = () => {
    return students.filter(student => student.status === 'in');
  };

  const getStudentsOutside = () => {
    return students.filter(student => student.status === 'out');
  };

  const getStudentByBarcode = (studentId) => {
    return students.find(student => student.student_id === studentId);
  };

  const clearAllData = async () => {
    try {
      // Note: This would need a backend endpoint to clear all data
      // For now, we'll clear local state and localStorage
      setStudents([]);
      setLogs([]);
      localStorage.removeItem('students');
      localStorage.removeItem('logs');
      toast.success('All data cleared');
    } catch (error) {
      console.error('Failed to clear data:', error);
      toast.error('Failed to clear data');
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      await loadInitialData();
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  // Backup to localStorage periodically
  useEffect(() => {
    localStorage.setItem('students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('logs', JSON.stringify(logs));
  }, [logs]);

  const value = {
    students,
    logs,
    loading,
    error,
    addStudent,
    addStudents,
    updateStudent,
    deleteStudent,
    toggleStudentStatus,
    getStudentsInside,
    getStudentsOutside,
    getStudentByBarcode,
    clearAllData,
    refreshData,
    loadStudents,
    loadLogs,
    broadcastDataChange
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};