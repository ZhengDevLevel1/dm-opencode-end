package com.flower.mall.module.inventory;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flower.mall.module.product.mapper.ProductMapper;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class InventoryFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ProductMapper productMapper;

    @Test
    void staffAdjustsStockAndReadsMovementHistory() throws Exception {
        String staffToken = login("staff", "staff123");

        mockMvc.perform(post("/api/staff/products/16/stock")
                        .header("Authorization", bearer(staffToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"delta":5,"remark":"测试补货"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.changeType").value("MANUAL_ADJUST"))
                .andExpect(jsonPath("$.data.changeQuantity").value(5))
                .andExpect(jsonPath("$.data.stockBefore").value(6))
                .andExpect(jsonPath("$.data.stockAfter").value(11))
                .andExpect(jsonPath("$.data.remark").value("测试补货"));

        assertThat(productMapper.selectById(16L).getStock()).isEqualTo(11);
        mockMvc.perform(get("/api/staff/inventory")
                        .header("Authorization", bearer(staffToken))
                        .param("productId", "16")
                        .param("changeType", "MANUAL_ADJUST"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.records[0].changeQuantity").value(5))
                .andExpect(jsonPath("$.data.records[0].operatorName").value("staff"));
    }

    @Test
    void invalidStockAdjustmentsAreRejectedAndNoStockIsChanged() throws Exception {
        String customerToken = login("customer", "customer123");
        String staffToken = login("staff", "staff123");

        mockMvc.perform(post("/api/staff/products/16/stock")
                        .header("Authorization", bearer(customerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"delta":1,"remark":"越权调整"}
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403));

        mockMvc.perform(post("/api/staff/products/16/stock")
                        .header("Authorization", bearer(staffToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"delta":0,"remark":"零调整"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400));

        mockMvc.perform(post("/api/staff/products/16/stock")
                        .header("Authorization", bearer(staffToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"delta":-100,"remark":"负库存测试"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(2003));

        assertThat(productMapper.selectById(16L).getStock()).isEqualTo(6);
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
