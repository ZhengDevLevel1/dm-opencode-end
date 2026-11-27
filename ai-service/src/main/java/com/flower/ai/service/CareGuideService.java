package com.flower.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flower.ai.client.DeepSeekClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class CareGuideService {

    private static final Logger log = LoggerFactory.getLogger(CareGuideService.class);

    private final DeepSeekClient deepSeekClient;
    private final ObjectMapper objectMapper;
    private final RetrievalService retrievalService;

    public CareGuideService(DeepSeekClient deepSeekClient,
                            ObjectMapper objectMapper,
                            RetrievalService retrievalService) {
        this.deepSeekClient = deepSeekClient;
        this.objectMapper = objectMapper;
        this.retrievalService = retrievalService;
    }

    public Map<String, Object> careGuide(CareGuideRequest request) {
        Map<String, Object> product = request.product() == null ? Map.of() : request.product();
        String name = text(product.get("name"), "这束花");
        String category = text(product.get("category"), "鲜花");
        String current = text(request.currentCareGuide(), "");
        try {
            if (!deepSeekClient.available()) {
                return fallback(name, category, "DeepSeek API Key 未配置");
            }
            String knowledge = knowledge(name, category);
            String prompt = "你是花店资深花艺养护师。请根据商品信息、知识库和现有指南，生成一份可直接展示给顾客的中文养护指南。"
                    + "严格输出 JSON：{\"careGuide\":\"\"}。careGuide 必须是纯文本，不要 markdown，不要项目符号；"
                    + "用空行分成 4-6 段，每段第一行是小标题，下一行写 1-2 句说明；"
                    + "覆盖斜剪、换水、水位、环境、常见小状况；总字数 300-600 字；"
                    + "结合花材和品类给出具体建议，不要编造不存在的花材、产地或功效。\n"
                    + "商品信息：" + objectMapper.writeValueAsString(product) + "\n"
                    + "现有指南（可在其基础上优化，若为空则从零生成）：" + current + "\n"
                    + "知识库：" + knowledge;
            DeepSeekClient.Completion completion = deepSeekClient.complete(List.of(
                    Map.of("role", "system", "content", "你只输出合法 JSON，不要 markdown。"),
                    Map.of("role", "user", "content", prompt)), 0.5, 1400);
            JsonNode node = parseJson(completion.content());
            String generated = node == null ? "" : node.path("careGuide").asText("").trim();
            if (generated.isBlank()) {
                return fallback(name, category, "AI 返回内容无法解析");
            }
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("careGuide", truncate(generated, 2000));
            result.put("degraded", false);
            result.put("fallbackReason", null);
            applyUsage(result, completion);
            return result;
        } catch (Exception ex) {
            log.warn("Care guide generation failed: {}", ex.getMessage());
            return fallback(name, category, "AI 服务暂不可用，已使用模板养护指南");
        }
    }

    private String knowledge(String name, String category) {
        List<RetrievalService.KnowledgeHit> hits = retrievalService.retrieveKnowledge(
                name + " " + category + " 鲜花 养护 换水 剪根", 3);
        StringBuilder builder = new StringBuilder();
        for (RetrievalService.KnowledgeHit hit : hits) {
            if (builder.length() > 0) {
                builder.append("\n\n");
            }
            builder.append(hit.title()).append("\n").append(hit.content());
            if (builder.length() >= 1800) {
                break;
            }
        }
        return truncate(builder.toString(), 1800);
    }

    private Map<String, Object> fallback(String name, String category, String reason) {
        String careGuide = String.join("\n\n",
                "01 45° 斜剪根\n收到花束后，在根部以上 2cm 处以 45° 斜剪，扩大吸水面积，避免平剪导致吸水面贴住瓶底。",
                "02 去叶入水\n摘除所有会浸入水中的叶片，避免叶片在水中腐烂滋生细菌，每两天清洗花瓶并更换清水。",
                "03 浅水养护\n水位控制在花瓶的 1/3，深水反而会加速茎秆腐烂。加入附赠保鲜剂，可延长 2–3 天花期。",
                "04 避开风口\n远离空调直吹、暖气与成熟水果（乙烯会催谢）。夜间可移至阴凉处，玫瑰会缓慢恢复挺立。",
                "05 常见小状况\n花头下垂：剪根后深水浸泡 1 小时（水位到花头下），多数可在 2 小时内恢复挺立。外层花瓣发软：玫瑰外层为保护瓣，属正常现象，请勿摘除。水质发浑：立即洗瓶换水并再次斜剪 1cm，避免细菌堵塞导管。",
                "养护提示\n「" + name + "」属于" + category + "花材，收到后请尽快拆包装、剪根入水；若花材出现明显萎蔫，请拍照联系门店处理。");
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("careGuide", careGuide);
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

    private static String text(Object value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? fallback : text;
    }

    private static String truncate(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    public record CareGuideRequest(Map<String, Object> product, String currentCareGuide) {
    }
}
