import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix for default marker icon in leaflet
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const DriverProfile = () => {
  const [driver, setDriver] = useState(null);
  const [location, setLocation] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const driverId = JSON.parse(localStorage.getItem('driver')).id;

        const res = await axios.get(`http://localhost:5000/api/drivers/profile/${driverId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setDriver(res.data.data);
        setDarkMode(res.data.data.preferences?.darkMode || false);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch profile');
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    // Get and update location
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setLocation(newLocation);

          // Update location in backend
          try {
            const token = localStorage.getItem('token');
            const driverId = JSON.parse(localStorage.getItem('driver')).id;
            await axios.put(
              `http://localhost:5000/api/drivers/${driverId}/location`,
              newLocation,
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );
          } catch (err) {
            console.error('Failed to update location:', err);
          }
        },
        (err) => console.error('Location error:', err),
        { enableHighAccuracy: true }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const toggleDarkMode = async () => {
    try {
      const token = localStorage.getItem('token');
      const driverId = JSON.parse(localStorage.getItem('driver')).id;
      
      await axios.put(
        `http://localhost:5000/api/drivers/${driverId}/preferences`,
        { darkMode: !darkMode },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setDarkMode(!darkMode);
      // Apply dark mode to body
      document.body.classList.toggle('dark-mode');
    } catch (err) {
      console.error('Failed to update preferences:', err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!driver) return <div>No profile data found</div>;

  return (
    <div className={darkMode ? 'dark-mode' : ''}>
      <h1>Driver Profile</h1>
      
      <button onClick={toggleDarkMode}>
        {darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      </button>

      <div className="profile-section">
        <h2>Personal Information</h2>
        <p><strong>Name:</strong> {driver.fullName}</p>
        <p><strong>Mobile:</strong> {driver.mobileNo}</p>
        <p><strong>Aadhaar:</strong> {driver.aadhaarNo}</p>
        <p><strong>Vehicle No:</strong> {driver.vehicleNo}</p>
      </div>

      <div className="bank-details">
        <h2>Bank Details</h2>
        <p><strong>Account Holder:</strong> {driver.bankDetails?.accountHolderName}</p>
        <p><strong>Account Number:</strong> {driver.bankDetails?.accountNumber}</p>
        <p><strong>IFSC Code:</strong> {driver.bankDetails?.ifscCode}</p>
        <p><strong>Bank Name:</strong> {driver.bankDetails?.bankName}</p>
      </div>

      <div className="documents">
        <h2>Documents</h2>
        <p><strong>Driving License:</strong> {driver.drivingLicenseNo}</p>
        <p><strong>Permit Number:</strong> {driver.permitNo}</p>
        <p><strong>Fitness Certificate:</strong> {driver.fitnessCertificateNo}</p>
        <p><strong>Insurance Policy:</strong> {driver.insurancePolicyNo}</p>
      </div>

      {location && (
        <div className="location-section">
          <h2>Current Location</h2>
          <p>Latitude: {location.latitude}</p>
          <p>Longitude: {location.longitude}</p>
          
          <div style={{ height: '400px', width: '100%', marginTop: '20px' }}>
            <MapContainer
              center={[location.latitude, location.longitude]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Marker position={[location.latitude, location.longitude]}>
                <Popup>
                  You are here!
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverProfile;
