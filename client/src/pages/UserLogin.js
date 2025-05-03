import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const UserLogin = () => {
  const [formData, setFormData] = useState({ phone: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const response = await axios.post('http://localhost:5000/api/users/login', formData);
      
      if (response.data.success) {
        // Save token
        localStorage.setItem('userToken', response.data.token);
        
        // Save user data - corrected line
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Redirect to dashboard
        navigate('/user/dashboard');
      } else {
        setError(response.data.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      setIsLoading(false);
      // Improved error handling
      if (err.response && err.response.status === 401) {
        setError('Invalid phone number or password. Please try again.');
      } else if (err.response && err.response.status === 400) {
        setError('Bad request. Please check your input.');
      } else if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else if (err.message === 'Network Error') {
        setError('Network error: Please check your connection or server.');
      } else {
        setError('Login failed. Please try again.');
      }
      // Log the error for debugging
      console.error('Login error:', err);
      return;
    }
    setIsLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>User Login</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input 
              type="text" 
              id="phone"
              name="phone" 
              value={formData.phone}
              onChange={handleChange} 
              placeholder="Enter your phone number" 
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password"
              name="password" 
              value={formData.password}
              onChange={handleChange} 
              placeholder="Enter your password" 
              required 
            />
          </div>
          
          <div className="form-links">
            <Link to="/user/forgot-password">Forgot Password?</Link>
            <Link to="/user/signup">New here? Create account</Link>
          </div>
          
          <button 
            type="submit" 
            className="login-button" 
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserLogin;