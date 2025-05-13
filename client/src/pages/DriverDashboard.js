import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { initializeSocket, getSocket, disconnectSocket } from '../services/socket';
import './DriverDashboard.css';
import axios from 'axios';

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
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const watchId = useRef(null);

  // Notification Toast component
  const NotificationToast = ({ type, message }) => {
    return (
      <div className={`notification-toast ${type}`}>
        <p>{message}</p>
      </div>
    );
  };

  // Auth & profile fetch
  useEffect(() => {
    console.log('[DriverDashboard] Checking authentication...');
    const token = localStorage.getItem('driverToken');
    const driverData = localStorage.getItem('driver');
    
    if (!token || !driverData) {
      console.log('[DriverDashboard] No authentication data found');
      navigate('/driver/login');
      return;
    }
    
    try {
      const parsedDriver = JSON.parse(driverData);
      console.log('[DriverDashboard] Driver loaded:', parsedDriver);
      setDriver(parsedDriver);
    } catch (error) {
      console.error('[DriverDashboard] Error parsing driver data:', error);
      navigate('/driver/login');
    }
  }, [navigate]);

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('driverToken');
    if (!token || !driver) {
      console.log('[DriverDashboard] Waiting for token and driver data');
      return;
    }
    // Initialize socket only once
    if (!socket) {
      console.log('[DriverDashboard] Initializing socket connection...');
      const socketInstance = initializeSocket(token);
      if (socketInstance) {
        setSocket(socketInstance);
        // Setup event listeners (only once)
        socketInstance.on('connect', () => {
          console.log('✅ [DriverDashboard] Socket connected');
          setConnectionStatus('connected');
          // Update online status when connected
          if (isOnline) {
            socketInstance.emit('updateDriverStatus', {
              isOnline: true,
              location: userLocation
            });
          }
        });
        socketInstance.on('connectionSuccess', (data) => {
          console.log('✅ [DriverDashboard] Connection confirmed:', data);
        });
        socketInstance.on('connect_error', (error) => {
          console.error('❌ [DriverDashboard] Connection error:', error);
          setConnectionStatus('error');
        });
        socketInstance.on('disconnect', (reason) => {
          console.log('⚠️ [DriverDashboard] Disconnected:', reason);
          setConnectionStatus('disconnected');
        });
        // Listen for ride requests
        socketInstance.on('newRideRequest', (data) => {
          console.log('[DriverDashboard] New ride request:', data);
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
            return [...prev, rideRequest];
          });
          setNotificationToast({
            type: 'info',
            message: `New ride request from ${data.userName}`
          });
          setTimeout(() => setNotificationToast(null), 5000);
        });
        socketInstance.on('rideRequestClosed', ({ rideId }) => {
          console.log('[DriverDashboard] Ride request closed:', rideId);
          setRideRequests(prev => prev.filter(r => r._id !== rideId));
        });
        socketInstance.on('rideAcceptConfirmed', (data) => {
          console.log('[DriverDashboard] Ride accept confirmed:', data);
          if (data.success) {
            setNotificationToast({
              type: 'success',
              message: 'Ride accepted successfully!'
            });
            setTimeout(() => setNotificationToast(null), 3000);
          }
        });
        socketInstance.on('rideAcceptError', (error) => {
          console.error('[DriverDashboard] Ride accept error:', error);
          setNotificationToast({
            type: 'error',
            message: error.message || 'Failed to accept ride'
          });
          setTimeout(() => setNotificationToast(null), 5000);
        });
        socketInstance.on('statusUpdated', (data) => {
          console.log('[DriverDashboard] Status update confirmation:', data);
        });
        // Additional event listeners for ride cancellation and location update errors
        socketInstance.on('rideCancelled', (data) => {
          console.log('[DriverDashboard] Ride cancelled:', data);
          if (activeRide && activeRide._id === data.rideId) {
            setActiveRide(null);
            setNotificationToast({
              type: 'warning',
              message: `Ride cancelled by ${data.cancelledBy}: ${data.reason || 'No reason provided'}`
            });
            // Stop location updates
            if (watchId.current) {
              navigator.geolocation.clearWatch(watchId.current);
              watchId.current = null;
            }
          }
          setTimeout(() => setNotificationToast(null), 5000);
        });
        socketInstance.on('locationUpdateError', (error) => {
          console.error('[DriverDashboard] Location update error:', error);
          setNotificationToast({
            type: 'error',
            message: 'Failed to update location. Please check GPS.'
          });
          setTimeout(() => setNotificationToast(null), 3000);
        });
      }
    }
    // Cleanup
    return () => {
      // Don't disconnect socket on effect cleanup
    };
  }, [driver]);

  // Enhanced accept ride function with better error handling
  const acceptRide = (ride) => {
    console.log('[DriverDashboard] Accepting ride:', ride);
    if (!socket || !driver) {
      console.error('[DriverDashboard] Cannot accept ride: no socket or driver data');
      setNotificationToast({
        type: 'error',
        message: 'Connection error. Please refresh the page.'
      });
      return;
    }
    const vehicleDetails = {
      make: driver.vehicleDetails?.make || 'Unknown',
      model: driver.vehicleDetails?.model || 'Model',
      licensePlate: driver.vehicleDetails?.licensePlate || driver.vehicleNo || 'XX-0000',
      color: driver.vehicleDetails?.color || 'Unknown'
    };
    console.log('[DriverDashboard] Sending acceptance with details:', {
      rideId: ride._id,
      driverId: driver._id || driver.id,
      vehicleDetails
    });
    socket.emit('driverAcceptRide', {
      rideId: ride._id,
      driverId: driver._id || driver.id,
      driverName: driver.fullName || driver.name,
      driverPhone: driver.mobileNo || driver.phone,
      driverPhoto: driver.profileImage || null,
      driverRating: driver.rating || 4.5,
      vehicleDetails,
      currentLocation: userLocation,
      timestamp: new Date().toISOString()
    });
    setActiveRide(ride);
    setRideRequests([]);
    startLocationUpdates(ride._id);
    console.log('[DriverDashboard] Ride acceptance sent, waiting for confirmation...');
  };

  // Add ride cancellation function
  const cancelRide = () => {
    if (!activeRide || !socket) return;
    console.log('[DriverDashboard] Cancelling ride:', activeRide._id);
    socket.emit('cancelRide', {
      rideId: activeRide._id,
      reason: 'Driver cancelled'
    });
    setActiveRide(null);
    setNotificationToast({
      type: 'info',
      message: 'Ride cancelled'
    });
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  };

  // Enhanced location updates with error handling
  const startLocationUpdates = (rideId) => {
    console.log('[DriverDashboard] Starting location updates for ride:', rideId);
    if (!navigator.geolocation) {
      console.error('[DriverDashboard] Geolocation not available');
      setNotificationToast({
        type: 'error',
        message: 'GPS not available on this device'
      });
      return;
    }
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    let lastLocationTime = Date.now();
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastLocationTime < 5000) return;
        lastLocationTime = now;
        const location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        console.log(`[DriverDashboard] Sending location update: ${location.lat}, ${location.lng}`);
        setUserLocation(location);
        if (socket && socket.connected) {
          socket.emit('updateDriverLocation', {
            location,
            rideId,
            timestamp: new Date().toISOString(),
            bearing: pos.coords.heading || 0,
            speed: pos.coords.speed || 0,
            accuracy: pos.coords.accuracy
          });
        } else {
          console.error('[DriverDashboard] Socket not connected for location update');
          setNotificationToast({
            type: 'warning',
            message: 'Connection lost. Trying to reconnect...'
          });
        }
      },
      (err) => {
        console.error('[DriverDashboard] Geolocation error:', err);
        setNotificationToast({
          type: 'error',
          message: `Location error: ${err.message}`
        });
        // Don't clear the watch, keep trying
      },
      { 
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      }
    );
  };

  // Geolocation: always track driver location
  useEffect(() => {
    if (!navigator.geolocation) return;
    
    console.log('[DriverDashboard] Setting up geolocation tracking');
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
      (err) => console.error('[DriverDashboard] Geolocation error:', err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
    
    return () => {
      if (watchId.current) {
        console.log('[DriverDashboard] Clearing geolocation watch');
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [activeRide, socket]);

  // Directions to pickup
  useEffect(() => {
    if (!activeRide || !userLocation || !window.google) {
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
        if (status === 'OK') {
          setDirections(result);
        }
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

  // Status toggle with socket update
  const handleStatusToggle = () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    
    console.log('[DriverDashboard] Toggling online status to:', newStatus);
    
    if (socket) {
      socket.emit('updateDriverStatus', {
        isOnline: newStatus,
        location: userLocation
      });
    }
  };

  // Logout
  const handleLogout = () => {
    console.log('[DriverDashboard] Logging out...');
    
    // Update status to offline before logout
    if (socket) {
      socket.emit('updateDriverStatus', {
        isOnline: false,
        location: userLocation
      });
    }
    
    // Clear local storage
    localStorage.removeItem('driver');
    localStorage.removeItem('driverToken');
    
    // Disconnect socket
    disconnectSocket();
    
    // Navigate to login
    navigate('/driver/login');
  };

  // Profile
  const goToProfile = () => {
    setShowProfile(true);
  };
  
  const closeProfile = () => {
    setShowProfile(false);
  };

  // Add declineRide function
  const declineRide = (rideId) => {
    console.log('[DriverDashboard] Declining ride:', rideId);
    setRideRequests((prev) => prev.filter(r => r._id !== rideId));
  };

  // If loading
  if (!driver) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="driver-dashboard-container">
      {notificationToast && <NotificationToast {...notificationToast} />}
      
      <div className="driver-header">
        <h2>Driver Dashboard</h2>
        <div className="header-actions">
          <span className={`connection-status ${connectionStatus}`}>
            {connectionStatus === 'connected' ? '🟢' : connectionStatus === 'error' ? '🔴' : '🟡'}
          </span>
          <button onClick={goToProfile}>Profile</button>
          <button onClick={handleLogout}>Logout</button>
          <button 
            onClick={handleStatusToggle} 
            className={`status-toggle ${isOnline ? 'online' : 'offline'}`}
          >
            {isOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
      </div>
      
      {showProfile && driver && (
        <div className="driver-profile-modal">
          <div className="modal-content">
            <h3>My Profile</h3>
            <p><strong>Name:</strong> {driver.fullName || driver.name}</p>
            <p><strong>Phone:</strong> {driver.mobileNo || driver.phone}</p>
            <p><strong>Email:</strong> {driver.email || 'N/A'}</p>
            <p><strong>Status:</strong> {isOnline ? 'Online' : 'Offline'}</p>
            <button onClick={closeProfile}>Close</button>
          </div>
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
              <Marker 
                position={{ 
                  lat: activeRide.pickupLocation.latitude, 
                  lng: activeRide.pickupLocation.longitude 
                }} 
                label="Pickup" 
              />
            )}
            {directions && <DirectionsRenderer directions={directions} />}
          </GoogleMap>
        </LoadScript>
      </div>
      
      <div className="connection-info">
        {connectionStatus === 'disconnected' && (
          <div className="alert alert-warning">
            ⚠️ Connecting to server...
          </div>
        )}
        {connectionStatus === 'error' && (
          <div className="alert alert-error">
            ❌ Connection error. Please refresh the page.
          </div>
        )}
        {connectionStatus === 'connected' && !isOnline && (
          <div className="alert alert-info">
            💡 You are offline. Go online to receive ride requests.
          </div>
        )}
      </div>
      
      {activeRide ? (
        <div className="active-ride-section">
          <h3>Active Ride</h3>
          <div className="ride-info">
            <p><strong>User:</strong> {activeRide.userName}</p>
            <p><strong>Phone:</strong> {activeRide.userPhone}</p>
            <p><strong>Pickup:</strong> {activeRide.pickupLocation.boothName}</p>
            <p><strong>Drop:</strong> {activeRide.dropLocation.address}</p>
            <p><strong>Fare:</strong> ₹{activeRide.fare}</p>
            <p><strong>Distance:</strong> {activeRide.distance} km</p>
            {userLocation && (
              <p><strong>Distance to Pickup:</strong> {getDistanceToPickup(activeRide.pickupLocation)} km</p>
            )}
          </div>
          <div className="ride-actions">
            <button className="complete-btn">Mark as Picked Up</button>
            <button className="complete-btn">Complete Ride</button>
          </div>
        </div>
      ) : (
        <div className="ride-requests-section">
          <h3>Incoming Ride Requests</h3>
          {!isOnline ? (
            <div className="no-requests">
              <p>Go online to start receiving ride requests</p>
            </div>
          ) : rideRequests.length === 0 ? (
            <div className="no-requests">
              <p>Waiting for ride requests...</p>
              <div className="pulse-animation"></div>
            </div>
          ) : (
            <div className="ride-requests-list">
              {rideRequests.map((ride) => (
                <div key={ride._id} className="ride-request-card">
                  <div className="ride-request-header">
                    <h4>{ride.userName}</h4>
                    <span className="fare">₹{ride.fare}</span>
                  </div>
                  <div className="ride-request-details">
                    <p><strong>Phone:</strong> {ride.userPhone}</p>
                    <p><strong>Pickup:</strong> {ride.pickupLocation.boothName}</p>
                    <p><strong>Drop:</strong> {ride.dropLocation.address}</p>
                    <p><strong>Distance:</strong> {ride.distance} km</p>
                    {userLocation && (
                      <p><strong>Distance to Pickup:</strong> {getDistanceToPickup(ride.pickupLocation)} km</p>
                    )}
                  </div>
                  <div className="ride-request-actions">
                    <button 
                      onClick={() => acceptRide(ride)} 
                      className="accept-btn"
                    >
                      Accept
                    </button>
                    <button 
                      onClick={() => declineRide(ride._id)} 
                      className="decline-btn"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;