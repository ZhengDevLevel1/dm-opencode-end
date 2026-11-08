package com.flower.mall.module.order;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flower.mall.module.cart.entity.CartItem;
import com.flower.mall.module.cart.mapper.CartItemMapper;
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
class OrderPaymentFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ProductMapper productMapper;

    @Autowired
    private CartItemMapper cartItemMapper;

    @Test
    void loginWorksAndRoleProtectionIsEnforced() throws Exception {
        String customerToken = login("customer", "customer123");
        String adminToken = login("admin", "admin123");

        mockMvc.perform(get("/api/admin/stats/overview")
                        .header("Authorization", bearer(customerToken)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403));

        mockMvc.perform(get("/api/orders"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(401));

        mockMvc.perform(get("/api/admin/stats/overview")
                        .header("Authorization", bearer(adminToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalOrders").isNumber())
                .andExpect(jsonPath("$.data.onSaleProducts").isNumber());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"disabled","password":"customer123"}
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(1004));

        mockMvc.perform(post("/api/orders/1/cancel")
                        .header("Authorization", bearer(customerToken)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(4002));
    }

    @Test
    void createOrderDeductsStockAndCancelRestoresIt() throws Exception {
        String token = login("customer", "customer123");
        long cartItemId = addToCart(token, 16L, 2);
        int stockAfterAdd = productMapper.selectById(16L).getStock();
        assertThat(stockAfterAdd).isEqualTo(6);

        long orderId = createOrder(token, cartItemId);
        assertThat(productMapper.selectById(16L).getStock()).isEqualTo(4);

        mockMvc.perform(get("/api/orders/" + orderId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING_PAYMENT"))
                .andExpect(jsonPath("$.data.items[0].productId").value(16));

        mockMvc.perform(post("/api/orders/" + orderId + "/cancel")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reason":"测试取消"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));

        assertThat(productMapper.selectById(16L).getStock()).isEqualTo(6);

        mockMvc.perform(post("/api/orders/" + orderId + "/cancel")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(4002));
    }

    @Test
    void paymentIsIdempotentAndFulfillmentAndReviewFlowIsGuarded() throws Exception {
        String customerToken = login("customer", "customer123");
        String staffToken = login("staff", "staff123");
        long cartItemId = addToCart(customerToken, 5L, 1);
        long orderId = createOrder(customerToken, cartItemId);
        int salesBeforePay = productMapper.selectById(5L).getSalesCount();

        MvcResult paymentResult = mockMvc.perform(post("/api/payments/orders/" + orderId)
                        .header("Authorization", bearer(customerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andReturn();
        String paymentNo = read(paymentResult).path("data").path("paymentNo").asText();

        mockMvc.perform(post("/api/payments/" + paymentNo + "/mock-callback")
                        .header("Authorization", bearer(customerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUCCESS"));
        mockMvc.perform(post("/api/payments/" + paymentNo + "/mock-callback")
                        .header("Authorization", bearer(customerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUCCESS"));

        mockMvc.perform(get("/api/orders/" + orderId)
                        .header("Authorization", bearer(customerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PAID"));
        assertThat(productMapper.selectById(5L).getSalesCount()).isEqualTo(salesBeforePay + 1);

        mockMvc.perform(post("/api/payments/orders/" + orderId)
                        .header("Authorization", bearer(customerToken)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(5003));

        mockMvc.perform(post("/api/staff/orders/" + orderId + "/accept")
                        .header("Authorization", bearer(staffToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].node").value("ACCEPTED"));

        mockMvc.perform(post("/api/staff/orders/" + orderId + "/fulfillment")
                        .header("Authorization", bearer(staffToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"node":"DELIVERING","remark":"跳级测试"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(5502));

        advanceFulfillment(staffToken, orderId, "PREPARING");
        advanceFulfillment(staffToken, orderId, "DELIVERING");
        advanceFulfillment(staffToken, orderId, "SIGNED");

        MvcResult detailResult = mockMvc.perform(get("/api/orders/" + orderId)
                        .header("Authorization", bearer(customerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andReturn();
        long orderItemId = read(detailResult).path("data").path("items").get(0).path("id").asLong();

        mockMvc.perform(post("/api/reviews")
                        .header("Authorization", bearer(customerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"orderItemId":%d,"rating":5,"content":"流程测试评价"}
                                """.formatted(orderItemId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rating").value(5));

        mockMvc.perform(post("/api/reviews")
                        .header("Authorization", bearer(customerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"orderItemId":%d,"rating":4,"content":"重复评价"}
                                """.formatted(orderItemId)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(6001));
    }

    @Test
    void afterSaleApprovalRefundsAndRestoresStock() throws Exception {
        String customerToken = login("customer", "customer123");
        String staffToken = login("staff", "staff123");
        int stockBefore = productMapper.selectById(5L).getStock();
        int salesBefore = productMapper.selectById(5L).getSalesCount();
        long cartItemId = addToCart(customerToken, 5L, 1);
        long orderId = createOrder(customerToken, cartItemId);
        payOrder(customerToken, orderId);
        completeFulfillment(staffToken, orderId);

        mockMvc.perform(post("/api/orders/" + orderId + "/after-sale")
                        .header("Authorization", bearer(customerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reason":"花材不新鲜，申请退款"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("AFTER_SALE"));

        mockMvc.perform(post("/api/staff/orders/" + orderId + "/after-sale")
                        .header("Authorization", bearer(staffToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"approved":true,"remark":"同意退款"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REFUNDED"));

        assertThat(productMapper.selectById(5L).getStock()).isEqualTo(stockBefore);
        assertThat(productMapper.selectById(5L).getSalesCount()).isEqualTo(salesBefore);
        mockMvc.perform(get("/api/payments/orders/" + orderId)
                        .header("Authorization", bearer(customerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REFUNDED"));
    }

    @Test
    void afterSaleRejectionReturnsOrderToCompleted() throws Exception {
        String customerToken = login("customer", "customer123");
        String aliceToken = login("alice", "alice123");
        String staffToken = login("staff", "staff123");

        mockMvc.perform(post("/api/orders/3/after-sale")
                        .header("Authorization", bearer(aliceToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reason":"未完成订单不应允许售后"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(4002));

        mockMvc.perform(post("/api/orders/1/after-sale")
                        .header("Authorization", bearer(customerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reason":"包装破损"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("AFTER_SALE"));

        mockMvc.perform(post("/api/staff/orders/1/after-sale")
                        .header("Authorization", bearer(staffToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"approved":false,"remark":"不符合售后条件"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.afterSaleReason").value(org.hamcrest.Matchers.containsString("拒绝退款")));

        mockMvc.perform(get("/api/payments/orders/1")
                        .header("Authorization", bearer(customerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUCCESS"));
    }

    @Test
    void staffCancelPaidOrderRefundsAndRestoresStock() throws Exception {
        String customerToken = login("customer", "customer123");
        String staffToken = login("staff", "staff123");
        int stockBefore = productMapper.selectById(5L).getStock();
        int salesBefore = productMapper.selectById(5L).getSalesCount();
        long cartItemId = addToCart(customerToken, 5L, 1);
        long orderId = createOrder(customerToken, cartItemId);
        payOrder(customerToken, orderId);

        mockMvc.perform(post("/api/staff/orders/" + orderId + "/cancel")
                        .header("Authorization", bearer(staffToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"reason":"店员取消已支付订单"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));

        assertThat(productMapper.selectById(5L).getStock()).isEqualTo(stockBefore);
        assertThat(productMapper.selectById(5L).getSalesCount()).isEqualTo(salesBefore);
        mockMvc.perform(get("/api/payments/orders/" + orderId)
                        .header("Authorization", bearer(customerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REFUNDED"));
    }

    @Test
    void paymentAndReviewRejectInvalidOrderStates() throws Exception {
        String customerToken = login("customer", "customer123");
        String aliceToken = login("alice", "alice123");

        mockMvc.perform(post("/api/payments/orders/4")
                        .header("Authorization", bearer(customerToken)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(4002));

        mockMvc.perform(post("/api/payments/orders/2")
                        .header("Authorization", bearer(aliceToken)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(4002));

        mockMvc.perform(post("/api/reviews")
                        .header("Authorization", bearer(aliceToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"orderItemId":5,"rating":5,"content":"未完成订单评价"}
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(6002));
    }

    @Test
    void staleCartCannotOversellStock() throws Exception {
        String customerToken = login("customer", "customer123");
        long cartItemId = addToCart(customerToken, 16L, 6);
        createOrder(customerToken, cartItemId);
        assertThat(productMapper.selectById(16L).getStock()).isZero();
        assertThat(productMapper.deductStock(16L, 1)).isZero();

        CartItem stale = new CartItem();
        stale.setUserId(4L);
        stale.setProductId(16L);
        stale.setQuantity(1);
        cartItemMapper.insert(stale);

        String aliceToken = login("alice", "alice123");
        assertThat(productMapper.selectById(16L).getStatus()).isEqualTo("OFF_SHELF");
        mockMvc.perform(post("/api/orders")
                        .header("Authorization", bearer(aliceToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"receiverName":"爱丽丝","receiverPhone":"13900000004",
                                 "receiverAddress":"上海市静安区测试路1号"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(2002));
        assertThat(productMapper.selectById(16L).getStock()).isZero();
    }

    @Test
    void offShelfProductCannotBeAddedToCart() throws Exception {
        String token = login("customer", "customer123");
        mockMvc.perform(post("/api/cart/items")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productId":15,"quantity":1}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(2002));
    }

    @Test
    void duplicateReviewOnSeededOrderIsRejected() throws Exception {
        String token = login("customer", "customer123");
        mockMvc.perform(post("/api/reviews")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"orderItemId":2,"rating":4,"content":"百合很新鲜"}
                                """))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/reviews")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"orderItemId":2,"rating":4,"content":"再次评价"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(6001));
    }

    private String login(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","password":"%s"}
                                """.formatted(username, password)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andReturn();
        return read(result).path("data").path("token").asText();
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
        return read(result).path("data").path("id").asLong();
    }

    private long createOrder(String token, long cartItemId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/orders")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"cartItemIds":[%d],"receiverName":"测试收花人",
                                 "receiverPhone":"13900000003","receiverAddress":"上海市测试路1号"}
                                """.formatted(cartItemId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING_PAYMENT"))
                .andReturn();
        return read(result).path("data").path("id").asLong();
    }

    private void payOrder(String customerToken, long orderId) throws Exception {
        MvcResult paymentResult = mockMvc.perform(post("/api/payments/orders/" + orderId)
                        .header("Authorization", bearer(customerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andReturn();
        String paymentNo = read(paymentResult).path("data").path("paymentNo").asText();
        mockMvc.perform(post("/api/payments/" + paymentNo + "/mock-callback")
                        .header("Authorization", bearer(customerToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUCCESS"));
    }

    private void completeFulfillment(String staffToken, long orderId) throws Exception {
        mockMvc.perform(post("/api/staff/orders/" + orderId + "/accept")
                        .header("Authorization", bearer(staffToken)))
                .andExpect(status().isOk());
        advanceFulfillment(staffToken, orderId, "PREPARING");
        advanceFulfillment(staffToken, orderId, "DELIVERING");
        advanceFulfillment(staffToken, orderId, "SIGNED");
    }

    private void advanceFulfillment(String staffToken, long orderId, String node) throws Exception {
        mockMvc.perform(post("/api/staff/orders/" + orderId + "/fulfillment")
                        .header("Authorization", bearer(staffToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"node":"%s","remark":"测试推进"}
                                """.formatted(node)))
                .andExpect(status().isOk());
    }

    private JsonNode read(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
