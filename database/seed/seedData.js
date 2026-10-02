const path = require('path');
const backendDir = path.resolve(__dirname, '../../backend');

// Resolve modules from backend's node_modules
const dotenv = require(path.join(backendDir, 'node_modules/dotenv'));
dotenv.config({ path: path.join(backendDir, '.env') });

const mongoose = require(path.join(backendDir, 'node_modules/mongoose'));
const Search = require(path.join(backendDir, 'models/Search'));
const IPRecord = require(path.join(backendDir, 'models/IPRecord'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shadowtrace';

const sampleSessions = [
  {
    searchNumber: 'ST-000001',
    searchedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
    records: [
      {
        ipAddress: '8.8.8.8',
        hostname: 'dns.google',
        country: 'United States',
        region: 'Virginia',
        district: 'Not available',
        city: 'Ashburn',
        latitude: 39.03,
        longitude: -77.5,
        isp: 'Google LLC',
        asn: 'AS15169 Google LLC',
        timezone: 'America/New_York',
        organization: 'Google Public DNS'
      }
    ]
  },
  {
    searchNumber: 'ST-000002',
    searchedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    records: [
      {
        ipAddress: '1.1.1.1',
        hostname: 'one.one.one.one',
        country: 'Australia',
        region: 'Queensland',
        district: 'Not available',
        city: 'South Brisbane',
        latitude: -27.4766,
        longitude: 153.0166,
        isp: 'Cloudflare, Inc',
        asn: 'AS13335 Cloudflare, Inc.',
        timezone: 'Australia/Brisbane',
        organization: 'APNIC and Cloudflare DNS Resolver project'
      },
      {
        ipAddress: '208.67.222.222',
        hostname: 'dns.umbrella.com',
        country: 'United States',
        region: 'California',
        district: 'Tasman and Zanker',
        city: 'San Jose',
        latitude: 37.4084,
        longitude: -121.954,
        isp: 'Cisco OpenDNS, LLC',
        asn: 'AS36692 Cisco OpenDNS, LLC',
        timezone: 'America/Los_Angeles',
        organization: 'Cisco OpenDNS, LLC'
      }
    ]
  },
  {
    searchNumber: 'ST-000003',
    searchedAt: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
    records: [
      {
        ipAddress: '9.9.9.9',
        hostname: 'dns9.quad9.net',
        country: 'Switzerland',
        region: 'Zurich',
        district: 'Not available',
        city: 'Zurich',
        latitude: 47.3667,
        longitude: 8.55,
        isp: 'Quad9',
        asn: 'AS19281 Quad9',
        timezone: 'Europe/Zurich',
        organization: 'Quad9 Anycast System'
      }
    ]
  }
];

async function seed() {
  try {
    console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB. Seeding initial intelligence records...');

    await Search.deleteMany({});
    await IPRecord.deleteMany({});

    for (const sessionData of sampleSessions) {
      const search = new Search({
        searchNumber: sessionData.searchNumber,
        searchedAt: sessionData.searchedAt
      });
      const savedSearch = await search.save();

      const ipDocs = sessionData.records.map(r => ({
        ...r,
        searchId: savedSearch._id,
        searchedAt: sessionData.searchedAt
      }));

      await IPRecord.insertMany(ipDocs);
      console.log(`Inserted ${sessionData.searchNumber} with ${ipDocs.length} IP record(s)`);
    }

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seed();
