package com.flower.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flower.ai.client.DeepSeekClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

@Service
public class PromptTagService {

    private static final Logger log = LoggerFactory.getLogger(PromptTagService.class);

    private final DeepSeekClient deepSeekClient;
    private final ObjectMapper objectMapper;

    public PromptTagService(DeepSeekClient deepSeekClient, ObjectMapper objectMapper) {
        this.deepSeekClient = deepSeekClient;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> generate(PromptTagRequest request) {
        String category = normalizeCategory(request == null ? null : request.category());
        String theme = trim(request == null ? null : request.theme());
        if (theme.isBlank()) {
            return fallback(category, "", "主题不能为空");
        }
        if (!deepSeekClient.available()) {
            return fallback(category, theme, "DeepSeek API Key 未配置");
        }
        try {
            String label = label(category);
            String prompt = "你是花店 AI 挑花顾问的提示词运营助手。请围绕主题“" + theme
                    + "”为分类“" + label + "”生成 10 个中文快捷提问标签词。\n"
                    + "要求：每个词 2-10 个字；适合与另外两类标签组合成完整提问；"
                    + "覆盖不同角度，不要编号、引号、标点或解释；必须与花店、选花、送花相关；"
                    + "不要输出与主题无关的宽泛词。\n"
                    + "只输出 JSON：{\"words\":[\"词1\",\"词2\"]}。";
            DeepSeekClient.Completion completion = deepSeekClient.complete(List.of(
                    Map.of("role", "system", "content", "你只输出合法 JSON，不要输出 markdown。"),
                    Map.of("role", "user", "content", prompt)), 0.8, 420);
            JsonNode node = parseJson(completion.content());
            List<String> words = sanitize(node == null ? List.of() : textList(node.path("words")));
            if (words.size() < 5) {
                words = mergeFallback(words, category, theme);
            }
            if (words.isEmpty()) {
                return fallback(category, theme, "AI 返回的标签为空");
            }
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("words", words);
            result.put("degraded", false);
            result.put("fallbackReason", null);
            result.put("promptTokens", completion.promptTokens());
            result.put("completionTokens", completion.completionTokens());
            result.put("totalTokens", completion.promptTokens() + completion.completionTokens());
            result.put("estimatedCost", BigDecimal.valueOf(
                            completion.promptTokens() / 1000.0 * 0.001
                                    + completion.completionTokens() / 1000.0 * 0.002)
                    .setScale(6, RoundingMode.HALF_UP));
            result.put("model", completion.model());
            return result;
        } catch (Exception ex) {
            log.warn("Prompt tag generation failed: {}", ex.getMessage());
            return fallback(category, theme, "AI 服务暂不可用，已使用基础候选词");
        }
    }

    public Map<String, Object> fallback(String category, String theme, String reason) {
        LinkedHashSet<String> words = new LinkedHashSet<>();
        addWord(words, theme);
        switch (normalizeCategory(category)) {
            case "AUDIENCE" -> words.addAll(List.of(
                    "女朋友", "男朋友", "妈妈", "爸爸", "长辈", "朋友", "同事", "客户", "自己"));
            case "NEED" -> words.addAll(List.of(
                    "预算友好", "温柔一点", "清新淡雅", "有仪式感", "好养活",
                    "寓意好", "显档次", "养护简单", "香味淡一点"));
            default -> words.addAll(List.of(
                    "日常用花", "生日惊喜", "纪念日", "母亲节", "情人节",
                    "教师节", "毕业季", "约会表白", "探望慰问", "开业祝福"));
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("words", words.stream().limit(12).toList());
        result.put("degraded", true);
        result.put("fallbackReason", reason);
        result.put("promptTokens", 0);
        result.put("completionTokens", 0);
        result.put("totalTokens", 0);
        result.put("estimatedCost", BigDecimal.ZERO);
        result.put("model", "fallback");
        return result;
    }

    private List<String> mergeFallback(List<String> current, String category, String theme) {
        LinkedHashSet<String> merged = new LinkedHashSet<>(current);
        Map<String, Object> fallback = fallback(category, theme, "");
        Object raw = fallback.get("words");
        if (raw instanceof List<?> items) {
            items.forEach(item -> addWord(merged, String.valueOf(item)));
        }
        return new ArrayList<>(merged);
    }

    private List<String> sanitize(List<String> words) {
        LinkedHashSet<String> unique = new LinkedHashSet<>();
        for (String word : words) {
            addWord(unique, word);
            if (unique.size() >= 12) {
                break;
            }
        }
        return new ArrayList<>(unique);
    }

    private void addWord(java.util.Collection<String> words, String word) {
        if (word == null) {
            return;
        }
        String normalized = word.trim()
                .replaceAll("^[\\s\\d一二三四五六七八九十]+[.、)）:：]\\s*", "")
                .replaceAll("^[\"'“”‘’]+|[\"'“”‘’]+$", "")
                .replaceAll("[。！？；，、,.!?;:：]+$", "")
                .replaceAll("\\s+", " ")
                .trim();
        if (normalized.length() >= 2 && normalized.length() <= 20) {
            words.add(normalized);
        }
    }

    private JsonNode parseJson(String content) {
        if (content == null || content.isBlank()) {
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

    private static String normalizeCategory(String category) {
        String value = category == null ? "" : category.trim().toUpperCase();
        return switch (value) {
            case "AUDIENCE", "RELATION", "人群", "关系/人群" -> "AUDIENCE";
            case "NEED", "PAIN", "诉求", "诉求/痛点" -> "NEED";
            default -> "SCENE";
        };
    }

    private static String label(String category) {
        return switch (normalizeCategory(category)) {
            case "AUDIENCE" -> "关系/人群";
            case "NEED" -> "诉求/痛点";
            default -> "场景/节日";
        };
    }

    private static String trim(String value) {
        return value == null ? "" : value.replace('\n', ' ').replace('\r', ' ').trim();
    }

    public record PromptTagRequest(String category, String theme) {
    }
}
