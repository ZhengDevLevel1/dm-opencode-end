package com.flower.ai.qdrant;

import com.fasterxml.jackson.databind.JsonNode;
import com.flower.ai.config.AiServiceProperties;
import com.flower.ai.support.AiServiceException;
import com.flower.ai.support.HttpJsonClient;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class QdrantService {

    private final AiServiceProperties properties;
    private final HttpJsonClient http;
    private final AtomicBoolean collectionsReady = new AtomicBoolean(false);

    public QdrantService(AiServiceProperties properties, HttpJsonClient http) {
        this.properties = properties;
        this.http = http;
    }

    public boolean healthy() {
        try {
            http.get(base() + "/collections", Map.of(), Duration.ofSeconds(2));
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    public void ensureCollections() {
        if (collectionsReady.get()) {
            return;
        }
        synchronized (collectionsReady) {
            if (collectionsReady.get()) {
                return;
            }
            ensureCollection(properties.getQdrant().getProductCollection());
            ensureCollection(properties.getQdrant().getKnowledgeCollection());
            collectionsReady.set(true);
        }
    }

    private void ensureCollection(String name) {
        try {
            http.get(base() + "/collections/" + name, Map.of(), Duration.ofSeconds(3));
            return;
        } catch (Exception ignored) {
            // create below
        }
        Map<String, Object> body = Map.of("vectors", Map.of(
                "size", properties.getQdrant().getVectorSize(),
                "distance", "Cosine"));
        http.put(base() + "/collections/" + name + "?timeout=30", Map.of(), body, Duration.ofSeconds(30));
    }

    public void upsertProducts(List<ProductPoint> points) {
        upsert(properties.getQdrant().getProductCollection(), points.stream()
                .map(point -> Map.of(
                        "id", point.id(),
                        "vector", point.vector(),
                        "payload", point.payload()))
                .toList());
    }

    public void upsertKnowledge(List<KnowledgePoint> points) {
        upsert(properties.getQdrant().getKnowledgeCollection(), points.stream()
                .map(point -> Map.of(
                        "id", point.id(),
                        "vector", point.vector(),
                        "payload", point.payload()))
                .toList());
    }

    private void upsert(String collection, List<Map<String, Object>> points) {
        if (points.isEmpty()) {
            return;
        }
        ensureCollections();
        http.put(base() + "/collections/" + collection + "/points?wait=true", Map.of(),
                Map.of("points", points), Duration.ofSeconds(60));
    }

    public List<Point> searchProducts(List<Double> vector, int limit) {
        return search(properties.getQdrant().getProductCollection(), vector, limit);
    }

    public List<Point> searchKnowledge(List<Double> vector, int limit) {
        return search(properties.getQdrant().getKnowledgeCollection(), vector, limit);
    }

    private List<Point> search(String collection, List<Double> vector, int limit) {
        ensureCollections();
        JsonNode response = http.post(base() + "/collections/" + collection + "/points/search", Map.of(),
                Map.of("vector", vector, "limit", Math.max(1, limit), "with_payload", true),
                Duration.ofSeconds(15));
        List<Point> points = new ArrayList<>();
        for (JsonNode node : response.path("result")) {
            points.add(new Point(node.path("id").asLong(), node.path("score").asDouble(),
                    node.path("payload")));
        }
        return points;
    }

    public Map<Long, List<Double>> retrieveProductVectors(List<Long> ids) {
        return retrieveVectors(properties.getQdrant().getProductCollection(), ids);
    }

    public Map<Long, List<Double>> retrieveVectors(String collection, List<Long> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        ensureCollections();
        JsonNode response = http.post(base() + "/collections/" + collection + "/points", Map.of(),
                Map.of("ids", ids, "with_vector", true, "with_payload", false),
                Duration.ofSeconds(15));
        Map<Long, List<Double>> vectors = new LinkedHashMap<>();
        for (JsonNode node : response.path("result")) {
            List<Double> vector = new ArrayList<>();
            node.path("vector").forEach(value -> vector.add(value.asDouble()));
            if (!vector.isEmpty()) {
                vectors.put(node.path("id").asLong(), vector);
            }
        }
        return vectors;
    }

    private String base() {
        String value = properties.getQdrant().getBaseUrl();
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    public record Point(long id, double score, JsonNode payload) {
    }

    public record ProductPoint(long id, List<Double> vector, Map<String, Object> payload) {
    }

    public record KnowledgePoint(long id, List<Double> vector, Map<String, Object> payload) {
    }
}
