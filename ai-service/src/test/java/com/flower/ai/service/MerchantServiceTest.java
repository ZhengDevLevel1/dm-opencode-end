package com.flower.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flower.ai.client.DeepSeekClient;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MerchantServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void fallbackAdviceAlwaysReturnsNonNegativeWeightsSummingToOne() {
        DeepSeekClient client = mock(DeepSeekClient.class);
        when(client.available()).thenReturn(false);
        MerchantService service = new MerchantService(client, objectMapper);

        Map<String, Object> result = service.recommendationAdvice(new MerchantService.AdviceRequest(
                "home", "首页",
                Map.of("content", 0.0, "popularity", 0.0, "festival", 0.0, "rating", 0.0),
                30));

        Map<String, Double> weights = weights(result);
        assertThat(weights.values()).allSatisfy(value -> assertThat(value).isBetween(0.0, 1.0));
        assertThat(weights.values().stream().mapToDouble(Double::doubleValue).sum())
                .isCloseTo(1.0, within(1e-9));
        assertThat(result.get("degraded")).isEqualTo(true);
    }

    @Test
    void fallbackAdviceNormalizesSkewedWeights() {
        DeepSeekClient client = mock(DeepSeekClient.class);
        when(client.available()).thenReturn(false);
        MerchantService service = new MerchantService(client, objectMapper);

        Map<String, Object> result = service.recommendationAdvice(new MerchantService.AdviceRequest(
                "home", "首页",
                Map.of("content", 0.7, "popularity", 0.7, "festival", 0.7, "rating", 0.7),
                30));

        Map<String, Double> weights = weights(result);
        assertThat(weights.get("content")).isGreaterThan(weights.get("popularity"));
        assertThat(weights.values().stream().mapToDouble(Double::doubleValue).sum())
                .isCloseTo(1.0, within(1e-9));
    }

    @Test
    void productCopyFallsBackToTemplateWhenAiIsUnavailable() {
        DeepSeekClient client = mock(DeepSeekClient.class);
        when(client.available()).thenReturn(false);
        MerchantService service = new MerchantService(client, objectMapper);

        Map<String, Object> result = service.productCopy(new MerchantService.ProductCopyRequest(
                Map.of("name", "测试花束", "category", "玫瑰"), "温暖", "medium"));

        assertThat(result.get("degraded")).isEqualTo(true);
        assertThat(result.get("title")).isEqualTo("测试花束");
        assertThat((Iterable<?>) result.get("tags")).isNotEmpty();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Double> weights(Map<String, Object> result) {
        return (Map<String, Double>) result.get("suggestedWeights");
    }
}
