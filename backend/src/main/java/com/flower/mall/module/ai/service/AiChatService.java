package com.flower.mall.module.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.config.AppProperties;
import com.flower.mall.module.ai.dto.AiChatMessage;
import com.flower.mall.module.ai.dto.AiChatRequest;
import com.flower.mall.module.ai.entity.AiCallLog;
import com.flower.mall.module.ai.monitor.AiRuntimeMetrics;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiChatService {

    private final AiClient aiClient;
    private final AiConversationService conversationService;
    private final AiCallLogService callLogService;
    private final AiRuntimeMetrics runtimeMetrics;
    private final AppProperties properties;
    private final ObjectMapper objectMapper;
    private final ExecutorService executor = Executors.newFixedThreadPool(8);
    private final Map<String, Deque<Long>> rateWindows = new ConcurrentHashMap<>();

    @PreDestroy
    public void shutdown() {
        executor.shutdownNow();
    }

    public void stream(AiChatRequest request, Long userId, String userRole, String clientKey, SseEmitter emitter) {
        AppProperties.Ai ai = properties.getAi();
        if (!ai.isEnabled() || !ai.isChatEnabled()) {
            throw BusinessException.of(ErrorCode.AI_DISABLED);
        }
        if (userId == null && !ai.isChatAllowAnonymous()) {
            throw BusinessException.of(ErrorCode.UNAUTHORIZED);
        }
        if (request.getMessage() != null && request.getMessage().length() > ai.getChatMaxQuestionChars()) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST,
                    "问题不能超过" + ai.getChatMaxQuestionChars() + "字");
        }
        String sessionId = request.getSessionId();
        String subject = userId != null ? "u:" + userId : "s:" + (sessionId == null ? clientKey : sessionId);
        if (!allow(subject, ai.getChatRateLimitPerMinute())) {
            throw BusinessException.of(ErrorCode.AI_RATE_LIMITED);
        }
        if (callLogService.countTodayChat(userId, sessionId) >= ai.getChatDailyLimit()) {
            throw BusinessException.of(ErrorCode.AI_RATE_LIMITED, "今日 AI 问答次数已达上限");
        }
        if (callLogService.todayCost().compareTo(BigDecimal.valueOf(ai.getDailyBudget())) >= 0) {
            throw BusinessException.of(ErrorCode.AI_BUDGET_EXCEEDED);
        }

        Long conversationId = conversationService.resolveForChat(
                request.getConversationId(), userId, sessionId);

        AtomicBoolean closed = new AtomicBoolean(false);
        emitter.onCompletion(() -> closed.set(true));
        emitter.onTimeout(() -> {
            closed.set(true);
            emitter.complete();
        });
        emitter.onError(error -> closed.set(true));

        executor.submit(() -> streamWorker(request, userId, userRole, sessionId, conversationId, emitter, closed));
    }

    private void streamWorker(AiChatRequest request, Long userId, String userRole, String sessionId,
                              Long conversationId, SseEmitter emitter, AtomicBoolean closed) {
        long startedAt = System.currentTimeMillis();
        AiCallLog callLog = new AiCallLog();
        callLog.setRequestId(java.util.UUID.randomUUID().toString());
        callLog.setUserId(userId);
        callLog.setUserRole(userRole);
        callLog.setScene("CHAT");
        callLog.setModel(properties.getAi().getChatModel());
        callLog.setStatus("SUCCESS");
        callLog.setDegraded(false);
        callLog.setLlmCalls(1);
        callLog.setEmbeddingCalls(1);
        callLog.setRerankCalls(1);
        callLog.setRequestChars(request.getMessage() == null ? 0 : request.getMessage().length());
        callLog.setSessionId(sessionId);
        callLog.setCreatedAt(LocalDateTime.now());
        StringBuilder answer = new StringBuilder();
        boolean firstDelta = true;
        boolean admin = "ADMIN".equalsIgnoreCase(userRole);
        String productsJson = null;
        String citationsJson = null;
        String suggestionsJson = null;
        String usageJson = null;
        String messageStatus = "COMPLETE";

        try {
            java.util.List<AiChatMessage> history = conversationService.history(conversationId);
            conversationService.saveUserMessage(conversationId, request.getMessage());

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("message", request.getMessage());
            body.put("scene", request.getScene());
            body.put("sessionId", sessionId);
            body.put("history", history);
            body.put("userId", userId);
            body.put("userRole", userRole);
            String json = objectMapper.writeValueAsString(body);
            HttpRequest httpRequest = aiClient.requestBuilder("/internal/ai/chat")
                    .timeout(Duration.ofMillis(properties.getAi().getChatTimeoutMs()))
                    .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<InputStream> response = aiClient.httpClient()
                    .send(httpRequest, HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() >= 400) {
                throw new IllegalStateException("AI 服务返回 " + response.statusCode());
            }
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
                String eventName = "message";
                StringBuilder data = new StringBuilder();
                String line;
                while (!closed.get() && (line = reader.readLine()) != null) {
                    if (line.isEmpty()) {
                        if (data.length() > 0) {
                            String payload = data.toString();
                            boolean forward = true;
                            if ("delta".equals(eventName)) {
                                JsonNode node = safeRead(payload);
                                String delta = node == null ? "" : node.path("content").asText("");
                                answer.append(delta);
                                if (firstDelta && !delta.isEmpty()) {
                                    callLog.setFirstTokenMs((int) (System.currentTimeMillis() - startedAt));
                                    firstDelta = false;
                                }
                            } else if ("products".equals(eventName)) {
                                productsJson = payload;
                            } else if ("citations".equals(eventName)) {
                                citationsJson = payload;
                                forward = admin;
                            } else if ("suggestions".equals(eventName)) {
                                suggestionsJson = payload;
                            } else if ("usage".equals(eventName)) {
                                usageJson = payload;
                                applyUsage(callLog, safeRead(payload));
                                forward = admin;
                            } else if ("meta".equals(eventName)) {
                                JsonNode node = safeRead(payload);
                                if (node != null) {
                                    callLog.setDegraded(node.path("degraded").asBoolean(false));
                                    if (!node.path("requestId").asText("").isBlank()) {
                                        callLog.setRequestId(node.path("requestId").asText());
                                    }
                                    if (!node.path("model").asText("").isBlank()) {
                                        callLog.setModel(node.path("model").asText());
                                    }
                                    if (!admin && node instanceof ObjectNode objectNode) {
                                        ObjectNode sanitized = objectNode.deepCopy();
                                        sanitized.remove("model");
                                        payload = sanitized.toString();
                                    }
                                }
                            } else if ("error".equals(eventName)) {
                                JsonNode node = safeRead(payload);
                                callLog.setStatus("FALLBACK");
                                callLog.setDegraded(true);
                                callLog.setDegradedStage("ai-service");
                                callLog.setFallbackReason(node == null ? "AI 服务返回错误"
                                        : node.path("message").asText("AI 服务返回错误"));
                            }
                            if (forward && !closed.get()) {
                                emitter.send(SseEmitter.event().name(eventName).data(payload));
                            }
                            eventName = "message";
                            data.setLength(0);
                        }
                    } else if (line.startsWith("event:")) {
                        eventName = line.substring(6).trim();
                    } else if (line.startsWith("data:")) {
                        if (data.length() > 0) {
                            data.append('\n');
                        }
                        data.append(line.substring(5).trim());
                    }
                }
                if (data.length() > 0 && !closed.get()) {
                    emitter.send(SseEmitter.event().name(eventName).data(data.toString()));
                }
            }
            if (closed.get()) {
                messageStatus = "ABORTED";
            } else {
                emitter.complete();
            }
        } catch (Exception ex) {
            log.warn("AI chat stream failed: {}", ex.getMessage());
            messageStatus = closed.get() ? "ABORTED" : "FAILED";
            callLog.setStatus("FAILED");
            callLog.setDegraded(true);
            callLog.setDegradedStage("gateway");
            callLog.setFallbackReason(trim(ex.getMessage(), 250));
            callLog.setErrorCode(ErrorCode.AI_UNAVAILABLE.getCode());
            if (!closed.get()) {
                try {
                    emitter.send(SseEmitter.event().name("error").data(Map.of(
                            "code", ErrorCode.AI_UNAVAILABLE.getCode(),
                            "message", "AI 服务暂不可用，请稍后再试")));
                    emitter.complete();
                } catch (Exception ignored) {
                    closed.set(true);
                }
            }
        } finally {
            if (Boolean.TRUE.equals(callLog.getDegraded()) && "SUCCESS".equals(callLog.getStatus())) {
                callLog.setStatus("FALLBACK");
            }
            int latencyMs = (int) (System.currentTimeMillis() - startedAt);
            callLog.setLatencyMs(latencyMs);
            runtimeMetrics.record("/internal/ai/chat", latencyMs, !"FAILED".equals(callLog.getStatus()));
            callLog.setResponseChars(answer.length());
            callLog.setTotalTokens(defaultInt(callLog.getPromptTokens()) + defaultInt(callLog.getCompletionTokens()));
            if (callLog.getEstimatedCost() == null || callLog.getEstimatedCost().compareTo(BigDecimal.ZERO) == 0) {
                callLog.setEstimatedCost(estimateCost(callLog.getPromptTokens(), callLog.getCompletionTokens()));
            }
            callLogService.save(callLog);
            if (answer.length() > 0) {
                try {
                    conversationService.saveAssistantMessage(conversationId, answer.toString(),
                            productsJson, citationsJson, suggestionsJson, usageJson, callLog.getModel(),
                            Boolean.TRUE.equals(callLog.getDegraded()), messageStatus);
                    if ("COMPLETE".equals(messageStatus)) {
                        conversationService.scheduleTitle(conversationId);
                    }
                } catch (Exception ex) {
                    log.warn("Failed to persist AI chat message: {}", ex.getMessage());
                }
            }
        }
    }

    private void applyUsage(AiCallLog callLog, JsonNode usage) {
        if (usage == null) {
            return;
        }
        callLog.setPromptTokens(usage.path("promptTokens").asInt(0));
        callLog.setCompletionTokens(usage.path("completionTokens").asInt(0));
        callLog.setTotalTokens(usage.path("totalTokens").asInt(0));
        if (usage.has("estimatedCost")) {
            callLog.setEstimatedCost(BigDecimal.valueOf(usage.path("estimatedCost").asDouble(0)));
        }
    }

    private BigDecimal estimateCost(Integer prompt, Integer completion) {
        AppProperties.Pricing pricing = properties.getAi().getPricing();
        double cost = defaultInt(prompt) / 1000.0 * pricing.getInputPer1k()
                + defaultInt(completion) / 1000.0 * pricing.getOutputPer1k();
        return BigDecimal.valueOf(cost).setScale(6, RoundingMode.HALF_UP);
    }

    private boolean allow(String subject, int limit) {
        long now = System.currentTimeMillis();
        Deque<Long> window = rateWindows.computeIfAbsent(subject, key -> new ArrayDeque<>());
        synchronized (window) {
            while (!window.isEmpty() && now - window.peekFirst() > 60_000) {
                window.pollFirst();
            }
            if (window.size() >= limit) {
                return false;
            }
            window.addLast(now);
            return true;
        }
    }

    private JsonNode safeRead(String payload) {
        try {
            return objectMapper.readTree(payload);
        } catch (Exception ex) {
            return null;
        }
    }

    private static int defaultInt(Integer value) {
        return value == null ? 0 : value;
    }

    private static String trim(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
