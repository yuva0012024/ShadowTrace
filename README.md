# SHADOWTRACE
### *IP-Based Digital Location Intelligence System*
**Tagline:** TRACE • ANALYZE • REVEAL

---

## 1. Project Overview
**ShadowTrace** is a full-stack digital location intelligence dashboard built to provide professional-grade IP reconnaissance, routing analysis, and approximate geospatial mapping. The application is styled with a high-class, cinematic intelligence-dashboard aesthetic combining charcoal/near-black tones with elegant gold and brass accents.

ShadowTrace connects directly to live external IP geolocation providers, validates input across IPv4 and IPv6 protocols, handles private/reserved subnets transparently, persists every session in MongoDB, and coordinates with an independent Java microservice for mathematical distance and infrastructure analysis.

---

## 2. Core Features
- **Single IP Analysis**: Comprehensive dossier breakdown including IP, Hostname (via reverse DNS), Country, Region, District, City, approximate Coordinates, ISP, ASN, Timezone, and Organization.
- **Multiple IP Analysis**: Batch processing of up to 50 addresses with multi-marker interactive mapping and summary metrics.
- **Interactive Leaflet Cartography**: Real-time tile rendering, custom gold reticle markers, auto-fit view boundaries, and popup inspect cards.
- **Persistent MongoDB Audit Trail**: Every search session is assigned a sequential identifier (e.g. `ST-000001`) with foreign-key referenced IP records.
- **Search History & Archive**: Filter historical searches by search number, IP address, country, or ISP.
- **Multi-Format Export**: Real-time export directly from MongoDB into RFC 4180 CSV or structured JSON.
- **Independent Java Analytics Service**: Zero-dependency Java 17 microservice providing Haversine distance computations and routing profile classification.
- **Live System Diagnostics**: Real-time monitoring of backend status, database connection, geolocation API health, and Java service availability.

---

## 3. Technology Stack
- **Frontend**: React 18, Vite, JavaScript, React Router 6, Axios, Leaflet, React-Leaflet, Lucide Icons, Custom Vanilla CSS Design System.
- **Backend**: Node.js (v24), Express.js, Mongoose 8, Axios, Dotenv, CORS, Express-Rate-Limit.
- **Database**: MongoDB (v8/v7) with Mongoose ODM (`shadowtrace` database).
- **Java Service**: Java 17 (OpenJDK), Maven, built-in lightweight HTTP Server, Haversine spherical mathematics.

---

## 4. System Architecture & Folder Structure

```
ShadowTrace/
│
├── frontend/                     # React + Vite application
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── assets/               # Logos, SVG icons, and graphics
│       ├── components/           # Reusable UI components (Sidebar, Navbar, MapView, etc.)
│       ├── pages/                # Dashboard, Analyze, Results, History, Export, Settings
│       ├── services/api.js       # Centralized Axios API client
│       ├── hooks/                # Custom hooks (useIPAnalysis)
│       ├── utils/                # Date and coordinate formatters
│       └── styles/               # Design tokens, global, layout, and component CSS
│
├── backend/                      # Node.js + Express REST API
│   ├── package.json
│   ├── server.js                 # Entry point & Express configuration
│   ├── .env                      # Environment secrets
│   ├── .env.example
│   ├── config/                   # Database and API configurations
│   ├── routes/                   # Analyze, history, export routes
│   ├── controllers/              # Business controllers
│   ├── services/                 # Geolocation, IP validation, history, export services
│   ├── models/                   # Search.js and IPRecord.js Mongoose models
│   ├── middleware/               # Validation, rate limiting, error handling
│   └── utils/                    # Search number generator, helpers
│
├── java-service/                 # Independent Java analytical microservice
│   ├── pom.xml                   # Maven POM configuration
│   └── src/
│       ├── main/java/com/shadowtrace/
│       │   ├── Application.java  # Main Java HTTP server
│       │   ├── controller/       # Health and Analytics HTTP handlers
│       │   ├── service/          # Haversine distance and profile classifier
│       │   ├── model/            # Request/response DTOs
│       │   └── config/           # App configuration
│       └── test/java/com/shadowtrace/
│
├── database/
│   ├── seed/seedData.js          # MongoDB seeder script
│   └── README.md
│
├── tests/
│   ├── frontend/frontend.test.js # Frontend bundle and utility tests
│   ├── backend/backend.test.js   # Backend integration and unit tests
│   └── java-service/             # Java microservice integration tests
│
├── docs/                         # Comprehensive documentation
│   ├── architecture.md
│   ├── database-design.md
│   ├── api-documentation.md
│   └── user-guide.md
│
├── .gitignore
├── README.md
└── docker-compose.yml
```

---

## 5. Prerequisites & Environment Variables

### Prerequisites
- **Node.js**: v18+ (tested on Node v24.12)
- **MongoDB**: Local MongoDB instance running on port 27017
- **Java JDK**: Java 17+ (tested on Microsoft OpenJDK 17)

### Backend Environment Configuration (`backend/.env`)
```ini
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/shadowtrace
GEOLOCATION_API_URL=http://ip-api.com/json
GEOLOCATION_API_KEY=
JAVA_SERVICE_URL=http://127.0.0.1:8080
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development
```

---

## 6. How to Run the Application

### 1. MongoDB Setup
Ensure your local MongoDB daemon is running:
```bash
# Verify MongoDB service status (Windows PowerShell)
Get-Service MongoDB
```

To seed initial intelligence records:
```bash
cd backend
node ../database/seed/seedData.js
```

### 2. Run the Node.js Backend
```bash
cd backend
npm install
node server.js
```
The backend starts on `http://localhost:5000`.

### 3. Run the Java Service
```bash
cd java-service
# Compile and run via Java 17
java -jar target/shadowtrace-analytics-1.0.0.jar
```
The Java analytical service starts on `http://localhost:8080`.

### 4. Run the React Frontend
```bash
cd frontend
npm install
npm run dev
```
Open your browser to `http://localhost:5173` (redirects to `http://localhost:5173/dashboard`).

---

## 7. Running the Automated Tests
Run tests from the `ShadowTrace` directory:

```bash
# 1. Backend Automated Tests
node tests/backend/backend.test.js

# 2. Frontend Automated Tests
node tests/frontend/frontend.test.js

# 3. Java Service Integration Tests
node tests/java-service/testJavaService.js
```

---

## 8. Important Privacy & Accuracy Notice
- **Approximate Location**: IP geolocation is strictly approximate to regional ISP nodes and routing hubs.
- **No Personal Identification**: IP addresses do **not** reveal physical home addresses, real-world identity, or personal credentials.
- **Truthful Data**: If an external provider does not supply a field (e.g. district or organization), ShadowTrace displays **"Not available"** instead of fabricating false data.
- **Private Subnets**: RFC 1918 private and loopback addresses (`10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`, `127.0.0.1`, `::1`) are identified as internal networks with null geographic coordinates to prevent erroneous map plots.
"# ShadowTrace" 
