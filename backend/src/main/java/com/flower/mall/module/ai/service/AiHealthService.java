package com.flower.mall.module.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.config.AppProperties;
import com.flower.mall.module.ai.dto.AiHealthVO;
import com.flower.mall.module.ai.dto.AiReindexVO;
import com.flower.mall.module.ai.dto.AiStatusVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiHealthService {

    private final AppProperties properties;
    private final AiClient aiClient;
    private final AiEndpointResolver endpointResolver;

    public AiStatusVO status() {
        AppProperties.Ai ai = properties.getAi();
        boolean available = false;
        String message = ai.isEnabled() ? "AI 服务未连接" : "AI 服务未启用";
        if (ai.isEnabled()) {
            try {
                JsonNode health = aiClient.get("/internal/ai/health", 2_000);
                available = "UP".equalsIgnoreCase(health.path("status").asText());
                message = available ? "AI 服务正常" : health.path("message").asText("AI 服务异常");
            } catch (Exception ex) {
                message = "AI 服务暂不可用";
            }
        }
        return AiStatusVO.builder()
                .enabled(ai.isEnabled())
                .available(available)
                .chatEnabled(ai.isEnabled() && ai.isChatEnabled())
                .merchantEnabled(ai.isEnabled() && ai.isMerchantEnabled())
                .anonymousAllowed(ai.isChatAllowAnonymous())
                .mode(ai.getRecommendationMode())
                .message(message)
                .build();
    }

    public AiHealthVO health() {
        AppProperties.Ai ai = properties.getAi();
        if (!ai.isEnabled()) {
            return AiHealthVO.builder()
                    .enabled(false)
                    .reachable(false)
                    .endpoint(endpointResolver.resolve())
                    .service(ai.getServiceName())
                    .status("DISABLED")
                    .message("AI 服务未启用")
                    .build();
        }
        try {
            JsonNode response = aiClient.get("/internal/ai/health", 3_000);
            boolean qdrantReady = response.path("qdrantReady").asBoolean(false);
            boolean llmReady = response.path("llmReady").asBoolean(false);
            boolean embeddingReady = response.path("embeddingReady").asBoolean(false);
            boolean degraded = !qdrantReady || !llmReady || !embeddingReady;
            String rawStatus = response.path("status").asText("UP");
            String status = "UP".equalsIgnoreCase(rawStatus) && degraded ? "DEGRADED" : rawStatus;
            return AiHealthVO.builder()
                    .enabled(true)
                    .reachable(true)
                    .endpoint(endpointResolver.resolve())
                    .service(ai.getServiceName())
                    .status(status)
                    .qdrantReady(qdrantReady)
                    .llmReady(llmReady)
                    .embeddingReady(embeddingReady)
                    .degraded(degraded)
                    .message(response.path("message").asText("AI 服务正常"))
                    .build();
        } catch (Exception ex) {
            return AiHealthVO.builder()
                    .enabled(true)
                    .reachable(false)
                    .endpoint(endpointResolver.resolve())
                    .service(ai.getServiceName())
                    .status("DOWN")
                    .degraded(true)
                    .message("AI 服务不可达")
                    .build();
        }
    }

    public AiReindexVO reindex() {
        if (!properties.getAi().isEnabled()) {
            throw BusinessException.of(ErrorCode.AI_DISABLED);
        }
        try {
            JsonNode response = aiClient.post("/internal/ai/reindex",
                    Map.of("products", true, "knowledge", true), 60_000);
            return AiReindexVO.builder()
                    .accepted(response.path("accepted").asBoolean(true))
                    .productCount(response.path("productCount").asInt(0))
                    .knowledgeCount(response.path("knowledgeCount").asInt(0))
                    .message(response.path("message").asText("索引重建完成"))
                    .build();
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw BusinessException.of(ErrorCode.AI_UNAVAILABLE, "索引重建失败: " + ex.getMessage());
        }
    }
}
