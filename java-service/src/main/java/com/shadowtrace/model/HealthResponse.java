package com.shadowtrace.model;

public class HealthResponse {
    private final String status;
    private final String service;
    private final String version;
    private final long uptimeSeconds;
    private final String jvmVersion;

    public HealthResponse(String status, String service, String version, long uptimeSeconds, String jvmVersion) {
        this.status = status;
        this.service = service;
        this.version = version;
        this.uptimeSeconds = uptimeSeconds;
        this.jvmVersion = jvmVersion;
    }

    public String toJson() {
        return String.format(
            "{\"status\":\"%s\",\"service\":\"%s\",\"version\":\"%s\",\"uptimeSeconds\":%d,\"jvmVersion\":\"%s\"}",
            status, service, version, uptimeSeconds, jvmVersion
        );
    }
}
