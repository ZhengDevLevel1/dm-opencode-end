package com.flower.ai.service;

import com.flower.ai.client.SiliconFlowClient;
import com.flower.ai.db.CatalogRepository;
import com.flower.ai.qdrant.QdrantService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class AiIndexService {

    private static final Logger log = LoggerFactory.getLogger(AiIndexService.class);
    private static final int KNOWLEDGE_CHUNK_SIZE = 600;

    private final CatalogRepository catalogRepository;
    private final SiliconFlowClient siliconFlowClient;
    private final QdrantService qdrantService;
    private final AtomicBoolean indexing = new AtomicBoolean(false);

    public AiIndexService(CatalogRepository catalogRepository,
                          SiliconFlowClient siliconFlowClient,
                          QdrantService qdrantService) {
        this.catalogRepository = catalogRepository;
        this.siliconFlowClient = siliconFlowClient;
        this.qdrantService = qdrantService;
    }

    public IndexResult reindex(boolean products, boolean knowledge) {
        if (!indexing.compareAndSet(false, true)) {
            return new IndexResult(0, 0, false, "索引任务正在进行中");
        }
        try {
            qdrantService.ensureCollections();
            int productCount = 0;
            int knowledgeCount = 0;
            if (products) {
                productCount = indexProducts();
            }
            if (knowledge) {
                knowledgeCount = indexKnowledge();
            }
            return new IndexResult(productCount, knowledgeCount, true,
                    "索引重建完成：商品 " + productCount + " 条，知识库 " + knowledgeCount + " 个片段");
        } finally {
            indexing.set(false);
        }
    }

    private int indexProducts() {
        List<CatalogRepository.ProductRow> products = catalogRepository.onSaleProducts();
        if (products.isEmpty()) {
            return 0;
        }
        List<String> texts = products.stream().map(CatalogRepository.ProductRow::text).toList();
        List<List<Double>> vectors = siliconFlowClient.embed(texts);
        List<QdrantService.ProductPoint> points = new ArrayList<>();
        for (int i = 0; i < products.size(); i++) {
            CatalogRepository.ProductRow product = products.get(i);
            List<Double> vector = i < vectors.size() ? vectors.get(i) : List.of();
            if (vector.isEmpty()) {
                continue;
            }
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("productId", product.id());
            payload.put("name", product.name());
            payload.put("category", product.category());
            payload.put("flowerMeaning", product.flowerMeaning());
            payload.put("occasionTags", product.occasionTags());
            payload.put("festivalTags", product.festivalTags());
            payload.put("seasonSuitability", product.seasonSuitability());
            payload.put("price", product.price());
            payload.put("salesCount", product.salesCount());
            payload.put("ratingAvg", product.ratingAvg());
            points.add(new QdrantService.ProductPoint(product.id(), vector, payload));
        }
        qdrantService.upsertProducts(points);
        log.info("Indexed {} products into Qdrant", points.size());
        return points.size();
    }

    private int indexKnowledge() {
        List<CatalogRepository.KnowledgeRow> documents = catalogRepository.knowledgeDocuments();
        if (documents.isEmpty()) {
            return 0;
        }
        List<Chunk> chunks = new ArrayList<>();
        for (CatalogRepository.KnowledgeRow document : documents) {
            for (String text : split(document.content())) {
                chunks.add(new Chunk(document, text));
            }
        }
        if (chunks.isEmpty()) {
            return 0;
        }
        List<List<Double>> vectors = siliconFlowClient.embed(chunks.stream().map(Chunk::text).toList());
        List<QdrantService.KnowledgePoint> points = new ArrayList<>();
        for (int i = 0; i < chunks.size(); i++) {
            List<Double> vector = i < vectors.size() ? vectors.get(i) : List.of();
            if (vector.isEmpty()) {
                continue;
            }
            Chunk chunk = chunks.get(i);
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("documentId", chunk.document().id());
            payload.put("title", chunk.document().title());
            payload.put("category", chunk.document().category());
            payload.put("content", chunk.text());
            payload.put("source", chunk.document().source());
            points.add(new QdrantService.KnowledgePoint(chunk.document().id() * 1000L + i, vector, payload));
        }
        qdrantService.upsertKnowledge(points);
        log.info("Indexed {} knowledge chunks into Qdrant", points.size());
        return points.size();
    }

    private static List<String> split(String content) {
        if (content == null || content.isBlank()) {
            return List.of();
        }
        String normalized = content.trim();
        List<String> chunks = new ArrayList<>();
        for (int start = 0; start < normalized.length(); start += KNOWLEDGE_CHUNK_SIZE) {
            int end = Math.min(start + KNOWLEDGE_CHUNK_SIZE, normalized.length());
            String chunk = normalized.substring(start, end).trim();
            if (!chunk.isEmpty()) {
                chunks.add(chunk);
            }
        }
        return chunks;
    }

    public record IndexResult(int productCount, int knowledgeCount, boolean accepted, String message) {
    }

    private record Chunk(CatalogRepository.KnowledgeRow document, String text) {
    }
}
