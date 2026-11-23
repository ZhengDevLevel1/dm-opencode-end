package com.flower.mall.module.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flower.mall.module.ai.service.AiConversationService;
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
class AiConversationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AiConversationService conversationService;

    @Test
    void customerConversationLifecycleFiltersAdminOnlyData() throws Exception {
        String token = login("customer", "customer123");
        long id = createConversation(token);

        mockMvc.perform(get("/api/ai/conversations")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(id))
                .andExpect(jsonPath("$.data[0].title").value("新的对话"))
                .andExpect(jsonPath("$.data[0].pinned").value(false));

        mockMvc.perform(put("/api/ai/conversations/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"母亲生日花束"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("母亲生日花束"));

        conversationService.saveUserMessage(id, "妈妈生日送什么花？");
        conversationService.saveAssistantMessage(id, "可以看看康乃馨花束。",
                """
                        {"items":[{"productId":8,"name":"温柔康乃馨","category":"鲜花","price":128}]}
                        """,
                """
                        {"items":[{"documentId":1,"title":"康乃馨花语","category":"花语","snippet":"感恩与祝福"}]}
                        """,
                """
                        {"promptTokens":12,"completionTokens":8,"totalTokens":20,
                         "estimatedCost":0.0012,"model":"deepseek-chat"}
                        """,
                "deepseek-chat", false, "COMPLETE");

        mockMvc.perform(get("/api/ai/conversations/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.conversation.title").value("母亲生日花束"))
                .andExpect(jsonPath("$.data.messages[0].role").value("user"))
                .andExpect(jsonPath("$.data.messages[1].content").value("可以看看康乃馨花束。"))
                .andExpect(jsonPath("$.data.messages[1].products[0].productId").value(8))
                .andExpect(jsonPath("$.data.messages[1].citations").doesNotExist())
                .andExpect(jsonPath("$.data.messages[1].usage").doesNotExist())
                .andExpect(jsonPath("$.data.messages[1].model").doesNotExist());

        mockMvc.perform(post("/api/ai/conversations/batch-pin")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"ids":[%d],"pinned":true}
                                """.formatted(id)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.count").value(1));

        mockMvc.perform(get("/api/ai/conversations")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].pinned").value(true));

        mockMvc.perform(delete("/api/ai/conversations/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/ai/conversations/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void anonymousConversationsAreScopedBySessionKey() throws Exception {
        long id = createAnonymousConversation("it-ai-session-a");

        mockMvc.perform(get("/api/ai/conversations")
                        .header("X-Session-Id", "it-ai-session-a"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(id));

        mockMvc.perform(get("/api/ai/conversations/" + id)
                        .header("X-Session-Id", "it-ai-session-a"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.conversation.id").value(id));

        mockMvc.perform(get("/api/ai/conversations/" + id)
                        .header("X-Session-Id", "it-ai-session-b"))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanReadCitationsUsageAndModel() throws Exception {
        String token = login("admin", "admin123");
        long id = createConversation(token);
        conversationService.saveUserMessage(id, "玫瑰怎么养护？");
        conversationService.saveAssistantMessage(id, "斜剪根部并保持水质清洁。",
                null,
                """
                        {"items":[{"documentId":2,"title":"玫瑰养护","category":"养护","snippet":"每天换水"}]}
                        """,
                """
                        {"promptTokens":10,"completionTokens":6,"totalTokens":16,
                         "estimatedCost":0.0009,"model":"deepseek-chat"}
                        """,
                "deepseek-chat", true, "COMPLETE");

        mockMvc.perform(get("/api/ai/conversations/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.messages[1].citations[0].title").value("玫瑰养护"))
                .andExpect(jsonPath("$.data.messages[1].usage.totalTokens").value(16))
                .andExpect(jsonPath("$.data.messages[1].model").value("deepseek-chat"))
                .andExpect(jsonPath("$.data.messages[1].degraded").value(true));
    }

    private long createConversation(String token) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/ai/conversations")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("新的对话"))
                .andReturn();
        return idFrom(result);
    }

    private long createAnonymousConversation(String sessionKey) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/ai/conversations")
                        .header("X-Session-Id", sessionKey))
                .andExpect(status().isOk())
                .andReturn();
        return idFrom(result);
    }

    private long idFrom(MvcResult result) throws Exception {
        JsonNode root = objectMapper.readTree(
                result.getResponse().getContentAsString(StandardCharsets.UTF_8));
        assertThat(root.path("data").path("id").asLong()).isPositive();
        return root.path("data").path("id").asLong();
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
