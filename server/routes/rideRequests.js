// server/routes/rideRequests.js
const express = require('express');
const router = express.Router();
const { protectUser } = require('../middleware/auth');
const RideRequest = require('../models/RideRequest');
const { getIO } = require('../socket');

// @desc    Create a new ride request
// @route   POST /api/requestRide
// @access  Private (User only)
router.post('/requestRide', protectUser, async (req, res) => {
  console.log('\n=== NEW RIDE REQUEST VIA API ===');
  console.log('User ID:', req.user._id);
  console.log('Request body:', req.body);
  
  try {
    const {
      pickupLocation,
      dropLocation,
      distance,
      fare
    } = req.body;

    // Validate required fields
    if (!pickupLocation || !dropLocation || !distance || !fare) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Create ride request
    const rideRequest = await RideRequest.create({
      userId: req.user._id,
      userName: req.user.name,
      userPhone: req.user.phone,
      pickupLocation,
      dropLocation,
      distance,
      fare,
      status: 'pending',
      timestamp: new Date()
    });

    console.log(`✅ Ride request created with ID: ${rideRequest._id}`);

    // Get socket instance and broadcast to drivers
    const io = getIO();
    const rideRequestData = {
      _id: rideRequest._id.toString(),
      id: rideRequest._id.toString(),
      userId: rideRequest.userId,
      userName: rideRequest.userName,
      userPhone: rideRequest.userPhone,
      pickupLocation: rideRequest.pickupLocation,
      dropLocation: rideRequest.dropLocation,
      fare: rideRequest.fare,
      distance: rideRequest.distance,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    // Emit to all drivers
    io.to('drivers').emit('newRideRequest', rideRequestData);
    console.log('✅ Ride request broadcasted to all drivers');

    res.status(201).json({
      success: true,
      rideId: rideRequest._id,
      message: 'Ride request created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating ride request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create ride request',
      message: error.message
    });
  }
});

// @desc    Accept a ride request
// @route   POST /api/acceptRide
// @access  Private (Driver only)
router.post('/acceptRide', async (req, res) => {
  console.log('\n=== RIDE ACCEPTANCE VIA API ===');
  
  // Extract driver info from token
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    const driverId = decoded.id;
    
    console.log('Driver ID:', driverId);
    console.log('Request body:', req.body);

    const { rideId } = req.body;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        error: 'Ride ID is required'
      });
    }

    // Find and update ride request
    const rideRequest = await RideRequest.findById(rideId);
    
    if (!rideRequest) {
      console.error('❌ Ride request not found');
      return res.status(404).json({
        success: false,
        error: 'Ride request not found'
      });
    }

    if (rideRequest.status !== 'pending') {
      console.error('❌ Ride already accepted or cancelled');
      return res.status(400).json({
        success: false,
        error: 'Ride is no longer available'
      });
    }

    // Get driver details
    const Driver = require('../models/Driver');
    const driver = await Driver.findById(driverId);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    // Update ride request
    rideRequest.status = 'accepted';
    rideRequest.driverId = driverId;
    rideRequest.acceptedAt = new Date();
    await rideRequest.save();

    console.log('✅ Ride request updated successfully');

    // Notify user via socket
    const io = getIO();
    io.to(`user_${rideRequest.userId}`).emit('rideAccepted', {
      rideId: rideRequest._id,
      driverId: driver._id,
      driverName: driver.fullName,
      driverPhone: driver.mobileNo,
      driverPhoto: driver.profileImage,
      driverRating: driver.rating || 4.5,
      vehicleMake: driver.vehicleDetails?.make || 'Unknown',
      vehicleModel: driver.vehicleDetails?.model || 'Unknown',
      licensePlate: driver.vehicleNo,
      timestamp: new Date().toISOString()
    });

    console.log('✅ User notified of ride acceptance');

    // Notify other drivers that ride is taken
    io.to('drivers').emit('rideRequestClosed', {
      rideId: rideRequest._id
    });

    res.status(200).json({
      success: true,
      message: 'Ride accepted successfully',
      rideId: rideRequest._id
    });

  } catch (error) {
    console.error('❌ Error accepting ride:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept ride',
      message: error.message
    });
  }
});

// @desc    Get active ride requests for drivers
// @route   GET /api/ride-requests/active
// @access  Private (Driver only)
router.get('/active', async (req, res) => {
  try {
    const activeRequests = await RideRequest.find({ 
      status: 'pending' 
    }).sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      count: activeRequests.length,
      requests: activeRequests
    });
  } catch (error) {
    console.error('Error fetching active requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active requests'
    });
  }
});

// Request a ride (API endpoint for backup)
router.post('/request', protectUser, async (req, res) => {
  console.log('\n=== RIDE REQUEST API ===');
  console.log('User ID:', req.user._id);
  console.log('Request body:', req.body);
  
  try {
    const rideRequest = await RideRequest.create({
      ...req.body,
      userId: req.user._id,
      status: 'pending'
    });
    
    console.log('✅ Ride request created:', rideRequest._id);
    
    // Broadcast to drivers via socket
    const io = getIO();
    io.to('drivers').emit('newRideRequest', {
      _id: rideRequest._id.toString(),
      id: rideRequest._id.toString(),
      userId: rideRequest.userId,
      userName: req.body.userName,
      userPhone: req.body.userPhone,
      pickupLocation: req.body.pickupLocation,
      dropLocation: req.body.dropLocation,
      fare: req.body.fare,
      distance: req.body.distance,
      timestamp: new Date().toISOString()
    });
    
    res.status(201).json({
      success: true,
      rideId: rideRequest._id,
      message: 'Ride request created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating ride request:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Accept a ride (API endpoint for backup)
router.post('/accept', protectUser, async (req, res) => {
  console.log('\n=== RIDE ACCEPT API ===');
  console.log('Driver ID:', req.user._id);
  console.log('Request body:', req.body);
  
  try {
    const { rideId } = req.body;
    
    const rideRequest = await RideRequest.findById(rideId);
    if (!rideRequest) {
      return res.status(404).json({
        success: false,
        error: 'Ride request not found'
      });
    }
    
    if (rideRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Ride is no longer available'
      });
    }
    
    // Update ride request
    rideRequest.status = 'accepted';
    rideRequest.driverId = req.user._id;
    rideRequest.acceptedAt = new Date();
    await rideRequest.save();
    
    console.log('✅ Ride accepted successfully');
    
    // Notify user via socket
    const io = getIO();
    io.to(`user_${rideRequest.userId}`).emit('rideAccepted', {
      rideId: rideRequest._id.toString(),
      driverId: req.user._id,
      driverName: req.user.name,
      driverPhone: req.user.phone,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Ride accepted successfully'
    });
  } catch (error) {
    console.error('❌ Error accepting ride:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cancel a ride
router.post('/cancel', protectUser, async (req, res) => {
  console.log('\n=== RIDE CANCEL API ===');
  console.log('User:', req.user._id, req.user.role);
  console.log('Request body:', req.body);
  
  try {
    const { rideId, reason } = req.body;
    
    const rideRequest = await RideRequest.findById(rideId);
    if (!rideRequest) {
      return res.status(404).json({
        success: false,
        error: 'Ride request not found'
      });
    }
    
    rideRequest.status = 'cancelled';
    rideRequest.cancelledAt = new Date();
    rideRequest.cancellationReason = reason;
    await rideRequest.save();
    
    console.log('✅ Ride cancelled successfully');
    
    res.json({
      success: true,
      message: 'Ride cancelled successfully'
    });
  } catch (error) {
    console.error('❌ Error cancelling ride:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;