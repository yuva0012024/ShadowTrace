const mongoose = require('mongoose');
const Search = require('../models/Search');
const IPRecord = require('../models/IPRecord');
const generateSearchNumber = require('../utils/generateSearchNumber');

/**
 * Saves a completed search session and its corresponding IP records,
 * bound to the authenticated userId.
 */
async function saveSearchSession(recordsData, userId) {
  if (mongoose.connection.readyState !== 1) {
    const err = new Error('Database service is temporarily unavailable.');
    err.name = 'MongoNetworkError';
    err.statusCode = 503;
    throw err;
  }
  const searchNumber = await generateSearchNumber();
  const search = new Search({
    userId: userId || null,
    searchNumber,
    searchedAt: new Date()
  });

  const savedSearch = await search.save();

  const ipDocs = recordsData.map(rec => ({
    userId: userId || null,
    searchId: savedSearch._id,
    ipAddress: rec.ipAddress,
    hostname: rec.hostname || 'Not available',
    country: rec.country || 'Not available',
    region: rec.region || 'Not available',
    district: rec.district || 'Not available',
    city: rec.city || 'Not available',
    latitude: rec.latitude ?? null,
    longitude: rec.longitude ?? null,
    isp: rec.isp || 'Not available',
    asn: rec.asn || 'Not available',
    timezone: rec.timezone || 'Not available',
    organization: rec.organization || 'Not available',
    searchedAt: savedSearch.searchedAt
  }));

  const savedRecords = await IPRecord.insertMany(ipDocs);

  return {
    ...savedSearch.toObject(),
    ipRecords: savedRecords
  };
}

/**
 * Retrieves search history strictly scoped to the authenticated user.
 */
async function getHistory({ userId, query = '', page = 1, limit = 50 }) {
  const trimmedQuery = query.trim();
  let filter = { userId };

  if (trimmedQuery) {
    const regex = new RegExp(trimmedQuery, 'i');

    // Find searchIds that contain matching IP records belonging to this user
    const matchingIpSearchIds = await IPRecord.distinct('searchId', {
      userId,
      $or: [
        { ipAddress: regex },
        { country: regex },
        { city: regex },
        { isp: regex }
      ]
    });

    filter = {
      userId,
      $or: [
        { searchNumber: regex },
        { _id: { $in: matchingIpSearchIds } }
      ]
    };
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [searches, totalCount] = await Promise.all([
    Search.find(filter)
      .sort({ searchedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('ipRecords')
      .lean(),
    Search.countDocuments(filter)
  ]);

  const formattedSearches = (searches || []).map(s => ({
    id: s._id ? s._id.toString() : '',
    _id: s._id,
    searchNumber: s.searchNumber,
    searchedAt: s.searchedAt,
    ipCount: Array.isArray(s.ipRecords) ? s.ipRecords.length : 0,
    ipRecords: s.ipRecords || []
  }));

  return {
    searches: formattedSearches,
    totalCount: totalCount || 0,
    currentPage: page,
    totalPages: Math.ceil((totalCount || 0) / limit) || 1
  };
}

/**
 * Retrieves a single search by MongoDB ObjectId or Search Number,
 * verifying ownership unless requester is an admin.
 */
async function getSearchById(id, userId = null, userRole = 'user') {
  let search = null;

  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    search = await Search.findById(id).populate('ipRecords').lean();
  }

  if (!search) {
    search = await Search.findOne({ searchNumber: id.toUpperCase() }).populate('ipRecords').lean();
  }

  if (!search) {
    return null;
  }

  // Ownership verification: user can only see their own search unless admin
  if (userRole !== 'admin' && userId) {
    const searchUserId = search.userId ? search.userId.toString() : null;
    if (searchUserId !== userId.toString()) {
      return null; // Search does not belong to this user
    }
  }

  return search;
}

/**
 * Computes live intelligence dashboard statistics from MongoDB for the authenticated user.
 */
async function getDashboardStats(userId) {
  const filter = { userId };

  const [totalSearches, totalIps, distinctCountries, distinctCities, recentSearches] = await Promise.all([
    Search.countDocuments(filter),
    IPRecord.countDocuments(filter),
    IPRecord.distinct('country', {
      ...filter,
      country: { $nin: ['Not available', 'Private / Reserved', null, ''] }
    }),
    IPRecord.distinct('city', {
      ...filter,
      city: { $nin: ['Not available', 'Internal Range', null, ''] }
    }),
    Search.find(filter)
      .sort({ searchedAt: -1 })
      .limit(5)
      .populate('ipRecords')
      .lean()
  ]);

  // Aggregate top countries detected for this user
  const topCountries = await IPRecord.aggregate([
    {
      $match: {
        userId,
        country: { $nin: ['Not available', 'Private / Reserved', null, ''] }
      }
    },
    {
      $group: {
        _id: '$country',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 6 }
  ]);

  return {
    totalSearches,
    ipsAnalyzed: totalIps,
    countriesDetected: distinctCountries.length,
    citiesDetected: distinctCities.length,
    topCountries: topCountries.map(tc => ({ country: tc._id, count: tc.count })),
    recentActivity: recentSearches
  };
}

module.exports = {
  saveSearchSession,
  getHistory,
  getSearchById,
  getDashboardStats
};
