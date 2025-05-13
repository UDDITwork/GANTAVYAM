// client/src/services/api.js
import axios from 'axios';

// API base URL
const API_URL = 'http://localhost:5000/api';

// Create axios instance for JSON requests
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Create axios instance for multipart/form-data requests (file uploads)
const fileClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Longer timeout for file uploads
  headers: {
    'Content-Type': 'multipart/form-data'
  }
});

// Add authentication token to requests
const addAuthToken = (config) => {
  const token = localStorage.getItem('userToken') || localStorage.getItem('driverToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
};

// Add interceptors to both clients
[apiClient, fileClient].forEach(client => {
  // Request interceptor
  client.interceptors.request.use(
    addAuthToken,
    error => Promise.reject(error)
  );

  // Response interceptor
  client.interceptors.response.use(
    response => response,
    error => {
      // Extract error message from response
      const errorMessage = 
        error.response?.data?.error || 
        error.response?.data?.message || 
        error.message || 
        'Unknown error occurred';
      
      // Handle authentication errors
      if (error.response && error.response.status === 401) {
        console.error('Authentication error:', errorMessage);
        // You could redirect to login page or show auth error
      }
      
      // Return error in normalized format
      return Promise.reject({
        error: errorMessage,
        status: error.response?.status
      });
    }
  );
});

// Authentication APIs
export const auth = {
  // User authentication
  userLogin: async (credentials) => {
    try {
      const response = await apiClient.post('/users/login', credentials);
      // Store token in localStorage
      if (response.data.token) {
        localStorage.setItem('userToken', response.data.token);
        localStorage.setItem('userRole', 'user');
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  userRegister: async (userData) => {
    try {
      const response = await apiClient.post('/users/register', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Driver authentication
  driverLogin: async (credentials) => {
    try {
      const response = await apiClient.post('/drivers/login', credentials);
      // Store token in localStorage
      if (response.data.token) {
        localStorage.setItem('driverToken', response.data.token);
        localStorage.setItem('driverRole', 'driver');
        localStorage.setItem('driver', JSON.stringify({
          ...response.data.driver,
          role: 'driver'
        }));
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Driver APIs
export const drivers = {
  // Driver registration (with file uploads)
  driverSignup: async (formData) => {
    try {
      console.log('Sending driver registration data');
      const response = await fileClient.post('/drivers/register', formData);
      
      // Store token if provided in response
      if (response.data.token) {
        localStorage.setItem('driverToken', response.data.token);
        localStorage.setItem('driverRole', 'driver');
        localStorage.setItem('driver', JSON.stringify(response.data.driver));
      }
      
      return response.data;
    } catch (error) {
      console.error('Driver signup error:', error);
      throw error;
    }
  },
  
  getDriverProfile: async () => {
    try {
      const response = await apiClient.get('/drivers/profile');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateDriverLocation: async (locationData) => {
    try {
      const response = await apiClient.put('/drivers/location', locationData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Admin APIs
export const admin = {
  // Register driver (by admin)
  registerDriver: async (formData) => {
    try {
      console.log('Sending driver registration data (admin)');
      const response = await fileClient.post('/admin/drivers', formData);
      return response.data;
    } catch (error) {
      console.error('Admin driver registration error:', error);
      throw error;
    }
  },
  
  getAllDrivers: async () => {
    try {
      const response = await apiClient.get('/admin/drivers');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  getDriverById: async (id) => {
    try {
      const response = await apiClient.get(`/admin/drivers/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// Export individual functions for backward compatibility
export const driverSignup = drivers.driverSignup;
export const driverLogin = auth.driverLogin;
export const getDriverProfile = drivers.getDriverProfile;
export const updateDriverLocation = drivers.updateDriverLocation;
export const getAllDrivers = admin.getAllDrivers;
export const getDriverById = admin.getDriverById;
export const registerDriver = admin.registerDriver;

// Fixed default export
const api = {
  auth,
  drivers,
  admin
};

export default api;