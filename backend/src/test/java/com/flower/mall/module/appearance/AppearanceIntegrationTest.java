package com.flower.mall.module.appearance;

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
class AppearanceIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void publicEndpointReturnsEmptyBackgroundByDefault() throws Exception {
        mockMvc.perform(get("/api/appearance/auth-background"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.backgroundType").value("NONE"))
                .andExpect(jsonPath("$.data.imageUrl").doesNotExist())
                .andExpect(jsonPath("$.data.palette").value("default"))
                .andExpect(jsonPath("$.data.accent").value("sky"))
                .andExpect(jsonPath("$.data.customAccent").value("#38bdf8"))
                .andExpect(jsonPath("$.data.fontFamily").value("default"))
                .andExpect(jsonPath("$.data.fontSize").value(14.0));
    }

    @Test
    void adminCanUpdateBackgroundAndAnonymousUserCanReadIt() throws Exception {
        String token = login("admin", "admin123");
        mockMvc.perform(put("/api/admin/appearance/auth-background")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"imageUrl":"https://example.com/login-background.jpg",
                                 "backgroundType":"IMAGE",
                                 "backgroundOpacity":0.62,"backgroundBlur":12,"componentOpacity":0.85,
                                 "palette":"rose-pine-dawn","accent":"custom","customAccent":"#B4637A",
                                 "fontFamily":"rounded","fontSize":16.5}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.backgroundType").value("IMAGE"))
                .andExpect(jsonPath("$.data.imageUrl")
                        .value("https://example.com/login-background.jpg"))
                .andExpect(jsonPath("$.data.backgroundOpacity").value(0.62))
                .andExpect(jsonPath("$.data.backgroundBlur").value(12))
                .andExpect(jsonPath("$.data.componentOpacity").value(0.85))
                .andExpect(jsonPath("$.data.palette").value("rose-pine-dawn"))
                .andExpect(jsonPath("$.data.accent").value("custom"))
                .andExpect(jsonPath("$.data.customAccent").value("#b4637a"))
                .andExpect(jsonPath("$.data.fontFamily").value("rounded"))
                .andExpect(jsonPath("$.data.fontSize").value(16.5));

        mockMvc.perform(get("/api/appearance/auth-background"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imageUrl")
                        .value("https://example.com/login-background.jpg"))
                .andExpect(jsonPath("$.data.palette").value("rose-pine-dawn"))
                .andExpect(jsonPath("$.data.accent").value("custom"))
                .andExpect(jsonPath("$.data.fontFamily").value("rounded"))
                .andExpect(jsonPath("$.data.fontSize").value(16.5));

        // 只更新图片时保留已保存的配色
        mockMvc.perform(put("/api/admin/appearance/auth-background")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"imageUrl":"  "}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imageUrl").doesNotExist())
                .andExpect(jsonPath("$.data.palette").value("rose-pine-dawn"))
                .andExpect(jsonPath("$.data.accent").value("custom"))
                .andExpect(jsonPath("$.data.customAccent").value("#b4637a"))
                .andExpect(jsonPath("$.data.fontFamily").value("rounded"))
                .andExpect(jsonPath("$.data.fontSize").value(16.5));
    }

    @Test
    void rejectsInvalidPaletteOrAccent() throws Exception {
        String token = login("admin", "admin123");
        mockMvc.perform(put("/api/admin/appearance/auth-background")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"imageUrl":"","palette":"neon","accent":"pink"}
                                """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/admin/appearance/auth-background")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"imageUrl":"","accent":"custom","customAccent":"red"}
                                """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/admin/appearance/auth-background")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"imageUrl":"","fontFamily":"comic-sans"}
                                """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/admin/appearance/auth-background")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"imageUrl":"","fontSize":21}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void customerCannotUpdateBackground() throws Exception {
        String token = login("customer", "customer123");
        mockMvc.perform(put("/api/admin/appearance/auth-background")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"imageUrl":"https://example.com/login-background.jpg"}
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
