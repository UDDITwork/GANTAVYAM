// routes/drivers.js
const express = require('express');
const router = express.Router();
const { driverFileUpload } = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const {
  registerDriver,
  loginDriver,
  getDriverProfile,
  updateDriverLocation
} = require('../controllers/driverController');

// Public routes
router.post('/register', driverFileUpload, registerDriver);
router.post('/login', loginDriver);

// Protected routes
router.get('/profile', protect, getDriverProfile);
router.put('/location', protect, updateDriverLocation);

// Export router
module.exports = router;