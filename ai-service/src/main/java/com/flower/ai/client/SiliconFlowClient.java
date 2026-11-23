package com.flower.ai.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.flower.ai.config.AiServiceProperties;
import com.flower.ai.support.AiServiceException;
import com.flower.ai.support.HttpJsonClient;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class SiliconFlowClient {

    private final AiServiceProperties properties;
    private final HttpJsonClient http;

    public SiliconFlowClient(AiServiceProperties properties, HttpJsonClient http) {
        this.properties = properties;
        this.http = http;
    }

    public boolean available() {
        String key = properties.getSiliconflow().getApiKey();
        return key != null && !key.isBlank();
    }

    public List<List<Double>> embed(List<String> texts) {
        if (!available()) {
            throw new AiServiceException("SiliconFlow API Key 未配置");
        }
        List<List<Double>> vectors = new ArrayList<>();
        for (int start = 0; start < texts.size(); start += 32) {
            List<String> batch = texts.subList(start, Math.min(start + 32, texts.size()));
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", properties.getSiliconflow().getEmbeddingModel());
            body.put("input", batch);
            body.put("encoding_format", "float");
            JsonNode response = http.post(base() + "/embeddings", headers(), body, Duration.ofSeconds(60));
            for (JsonNode item : response.path("data")) {
                List<Double> vector = new ArrayList<>();
                item.path("embedding").forEach(value -> vector.add(value.asDouble()));
                vectors.add(vector);
            }
        }
        return vectors;
    }

    public List<Double> embedOne(String text) {
        List<List<Double>> vectors = embed(List.of(text));
        return vectors.isEmpty() ? List.of() : vectors.get(0);
    }

    public List<RerankResult> rerank(String query, List<String> documents, int topN) {
        if (!available() || documents.isEmpty()) {
            return List.of();
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", properties.getSiliconflow().getRerankModel());
        body.put("query", query);
        body.put("documents", documents);
        body.put("top_n", Math.min(Math.max(topN, 1), documents.size()));
        JsonNode response = http.post(base() + "/rerank", headers(), body, Duration.ofSeconds(30));
        List<RerankResult> results = new ArrayList<>();
        for (JsonNode item : response.path("results")) {
            results.add(new RerankResult(item.path("index").asInt(), item.path("relevance_score").asDouble()));
        }
        return results;
    }

    private Map<String, String> headers() {
        return Map.of("Authorization", "Bearer " + properties.getSiliconflow().getApiKey());
    }

    private String base() {
        String value = properties.getSiliconflow().getBaseUrl();
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    public record RerankResult(int index, double score) {
    }
}
