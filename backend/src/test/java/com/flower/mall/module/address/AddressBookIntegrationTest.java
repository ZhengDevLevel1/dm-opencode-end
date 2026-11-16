package com.flower.mall.module.address;

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
class AddressBookIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void addressBookRequiresLoginAndOnlyExposesOwnAddresses() throws Exception {
        mockMvc.perform(get("/api/addresses"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(401));

        String token = login("customer", "customer123");
        mockMvc.perform(get("/api/addresses")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[0].isDefault").value(true))
                .andExpect(jsonPath("$.data[0].fullAddress").value("上海市徐汇区衡山路88号1号楼502"));

        mockMvc.perform(get("/api/addresses/3")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(9001));
    }

    @Test
    void createSetDefaultAndDeleteAddressKeepsSingleDefault() throws Exception {
        String token = login("bob", "customer123");
        long firstId = createAddress(token, "鲍勃", "13900000005", "家", "上海市测试路1号", false);
        long secondId = createAddress(token, "鲍勃", "13900000005", "公司", "上海市测试路2号", false);

        mockMvc.perform(get("/api/addresses")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(firstId))
                .andExpect(jsonPath("$.data[0].isDefault").value(true))
                .andExpect(jsonPath("$.data[1].id").value(secondId))
                .andExpect(jsonPath("$.data[1].isDefault").value(false));

        mockMvc.perform(put("/api/addresses/" + secondId + "/default")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isDefault").value(true));

        mockMvc.perform(delete("/api/addresses/" + secondId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/addresses")
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(firstId))
                .andExpect(jsonPath("$.data[0].isDefault").value(true));
    }

    @Test
    void addressBookLimitIsEnforced() throws Exception {
        String token = login("bob", "customer123");
        for (int i = 1; i <= 10; i++) {
            createAddress(token, "鲍勃", "13900000005", "地址" + i, "上海市测试路" + i + "号", false);
        }
        mockMvc.perform(post("/api/addresses")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(addressJson("鲍勃", "13900000005", "额外地址", "上海市测试路11号", false)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(9002));
    }

    @Test
    void createOrderSnapshotsSelectedAddressAndStaffSeesCoordinates() throws Exception {
        String customerToken = login("customer", "customer123");
        long cartItemId = addToCart(customerToken, 16L, 1);

        MvcResult result = mockMvc.perform(post("/api/orders")
                        .header("Authorization", bearer(customerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"cartItemIds":[%d],"addressId":1,
                                 "receiverName":"伪造收货人","receiverPhone":"13900000009",
                                 "receiverAddress":"伪造地址"}
                                """.formatted(cartItemId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.receiverName").value("小玫"))
                .andExpect(jsonPath("$.data.receiverAddress").value("上海市徐汇区衡山路88号1号楼502"))
                .andExpect(jsonPath("$.data.receiverLongitude").value(121.4468))
                .andExpect(jsonPath("$.data.receiverLatitude").value(31.2043))
                .andReturn();
        long orderId = read(result).path("data").path("id").asLong();

        String staffToken = login("staff", "staff123");
        mockMvc.perform(get("/api/staff/orders/" + orderId)
                        .header("Authorization", bearer(staffToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.receiverName").value("小玫"))
                .andExpect(jsonPath("$.data.receiverLongitude").value(121.4468))
                .andExpect(jsonPath("$.data.receiverLatitude").value(31.2043));
    }

    @Test
    void otherUsersAddressCannotBeUsedForOrder() throws Exception {
        String customerToken = login("customer", "customer123");
        long cartItemId = addToCart(customerToken, 16L, 1);
        mockMvc.perform(post("/api/orders")
                        .header("Authorization", bearer(customerToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"cartItemIds":[%d],"addressId":3,
                                 "receiverName":"小玫","receiverPhone":"13900000003",
                                 "receiverAddress":"上海市测试路1号"}
                                """.formatted(cartItemId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(9001));
    }

    private long createAddress(String token, String receiverName, String phone,
                               String label, String detail, boolean makeDefault) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/addresses")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(addressJson(receiverName, phone, label, detail, makeDefault)))
                .andExpect(status().isOk())
                .andReturn();
        return read(result).path("data").path("id").asLong();
    }

    private String addressJson(String receiverName, String phone, String label,
                               String detail, boolean makeDefault) {
        return """
                {"receiverName":"%s","receiverPhone":"%s","label":"%s",
                 "province":"上海市","city":"上海市","district":"徐汇区",
                 "detailAddress":"%s","formattedAddress":"%s",
                 "longitude":121.4468,"latitude":31.2043,"isDefault":%s}
                """.formatted(receiverName, phone, label, detail, detail, makeDefault);
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

    private String login(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","password":"%s"}
                                """.formatted(username, password)))
                .andExpect(status().isOk())
                .andReturn();
        return read(result).path("data").path("token").asText();
    }

    private JsonNode read(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
