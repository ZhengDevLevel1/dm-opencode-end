package com.flower.ai.service;

import com.flower.ai.client.DeepSeekClient;
import com.flower.ai.config.AiServiceProperties;
import com.flower.ai.support.AiServiceException;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private final RetrievalService retrievalService;
    private final DeepSeekClient deepSeekClient;
    private final AiServiceProperties properties;
    private final ExecutorService executor = Executors.newFixedThreadPool(8);

    public ChatService(RetrievalService retrievalService,
                       DeepSeekClient deepSeekClient,
                       AiServiceProperties properties) {
        this.retrievalService = retrievalService;
        this.deepSeekClient = deepSeekClient;
        this.properties = properties;
    }

    @PreDestroy
    public void shutdown() {
        executor.shutdownNow();
    }

    public void stream(ChatRequest request, SseEmitter emitter) {
        executor.submit(() -> streamWorker(request, emitter));
    }

    private void streamWorker(ChatRequest request, SseEmitter emitter) {
        String requestId = "ai-" + UUID.randomUUID();
        try {
            List<RetrievalService.ProductHit> products = retrievalService.retrieveProducts(
                    request.message(), 5);
            List<RetrievalService.KnowledgeHit> knowledge = retrievalService.retrieveKnowledge(
                    request.message(), 3);

            boolean available = deepSeekClient.available();
            send(emitter, "meta", Map.of(
                    "requestId", requestId,
                    "model", available ? properties.getDeepseek().getChatModel() : "fallback",
                    "degraded", !available));
            send(emitter, "products", Map.of("items", products.stream().map(hit -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("productId", hit.productId());
                item.put("name", hit.name());
                item.put("category", hit.category());
                item.put("price", hit.price());
                item.put("ratingAvg", hit.ratingAvg());
                item.put("salesCount", hit.salesCount());
                item.put("reason", hit.reason());
                return item;
            }).toList()));
            send(emitter, "citations", Map.of("items", knowledge.stream().map(hit -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("documentId", hit.documentId());
                item.put("title", hit.title());
                item.put("category", hit.category());
                item.put("source", hit.source());
                item.put("snippet", snippet(hit.content()));
                return item;
            }).toList()));

            List<Map<String, String>> messages = buildMessages(request, products, knowledge);
            if (available) {
                boolean[] delivered = {false};
                DeepSeekClient.Completion completion = null;
                try {
                    completion = deepSeekClient.stream(
                            messages, 0.5, 900,
                            delta -> {
                                delivered[0] = true;
                                send(emitter, "delta", Map.of("content", delta));
                            });
                } catch (AiServiceException ex) {
                    log.warn("DeepSeek chat failed, switching to local answer: {}", ex.getMessage());
                }
                if (completion != null) {
                    sendUsage(emitter, completion.promptTokens(), completion.completionTokens(), completion.model());
                } else {
                    send(emitter, "meta", Map.of(
                            "requestId", requestId,
                            "model", "fallback",
                            "degraded", true));
                    if (delivered[0]) {
                        send(emitter, "delta", Map.of("content", "\n\n（AI 服务暂时不可用，以上内容可能不完整。）"));
                    } else {
                        streamFallback(emitter, products, knowledge);
                    }
                    sendUsage(emitter, 0, 0, "fallback");
                }
            } else {
                streamFallback(emitter, products, knowledge);
                sendUsage(emitter, 0, 0, "fallback");
            }
            send(emitter, "done", Map.of("requestId", requestId));
            emitter.complete();
        } catch (Exception ex) {
            log.warn("AI chat failed: {}", ex.getMessage());
            try {
                send(emitter, "error", Map.of("message", "AI 服务暂时不可用，请稍后再试"));
                send(emitter, "done", Map.of("requestId", requestId, "degraded", true));
            } catch (Exception ignored) {
                // emitter may already be closed
            }
            emitter.complete();
        }
    }

    private List<Map<String, String>> buildMessages(ChatRequest request,
                                                    List<RetrievalService.ProductHit> products,
                                                    List<RetrievalService.KnowledgeHit> knowledge) {
        List<Map<String, String>> messages = new ArrayList<>();
        StringBuilder system = new StringBuilder();
        system.append("你是花屿花店的 AI 挑花顾问，回答要温暖、具体、可执行。")
                .append("优先推荐店内真实在售商品，不要编造不存在的花材或价格。")
                .append("如果用户问养护、配送、售后，先参考知识库，再用简洁中文回答。")
                .append("回答控制在 200 字以内，可以分点，但不要输出 JSON。");
        if (!products.isEmpty()) {
            system.append("\n可推荐商品：");
            for (RetrievalService.ProductHit product : products) {
                system.append("\n- ").append(product.name())
                        .append("（").append(product.category()).append("，¥").append(product.price())
                        .append("，销量 ").append(product.salesCount()).append("）");
            }
        }
        if (!knowledge.isEmpty()) {
            system.append("\n知识库参考：");
            for (RetrievalService.KnowledgeHit hit : knowledge) {
                system.append("\n- ").append(hit.title()).append("：").append(snippet(hit.content()));
            }
        }
        messages.add(Map.of("role", "system", "content", system.toString()));
        if (request.history() != null && !request.history().isEmpty()) {
            int maxMessages = Math.max(1, properties.getChatContextMaxMessages());
            int maxChars = Math.max(1000, properties.getChatContextMaxChars());
            int start = Math.max(0, request.history().size() - maxMessages);
            Deque<Map<String, String>> selected = new ArrayDeque<>();
            int chars = 0;
            for (int i = request.history().size() - 1; i >= start; i--) {
                HistoryMessage history = request.history().get(i);
                if (history == null || history.content() == null || history.content().isBlank()) {
                    continue;
                }
                if (!selected.isEmpty() && chars + history.content().length() > maxChars) {
                    break;
                }
                String role = "assistant".equalsIgnoreCase(history.role()) ? "assistant" : "user";
                selected.addFirst(Map.of("role", role, "content", history.content()));
                chars += history.content().length();
            }
            messages.addAll(selected);
        }
        messages.add(Map.of("role", "user", "content", request.message() == null ? "" : request.message()));
        return messages;
    }

    private void streamFallback(SseEmitter emitter,
                                List<RetrievalService.ProductHit> products,
                                List<RetrievalService.KnowledgeHit> knowledge) {
        String answer = fallbackAnswer(products, knowledge);
        for (int i = 0; i < answer.length(); i += 24) {
            send(emitter, "delta", Map.of("content", answer.substring(i, Math.min(i + 24, answer.length()))));
        }
    }

    private String fallbackAnswer(List<RetrievalService.ProductHit> products,
                                  List<RetrievalService.KnowledgeHit> knowledge) {
        StringBuilder answer = new StringBuilder();
        if (!products.isEmpty()) {
            answer.append("我先按店内当季热销为你挑了这几款：");
            for (int i = 0; i < Math.min(3, products.size()); i++) {
                RetrievalService.ProductHit product = products.get(i);
                answer.append(i == 0 ? "" : "、").append(product.name())
                        .append("（¥").append(product.price()).append("）");
            }
            answer.append("。你可以告诉我是送恋人、朋友还是长辈，我再帮你缩小范围。");
        } else {
            answer.append("我可以帮你挑花、搭配花束，也能回答养护和配送问题。告诉我收花人、预算和场合就可以。");
        }
        if (!knowledge.isEmpty()) {
            answer.append("\n\n小贴士：").append(snippet(knowledge.get(0).content()));
        }
        return answer.toString();
    }

    private void sendUsage(SseEmitter emitter, int promptTokens, int completionTokens, String model) {
        int total = promptTokens + completionTokens;
        double cost = promptTokens / 1000.0 * 0.001 + completionTokens / 1000.0 * 0.002;
        send(emitter, "usage", Map.of(
                "promptTokens", promptTokens,
                "completionTokens", completionTokens,
                "totalTokens", total,
                "estimatedCost", BigDecimal.valueOf(cost).setScale(6, RoundingMode.HALF_UP),
                "model", model));
    }

    private void send(SseEmitter emitter, String name, Object data) {
        try {
            emitter.send(SseEmitter.event().name(name).data(data));
        } catch (Exception ex) {
            throw new IllegalStateException("SSE 发送失败: " + ex.getMessage(), ex);
        }
    }

    private static String snippet(String content) {
        if (content == null) {
            return "";
        }
        String normalized = content.replace('\n', ' ').trim();
        return normalized.length() <= 160 ? normalized : normalized.substring(0, 160) + "…";
    }

    public record ChatRequest(String message, String scene, String sessionId,
                              List<HistoryMessage> history, Long userId, String userRole) {
    }

    public record HistoryMessage(String role, String content) {
    }
}
