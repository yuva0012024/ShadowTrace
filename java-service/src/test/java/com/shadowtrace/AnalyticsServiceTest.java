package com.shadowtrace;

import com.shadowtrace.service.AnalyticsService;

public class AnalyticsServiceTest {

    public static void main(String[] args) {
        AnalyticsService service = new AnalyticsService();

        // Test 1: Distance between London (51.5074, -0.1278) and Paris (48.8566, 2.3522) ~ 343 km
        double distance = service.calculateDistanceKm(51.5074, -0.1278, 48.8566, 2.3522);
        System.out.println("[Test 1] London to Paris distance (expected ~343 km): " + distance + " km");
        if (Math.abs(distance - 343.5) > 10.0) {
            System.err.println("Test 1 FAILED!");
            System.exit(1);
        } else {
            System.out.println("Test 1 PASSED!");
        }

        // Test 2: Profile evaluation
        String profile = service.evaluateInfrastructureProfile("8.8.8.8", "Google LLC", "Google Public DNS");
        System.out.println("[Test 2] Profile: " + profile);
        if (!profile.contains("Anycast")) {
            System.err.println("Test 2 FAILED!");
            System.exit(1);
        } else {
            System.out.println("Test 2 PASSED!");
        }

        System.out.println("All Java Service tests passed successfully!");
    }
}
