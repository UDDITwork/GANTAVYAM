// routes/admin.js
const express = require('express');
const router = express.Router();
const { getAllDrivers, getDriverById, getAllUsers, getUserById } = require('../controllers/adminController');

// Define routes
router.get('/users', getAllUsers);         // GET all users
router.get('/users/:id', getUserById);     // GET single user

router.get('/drivers', getAllDrivers);
router.get('/drivers/:id', getDriverById);

module.exports = router;