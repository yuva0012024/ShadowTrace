const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    purpose: {
      type: String,
      enum: ['SIGNUP', 'LOGIN'],
      required: true,
      default: 'SIGNUP'
    },
    otpHash: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    resendAvailableAt: {
      type: Date,
      default: Date.now
    },
    pendingRegistration: {
      type: {
        fullName: { type: String },
        email: { type: String },
        passwordHash: { type: String }
      },
      required: false,
      default: null
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

// TTL index to automatically clear expired OTP records after 15 minutes
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 300 });

const OTP = mongoose.model('OTP', otpSchema, 'otps');

module.exports = OTP;
