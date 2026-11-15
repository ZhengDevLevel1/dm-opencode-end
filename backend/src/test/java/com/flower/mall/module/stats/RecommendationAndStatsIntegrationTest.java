package com.flower.mall.module.stats;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RecommendationAndStatsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void publicRecommendationReturnsColdStartExplanations() throws Exception {
        mockMvc.perform(get("/api/recommendations")
                        .param("limit", "5")
                        .param("festival", "母亲节")
                        .param("season", "SPRING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.coldStart").value(true))
                .andExpect(jsonPath("$.data.strategy").value("CONTENT_TFIDF_MULTI_FACTOR"))
                .andExpect(jsonPath("$.data.season").value("SPRING"))
                .andExpect(jsonPath("$.data.items.length()").value(5))
                .andExpect(jsonPath("$.data.items[0].reason").isNotEmpty())
                .andExpect(jsonPath("$.data.items[0].score").isNumber())
                .andExpect(jsonPath("$.data.scene").value("home"))
                .andExpect(jsonPath("$.data.sceneLabel").value("首页推荐"))
                .andExpect(jsonPath("$.data.mode").value("CONTEXT_COLD_START"))
                .andExpect(jsonPath("$.data.weights.contentWeight").value(0.300));
    }

    @Test
    void sceneRecommendationsUseSceneWeightsAndSeedSimilarity() throws Exception {
        mockMvc.perform(get("/api/recommendations")
                        .param("limit", "5")
                        .param("scene", "recommendations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scene").value("recommendations"))
                .andExpect(jsonPath("$.data.sceneLabel").value("智能推荐"))
                .andExpect(jsonPath("$.data.weights.contentWeight").value(0.460));

        mockMvc.perform(get("/api/recommendations")
                        .param("limit", "5")
                        .param("scene", "catalog"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scene").value("catalog"))
                .andExpect(jsonPath("$.data.weights.contentWeight").value(0.250));

        MvcResult productResult = mockMvc.perform(get("/api/recommendations")
                        .param("limit", "6")
                        .param("scene", "product")
                        .param("productId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scene").value("product"))
                .andExpect(jsonPath("$.data.seedProductId").value(1))
                .andExpect(jsonPath("$.data.mode").value("SEED_SIMILAR"))
                .andExpect(jsonPath("$.data.weights.contentWeight").value(0.550))
                .andReturn();
        JsonNode productItems = objectMapper.readTree(
                        productResult.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .path("data").path("items");
        assertThat(productItems).hasSize(6);
        assertThat(productItems.findValuesAsText("productId")).doesNotContain("1");

        mockMvc.perform(get("/api/recommendations")
                        .param("scene", "product"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(7003));

        mockMvc.perform(get("/api/recommendations")
                        .param("scene", "unknown"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    void adminCanAdjustSceneWeightsAndDefaultCatalogSortMatchesCatalogRanking() throws Exception {
        String token = login("admin", "admin123");
        mockMvc.perform(get("/api/admin/recommendations/scene-weights")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(4));

        mockMvc.perform(put("/api/admin/recommendations/scene-weights")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"scenes":[{"scene":"home","contentWeight":0.32,
                                 "popularityWeight":0.22,"festivalWeight":0.32,"ratingWeight":0.14}]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(4));

        mockMvc.perform(get("/api/recommendations")
                        .param("scene", "home")
                        .param("limit", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.weights.contentWeight").value(0.320));

        mockMvc.perform(put("/api/admin/recommendations/scene-weights")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"scenes":[{"scene":"home","contentWeight":0.5,
                                 "popularityWeight":0.5,"festivalWeight":0.5,"ratingWeight":0.5}]}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(7001));

        MvcResult productsResult = mockMvc.perform(get("/api/products")
                        .param("page", "1")
                        .param("size", "5"))
                .andExpect(status().isOk())
                .andReturn();
        MvcResult recommendationsResult = mockMvc.perform(get("/api/recommendations")
                        .param("scene", "catalog")
                        .param("limit", "5"))
                .andExpect(status().isOk())
                .andReturn();
        java.util.List<JsonNode> productIds = objectMapper.readTree(
                        productsResult.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .path("data").path("records").findValues("id");
        java.util.List<JsonNode> recommendedIds = objectMapper.readTree(
                        recommendationsResult.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .path("data").path("items").findValues("productId");
        assertThat(productIds).hasSize(5);
        assertThat(recommendedIds).hasSize(5);
        for (int index = 0; index < 5; index++) {
            assertThat(productIds.get(index).asLong()).isEqualTo(recommendedIds.get(index).asLong());
        }
    }

    @Test
    void updatingSceneWeightsRefreshesUpdatedAt() throws Exception {
        String token = login("admin", "admin123");
        jdbcTemplate.update(
                "UPDATE recommendation_scene_weight SET updated_at = ? WHERE scene = ?",
                Timestamp.valueOf("2000-01-01 00:00:00"), "home");

        mockMvc.perform(put("/api/admin/recommendations/scene-weights")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"scenes":[{"scene":"home","contentWeight":0.31,
                                 "popularityWeight":0.22,"festivalWeight":0.33,"ratingWeight":0.14}]}
                                """))
                .andExpect(status().isOk());

        MvcResult result = mockMvc.perform(get("/api/admin/recommendations/scene-weights")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode scenes = objectMapper.readTree(
                        result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .path("data");
        JsonNode home = null;
        for (JsonNode scene : scenes) {
            if ("home".equals(scene.path("scene").asText())) {
                home = scene;
                break;
            }
        }
        assertThat(home).isNotNull();
        assertThat(home.path("updatedAt").asText()).isNotBlank().doesNotStartWith("2000");
    }

    @Test
    void authenticatedRecommendationUsesBehaviorProfile() throws Exception {
        String token = login("customer", "customer123");
        mockMvc.perform(get("/api/recommendations")
                        .header("Authorization", "Bearer " + token)
                        .param("limit", "6")
                        .param("season", "SUMMER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.coldStart").value(false))
                .andExpect(jsonPath("$.data.items.length()").value(6))
                .andExpect(jsonPath("$.data.items[0].reason").isNotEmpty())
                .andExpect(jsonPath("$.data.items[0].category").value("玫瑰"));
    }

    @Test
    void productStatusChangeInvalidatesRecommendationCatalogCache() throws Exception {
        MvcResult warmResult = mockMvc.perform(get("/api/recommendations")
                        .param("limit", "50"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode warmItems = objectMapper.readTree(
                warmResult.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .path("data").path("items");
        assertThat(warmItems.findValuesAsText("productId")).contains("1");

        String token = login("admin", "admin123");
        mockMvc.perform(put("/api/admin/products/1/status")
                        .header("Authorization", "Bearer " + token)
                        .param("status", "OFF_SHELF"))
                .andExpect(status().isOk());

        MvcResult refreshedResult = mockMvc.perform(get("/api/recommendations")
                        .param("limit", "50"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode refreshedItems = objectMapper.readTree(
                refreshedResult.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .path("data").path("items");
        assertThat(refreshedItems.findValuesAsText("productId")).doesNotContain("1");
    }

    @Test
    void adminCanAdjustWeightsAndInvalidSumIsRejected() throws Exception {
        String token = login("admin", "admin123");
        mockMvc.perform(put("/api/admin/recommendations/weights")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"contentWeight":0.5,"popularityWeight":0.2,
                                 "festivalWeight":0.2,"ratingWeight":0.1}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.contentWeight").value(0.5));

        mockMvc.perform(put("/api/admin/recommendations/weights")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"contentWeight":0.5,"popularityWeight":0.5,
                                 "festivalWeight":0.5,"ratingWeight":0.5}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(7001));

        mockMvc.perform(put("/api/admin/recommendations/weights")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"contentWeight":0.3335,"popularityWeight":0.3335,
                                 "festivalWeight":0.3335,"ratingWeight":0.0005}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(7001));

        mockMvc.perform(get("/api/admin/recommendations/weights")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.contentWeight").value(0.5));

        MvcResult evaluationResult = mockMvc.perform(get("/api/admin/recommendations/evaluation")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.personas.length()").value(5))
                .andExpect(jsonPath("$.data.totalProducts").value(15))
                .andExpect(jsonPath("$.data.personas[0].name").value("新用户冷启动"))
                .andExpect(jsonPath("$.data.personas[4].name").value("夏季时令偏好用户"))
                .andReturn();
        JsonNode evaluation = objectMapper.readTree(
                evaluationResult.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .path("data");
        assertThat(evaluation.path("overallCoverage").asDouble()).isBetween(0.0, 1.0);
        for (JsonNode persona : evaluation.path("personas")) {
            assertThat(persona.path("hitRate").asDouble()).isBetween(0.0, 1.0);
            assertThat(persona.path("precisionAt10").asDouble()).isBetween(0.0, 1.0);
            assertThat(persona.path("coverage").asDouble()).isBetween(0.0, 1.0);
            assertThat(persona.path("relevantCount").asInt()).isGreaterThanOrEqualTo(0);
        }

        mockMvc.perform(get("/api/admin/recommendations/stats")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.onSaleProducts").value(15))
                .andExpect(jsonPath("$.data.totalRequests").isNumber());
    }

    @Test
    void dictAndStatsEndpointsReturnData() throws Exception {
        mockMvc.perform(get("/api/dict/options"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.categories.length()").value(10))
                .andExpect(jsonPath("$.data.orderStatuses.length()").value(7));

        String token = login("admin", "admin123");
        mockMvc.perform(get("/api/admin/stats/overview")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalOrders").value(5))
                .andExpect(jsonPath("$.data.onSaleProducts").value(15))
                .andExpect(jsonPath("$.data.lowStockProducts").value(1))
                .andExpect(jsonPath("$.data.overstockProducts").value(10))
                .andExpect(jsonPath("$.data.customerCount").value(4))
                .andExpect(jsonPath("$.data.totalReviews").value(2))
                .andExpect(jsonPath("$.data.totalSales").isNumber());

        mockMvc.perform(get("/api/admin/stats/sales-trend")
                        .header("Authorization", "Bearer " + token)
                        .param("days", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(7));

        mockMvc.perform(get("/api/admin/stats/category-sales")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].category").isNotEmpty());

        mockMvc.perform(get("/api/admin/stats/order-status")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(7));

        mockMvc.perform(get("/api/admin/stats/top-products")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].productId").isNumber())
                .andExpect(jsonPath("$.data[0].amount").isNumber());
    }

    private String login(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","password":"%s"}
                                """.formatted(username, password)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode root = objectMapper.readTree(
                result.getResponse().getContentAsString(StandardCharsets.UTF_8));
        assertThat(root.path("data").path("token").asText()).isNotBlank();
        return root.path("data").path("token").asText();
    }
}
