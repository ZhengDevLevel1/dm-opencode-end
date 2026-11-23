package com.flower.mall.module.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flower.mall.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;

@Slf4j
@Component
@RequiredArgsConstructor
public class AiEndpointResolver {

    private final AppProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(2))
            .build();

    private volatile String cachedEndpoint;
    private volatile Instant cachedAt = Instant.EPOCH;

    public String resolve() {
        AppProperties.Ai ai = properties.getAi();
        if (!ai.isNacosEnabled()) {
            return trim(ai.getBaseUrl());
        }
        if (cachedEndpoint != null && Instant.now().isBefore(cachedAt.plusSeconds(30))) {
            return cachedEndpoint;
        }
        String endpoint = discover(ai);
        if (endpoint != null) {
            cachedEndpoint = endpoint;
            cachedAt = Instant.now();
            return endpoint;
        }
        return trim(ai.getBaseUrl());
    }

    private String discover(AppProperties.Ai ai) {
        try {
            String service = URLEncoder.encode(ai.getServiceName(), StandardCharsets.UTF_8);
            String url = "http://" + trim(ai.getNacosServerAddr())
                    + "/nacos/v1/ns/instance/list?healthyOnly=true&serviceName=" + service;
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(2))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                return null;
            }
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode hosts = root.path("hosts");
            if (!hosts.isArray() || hosts.isEmpty()) {
                return null;
            }
            JsonNode host = hosts.get(0);
            String ip = host.path("ip").asText();
            int port = host.path("port").asInt(8081);
            if (ip.isBlank()) {
                return null;
            }
            return "http://" + ip + ":" + port;
        } catch (Exception ex) {
            log.debug("Nacos discovery failed, falling back to configured AI base URL: {}", ex.getMessage());
            return null;
        }
    }

    private static String trim(String value) {
        if (value == null || value.isBlank()) {
            return "http://127.0.0.1:8081";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
