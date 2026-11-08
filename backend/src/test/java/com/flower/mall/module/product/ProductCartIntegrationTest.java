package com.flower.mall.module.product;

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
class ProductCartIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void seasonFilterIncludesAllSeasonProductsAndRejectsInvalidValue() throws Exception {
        mockMvc.perform(get("/api/products")
                        .param("season", "SUMMER")
                        .param("size", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(10))
                .andExpect(jsonPath("$.data.records[0].id").isNumber());

        mockMvc.perform(get("/api/products")
                        .param("season", "RAINY"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400));
    }

    @Test
    void mergedCartQuantityCannotExceedPerProductLimit() throws Exception {
        String token = login("customer", "customer123");

        mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId":1,"quantity":99}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.quantity").value(99));

        mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId":1,"quantity":1}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(3003));

        mockMvc.perform(get("/api/cart")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].quantity").value(99));
    }

    @Test
    void soldOutProductAutoOffShelvesAndCannotBeListedWithZeroStock() throws Exception {
        String adminToken = login("admin", "admin123");

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"零库存商品","category":"玫瑰","price":99.00,
                                 "stock":0,"seasonSuitability":"ALL","status":"ON_SALE"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.stock").value(0))
                .andExpect(jsonPath("$.data.status").value("OFF_SHELF"));

        MvcResult created = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", bearer(adminToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"售罄自动下架花束","category":"玫瑰","price":99.00,
                                 "stock":1,"seasonSuitability":"ALL","status":"ON_SALE"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ON_SALE"))
                .andReturn();
        long productId = objectMapper
                .readTree(created.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .path("data").path("id").asLong();

        String customerToken = login("customer", "customer123");
        long cartItemId = addToCart(customerToken, productId, 1);
        mockMvc.perform(post("/api/orders")
                        .header("Authorization", bearer(customerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"cartItemIds":[%d],"receiverName":"测试收花人",
                                 "receiverPhone":"13900000003","receiverAddress":"上海市测试路1号"}
                                """.formatted(cartItemId)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/products/" + productId)
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.stock").value(0))
                .andExpect(jsonPath("$.data.status").value("OFF_SHELF"));

        mockMvc.perform(put("/api/admin/products/" + productId + "/status")
                        .header("Authorization", bearer(adminToken))
                        .param("status", "ON_SALE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400));

        String staffToken = login("staff", "staff123");
        mockMvc.perform(post("/api/staff/products/" + productId + "/stock")
                        .header("Authorization", bearer(staffToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"delta":5,"remark":"补货"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/admin/products/" + productId + "/status")
                        .header("Authorization", bearer(adminToken))
                        .param("status", "ON_SALE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ON_SALE"));
    }

    private long addToCart(String token, long productId, int quantity) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId":%d,"quantity":%d}
                                """.formatted(productId, quantity)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .path("data").path("id").asLong();
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
