package com.flower.mall.module.ai;

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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AiPromptTagIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void adminCanManageTagsAndPublicBundleReflectsChanges() throws Exception {
        String token = login("admin", "admin123");

        MvcResult created = mockMvc.perform(post("/api/admin/ai/prompt-tags")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"category":"SCENE","word":"纪念日惊喜"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.category").value("SCENE"))
                .andExpect(jsonPath("$.data.word").value("纪念日惊喜"))
                .andReturn();
        JsonNode createdBody = objectMapper.readTree(
                created.getResponse().getContentAsString(StandardCharsets.UTF_8));
        long id = createdBody.path("data").path("id").asLong();

        mockMvc.perform(get("/api/ai/prompt-tags"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scenes[0]").value("纪念日惊喜"));

        mockMvc.perform(put("/api/admin/ai/prompt-tags/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"category":"SCENE","word":"周年纪念"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.word").value("周年纪念"));

        mockMvc.perform(post("/api/admin/ai/prompt-tags")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"category":"SCENE","word":"周年纪念"}
                                """))
                .andExpect(status().isConflict());

        mockMvc.perform(delete("/api/admin/ai/prompt-tags/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/admin/ai/prompt-tags/bulk")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"category":"SCENE","mode":"REPLACE","words":["夏日花礼","毕业旅行"]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].word").value("夏日花礼"));

        mockMvc.perform(get("/api/ai/prompt-tags"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scenes.length()").value(2))
                .andExpect(jsonPath("$.data.scenes[1]").value("毕业旅行"));
    }

    @Test
    void generationFallsBackWhenAiServiceIsDisabled() throws Exception {
        String token = login("admin", "admin123");

        mockMvc.perform(post("/api/admin/ai/prompt-tags/generate")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"category":"AUDIENCE","theme":"同事"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.degraded").value(true))
                .andExpect(jsonPath("$.data.words[0]").value("同事"))
                .andExpect(jsonPath("$.data.words.length()").value(9));
    }

    @Test
    void invalidCategoryAndCustomerWriteAreRejected() throws Exception {
        String admin = login("admin", "admin123");
        mockMvc.perform(post("/api/admin/ai/prompt-tags")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"category":"UNKNOWN","word":"无效词"}
                                """))
                .andExpect(status().isBadRequest());

        String customer = login("customer", "customer123");
        mockMvc.perform(post("/api/admin/ai/prompt-tags")
                        .header("Authorization", "Bearer " + customer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"category":"SCENE","word":"越权词"}
                                """))
                .andExpect(status().isForbidden());
    }

    private String login(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","password":"%s"}
                                """.formatted(username, password)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = objectMapper.readTree(
                result.getResponse().getContentAsString(StandardCharsets.UTF_8));
        return body.path("data").path("token").asText();
    }
}
