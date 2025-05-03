// routes/drivers.js
const express = require('express');
const router = express.Router();
const { upload, processFileMiddleware } = require('../middleware/upload');
const protectDriver = require('../middleware/auth');
const {
  registerDriver,
  getDrivers,
  getDriver,
  driverSignup,
  driverLogin,
  resetPassword,
  getDriverProfile,
  updateDriverLocation,
  updateDriverPreferences
} = require('../controllers/driverController');

const uploadFields = upload.fields([
  { name: 'aadhaarPhoto', maxCount: 1 },
  { name: 'registrationCertificatePhoto', maxCount: 1 },
  { name: 'drivingLicensePhoto', maxCount: 1 },
  { name: 'permitPhoto', maxCount: 1 },
  { name: 'fitnessCertificatePhoto', maxCount: 1 },
  { name: 'insurancePolicyPhoto', maxCount: 1 }
]);

router.post('/register', uploadFields, processFileMiddleware, registerDriver);
router.get('/', getDrivers);
router.get('/:id', protectDriver, getDriver); // ✅ NOW PROTECTED
router.post('/signup', uploadFields, processFileMiddleware, driverSignup);
router.post('/login', driverLogin);
router.post('/reset-password', resetPassword);

router.get('/profile/:id', protectDriver, getDriverProfile);
router.put('/:id/location', protectDriver, updateDriverLocation);
router.put('/:id/preferences', protectDriver, updateDriverPreferences);

router.get('/profile', protectDriver, async (req, res) => {
  const driver = await Driver.findById(req.driver.id);
  res.json({ success: true, data: driver });
});

router.put('/:id/upload-photo', upload.fields([{ name: 'aadhaarPhoto', maxCount: 1 }]), async (req, res) => {
  try {
    const updated = await Driver.findByIdAndUpdate(
      req.params.id,
      { aadhaarPhoto: req.files.aadhaarPhoto[0].path },
      { new: true }
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

module.exports = router;
