# ShadowTrace REST API Documentation

Base URL: `http://localhost:5000/api`

---

## 1. Single IP Analysis
**Endpoint:** `POST /api/analyze/single`  
**Description:** Validates and resolves geolocation for a single IPv4 or IPv6 address. Automatically records the session in MongoDB.

### Request Body
```json
{
  "ip": "8.8.8.8"
}
```

### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "IP analysis completed successfully.",
  "searchId": "6ab52f39b4c9475c84b76195",
  "searchNumber": "ST-000001",
  "searchedAt": "2026-09-24T14:10:01.978Z",
  "data": {
    "ipAddress": "8.8.8.8",
    "hostname": "dns.google",
    "country": "United States",
    "region": "Virginia",
    "district": "Not available",
    "city": "Ashburn",
    "latitude": 39.03,
    "longitude": -77.5,
    "isp": "Google LLC",
    "asn": "AS15169 Google LLC",
    "timezone": "America/New_York",
    "organization": "Google Public DNS",
    "searchedAt": "2026-09-24T14:10:01.978Z"
  }
}
```

---

## 2. Multiple IP Analysis
**Endpoint:** `POST /api/analyze/multiple`  
**Description:** Batch processes up to 50 IP addresses, returning resolved records and individual failure details.

### Request Body
```json
{
  "ips": [
    "8.8.8.8",
    "1.1.1.1",
    "208.67.222.222"
  ]
}
```

### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Batch analysis completed. Analyzed 3 of 3 addresses.",
  "searchNumber": "ST-000002",
  "totalRequested": 3,
  "totalSuccess": 3,
  "totalFailed": 0,
  "data": [ ... ]
}
```

---

## 3. Search History List
**Endpoint:** `GET /api/history`  
**Parameters:**
- `query` (optional): Filter by search number, IP address, country, or ISP.
- `page` (optional, default: 1): Page number.
- `limit` (optional, default: 50): Number of results per page.

---

## 4. Get Search by ID or Number
**Endpoint:** `GET /api/history/:id`  
**Example:** `GET /api/history/ST-000001`

---

## 5. Dashboard Statistics
**Endpoint:** `GET /api/history/stats`  
**Description:** Returns live aggregate metrics from MongoDB:
- `totalSearches`
- `ipsAnalyzed`
- `countriesDetected`
- `citiesDetected`
- `recentActivity`

---

## 6. Export Search
**Endpoint:** `GET /api/export/:id?format=csv|json`  
**Description:** Generates a real export file directly from MongoDB records.
- `format=json` (default): Returns downloadable application/json payload.
- `format=csv`: Returns RFC 4180 formatted CSV with proper headers.

---

## 7. System Health & Diagnostics
**Endpoint:** `GET /api/health`  
**Endpoint:** `GET /api/settings/status`  
**Description:** Checks operational status of Node backend, MongoDB connection, external API readiness, and Java analytical service.

---

## 8. Java Service Endpoints
**Base URL:** `http://localhost:8080/api/java`
- `GET /health`: Returns JVM 17 health metrics and uptime.
- `POST /analytics/distance`: Calculates spherical distance (Haversine formula).
- `POST /analytics/profile`: Classifies infrastructure routing profile.
