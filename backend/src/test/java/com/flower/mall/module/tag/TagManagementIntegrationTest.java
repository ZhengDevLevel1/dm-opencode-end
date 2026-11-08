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
                .andExpect(jsonPath("$.data.occasions.length()").value(39))
                .andExpect(jsonPath("$.data.maxCounts.occasions").value(8));

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
