const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');

const protectDriver = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access denied. Token missing.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const driver = await Driver.findById(decoded.id).select('-password');

    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    req.driver = driver; // Attach driver data to request
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

module.exports = protectDriver;
