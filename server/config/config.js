// config.js - Configuration settings for the ride-sharing app
require('dotenv').config(); // Load environment variables from .env file

module.exports = {
  // MongoDB connection URI - using the same one from your .env file
  mongoURI: process.env.MONGODB_URI,

  // JWT secret key for authentication
  jwtSecret: process.env.JWT_SECRET || 'fallback_jwt_secret_key', // Preferably use the one from .env

  // Server configuration
  port: process.env.PORT || 5000,
  
  // CORS origins
  allowedOrigins: ['http://localhost:3000', 'http://localhost:3001'],
  
  // File upload paths
  uploadDir: 'uploads',
  profileImagesDir: 'uploads/profile-images',
  
  // Other app-specific settings as needed
};