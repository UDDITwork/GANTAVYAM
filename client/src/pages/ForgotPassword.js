import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // Check if the phone number exists in the system
      const response = await axios.post('http://localhost:5000/api/users/check-phone', { phone });
      
      if (response.data.success) {
        setSuccess('Phone number verified successfully.');
        setStep(2); // Move to password reset step
      } else {
        setError(response.data.message || 'Phone number not found.');
      }
    } catch (err) {
      setIsLoading(false);
      // Improved error handling
      if (err.response && err.response.status === 404) {
        setError('Phone number not found.');
      } else if (err.response && err.response.status === 400) {
        setError('Bad request. Please check your input.');
      } else if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else if (err.message === 'Network Error') {
        setError('Network error: Please check your connection or server.');
      } else {
        setError('Failed to verify phone number. Please try again.');
      }
      // Log the error for debugging
      console.error('Error checking phone:', err);
      return;
    }
    setIsLoading(false);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await axios.post('http://localhost:5000/api/users/reset-password', {
        phone,
        newPassword
      });
      
      if (response.data.success) {
        setSuccess('Password reset successful! Please login with your new password.');
        setTimeout(() => {
          navigate('/user/login');
        }, 3000);
      } else {
        setError(response.data.message || 'Failed to reset password.');
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <h2>Reset Password</h2>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        {step === 1 ? (
          // Step 1: Enter phone number
          <form onSubmit={handlePhoneSubmit}>
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input 
                type="text" 
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="Enter your registered phone number" 
                required 
              />
            </div>
            
            <button 
              type="submit" 
              className="reset-button" 
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify Phone'}
            </button>
            
            <div className="form-links">
              <Link to="/user/login">Back to Login</Link>
            </div>
          </form>
        ) : (
          // Step 2: Enter new password
          <form onSubmit={handlePasswordReset}>
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input 
                type="password" 
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="Enter new password" 
                required 
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input 
                type="password" 
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="Confirm new password" 
                required 
              />
            </div>
            
            <button 
              type="submit" 
              className="reset-button" 
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;