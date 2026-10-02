package com.shadowtrace.controller;

import com.shadowtrace.config.AppConfig;
import com.shadowtrace.model.HealthResponse;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.io.OutputStream;
import java.lang.management.ManagementFactory;
import java.nio.charset.StandardCharsets;

public class HealthController implements HttpHandler {

    private final long startTimeMillis = System.currentTimeMillis();

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(405, -1);
            return;
        }

        long uptimeSec = (System.currentTimeMillis() - startTimeMillis) / 1000;
        String jvmVersion = System.getProperty("java.version");

        HealthResponse health = new HealthResponse(
            "UP",
            AppConfig.SERVICE_NAME,
            AppConfig.VERSION,
            uptimeSec,
            jvmVersion
        );

        byte[] responseBytes = health.toJson().getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.sendResponseHeaders(200, responseBytes.length);

        try (OutputStream os = exchange.getResponseBody()) {
            os.write(responseBytes);
        }
    }
}
