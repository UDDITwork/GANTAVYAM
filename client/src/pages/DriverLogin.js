// client/src/pages/DriverLogin.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './DriverLogin.css';

const DriverLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    mobileNo: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordData, setForgotPasswordData] = useState({
    mobileNo: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [resetMessage, setResetMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleForgotPasswordChange = (e) => {
    setForgotPasswordData({ ...forgotPasswordData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!formData.mobileNo || !formData.password) {
      setError('Please enter both mobile number and password.');
      setLoading(false);
      return;
    }
    try {
      console.log('Attempting to login with:', {
        mobileNo: formData.mobileNo,
        passwordLength: formData.password.length
      });
      
      const res = await axios.post('http://localhost:5000/api/drivers/login', formData);
      
      console.log('Login response:', res.data);
      
      // Store the correct data from the response
      if (res.data.token) {
        localStorage.setItem('driverToken', res.data.token);
        
        // Check which format the driver data is in
        if (res.data.driver) {
          localStorage.setItem('driver', JSON.stringify(res.data.driver));
        } else if (res.data.data) {
          localStorage.setItem('driver', JSON.stringify(res.data.data));
        }
        
        setLoading(false);
        navigate('/driver/dashboard');
      } else {
        throw new Error('No token received from server');
      }
    } catch (err) {
      console.error('Login error:', err);
      
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else if (err.message === 'Network Error') {
        setError('Network error: Please check your connection or server.');
      } else {
        setError('Login failed. Please check your credentials.');
      }
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResetMessage('');
    if (!forgotPasswordData.mobileNo || !forgotPasswordData.newPassword || !forgotPasswordData.confirmPassword) {
      setResetMessage('Please fill all fields.');
      setLoading(false);
      return;
    }
    if (forgotPasswordData.newPassword !== forgotPasswordData.confirmPassword) {
      setResetMessage('Passwords do not match');
      setLoading(false);
      return;
    }
    try {
      const response = await axios.post('http://localhost:5000/api/drivers/reset-password', {
        mobileNo: forgotPasswordData.mobileNo,
        newPassword: forgotPasswordData.newPassword
      });
      
      console.log('Password reset response:', response.data);
      
      setResetMessage('Password reset successful! Please login with your new password.');
      setShowForgotPassword(false);
      setForgotPasswordData({ mobileNo: '', newPassword: '', confirmPassword: '' });
      // Pre-fill the login form with the mobile number used for reset
      setFormData({
        ...formData,
        mobileNo: forgotPasswordData.mobileNo
      });
    } catch (err) {
      console.error('Password reset error:', err);
      
      setResetMessage(
        err.response?.data?.error || 
        'Failed to reset password. Please check your mobile number.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="driver-login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>GANTAVYAM</h1>
          <h2>Driver Login</h2>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        {resetMessage && (
          <div className={`message-box ${resetMessage.includes('successful') ? 'success-message' : 'error-message'}`}>
            {resetMessage}
          </div>
        )}
        
        {!showForgotPassword ? (
          <>
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="mobileNo">Mobile Number</label>
                <input
                  type="text"
                  id="mobileNo"
                  name="mobileNo"
                  value={formData.mobileNo}
                  onChange={handleChange}
                  required
                  placeholder="Enter your registered mobile number"
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
                  required
                  placeholder="Enter your password"
                />
              </div>
              
              <button 
                type="button" 
                className="forgot-password-btn"
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot Password?
              </button>
              
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? (
                  <div className="loading-spinner"></div>
                ) : (
                  'Login'
                )}
              </button>
            </form>
            
            <div className="signup-link">
              <p>New driver?</p>
              <Link to="/driver/signup">Create Account</Link>
            </div>
          </>
        ) : (
          <div className="password-reset-container">
            <h3>Reset Password</h3>
            <form onSubmit={handleForgotPassword} className="password-reset-form">
              <div className="form-group">
                <label htmlFor="reset-mobile">Mobile Number</label>
                <input
                  type="text"
                  id="reset-mobile"
                  name="mobileNo"
                  value={forgotPasswordData.mobileNo}
                  onChange={handleForgotPasswordChange}
                  required
                  placeholder="Enter your registered mobile number"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={forgotPasswordData.newPassword}
                  onChange={handleForgotPasswordChange}
                  required
                  placeholder="Create a new password"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={forgotPasswordData.confirmPassword}
                  onChange={handleForgotPasswordChange}
                  required
                  placeholder="Confirm your new password"
                />
              </div>
              
              <div className="reset-form-buttons">
                <button 
                  type="button" 
                  onClick={() => setShowForgotPassword(false)}
                  className="back-to-login-btn"
                >
                  Back to Login
                </button>
                <button type="submit" className="reset-btn" disabled={loading}>
                  {loading ? (
                    <div className="loading-spinner"></div>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
      
      <div className="login-footer">
        <p>&copy; 2025 GANTAVYAM. All rights reserved.</p>
      </div>
    </div>
  );
};

export default DriverLogin;