package com.flower.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flower.ai.client.DeepSeekClient;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class SuggestionService {

    private static final Logger log = LoggerFactory.getLogger(SuggestionService.class);
    private static final int MAX_SUGGESTIONS = 4;

    private final DeepSeekClient deepSeekClient;
    private final ObjectMapper objectMapper;
    private final ExecutorService executor = Executors.newFixedThreadPool(4);
    private final AtomicBoolean shuttingDown = new AtomicBoolean(false);

    public SuggestionService(DeepSeekClient deepSeekClient, ObjectMapper objectMapper) {
        this.deepSeekClient = deepSeekClient;
        this.objectMapper = objectMapper;
    }

    @PreDestroy
    public void shutdown() {
        shuttingDown.set(true);
        executor.shutdownNow();
    }

    public CompletableFuture<SuggestionResult> suggest(String question,
                                                       List<String> historyLines,
                                                       List<String> productNames) {
        if (!deepSeekClient.available()) {
            return CompletableFuture.completedFuture(
                    fallback(question, productNames, "DeepSeek API Key 未配置"));
        }
        if (shuttingDown.get()) {
            return CompletableFuture.completedFuture(
                    fallback(question, productNames, "AI 服务正在关闭"));
        }
        return CompletableFuture.supplyAsync(
                () -> generate(question, historyLines, productNames), executor);
    }

    private SuggestionResult generate(String question,
                                      List<String> historyLines,
                                      List<String> productNames) {
        try {
            String prompt = "请为下面这轮花店 AI 挑花咨询生成 3-4 个用户接下来最可能追问的中文问题。\n"
                    + "要求：每个问题 8-24 个字；必须结合当前问题、最近对话和可推荐商品；"
                    + "覆盖不同方向，例如预算、适合人群、花语寓意、养护、配送、卡片、售后；"
                    + "不要回答，不要编号，不要使用引号，不要重复用户已经问过的内容。\n"
                    + "只输出 JSON：{\"questions\":[\"问题1\",\"问题2\",\"问题3\"]}。\n"
                    + "用户当前问题：" + trim(question, 300) + "\n"
                    + (historyLines == null || historyLines.isEmpty()
                    ? "最近对话：无\n"
                    : "最近对话：\n- " + String.join("\n- ", historyLines.stream()
                    .filter(this::hasText)
                    .map(line -> trim(line, 180))
                    .toList()) + "\n")
                    + (productNames == null || productNames.isEmpty()
                    ? "可推荐商品：无\n"
                    : "可推荐商品：" + String.join("、", productNames.stream()
                    .filter(this::hasText)
                    .map(name -> trim(name, 40))
                    .limit(4)
                    .toList()) + "\n");
            DeepSeekClient.Completion completion = deepSeekClient.complete(List.of(
                    Map.of("role", "system", "content", "你只输出合法 JSON，不要输出 markdown。"),
                    Map.of("role", "user", "content", prompt)), 0.7, 320);
            JsonNode node = parseJson(completion.content());
            List<String> questions = sanitize(node == null ? List.of() : textList(node.path("questions")));
            boolean degraded = node == null;
            if (questions.size() < 3) {
                questions = mergeFallback(questions, question, productNames);
                degraded = true;
            }
            if (questions.isEmpty()) {
                return fallback(question, productNames, "AI 返回的追问为空");
            }
            return new SuggestionResult(questions, completion.promptTokens(),
                    completion.completionTokens(), completion.model(), degraded);
        } catch (Exception ex) {
            log.warn("Follow-up suggestion generation failed: {}", ex.getMessage());
            return fallback(question, productNames, "AI 服务暂不可用，已使用本地追问");
        }
    }

    public SuggestionResult fallback(String question, List<String> productNames, String reason) {
        List<String> candidates = new ArrayList<>();
        String firstProduct = productNames == null ? null : productNames.stream()
                .filter(this::hasText)
                .findFirst()
                .orElse(null);
        if (firstProduct != null) {
            candidates.add("这款" + trim(firstProduct, 20) + "适合送长辈吗？");
            candidates.add("同价位还有别的推荐吗？");
        }
        if (containsAny(question, "预算", "元", "价格", "贵", "便宜")) {
            candidates.add("预算再低一点怎么搭配？");
        }
        candidates.add("花束收到后怎么养护？");
        candidates.add("可以加一张手写卡片吗？");
        candidates.add("配送时间可以指定吗？");
        candidates.add("有没有更适合新手养的绿植？");
        return new SuggestionResult(sanitize(candidates), 0, 0, "fallback", true);
    }

    private List<String> mergeFallback(List<String> current, String question, List<String> productNames) {
        LinkedHashSet<String> merged = new LinkedHashSet<>(current);
        merged.addAll(fallback(question, productNames, "").questions());
        return sanitize(new ArrayList<>(merged));
    }

    private List<String> sanitize(List<String> candidates) {
        LinkedHashSet<String> unique = new LinkedHashSet<>();
        for (String candidate : candidates) {
            if (!hasText(candidate)) {
                continue;
            }
            String text = candidate.trim()
                    .replaceAll("^[\\s\\d一二三四五六七八九十]+[.、)）:：]\\s*", "")
                    .replaceAll("^[\"'“”‘’]+|[\"'“”‘’]+$", "")
                    .replaceAll("\\s+", " ")
                    .trim();
            if (text.length() < 4) {
                continue;
            }
            if (text.length() > 40) {
                text = text.substring(0, 40).trim();
            }
            unique.add(text);
            if (unique.size() >= MAX_SUGGESTIONS) {
                break;
            }
        }
        return new ArrayList<>(unique);
    }

    private JsonNode parseJson(String content) {
        if (!hasText(content)) {
            return null;
        }
        String text = content.trim();
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start < 0 || end <= start) {
            return null;
        }
        try {
            return objectMapper.readTree(text.substring(start, end + 1));
        } catch (Exception ex) {
            return null;
        }
    }

    private static List<String> textList(JsonNode node) {
        List<String> values = new ArrayList<>();
        if (node != null && node.isArray()) {
            node.forEach(item -> {
                String text = item.asText("");
                if (!text.isBlank()) {
                    values.add(text);
                }
            });
        }
        return values;
    }

    private static boolean containsAny(String value, String... fragments) {
        if (value == null) {
            return false;
        }
        for (String fragment : fragments) {
            if (value.contains(fragment)) {
                return true;
            }
        }
        return false;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String trim(String value, int max) {
        if (value == null) {
            return "";
        }
        String normalized = value.replace('\n', ' ').replace('\r', ' ').trim();
        return normalized.length() <= max ? normalized : normalized.substring(0, max) + "…";
    }

    public record SuggestionResult(List<String> questions, int promptTokens,
                                   int completionTokens, String model, boolean degraded) {
    }
}
