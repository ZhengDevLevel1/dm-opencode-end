package com.flower.mall.module.recommendation.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.flower.mall.config.AppProperties;
import com.flower.mall.module.ai.service.AiClient;
import com.flower.mall.module.recommendation.model.ScoredProduct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class VectorRecallService {

    private final AiClient aiClient;
    private final AppProperties properties;

    public List<Long> recall(Long userId, String sessionId, String scene, Long seedProductId, int limit) {
        if (!properties.getAi().isEnabled()) {
            return List.of();
        }
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("userId", userId);
            body.put("sessionId", sessionId);
            body.put("scene", scene);
            body.put("seedProductId", seedProductId);
            body.put("limit", Math.max(10, Math.min(limit, 60)));
            JsonNode response = aiClient.post("/internal/ai/recommend", body,
                    properties.getAi().getTimeoutMs());
            List<Long> ids = new ArrayList<>();
            JsonNode array = response.path("productIds");
            if (array.isArray()) {
                array.forEach(node -> {
                    if (node.asLong() > 0) {
                        ids.add(node.asLong());
                    }
                });
            }
            return ids;
        } catch (Exception ex) {
            log.debug("Vector recall unavailable, using TF-IDF only: {}", ex.getMessage());
            return List.of();
        }
    }

    public List<ScoredProduct> rerank(List<ScoredProduct> items, List<Long> vectorIds) {
        if (items == null || items.isEmpty() || vectorIds == null || vectorIds.isEmpty()) {
            return items;
        }
        Map<Long, Integer> rank = new LinkedHashMap<>();
        for (int i = 0; i < vectorIds.size(); i++) {
            rank.putIfAbsent(vectorIds.get(i), i);
        }
        int size = Math.max(1, vectorIds.size());
        List<ScoredProduct> ranked = new ArrayList<>(items);
        ranked.sort(Comparator
                .comparingDouble((ScoredProduct item) -> {
                    Integer position = rank.get(item.product().getId());
                    double vectorScore = position == null ? 0 : 1.0 - (position * 1.0 / size);
                    return 0.6 * vectorScore + 0.4 * item.finalScore();
                })
                .reversed());
        return ranked;
    }
}
