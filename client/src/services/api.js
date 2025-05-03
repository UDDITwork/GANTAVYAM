// client/src/services/api.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Driver related API calls
export const registerDriver = async (formData) => {
  try {
    const response = await axios.post(`${API_URL}/drivers/register`, formData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getAllDrivers = async () => {
  try {
    const response = await axios.get(`${API_URL}/admin/drivers`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getDriverById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/admin/drivers/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const driverSignup = async (formData) => {
  try {
    const response = await axios.post(`${API_URL}/drivers/signup`, formData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const driverLogin = async (credentials) => {
  try {
    const response = await axios.post(`${API_URL}/drivers/login`, credentials);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};