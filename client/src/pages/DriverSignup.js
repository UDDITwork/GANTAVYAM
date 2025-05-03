// client/src/pages/DriverSignup.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { driverSignup } from '../services/api';

const DriverSignup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNo: '',
    aadhaarNo: '',
    vehicleNo: '',
    // Bank Details
    bankName: '',
    ifscCode: '',
    accountNumber: '',
    accountHolderName: '',
    // License and Certificates
    drivingLicenseNo: '',
    permitNo: '',
    fitnessCertificateNo: '',
    insurancePolicyNo: '',
    password: '',
    confirmPassword: ''
  });
  
  const [files, setFiles] = useState({
    aadhaarPhoto: null,
    registrationCertificatePhoto: null,
    drivingLicensePhoto: null,
    permitPhoto: null,
    fitnessCertificatePhoto: null,
    insurancePolicyPhoto: null
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFiles({ ...files, [e.target.name]: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const submitData = new FormData();
      
      // Append personal information
      submitData.append('fullName', formData.fullName);
      submitData.append('mobileNo', formData.mobileNo);
      submitData.append('aadhaarNo', formData.aadhaarNo);
      submitData.append('vehicleNo', formData.vehicleNo);
      
      // Append bank details as a nested object
      const bankDetails = {
        bankName: formData.bankName,
        ifscCode: formData.ifscCode,
        accountNumber: formData.accountNumber,
        accountHolderName: formData.accountHolderName
      };
      submitData.append('bankDetails', JSON.stringify(bankDetails));
      
      // Append license and certificate numbers
      submitData.append('drivingLicenseNo', formData.drivingLicenseNo);
      submitData.append('permitNo', formData.permitNo);
      submitData.append('fitnessCertificateNo', formData.fitnessCertificateNo);
      submitData.append('insurancePolicyNo', formData.insurancePolicyNo);
      
      // Append password
      submitData.append('password', formData.password);
      
      // Append all files
      Object.keys(files).forEach(key => {
        if (files[key]) {
          submitData.append(key, files[key]);
        }
      });

      await driverSignup(submitData);
      setLoading(false);
      alert('Signup successful! Please login.');
      navigate('/driver/login');
    } catch (err) {
      setError(err.error || 'Failed to register');
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Driver Signup</h1>
      <Link to="/driver/login">Already registered? Login</Link>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="driver-form">
        {/* Personal Information */}
        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Mobile Number</label>
          <input
            type="text"
            name="mobileNo"
            value={formData.mobileNo}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Aadhaar Number</label>
          <input
            type="text"
            name="aadhaarNo"
            value={formData.aadhaarNo}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Aadhaar Photo</label>
          <input
            type="file"
            name="aadhaarPhoto"
            onChange={handleFileChange}
            required
            accept="image/*"
          />
        </div>

        {/* Vehicle Information */}
        <div className="form-group">
          <label>Vehicle Number</label>
          <input
            type="text"
            name="vehicleNo"
            value={formData.vehicleNo}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Registration Certificate Photo</label>
          <input
            type="file"
            name="registrationCertificatePhoto"
            onChange={handleFileChange}
            required
            accept="image/*"
          />
        </div>

        {/* Bank Details */}
        <div className="form-group">
          <label>Bank Name</label>
          <input
            type="text"
            name="bankName"
            value={formData.bankName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>IFSC Code</label>
          <input
            type="text"
            name="ifscCode"
            value={formData.ifscCode}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Account Number</label>
          <input
            type="text"
            name="accountNumber"
            value={formData.accountNumber}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Account Holder Name</label>
          <input
            type="text"
            name="accountHolderName"
            value={formData.accountHolderName}
            onChange={handleChange}
            required
          />
        </div>

        {/* License and Certificates */}
        <div className="form-group">
          <label>Driving License Number</label>
          <input
            type="text"
            name="drivingLicenseNo"
            value={formData.drivingLicenseNo}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Driving License Photo</label>
          <input
            type="file"
            name="drivingLicensePhoto"
            onChange={handleFileChange}
            required
            accept="image/*"
          />
        </div>

        <div className="form-group">
          <label>Permit Number</label>
          <input
            type="text"
            name="permitNo"
            value={formData.permitNo}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Permit Photo</label>
          <input
            type="file"
            name="permitPhoto"
            onChange={handleFileChange}
            required
            accept="image/*"
          />
        </div>

        <div className="form-group">
          <label>Fitness Certificate Number</label>
          <input
            type="text"
            name="fitnessCertificateNo"
            value={formData.fitnessCertificateNo}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Fitness Certificate Photo</label>
          <input
            type="file"
            name="fitnessCertificatePhoto"
            onChange={handleFileChange}
            required
            accept="image/*"
          />
        </div>

        <div className="form-group">
          <label>Insurance Policy Number</label>
          <input
            type="text"
            name="insurancePolicyNo"
            value={formData.insurancePolicyNo}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Insurance Policy Photo</label>
          <input
            type="file"
            name="insurancePolicyPhoto"
            onChange={handleFileChange}
            required
            accept="image/*"
          />
        </div>

        {/* Password Fields */}
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            minLength="6"
          />
        </div>

        <div className="form-group">
          <label>Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            minLength="6"
          />
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Signing up...' : 'Sign Up'}
        </button>
      </form>
    </div>
  );
};

export default DriverSignup;