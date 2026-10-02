const mongoose = require('mongoose');

const ipRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null
    },
    searchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Search',
      required: true,
      index: true
    },
    ipAddress: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    hostname: {
      type: String,
      default: 'Not available'
    },
    country: {
      type: String,
      default: 'Not available',
      index: true
    },
    region: {
      type: String,
      default: 'Not available'
    },
    district: {
      type: String,
      default: 'Not available'
    },
    city: {
      type: String,
      default: 'Not available'
    },
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    isp: {
      type: String,
      default: 'Not available'
    },
    asn: {
      type: String,
      default: 'Not available'
    },
    timezone: {
      type: String,
      default: 'Not available'
    },
    organization: {
      type: String,
      default: 'Not available'
    },
    searchedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

const IPRecord = mongoose.model('IPRecord', ipRecordSchema, 'ip_records');

module.exports = IPRecord;
