// middleware/upload.js
const multer = require('multer');

// Set up memory storage instead of disk storage
const storage = multer.memoryStorage();

// Check file type and size
const fileFilter = (req, file, cb) => {
  // Allow only images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: 5000000 // 5MB limit
  }
});

// Middleware to convert file buffer to base64
const processFileMiddleware = (req, res, next) => {
  if (!req.files) return next();

  // Convert each file to base64
  Object.keys(req.files).forEach(fieldname => {
    const files = req.files[fieldname];
    files.forEach(file => {
      // Create base64 string with data URI scheme
      const base64String = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      // Store the base64 string instead of file path
      file.base64 = base64String;
    });
  });

  next();
};

module.exports = { upload, processFileMiddleware };