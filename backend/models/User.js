const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Never return passwordHash by default
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    avatarType: {
      type: String,
      enum: ['male', 'female'],
      default: 'male'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true, // Automatically provides createdAt and updatedAt
    versionKey: false,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.passwordHash;
        return ret;
      }
    },
    toObject: {
      transform: function (doc, ret) {
        delete ret.passwordHash;
        return ret;
      }
    }
  }
);

// Method to verify candidate password against hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Static helper to hash passwords
userSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const User = mongoose.model('User', userSchema, 'users');

module.exports = User;
