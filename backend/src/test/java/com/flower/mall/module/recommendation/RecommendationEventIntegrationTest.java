package com.flower.mall.module.recommendation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;

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
class RecommendationEventIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void anonymousEventRequiresSessionId() throws Exception {
        mockMvc.perform(post("/api/recommendation-events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"events":[{"eventId":"it-anon-1","requestId":"rec-it-anon",
                                 "eventType":"IMPRESSION","productId":8}]}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(10006));
    }

    @Test
    void eventIngestIsIdempotentAndUpdatesEffects() throws Exception {
        String token = login("customer", "customer123");
        String body = """
                {"events":[
                  {"eventId":"it-evt-1","requestId":"rec-it-1","eventType":"IMPRESSION",
                   "productId":8,"position":1,"scene":"recommendations",
                   "strategy":"CONTENT_TFIDF_MULTI_FACTOR"},
                  {"eventId":"it-evt-2","requestId":"rec-it-1","eventType":"CLICK",
                   "productId":8,"position":1,"scene":"recommendations",
                   "strategy":"CONTENT_TFIDF_MULTI_FACTOR"},
                  {"eventId":"it-evt-3","requestId":"rec-it-1","eventType":"ADD_TO_CART",
                   "productId":8,"position":1,"scene":"recommendations",
                   "strategy":"CONTENT_TFIDF_MULTI_FACTOR"}
                ]}
                """;

        mockMvc.perform(post("/api/recommendation-events")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accepted").value(3));

        mockMvc.perform(post("/api/recommendation-events")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accepted").value(0));

        String adminToken = login("admin", "admin123");
        mockMvc.perform(get("/api/admin/recommendations/effects")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("days", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.byScene.recommendations.impressions").value(1))
                .andExpect(jsonPath("$.data.byScene.recommendations.clicks").value(1))
                .andExpect(jsonPath("$.data.byScene.recommendations.addToCarts").value(1))
                .andExpect(jsonPath("$.data.byScene.recommendations.ctr").value(1.0));
    }

    @Test
    void runningExperimentIsAssignedAndCanBeStopped() throws Exception {
        String adminToken = login("admin", "admin123");
        mockMvc.perform(post("/api/admin/recommendations/experiments")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"id":"exp-it","name":"Integration experiment","scene":"home",
                                 "mode":"AB","trafficPercent":100,"status":"RUNNING"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value("exp-it"))
                .andExpect(jsonPath("$.data.status").value("RUNNING"));

        mockMvc.perform(get("/api/recommendations")
                        .param("scene", "home")
                        .param("limit", "3")
                        .param("sessionId", "it-session"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.experimentId").value("exp-it"))
                .andExpect(jsonPath("$.data.variant").value("TREATMENT"))
                .andExpect(jsonPath("$.data.strategy").value("VECTOR_HYBRID"))
                .andExpect(jsonPath("$.data.items[0].position").value(1))
                .andExpect(jsonPath("$.data.items[0].experimentId").value("exp-it"))
                .andExpect(jsonPath("$.data.items[0].variant").value("TREATMENT"));

        MvcResult stopped = mockMvc.perform(put("/api/admin/recommendations/experiments/exp-it/status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"STOPPED"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("STOPPED"))
                .andReturn();
        JsonNode experiment = objectMapper.readTree(
                        stopped.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .path("data");
        assertThat(experiment.path("endAt").asText()).isNotBlank();
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
