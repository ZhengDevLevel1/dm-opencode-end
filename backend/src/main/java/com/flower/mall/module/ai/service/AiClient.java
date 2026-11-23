package com.flower.mall.module.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.config.AppProperties;
import com.flower.mall.module.ai.monitor.AiCall;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Component
@RequiredArgsConstructor
public class AiClient {

    private final AiEndpointResolver endpointResolver;
    private final ObjectMapper objectMapper;
    private final AppProperties properties;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    @AiCall
    public JsonNode post(String path, Object body, int timeoutMs) {
        try {
            String json = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder(URI.create(endpointResolver.resolve() + path))
                    .timeout(Duration.ofMillis(timeoutMs))
                    .header("Content-Type", "application/json")
                    .header("X-AI-Internal-Token", properties.getAi().getInternalToken())
                    .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 400) {
                throw new BusinessException(ErrorCode.AI_UNAVAILABLE,
                        "AI 服务返回 " + response.statusCode());
            }
            return objectMapper.readTree(response.body());
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.AI_UNAVAILABLE, "AI 服务暂不可用: " + ex.getMessage());
        }
    }

    @AiCall
    public JsonNode get(String path, int timeoutMs) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(endpointResolver.resolve() + path))
                    .timeout(Duration.ofMillis(timeoutMs))
                    .header("X-AI-Internal-Token", properties.getAi().getInternalToken())
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 400) {
                throw new BusinessException(ErrorCode.AI_UNAVAILABLE,
                        "AI 服务返回 " + response.statusCode());
            }
            return objectMapper.readTree(response.body());
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.AI_UNAVAILABLE, "AI 服务暂不可用: " + ex.getMessage());
        }
    }

    public HttpRequest.Builder requestBuilder(String path) {
        return HttpRequest.newBuilder(URI.create(endpointResolver.resolve() + path))
                .header("Content-Type", "application/json")
                .header("X-AI-Internal-Token", properties.getAi().getInternalToken());
    }

    public HttpClient httpClient() {
        return httpClient;
    }

    public ObjectMapper objectMapper() {
        return objectMapper;
    }
}
