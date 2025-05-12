// client/src/pages/DriverSignup.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { driverSignup } from '../services/api';
import './DriverSignup.css'; // Make sure to create this CSS file

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
  const [activeSection, setActiveSection] = useState('personal');

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

  const changeSection = (section) => {
    setActiveSection(section);
  };

  return (
    <div className="driver-signup-container">
      <div className="signup-header">
        <h1>Welcome to GANTAVYAM</h1>
        <h2>Driver Signup</h2>
        <p className="login-link">
          <Link to="/driver/login">Already registered? Login</Link>
        </p>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="form-progress">
        <div 
          className={`progress-step ${activeSection === 'personal' ? 'active' : ''} ${activeSection !== 'personal' ? 'completed' : ''}`}
          onClick={() => changeSection('personal')}
        >
          <div className="step-number">1</div>
          <div className="step-label">Personal Info</div>
        </div>
        <div 
          className={`progress-step ${activeSection === 'bank' ? 'active' : ''} ${activeSection !== 'personal' && activeSection !== 'bank' ? 'completed' : ''}`}
          onClick={() => changeSection('bank')}
        >
          <div className="step-number">2</div>
          <div className="step-label">Bank Details</div>
        </div>
        <div 
          className={`progress-step ${activeSection === 'license' ? 'active' : ''} ${activeSection === 'security' ? 'completed' : ''}`}
          onClick={() => changeSection('license')}
        >
          <div className="step-number">3</div>
          <div className="step-label">Licenses</div>
        </div>
        <div 
          className={`progress-step ${activeSection === 'security' ? 'active' : ''}`}
          onClick={() => changeSection('security')}
        >
          <div className="step-number">4</div>
          <div className="step-label">Security</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="driver-signup-form">
        {/* Personal Information Section */}
        <div className={`form-section ${activeSection === 'personal' ? 'active' : ''}`}>
          <h3>Personal Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
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
                placeholder="Enter your mobile number"
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
                placeholder="Enter your 12-digit Aadhaar number"
              />
            </div>

            <div className="form-group">
              <label>Aadhaar Photo</label>
              <div className="file-input-container">
                <input
                  type="file"
                  name="aadhaarPhoto"
                  id="aadhaarPhoto"
                  onChange={handleFileChange}
                  required
                  accept="image/*"
                  className="file-input"
                />
                <label htmlFor="aadhaarPhoto" className="file-label">
                  {files.aadhaarPhoto ? files.aadhaarPhoto.name : 'Choose File'}
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Vehicle Number</label>
              <input
                type="text"
                name="vehicleNo"
                value={formData.vehicleNo}
                onChange={handleChange}
                required
                placeholder="Enter your vehicle number"
              />
            </div>

            <div className="form-group">
              <label>Registration Certificate Photo</label>
              <div className="file-input-container">
                <input
                  type="file"
                  name="registrationCertificatePhoto"
                  id="registrationCertificatePhoto"
                  onChange={handleFileChange}
                  required
                  accept="image/*"
                  className="file-input"
                />
                <label htmlFor="registrationCertificatePhoto" className="file-label">
                  {files.registrationCertificatePhoto ? files.registrationCertificatePhoto.name : 'Choose File'}
                </label>
              </div>
            </div>
          </div>
          <div className="form-buttons">
            <button type="button" onClick={() => changeSection('bank')} className="next-button">Next</button>
          </div>
        </div>

        {/* Bank Details Section */}
        <div className={`form-section ${activeSection === 'bank' ? 'active' : ''}`}>
          <h3>Bank Details</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Bank Name</label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleChange}
                required
                placeholder="Enter your bank name"
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
                placeholder="Enter IFSC code"
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
                placeholder="Enter account number"
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
                placeholder="Enter account holder name"
              />
            </div>
          </div>
          <div className="form-buttons">
            <button type="button" onClick={() => changeSection('personal')} className="back-button">Back</button>
            <button type="button" onClick={() => changeSection('license')} className="next-button">Next</button>
          </div>
        </div>

        {/* License and Certificates Section */}
        <div className={`form-section ${activeSection === 'license' ? 'active' : ''}`}>
          <h3>License and Certificates</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Driving License Number</label>
              <input
                type="text"
                name="drivingLicenseNo"
                value={formData.drivingLicenseNo}
                onChange={handleChange}
                required
                placeholder="Enter driving license number"
              />
            </div>

            <div className="form-group">
              <label>Driving License Photo</label>
              <div className="file-input-container">
                <input
                  type="file"
                  name="drivingLicensePhoto"
                  id="drivingLicensePhoto"
                  onChange={handleFileChange}
                  required
                  accept="image/*"
                  className="file-input"
                />
                <label htmlFor="drivingLicensePhoto" className="file-label">
                  {files.drivingLicensePhoto ? files.drivingLicensePhoto.name : 'Choose File'}
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Permit Number</label>
              <input
                type="text"
                name="permitNo"
                value={formData.permitNo}
                onChange={handleChange}
                required
                placeholder="Enter permit number"
              />
            </div>

            <div className="form-group">
              <label>Permit Photo</label>
              <div className="file-input-container">
                <input
                  type="file"
                  name="permitPhoto"
                  id="permitPhoto"
                  onChange={handleFileChange}
                  required
                  accept="image/*"
                  className="file-input"
                />
                <label htmlFor="permitPhoto" className="file-label">
                  {files.permitPhoto ? files.permitPhoto.name : 'Choose File'}
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Fitness Certificate Number</label>
              <input
                type="text"
                name="fitnessCertificateNo"
                value={formData.fitnessCertificateNo}
                onChange={handleChange}
                required
                placeholder="Enter fitness certificate number"
              />
            </div>

            <div className="form-group">
              <label>Fitness Certificate Photo</label>
              <div className="file-input-container">
                <input
                  type="file"
                  name="fitnessCertificatePhoto"
                  id="fitnessCertificatePhoto"
                  onChange={handleFileChange}
                  required
                  accept="image/*"
                  className="file-input"
                />
                <label htmlFor="fitnessCertificatePhoto" className="file-label">
                  {files.fitnessCertificatePhoto ? files.fitnessCertificatePhoto.name : 'Choose File'}
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Insurance Policy Number</label>
              <input
                type="text"
                name="insurancePolicyNo"
                value={formData.insurancePolicyNo}
                onChange={handleChange}
                required
                placeholder="Enter insurance policy number"
              />
            </div>

            <div className="form-group">
              <label>Insurance Policy Photo</label>
              <div className="file-input-container">
                <input
                  type="file"
                  name="insurancePolicyPhoto"
                  id="insurancePolicyPhoto"
                  onChange={handleFileChange}
                  required
                  accept="image/*"
                  className="file-input"
                />
                <label htmlFor="insurancePolicyPhoto" className="file-label">
                  {files.insurancePolicyPhoto ? files.insurancePolicyPhoto.name : 'Choose File'}
                </label>
              </div>
            </div>
          </div>
          <div className="form-buttons">
            <button type="button" onClick={() => changeSection('bank')} className="back-button">Back</button>
            <button type="button" onClick={() => changeSection('security')} className="next-button">Next</button>
          </div>
        </div>

        {/* Security Section */}
        <div className={`form-section ${activeSection === 'security' ? 'active' : ''}`}>
          <h3>Security</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength="6"
                placeholder="Create a password (min. 6 characters)"
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
                placeholder="Confirm your password"
              />
            </div>
          </div>
          <div className="form-buttons">
            <button type="button" onClick={() => changeSection('license')} className="back-button">Back</button>
            <button type="submit" disabled={loading} className="submit-button">
              {loading ? 'Signing up...' : 'Sign Up'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default DriverSignup;