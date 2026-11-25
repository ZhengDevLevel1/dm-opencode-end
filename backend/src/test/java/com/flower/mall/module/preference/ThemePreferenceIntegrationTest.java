package com.flower.mall.module.preference;

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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ThemePreferenceIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void preferenceIsSavedPerUser() throws Exception {
        String customer = login("customer", "customer123");
        String alice = login("alice", "alice123");

        mockMvc.perform(get("/api/auth/preferences").header("Authorization", bearer(customer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").doesNotExist());

        String body = themePreferenceBody();

        mockMvc.perform(put("/api/auth/preferences")
                        .header("Authorization", bearer(customer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mode").value("dark"))
                .andExpect(jsonPath("$.data.palette").value("rose-pine"))
                .andExpect(jsonPath("$.data.fontFamily").value("kai"))
                .andExpect(jsonPath("$.data.fontSize").value(15.5))
                .andExpect(jsonPath("$.data.scale").value(1.05))
                .andExpect(jsonPath("$.data.componentOpacity").value(0.9))
                .andExpect(jsonPath("$.data.sidebarPinned").value(true))
                .andExpect(jsonPath("$.data.sidebarLocked").value(false));

        mockMvc.perform(get("/api/auth/preferences").header("Authorization", bearer(customer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mode").value("dark"))
                .andExpect(jsonPath("$.data.radius").value("round"))
                .andExpect(jsonPath("$.data.fontFamily").value("kai"))
                .andExpect(jsonPath("$.data.fontSize").value(15.5))
                .andExpect(jsonPath("$.data.sidebarPinned").value(true))
                .andExpect(jsonPath("$.data.sidebarLocked").value(false));

        mockMvc.perform(get("/api/auth/preferences").header("Authorization", bearer(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void sidebarLockOverridesPinnedAndIsSavedPerUser() throws Exception {
        String customer = login("customer", "customer123");
        String alice = login("alice", "alice123");

        mockMvc.perform(put("/api/auth/preferences")
                        .header("Authorization", bearer(customer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(themePreferenceBody("true", "true")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sidebarPinned").value(false))
                .andExpect(jsonPath("$.data.sidebarLocked").value(true));

        mockMvc.perform(get("/api/auth/preferences").header("Authorization", bearer(customer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sidebarPinned").value(false))
                .andExpect(jsonPath("$.data.sidebarLocked").value(true));

        mockMvc.perform(get("/api/auth/preferences").header("Authorization", bearer(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void mapPreferenceIsSavedPerUser() throws Exception {
        String customer = login("customer", "customer123");
        String alice = login("alice", "alice123");

        mockMvc.perform(get("/api/auth/preferences/map").header("Authorization", bearer(customer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.snapToLandmark").value(false));

        mockMvc.perform(put("/api/auth/preferences/map")
                        .header("Authorization", bearer(customer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"snapToLandmark\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.snapToLandmark").value(true));

        mockMvc.perform(get("/api/auth/preferences/map").header("Authorization", bearer(customer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.snapToLandmark").value(true));

        mockMvc.perform(get("/api/auth/preferences/map").header("Authorization", bearer(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.snapToLandmark").value(false));

        mockMvc.perform(put("/api/auth/preferences/map")
                        .header("Authorization", bearer(alice))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"snapToLandmark\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.snapToLandmark").value(true));

        mockMvc.perform(get("/api/auth/preferences/map").header("Authorization", bearer(customer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.snapToLandmark").value(true));
        mockMvc.perform(get("/api/auth/preferences/map").header("Authorization", bearer(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.snapToLandmark").value(true));
    }

    @Test
    void mapPreferenceRequiresValue() throws Exception {
        String customer = login("customer", "customer123");
        mockMvc.perform(put("/api/auth/preferences/map")
                        .header("Authorization", bearer(customer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    void themeUpdatePreservesMapPreference() throws Exception {
        String customer = login("customer", "customer123");
        mockMvc.perform(put("/api/auth/preferences/map")
                        .header("Authorization", bearer(customer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"snapToLandmark\":true}"))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/auth/preferences")
                        .header("Authorization", bearer(customer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(themePreferenceBody()))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/auth/preferences/map").header("Authorization", bearer(customer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.snapToLandmark").value(true));
    }

    @Test
    void invalidPreferenceIsRejected() throws Exception {
        String customer = login("customer", "customer123");
        mockMvc.perform(put("/api/auth/preferences")
                        .header("Authorization", bearer(customer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mode":"dark","palette":"rose-pine","accent":"rose",
                                 "customAccent":"#c25b6a","fontFamily":"default","fontSize":14,"radius":"round",
                                 "density":"compact","sidebarStyle":"panel","scale":2.0,
                                 "reduceMotion":true,"highContrast":false,"background":"gradient",
                                 "backgroundImage":"","backgroundOpacity":0.7,
                                  "backgroundBlur":8,"componentOpacity":0.9,
                                  "sidebarPinned":false,"sidebarLocked":false}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    void invalidFontFamilyIsRejected() throws Exception {
        String customer = login("customer", "customer123");
        mockMvc.perform(put("/api/auth/preferences")
                        .header("Authorization", bearer(customer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mode":"dark","palette":"rose-pine","accent":"rose",
                                 "customAccent":"#c25b6a","fontFamily":"comic-sans","fontSize":14,"radius":"round",
                                 "density":"compact","sidebarStyle":"panel","scale":1.0,
                                 "reduceMotion":true,"highContrast":false,"background":"gradient",
                                 "backgroundImage":"","backgroundOpacity":0.7,
                                  "backgroundBlur":8,"componentOpacity":0.9,
                                  "sidebarPinned":false,"sidebarLocked":false}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    void invalidFontSizeIsRejected() throws Exception {
        String customer = login("customer", "customer123");
        mockMvc.perform(put("/api/auth/preferences")
                        .header("Authorization", bearer(customer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mode":"dark","palette":"rose-pine","accent":"rose",
                                 "customAccent":"#c25b6a","fontFamily":"default","fontSize":21,"radius":"round",
                                 "density":"compact","sidebarStyle":"panel","scale":1.0,
                                 "reduceMotion":true,"highContrast":false,"background":"gradient",
                                 "backgroundImage":"","backgroundOpacity":0.7,
                                  "backgroundBlur":8,"componentOpacity":0.9,
                                  "sidebarPinned":false,"sidebarLocked":false}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    void missingSidebarLockedIsRejected() throws Exception {
        String customer = login("customer", "customer123");
        mockMvc.perform(put("/api/auth/preferences")
                        .header("Authorization", bearer(customer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mode":"dark","palette":"rose-pine","accent":"rose",
                                 "customAccent":"#c25b6a","fontFamily":"default","fontSize":14,"radius":"round",
                                 "density":"compact","sidebarStyle":"panel","scale":1.0,
                                 "reduceMotion":true,"highContrast":false,"background":"gradient",
                                 "backgroundImage":"","backgroundOpacity":0.7,
                                 "backgroundBlur":8,"componentOpacity":0.9,
                                 "sidebarPinned":false}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400));
    }

    private String themePreferenceBody() {
        return themePreferenceBody("true", "false");
    }

    private String themePreferenceBody(String sidebarPinned, String sidebarLocked) {
        return """
                {
                  "mode": "dark",
                  "palette": "rose-pine",
                  "accent": "rose",
                  "customAccent": "#c25b6a",
                  "fontFamily": "kai",
                  "fontSize": 15.5,
                  "radius": "round",
                  "density": "compact",
                  "sidebarStyle": "panel",
                  "scale": 1.05,
                  "reduceMotion": true,
                  "highContrast": false,
                  "background": "gradient",
                  "backgroundImage": "",
                  "backgroundOpacity": 0.7,
                  "backgroundBlur": 8,
                  "componentOpacity": 0.9,
                  "sidebarPinned": %s,
                  "sidebarLocked": %s
                }
                """.formatted(sidebarPinned, sidebarLocked);
    }

    private String login(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                java.util.Map.of("username", username, "password", password))))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return body.path("data").path("token").asText();
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
