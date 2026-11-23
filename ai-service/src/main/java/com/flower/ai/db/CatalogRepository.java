package com.flower.ai.db;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Repository
public class CatalogRepository {

    private final JdbcTemplate jdbcTemplate;

    public CatalogRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<ProductRow> onSaleProducts() {
        return jdbcTemplate.query("""
                SELECT id, name, category, flower_meaning, occasion_tags, festival_tags,
                       description, season_suitability, price, sales_count, rating_avg
                FROM product
                WHERE status = 'ON_SALE' AND deleted = 0
                ORDER BY sales_count DESC, id ASC
                """, (rs, rowNum) -> new ProductRow(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("category"),
                rs.getString("flower_meaning"),
                rs.getString("occasion_tags"),
                rs.getString("festival_tags"),
                rs.getString("description"),
                rs.getString("season_suitability"),
                rs.getBigDecimal("price"),
                rs.getInt("sales_count"),
                rs.getBigDecimal("rating_avg")));
    }

    public List<ProductRow> productsByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        String placeholders = String.join(",", ids.stream().map(id -> "?").toList());
        return jdbcTemplate.query("""
                SELECT id, name, category, flower_meaning, occasion_tags, festival_tags,
                       description, season_suitability, price, sales_count, rating_avg
                FROM product
                WHERE status = 'ON_SALE' AND deleted = 0 AND id IN (%s)
                """.formatted(placeholders), (rs, rowNum) -> new ProductRow(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("category"),
                rs.getString("flower_meaning"),
                rs.getString("occasion_tags"),
                rs.getString("festival_tags"),
                rs.getString("description"),
                rs.getString("season_suitability"),
                rs.getBigDecimal("price"),
                rs.getInt("sales_count"),
                rs.getBigDecimal("rating_avg")), ids.toArray());
    }

    public ProductRow product(Long id) {
        List<ProductRow> rows = productsByIds(List.of(id));
        return rows.isEmpty() ? null : rows.get(0);
    }

    public List<ProductRow> searchProducts(String keyword, int limit) {
        if (keyword == null || keyword.isBlank()) {
            return onSaleProducts().stream().limit(Math.max(1, limit)).toList();
        }
        String like = "%" + keyword.trim() + "%";
        return jdbcTemplate.query("""
                SELECT id, name, category, flower_meaning, occasion_tags, festival_tags,
                       description, season_suitability, price, sales_count, rating_avg
                FROM product
                WHERE status = 'ON_SALE' AND deleted = 0
                  AND (name LIKE ? OR category LIKE ? OR flower_meaning LIKE ?
                       OR occasion_tags LIKE ? OR festival_tags LIKE ? OR description LIKE ?)
                ORDER BY sales_count DESC, id ASC
                LIMIT ?
                """, (rs, rowNum) -> new ProductRow(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("category"),
                rs.getString("flower_meaning"),
                rs.getString("occasion_tags"),
                rs.getString("festival_tags"),
                rs.getString("description"),
                rs.getString("season_suitability"),
                rs.getBigDecimal("price"),
                rs.getInt("sales_count"),
                rs.getBigDecimal("rating_avg")),
                like, like, like, like, like, like, Math.max(1, limit));
    }

    public List<KnowledgeRow> searchKnowledge(String keyword, int limit) {
        if (keyword == null || keyword.isBlank()) {
            return knowledgeDocuments().stream().limit(Math.max(1, limit)).toList();
        }
        String like = "%" + keyword.trim() + "%";
        return jdbcTemplate.query("""
                SELECT id, title, category, content, source
                FROM ai_knowledge_document
                WHERE enabled = 1 AND (title LIKE ? OR category LIKE ? OR content LIKE ?)
                ORDER BY id ASC
                LIMIT ?
                """, (rs, rowNum) -> new KnowledgeRow(
                rs.getLong("id"),
                rs.getString("title"),
                rs.getString("category"),
                rs.getString("content"),
                rs.getString("source")),
                like, like, like, Math.max(1, limit));
    }

    public List<KnowledgeRow> knowledgeDocuments() {
        return jdbcTemplate.query("""
                SELECT id, title, category, content, source
                FROM ai_knowledge_document
                WHERE enabled = 1
                ORDER BY id ASC
                """, (rs, rowNum) -> new KnowledgeRow(
                rs.getLong("id"),
                rs.getString("title"),
                rs.getString("category"),
                rs.getString("content"),
                rs.getString("source")));
    }

    public List<InteractionRow> interactions(Long userId, String sessionId) {
        if (userId != null) {
            return jdbcTemplate.query("""
                    SELECT product_id, view_count, click_count, total_dwell_ms, last_viewed_at, last_clicked_at
                    FROM user_product_interaction
                    WHERE user_id = ?
                    ORDER BY updated_at DESC
                    LIMIT 50
                    """, (rs, rowNum) -> new InteractionRow(
                    rs.getLong("product_id"),
                    rs.getInt("view_count"),
                    rs.getInt("click_count"),
                    rs.getLong("total_dwell_ms")), userId);
        }
        if (sessionId != null && !sessionId.isBlank()) {
            return jdbcTemplate.query("""
                    SELECT product_id, view_count, click_count, total_dwell_ms, last_viewed_at, last_clicked_at
                    FROM user_product_interaction
                    WHERE session_id = ?
                    ORDER BY updated_at DESC
                    LIMIT 50
                    """, (rs, rowNum) -> new InteractionRow(
                    rs.getLong("product_id"),
                    rs.getInt("view_count"),
                    rs.getInt("click_count"),
                    rs.getLong("total_dwell_ms")), sessionId);
        }
        return List.of();
    }

    public Map<Long, ProductRow> productMap(Collection<Long> ids) {
        Map<Long, ProductRow> map = new LinkedHashMap<>();
        for (ProductRow row : productsByIds(ids)) {
            map.put(row.id(), row);
        }
        return map;
    }

    public record ProductRow(long id, String name, String category, String flowerMeaning,
                             String occasionTags, String festivalTags, String description,
                             String seasonSuitability, java.math.BigDecimal price,
                             int salesCount, java.math.BigDecimal ratingAvg) {

        public String text() {
            List<String> parts = new ArrayList<>();
            add(parts, name);
            add(parts, category);
            add(parts, flowerMeaning);
            add(parts, occasionTags);
            add(parts, festivalTags);
            add(parts, description);
            add(parts, seasonSuitability);
            return String.join("；", parts);
        }

        private static void add(List<String> parts, String value) {
            if (value != null && !value.isBlank()) {
                parts.add(value.trim());
            }
        }
    }

    public record KnowledgeRow(long id, String title, String category, String content, String source) {
        public String text() {
            return title + "；" + category + "；" + content;
        }
    }

    public record InteractionRow(long productId, int viewCount, int clickCount, long dwellMs) {
    }
}
