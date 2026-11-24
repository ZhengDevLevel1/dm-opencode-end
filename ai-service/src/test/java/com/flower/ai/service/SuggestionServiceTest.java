package com.flower.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flower.ai.client.DeepSeekClient;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SuggestionServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void parsesQuestionsFromModelJson() throws Exception {
        DeepSeekClient client = mock(DeepSeekClient.class);
        when(client.available()).thenReturn(true);
        when(client.complete(anyList(), anyDouble(), anyInt()))
                .thenReturn(new DeepSeekClient.Completion(
                        "{\"questions\":[\"预算200元以内怎么搭配？\",\"这款适合送长辈吗？\",\"收到后怎么养护？\"]}",
                        32, 18, "deepseek-chat"));
        SuggestionService service = new SuggestionService(client, objectMapper);

        SuggestionService.SuggestionResult result = service.suggest(
                "母亲生日送什么花？", List.of("用户：妈妈生日"), List.of("温柔康乃馨")).get();

        assertThat(result.questions()).hasSize(3);
        assertThat(result.questions().get(1)).isEqualTo("这款适合送长辈吗？");
        assertThat(result.promptTokens()).isEqualTo(32);
        assertThat(result.completionTokens()).isEqualTo(18);
        assertThat(result.model()).isEqualTo("deepseek-chat");
        assertThat(result.degraded()).isFalse();
    }

    @Test
    void unavailableModelReturnsLocalFollowUps() throws Exception {
        DeepSeekClient client = mock(DeepSeekClient.class);
        when(client.available()).thenReturn(false);
        SuggestionService service = new SuggestionService(client, objectMapper);

        SuggestionService.SuggestionResult result = service.suggest(
                "预算200元送女朋友", List.of(), List.of("粉色玫瑰花束")).get();

        assertThat(result.questions()).hasSizeGreaterThanOrEqualTo(3);
        assertThat(result.degraded()).isTrue();
        assertThat(result.model()).isEqualTo("fallback");
        assertThat(result.questions()).allMatch(question -> question.length() >= 4);
    }

    @Test
    void malformedModelJsonFallsBack() throws Exception {
        DeepSeekClient client = mock(DeepSeekClient.class);
        when(client.available()).thenReturn(true);
        when(client.complete(anyList(), anyDouble(), anyInt()))
                .thenReturn(new DeepSeekClient.Completion("not json", 10, 4, "deepseek-chat"));
        SuggestionService service = new SuggestionService(client, objectMapper);

        SuggestionService.SuggestionResult result = service.suggest(
                "办公室放什么绿植好？", List.of(), List.of("绿色小盆栽")).get();

        assertThat(result.degraded()).isTrue();
        assertThat(result.questions()).hasSizeGreaterThanOrEqualTo(3);
    }
}
