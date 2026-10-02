# ShadowTrace System Architecture

```
                                  +---------------------------------------+
                                  |         CLIENT INTERFACE              |
                                  |  React 18 + Vite + React-Leaflet      |
                                  |  (Near-Black/Charcoal + Gold Theme)   |
                                  +-------------------+-------------------+
                                                      |
                                                      | HTTP / JSON REST
                                                      v
+------------------------+        +---------------------------------------+
|   JAVA ANALYTICS       |<------>|         PRIMARY BACKEND               |
|   SERVICE (Port 8080)  |  HTTP  |  Node.js + Express.js (Port 5000)     |
|   - Haversine Distance |        |  - Geolocation Service Abstraction    |
|   - Infra Profiling    |        |  - Rate Limiting & Validation         |
+------------------------+        |  - Centralized Error Handling         |
                                  +-------------------+-------------------+
                                                      |
                          +---------------------------+---------------------------+
                          |                                                       |
                          v                                                       v
        +-----------------------------------+                   +-----------------------------------+
        |       PERSISTENCE LAYER           |                   |    EXTERNAL GEOLOCATION API       |
        |  MongoDB (Port 27017)             |                   |  - ip-api.com / Custom Provider   |
        |  - searches collection            |                   |  - IPv4 & IPv6 Resolution         |
        |  - ip_records collection          |                   |  - Reverse DNS Hostname Lookup    |
        +-----------------------------------+                   +-----------------------------------+
```

## Architectural Principles

1. **Separation of Concerns**:
   - The **React Frontend** focuses purely on rendering the intelligence dashboard, maps, and UX flows.
   - The **Node.js/Express Backend** acts as the central API gateway, responsible for input sanitization, rate limiting, provider normalization, and MongoDB persistence.
   - The **Java Analytical Service** is an independent, decoupled microservice focused on high-precision numerical computations (Haversine geodesic distance, threat profiling, and routing analytics).

2. **Truthful & Approximate Data Integrity**:
   - IP geolocation is inherently approximate to regional ISP nodes.
   - Any missing field from data providers defaults to `"Not available"` rather than synthetic placeholders.
   - Private and reserved IP ranges (RFC 1918, loopback, link-local) are flagged with zero coordinates to avoid plotting misleading locations.

3. **Resilience & Rate Protection**:
   - Provider timeouts and network errors are handled gracefully.
   - Batch analyses process sequentially to respect external provider rate limits (45 req/min on free tier).
