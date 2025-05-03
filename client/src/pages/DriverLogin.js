// src/pages/DriverLogin.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

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
      const res = await axios.post('http://localhost:5000/api/drivers/login', formData);
      // Store with correct keys for dashboard
      localStorage.setItem('driverToken', res.data.token);
      localStorage.setItem('driver', JSON.stringify(res.data.data));
      setLoading(false);
      navigate('/driver/dashboard');
    } catch (err) {
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
      await axios.post('http://localhost:5000/api/drivers/reset-password', {
        mobileNo: forgotPasswordData.mobileNo,
        newPassword: forgotPasswordData.newPassword
      });
      setResetMessage('Password reset successful! Please login with your new password.');
      setShowForgotPassword(false);
      setForgotPasswordData({ mobileNo: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setResetMessage(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Driver Login</h1>
      <Link to="/driver/signup">New driver? Sign up</Link>
      {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
      {resetMessage && (
        <div style={{ color: resetMessage.includes('successful') ? 'green' : 'red', marginTop: 10 }}>
          {resetMessage}
        </div>
      )}
      {!showForgotPassword ? (
        <>
          <form onSubmit={handleSubmit}>
            <div>
              <label>Mobile Number</label>
              <input
                type="text"
                name="mobileNo"
                value={formData.mobileNo}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <button 
            onClick={() => setShowForgotPassword(true)}
            style={{ marginTop: '10px', background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}
          >
            Forgot Password?
          </button>
        </>
      ) : (
        <form onSubmit={handleForgotPassword}>
          <h2>Reset Password</h2>
          <div>
            <label>Mobile Number</label>
            <input
              type="text"
              name="mobileNo"
              value={forgotPasswordData.mobileNo}
              onChange={handleForgotPasswordChange}
              required
            />
          </div>
          <div>
            <label>New Password</label>
            <input
              type="password"
              name="newPassword"
              value={forgotPasswordData.newPassword}
              onChange={handleForgotPasswordChange}
              required
            />
          </div>
          <div>
            <label>Confirm New Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={forgotPasswordData.confirmPassword}
              onChange={handleForgotPasswordChange}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
          <button 
            type="button" 
            onClick={() => setShowForgotPassword(false)}
            style={{ marginLeft: '10px' }}
          >
            Back to Login
          </button>
        </form>
      )}
    </div>
  );
};

export default DriverLogin;
