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

    return () => clearTimeout(timer);
  }, []);

  const loadInitialData = async () => {
    // Check if we have a valid token before making API calls
    const token = apiService.getToken();
    if (!token) {
      console.warn('No authentication token found, skipping data load');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadStudents(),
        loadLogs()
      ]);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setError(error.message);
      // Don't show toast here as it might be annoying on every load
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      // Ensure we have a valid token
      const token = apiService.getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await apiService.getAllStudents();
      if (response.success) {
        setStudents(response.data.students || []);
      } else {
        throw new Error(response.message || 'Failed to load students');
      }
    } catch (error) {
      console.error('Failed to load students:', error);
      
      // If it's an authentication error, don't fall back to localStorage
      if (error.message.includes('authentication') || error.message.includes('token')) {
        throw error;
      }
      
      // Fall back to localStorage for other errors
      const storedStudents = localStorage.getItem('students');
      if (storedStudents) {
        setStudents(JSON.parse(storedStudents));
      } else {
        // Set empty array if no fallback data
        setStudents([]);
      }
    }
  };

  const loadLogs = async () => {
    try {
      // Ensure we have a valid token
      const token = apiService.getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await apiService.getAllLogs(100, 0);
      if (response.success) {
        setLogs(response.data.logs || []);
      } else {
        throw new Error(response.message || 'Failed to load logs');
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
      
      // If it's an authentication error, don't fall back to localStorage
      if (error.message.includes('authentication') || error.message.includes('token')) {
        throw error;
      }
      
      // Fall back to localStorage for other errors
      const storedLogs = localStorage.getItem('logs');
      if (storedLogs) {
        setLogs(JSON.parse(storedLogs));
      } else {
        // Set empty array if no fallback data
        setLogs([]);
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
        phone: studentData.phone
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
        phone: student.phone
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

        const actionText = logEntry.action === 'in' ? 'checked in' : 'checked out';
        toast.success(`${updatedStudent.name} ${actionText} successfully`);

        return { student: updatedStudent, logEntry };
      }
    } catch (error) {
      console.error('Failed to toggle student status:', error);
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
    loadLogs
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};