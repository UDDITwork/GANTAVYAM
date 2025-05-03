const express = require('express');
const router = express.Router();
const RideHistory = require('../models/RideHistory');
const auth = require('../middleware/auth');

// Get ride history for a user
router.get('/user-rides', auth, async (req, res) => {
  try {
    const rides = await RideHistory.find({ userId: req.user.id })
      .sort({ timestamp: -1 }); // Sort by newest first
    
    res.json({
      success: true,
      rides
    });
  } catch (error) {
    console.error('Error fetching ride history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ride history'
    });
  }
});

// Add a new ride to history
router.post('/add-ride', auth, async (req, res) => {
  try {
    const {
      pickupLocation,
      dropLocation,
      fare,
      distance,
      status,
      driverName,
      driverPhone
    } = req.body;

    const newRide = new RideHistory({
      userId: req.user.id,
      pickupLocation,
      dropLocation,
      fare,
      distance,
      status,
      driverName,
      driverPhone
    });

    await newRide.save();

    res.json({
      success: true,
      message: 'Ride added to history',
      ride: newRide
    });
  } catch (error) {
    console.error('Error adding ride to history:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding ride to history'
    });
  }
});

module.exports = router; 