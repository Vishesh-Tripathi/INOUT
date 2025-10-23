const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('authToken');
  }

  // Helper method to get headers
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      // Always get the latest token from localStorage
      const currentToken = this.getToken();
      if (currentToken) {
        headers.Authorization = `Bearer ${currentToken}`;
      }
    }

    return headers;
  }

  // Helper method to handle responses
  async handleResponse(response, isPublicRoute = false) {
    const data = await response.json();
    
    if (!response.ok) {
      if (response.status === 401 && !isPublicRoute) {
        // Token expired or invalid - only redirect if not a public route
        this.clearToken();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      throw new Error(data.message || 'An error occurred');
    }
    
    return data;
  }

  // Token management
  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  getToken() {
    return this.token || localStorage.getItem('authToken');
  }

  // Auth API methods
  async login(username, password) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ username, password }),
    });

    const data = await this.handleResponse(response);
    
    if (data.success && data.data.token) {
      this.setToken(data.data.token);
    }
    
    return data;
  }

  async register(userData) {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify(userData),
    });

    const data = await this.handleResponse(response);
    
    if (data.success && data.data.token) {
      this.setToken(data.data.token);
    }
    
    return data;
  }

  async getProfile() {
    const response = await fetch(`${this.baseURL}/auth/profile`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async changePassword(currentPassword, newPassword) {
    const response = await fetch(`${this.baseURL}/auth/change-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    return this.handleResponse(response);
  }

  async logout() {
    try {
      await fetch(`${this.baseURL}/auth/logout`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
    } finally {
      this.clearToken();
    }
  }

  // Students API methods
  async getAllStudents() {
    const response = await fetch(`${this.baseURL}/students`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response, true); // Mark as public route
  }

  async getStudent(studentId) {
    const response = await fetch(`${this.baseURL}/students/${studentId}`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async createStudent(studentData) {
    const response = await fetch(`${this.baseURL}/students`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(studentData),
    });

    return this.handleResponse(response);
  }

  async createMultipleStudents(studentsData) {
    const response = await fetch(`${this.baseURL}/students/bulk`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ students: studentsData }),
    });

    return this.handleResponse(response);
  }

  async updateStudent(studentId, studentData) {
    const response = await fetch(`${this.baseURL}/students/${studentId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(studentData),
    });

    return this.handleResponse(response);
  }

  async deleteStudent(studentId) {
    const response = await fetch(`${this.baseURL}/students/${studentId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async getStudentsByStatus(status) {
    const response = await fetch(`${this.baseURL}/students/status/${status}`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async toggleStudentStatus(studentId) {
    const response = await fetch(`${this.baseURL}/students/${studentId}/toggle`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });

    return this.handleResponse(response, true); // Mark as public route
  }

  // Logs API methods
  async getAllLogs(limit = 100, offset = 0) {
    const response = await fetch(`${this.baseURL}/logs?limit=${limit}&offset=${offset}`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async getStudentLogs(studentId, limit = 50) {
    const response = await fetch(`${this.baseURL}/logs/student/${studentId}?limit=${limit}`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async getRecentActivity(hours = 24) {
    const response = await fetch(`${this.baseURL}/logs/recent?hours=${hours}`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async getTodayStats() {
    const response = await fetch(`${this.baseURL}/logs/stats/today`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async getStatsByDate(date) {
    const response = await fetch(`${this.baseURL}/logs/stats/${date}`, {
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  async clearOldLogs(days = 30) {
    const response = await fetch(`${this.baseURL}/logs/cleanup`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      body: JSON.stringify({ days }),
    });

    return this.handleResponse(response);
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL.replace('/api', '')}/health`);
      return this.handleResponse(response);
    } catch (error) {
      throw new Error('Backend server is not responding');
    }
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;