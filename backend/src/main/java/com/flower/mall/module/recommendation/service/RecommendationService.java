package com.flower.mall.module.recommendation.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flower.mall.common.api.PageResult;
import com.flower.mall.common.enums.ProductStatus;
import com.flower.mall.common.enums.SeasonSuitability;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.common.util.FestivalCalendar;
import com.flower.mall.common.util.SecurityUtils;
import com.flower.mall.config.AppProperties;
import com.flower.mall.module.product.entity.Product;
import com.flower.mall.module.product.mapper.ProductMapper;
import com.flower.mall.module.recommendation.dto.RecommendationEvaluationVO;
import com.flower.mall.module.recommendation.dto.RecommendationItemVO;
import com.flower.mall.module.recommendation.dto.RecommendationLogVO;
import com.flower.mall.module.recommendation.dto.RecommendationQuery;
import com.flower.mall.module.recommendation.dto.RecommendationResponse;
import com.flower.mall.module.recommendation.dto.RecommendationStatsVO;
import com.flower.mall.module.recommendation.dto.RecommendationWeightRequest;
import com.flower.mall.module.recommendation.dto.RecommendationWeightsVO;
import com.flower.mall.module.recommendation.entity.RecommendationLog;
import com.flower.mall.module.recommendation.entity.RecommendationWeight;
import com.flower.mall.module.recommendation.mapper.RecommendationLogMapper;
import com.flower.mall.module.recommendation.mapper.RecommendationWeightMapper;
import com.flower.mall.module.recommendation.model.RecommendationCandidate;
import com.flower.mall.module.recommendation.model.RecommendationContext;
import com.flower.mall.module.recommendation.model.RecommendationLogLabels;
import com.flower.mall.module.recommendation.model.RecommendationResult;
import com.flower.mall.module.recommendation.model.RecommendationWeights;
import com.flower.mall.module.recommendation.model.ScoredProduct;
import com.flower.mall.module.recommendation.model.UserBehaviorData;
import com.flower.mall.module.user.entity.User;
import com.flower.mall.module.user.mapper.UserMapper;
import com.flower.mall.security.AuthUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Predicate;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private static final String STRATEGY = "CONTENT_TFIDF_MULTI_FACTOR";
    private static final long WEIGHT_ID = 1L;

    private final ProductMapper productMapper;
    private final UserBehaviorService userBehaviorService;
    private final RecommendationWeightMapper weightMapper;
    private final RecommendationLogMapper logMapper;
    private final UserMapper userMapper;
    private final RecommendationEngine engine;
    private final ObjectMapper objectMapper;
    private final AppProperties properties;

    public RecommendationResponse recommend(RecommendationQuery query) {
        AuthUser authUser = SecurityUtils.currentUserOrNull();
        UserBehaviorData behavior = authUser == null
                ? UserBehaviorData.empty()
                : userBehaviorService.load(authUser.getId());
        RecommendationContext context = resolveContext(query);
        List<Product> products = productMapper.selectList(Wrappers.<Product>lambdaQuery()
                .eq(Product::getStatus, ProductStatus.ON_SALE.name())
                .orderByDesc(Product::getSalesCount));
        List<RecommendationCandidate> candidates = products.stream()
                .map(RecommendationCandidate::from)
                .toList();
        RecommendationWeight weightEntity = getOrCreateWeights();
        RecommendationResult result = engine.recommend(candidates, behavior, context,
                RecommendationWeights.from(weightEntity),
                properties.getRecommendation().getCandidateLimit(),
                Math.min(Math.max(query.getLimit(), 1), 50));

        RecommendationResponse response = RecommendationResponse.builder()
                .strategy(STRATEGY)
                .coldStart(result.coldStart())
                .season(result.context().season().name())
                .seasonLabel(result.context().season().getLabel())
                .festival(result.context().festival())
                .scene(result.context().scene())
                .generatedAt(result.context().generatedAt())
                .weights(RecommendationWeightsVO.from(weightEntity))
                .items(result.items().stream().map(this::toItemVO).toList())
                .build();
        saveLog(authUser == null ? null : authUser.getId(), response, result);
        return response;
    }

    public RecommendationWeightsVO getWeights() {
        return RecommendationWeightsVO.from(getOrCreateWeights());
    }

    @Transactional
    public RecommendationWeightsVO updateWeights(RecommendationWeightRequest request) {
        BigDecimal contentWeight = request.getContentWeight().setScale(3, RoundingMode.HALF_UP);
        BigDecimal popularityWeight = request.getPopularityWeight().setScale(3, RoundingMode.HALF_UP);
        BigDecimal festivalWeight = request.getFestivalWeight().setScale(3, RoundingMode.HALF_UP);
        BigDecimal ratingWeight = request.getRatingWeight().setScale(3, RoundingMode.HALF_UP);
        BigDecimal roundedSum = contentWeight.add(popularityWeight).add(festivalWeight).add(ratingWeight);
        if (roundedSum.compareTo(BigDecimal.ONE) != 0
                || request.sum().subtract(BigDecimal.ONE).abs().compareTo(BigDecimal.valueOf(0.001)) > 0) {
            throw BusinessException.of(ErrorCode.WEIGHT_INVALID);
        }
        RecommendationWeight entity = getOrCreateWeights();
        entity.setContentWeight(contentWeight);
        entity.setPopularityWeight(popularityWeight);
        entity.setFestivalWeight(festivalWeight);
        entity.setRatingWeight(ratingWeight);
        entity.setUpdatedBy(SecurityUtils.currentUserId());
        weightMapper.updateById(entity);
        return RecommendationWeightsVO.from(weightMapper.selectById(entity.getId()));
    }

    public PageResult<RecommendationLogVO> pageLogs(long page, long size, Long userId, String keyword,
                                                    LocalDateTime start, LocalDateTime end) {
        String search = StringUtils.hasText(keyword) ? keyword.trim() : null;
        String pattern = search == null ? null : "%" + search + "%";
        List<String> sceneMatches = RecommendationLogLabels.matchingScenes(search);
        List<String> seasonMatches = RecommendationLogLabels.matchingSeasons(search);
        IPage<RecommendationLog> logPage = logMapper.selectPage(
                new Page<>(Math.max(page, 1), Math.min(Math.max(size, 1), 100)),
                Wrappers.<RecommendationLog>lambdaQuery()
                        .eq(userId != null, RecommendationLog::getUserId, userId)
                        .and(pattern != null, wrapper -> {
                            wrapper.like(RecommendationLog::getScene, search)
                                    .or().like(RecommendationLog::getSeason, search)
                                    .or().like(RecommendationLog::getFestival, search)
                                    .or().apply("EXISTS (SELECT 1 FROM sys_user u "
                                                    + "WHERE u.id = recommendation_log.user_id "
                                                    + "AND (u.nickname LIKE {0} OR u.username LIKE {0}))",
                                            pattern);
                            if (!sceneMatches.isEmpty()) {
                                wrapper.or().in(RecommendationLog::getScene, sceneMatches);
                            }
                            if (!seasonMatches.isEmpty()) {
                                wrapper.or().in(RecommendationLog::getSeason, seasonMatches);
                            }
                        })
                        .ge(start != null, RecommendationLog::getCreatedAt, start)
                        .le(end != null, RecommendationLog::getCreatedAt, end)
                        .orderByDesc(RecommendationLog::getId));
        Map<Long, User> users = loadLogUsers(logPage.getRecords());
        return PageResult.of(logPage, log -> {
            RecommendationLogVO vo = RecommendationLogVO.from(log);
            User user = log.getUserId() == null ? null : users.get(log.getUserId());
            if (user != null) {
                vo.setUserNickname(StringUtils.hasText(user.getNickname())
                        ? user.getNickname()
                        : user.getUsername());
            }
            return vo;
        });
    }

    private Map<Long, User> loadLogUsers(List<RecommendationLog> logs) {
        List<Long> userIds = logs.stream()
                .map(RecommendationLog::getUserId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (userIds.isEmpty()) {
            return Map.of();
        }
        return userMapper.selectBatchIds(userIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));
    }

    public RecommendationStatsVO stats() {
        LocalDateTime start = LocalDateTime.now().minusDays(30);
        List<RecommendationLog> logs = logMapper.selectList(Wrappers.<RecommendationLog>lambdaQuery()
                .ge(RecommendationLog::getCreatedAt, start));
        Set<Long> users = logs.stream()
                .map(RecommendationLog::getUserId)
                .filter(userId -> userId != null)
                .collect(Collectors.toSet());
        Map<String, Integer> productFrequency = new LinkedHashMap<>();
        for (RecommendationLog recommendationLog : logs) {
            if (!StringUtils.hasText(recommendationLog.getProductIds())) {
                continue;
            }
            for (String productId : recommendationLog.getProductIds().split(",")) {
                if (StringUtils.hasText(productId)) {
                    productFrequency.merge(productId.trim(), 1, Integer::sum);
                }
            }
        }
        long onSaleCount = productMapper.selectCount(Wrappers.<Product>lambdaQuery()
                .eq(Product::getStatus, ProductStatus.ON_SALE.name()));
        double coverage = onSaleCount == 0 ? 0 : round4(productFrequency.size() * 1.0 / onSaleCount);
        List<String> topProducts = productFrequency.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(5)
                .map(Map.Entry::getKey)
                .toList();
        return RecommendationStatsVO.builder()
                .totalRequests(logs.size())
                .distinctUsers(users.size())
                .distinctRecommendedProducts(productFrequency.size())
                .onSaleProducts(onSaleCount)
                .coverage(coverage)
                .topRecommendedProductIds(topProducts)
                .build();
    }

    public RecommendationEvaluationVO evaluatePersonas() {
        List<Product> productEntities = productMapper.selectList(Wrappers.<Product>lambdaQuery()
                .eq(Product::getStatus, ProductStatus.ON_SALE.name())
                .orderByDesc(Product::getSalesCount));
        List<RecommendationCandidate> products = productEntities.stream()
                .map(RecommendationCandidate::from)
                .toList();
        RecommendationWeights weights = RecommendationWeights.from(getOrCreateWeights());
        int candidateLimit = properties.getRecommendation().getCandidateLimit();

        List<PersonaDefinition> personas = List.of(
                new PersonaDefinition("新用户冷启动",
                        "无历史行为，按当前节日与季节降级推荐",
                        UserBehaviorData.empty(),
                        RecommendationContext.of(SeasonSuitability.SPRING, "母亲节", "home"),
                        product -> product.getFestivalTags().contains("母亲节")
                                || product.getCategory().contains("康乃馨")),
                new PersonaDefinition("玫瑰高频买家",
                        "近30天多次购买玫瑰，偏好情人节与生日场景",
                        roseBuyerBehavior(products),
                        RecommendationContext.of(SeasonSuitability.SPRING, "情人节", "home"),
                        product -> product.getCategory().contains("玫瑰")
                                || product.getFestivalTags().contains("情人节")),
                new PersonaDefinition("节日礼品偏好用户",
                        "收藏康乃馨与百合，历史评分较高",
                        festivalGiftBehavior(products),
                        RecommendationContext.of(SeasonSuitability.SPRING, "母亲节", "home"),
                        product -> product.getFestivalTags().contains("母亲节")
                                || product.getFestivalTags().contains("教师节")
                                || product.getCategory().contains("康乃馨")
                                || product.getCategory().contains("百合")),
                new PersonaDefinition("价格敏感型用户",
                        "偏好150元以内的高性价比花礼，关注日常与办公场景",
                        budgetBuyerBehavior(products),
                        RecommendationContext.of(SeasonSuitability.SUMMER, null, "home"),
                        product -> product.getPrice().compareTo(BigDecimal.valueOf(150)) <= 0),
                new PersonaDefinition("夏季时令偏好用户",
                        "偏好夏季与四季通用花材，重视应季新鲜度",
                        seasonalBuyerBehavior(products),
                        RecommendationContext.of(SeasonSuitability.SUMMER, null, "garden"),
                        product -> product.getSeason() == SeasonSuitability.SUMMER
                                || product.getSeason() == SeasonSuitability.ALL));

        Set<Long> allRecommended = new LinkedHashSet<>();
        List<RecommendationEvaluationVO.PersonaResult> results = new ArrayList<>();
        for (PersonaDefinition persona : personas) {
            RecommendationResult result = engine.recommend(products, persona.behavior(),
                    persona.context(), weights, candidateLimit, 10);
            List<ScoredProduct> items = result.items();
            int evaluatedCount = Math.min(items.size(), 10);
            long hits = items.stream()
                    .limit(10)
                    .filter(item -> persona.relevance().test(item.product()))
                    .count();
            double hitRate = hits > 0 ? 1.0 : 0.0;
            double precisionAt10 = evaluatedCount == 0 ? 0 : round4(hits * 1.0 / evaluatedCount);
            Set<Long> recommendedIds = items.stream()
                    .map(item -> item.product().getId())
                    .collect(Collectors.toCollection(LinkedHashSet::new));
            allRecommended.addAll(recommendedIds);
            double coverage = products.isEmpty() ? 0 : round4(recommendedIds.size() * 1.0 / products.size());
            results.add(RecommendationEvaluationVO.PersonaResult.builder()
                    .name(persona.name())
                    .description(persona.description())
                    .coldStart(result.coldStart())
                    .itemCount(items.size())
                    .relevantCount((int) hits)
                    .hitRate(hitRate)
                    .precisionAt10(precisionAt10)
                    .coverage(coverage)
                    .sampleReason(items.isEmpty() ? null : items.get(0).reason())
                    .build());
        }
        double overallCoverage = products.isEmpty() ? 0
                : round4(allRecommended.size() * 1.0 / products.size());
        return RecommendationEvaluationVO.builder()
                .generatedAt(LocalDateTime.now())
                .totalProducts(products.size())
                .overallCoverage(overallCoverage)
                .personas(results)
                .build();
    }

    private UserBehaviorData roseBuyerBehavior(List<RecommendationCandidate> products) {
        List<RecommendationCandidate> roses = products.stream()
                .filter(product -> product.getCategory().contains("玫瑰"))
                .limit(3)
                .toList();
        if (roses.isEmpty()) {
            return UserBehaviorData.empty();
        }
        List<UserBehaviorData.PurchasedProduct> purchases = roses.stream()
                .map(product -> new UserBehaviorData.PurchasedProduct(product, 3))
                .toList();
        List<UserBehaviorData.ReviewedProduct> reviews = roses.stream()
                .limit(1)
                .map(product -> new UserBehaviorData.ReviewedProduct(product, 5))
                .toList();
        return behavior(purchases, List.of(roses.get(0)), reviews, 5, 4.8);
    }

    private UserBehaviorData festivalGiftBehavior(List<RecommendationCandidate> products) {
        List<RecommendationCandidate> gifts = products.stream()
                .filter(product -> product.getFestivalTags().contains("母亲节")
                        || product.getFestivalTags().contains("教师节")
                        || product.getCategory().contains("康乃馨")
                        || product.getCategory().contains("百合"))
                .limit(4)
                .toList();
        if (gifts.isEmpty()) {
            return UserBehaviorData.empty();
        }
        List<RecommendationCandidate> favorites = gifts.stream().limit(3).toList();
        List<UserBehaviorData.ReviewedProduct> reviews = gifts.stream()
                .limit(2)
                .map(product -> new UserBehaviorData.ReviewedProduct(product, 5))
                .toList();
        return behavior(List.of(), favorites, reviews, 2, 5.0);
    }

    private UserBehaviorData budgetBuyerBehavior(List<RecommendationCandidate> products) {
        List<RecommendationCandidate> affordable = products.stream()
                .filter(product -> product.getPrice().compareTo(BigDecimal.valueOf(150)) <= 0)
                .limit(4)
                .toList();
        if (affordable.isEmpty()) {
            return UserBehaviorData.empty();
        }
        List<UserBehaviorData.PurchasedProduct> purchases = affordable.stream()
                .limit(3)
                .map(product -> new UserBehaviorData.PurchasedProduct(product, 2))
                .toList();
        List<UserBehaviorData.ReviewedProduct> reviews = affordable.stream()
                .limit(1)
                .map(product -> new UserBehaviorData.ReviewedProduct(product, 4))
                .toList();
        return behavior(purchases, affordable.stream().limit(2).toList(), reviews, 4, 4.3);
    }

    private UserBehaviorData seasonalBuyerBehavior(List<RecommendationCandidate> products) {
        List<RecommendationCandidate> seasonal = products.stream()
                .filter(product -> product.getSeason() == SeasonSuitability.SUMMER
                        || product.getSeason() == SeasonSuitability.ALL)
                .limit(4)
                .toList();
        if (seasonal.isEmpty()) {
            return UserBehaviorData.empty();
        }
        List<UserBehaviorData.PurchasedProduct> purchases = seasonal.stream()
                .limit(3)
                .map(product -> new UserBehaviorData.PurchasedProduct(product, 2))
                .toList();
        List<UserBehaviorData.ReviewedProduct> reviews = seasonal.stream()
                .limit(1)
                .map(product -> new UserBehaviorData.ReviewedProduct(product, 5))
                .toList();
        return behavior(purchases, seasonal.stream().limit(2).toList(), reviews, 6, 4.7);
    }

    private UserBehaviorData behavior(List<UserBehaviorData.PurchasedProduct> purchases,
                                      List<RecommendationCandidate> favorites,
                                      List<UserBehaviorData.ReviewedProduct> reviews,
                                      int purchaseFrequency, double averageRating) {
        Map<String, Double> categoryDistribution = new LinkedHashMap<>();
        for (UserBehaviorData.PurchasedProduct purchase : purchases) {
            String category = purchase.product().getCategory();
            if (StringUtils.hasText(category)) {
                categoryDistribution.merge(category, (double) purchase.quantity(), Double::sum);
            }
        }
        double total = categoryDistribution.values().stream().mapToDouble(Double::doubleValue).sum();
        if (total > 0) {
            categoryDistribution.replaceAll((category, count) -> round4(count / total));
        }
        Set<String> favoriteTags = new LinkedHashSet<>();
        for (RecommendationCandidate favorite : favorites) {
            if (StringUtils.hasText(favorite.getCategory())) {
                favoriteTags.add("cat:" + favorite.getCategory());
            }
            favorite.getOccasionTags().forEach(tag -> favoriteTags.add("occ:" + tag));
            favorite.getFestivalTags().forEach(tag -> favoriteTags.add("fest:" + tag));
        }
        return UserBehaviorData.builder()
                .purchases(purchases)
                .favorites(favorites)
                .reviews(reviews)
                .categoryDistribution(categoryDistribution)
                .favoriteTags(new ArrayList<>(favoriteTags))
                .purchaseFrequency(purchaseFrequency)
                .averageRating(averageRating)
                .build();
    }

    private RecommendationContext resolveContext(RecommendationQuery query) {
        SeasonSuitability season = SeasonSuitability.ofMonth(LocalDate.now().getMonthValue());
        if (StringUtils.hasText(query.getSeason())) {
            try {
                season = SeasonSuitability.valueOf(query.getSeason().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ignored) {
                // 非法季节参数回退到当前月份季节
            }
        }
        String festival = StringUtils.hasText(query.getFestival())
                ? query.getFestival().trim()
                : FestivalCalendar.detect(LocalDate.now()).orElse(null);
        return RecommendationContext.of(season, festival, query.getScene());
    }

    private RecommendationItemVO toItemVO(ScoredProduct scored) {
        RecommendationCandidate product = scored.product();
        return RecommendationItemVO.builder()
                .productId(product.getId())
                .name(product.getName())
                .imageUrl(product.getImageUrl())
                .category(product.getCategory())
                .price(product.getPrice())
                .originalPrice(product.getOriginalPrice())
                .priceBand(product.priceBand())
                .occasionTags(product.getOccasionTags())
                .festivalTags(product.getFestivalTags())
                .seasonLabel(product.getSeason() == null ? null : product.getSeason().getLabel())
                .salesCount(product.getSalesCount())
                .ratingAvg(product.getRatingAvg())
                .ratingCount(product.getRatingCount())
                .score(scored.finalScore())
                .contentSimilarity(scored.contentSimilarity())
                .popularityScore(scored.popularityScore())
                .festivalSeasonScore(scored.festivalSeasonScore())
                .ratingScore(scored.ratingScore())
                .reason(scored.reason())
                .matchedTags(scored.matchedTags())
                .build();
    }

    private void saveLog(Long userId, RecommendationResponse response, RecommendationResult result) {
        try {
            RecommendationLog logEntity = new RecommendationLog();
            logEntity.setUserId(userId);
            logEntity.setScene(result.context().scene());
            logEntity.setFestival(result.context().festival());
            logEntity.setSeason(result.context().season().name());
            logEntity.setColdStart(result.coldStart() ? 1 : 0);
            logEntity.setWeightsJson(objectMapper.writeValueAsString(response.getWeights()));
            logEntity.setProductIds(result.items().stream()
                    .map(item -> String.valueOf(item.product().getId()))
                    .collect(Collectors.joining(",")));
            List<Map<String, Object>> detail = result.items().stream().map(item -> {
                Map<String, Object> map = new LinkedHashMap<>();
                map.put("productId", item.product().getId());
                map.put("score", item.finalScore());
                map.put("content", item.contentSimilarity());
                map.put("popularity", item.popularityScore());
                map.put("festivalSeason", item.festivalSeasonScore());
                map.put("rating", item.ratingScore());
                map.put("reason", item.reason());
                return map;
            }).toList();
            logEntity.setDetailJson(objectMapper.writeValueAsString(detail));
            logMapper.insert(logEntity);
        } catch (Exception exception) {
            log.warn("推荐日志写入失败: {}", exception.getMessage());
        }
    }

    private RecommendationWeight getOrCreateWeights() {
        RecommendationWeight weight = weightMapper.selectById(WEIGHT_ID);
        if (weight != null) {
            return weight;
        }
        RecommendationWeight created = new RecommendationWeight();
        created.setId(WEIGHT_ID);
        created.setContentWeight(BigDecimal.valueOf(0.400));
        created.setPopularityWeight(BigDecimal.valueOf(0.200));
        created.setFestivalWeight(BigDecimal.valueOf(0.250));
        created.setRatingWeight(BigDecimal.valueOf(0.150));
        try {
            weightMapper.insert(created);
            return weightMapper.selectById(WEIGHT_ID);
        } catch (DuplicateKeyException exception) {
            return weightMapper.selectById(WEIGHT_ID);
        }
    }

    private double round4(double value) {
        return Math.round(value * 10000.0) / 10000.0;
    }

    private record PersonaDefinition(String name, String description, UserBehaviorData behavior,
                                     RecommendationContext context,
                                     Predicate<RecommendationCandidate> relevance) {
    }
}
