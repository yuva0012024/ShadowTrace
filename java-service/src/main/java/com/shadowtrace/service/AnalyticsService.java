package com.shadowtrace.service;

public class AnalyticsService {

    private static final double EARTH_RADIUS_KM = 6371.0;

    /**
     * Calculates the great-circle distance between two points on a sphere
     * using the Haversine formula.
     *
     * @param lat1 Latitude of point 1 in degrees
     * @param lon1 Longitude of point 1 in degrees
     * @param lat2 Latitude of point 2 in degrees
     * @param lon2 Longitude of point 2 in degrees
     * @return Distance in kilometers
     */
    public double calculateDistanceKm(double lat1, double lon1, double lat2, double lon2) {
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);

        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return Math.round((EARTH_RADIUS_KM * c) * 100.0) / 100.0;
    }

    /**
     * Evaluates IP infrastructure profile and returns analytical classification.
     */
    public String evaluateInfrastructureProfile(String ipAddress, String isp, String org) {
        String combined = ((isp != null ? isp : "") + " " + (org != null ? org : "")).toLowerCase();
        
        if (combined.contains("google") || combined.contains("cloudflare") || combined.contains("opendns") || combined.contains("quad9")) {
            return "Tier-1 Anycast Public Resolver";
        }
        if (combined.contains("amazon") || combined.contains("aws") || combined.contains("azure") || combined.contains("digitalocean") || combined.contains("ovh") || combined.contains("linode")) {
            return "Cloud Datacenter Infrastructure";
        }
        if (combined.contains("telecom") || combined.contains("broadband") || combined.contains("cable") || combined.contains("fiber") || combined.contains("wireless") || combined.contains("cellular")) {
            return "Commercial / Consumer ISP Gateway";
        }
        if (ipAddress != null && (ipAddress.startsWith("192.168.") || ipAddress.startsWith("10.") || ipAddress.startsWith("172.16.") || ipAddress.startsWith("127."))) {
            return "Private RFC-1918 / Loopback Subnet";
        }
        return "Standard Autonomous System Route";
    }
}
