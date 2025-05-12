// Update your server/socket.js file with this improved authentication

const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('./config/config');
const RideRequest = require('./models/RideRequest');
const Driver = require('./models/Driver');

let io;

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: ["http://localhost:3000", "http://localhost:3001"],
      methods: ["GET", "POST"]
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    console.log('Received connection attempt with token:', token ? token.substring(0, 15) + '...' : 'undefined');
    
    if (!token) {
      console.error('No token provided');
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      console.log('JWT Decoded successfully:', JSON.stringify(decoded));
      
      // Check for "id" instead of "_id"
      if (!decoded.id) {
        console.error('Token missing id field');
        return next(new Error('Authentication error: Missing id in token'));
      }
      
      if (!decoded.role) {
        console.error('Token missing role field');
        return next(new Error('Authentication error: Missing role in token'));
      }
      
      // Map "id" to "_id" for consistent usage in the application
      socket.user = {
        _id: decoded.id,
        role: decoded.role,
        // Include any other fields from the token you need
      };
      
      next();
    } catch (err) {
      console.error('JWT Verification error:', err.message);
      next(new Error('Authentication error: ' + err.message));
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.user.role, socket.user._id);

    // Join role-specific room
    if (socket.user.role === 'driver') {
      socket.join('drivers');
      socket.join(`driver_${socket.user._id}`);
      console.log(`Driver ${socket.user._id} joined drivers room.`);
    } else {
      socket.join(`user_${socket.user._id}`);
      console.log(`User ${socket.user._id} joined user room.`);
    }

    // Test event to verify connection
    socket.emit('connectionSuccess', {
      status: 'connected',
      userId: socket.user._id,
      role: socket.user.role
    });

    // Handle driver status updates
    socket.on('updateDriverStatus', async (data) => {
      try {
        const { isOnline, location } = data;
        await Driver.findByIdAndUpdate(socket.user._id, {
          isOnline,
          currentLocation: location
        });
        console.log(`Driver ${socket.user._id} status updated: isOnline=${isOnline}`);
        socket.emit('statusUpdated', { success: true });
      } catch (error) {
        console.error('Error updating driver status:', error);
        socket.emit('statusUpdated', { success: false });
      }
    });

    // User initiates a ride request
    socket.on('userRideRequest', async (data) => {
      try {
        console.log(`Received ride request from user ${socket.user._id}:`, data);
        
        // Create the ride request with userId from the socket
        const rideRequest = await RideRequest.create({
          ...data,
          status: 'pending',
          userId: socket.user._id
        });
        
        console.log(`Ride request created in DB with id ${rideRequest._id}`);
        
        // Emit to all drivers
        io.to('drivers').emit('newRideRequest', {
          ...rideRequest.toObject(),
          userName: data.userName,
        });
        
        console.log(`Emitted newRideRequest to drivers for ride ${rideRequest._id}`);
        
        // Confirm to the user
        socket.emit('rideRequestConfirmed', {
          success: true,
          rideId: rideRequest._id
        });
      } catch (error) {
        console.error('Error broadcasting ride request:', error);
        socket.emit('rideRequestConfirmed', {
          success: false,
          error: error.message
        });
      }
    });

    // Handle driver accepting a ride
    socket.on('driverAcceptRide', async (data) => {
      try {
        const { rideId, driverId, driverName, driverPhone, vehicleDetails } = data;
        
        // Update ride request in database
        const rideRequest = await RideRequest.findById(rideId);
        if (!rideRequest) {
          socket.emit('rideAcceptError', { message: 'Ride request not found' });
          return;
        }

        if (rideRequest.status !== 'pending') {
          socket.emit('rideAcceptError', { message: 'Ride is no longer available' });
          return;
        }

        // Update ride request
        rideRequest.status = 'accepted';
        rideRequest.driverId = driverId;
        rideRequest.acceptedAt = new Date();
        await rideRequest.save();

        // Get driver details
        const driver = await Driver.findById(driverId);
        
        // Notify the user
        io.to(`user_${rideRequest.userId}`).emit('rideAccepted', {
          rideId: rideRequest._id,
          driverId: driverId,
          driverName: driverName,
          driverPhone: driverPhone,
          driverPhoto: driver?.profileImage,
          driverRating: driver?.rating,
          vehicleMake: vehicleDetails?.make,
          vehicleModel: vehicleDetails?.model,
          licensePlate: vehicleDetails?.licensePlate,
          timestamp: new Date()
        });

        // Notify other drivers that this ride is taken
        io.to('drivers').emit('rideRequestClosed', {
          rideId: rideRequest._id
        });

        // Confirm to the accepting driver
        socket.emit('rideAcceptConfirmed', {
          success: true,
          rideId: rideRequest._id
        });

      } catch (error) {
        console.error('Error accepting ride:', error);
        socket.emit('rideAcceptError', { message: 'Failed to accept ride' });
      }
    });

    // Handle driver location updates
    socket.on('updateDriverLocation', async (data) => {
      try {
        const { location, rideId } = data;
        
        // Update driver's location in database
        await Driver.findByIdAndUpdate(socket.user._id, {
          currentLocation: location
        });

        // Broadcast location to the user
        const rideRequest = await RideRequest.findById(rideId);
        if (rideRequest && rideRequest.userId) {
          io.to(`user_${rideRequest.userId}`).emit('driverLocationUpdated', {
            rideId,
            location,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Error updating driver location:', error);
      }
    });

    // Rest of your socket handlers...
    // (Keep all the other socket event handlers from your original file)

  });
};

module.exports = {
  initializeSocket,
  getIO: () => io
};