package com.flower.mall.module.tag;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flower.mall.common.enums.TagType;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.module.tag.service.TagService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.hasItem;
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
class TagManagementIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TagService tagService;

    @Test
    void adminCanManageTagsAndMaxCount() throws Exception {
        String token = login("admin", "admin123");

        mockMvc.perform(get("/api/admin/tags").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.categories.length()").value(10))
                .andExpect(jsonPath("$.data.occasions.length()").value(39))
                .andExpect(jsonPath("$.data.maxCounts.occasions").value(8));

        MvcResult category = mockMvc.perform(post("/api/admin/tags")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"CATEGORY\",\"name\":\"测试品类\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("测试品类"))
                .andExpect(jsonPath("$.data.homeVisible").value(true))
                .andReturn();
        long categoryId = objectMapper.readTree(category.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(get("/api/dict/options"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.categories", hasItem("测试品类")))
                .andExpect(jsonPath("$.data.homeCategories", hasItem("测试品类")));

        mockMvc.perform(delete("/api/admin/tags/" + categoryId)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk());

        MvcResult created = mockMvc.perform(post("/api/admin/tags")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OCCASION\",\"name\":\"测试场景\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("测试场景"))
                .andReturn();
        long id = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(post("/api/admin/tags")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OCCASION\",\"name\":\"测试场景\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(409));

        mockMvc.perform(put("/api/admin/tags/" + id)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"测试场景改\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("测试场景改"));

        mockMvc.perform(put("/api/admin/tags/max-count")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OCCASION\",\"maxCount\":3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.maxCount").value(3));

        mockMvc.perform(get("/api/dict/options"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tagMaxCounts.occasions").value(3))
                .andExpect(jsonPath("$.data.occasions", hasItem("测试场景改")));

        mockMvc.perform(delete("/api/admin/tags/" + id)
                        .header("Authorization", bearer(token)))
                .andExpect(status().isOk());

        assertThatThrownBy(() -> tagService.validateSelection(TagType.OCCASION, "表白,生日,纪念日,求婚"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void adminCanConfigureHomeDisplay() throws Exception {
        String token = login("admin", "admin123");

        JsonNode overview = objectMapper.readTree(
                mockMvc.perform(get("/api/admin/tags").header("Authorization", bearer(token)))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString())
                .path("data");
        JsonNode categories = overview.path("categories");
        JsonNode occasions = overview.path("occasions");
        assertThat(occasions.findValuesAsText("name")).hasSize(39);

        // 品类倒序展示，并隐藏原本排在第一个的品类。
        List<Map<String, Object>> categoryItems = new ArrayList<>();
        for (int index = categories.size() - 1; index >= 0; index--) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", categories.get(index).path("id").asLong());
            item.put("visible", index != 0);
            categoryItems.add(item);
        }
        mockMvc.perform(put("/api/admin/tags/home-display")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("type", "CATEGORY", "items", categoryItems))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/dict/options"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.homeCategories.length()").value(9))
                .andExpect(jsonPath("$.data.homeCategories[0]").value("礼盒"))
                .andExpect(jsonPath("$.data.categories.length()").value(10));

        // 场景默认只展示前 6 个，保存全部展示后首页场景列表变为 39 个。
        List<Map<String, Object>> occasionItems = new ArrayList<>();
        for (int index = 0; index < occasions.size(); index++) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", occasions.get(index).path("id").asLong());
            item.put("visible", true);
            occasionItems.add(item);
        }
        mockMvc.perform(put("/api/admin/tags/home-display")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("type", "OCCASION", "items", occasionItems))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/dict/options"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.homeOccasions.length()").value(39))
                .andExpect(jsonPath("$.data.homeOccasions[6]").value("教师节"));

        // 节日、花语不支持首页展示配置，品类也不支持最大可选数量。
        mockMvc.perform(put("/api/admin/tags/home-display")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"FESTIVAL\",\"items\":[{\"id\":1,\"visible\":true}]}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(put("/api/admin/tags/max-count")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"CATEGORY\",\"maxCount\":3}"))
                .andExpect(status().isBadRequest());

        // 配置不完整时拒绝保存。
        mockMvc.perform(put("/api/admin/tags/home-display")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "type", "CATEGORY",
                                "items", List.of(Map.of(
                                        "id", categories.get(0).path("id").asLong(),
                                        "visible", true))))))
                .andExpect(status().isBadRequest());
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
