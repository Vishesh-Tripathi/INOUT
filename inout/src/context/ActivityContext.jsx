import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const ActivityContext = createContext();

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
};

export const ActivityProvider = ({ children }) => {
  const [recentActivities, setRecentActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  // Real-time sync mechanism
  useEffect(() => {
    // Initial load
    loadRecentActivities();

    // Listen for cross-tab synchronization
    const handleStorageSync = (e) => {
      if (e.key === 'activity_sync_trigger') {
        loadRecentActivities(true);
      }
    };

    // Listen for page visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadRecentActivities(true);
      }
    };

    // Listen for window focus
    const handleFocus = () => {
      loadRecentActivities(true);
    };

    window.addEventListener('storage', handleStorageSync);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageSync);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Load recent activities from MongoDB
  const loadRecentActivities = async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      }
      setError(null);

      const response = await apiService.getRecentActivities(20);
      
      if (response.success) {
        const activities = response.data || [];
        
        // Only update state if data has actually changed
        setRecentActivities(prevActivities => {
          const hasChanged = JSON.stringify(prevActivities) !== JSON.stringify(activities);
          if (hasChanged) {
            setLastUpdated(new Date());
          }
          return activities;
        });
      }
    } catch (error) {
      console.error('Error loading recent activities:', error);
      setError(error.message);
      
      // Fallback to localStorage
      const storedActivities = localStorage.getItem('recentActivities');
      if (storedActivities) {
        const parsed = JSON.parse(storedActivities);
        setRecentActivities(parsed);
        setLastUpdated(new Date());
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  // Add new activity to MongoDB and sync
  const addActivity = async (studentId, student, action) => {
    try {
      // Save to MongoDB
      const response = await apiService.addActivity(studentId, student, action);
      
      if (response.success) {
        // Create activity object
        const newActivity = {
          student_id: studentId,
          student: student,
          action: action,
          timestamp: new Date().toISOString()
        };

        // Update local state immediately for instant feedback
        setRecentActivities(prev => [newActivity, ...prev.slice(0, 19)]);
        setLastUpdated(new Date());

        // Broadcast to other tabs/pages
        broadcastActivityChange();

        return response;
      }
    } catch (error) {
      console.error('Error adding activity:', error);
      setError(error.message);
      throw error;
    }
  };

  // Broadcast activity change to other tabs/pages
  const broadcastActivityChange = () => {
    localStorage.setItem('activity_sync_trigger', Date.now().toString());
    localStorage.removeItem('activity_sync_trigger');
  };

  // Manual refresh function
  const refreshActivities = async () => {
    await loadRecentActivities(false);
  };

  // Clear all activities (admin function)
  const clearAllActivities = async () => {
    try {
      const response = await apiService.clearAllActivities();
      if (response.success) {
        setRecentActivities([]);
        setLastUpdated(new Date());
        broadcastActivityChange();
      }
      return response;
    } catch (error) {
      console.error('Error clearing activities:', error);
      setError(error.message);
      throw error;
    }
  };

  // Get activity statistics
  const getActivityStats = () => {
    const checkins = recentActivities.filter(activity => activity.action === 'in').length;
    const checkouts = recentActivities.filter(activity => activity.action === 'out').length;
    const totalActivities = recentActivities.length;
    
    return {
      checkins,
      checkouts,
      totalActivities,
      lastActivity: recentActivities[0] || null
    };
  };

  // Backup to localStorage whenever activities change
  useEffect(() => {
    if (recentActivities.length > 0) {
      localStorage.setItem('recentActivities', JSON.stringify(recentActivities));
    }
  }, [recentActivities]);

  const value = {
    recentActivities,
    isLoading,
    lastUpdated,
    error,
    addActivity,
    loadRecentActivities,
    refreshActivities,
    clearAllActivities,
    getActivityStats,
    broadcastActivityChange
  };

  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  );
};