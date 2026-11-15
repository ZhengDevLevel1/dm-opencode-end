package com.flower.mall.module.user;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flower.mall.module.user.entity.User;
import com.flower.mall.module.user.mapper.UserMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class UserEmailUniquenessIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserMapper userMapper;

    @Test
    void databaseEnforcesUniqueEmail() {
        User user = new User();
        user.setUsername("raw_duplicate_email");
        user.setPassword("encoded");
        user.setRole("CUSTOMER");
        user.setStatus("ENABLED");
        user.setEmail("admin@flower.local");

        assertThatThrownBy(() -> userMapper.insert(user))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void adminCannotCreateOrUpdateUserWithExistingEmail() throws Exception {
        String token = login("admin", "admin123");

        mockMvc.perform(post("/api/admin/users")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"duplicate_email","password":"secret123",
                                 "email":"ALICE@FLOWER.LOCAL","role":"CUSTOMER"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(1009));

        mockMvc.perform(put("/api/admin/users/5")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"alice@flower.local"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(1009));
    }

    @Test
    void profileEmailChangeRejectsExistingEmailRegardlessOfCase() throws Exception {
        String token = login("customer", "customer123");

        mockMvc.perform(put("/api/auth/me")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"ALICE@FLOWER.LOCAL"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(1009));
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
