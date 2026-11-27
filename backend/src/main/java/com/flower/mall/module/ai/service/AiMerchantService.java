package com.flower.mall.module.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.common.util.SecurityUtils;
import com.flower.mall.config.AppProperties;
import com.flower.mall.module.ai.dto.AiCareGuideRequest;
import com.flower.mall.module.ai.dto.AiCareGuideVO;
import com.flower.mall.module.ai.dto.AiProductCopyApplyRequest;
import com.flower.mall.module.ai.dto.AiProductCopyRequest;
import com.flower.mall.module.ai.dto.AiProductCopyVO;
import com.flower.mall.module.ai.dto.AiWeightAdviceApplyRequest;
import com.flower.mall.module.ai.dto.AiWeightAdviceRequest;
import com.flower.mall.module.ai.dto.AiWeightAdviceVO;
import com.flower.mall.module.ai.entity.AiCallLog;
import com.flower.mall.module.product.dto.ProductAiCopyUpdate;
import com.flower.mall.module.product.dto.ProductVO;
import com.flower.mall.module.product.entity.Product;
import com.flower.mall.module.product.service.ProductService;
import com.flower.mall.module.recommendation.dto.RecommendationSceneWeightRequest;
import com.flower.mall.module.recommendation.dto.RecommendationSceneWeightVO;
import com.flower.mall.module.recommendation.dto.RecommendationSceneWeightsRequest;
import com.flower.mall.module.recommendation.service.RecommendationService;
import com.flower.mall.security.AuthUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiMerchantService {

    private static final List<String> WEIGHT_KEYS = List.of("content", "popularity", "festival", "rating");

    private final AiClient aiClient;
    private final AiCallLogService callLogService;
    private final ProductService productService;
    private final RecommendationService recommendationService;
    private final AppProperties properties;

    public AiProductCopyVO productCopy(AiProductCopyRequest request) {
        requireMerchantEnabled();
        ProductInfo info = resolveProductInfo(request);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("product", info.toMap());
        body.put("tone", StringUtils.hasText(request.getTone()) ? request.getTone() : "温暖");
        body.put("length", StringUtils.hasText(request.getLength()) ? request.getLength() : "medium");
        long startedAt = System.currentTimeMillis();
        try {
            JsonNode response = aiClient.post("/internal/ai/product-copy", body,
                    properties.getAi().getTimeoutMs());
            AiProductCopyVO vo = AiProductCopyVO.builder()
                    .title(response.path("title").asText(info.name()))
                    .description(response.path("description").asText(info.description()))
                    .tags(textList(response.path("tags")))
                    .sellingPoints(textList(response.path("sellingPoints")))
                    .degraded(response.path("degraded").asBoolean(false))
                    .fallbackReason(response.path("fallbackReason").asText(null))
                    .build();
            logMerchant("PRODUCT_COPY", vo.isDegraded() ? "FALLBACK" : "SUCCESS",
                    vo.isDegraded(), response.path("degradedStage").asText(vo.isDegraded() ? "ai-service" : null),
                    vo.getFallbackReason(), startedAt, body, response);
            return vo;
        } catch (BusinessException ex) {
            if (ex.getCode() != ErrorCode.AI_UNAVAILABLE.getCode()
                    && ex.getCode() != ErrorCode.AI_DISABLED.getCode()) {
                throw ex;
            }
            AiProductCopyVO fallback = fallbackCopy(info);
            logMerchant("PRODUCT_COPY", "FALLBACK", true, "backend-fallback",
                    fallback.getFallbackReason(), startedAt, body, null);
            return fallback;
        }
    }

    public ProductVO applyProductCopy(AiProductCopyApplyRequest request) {
        ProductAiCopyUpdate update = new ProductAiCopyUpdate(
                request.getTitle(),
                request.getDescription(),
                request.getTags(),
                request.getSellingPoints(),
                enabled(request.getApplyTitle()),
                enabled(request.getApplyDescription()),
                enabled(request.getApplyTags()),
                enabled(request.getApplySellingPoints()));
        return productService.applyAiCopy(request.getProductId(), update);
    }

    public AiCareGuideVO careGuide(AiCareGuideRequest request) {
        requireMerchantEnabled();
        Product product = request.getProductId() == null
                ? null : productService.getRequired(request.getProductId());
        String name = firstText(request.getName(), product == null ? null : product.getName());
        if (!StringUtils.hasText(name)) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "请填写商品名称或选择商品");
        }
        String category = firstText(request.getCategory(), product == null ? null : product.getCategory());
        String description = firstText(request.getDescription(),
                product == null ? null : product.getDescription());
        String flowerMeaning = firstText(request.getFlowerMeaning(),
                product == null ? null : product.getFlowerMeaning());
        String currentCareGuide = firstText(request.getCurrentCareGuide(), null);

        Map<String, Object> productBody = new LinkedHashMap<>();
        productBody.put("id", product == null ? null : product.getId());
        productBody.put("name", name);
        productBody.put("category", category);
        productBody.put("description", description);
        productBody.put("flowerMeaning", flowerMeaning);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("product", productBody);
        body.put("currentCareGuide", currentCareGuide);
        long startedAt = System.currentTimeMillis();
        try {
            JsonNode response = aiClient.post("/internal/ai/care-guide", body,
                    properties.getAi().getTimeoutMs());
            String generated = response.path("careGuide").asText("").trim();
            if (!StringUtils.hasText(generated)) {
                AiCareGuideVO fallback = fallbackCareGuide(name, category, "AI 返回内容为空");
                logMerchant("PRODUCT_CARE_GUIDE", "FALLBACK", true, "ai-service",
                        fallback.getFallbackReason(), startedAt, body, null);
                return fallback;
            }
            AiCareGuideVO vo = AiCareGuideVO.builder()
                    .careGuide(truncate(generated, 2000))
                    .degraded(response.path("degraded").asBoolean(false))
                    .fallbackReason(response.path("fallbackReason").asText(null))
                    .build();
            logMerchant("PRODUCT_CARE_GUIDE", vo.isDegraded() ? "FALLBACK" : "SUCCESS",
                    vo.isDegraded(), response.path("degradedStage").asText(
                            vo.isDegraded() ? "ai-service" : null),
                    vo.getFallbackReason(), startedAt, body, response);
            return vo;
        } catch (BusinessException ex) {
            if (ex.getCode() != ErrorCode.AI_UNAVAILABLE.getCode()
                    && ex.getCode() != ErrorCode.AI_DISABLED.getCode()) {
                throw ex;
            }
            AiCareGuideVO fallback = fallbackCareGuide(name, category,
                    "AI 服务暂不可用，已使用模板养护指南");
            logMerchant("PRODUCT_CARE_GUIDE", "FALLBACK", true, "backend-fallback",
                    fallback.getFallbackReason(), startedAt, body, null);
            return fallback;
        }
    }

    public AiWeightAdviceVO recommendationAdvice(AiWeightAdviceRequest request) {
        requireMerchantEnabled();
        List<RecommendationSceneWeightVO> scenes = recommendationService.getSceneWeights();
        RecommendationSceneWeightVO current = findScene(scenes, request.getScene());
        Map<String, Double> currentWeights = toWeights(current);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("scene", current.getScene());
        body.put("sceneLabel", current.getSceneLabel());
        body.put("weights", currentWeights);
        body.put("days", request.getDays() == null ? 30 : request.getDays());
        long startedAt = System.currentTimeMillis();
        try {
            JsonNode response = aiClient.post("/internal/ai/recommendation-advice", body,
                    properties.getAi().getTimeoutMs());
            Map<String, Double> suggested = normalize(readWeights(response.path("suggestedWeights")), currentWeights);
            AiWeightAdviceVO vo = AiWeightAdviceVO.builder()
                    .scene(current.getScene())
                    .currentWeights(currentWeights)
                    .suggestedWeights(suggested)
                    .reason(response.path("reason").asText("建议小幅提高内容匹配权重，观察 CTR 与加购率变化。"))
                    .confidence(response.path("confidence").asDouble(0.5))
                    .guardrails(textList(response.path("guardrails")))
                    .degraded(response.path("degraded").asBoolean(false))
                    .fallbackReason(response.path("fallbackReason").asText(null))
                    .build();
            logMerchant("RECOMMENDATION_ADVICE", vo.isDegraded() ? "FALLBACK" : "SUCCESS",
                    vo.isDegraded(), response.path("degradedStage").asText(vo.isDegraded() ? "ai-service" : null),
                    vo.getFallbackReason(), startedAt, body, response);
            return vo;
        } catch (BusinessException ex) {
            if (ex.getCode() != ErrorCode.AI_UNAVAILABLE.getCode()
                    && ex.getCode() != ErrorCode.AI_DISABLED.getCode()) {
                throw ex;
            }
            AiWeightAdviceVO fallback = fallbackAdvice(current, currentWeights);
            logMerchant("RECOMMENDATION_ADVICE", "FALLBACK", true, "backend-fallback",
                    fallback.getFallbackReason(), startedAt, body, null);
            return fallback;
        }
    }

    public List<RecommendationSceneWeightVO> applyRecommendationAdvice(AiWeightAdviceApplyRequest request) {
        List<RecommendationSceneWeightVO> scenes = recommendationService.getSceneWeights();
        RecommendationSceneWeightVO current = findScene(scenes, request.getScene());
        Map<String, Double> suggested = normalize(request.getWeights(), toWeights(current));
        RecommendationSceneWeightsRequest update = new RecommendationSceneWeightsRequest();
        List<RecommendationSceneWeightRequest> items = new ArrayList<>();
        for (RecommendationSceneWeightVO scene : scenes) {
            Map<String, Double> weights = scene.getScene().equalsIgnoreCase(current.getScene())
                    ? suggested
                    : toWeights(scene);
            RecommendationSceneWeightRequest item = new RecommendationSceneWeightRequest();
            item.setScene(scene.getScene());
            item.setContentWeight(BigDecimal.valueOf(weights.get("content")));
            item.setPopularityWeight(BigDecimal.valueOf(weights.get("popularity")));
            item.setFestivalWeight(BigDecimal.valueOf(weights.get("festival")));
            item.setRatingWeight(BigDecimal.valueOf(weights.get("rating")));
            item.setEnabled(scene.isEnabled());
            items.add(item);
        }
        update.setScenes(items);
        return recommendationService.updateSceneWeights(update);
    }

    private void requireMerchantEnabled() {
        if (!properties.getAi().isEnabled() || !properties.getAi().isMerchantEnabled()) {
            throw BusinessException.of(ErrorCode.AI_DISABLED);
        }
    }

    private ProductInfo resolveProductInfo(AiProductCopyRequest request) {
        Product product = request.getProductId() == null ? null : productService.getRequired(request.getProductId());
        String name = firstText(request.getName(), product == null ? null : product.getName());
        if (!StringUtils.hasText(name)) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "请填写商品名称或选择商品");
        }
        return new ProductInfo(
                product == null ? null : product.getId(),
                name,
                firstText(request.getCategory(), product == null ? null : product.getCategory()),
                nullSafe(request.getGrade()),
                nullSafe(request.getOrigin()),
                firstText(request.getFlowerMeaning(), product == null ? null : product.getFlowerMeaning()),
                firstText(request.getOccasionTags(), product == null ? null : product.getOccasionTags()),
                firstText(request.getFestivalTags(), product == null ? null : product.getFestivalTags()),
                firstText(request.getDescription(), product == null ? null : product.getDescription()),
                request.getPrice() != null ? request.getPrice() : product == null ? null : product.getPrice());
    }

    private AiProductCopyVO fallbackCopy(ProductInfo info) {
        String meaning = info.flowerMeaning();
        String description = "「" + info.name() + "」精选" + (info.category().isBlank() ? "鲜花" : info.category()) + "花材，"
                + (meaning.isBlank() ? "层次柔和、适合日常与节日送花。" : meaning + "，")
                + "由花艺师手工搭配，适合表达心意与仪式感。";
        List<String> tags = new ArrayList<>();
        if (!info.category().isBlank()) {
            tags.add(info.category());
        }
        if (!info.grade().isBlank()) {
            tags.add(info.grade());
        }
        tags.add("花艺师手作");
        tags.add("当日新鲜");
        return AiProductCopyVO.builder()
                .title(info.name())
                .description(description)
                .tags(tags)
                .sellingPoints(List.of("新鲜花材", "手工搭配", "适合送礼"))
                .degraded(true)
                .fallbackReason("AI 服务暂不可用，已使用模板文案")
                .build();
    }

    private AiCareGuideVO fallbackCareGuide(String name, String category, String reason) {
        String subject = StringUtils.hasText(name) ? "「" + name + "」" : "这束花";
        String categoryText = StringUtils.hasText(category) ? category : "鲜花";
        String careGuide = String.join("\n\n",
                "01 45° 斜剪根\n收到花束后，在根部以上 2cm 处以 45° 斜剪，扩大吸水面积，避免平剪导致吸水面贴住瓶底。",
                "02 去叶入水\n摘除所有会浸入水中的叶片，避免叶片在水中腐烂滋生细菌，每两天清洗花瓶并更换清水。",
                "03 浅水养护\n水位控制在花瓶的 1/3，深水反而会加速茎秆腐烂。加入附赠保鲜剂，可延长 2–3 天花期。",
                "04 避开风口\n远离空调直吹、暖气与成熟水果（乙烯会催谢）。夜间可移至阴凉处，玫瑰会缓慢恢复挺立。",
                "05 常见小状况\n花头下垂：剪根后深水浸泡 1 小时（水位到花头下），多数可在 2 小时内恢复挺立。外层花瓣发软：玫瑰外层为保护瓣，属正常现象，请勿摘除。水质发浑：立即洗瓶换水并再次斜剪 1cm，避免细菌堵塞导管。",
                "养护提示\n" + subject + "属于" + categoryText + "花材，收到后请尽快拆包装、剪根入水；若花材出现明显萎蔫，请拍照联系门店处理。");
        return AiCareGuideVO.builder()
                .careGuide(careGuide)
                .degraded(true)
                .fallbackReason(reason)
                .build();
    }

    private static String truncate(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    private AiWeightAdviceVO fallbackAdvice(RecommendationSceneWeightVO scene, Map<String, Double> current) {
        Map<String, Double> suggested = new LinkedHashMap<>(current);
        suggested.put("content", current.getOrDefault("content", 0.4) + 0.03);
        suggested.put("popularity", Math.max(0, current.getOrDefault("popularity", 0.3) - 0.02));
        suggested.put("festival", Math.max(0, current.getOrDefault("festival", 0.2) - 0.01));
        Map<String, Double> normalized = normalize(suggested, current);
        return AiWeightAdviceVO.builder()
                .scene(scene.getScene())
                .currentWeights(current)
                .suggestedWeights(normalized)
                .reason("AI 服务暂不可用，已按“内容优先、降低热度”的保守策略生成草稿，请结合近 7 天 CTR 与加购率手动确认。")
                .confidence(0.35)
                .guardrails(List.of("建议先小流量观察 3-7 天", "四项权重之和必须为 1", "关注降级率与 P95 延迟"))
                .degraded(true)
                .fallbackReason("AI 服务暂不可用，已使用启发式建议")
                .build();
    }

    private RecommendationSceneWeightVO findScene(List<RecommendationSceneWeightVO> scenes, String scene) {
        return scenes.stream()
                .filter(item -> item.getScene().equalsIgnoreCase(scene))
                .findFirst()
                .orElseThrow(() -> BusinessException.of(ErrorCode.BAD_REQUEST, "推荐场景不合法"));
    }

    private Map<String, Double> toWeights(RecommendationSceneWeightVO scene) {
        Map<String, Double> weights = new LinkedHashMap<>();
        weights.put("content", scene.getContentWeight().doubleValue());
        weights.put("popularity", scene.getPopularityWeight().doubleValue());
        weights.put("festival", scene.getFestivalWeight().doubleValue());
        weights.put("rating", scene.getRatingWeight().doubleValue());
        return weights;
    }

    private Map<String, Double> readWeights(JsonNode node) {
        Map<String, Double> weights = new LinkedHashMap<>();
        for (String key : WEIGHT_KEYS) {
            weights.put(key, node.path(key).asDouble(0));
        }
        return weights;
    }

    private Map<String, Double> normalize(Map<String, Double> candidate, Map<String, Double> fallback) {
        Map<String, Double> values = sanitize(candidate, fallback);
        double sum = values.values().stream().mapToDouble(Double::doubleValue).sum();
        if (sum <= 0) {
            Map<String, Double> fallbackValues = sanitize(fallback, Map.of());
            double fallbackSum = fallbackValues.values().stream()
                    .mapToDouble(Double::doubleValue).sum();
            if (fallbackSum > 0) {
                values = fallbackValues;
                sum = fallbackSum;
            } else {
                values = sanitize(Map.of(), Map.of());
                sum = values.values().stream().mapToDouble(Double::doubleValue).sum();
            }
        }

        int totalUnits = 1000;
        int[] units = new int[WEIGHT_KEYS.size()];
        double[] remainders = new double[WEIGHT_KEYS.size()];
        int assigned = 0;
        for (int i = 0; i < WEIGHT_KEYS.size(); i++) {
            double exact = values.get(WEIGHT_KEYS.get(i)) / sum * totalUnits;
            units[i] = (int) Math.floor(exact);
            remainders[i] = exact - units[i];
            assigned += units[i];
        }
        int remaining = totalUnits - assigned;
        List<Integer> order = new ArrayList<>();
        for (int i = 0; i < WEIGHT_KEYS.size(); i++) {
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
        for (int i = 0; i < WEIGHT_KEYS.size(); i++) {
            normalized.put(WEIGHT_KEYS.get(i), BigDecimal.valueOf(units[i]).movePointLeft(3).doubleValue());
        }
        return normalized;
    }

    private Map<String, Double> sanitize(Map<String, Double> candidate, Map<String, Double> fallback) {
        Map<String, Double> values = new LinkedHashMap<>();
        for (String key : WEIGHT_KEYS) {
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

    private void logMerchant(String scene, String status, boolean degraded, String degradedStage,
                             String fallbackReason, long startedAt, Map<String, Object> requestBody,
                             JsonNode response) {
        AuthUser user = SecurityUtils.currentUserOrNull();
        AiCallLog callLog = new AiCallLog();
        callLog.setRequestId(UUID.randomUUID().toString());
        callLog.setUserId(user == null ? null : user.getId());
        callLog.setUserRole(user == null ? null : user.getRole().name());
        callLog.setScene(scene);
        callLog.setModel(response == null
                ? properties.getAi().getChatModel()
                : response.path("model").asText(properties.getAi().getChatModel()));
        callLog.setStatus(status);
        callLog.setDegraded(degraded);
        callLog.setDegradedStage(degradedStage);
        callLog.setFallbackReason(fallbackReason);
        callLog.setLatencyMs((int) (System.currentTimeMillis() - startedAt));
        int promptTokens = response == null ? 0 : response.path("promptTokens").asInt(0);
        int completionTokens = response == null ? 0 : response.path("completionTokens").asInt(0);
        callLog.setPromptTokens(promptTokens);
        callLog.setCompletionTokens(completionTokens);
        callLog.setTotalTokens(promptTokens + completionTokens);
        callLog.setLlmCalls(response != null && !"fallback".equals(response.path("model").asText()) ? 1 : 0);
        callLog.setEstimatedCost(response == null || !response.hasNonNull("estimatedCost")
                ? BigDecimal.ZERO
                : response.path("estimatedCost").decimalValue());
        callLog.setRequestChars(requestBody == null ? 0 : requestBody.toString().length());
        callLog.setResponseChars(response == null ? 0 : response.toString().length());
        callLog.setCreatedAt(LocalDateTime.now());
        callLogService.save(callLog);
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

    private static boolean enabled(Boolean value) {
        return value == null || value;
    }

    private static String firstText(String primary, String fallback) {
        return StringUtils.hasText(primary) ? primary.trim() : nullSafe(fallback);
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value;
    }

    private record ProductInfo(Long id, String name, String category, String grade, String origin,
                               String flowerMeaning, String occasionTags, String festivalTags,
                               String description, BigDecimal price) {

        private Map<String, Object> toMap() {
            Map<String, Object> product = new LinkedHashMap<>();
            product.put("id", id);
            product.put("name", name);
            product.put("category", category);
            product.put("grade", grade);
            product.put("origin", origin);
            product.put("flowerMeaning", flowerMeaning);
            product.put("occasionTags", occasionTags);
            product.put("festivalTags", festivalTags);
            product.put("description", description);
            product.put("price", price);
            return product;
        }
    }
}
