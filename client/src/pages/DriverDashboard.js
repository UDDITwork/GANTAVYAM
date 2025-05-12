import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';

const SOCKET_URL = 'http://localhost:5000';
const GOOGLE_MAPS_API_KEY = 'AIzaSyDFbjmVJoi2wDzwJNR2rrowpSEtSes1jw4';
const libraries = ['places'];

const DriverDashboard = () => {
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [driver, setDriver] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [rideRequests, setRideRequests] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [notificationToast, setNotificationToast] = useState(null);
  const watchId = useRef(null);

  // Auth & profile fetch
  useEffect(() => {
    const token = localStorage.getItem('driverToken');
    if (!token) {
      navigate('/driver/login');
      return;
    }
    const stored = JSON.parse(localStorage.getItem('driver'));
    if (stored) {
      setDriver(stored);
    } else {
      navigate('/driver/login');
    }
  }, [navigate]);

  // Debug: Log and decode driver token from localStorage
  useEffect(() => {
    const token = localStorage.getItem('driverToken');
    console.log('Driver token from localStorage:', token);
    if (token) {
      try {
        // Decode token to check structure (client-side only, no verification)
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        console.log('Decoded token (client-side):', JSON.parse(jsonPayload));
      } catch (e) {
        console.error('Error decoding token:', e);
      }
    }
  }, []);

  // Connect to socket
  useEffect(() => {
    const token = localStorage.getItem('driverToken');
    if (!token) return;
    
    const sock = io('http://localhost:5000', {
      auth: { token }
    });
    
    setSocket(sock);
    
    sock.on('connect', () => {
      console.log('Driver socket connected successfully with ID:', sock.id);
    });
    
    // Updated newRideRequest handler
    sock.on('newRideRequest', (data) => {
      console.log('Received new ride request:', data);
      const rideRequest = {
        _id: data._id || data.id,
        userId: data.userId,
        userName: data.userName,
        userPhone: data.userPhone,
        pickupLocation: data.pickupLocation,
        dropLocation: data.dropLocation,
        fare: data.fare,
        distance: data.distance,
        timestamp: data.timestamp || new Date().toISOString()
      };
      setRideRequests(prev => {
        const exists = prev.some(r => r._id === rideRequest._id);
        if (exists) return prev;
        console.log('Adding new ride request to UI:', rideRequest);
        return [...prev, rideRequest];
      });
    });
    
    sock.on('rideTaken', ({ rideId }) => {
      console.log('Ride taken, removing from available requests:', rideId);
      setRideRequests(prev => prev.filter(r => r._id !== rideId));
    });
    
    sock.on('connect_error', (error) => {
      console.error('Socket connection error details:', error.message);
    });

    sock.on('disconnect', () => {
      console.log('Driver socket disconnected');
    });
    sock.on('error', (err) => {
      console.error('Socket error:', err);
    });
    return () => {
      sock.disconnect();
      setSocket(null);
    };
  }, [isOnline]);

  // Debug: Log rideRequests state
  useEffect(() => {
    console.log('Current ride requests state:', rideRequests);
  }, [rideRequests]);

  // Accept/Decline ride
  const acceptRide = (ride) => {
    if (!socket || !driver) return;
    
    const vehicleDetails = {
      make: driver.vehicleDetails?.make,
      model: driver.vehicleDetails?.model,
      licensePlate: driver.vehicleDetails?.licensePlate
    };

    socket.emit('driverAcceptRide', {
      rideId: ride._id,
      driverId: driver._id,
      driverName: driver.name,
      driverPhone: driver.phone,
      vehicleDetails
    });

    // Listen for acceptance confirmation
    socket.once('rideAcceptConfirmed', (response) => {
      if (response.success) {
        setActiveRide(ride);
        setRideRequests([]);
        // Start sending location updates
        startLocationUpdates(ride._id);
      }
    });

    // Listen for errors
    socket.once('rideAcceptError', (error) => {
      console.error('Failed to accept ride:', error.message);
      setNotificationToast({
        type: 'error',
        message: error.message
      });
    });
  };

  const declineRide = (rideId) => {
    setRideRequests((prev) => prev.filter(r => r._id !== rideId));
  };

  // Start sending location updates
  const startLocationUpdates = (rideId) => {
    if (!navigator.geolocation) return;
    
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setUserLocation(location);
        
        if (socket) {
          socket.emit('updateDriverLocation', {
            location,
            rideId
          });
        }
      },
      (err) => console.error('Geolocation error:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  };

  // Geolocation: always track driver location
  useEffect(() => {
    if (!navigator.geolocation) return;
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setUserLocation(location);
        if (activeRide && socket) {
          socket.emit('updateDriverLocation', {
            location,
            rideId: activeRide._id
          });
        }
      },
      (err) => console.error('Geolocation error:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [activeRide, socket]);

  // Directions to pickup
  useEffect(() => {
    if (!activeRide || !userLocation) {
      setDirections(null);
      return;
    }
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: userLocation,
        destination: {
          lat: activeRide.pickupLocation.latitude,
          lng: activeRide.pickupLocation.longitude
        },
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === 'OK') setDirections(result);
      }
    );
  }, [activeRide, userLocation]);

  // Calculate distance to pickup
  const getDistanceToPickup = (pickup) => {
    if (!userLocation) return null;
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(pickup.latitude - userLocation.lat);
    const dLon = toRad(pickup.longitude - userLocation.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(userLocation.lat)) *
        Math.cos(toRad(pickup.latitude)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  // Status toggle
  const handleStatusToggle = () => {
    setIsOnline((prev) => !prev);
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('driver');
    localStorage.removeItem('driverToken');
    navigate('/driver/login');
  };

  // Profile
  const goToProfile = () => {
    setShowProfile(true);
  };
  const closeProfile = () => {
    setShowProfile(false);
  };

  return (
    <div className="driver-dashboard-container">
      <div className="driver-header">
        <h2>Driver Dashboard</h2>
        <button onClick={goToProfile}>Profile</button>
        <button onClick={handleLogout}>Logout</button>
        <button onClick={handleStatusToggle} style={{ background: isOnline ? '#28a745' : '#dc3545', color: 'white' }}>
          {isOnline ? 'Go Offline' : 'Go Online'}
        </button>
      </div>
      {showProfile && driver && (
        <div className="driver-profile-modal">
          <h3>My Profile</h3>
          <p><strong>Name:</strong> {driver.name}</p>
          <p><strong>Phone:</strong> {driver.phone}</p>
          <p><strong>Email:</strong> {driver.email}</p>
          <button onClick={closeProfile}>Close</button>
        </div>
      )}
      <div className="driver-map-section">
        <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries}>
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '350px' }}
            center={userLocation || { lat: 26.9124, lng: 75.7873 }}
            zoom={13}
          >
            {userLocation && <Marker position={userLocation} label="You" />}
            {activeRide && (
              <Marker position={{ lat: activeRide.pickupLocation.latitude, lng: activeRide.pickupLocation.longitude }} label="Pickup" />
            )}
            {directions && <DirectionsRenderer directions={directions} />}
          </GoogleMap>
        </LoadScript>
      </div>
      {!socket && (
        <div style={{ color: 'red', marginTop: 10 }}>
          Socket not connected. Please check your network or authentication.
        </div>
      )}
      {rideRequests.length === 0 && socket && (
        <div style={{ color: 'orange', marginTop: 10 }}>
          No ride requests received yet. Waiting for new requests...
        </div>
      )}
      {activeRide ? (
        <div className="active-ride-section">
          <h3>Active Ride</h3>
          <p><strong>User:</strong> {activeRide.userName}</p>
          <p><strong>Pickup:</strong> {activeRide.pickupLocation.boothName}</p>
          <p><strong>Drop:</strong> {activeRide.dropLocation.address}</p>
          <p><strong>Fare:</strong> ₹{activeRide.fare}</p>
          <p><strong>Distance to Pickup:</strong> {getDistanceToPickup(activeRide.pickupLocation)} km</p>
        </div>
      ) : (
        <div className="ride-requests-section">
          <h3>Incoming Ride Requests</h3>
          {rideRequests.length === 0 ? <p>No requests yet.</p> : rideRequests.map((ride) => (
            <div key={ride._id} className="ride-request-card">
              <p><strong>User:</strong> {ride.userName}</p>
              <p><strong>Pickup:</strong> {ride.pickupLocation.boothName}</p>
              <p><strong>Drop:</strong> {ride.dropLocation.address}</p>
              <p><strong>Fare:</strong> ₹{ride.fare}</p>
              <p><strong>Distance to Pickup:</strong> {getDistanceToPickup(ride.pickupLocation)} km</p>
              <button onClick={() => acceptRide(ride)} style={{ background: '#28a745', color: 'white', marginRight: 8 }}>Accept</button>
              <button onClick={() => declineRide(ride._id)} style={{ background: '#dc3545', color: 'white' }}>Decline</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
