// client/src/pages/DriverDetails.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDriverById } from '../services/api';

const DriverDetails = () => {
  const { id } = useParams();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDriver = async () => {
      try {
        const response = await getDriverById(id);
        setDriver(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching driver:', err);
        setError('Failed to fetch driver details');
        setLoading(false);
      }
    };

    fetchDriver();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!driver) return <div>Driver not found</div>;

  const renderDocument = (title, base64Data) => {
    if (!base64Data) return null;

    return (
      <div className="document-item" style={{ marginBottom: '20px' }}>
        <p><strong>{title}:</strong></p>
        <img 
          src={base64Data}
          alt={title} 
          style={{ 
            maxWidth: '300px',
            maxHeight: '300px',
            border: '1px solid #ddd', 
            borderRadius: '4px', 
            padding: '5px',
            objectFit: 'contain'
          }} 
          onError={(e) => {
            console.error(`Failed to load image for ${title}`);
            e.target.style.display = 'none';
          }}
        />
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Driver Details</h1>
      <Link to="/admin/drivers" style={{ marginBottom: '20px', display: 'block' }}>
        Back to Drivers List
      </Link>
      
      <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
        <h2>{driver.fullName}</h2>
        <p><strong>Mobile:</strong> {driver.mobileNo}</p>
        <p><strong>Aadhaar No:</strong> {driver.aadhaarNo}</p>
        <p><strong>Vehicle No:</strong> {driver.vehicleNo}</p>
        
        <h3>Bank Details</h3>
        <p><strong>Account Holder:</strong> {driver.bankDetails?.accountHolderName}</p>
        <p><strong>Account Number:</strong> {driver.bankDetails?.accountNumber}</p>
        <p><strong>IFSC Code:</strong> {driver.bankDetails?.ifscCode}</p>
        <p><strong>Bank Name:</strong> {driver.bankDetails?.bankName}</p>
        
        <h3>License Information</h3>
        <p><strong>Driving License No:</strong> {driver.drivingLicenseNo}</p>
        <p><strong>Permit No:</strong> {driver.permitNo}</p>
        <p><strong>Fitness Certificate No:</strong> {driver.fitnessCertificateNo}</p>
        <p><strong>Insurance Policy No:</strong> {driver.insurancePolicyNo}</p>
        
        <h3>Documents</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {renderDocument('Aadhaar Card', driver.aadhaarPhoto)}
          {renderDocument('Registration Certificate', driver.registrationCertificatePhoto)}
          {renderDocument('Driving License', driver.drivingLicensePhoto)}
          {renderDocument('Permit', driver.permitPhoto)}
          {renderDocument('Fitness Certificate', driver.fitnessCertificatePhoto)}
          {renderDocument('Insurance Policy', driver.insurancePolicyPhoto)}
        </div>
      </div>
    </div>
  );
};

export default DriverDetails;