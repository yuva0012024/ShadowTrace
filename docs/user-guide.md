# ShadowTrace User Guide

Welcome to **ShadowTrace** — *IP-Based Digital Location Intelligence System*.  
**Tagline:** TRACE • ANALYZE • REVEAL

This guide walks you through the operational capabilities of the ShadowTrace interface.

---

## 1. Operational Intelligence Dashboard
- **Welcome Overview**: Displays authenticated user status and operational command options.
- **Metric Cards**: Real-time counters showing Total Searches, IPs Analyzed, Countries Detected, and Cities Identified.
- **Geospatial Map**: Plots all recently analyzed IP nodes on an interactive Leaflet dark-intelligence map.
- **Recent Activity Table**: View and inspect previous investigation sessions.

---

## 2. Analyzing a Single IP Address
1. Navigate to **Analyze IP** in the sidebar.
2. Select the **Single IP Analysis** tab.
3. Enter an IPv4 address (e.g. `8.8.8.8`) or IPv6 address (e.g. `2001:4860:4860::8888`), or click one of the quick preset targets (`Google DNS`, `Cloudflare`, etc.).
4. Click **Analyze IP**.
5. You will be redirected to the **Single IP Intelligence Dossier** (`/results/ST-XXXXXX`), showing:
   - IP Address & Hostname
   - Country, State/Region, District, and City
   - Exact approximate coordinates plotted on the map
   - ISP, ASN, Timezone, and Organization
   - Distance calculation powered by the Java analytical engine.

---

## 3. Analyzing Multiple IP Addresses
1. In **Analyze IP**, switch to the **Multiple IP Analysis** tab.
2. Enter multiple IP addresses (one per line or separated by commas). You can also click **Load Multi-Target Sample Preset**.
3. Click **Analyze Multiple IPs**.
4. The system validates all addresses, filters duplicates, queries the intelligence provider, and saves the session to MongoDB.
5. The **Batch IP Intelligence Matrix** (`/multiple-results/ST-XXXXXX`) displays:
   - Summary statistics cards
   - Multi-marker interactive map with clickable popups
   - Searchable, filterable target records matrix.

---

## 4. Searching and Reviewing History
1. Navigate to **Search History** in the sidebar.
2. Type any search term in the filter bar (e.g. `ST-000001`, `1.1.1.1`, or `Australia`).
3. Click **View Results** to open any historical dossier at any time.

---

## 5. Exporting Data
1. Navigate to **Export Data** in the sidebar.
2. Select any archived analysis session from the dropdown.
3. Choose **Export JSON** or **Export CSV**.
4. The file will be generated directly from the MongoDB database and downloaded to your computer.

---

## 6. System Diagnostics & Settings
1. Navigate to **Settings** in the sidebar.
2. View real-time connection status indicators for:
   - Node.js / Express Backend
   - MongoDB Database
   - Geolocation Provider
   - Java Analytics Service (JVM 17)
3. Click **Refresh Diagnostics** to perform an on-demand health verification.

---

## Important Privacy and Accuracy Notice
IP geolocation provides an **approximate** geographical area (typically the regional routing router or data center of the ISP). It **never** reveals a person's physical home address or individual identity. ShadowTrace does not engage in surveillance or de-anonymization.
