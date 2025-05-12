// routes/admin.js
const express = require('express');
const router = express.Router();
const { adminProtect } = require('../middleware/auth');
const { driverFileUpload } = require('../middleware/upload');
const { registerDriver } = require('../controllers/driverController');
const { 
  getAllDrivers, 
  getDriverById,
  getAllUsers,
  getUserById 
} = require('../controllers/adminController');

// Admin routes for driver management
router.get('/drivers', adminProtect, getAllDrivers);
router.get('/drivers/:id', adminProtect, getDriverById);
router.post('/drivers', adminProtect, driverFileUpload, registerDriver);

// Admin routes for user management
router.get('/users', adminProtect, getAllUsers);
router.get('/users/:id', adminProtect, getUserById);

// Export router
module.exports = router;