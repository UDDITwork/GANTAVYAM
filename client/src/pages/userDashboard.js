import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { Autocomplete } from '@react-google-maps/api';
import './UserDashboard.css';
import moment from 'moment';
import { io } from 'socket.io-client';

const GOOGLE_MAPS_API_KEY = "AIzaSyDFbjmVJoi2wDzwJNR2rrowpSEtSes1jw4";

const libraries = ["places"];

const BOOTH_LOCATIONS = [
  {
    id: 1,
    name: "Booth 1",
    latitude: 26.92393656,
    longitude: 75.82674328
  },
  {
    id: 2,
    name: "Booth 2",
    latitude: 26.82582392,
    longitude: 75.80242345
  },
  {
    id: 3,
    name: "Booth 3",
    latitude: 26.86193047,
    longitude: 75.81190017
  }
];

const SOCKET_URL = 'http://localhost:5000';
let socket;

const UserDashboard = () => {
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [isBookingFlow, setIsBookingFlow] = useState(false);
  const [selectedBooth, setSelectedBooth] = useState(null);
  const [dropLocation, setDropLocation] = useState('');
  const [dropCoordinates, setDropCoordinates] = useState(null);
  const [fare, setFare] = useState(null);
  const [showFare, setShowFare] = useState(false);
  const [address, setAddress] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [isLoaded, setIsLoaded] = useState(false);
  const [autocomplete, setAutocomplete] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isRequestingRide, setIsRequestingRide] = useState(false);
  const [rideRequestStatus, setRideRequestStatus] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [rideHistory, setRideHistory] = useState([]);
  const [isLoadingRides, setIsLoadingRides] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [rideId, setRideId] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [directions, setDirections] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/user/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/user/login');
    }
  }, [navigate]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        try {
          const response = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
          );
          if (response.data.results[0]) {
            setAddress(response.data.results[0].formatted_address);
          }
        } catch (error) {
          console.error('Error getting address:', error);
        }
      },
      (error) => {
        console.error('Location access denied or failed', error);
        setLocationError('Location access denied or unavailable.');
      }
    );
  }, []);

  // Add window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleBookRide = () => {
    setIsBookingFlow(true);
  };

  const handleBoothSelect = (booth) => {
    setSelectedBooth(booth);
  };

  const onLoadScript = () => {
    setIsLoaded(true);
  };

  const onLoadAutocomplete = (autoComplete) => {
    setAutocomplete(autoComplete);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        setDropLocation(place.formatted_address);
        setDropCoordinates({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        });
      }
    }
  };

  const calculateFare = async () => {
    if (!selectedBooth || !dropCoordinates) {
      alert('Please select both pickup and drop locations');
      return;
    }

    try {
      // First, create the service
      const service = new window.google.maps.DistanceMatrixService();
      
      // Create the request
      const request = {
        origins: [{ lat: selectedBooth.latitude, lng: selectedBooth.longitude }],
        destinations: [{ lat: dropCoordinates.lat, lng: dropCoordinates.lng }],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.METRIC
      };

      // Get the distance matrix
      const response = await new Promise((resolve, reject) => {
        service.getDistanceMatrix(request, (response, status) => {
          if (status === 'OK') {
            resolve(response);
          } else {
            reject(new Error('Failed to calculate distance'));
          }
        });
      });

      // Check if we have valid results
      if (response.rows[0].elements[0].status === 'OK') {
        const distanceInMeters = response.rows[0].elements[0].distance.value;
        const distanceInKm = distanceInMeters / 1000;
        setDistance(distanceInKm);
        
        // Calculate fare: ₹10 per km with minimum fare of ₹50
        const calculatedFare = Math.max(50, Math.ceil(distanceInKm * 10));
        setFare(calculatedFare);
        setShowFare(true);
      } else {
        throw new Error('Could not calculate distance for the given locations');
      }
    } catch (error) {
      console.error('Error calculating fare:', error);
      alert('Failed to calculate fare. Please try again.');
    }
  };

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (!token) return;
    socket = io(SOCKET_URL, {
      auth: { token }
    });

    // Listen for driver acceptance
    socket.on('rideAccepted', (data) => {
      setDriverInfo({
        id: data.driverId,
        name: data.driverName,
        phone: data.driverPhone
      });
      setRideId(data.rideId);
      setIsTracking(true);
    });

    // Listen for real-time driver location updates
    socket.on('driverLocationUpdated', (data) => {
      if (data.rideId === rideId) {
        setDriverLocation(data.location);
      }
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const handleProceed = async () => {
    if (!selectedBooth || !dropCoordinates || !fare) return;
    setIsRequestingRide(true);
    setRideRequestStatus('sending');

    // Emit ride request via socket
    const rideRequest = {
      userName: user.name,
      userPhone: user.phone,
      pickupLocation: {
        latitude: selectedBooth.latitude,
        longitude: selectedBooth.longitude,
        boothName: selectedBooth.name
      },
      dropLocation: {
        latitude: dropCoordinates.lat,
        longitude: dropCoordinates.lng,
        address: dropLocation
      },
      distance: distance,
      fare: fare
    };
    try {
      socket.emit('userRideRequest', rideRequest, (ack) => {
        if (ack && ack.success) {
          setRideRequestStatus('sent');
        } else {
          setRideRequestStatus('error');
        }
      });
      // Fallback: if no ack, set to sent after short delay
      setTimeout(() => {
        if (rideRequestStatus === 'sending') setRideRequestStatus('sent');
      }, 2000);
    } catch (err) {
      setRideRequestStatus('error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('user');
    navigate('/user/login');
  };

  const handleProfilePhotoClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload an image file (JPEG, PNG, or GIF)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('profileImage', file);

      const token = localStorage.getItem('userToken');
      const response = await axios.post(
        'http://localhost:5000/api/users/profile-image',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        const updatedUser = { 
          ...user, 
          profileImage: response.data.profileImage 
        };
        setUser(updatedUser);
        setImageUrl(response.data.imageUrl);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Error uploading profile image:', error);
      alert('Failed to upload profile image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    if (activeTab === 'rides') {
      fetchRideHistory();
    }
  }, [activeTab]);

  const fetchRideHistory = async () => {
    try {
      setIsLoadingRides(true);
      const token = localStorage.getItem('userToken');
      const response = await axios.get('http://localhost:5000/api/ride-history/user-rides', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setRideHistory(response.data.rides);
      }
    } catch (error) {
      console.error('Error fetching ride history:', error);
    } finally {
      setIsLoadingRides(false);
    }
  };

  // Watch for driverLocation and update directions
  useEffect(() => {
    if (isTracking && driverLocation && selectedBooth) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: driverLocation,
          destination: {
            lat: selectedBooth.latitude,
            lng: selectedBooth.longitude
          },
          travelMode: window.google.maps.TravelMode.DRIVING
        },
        (result, status) => {
          if (status === 'OK') setDirections(result);
        }
      );
    }
  }, [isTracking, driverLocation, selectedBooth]);

  if (!user) return (
    <div className="loading-container">
      <div className="loader"></div>
      <p>Loading your dashboard...</p>
    </div>
  );

  const renderMainContent = () => {
    if (activeTab === 'home') {
      return (
        <LoadScript 
          googleMapsApiKey={GOOGLE_MAPS_API_KEY}
          libraries={libraries}
          onLoad={onLoadScript}
        >
          <div className="main-content">
            <div className="map-container">
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '400px' }}
                center={userLocation || { lat: 26.9124, lng: 75.7873 }}
                zoom={12}
              >
                {userLocation && (
                  <Marker
                    position={userLocation}
                    icon={{
                      url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                    }}
                  />
                )}
                {selectedBooth && (
                  <Marker
                    position={{ lat: selectedBooth.latitude, lng: selectedBooth.longitude }}
                    icon={{
                      url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                    }}
                  />
                )}
                {dropCoordinates && (
                  <Marker
                    position={dropCoordinates}
                    icon={{
                      url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
                    }}
                  />
                )}
              </GoogleMap>
            </div>

            <div className="location-info">
              <h3>Your Current Location</h3>
              <p>{address || 'Loading address...'}</p>
              {userLocation && (
                <p>
                  Latitude: {userLocation.lat.toFixed(6)}<br />
                  Longitude: {userLocation.lng.toFixed(6)}
                </p>
              )}
            </div>

            {!isBookingFlow ? (
              <button className="book-ride-btn" onClick={handleBookRide}>
                BOOK RIDE
              </button>
            ) : (
              <div className="booking-flow">
                <h3>Select Pickup Location</h3>
                <div className="booth-options">
                  {BOOTH_LOCATIONS.map(booth => (
                    <div
                      key={booth.id}
                      className={`booth-option ${selectedBooth?.id === booth.id ? 'selected' : ''}`}
                      onClick={() => handleBoothSelect(booth)}
                    >
                      <h4>{booth.name}</h4>
                      <p>Latitude: {booth.latitude}</p>
                      <p>Longitude: {booth.longitude}</p>
                    </div>
                  ))}
                </div>

                {selectedBooth && (
                  <div className="drop-location">
                    <h3>Enter Drop Location</h3>
                    {isLoaded && (
                      <Autocomplete
                        onLoad={onLoadAutocomplete}
                        onPlaceChanged={onPlaceChanged}
                      >
                        <input
                          type="text"
                          placeholder="Enter drop location address"
                          value={dropLocation}
                          onChange={(e) => setDropLocation(e.target.value)}
                          className="drop-input"
                        />
                      </Autocomplete>
                    )}
                    {dropCoordinates && (
                      <button className="calculate-fare-btn" onClick={calculateFare}>
                        Calculate Fare
                      </button>
                    )}
                  </div>
                )}

                {showFare && fare && (
                  <div className="fare-display">
                    <h3>Ride Summary</h3>
                    <div className="fare-details">
                      <p>Distance: {distance?.toFixed(2)} km</p>
                      <p className="fare-amount">Fare: ₹{fare}</p>
                    </div>
                    {!isRequestingRide ? (
                      <button className="proceed-btn" onClick={handleProceed}>
                        Proceed
                      </button>
                    ) : (
                      <div className="request-status">
                        {rideRequestStatus === 'sending' && (
                          <p>Sending ride request to drivers...</p>
                        )}
                        {rideRequestStatus === 'sent' && (
                          <p className="success-message">Ride request sent to drivers!</p>
                        )}
                        {rideRequestStatus === 'error' && (
                          <p className="error-message">Failed to send ride request. Please try again.</p>
                        )}
                        {rideRequestStatus === 'searching_driver' && (
                          <>
                            <div className="loader"></div>
                            <p>Looking for nearby drivers...</p>
                          </>
                        )}
                        {rideRequestStatus === 'driver_found' && (
                          <p className="success-message">Driver found! Redirecting...</p>
                        )}
                        {rideRequestStatus === 'no_driver' && (
                          <>
                            <p className="error-message">No drivers available right now.</p>
                            <button className="retry-btn" onClick={handleProceed}>
                              Try Again
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </LoadScript>
      );
    } else if (activeTab === 'profile') {
      return (
        <div className="profile-content">
          <h2>My Profile</h2>
          <div className="profile-details">
            <div className="detail-item">
              <label>Name</label>
              <p>{user.name}</p>
            </div>
            <div className="detail-item">
              <label>Email</label>
              <p>{user.email}</p>
            </div>
            <div className="detail-item">
              <label>Phone</label>
              <p>{user.phone}</p>
            </div>
          </div>
        </div>
      );
    } else if (activeTab === 'rides') {
      return (
        <div className="rides-content">
          <h2>My Rides</h2>
          {isLoadingRides ? (
            <div className="loading-spinner"></div>
          ) : rideHistory.length === 0 ? (
            <p>No ride history available yet.</p>
          ) : (
            <div className="ride-history-list">
              {rideHistory.map((ride) => (
                <div key={ride._id} className="ride-history-item">
                  <div className="ride-header">
                    <span className="ride-date">
                      {moment(ride.timestamp).format('MMM DD, YYYY - hh:mm A')}
                    </span>
                    <span className={`ride-status ${ride.status.toLowerCase()}`}>
                      {ride.status}
                    </span>
                  </div>
                  <div className="ride-details">
                    <div className="location-details">
                      <div className="pickup">
                        <strong>Pickup:</strong> {ride.pickupLocation.boothName}
                      </div>
                      <div className="drop">
                        <strong>Drop:</strong> {ride.dropLocation.address}
                      </div>
                    </div>
                    <div className="ride-info">
                      <div className="info-item">
                        <strong>Distance:</strong> {ride.distance.toFixed(2)} km
                      </div>
                      <div className="info-item">
                        <strong>Fare:</strong> ₹{ride.fare}
                      </div>
                    </div>
                    <div className="driver-info">
                      <div className="info-item">
                        <strong>Driver:</strong> {ride.driverName}
                      </div>
                      <div className="info-item">
                        <strong>Phone:</strong> {ride.driverPhone}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    } else if (activeTab === 'settings') {
      return (
        <div className="settings-content">
          <h2>Settings</h2>
          <div className="settings-options">
            <div className="setting-item">
              <h3>Notifications</h3>
              <label className="switch">
                <input type="checkbox" />
                <span className="slider round"></span>
              </label>
            </div>
            <div className="setting-item">
              <h3>Dark Mode</h3>
              <label className="switch">
                <input type="checkbox" />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        </div>
      );
    } else if (isTracking && driverLocation) {
      return (
        <div className="live-tracking-content">
          <h2>Driver is on the way!</h2>
          <p><strong>Driver:</strong> {driverInfo?.name} ({driverInfo?.phone})</p>
          <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries}>
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '400px' }}
              center={driverLocation}
              zoom={13}
            >
              <Marker position={driverLocation} label="Driver" />
              <Marker position={{ lat: selectedBooth.latitude, lng: selectedBooth.longitude }} label="Pickup" />
              {directions && <DirectionsRenderer directions={directions} />}
            </GoogleMap>
          </LoadScript>
        </div>
      );
    }
  };

  return (
    <div className="dashboard-container">
      {/* Hamburger Button */}
      <button 
        className={`hamburger-btn ${isSidebarOpen ? 'active' : ''}`}
        onClick={toggleSidebar}
        aria-label="Toggle menu"
      >
        <div className="hamburger-line"></div>
        <div className="hamburger-line"></div>
        <div className="hamburger-line"></div>
      </button>

      {/* Sidebar */}
      <div className={`sidebar ${!isSidebarOpen ? 'closed' : ''}`}>
        <div className="profile-section">
          <div className="profile-photo-container" onClick={handleProfilePhotoClick}>
            {user.profileImage ? (
              <img
                src={imageUrl || `http://localhost:5000/${user.profileImage}`}
                alt="Profile"
                className="profile-photo"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
                }}
              />
            ) : (
              <div className="profile-placeholder">
                {user.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="profile-photo-overlay">
              <span>Click to change photo</span>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/gif"
            style={{ display: 'none' }}
          />
          <h3>{user.name}</h3>
        </div>

        <nav className="dashboard-nav">
          <button 
            className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('home');
              if (window.innerWidth <= 768) {
                setIsSidebarOpen(false);
              }
            }}
          >
            Home
          </button>
          <button 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('profile');
              if (window.innerWidth <= 768) {
                setIsSidebarOpen(false);
              }
            }}
          >
            Profile
          </button>
          <button 
            className={`nav-item ${activeTab === 'rides' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('rides');
              if (window.innerWidth <= 768) {
                setIsSidebarOpen(false);
              }
            }}
          >
            My Rides
          </button>
          <button 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('settings');
              if (window.innerWidth <= 768) {
                setIsSidebarOpen(false);
              }
            }}
          >
            Settings
          </button>
          <button 
            className="nav-item logout"
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className={`main-content ${!isSidebarOpen ? 'expanded' : ''}`}>
        <div className="content-wrapper">
          {isUploading && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
            </div>
          )}
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
