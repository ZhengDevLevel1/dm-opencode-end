package com.flower.ai.service;

import com.flower.ai.client.SiliconFlowClient;
import com.flower.ai.db.CatalogRepository;
import com.flower.ai.qdrant.QdrantService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

@Service
public class RetrievalService {

    private static final Logger log = LoggerFactory.getLogger(RetrievalService.class);

    private final CatalogRepository catalogRepository;
    private final SiliconFlowClient siliconFlowClient;
    private final QdrantService qdrantService;

    public RetrievalService(CatalogRepository catalogRepository,
                            SiliconFlowClient siliconFlowClient,
                            QdrantService qdrantService) {
        this.catalogRepository = catalogRepository;
        this.siliconFlowClient = siliconFlowClient;
        this.qdrantService = qdrantService;
    }

    public List<ProductHit> retrieveProducts(String query, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 20));
        List<CatalogRepository.ProductRow> rows = vectorProducts(query, safeLimit);
        if (rows.isEmpty()) {
            rows = catalogRepository.searchProducts(query, safeLimit);
        }
        if (rows.isEmpty()) {
            rows = catalogRepository.onSaleProducts().stream().limit(safeLimit).toList();
        }
        List<CatalogRepository.ProductRow> reranked = rerank(query, rows);
        List<ProductHit> hits = new ArrayList<>();
        for (int i = 0; i < reranked.size() && hits.size() < safeLimit; i++) {
            CatalogRepository.ProductRow row = reranked.get(i);
            hits.add(new ProductHit(row.id(), row.name(), row.category(), row.price(),
                    row.salesCount(), row.ratingAvg(), 1.0 - (i * 1.0 / Math.max(1, reranked.size())),
                    reason(row)));
        }
        return hits;
    }

    public List<KnowledgeHit> retrieveKnowledge(String query, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 10));
        List<CatalogRepository.KnowledgeRow> rows = vectorKnowledge(query, safeLimit);
        if (rows.isEmpty()) {
            rows = catalogRepository.searchKnowledge(query, safeLimit);
        }
        if (rows.isEmpty()) {
            rows = catalogRepository.knowledgeDocuments().stream().limit(safeLimit).toList();
        }
        List<KnowledgeHit> hits = new ArrayList<>();
        for (int i = 0; i < rows.size() && hits.size() < safeLimit; i++) {
            CatalogRepository.KnowledgeRow row = rows.get(i);
            hits.add(new KnowledgeHit(row.id(), row.title(), row.category(), row.content(), row.source()));
        }
        return hits;
    }

    public List<Long> recommend(Long userId, String sessionId, String scene, Long seedProductId, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 60));
        List<Double> vector = userVector(userId, sessionId);
        if (vector.isEmpty() && seedProductId != null) {
            vector = productVector(seedProductId);
        }
        if (vector.isEmpty()) {
            return popularProductIds(safeLimit);
        }
        try {
            List<QdrantService.Point> points = qdrantService.searchProducts(vector, safeLimit + 10);
            LinkedHashSet<Long> ids = new LinkedHashSet<>();
            for (QdrantService.Point point : points) {
                if (seedProductId != null && point.id() == seedProductId) {
                    continue;
                }
                ids.add(point.id());
                if (ids.size() >= safeLimit) {
                    break;
                }
            }
            if (!ids.isEmpty()) {
                return new ArrayList<>(ids);
            }
        } catch (Exception ex) {
            log.debug("Qdrant recommendation failed, falling back to popular products: {}", ex.getMessage());
        }
        return popularProductIds(safeLimit);
    }

    private List<CatalogRepository.ProductRow> vectorProducts(String query, int limit) {
        if (query == null || query.isBlank() || !siliconFlowClient.available()) {
            return List.of();
        }
        try {
            List<Double> vector = siliconFlowClient.embedOne(query);
            if (vector.isEmpty()) {
                return List.of();
            }
            List<QdrantService.Point> points = qdrantService.searchProducts(vector, limit * 2);
            List<Long> ids = points.stream().map(QdrantService.Point::id).toList();
            Map<Long, CatalogRepository.ProductRow> byId = catalogRepository.productMap(ids);
            List<CatalogRepository.ProductRow> rows = new ArrayList<>();
            for (Long id : ids) {
                CatalogRepository.ProductRow row = byId.get(id);
                if (row != null) {
                    rows.add(row);
                }
            }
            return rows;
        } catch (Exception ex) {
            log.debug("Vector product retrieval failed: {}", ex.getMessage());
            return List.of();
        }
    }

    private List<CatalogRepository.KnowledgeRow> vectorKnowledge(String query, int limit) {
        if (query == null || query.isBlank() || !siliconFlowClient.available()) {
            return List.of();
        }
        try {
            List<Double> vector = siliconFlowClient.embedOne(query);
            if (vector.isEmpty()) {
                return List.of();
            }
            List<QdrantService.Point> points = qdrantService.searchKnowledge(vector, limit * 2);
            List<CatalogRepository.KnowledgeRow> rows = new ArrayList<>();
            LinkedHashSet<Long> seen = new LinkedHashSet<>();
            for (QdrantService.Point point : points) {
                long documentId = point.payload().path("documentId").asLong();
                if (documentId <= 0 || !seen.add(documentId)) {
                    continue;
                }
                rows.add(new CatalogRepository.KnowledgeRow(documentId,
                        point.payload().path("title").asText(""),
                        point.payload().path("category").asText(""),
                        point.payload().path("content").asText(""),
                        point.payload().path("source").asText("")));
            }
            return rows;
        } catch (Exception ex) {
            log.debug("Vector knowledge retrieval failed: {}", ex.getMessage());
            return List.of();
        }
    }

    private List<CatalogRepository.ProductRow> rerank(String query, List<CatalogRepository.ProductRow> rows) {
        if (query == null || query.isBlank() || rows.size() <= 1 || !siliconFlowClient.available()) {
            return rows;
        }
        try {
            List<String> documents = rows.stream().map(CatalogRepository.ProductRow::text).toList();
            List<SiliconFlowClient.RerankResult> results = siliconFlowClient.rerank(query, documents, rows.size());
            if (results.isEmpty()) {
                return rows;
            }
            List<CatalogRepository.ProductRow> ranked = new ArrayList<>();
            for (SiliconFlowClient.RerankResult result : results) {
                if (result.index() >= 0 && result.index() < rows.size()) {
                    ranked.add(rows.get(result.index()));
                }
            }
            for (CatalogRepository.ProductRow row : rows) {
                if (!ranked.contains(row)) {
                    ranked.add(row);
                }
            }
            return ranked;
        } catch (Exception ex) {
            log.debug("Rerank failed, keeping vector order: {}", ex.getMessage());
            return rows;
        }
    }

    private List<Double> userVector(Long userId, String sessionId) {
        List<CatalogRepository.InteractionRow> interactions = catalogRepository.interactions(userId, sessionId);
        if (interactions.isEmpty()) {
            return List.of();
        }
        List<Long> ids = interactions.stream().map(CatalogRepository.InteractionRow::productId).toList();
        Map<Long, List<Double>> vectors;
        try {
            vectors = qdrantService.retrieveProductVectors(ids);
        } catch (Exception ex) {
            log.debug("Failed to load interaction vectors: {}", ex.getMessage());
            return List.of();
        }
        List<Double> profile = new ArrayList<>();
        double totalWeight = 0;
        for (CatalogRepository.InteractionRow interaction : interactions) {
            List<Double> vector = vectors.get(interaction.productId());
            if (vector == null || vector.isEmpty()) {
                continue;
            }
            double weight = interaction.viewCount() * 0.3
                    + interaction.clickCount() * 0.8
                    + Math.min(interaction.dwellMs() / 30000.0, 1.0) * 0.5;
            if (weight <= 0) {
                continue;
            }
            if (profile.isEmpty()) {
                for (int i = 0; i < vector.size(); i++) {
                    profile.add(0.0);
                }
            }
            for (int i = 0; i < vector.size() && i < profile.size(); i++) {
                profile.set(i, profile.get(i) + vector.get(i) * weight);
            }
            totalWeight += weight;
        }
        if (totalWeight <= 0 || profile.isEmpty()) {
            return List.of();
        }
        for (int i = 0; i < profile.size(); i++) {
            profile.set(i, profile.get(i) / totalWeight);
        }
        return profile;
    }

    private List<Double> productVector(Long productId) {
        try {
            Map<Long, List<Double>> vectors = qdrantService.retrieveProductVectors(List.of(productId));
            return vectors.getOrDefault(productId, List.of());
        } catch (Exception ex) {
            return List.of();
        }
    }

    private List<Long> popularProductIds(int limit) {
        return catalogRepository.onSaleProducts().stream()
                .limit(Math.max(1, limit))
                .map(CatalogRepository.ProductRow::id)
                .toList();
    }

    private static String reason(CatalogRepository.ProductRow row) {
        if (row.salesCount() > 0 && row.ratingAvg() != null && row.ratingAvg().doubleValue() >= 4.5) {
            return "热销高分，适合送礼";
        }
        if (row.category() != null && !row.category().isBlank()) {
            return "符合「" + row.category() + "」偏好";
        }
        return "当季推荐";
    }

    public record ProductHit(long productId, String name, String category, java.math.BigDecimal price,
                             int salesCount, java.math.BigDecimal ratingAvg, double score, String reason) {
    }

    public record KnowledgeHit(long documentId, String title, String category, String content, String source) {
    }
}
