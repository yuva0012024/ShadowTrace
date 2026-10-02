const Search = require('../models/Search');

/**
 * Generates sequential Search Numbers in format ST-000001, ST-000002, etc.
 * Uses atomic query against the latest search number in the collection.
 */
async function generateSearchNumber() {
  const latest = await Search.findOne()
    .sort({ searchedAt: -1, _id: -1 })
    .select('searchNumber')
    .lean();

  let nextSeq = 1;
  if (latest && latest.searchNumber) {
    const match = latest.searchNumber.match(/^ST-(\d+)$/i);
    if (match) {
      nextSeq = parseInt(match[1], 10) + 1;
    }
  }

  const padded = String(nextSeq).padStart(6, '0');
  return `ST-${padded}`;
}

module.exports = generateSearchNumber;
