package com.flower.mall.module.catalog;

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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class StoreProfileIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void publicEndpointReturnsBusinessPhone() throws Exception {
        mockMvc.perform(get("/api/catalog/store-profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.businessPhone").value("400-820-1024"));
    }

    @Test
    void adminCanUpdateBusinessPhoneAndPublicEndpointReadsIt() throws Exception {
        String token = login("admin", "admin123");
        mockMvc.perform(put("/api/admin/catalog/store-profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"businessPhone":" 021-8888 6666 "}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.businessPhone").value("021-8888 6666"));

        mockMvc.perform(get("/api/catalog/store-profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.businessPhone").value("021-8888 6666"));
    }

    @Test
    void rejectsInvalidBusinessPhone() throws Exception {
        String token = login("admin", "admin123");
        mockMvc.perform(put("/api/admin/catalog/store-profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"businessPhone":" "}
                                """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/admin/catalog/store-profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"businessPhone":"call-us"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void customerCannotUpdateBusinessPhone() throws Exception {
        String token = login("customer", "customer123");
        mockMvc.perform(put("/api/admin/catalog/store-profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"businessPhone":"021-8888 6666"}
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
        JsonNode root = objectMapper.readTree(
                result.getResponse().getContentAsString(StandardCharsets.UTF_8));
        return root.path("data").path("token").asText();
    }
}
