// controllers/adminController.js
const Driver = require('../models/Driver');
const User = require('../models/User'); // ⬅ make sure this is imported

// @desc    Get all drivers (for booth admin)
// @route   GET /api/admin/drivers
// @access  Private (admin only, but we'll implement auth later)
exports.getAllDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find();
    
    res.status(200).json({
      success: true,
      count: drivers.length,
      data: drivers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get driver by ID (for booth admin)
// @route   GET /api/admin/drivers/:id
// @access  Private (admin only)
exports.getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    res.status(200).json({
      success: true,
      data: driver
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// GET /api/admin/users → List all customers
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('name email phone');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
};

// GET /api/admin/users/:id → Get single user details
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name email phone');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
};
