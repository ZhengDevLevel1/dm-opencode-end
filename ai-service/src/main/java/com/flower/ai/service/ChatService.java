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

            List<Map<String, String>> messages = buildMessages(request, products, knowledge);
            if (available) {
                boolean[] delivered = {false};
                AdmissionStream admissionStream = new AdmissionStream(
                        emitter, products, knowledge, request.message());
                DeepSeekClient.Completion completion = null;
                try {
                    completion = deepSeekClient.stream(
                            messages, 0.5, 900,
                            delta -> {
                                delivered[0] = true;
                                admissionStream.onDelta(delta);
                            });
                } catch (AiServiceException ex) {
                    log.warn("DeepSeek chat failed, switching to local answer: {}", ex.getMessage());
                }
                if (delivered[0]) {
                    admissionStream.finish();
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
                        sendCards(emitter, products, knowledge);
                        streamFallback(emitter, products, knowledge);
                    }
                    sendUsage(emitter, 0, 0, "fallback");
                }
            } else {
                sendCards(emitter, products, knowledge);
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

    private void sendCards(SseEmitter emitter,
                           List<RetrievalService.ProductHit> products,
                           List<RetrievalService.KnowledgeHit> knowledge) {
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
    }

    private List<Map<String, String>> buildMessages(ChatRequest request,
                                                    List<RetrievalService.ProductHit> products,
                                                    List<RetrievalService.KnowledgeHit> knowledge) {
        List<Map<String, String>> messages = new ArrayList<>();
        StringBuilder system = new StringBuilder();
        system.append("你是花屿花店的 AI 挑花顾问，回答要温暖、具体、可执行。")
                .append("服务范围包括选花、花束搭配、花语、花材养护、绿植、送花场景、配送、订单和售后。")
                .append("回答前先做问题准入判断，第一行只输出一个标签，标签不会展示给用户，正文从第二行开始：")
                .append("\n[[FLOWER]]：与花店相关，正常回答。")
                .append("\n[[OFF_TOPIC_SMALL]]：与花店无关，但一两句话就能回答；只简短回答，不展开，不推荐商品。")
                .append("\n[[OFF_TOPIC_LARGE]]：与花店无关且需要较多检索、推理或生成；不要处理原问题，也不要给出答案、步骤、代码、资料或长篇解释。只写一句自然、礼貌、口语化的边界说明，再用一句顺势引导回选花、花材养护、花束搭配、花语、订单等花店话题。")
                .append("\n拒答要求：不要使用“无法回答”“不能回答”等生硬说法；结合用户原话、语气和场景生成，不要千篇一律；可以带一点亲和语气；参考最近对话，避免连续使用相同句式；不要解释判断规则，不要提及标签。")
                .append("\n[[FLOWER]] 回答要求：优先推荐店内真实在售商品，不要编造花材或价格；养护、配送、售后先参考知识库；控制在 200 字以内，可以分点，但不要输出 JSON。")
                .append("\n判断示例：用户说“帮我写一个快速排序算法” -> [[OFF_TOPIC_LARGE]]；用户说“1+1 等于几” -> [[OFF_TOPIC_SMALL]]；用户说“送女朋友生日花” -> [[FLOWER]]。")
                .append("\n标签必须是输出的第一个字符，前面不要加“好的”“当然”等任何内容；如果问题需要写代码、写论文、做复杂分析、长文翻译、专业咨询、复杂计算或多步骤推理，即使你能回答，也必须标为 [[OFF_TOPIC_LARGE]]。")
                .append("\n下面的商品和知识库只用于 [[FLOWER]] 问题；无关问题不要引用。");
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

    private final class AdmissionStream {

        private final SseEmitter emitter;
        private final List<RetrievalService.ProductHit> products;
        private final List<RetrievalService.KnowledgeHit> knowledge;
        private final String question;
        private final StringBuilder pending = new StringBuilder();
        private QuestionAdmission.Category category;

        private AdmissionStream(SseEmitter emitter,
                                List<RetrievalService.ProductHit> products,
                                List<RetrievalService.KnowledgeHit> knowledge,
                                String question) {
            this.emitter = emitter;
            this.products = products;
            this.knowledge = knowledge;
            this.question = question;
        }

        private void onDelta(String delta) {
            if (delta == null || delta.isEmpty()) {
                return;
            }
            if (category != null) {
                sendDelta(delta);
                return;
            }
            pending.append(delta);
            QuestionAdmission.Parsed parsed = QuestionAdmission.parseLeading(pending.toString());
            if (parsed == null) {
                return;
            }
            QuestionAdmission.Category fallback = QuestionAdmission.fallbackCategory(question);
            category = parsed.category() == QuestionAdmission.Category.FLOWER
                    && fallback != QuestionAdmission.Category.FLOWER
                    ? fallback : parsed.category();
            if (category == QuestionAdmission.Category.FLOWER) {
                sendCards(emitter, products, knowledge);
            }
            if (!parsed.content().isEmpty()) {
                sendDelta(parsed.content());
            }
        }

        private void finish() {
            if (category != null) {
                return;
            }
            String text = pending.toString();
            if (text.isBlank()) {
                return;
            }
            String trimmed = text.stripLeading();
            if (trimmed.startsWith("[[")) {
                int lineEnd = trimmed.indexOf('\n');
                if (lineEnd < 0) {
                    return;
                }
                text = trimmed.substring(lineEnd + 1);
                if (text.isBlank()) {
                    return;
                }
            }
            category = QuestionAdmission.fallbackCategory(question);
            if (category == QuestionAdmission.Category.FLOWER) {
                sendCards(emitter, products, knowledge);
            }
            sendDelta(text);
        }

        private void sendDelta(String content) {
            if (content != null && !content.isEmpty()) {
                ChatService.this.send(emitter, "delta", Map.of("content", content));
            }
        }
    }

    public record ChatRequest(String message, String scene, String sessionId,
                              List<HistoryMessage> history, Long userId, String userRole) {
    }

    public record HistoryMessage(String role, String content) {
    }
}
