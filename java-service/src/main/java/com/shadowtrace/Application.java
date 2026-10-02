package com.shadowtrace;

import com.shadowtrace.config.AppConfig;
import com.shadowtrace.controller.AnalyticsController;
import com.shadowtrace.controller.HealthController;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

public class Application {

    public static void main(String[] args) {
        int port = AppConfig.getPort();

        try {
            HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);

            // Context endpoints
            server.createContext("/api/java/health", new HealthController());
            server.createContext("/api/java/analytics/distance", new AnalyticsController());
            server.createContext("/api/java/analytics/profile", new AnalyticsController());

            server.setExecutor(Executors.newFixedThreadPool(4));
            server.start();

            System.out.println("====================================================");
            System.out.println(" SHADOWTRACE - Analytics & Computation Service");
            System.out.println(" Version: " + AppConfig.VERSION);
            System.out.println(" Running on port: http://localhost:" + port);
            System.out.println(" Endpoints:");
            System.out.println("   GET  /api/java/health");
            System.out.println("   POST /api/java/analytics/distance");
            System.out.println("   POST /api/java/analytics/profile");
            System.out.println("====================================================");

        } catch (IOException e) {
            System.err.println("[ShadowTrace Java] Failed to start HTTP server: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
}
