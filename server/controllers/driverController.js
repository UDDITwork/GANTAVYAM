const Driver = require('../models/Driver');
const jwt = require('jsonwebtoken');

// @desc    Register a new driver (by admin)
// @route   POST /api/drivers/register
exports.registerDriver = async (req, res) => {
  try {
    // Get base64 strings from processed files
    const aadhaarPhoto = req.files['aadhaarPhoto']?.[0]?.base64 || null;
    const registrationCertificatePhoto = req.files['registrationCertificatePhoto']?.[0]?.base64 || null;
    const drivingLicensePhoto = req.files['drivingLicensePhoto']?.[0]?.base64 || null;
    const permitPhoto = req.files['permitPhoto']?.[0]?.base64 || null;
    const fitnessCertificatePhoto = req.files['fitnessCertificatePhoto']?.[0]?.base64 || null;
    const insurancePolicyPhoto = req.files['insurancePolicyPhoto']?.[0]?.base64 || null;

    const defaultPassword = req.body.mobileNo + req.body.aadhaarNo.slice(-4);

    const driver = await Driver.create({
      fullName: req.body.fullName,
      mobileNo: req.body.mobileNo,
      aadhaarNo: req.body.aadhaarNo,
      aadhaarPhoto,
      vehicleNo: req.body.vehicleNo,
      registrationCertificatePhoto,
      bankDetails: {
        accountHolderName: req.body.accountHolderName,
        accountNumber: req.body.accountNumber,
        ifscCode: req.body.ifscCode,
        bankName: req.body.bankName
      },
      drivingLicenseNo: req.body.drivingLicenseNo,
      drivingLicensePhoto,
      permitNo: req.body.permitNo,
      permitPhoto,
      fitnessCertificateNo: req.body.fitnessCertificateNo,
      fitnessCertificatePhoto,
      insurancePolicyNo: req.body.insurancePolicyNo,
      insurancePolicyPhoto,
      password: defaultPassword
    });

    // Remove photo data from response to reduce payload size
    const driverResponse = driver.toObject();
    const photoFields = [
      'aadhaarPhoto',
      'registrationCertificatePhoto',
      'drivingLicensePhoto',
      'permitPhoto',
      'fitnessCertificatePhoto',
      'insurancePolicyPhoto'
    ];
    photoFields.forEach(field => {
      if (driverResponse[field]) {
        driverResponse[field] = 'Photo data exists';
      }
    });

    res.status(201).json({ success: true, data: driverResponse });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Duplicate field value entered' });
    }
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get all drivers
// @route   GET /api/drivers
exports.getDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find();
    res.status(200).json({ success: true, count: drivers.length, data: drivers });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get single driver
// @route   GET /api/drivers/:id
// @desc    Get single driver (protected by token)
// @route   GET /api/drivers/:id
exports.getDriver = async (req, res) => {
  try {
    const driverId = req.params.id;

    if (req.driver._id.toString() !== driverId) {
      return res.status(403).json({ success: false, error: 'Unauthorized access to profile' });
    }

    res.status(200).json({ success: true, data: req.driver });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};


// @desc    Driver self-registration
// @route   POST /api/drivers/signup
exports.driverSignup = async (req, res) => {
  try {
    const aadhaarPhoto = req.files['aadhaarPhoto']?.[0]?.path || null;
    const registrationCertificatePhoto = req.files['registrationCertificatePhoto']?.[0]?.path || null;
    const drivingLicensePhoto = req.files['drivingLicensePhoto']?.[0]?.path || null;
    const permitPhoto = req.files['permitPhoto']?.[0]?.path || null;
    const fitnessCertificatePhoto = req.files['fitnessCertificatePhoto']?.[0]?.path || null;
    const insurancePolicyPhoto = req.files['insurancePolicyPhoto']?.[0]?.path || null;

    const bankDetails = typeof req.body.bankDetails === 'string'
      ? JSON.parse(req.body.bankDetails)
      : req.body.bankDetails;

    const driver = await Driver.create({
      fullName: req.body.fullName,
      mobileNo: req.body.mobileNo,
      aadhaarNo: req.body.aadhaarNo,
      aadhaarPhoto,
      vehicleNo: req.body.vehicleNo,
      registrationCertificatePhoto,
      bankDetails,
      drivingLicenseNo: req.body.drivingLicenseNo,
      drivingLicensePhoto,
      permitNo: req.body.permitNo,
      permitPhoto,
      fitnessCertificateNo: req.body.fitnessCertificateNo,
      fitnessCertificatePhoto,
      insurancePolicyNo: req.body.insurancePolicyNo,
      insurancePolicyPhoto,
      password: req.body.password
    });

    res.status(201).json({ success: true, data: driver });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Duplicate field value entered' });
    }
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Driver login (with JWT)
// @route   POST /api/drivers/login
exports.driverLogin = async (req, res) => {
  try {
    const { mobileNo, password } = req.body;
    const driver = await Driver.findOne({ mobileNo }).select('+password');

    if (!driver || driver.password !== password) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: driver._id, role: 'driver' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.status(200).json({
      success: true,
      token,
      data: {
        id: driver._id,
        name: driver.fullName,
        mobileNo: driver.mobileNo
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// Add this new controller function
exports.resetPassword = async (req, res) => {
  try {
    const { mobileNo, newPassword } = req.body;
    
    // Find driver by mobile number
    const driver = await Driver.findOne({ mobileNo });
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'No driver found with this mobile number'
      });
    }

    // Update password
    driver.password = newPassword;
    await driver.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
};

// @desc    Get driver profile
// @route   GET /api/drivers/profile/:id
exports.getDriverProfile = async (req, res) => {
  try {
    const driverId = req.params.id;

    // Check if the requesting driver is accessing their own profile
    if (req.driver._id.toString() !== driverId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to profile'
      });
    }

    const driver = await Driver.findById(driverId).select('-password');
    
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

// @desc    Update driver location
// @route   PUT /api/drivers/:id/location
exports.updateDriverLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const driverId = req.params.id;

    // Check if the requesting driver is updating their own location
    if (req.driver._id.toString() !== driverId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access'
      });
    }

    const driver = await Driver.findByIdAndUpdate(
      driverId,
      {
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
          lastUpdated: new Date()
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: driver.location
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Failed to update location'
    });
  }
};

// @desc    Update driver preferences
// @route   PUT /api/drivers/:id/preferences
exports.updateDriverPreferences = async (req, res) => {
  try {
    const { darkMode } = req.body;
    const driverId = req.params.id;

    // Check if the requesting driver is updating their own preferences
    if (req.driver._id.toString() !== driverId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access'
      });
    }

    const driver = await Driver.findByIdAndUpdate(
      driverId,
      {
        'preferences.darkMode': darkMode
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: driver.preferences
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
};
