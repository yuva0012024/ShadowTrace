# ShadowTrace Database Design & Seeding

This directory contains database documentation and seeding utilities for the ShadowTrace IP Location Intelligence System.

## Database Engine
- **Engine**: MongoDB (v6.0+)
- **ORM / ODM**: Mongoose (v8+)
- **Database Name**: `shadowtrace`

## Collections & Schema

### 1. `searches`
Stores metadata for each analysis session.

```javascript
{
  _id: ObjectId("..."),
  searchNumber: "ST-000001", // Sequential index, unique
  searchedAt: ISODate("2026-09-24T14:10:00.000Z")
}
```

### 2. `ip_records`
Stores normalized geolocation and network details for each analyzed IP.

```javascript
{
  _id: ObjectId("..."),
  searchId: ObjectId("..."), // References searches._id
  ipAddress: "8.8.8.8",
  hostname: "dns.google",
  country: "United States",
  region: "Virginia",
  district: "Not available",
  city: "Ashburn",
  latitude: 39.03,
  longitude: -77.5,
  isp: "Google LLC",
  asn: "AS15169 Google LLC",
  timezone: "America/New_York",
  organization: "Google Public DNS",
  searchedAt: ISODate("2026-09-24T14:10:00.000Z")
}
```

## Running the Seed Script

To initialize or reset sample intelligence records in MongoDB:

```bash
cd backend
node ../database/seed/seedData.js
```
