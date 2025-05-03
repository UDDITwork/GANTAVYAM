const express = require('express');
const router = express.Router();
const RideRequest = require('../models/RideRequest');
const Driver = require('../models/Driver');
const auth = require('../middleware/auth');
const { io } = require('../socket');

// Create a new ride request
router.post('/', auth, async (req, res) => {
  try {
    const rideRequest = new RideRequest({
      userId: req.user._id,
      userName: req.user.name,
      userPhone: req.user.phone,
      ...req.body
    });

    await rideRequest.save();

    // Find all online drivers
    const onlineDrivers = await Driver.find({ isOnline: true });

    // Emit the new ride request to all online drivers
    io.to('drivers').emit('newRideRequest', {
      rideRequest,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      rideId: rideRequest._id,
      message: 'Ride request created successfully'
    });
  } catch (error) {
    console.error('Error creating ride request:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating ride request'
    });
  }
});

// Get ride request status
router.get('/:rideId', auth, async (req, res) => {
  try {
    const rideRequest = await RideRequest.findById(req.params.rideId)
      .populate('driverId', 'name phone vehicleDetails rating');

    if (!rideRequest) {
      return res.status(404).json({
        success: false,
        message: 'Ride request not found'
      });
    }

    res.json({
      success: true,
      rideRequest
    });
  } catch (error) {
    console.error('Error fetching ride request:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ride request'
    });
  }
});

// Driver accepts ride request
router.post('/:rideId/accept', auth, async (req, res) => {
  try {
    const rideRequest = await RideRequest.findById(req.params.rideId);

    if (!rideRequest) {
      return res.status(404).json({
        success: false,
        message: 'Ride request not found'
      });
    }

    if (rideRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Ride request is no longer available'
      });
    }

    rideRequest.status = 'accepted';
    rideRequest.driverId = req.user._id;
    rideRequest.acceptedAt = new Date();
    rideRequest.driverLocation = req.body.driverLocation;

    await rideRequest.save();

    // Notify the user that their ride request was accepted
    io.to(`user_${rideRequest.userId}`).emit('rideAccepted', {
      rideRequest,
      driverDetails: {
        name: req.user.name,
        phone: req.user.phone,
        vehicleDetails: req.user.vehicleDetails
      }
    });

    // Notify other drivers that this ride is no longer available
    io.to('drivers').emit('rideRequestClosed', {
      rideId: rideRequest._id
    });

    res.json({
      success: true,
      message: 'Ride request accepted successfully'
    });
  } catch (error) {
    console.error('Error accepting ride request:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting ride request'
    });
  }
});

// Update ride status (complete/cancel)
router.put('/:rideId/status', auth, async (req, res) => {
  try {
    const { status, reason } = req.body;
    const rideRequest = await RideRequest.findById(req.params.rideId);

    if (!rideRequest) {
      return res.status(404).json({
        success: false,
        message: 'Ride request not found'
      });
    }

    if (status === 'completed') {
      rideRequest.status = 'completed';
      rideRequest.completedAt = new Date();
    } else if (status === 'cancelled') {
      rideRequest.status = 'cancelled';
      rideRequest.cancelledAt = new Date();
      rideRequest.cancellationReason = reason;
    }

    await rideRequest.save();

    // Notify relevant parties about the status change
    const eventName = status === 'completed' ? 'rideCompleted' : 'rideCancelled';
    io.to(`user_${rideRequest.userId}`).emit(eventName, { rideRequest });
    if (rideRequest.driverId) {
      io.to(`driver_${rideRequest.driverId}`).emit(eventName, { rideRequest });
    }

    res.json({
      success: true,
      message: `Ride ${status} successfully`
    });
  } catch (error) {
    console.error('Error updating ride status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating ride status'
    });
  }
});

// Get active ride requests for drivers
router.get('/driver/active', auth, async (req, res) => {
  try {
    const activeRequests = await RideRequest.find({
      status: 'pending',
      driverId: null
    }).sort({ timestamp: -1 });

    res.json({
      success: true,
      requests: activeRequests
    });
  } catch (error) {
    console.error('Error fetching active ride requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active ride requests'
    });
  }
});

module.exports = router; 