package com.flower.mall.module.search;

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

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.lessThan;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SearchIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void staffOrderSearchMatchesBuyerAndProductName() throws Exception {
        String token = login("staff", "staff123");

        mockMvc.perform(get("/api/staff/orders")
                        .header("Authorization", bearer(token))
                        .param("keyword", "小玫"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(2));

        mockMvc.perform(get("/api/staff/orders")
                        .header("Authorization", bearer(token))
                        .param("keyword", "alice"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(3));

        mockMvc.perform(get("/api/staff/orders")
                        .header("Authorization", bearer(token))
                        .param("keyword", "圣诞花环"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.records[0].orderNo").value("FL202605030003"));
    }

    @Test
    void staffProductSearchIncludesOffShelfAndSortsByStock() throws Exception {
        String token = login("staff", "staff123");

        mockMvc.perform(get("/api/staff/products")
                        .header("Authorization", bearer(token))
                        .param("keyword", "测试"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.records[0].id").value(15))
                .andExpect(jsonPath("$.data.records[0].status").value("OFF_SHELF"));

        mockMvc.perform(get("/api/staff/products/15")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(15))
                .andExpect(jsonPath("$.data.stock").value(10));

        mockMvc.perform(get("/api/staff/products")
                        .header("Authorization", bearer(token))
                        .param("sort", "stock_asc")
                        .param("size", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.records[0].id").value(16));

        mockMvc.perform(get("/api/staff/products")
                        .header("Authorization", bearer(token))
                        .param("lowStock", "true")
                        .param("size", "50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.records[*].stock", everyItem(lessThan(10))))
                .andExpect(jsonPath("$.data.records[*].status", everyItem(is("ON_SALE"))));
    }

    @Test
    void inventorySearchMatchesCatalogFields() throws Exception {
        String token = login("staff", "staff123");

        mockMvc.perform(get("/api/staff/inventory")
                        .header("Authorization", bearer(token))
                        .param("keyword", "感恩母爱"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.records[0].productId").value(3));

        mockMvc.perform(get("/api/staff/inventory")
                        .header("Authorization", bearer(token))
                        .param("keyword", "母亲节"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(2));

        mockMvc.perform(get("/api/staff/inventory")
                        .header("Authorization", bearer(token))
                        .param("keyword", "混搭"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.records[0].productId").value(7));
    }

    @Test
    void adminReviewSearchMatchesProductAndUser() throws Exception {
        String token = login("admin", "admin123");

        mockMvc.perform(get("/api/admin/reviews")
                        .header("Authorization", bearer(token))
                        .param("keyword", "感恩母爱"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.records[0].productId").value(3))
                .andExpect(jsonPath("$.data.records[0].nickname").value("爱丽丝"));

        mockMvc.perform(get("/api/admin/reviews")
                        .header("Authorization", bearer(token))
                        .param("keyword", "alice"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.records[0].userId").value(4));
    }

    @Test
    void recommendationLogSearchMatchesNicknameAndChineseLabels() throws Exception {
        String token = login("admin", "admin123");

        mockMvc.perform(get("/api/admin/recommendations/logs")
                        .header("Authorization", bearer(token))
                        .param("keyword", "小玫"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.records[0].userNickname").value("小玫"))
                .andExpect(jsonPath("$.data.records[0].sceneLabel").value("生日"))
                .andExpect(jsonPath("$.data.records[0].seasonLabel").value("夏季"));

        mockMvc.perform(get("/api/admin/recommendations/logs")
                        .header("Authorization", bearer(token))
                        .param("keyword", "春季"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.records[0].seasonLabel").value("春季"));

        mockMvc.perform(get("/api/admin/recommendations/logs")
                        .header("Authorization", bearer(token))
                        .param("keyword", "首页推荐"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(0));
    }

    private String login(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","password":"%s"}
                                """.formatted(username, password)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .path("data").path("token").asText();
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
