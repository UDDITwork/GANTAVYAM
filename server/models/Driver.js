// models/Driver.js
const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Please add a full name']
  },
  mobileNo: {
    type: String,
    required: [true, 'Please add a mobile number'],
    unique: true
  },
  aadhaarNo: {
    type: String,
    required: [true, 'Please add an Aadhaar number'],
    unique: true
  },
  aadhaarPhoto: {
    type: String,
    required: [true, 'Please upload Aadhaar photo']
  },
  vehicleNo: {
    type: String,
    required: [true, 'Please add a vehicle number'],
    unique: true
  },
  registrationCertificatePhoto: {
    type: String,
    required: [true, 'Please upload registration certificate photo']
  },
  bankDetails: {
    accountHolderName: {
      type: String,
      required: [true, 'Please add account holder name']
    },
    accountNumber: {
      type: String,
      required: [true, 'Please add account number']
    },
    ifscCode: {
      type: String,
      required: [true, 'Please add IFSC code']
    },
    bankName: {
      type: String,
      required: [true, 'Please add bank name']
    }
  },
  drivingLicenseNo: {
    type: String,
    required: [true, 'Please add driving license number']
  },
  drivingLicensePhoto: {
    type: String,
    required: [true, 'Please upload driving license photo']
  },
  permitNo: {
    type: String,
    required: [true, 'Please add permit number']
  },
  permitPhoto: {
    type: String,
    required: [true, 'Please upload permit photo']
  },
  fitnessCertificateNo: {
    type: String,
    required: [true, 'Please add fitness certificate number']
  },
  fitnessCertificatePhoto: {
    type: String,
    required: [true, 'Please upload fitness certificate photo']
  },
  insurancePolicyNo: {
    type: String,
    required: [true, 'Please add insurance policy number']
  },
  insurancePolicyPhoto: {
    type: String,
    required: [true, 'Please upload insurance policy photo']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  lastRenewalDate: {
    type: Date,
    default: Date.now
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  preferences: {
    darkMode: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Create a geospatial index on the location field
DriverSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Driver', DriverSchema);