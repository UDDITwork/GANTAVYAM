// client/src/pages/DriverRegistration.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerDriver } from '../services/api';

const DriverRegistration = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNo: '',
    aadhaarNo: '',
    vehicleNo: '',
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    drivingLicenseNo: '',
    permitNo: '',
    fitnessCertificateNo: '',
    insurancePolicyNo: ''
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
    setLoading(true);
    setError(null);

    try {
      // Create FormData object to send multipart/form-data
      const submitData = new FormData();
      
      // Append form fields
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });
      
      // Append files
      Object.keys(files).forEach(key => {
        if (files[key]) {
          submitData.append(key, files[key]);
        }
      });

      await registerDriver(submitData);
      setLoading(false);
      alert('Driver registered successfully!');
      navigate('/admin/drivers');
    } catch (err) {
      setError(err.error || 'Failed to register driver');
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Manual Driver Registration</h1>
      <Link to="/admin">Back to Admin Dashboard</Link>
      
      {error && <div style={{ color: 'red' }}>{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div>
          <label>Full Name</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
          />
        </div>
        
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
          <label>Aadhaar Number</label>
          <input
            type="text"
            name="aadhaarNo"
            value={formData.aadhaarNo}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label>Aadhaar Photo</label>
          <input
            type="file"
            name="aadhaarPhoto"
            onChange={handleFileChange}
            required
          />
        </div>
        
        <div>
          <label>Vehicle Number</label>
          <input
            type="text"
            name="vehicleNo"
            value={formData.vehicleNo}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label>Registration Certificate Photo</label>
          <input
            type="file"
            name="registrationCertificatePhoto"
            onChange={handleFileChange}
            required
          />
        </div>
        
        <h3>Bank Details</h3>
        
        <div>
          <label>Account Holder Name</label>
          <input
            type="text"
            name="accountHolderName"
            value={formData.accountHolderName}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label>Account Number</label>
          <input
            type="text"
            name="accountNumber"
            value={formData.accountNumber}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label>IFSC Code</label>
          <input
            type="text"
            name="ifscCode"
            value={formData.ifscCode}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label>Bank Name</label>
          <input
            type="text"
            name="bankName"
            value={formData.bankName}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label>Driving License Number</label>
          <input
            type="text"
            name="drivingLicenseNo"
            value={formData.drivingLicenseNo}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label>Driving License Photo</label>
          <input
            type="file"
            name="drivingLicensePhoto"
            onChange={handleFileChange}
            required
          />
        </div>
        
        <div>
          <label>Permit Number</label>
          <input
            type="text"
            name="permitNo"
            value={formData.permitNo}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label>Permit Photo</label>
          <input
            type="file"
            name="permitPhoto"
            onChange={handleFileChange}
            required
          />
        </div>
        
        <div>
          <label>Fitness Certificate Number</label>
          <input
            type="text"
            name="fitnessCertificateNo"
            value={formData.fitnessCertificateNo}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label>Fitness Certificate Photo</label>
          <input
            type="file"
            name="fitnessCertificatePhoto"
            onChange={handleFileChange}
            required
          />
        </div>
        
        <div>
          <label>Insurance Policy Number</label>
          <input
            type="text"
            name="insurancePolicyNo"
            value={formData.insurancePolicyNo}
            onChange={handleChange}
            required
          />
        </div>
        
        <div>
          <label>Insurance Policy Photo</label>
          <input
            type="file"
            name="insurancePolicyPhoto"
            onChange={handleFileChange}
            required
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Register Driver'}
        </button>
      </form>
    </div>
  );
};

export default DriverRegistration;