package com.flower.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flower.ai.client.DeepSeekClient;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TitleServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void blankUserMessageReturnsDefaultTitle() {
        DeepSeekClient client = mock(DeepSeekClient.class);
        TitleService service = new TitleService(client, objectMapper);

        Map<String, Object> result = service.generate(new TitleService.TitleRequest("  ", "回答"));

        assertThat(result.get("title")).isEqualTo("新的对话");
        assertThat(result.get("degraded")).isEqualTo(true);
        assertThat(result.get("model")).isEqualTo("fallback");
    }

    @Test
    void unavailableModelFallsBackToQuestionSummary() {
        DeepSeekClient client = mock(DeepSeekClient.class);
        when(client.available()).thenReturn(false);
        TitleService service = new TitleService(client, objectMapper);

        String question = "送女朋友纪念日，预算两百元，想要温柔一点的粉色系花束";
        Map<String, Object> result = service.generate(new TitleService.TitleRequest(question, ""));

        assertThat((String) result.get("title")).endsWith("…").hasSize(17);
        assertThat(result.get("degraded")).isEqualTo(true);
        assertThat(result.get("fallbackReason")).isEqualTo("DeepSeek API Key 未配置");
    }

    @Test
    void parsesTitleFromModelJson() {
        DeepSeekClient client = mock(DeepSeekClient.class);
        when(client.available()).thenReturn(true);
        when(client.complete(anyList(), anyDouble(), anyInt()))
                .thenReturn(new DeepSeekClient.Completion(
                        "```json\n{\"title\":\"纪念日温柔花束\"}\n```", 20, 8, "deepseek-chat"));
        TitleService service = new TitleService(client, objectMapper);

        Map<String, Object> result = service.generate(new TitleService.TitleRequest(
                "纪念日送女朋友什么花", "可以选择粉色玫瑰"));

        assertThat(result.get("title")).isEqualTo("纪念日温柔花束");
        assertThat(result.get("degraded")).isEqualTo(false);
        assertThat(result.get("model")).isEqualTo("deepseek-chat");
    }
}
