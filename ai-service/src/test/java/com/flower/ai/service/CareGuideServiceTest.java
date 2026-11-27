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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CareGuideServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void unavailableModelReturnsTemplateGuide() {
        DeepSeekClient client = mock(DeepSeekClient.class);
        when(client.available()).thenReturn(false);
        RetrievalService retrieval = mock(RetrievalService.class);
        CareGuideService service = new CareGuideService(client, objectMapper, retrieval);

        Map<String, Object> result = service.careGuide(new CareGuideService.CareGuideRequest(
                Map.of("name", "测试花束", "category", "玫瑰"), ""));

        assertThat(result.get("degraded")).isEqualTo(true);
        assertThat(String.valueOf(result.get("careGuide"))).contains("45°", "测试花束");
        assertThat(result.get("model")).isEqualTo("fallback");
    }

    @Test
    void parsesGeneratedGuideAndUsage() {
        DeepSeekClient client = mock(DeepSeekClient.class);
        when(client.available()).thenReturn(true);
        when(client.complete(anyList(), anyDouble(), anyInt()))
                .thenReturn(new DeepSeekClient.Completion(
                        "{\"careGuide\":\"01 斜剪\\n收到后斜剪。\\n\\n02 换水\\n每两天换水。\"}",
                        80, 40, "deepseek-chat"));
        RetrievalService retrieval = mock(RetrievalService.class);
        when(retrieval.retrieveKnowledge(anyString(), anyInt())).thenReturn(List.of());
        CareGuideService service = new CareGuideService(client, objectMapper, retrieval);

        Map<String, Object> result = service.careGuide(new CareGuideService.CareGuideRequest(
                Map.of("name", "测试花束", "category", "玫瑰"), ""));

        assertThat(result.get("degraded")).isEqualTo(false);
        assertThat(String.valueOf(result.get("careGuide"))).contains("01 斜剪", "02 换水");
        assertThat(result.get("promptTokens")).isEqualTo(80);
        assertThat(result.get("completionTokens")).isEqualTo(40);
    }
}
