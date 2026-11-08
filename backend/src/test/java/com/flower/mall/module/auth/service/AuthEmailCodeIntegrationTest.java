package com.flower.mall.module.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Properties;

import static org.mockito.Mockito.doReturn;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthEmailCodeIntegrationTest {

    private static final String CODE = "246810";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private JavaMailSender mailSender;

    @SpyBean
    private EmailCodeService emailCodeService;

    @BeforeEach
    void setUp() {
        doReturn(new MimeMessage(Session.getInstance(new Properties())))
                .when(mailSender).createMimeMessage();
        doReturn(CODE).when(emailCodeService).generateCode();
    }

    @Test
    void registerWithEmailCode() throws Exception {
        mockMvc.perform(post("/api/auth/email-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"newbie@flower.test","scene":"REGISTER"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        // 60 秒内重复发送会被频控拦截
        mockMvc.perform(post("/api/auth/email-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"newbie@flower.test","scene":"REGISTER"}
                                """))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value(1007));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"newbie","password":"newbie123",
                                 "email":"newbie@flower.test","emailCode":"000000"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(1006));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"newbie","password":"newbie123",
                                 "email":"newbie@flower.test","emailCode":"246810"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("newbie"))
                .andExpect(jsonPath("$.data.email").value("newbie@flower.test"))
                .andExpect(jsonPath("$.data.role").value("CUSTOMER"));

        // 邮箱已完成注册后不能再发送注册验证码
        mockMvc.perform(post("/api/auth/email-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"newbie@flower.test","scene":"REGISTER"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(1009));
    }

    @Test
    void loginWithEmailCode() throws Exception {
        mockMvc.perform(post("/api/auth/email-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"customer@flower.local","scene":"LOGIN"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/login/email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"customer@flower.local","code":"111111"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(1006));

        mockMvc.perform(post("/api/auth/login/email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"customer@flower.local","code":"246810"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.user.username").value("customer"));
    }

    @Test
    void changePasswordWithEmailCode() throws Exception {
        String token = login("customer", "customer123");

        // 既没有原密码也没有验证码时拒绝
        mockMvc.perform(put("/api/auth/password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"newPassword":"customer456"}
                                """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/auth/email-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"customer@flower.local","scene":"CHANGE_PASSWORD"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/auth/password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"newPassword":"customer456","emailCode":"000000"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(1006));

        mockMvc.perform(put("/api/auth/password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"newPassword":"customer456","emailCode":"246810"}
                                """))
                .andExpect(status().isOk());

        // 新密码可以正常登录
        login("customer", "customer456");
    }

    @Test
    void changeEmailWithVerificationCode() throws Exception {
        String token = login("customer", "customer123");

        // 目标邮箱已被其他账号占用时不能发送验证码
        mockMvc.perform(post("/api/auth/email-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"alice@flower.local","scene":"CHANGE_EMAIL"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(1009));

        mockMvc.perform(post("/api/auth/email-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"customer-new@flower.test","scene":"CHANGE_EMAIL"}
                                """))
                .andExpect(status().isOk());

        // 缺少验证码时拒绝修改
        mockMvc.perform(put("/api/auth/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"customer-new@flower.test"}
                                """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/auth/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"customer-new@flower.test","emailCode":"000000"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(1006));

        mockMvc.perform(put("/api/auth/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"customer-new@flower.test","emailCode":"246810"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("customer-new@flower.test"));
    }

    @Test
    void emailSceneChecks() throws Exception {
        mockMvc.perform(post("/api/auth/email-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"nobody@flower.test","scene":"LOGIN"}
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(1008));

        mockMvc.perform(post("/api/auth/email-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"disabled@flower.local","scene":"LOGIN"}
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(1004));

        mockMvc.perform(post("/api/auth/login/email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"nobody@flower.test","code":"246810"}
                                """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(1008));
    }

    private String login(String username, String password) throws Exception {
        String body = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("username", username, "password", password))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(body).path("data").path("token").asText();
    }
}
