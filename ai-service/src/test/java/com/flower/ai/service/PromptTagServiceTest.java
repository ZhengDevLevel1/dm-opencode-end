package com.flower.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flower.ai.client.DeepSeekClient;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PromptTagServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void parsesWordsFromModelJson() {
        DeepSeekClient client = mock(DeepSeekClient.class);
        when(client.available()).thenReturn(true);
        when(client.complete(anyList(), anyDouble(), anyInt()))
                .thenReturn(new DeepSeekClient.Completion(
                        "{\"words\":[\"生日惊喜\",\"纪念日\",\"毕业季\",\"约会表白\",\"日常用花\"]}",
                        40, 20, "deepseek-chat"));
        PromptTagService service = new PromptTagService(client, objectMapper);

        Map<String, Object> result = service.generate(
                new PromptTagService.PromptTagRequest("SCENE", "秋天"));

        assertThat((List<?>) result.get("words")).hasSizeGreaterThanOrEqualTo(5);
        assertThat(result.get("degraded")).isEqualTo(false);
        assertThat(result.get("model")).isEqualTo("deepseek-chat");
        assertThat(result.get("promptTokens")).isEqualTo(40);
    }

    @Test
    void unavailableModelReturnsCategoryFallback() {
        DeepSeekClient client = mock(DeepSeekClient.class);
        when(client.available()).thenReturn(false);
        PromptTagService service = new PromptTagService(client, objectMapper);

        Map<String, Object> result = service.generate(
                new PromptTagService.PromptTagRequest("关系/人群", "同事"));

        List<String> words = ((List<?>) result.get("words")).stream()
                .map(String::valueOf)
                .toList();
        assertThat(words).contains("同事", "朋友", "长辈");
        assertThat(result.get("degraded")).isEqualTo(true);
        assertThat(result.get("model")).isEqualTo("fallback");
    }

    @Test
    void shortModelOutputIsMergedWithFallbackWords() {
        DeepSeekClient client = mock(DeepSeekClient.class);
        when(client.available()).thenReturn(true);
        when(client.complete(anyList(), anyDouble(), anyInt()))
                .thenReturn(new DeepSeekClient.Completion(
                        "{\"words\":[\"预算友好\"]}", 20, 8, "deepseek-chat"));
        PromptTagService service = new PromptTagService(client, objectMapper);

        Map<String, Object> result = service.generate(
                new PromptTagService.PromptTagRequest("NEED", "学生党"));

        assertThat((List<?>) result.get("words")).hasSizeGreaterThanOrEqualTo(5);
        assertThat(result.get("degraded")).isEqualTo(false);
    }
}
