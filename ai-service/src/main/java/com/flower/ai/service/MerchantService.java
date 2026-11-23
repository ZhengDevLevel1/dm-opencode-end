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
import java.util.List;
import java.util.Map;

@Service
public class MerchantService {

    private static final Logger log = LoggerFactory.getLogger(MerchantService.class);

    private final DeepSeekClient deepSeekClient;
    private final ObjectMapper objectMapper;

    public MerchantService(DeepSeekClient deepSeekClient, ObjectMapper objectMapper) {
        this.deepSeekClient = deepSeekClient;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> productCopy(ProductCopyRequest request) {
        Map<String, Object> product = request.product() == null ? Map.of() : request.product();
        String name = text(product.get("name"), "花礼");
        String category = text(product.get("category"), "鲜花");
        String meaning = text(product.get("flowerMeaning"), "");
        String grade = text(product.get("grade"), "未标注");
        String origin = text(product.get("origin"), "未标注");
        try {
            if (!deepSeekClient.available()) {
                return fallbackCopy(product, name, category, meaning, "DeepSeek API Key 未配置");
            }
            String prompt = "你是花店资深文案与商品运营。请根据商品信息生成中文文案，严格输出 JSON："
                    + "{\"title\":\"\",\"description\":\"\",\"tags\":[\"\"],\"sellingPoints\":[\"\"]}。"
                    + "语气：" + text(request.tone(), "温暖")
                    + "；篇幅：" + text(request.length(), "medium")
                    + "。标题不超过 20 字，描述 60-120 字，标签 3-5 个，卖点 3 条，整体 JSON 不超过 600 字。"
                    + "花材等级：" + grade + "；产地：" + origin
                    + "。标签要适合商品搜索与推荐，例如花材、场景、人群、送礼卖点；"
                    + "卖点要具体、可感知，不要编造不存在的花材、产地或功效。\n商品信息："
                    + objectMapper.writeValueAsString(product);
            DeepSeekClient.Completion completion = deepSeekClient.complete(List.of(
                    Map.of("role", "system", "content", "你只输出合法 JSON，不要 markdown。"),
                    Map.of("role", "user", "content", prompt)), 0.6, 2000);
            JsonNode node = parseJson(completion.content());
            if (node == null) {
                completion = deepSeekClient.complete(List.of(
                        Map.of("role", "system", "content", "你只输出合法 JSON，不要 markdown。"),
                        Map.of("role", "user", "content", prompt)), 0.3, 2000);
                node = parseJson(completion.content());
            }
            if (node == null) {
                return fallbackCopy(product, name, category, meaning, "AI 返回内容无法解析");
            }
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("title", node.path("title").asText(name));
            result.put("description", node.path("description").asText(""));
            result.put("tags", textList(node.path("tags")));
            result.put("sellingPoints", textList(node.path("sellingPoints")));
            result.put("degraded", false);
            result.put("fallbackReason", null);
            applyUsage(result, completion);
            return result;
        } catch (Exception ex) {
            log.warn("Product copy generation failed: {}", ex.getMessage());
            return fallbackCopy(product, name, category, meaning, "AI 服务暂不可用，已使用模板文案");
        }
    }

    public Map<String, Object> recommendationAdvice(AdviceRequest request) {
        Map<String, Double> current = normalize(request.weights(), defaultWeights());
        try {
            if (!deepSeekClient.available()) {
                return fallbackAdvice(current, "DeepSeek API Key 未配置");
            }
            String prompt = "你是推荐系统运营专家。当前推荐场景：" + text(request.scene(), "home")
                    + "（" + text(request.sceneLabel(), "首页") + "），观察窗口 " + (request.days() == null ? 30 : request.days())
                    + " 天。当前四因子权重：" + objectMapper.writeValueAsString(current)
                    + "。请给出保守的小幅调参建议，严格输出 JSON："
                    + "{\"suggestedWeights\":{\"content\":0.4,\"popularity\":0.2,\"festival\":0.2,\"rating\":0.2},"
                    + "\"reason\":\"\",\"confidence\":0.6,\"guardrails\":[\"\"]}。"
                    + "四项权重之和必须为 1，每项保留 3 位小数；reason 不超过 80 字；guardrails 2-3 条。";
            DeepSeekClient.Completion completion = deepSeekClient.complete(List.of(
                    Map.of("role", "system", "content", "你只输出合法 JSON，不要 markdown。"),
                    Map.of("role", "user", "content", prompt)), 0.4, 1500);
            JsonNode node = parseJson(completion.content());
            if (node == null) {
                return fallbackAdvice(current, "AI 返回内容无法解析");
            }
            Map<String, Double> suggested = normalize(readWeights(node.path("suggestedWeights")), current);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("suggestedWeights", suggested);
            result.put("reason", node.path("reason").asText("建议小幅提高内容匹配权重，观察 CTR 与加购率变化。"));
            result.put("confidence", Math.max(0, Math.min(1, node.path("confidence").asDouble(0.5))));
            result.put("guardrails", textList(node.path("guardrails")));
            result.put("degraded", false);
            result.put("fallbackReason", null);
            applyUsage(result, completion);
            return result;
        } catch (Exception ex) {
            log.warn("Recommendation advice failed: {}", ex.getMessage());
            return fallbackAdvice(current, "AI 服务暂不可用，已使用启发式建议");
        }
    }

    private Map<String, Object> fallbackCopy(Map<String, Object> product, String name,
                                             String category, String meaning, String reason) {
        String description = "「" + name + "」精选" + category + "花材，"
                + (meaning.isBlank() ? "层次柔和，适合日常与节日送花。" : meaning + "。")
                + "由花艺师手工搭配，适合表达心意与仪式感。";
        List<String> tags = new ArrayList<>();
        if (!category.isBlank()) {
            tags.add(category);
        }
        tags.add("花艺师手作");
        tags.add("当日新鲜");
        List<String> sellingPoints = List.of("新鲜花材", "手工搭配", "适合送礼");
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("title", name);
        result.put("description", description);
        result.put("tags", tags);
        result.put("sellingPoints", sellingPoints);
        result.put("degraded", true);
        result.put("fallbackReason", reason);
        applyFallbackUsage(result);
        return result;
    }

    private Map<String, Object> fallbackAdvice(Map<String, Double> current, String reason) {
        Map<String, Double> candidate = new LinkedHashMap<>(current);
        candidate.put("content", current.getOrDefault("content", 0.4) + 0.03);
        candidate.put("popularity", Math.max(0, current.getOrDefault("popularity", 0.3) - 0.02));
        candidate.put("festival", Math.max(0, current.getOrDefault("festival", 0.2) - 0.01));
        Map<String, Double> suggested = normalize(candidate, current);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("suggestedWeights", suggested);
        result.put("reason", "建议小幅提高内容匹配权重、降低热度权重，先观察 3-7 天 CTR 与加购率。");
        result.put("confidence", 0.35);
        result.put("guardrails", List.of("建议先小流量观察 3-7 天", "四项权重之和必须为 1", "关注降级率与 P95 延迟"));
        result.put("degraded", true);
        result.put("fallbackReason", reason);
        applyFallbackUsage(result);
        return result;
    }

    private static void applyUsage(Map<String, Object> result, DeepSeekClient.Completion completion) {
        int promptTokens = completion.promptTokens();
        int completionTokens = completion.completionTokens();
        int totalTokens = promptTokens + completionTokens;
        double cost = promptTokens / 1000.0 * 0.001 + completionTokens / 1000.0 * 0.002;
        result.put("promptTokens", promptTokens);
        result.put("completionTokens", completionTokens);
        result.put("totalTokens", totalTokens);
        result.put("estimatedCost", BigDecimal.valueOf(cost).setScale(6, RoundingMode.HALF_UP));
        result.put("model", completion.model());
    }

    private static void applyFallbackUsage(Map<String, Object> result) {
        result.put("promptTokens", 0);
        result.put("completionTokens", 0);
        result.put("totalTokens", 0);
        result.put("estimatedCost", BigDecimal.ZERO);
        result.put("model", "fallback");
    }

    private Map<String, Double> readWeights(JsonNode node) {
        Map<String, Double> weights = new LinkedHashMap<>();
        for (String key : List.of("content", "popularity", "festival", "rating")) {
            weights.put(key, node.path(key).asDouble(0));
        }
        return weights;
    }

    private Map<String, Double> normalize(Map<String, Double> candidate, Map<String, Double> fallback) {
        List<String> keys = List.of("content", "popularity", "festival", "rating");
        Map<String, Double> values = sanitize(candidate, fallback, keys);
        double sum = values.values().stream().mapToDouble(Double::doubleValue).sum();
        if (sum <= 0) {
            Map<String, Double> fallbackValues = sanitize(fallback, defaultWeights(), keys);
            double fallbackSum = fallbackValues.values().stream()
                    .mapToDouble(Double::doubleValue).sum();
            if (fallbackSum > 0) {
                values = fallbackValues;
                sum = fallbackSum;
            } else {
                values = defaultWeights();
                sum = 1.0;
            }
        }

        int totalUnits = 1000;
        int[] units = new int[keys.size()];
        double[] remainders = new double[keys.size()];
        int assigned = 0;
        for (int i = 0; i < keys.size(); i++) {
            double exact = values.get(keys.get(i)) / sum * totalUnits;
            units[i] = (int) Math.floor(exact);
            remainders[i] = exact - units[i];
            assigned += units[i];
        }
        int remaining = totalUnits - assigned;
        List<Integer> order = new ArrayList<>();
        for (int i = 0; i < keys.size(); i++) {
            order.add(i);
        }
        order.sort((left, right) -> {
            int comparison = Double.compare(remainders[right], remainders[left]);
            return comparison != 0 ? comparison : Integer.compare(left, right);
        });
        for (int i = 0; i < remaining; i++) {
            units[order.get(i % order.size())]++;
        }

        Map<String, Double> normalized = new LinkedHashMap<>();
        for (int i = 0; i < keys.size(); i++) {
            normalized.put(keys.get(i), BigDecimal.valueOf(units[i]).movePointLeft(3).doubleValue());
        }
        return normalized;
    }

    private static Map<String, Double> sanitize(Map<String, Double> candidate,
                                                Map<String, Double> fallback,
                                                List<String> keys) {
        Map<String, Double> values = new LinkedHashMap<>();
        for (String key : keys) {
            Double raw = candidate == null ? null : candidate.get(key);
            if (raw == null) {
                raw = fallback == null ? null : fallback.get(key);
            }
            double value = raw == null ? 0.25 : raw;
            if (!Double.isFinite(value)) {
                value = 0.25;
            }
            values.put(key, Math.max(0, Math.min(1, value)));
        }
        return values;
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

    private static String text(Object value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? fallback : text;
    }

    private static Map<String, Double> defaultWeights() {
        Map<String, Double> weights = new LinkedHashMap<>();
        weights.put("content", 0.4);
        weights.put("popularity", 0.3);
        weights.put("festival", 0.2);
        weights.put("rating", 0.1);
        return weights;
    }

    public record ProductCopyRequest(Map<String, Object> product, String tone, String length) {
    }

    public record AdviceRequest(String scene, String sceneLabel, Map<String, Double> weights, Integer days) {
    }
}
