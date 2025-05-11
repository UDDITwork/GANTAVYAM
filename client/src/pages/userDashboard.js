import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, LoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { Autocomplete } from '@react-google-maps/api';
import './UserDashboard.css';
import moment from 'moment';
import { io } from 'socket.io-client';
import { debounce } from 'lodash';

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
  const [estimatedArrivalTime, setEstimatedArrivalTime] = useState(null);
  const [distanceToPickup, setDistanceToPickup] = useState(null);
  const [previousDriverLocation, setPreviousDriverLocation] = useState(null);
  const [isDriverMoving, setIsDriverMoving] = useState(false);
  const [remainingRoute, setRemainingRoute] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [driverRating, setDriverRating] = useState(null);
  const [vehicleInfo, setVehicleInfo] = useState(null);
  const [notificationToast, setNotificationToast] = useState(null);
  const [isLocationAvailable, setIsLocationAvailable] = useState(true);
  const [locationErrorCount, setLocationErrorCount] = useState(0);
  const [mapRef, setMapRef] = useState(null);
  const [driverBearing, setDriverBearing] = useState(null);
  const [trafficData, setTrafficData] = useState(null);
  const [isTrafficEnabled, setIsTrafficEnabled] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketError, setSocketError] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showContactDriver, setShowContactDriver] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isChatLoading, setIsChatLoading] = useState(false);

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

  // Add socket connection management
  useEffect(() => {
    const connectSocket = () => {
      const token = localStorage.getItem('userToken');
      if (!token) return;

      socket = io(SOCKET_URL, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      socket.on('connect', () => {
        setSocketConnected(true);
        setSocketError(null);
      });

      socket.on('connect_error', (error) => {
        setSocketConnected(false);
        setSocketError('Connection failed. Retrying...');
      });

      socket.on('disconnect', () => {
        setSocketConnected(false);
        setSocketError('Connection lost. Reconnecting...');
      });

      // Listen for driver acceptance
      socket.on('rideAccepted', (data) => {
        setDriverInfo({
          id: data.driverId,
          name: data.driverName,
          phone: data.driverPhone,
          photo: data.driverPhoto,
          rating: data.driverRating
        });
        setVehicleInfo({
          make: data.vehicleMake,
          model: data.vehicleModel,
          licensePlate: data.licensePlate
        });
        setRideId(data.rideId);
        setIsTracking(true);
        setRideRequestStatus('driver_found');
        
        // Show notification toast
        setNotificationToast({
          type: 'success',
          message: `🎉 Your ride has been accepted by ${data.driverName} - ${data.vehicleMake} ${data.vehicleModel}, ${data.licensePlate}`
        });
        
        // Auto-hide toast after 5 seconds
        setTimeout(() => {
          setNotificationToast(null);
        }, 5000);
      });

      // Listen for real-time driver location updates
      socket.on('driverLocationUpdated', (data) => {
        if (data.rideId === rideId) {
          const newLocation = data.location;
          const now = Date.now();
          
          // Calculate bearing if we have previous location
          if (previousDriverLocation) {
            const bearing = calculateBearing(
              previousDriverLocation.lat,
              previousDriverLocation.lng,
              newLocation.lat,
              newLocation.lng
            );
            setDriverBearing(bearing);
            
            const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
              new window.google.maps.LatLng(previousDriverLocation.lat, previousDriverLocation.lng),
              new window.google.maps.LatLng(newLocation.lat, newLocation.lng)
            );
            setIsDriverMoving(distance > 5);
          }
          
          setPreviousDriverLocation(driverLocation);
          setDriverLocation(newLocation);
          setLastUpdateTime(now);
          setIsLocationAvailable(true);
          setLocationErrorCount(0);
          
          // Update traffic data
          updateTrafficData(newLocation);
          
          // Calculate distance and arrival time with traffic
          if (selectedBooth) {
            calculateTrafficAwareETA(newLocation, selectedBooth);
          }
        }
      });

      // Add error handling for location updates
      socket.on('driverLocationError', (data) => {
        if (data.rideId === rideId) {
          setLocationErrorCount(prev => prev + 1);
          if (locationErrorCount >= 3) {
            setIsLocationAvailable(false);
            setNotificationToast({
              type: 'error',
              message: 'Unable to get driver location. Please try refreshing.'
            });
          }
        }
      });
    };

    connectSocket();

    return () => {
      if (socket) {
        socket.off('connect');
        socket.off('connect_error');
        socket.off('disconnect');
        socket.off('rideAccepted');
        socket.off('driverLocationUpdated');
        socket.off('driverLocationError');
        socket.disconnect();
      }
    };
  }, []);

  // Add map load handler
  const onMapLoad = (map) => {
    setMapRef(map);
  };

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
          if (status === 'OK') {
            setDirections(result);
            if (isDriverMoving) {
              setRemainingRoute(calculateRemainingRoute(driverLocation, result));
            }
          }
        }
      );
    }
  }, [isTracking, driverLocation, selectedBooth, isDriverMoving]);

  // Add this function after the existing useEffect hooks
  const calculateArrivalTime = (distance) => {
    // Assuming average speed of 30 km/h in city traffic
    const speedKmh = 30;
    const timeInHours = distance / speedKmh;
    const timeInMinutes = Math.ceil(timeInHours * 60);
    return timeInMinutes;
  };

  // Add this function after the existing useEffect hooks
  const calculateRemainingRoute = (currentLocation, fullRoute) => {
    if (!currentLocation || !fullRoute) return null;
    
    const directionsService = new window.google.maps.DirectionsService();
    const path = fullRoute.routes[0].overview_path;
    
    // Find the closest point on the path to current location
    let closestPoint = null;
    let minDistance = Infinity;
    
    path.forEach(point => {
      const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
        new window.google.maps.LatLng(currentLocation.lat, currentLocation.lng),
        point
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    });
    
    // Create a new path from the closest point to the end
    const remainingPath = path.slice(path.indexOf(closestPoint));
    
    return {
      ...fullRoute,
      routes: [{
        ...fullRoute.routes[0],
        overview_path: remainingPath
      }]
    };
  };

  // Add notification toast component
  const NotificationToast = ({ type, message }) => {
    return (
      <div className={`notification-toast ${type}`}>
        <i className={`fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
        <p>{message}</p>
      </div>
    );
  };

  // Add function to calculate bearing
  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const toRad = (deg) => deg * Math.PI / 180;
    const toDeg = (rad) => rad * 180 / Math.PI;
    
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const λ1 = toRad(lon1);
    const λ2 = toRad(lon2);
    
    const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
    const θ = Math.atan2(y, x);
    
    return (toDeg(θ) + 360) % 360;
  };

  // Add function to update traffic data
  const updateTrafficData = async (location) => {
    if (!isTrafficEnabled) return;
    
    try {
      const trafficService = new window.google.maps.TrafficService();
      const request = {
        origin: location,
        destination: { lat: selectedBooth.latitude, lng: selectedBooth.longitude },
        travelMode: window.google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: window.google.maps.TrafficModel.BEST_GUESS
        }
      };
      
      trafficService.route(request, (result, status) => {
        if (status === 'OK') {
          setTrafficData(result);
        }
      });
    } catch (error) {
      console.error('Error fetching traffic data:', error);
    }
  };

  // Add function to calculate traffic-aware ETA
  const calculateTrafficAwareETA = async (driverLocation, pickupLocation) => {
    try {
      const directionsService = new window.google.maps.DirectionsService();
      const request = {
        origin: driverLocation,
        destination: pickupLocation,
        travelMode: window.google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: window.google.maps.TrafficModel.BEST_GUESS
        }
      };
      
      directionsService.route(request, (result, status) => {
        if (status === 'OK') {
          const route = result.routes[0];
          const leg = route.legs[0];
          
          setDistanceToPickup((leg.distance.value / 1000).toFixed(1));
          setEstimatedArrivalTime(Math.ceil(leg.duration_in_traffic.value / 60));
          
          // Update route with traffic
          setRemainingRoute(result);
        }
      });
    } catch (error) {
      console.error('Error calculating traffic-aware ETA:', error);
    }
  };

  // Add debounced traffic update
  const debouncedTrafficUpdate = useCallback(
    debounce((location) => {
      updateTrafficData(location);
    }, 30000), // Update every 30 seconds
    []
  );

  // Add ride cancellation handler
  const handleCancelRide = async () => {
    if (!rideId) return;
    
    try {
      setIsCancelling(true);
      const token = localStorage.getItem('userToken');
      const response = await axios.post(
        'http://localhost:5000/api/rides/cancel',
        { rideId },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setNotificationToast({
          type: 'success',
          message: 'Ride cancelled successfully'
        });
        setIsTracking(false);
        setRideRequestStatus(null);
        setRideId(null);
      }
    } catch (error) {
      setNotificationToast({
        type: 'error',
        message: 'Failed to cancel ride. Please try again.'
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Add contact driver handler
  const handleContactDriver = () => {
    if (!driverInfo?.phone) return;
    window.location.href = `tel:${driverInfo.phone}`;
  };

  // Add chat socket event handlers
  useEffect(() => {
    if (!socket || !rideId) return;

    socket.on('newMessage', (message) => {
      setMessages(prev => [...prev, message]);
      if (!showChat) {
        setUnreadMessages(prev => prev + 1);
        setNotificationToast({
          type: 'info',
          message: `New message from ${message.senderName}`
        });
      }
    });

    // Load chat history when chat is opened
    if (showChat) {
      loadChatHistory();
    }

    return () => {
      socket.off('newMessage');
    };
  }, [socket, rideId, showChat]);

  // Add function to load chat history
  const loadChatHistory = async () => {
    try {
      setIsChatLoading(true);
      const token = localStorage.getItem('userToken');
      const response = await axios.get(
        `http://localhost:5000/api/chat/history/${rideId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setMessages(response.data.messages);
        setUnreadMessages(0);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setNotificationToast({
        type: 'error',
        message: 'Failed to load chat history'
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  // Add function to send message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !rideId) return;

    const message = {
      rideId,
      senderId: user._id,
      senderName: user.name,
      content: newMessage.trim(),
      timestamp: new Date()
    };

    try {
      socket.emit('sendMessage', message);
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setNotificationToast({
        type: 'error',
        message: 'Failed to send message'
      });
    }
  };

  // Add chat component
  const ChatInterface = () => {
    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
      scrollToBottom();
    }, [messages]);

    return (
      <div className="chat-interface">
        <div className="chat-header">
          <h3>Chat with {driverInfo?.name}</h3>
          <button 
            className="close-chat-btn"
            onClick={() => setShowChat(false)}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="chat-messages">
          {isChatLoading ? (
            <div className="chat-loading">
              <div className="loading-spinner"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="no-messages">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`message ${message.senderId === user._id ? 'sent' : 'received'}`}
              >
                <div className="message-content">
                  <p>{message.content}</p>
                  <span className="message-time">
                    {moment(message.timestamp).format('hh:mm A')}
                  </span>
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>
        <form className="chat-input" onSubmit={sendMessage}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={!socketConnected}
          />
          <button 
            type="submit"
            disabled={!newMessage.trim() || !socketConnected}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>
    );
  };

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
                <div className="booth-options improved-booth-options">
                  {BOOTH_LOCATIONS.map(booth => (
                    <div
                      key={booth.id}
                      className={`booth-option improved-booth-option ${selectedBooth?.id === booth.id ? 'selected' : ''}`}
                      onClick={() => handleBoothSelect(booth)}
                    >
                      <div className="booth-header">
                        <span className="booth-name">{booth.name}</span>
                        {selectedBooth?.id === booth.id && <span className="booth-selected-badge">Selected</span>}
                      </div>
                      <div className="booth-coords">
                        <span>Lat: {booth.latitude.toFixed(5)}</span>
                        <span>Lng: {booth.longitude.toFixed(5)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedBooth && (
                  <button className="confirm-pickup-btn" onClick={() => setIsBookingFlow('confirmed')}>Confirm Pickup Location</button>
                )}
                {selectedBooth && isBookingFlow === 'confirmed' && (
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
                          <div className="searching-loader">
                            <div className="car-animation">
                              <i className="fas fa-car"></i>
                            </div>
                            <p>Sending ride request to drivers...</p>
                          </div>
                        )}
                        {rideRequestStatus === 'sent' && (
                          <div className="searching-loader">
                            <div className="car-animation">
                              <i className="fas fa-car"></i>
                            </div>
                            <p>Looking for nearby drivers...</p>
                            <div className="pulse-animation"></div>
                          </div>
                        )}
                        {rideRequestStatus === 'error' && (
                          <div className="error-message">
                            <i className="fas fa-exclamation-circle"></i>
                            <p>Failed to send ride request. Please try again.</p>
                            <button className="retry-btn" onClick={handleProceed}>
                              Try Again
                            </button>
                          </div>
                        )}
                        {rideRequestStatus === 'driver_found' && (
                          <div className="driver-found-message">
                            <i className="fas fa-check-circle"></i>
                            <p>Driver found! Your ride is on the way.</p>
                          </div>
                        )}
                        {rideRequestStatus === 'no_driver' && (
                          <div className="error-message">
                            <i className="fas fa-times-circle"></i>
                            <p>No drivers available right now.</p>
                            <button className="retry-btn" onClick={handleProceed}>
                              Try Again
                            </button>
                          </div>
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
          {notificationToast && <NotificationToast {...notificationToast} />}
          {socketError && (
            <div className="connection-error">
              <i className="fas fa-exclamation-circle"></i>
              <p>{socketError}</p>
            </div>
          )}
          <div className="tracking-header">
            <h2>Your ride is on the way!</h2>
            <div className="driver-info-card">
              <div className="driver-avatar">
                {driverInfo?.photo ? (
                  <img src={driverInfo.photo} alt={driverInfo.name} />
                ) : (
                  <i className="fas fa-user"></i>
                )}
              </div>
              <div className="driver-details">
                <h3>{driverInfo?.name}</h3>
                <div className="driver-rating">
                  {[...Array(5)].map((_, i) => (
                    <i 
                      key={i} 
                      className={`fas fa-star ${i < (driverInfo?.rating || 0) ? 'filled' : ''}`}
                    ></i>
                  ))}
                </div>
                <div className="vehicle-info">
                  <p>{vehicleInfo?.make} {vehicleInfo?.model}</p>
                  <p className="license-plate">{vehicleInfo?.licensePlate}</p>
                </div>
                <p className="driver-phone">{driverInfo?.phone}</p>
                <div className="driver-status">
                  <div className={`status-indicator ${isDriverMoving ? 'moving' : 'stopped'}`}></div>
                  <span>{isDriverMoving ? 'Driver is moving' : 'Driver is stopped'}</span>
                </div>
              </div>
              <div className="driver-actions">
                <button 
                  className="chat-btn"
                  onClick={() => setShowChat(true)}
                >
                  <i className="fas fa-comments"></i>
                  Chat
                  {unreadMessages > 0 && (
                    <span className="unread-badge">{unreadMessages}</span>
                  )}
                </button>
                <button 
                  className="contact-driver-btn"
                  onClick={() => setShowContactDriver(true)}
                >
                  <i className="fas fa-phone"></i>
                  Contact Driver
                </button>
                <button 
                  className="cancel-ride-btn"
                  onClick={handleCancelRide}
                  disabled={isCancelling}
                >
                  <i className="fas fa-times"></i>
                  Cancel Ride
                </button>
              </div>
            </div>
            {distanceToPickup && (
              <div className="arrival-info">
                <i className="fas fa-map-marker-alt"></i>
                <p>Driver is {distanceToPickup} km away</p>
                {estimatedArrivalTime && (
                  <p>Arriving in approximately {estimatedArrivalTime} minutes</p>
                )}
                {lastUpdateTime && (
                  <p className="last-update">
                    Last updated: {moment(lastUpdateTime).fromNow()}
                  </p>
                )}
              </div>
            )}
          </div>
          <LoadScript 
            googleMapsApiKey={GOOGLE_MAPS_API_KEY} 
            libraries={[...libraries, 'geometry']}
            onError={(error) => {
              setNotificationToast({
                type: 'error',
                message: 'Failed to load map. Please refresh the page.'
              });
            }}
          >
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '400px' }}
              center={driverLocation}
              zoom={13}
              onLoad={onMapLoad}
              options={{
                trafficLayer: isTrafficEnabled
              }}
            >
              {isLocationAvailable ? (
                <>
                  <Marker 
                    position={driverLocation} 
                    icon={{
                      url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                      scaledSize: new window.google.maps.Size(40, 40),
                      rotation: driverBearing || 0
                    }}
                  />
                  <Marker 
                    position={{ lat: selectedBooth.latitude, lng: selectedBooth.longitude }}
                    icon={{
                      url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
                      scaledSize: new window.google.maps.Size(40, 40)
                    }}
                  />
                  {remainingRoute && (
                    <DirectionsRenderer 
                      directions={remainingRoute}
                      options={{
                        suppressMarkers: true,
                        polylineOptions: {
                          strokeColor: '#2196F3',
                          strokeWeight: 5,
                          strokeOpacity: 0.8
                        }
                      }}
                    />
                  )}
                </>
              ) : (
                <div className="map-error-overlay">
                  <i className="fas fa-exclamation-triangle"></i>
                  <p>Driver location unavailable</p>
                  <button onClick={() => window.location.reload()}>
                    Refresh
                  </button>
                </div>
              )}
            </GoogleMap>
          </LoadScript>
          {showContactDriver && (
            <div className="contact-driver-modal">
              <div className="modal-content">
                <h3>Contact Driver</h3>
                <p>Would you like to call the driver?</p>
                <div className="modal-actions">
                  <button onClick={handleContactDriver}>
                    <i className="fas fa-phone"></i>
                    Call Now
                  </button>
                  <button onClick={() => setShowContactDriver(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          {showChat && <ChatInterface />}
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
