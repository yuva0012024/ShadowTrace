# ShadowTrace Database Design

ShadowTrace uses MongoDB with Mongoose ODM to maintain historical audit logs of all IP analysis sessions.

## Database Name
`shadowtrace`

## Entity Relationship Diagram

```
+-----------------------------------+
|             searches              |
+-----------------------------------+
| _id          : ObjectId           |
| searchNumber : String (Indexed)   | <----+
| searchedAt   : Date (Indexed)     |      | 1
+-----------------------------------+      |
                                           |
                                           | N
+-----------------------------------+      |
|            ip_records             |      |
+-----------------------------------+      |
| _id          : ObjectId           |      |
| searchId     : ObjectId (Ref)     | -----+
| ipAddress    : String (Indexed)   |
| hostname     : String             |
| country      : String (Indexed)   |
| region       : String             |
| district     : String             |
| city         : String             |
| latitude     : Number             |
| longitude    : Number             |
| isp          : String             |
| asn          : String             |
| timezone     : String             |
| organization : String             |
| searchedAt   : Date (Indexed)     |
+-----------------------------------+
```

## Schema Definitions

### Collection: `searches`
- `_id`: MongoDB ObjectId primary key.
- `searchNumber`: Unique sequential identifier formatted as `ST-000001`, `ST-000002`, etc.
- `searchedAt`: Timestamp of the analysis request.
- `ipRecords`: Mongoose virtual relationship referencing `ip_records.searchId`.

### Collection: `ip_records`
- `_id`: MongoDB ObjectId.
- `searchId`: Foreign key pointing to `searches._id`.
- `ipAddress`: Target IPv4 or IPv6 address.
- `hostname`: Fully qualified domain name from reverse DNS or `"Not available"`.
- `country`: Country name or `"Private / Reserved"`.
- `region`: State, province, or territory name.
- `district`: Administrative district (if reported by provider).
- `city`: City / metropolitan area.
- `latitude` / `longitude`: Floating-point approximate coordinates (or `null` if private/unavailable).
- `isp`: Internet Service Provider.
- `asn`: Autonomous System Number and registry name.
- `timezone`: IANA timezone string (e.g. `America/New_York`).
- `organization`: Registered organization or operating entity.
- `searchedAt`: Timestamp duplicated for efficient index scans.

## Indexes
- `searches.searchNumber` (Unique, Ascending)
- `searches.searchedAt` (Descending)
- `ip_records.searchId` (Ascending)
- `ip_records.ipAddress` (Ascending)
- `ip_records.country` (Ascending)
- `ip_records.searchedAt` (Descending)
