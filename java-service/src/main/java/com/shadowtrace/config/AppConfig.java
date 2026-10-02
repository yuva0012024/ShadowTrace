package com.shadowtrace.config;

public class AppConfig {
    public static final int DEFAULT_PORT = 8080;
    public static final String SERVICE_NAME = "ShadowTrace Analytical Engine";
    public static final String VERSION = "1.0.0";

    public static int getPort() {
        String portEnv = System.getenv("JAVA_SERVICE_PORT");
        if (portEnv != null && !portEnv.trim().isEmpty()) {
            try {
                return Integer.parseInt(portEnv.trim());
            } catch (NumberFormatException ignored) {
            }
        }
        return DEFAULT_PORT;
    }
}
