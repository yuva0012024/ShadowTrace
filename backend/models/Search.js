const mongoose = require('mongoose');

const searchSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null
    },
    searchNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    searchedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual relationship to IP records
searchSchema.virtual('ipRecords', {
  ref: 'IPRecord',
  localField: '_id',
  foreignField: 'searchId'
});

const Search = mongoose.model('Search', searchSchema, 'searches');

module.exports = Search;
