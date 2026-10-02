package com.shadowtrace.controller;

import com.shadowtrace.service.AnalyticsService;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class AnalyticsController implements HttpHandler {

    private final AnalyticsService analyticsService = new AnalyticsService();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();

        if ("OPTIONS".equalsIgnoreCase(method)) {
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        if (!"POST".equalsIgnoreCase(method)) {
            exchange.sendResponseHeaders(405, -1);
            return;
        }

        StringBuilder body = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                body.append(line);
            }
        }

        String json = body.toString();
        String path = exchange.getRequestURI().getPath();
        String responseJson = "{}";

        if (path.contains("/distance")) {
            // Simple JSON parse for lat1, lon1, lat2, lon2
            double lat1 = parseDouble(json, "lat1", 0.0);
            double lon1 = parseDouble(json, "lon1", 0.0);
            double lat2 = parseDouble(json, "lat2", 0.0);
            double lon2 = parseDouble(json, "lon2", 0.0);

            double distance = analyticsService.calculateDistanceKm(lat1, lon1, lat2, lon2);
            responseJson = String.format("{\"success\":true,\"distanceKm\":%.2f,\"unit\":\"kilometers\"}", distance);
        } else {
            String ip = parseString(json, "ipAddress", "0.0.0.0");
            String isp = parseString(json, "isp", "");
            String org = parseString(json, "organization", "");

            String profile = analyticsService.evaluateInfrastructureProfile(ip, isp, org);
            responseJson = String.format("{\"success\":true,\"ipAddress\":\"%s\",\"infrastructureProfile\":\"%s\"}", ip, profile);
        }

        byte[] bytes = responseJson.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.sendResponseHeaders(200, bytes.length);

        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private double parseDouble(String json, String key, double defaultVal) {
        try {
            int idx = json.indexOf("\"" + key + "\"");
            if (idx == -1) return defaultVal;
            int colon = json.indexOf(":", idx);
            if (colon == -1) return defaultVal;
            int end = json.indexOf(",", colon);
            if (end == -1) end = json.indexOf("}", colon);
            if (end == -1) return defaultVal;
            String raw = json.substring(colon + 1, end).trim().replace("\"", "");
            return Double.parseDouble(raw);
        } catch (Exception e) {
            return defaultVal;
        }
    }

    private String parseString(String json, String key, String defaultVal) {
        try {
            int idx = json.indexOf("\"" + key + "\"");
            if (idx == -1) return defaultVal;
            int colon = json.indexOf(":", idx);
            if (colon == -1) return defaultVal;
            int firstQuote = json.indexOf("\"", colon);
            if (firstQuote == -1) return defaultVal;
            int secondQuote = json.indexOf("\"", firstQuote + 1);
            if (secondQuote == -1) return defaultVal;
            return json.substring(firstQuote + 1, secondQuote);
        } catch (Exception e) {
            return defaultVal;
        }
    }
}
