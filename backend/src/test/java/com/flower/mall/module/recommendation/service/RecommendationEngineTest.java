package com.flower.mall.module.recommendation.service;

import com.flower.mall.common.enums.SeasonSuitability;
import com.flower.mall.module.recommendation.model.RecommendationCandidate;
import com.flower.mall.module.recommendation.model.RecommendationContext;
import com.flower.mall.module.recommendation.model.RecommendationResult;
import com.flower.mall.module.recommendation.model.RecommendationWeights;
import com.flower.mall.module.recommendation.model.ScoredProduct;
import com.flower.mall.module.recommendation.model.UserBehaviorData;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RecommendationEngineTest {

    private final RecommendationEngine engine = new RecommendationEngine();

    @Test
    void coldStartPrefersFestivalAndSeasonMatchedProduct() {
        List<RecommendationCandidate> products = List.of(
                product(1, "红玫瑰花束", "玫瑰", "热烈爱情", List.of("表白", "纪念日"),
                        List.of("情人节", "七夕"), SeasonSuitability.ALL, "199.00", 320, "4.80", 86),
                product(3, "粉色康乃馨", "康乃馨", "感恩母爱", List.of("母亲节", "教师节"),
                        List.of("母亲节", "教师节"), SeasonSuitability.SPRING, "129.00", 210, "4.70", 55),
                product(7, "混搭礼盒", "混合花束", "温暖祝福", List.of("生日", "日常"),
                        List.of(), SeasonSuitability.ALL, "189.00", 260, "4.70", 62),
                product(9, "绿色盆栽", "绿植", "生机陪伴", List.of("日常", "办公"),
                        List.of(), SeasonSuitability.ALL, "49.00", 400, "4.40", 70));

        RecommendationResult result = engine.recommend(products, UserBehaviorData.empty(),
                RecommendationContext.of(SeasonSuitability.SPRING, "母亲节", "home"),
                RecommendationWeights.DEFAULT, 20, 4);

        assertThat(result.coldStart()).isTrue();
        assertThat(result.items()).isNotEmpty();
        assertThat(result.items().get(0).product().getId()).isEqualTo(3L);
        assertThat(result.items().get(0).reason()).contains("冷启动");
        assertThat(result.items().get(0).matchedTags()).contains("母亲节");
        assertThat(result.weights().sum()).isCloseTo(1.0, within());
    }

    @Test
    void behaviorProfileRanksSameCategoryAboveUnrelatedProduct() {
        RecommendationCandidate rose = product(1, "红玫瑰花束", "玫瑰", "热烈爱情",
                List.of("表白", "纪念日"), List.of("情人节"), SeasonSuitability.ALL,
                "199.00", 320, "4.80", 86);
        List<RecommendationCandidate> products = List.of(
                rose,
                product(2, "香槟玫瑰", "玫瑰", "天长地久", List.of("求婚", "纪念日"),
                        List.of("情人节"), SeasonSuitability.ALL, "599.00", 96, "4.90", 30),
                product(3, "粉色康乃馨", "康乃馨", "感恩母爱", List.of("母亲节"),
                        List.of("母亲节"), SeasonSuitability.SPRING, "129.00", 210, "4.70", 55),
                product(9, "绿色盆栽", "绿植", "生机陪伴", List.of("日常"),
                        List.of(), SeasonSuitability.ALL, "49.00", 400, "4.40", 70));
        UserBehaviorData behavior = UserBehaviorData.builder()
                .purchases(List.of(new UserBehaviorData.PurchasedProduct(rose, 3)))
                .favorites(List.of(rose))
                .reviews(List.of(new UserBehaviorData.ReviewedProduct(rose, 5)))
                .purchaseFrequency(2)
                .averageRating(5)
                .build();

        RecommendationResult result = engine.recommend(products, behavior,
                RecommendationContext.of(SeasonSuitability.SUMMER, null, "home"),
                RecommendationWeights.DEFAULT, 20, 4);

        assertThat(result.coldStart()).isFalse();
        assertThat(result.items().get(0).product().getCategory()).isEqualTo("玫瑰");
        ScoredProduct top = result.items().get(0);
        ScoredProduct green = result.items().stream()
                .filter(item -> item.product().getId().equals(9L))
                .findFirst().orElseThrow();
        assertThat(top.finalScore()).isGreaterThan(green.finalScore());
        assertThat(top.finalScore()).isBetween(0.0, 1.0);
    }

    @Test
    void weightsAreNormalizedAndScoresStayBounded() {
        RecommendationResult result = engine.recommend(
                List.of(product(1, "红玫瑰", "玫瑰", "热烈爱情", List.of("表白"),
                        List.of("情人节"), SeasonSuitability.ALL, "199.00", 100, "4.60", 20)),
                UserBehaviorData.empty(),
                RecommendationContext.of(SeasonSuitability.WINTER, "春节", "home"),
                new RecommendationWeights(2, 2, 2, 2), 10, 5);

        assertThat(result.weights().content()).isCloseTo(0.25, within());
        assertThat(result.weights().sum()).isCloseTo(1.0, within());
        assertThat(result.items()).hasSize(1);
        assertThat(result.items().get(0).finalScore()).isBetween(0.0, 1.0);
    }

    @Test
    void allSeasonProductsMatchEverySeasonContext() {
        RecommendationCandidate rose = product(1, "红玫瑰", "玫瑰", "热烈爱情", List.of("表白"),
                List.of(), SeasonSuitability.ALL, "199.00", 100, "4.60", 20);

        RecommendationResult result = engine.recommend(List.of(rose), UserBehaviorData.empty(),
                RecommendationContext.of(SeasonSuitability.AUTUMN, null, "home"),
                RecommendationWeights.DEFAULT, 10, 5);

        assertThat(result.coldStart()).isTrue();
        assertThat(result.items()).hasSize(1);
        assertThat(result.items().get(0).contentSimilarity()).isGreaterThan(0);
        assertThat(result.items().get(0).reason()).contains("冷启动");
    }

    @Test
    void explicitCategoryDistributionWithoutPurchaseHistoryIsUsed() {
        RecommendationCandidate rose = product(1, "红玫瑰", "玫瑰", "热烈爱情", List.of("表白"),
                List.of(), SeasonSuitability.ALL, "199.00", 100, "4.60", 20);
        RecommendationCandidate green = product(9, "绿色盆栽", "绿植", "生机陪伴", List.of("日常"),
                List.of(), SeasonSuitability.ALL, "49.00", 400, "4.40", 70);
        UserBehaviorData behavior = UserBehaviorData.builder()
                .categoryDistribution(Map.of("玫瑰", 1.0))
                .purchaseFrequency(0)
                .averageRating(0)
                .build();

        RecommendationResult result = engine.recommend(List.of(rose, green), behavior,
                RecommendationContext.of(SeasonSuitability.WINTER, null, "home"),
                RecommendationWeights.DEFAULT, 10, 2);

        assertThat(result.coldStart()).isFalse();
        assertThat(result.items().get(0).product().getCategory()).isEqualTo("玫瑰");
    }

    @Test
    void purchaseFrequencyAndAverageRatingIncreaseBehaviorConfidence() {
        RecommendationCandidate rose = product(1, "红玫瑰", "玫瑰", "热烈爱情", List.of("表白"),
                List.of(), SeasonSuitability.ALL, "199.00", 100, "4.60", 20);
        RecommendationCandidate green = product(9, "绿色盆栽", "绿植", "生机陪伴", List.of("日常"),
                List.of("春节"), SeasonSuitability.ALL, "49.00", 400, "4.40", 70);
        RecommendationContext context = RecommendationContext.of(SeasonSuitability.WINTER, "春节", "home");
        UserBehaviorData highConfidence = UserBehaviorData.builder()
                .categoryDistribution(Map.of("玫瑰", 1.0))
                .purchaseFrequency(10)
                .averageRating(5.0)
                .build();
        UserBehaviorData lowConfidence = UserBehaviorData.builder()
                .categoryDistribution(Map.of("玫瑰", 1.0))
                .purchaseFrequency(0)
                .averageRating(0)
                .build();

        RecommendationResult high = engine.recommend(List.of(rose, green), highConfidence,
                context, new RecommendationWeights(1, 0, 0, 0), 10, 2);
        RecommendationResult low = engine.recommend(List.of(rose, green), lowConfidence,
                context, new RecommendationWeights(1, 0, 0, 0), 10, 2);

        ScoredProduct highRose = high.items().stream()
                .filter(item -> item.product().getId().equals(1L))
                .findFirst().orElseThrow();
        ScoredProduct lowRose = low.items().stream()
                .filter(item -> item.product().getId().equals(1L))
                .findFirst().orElseThrow();
        assertThat(highRose.contentSimilarity()).isGreaterThan(lowRose.contentSimilarity());
        assertThat(highRose.finalScore()).isGreaterThan(lowRose.finalScore());
    }

    @Test
    void emptyCandidatesProduceEmptyResult() {
        RecommendationResult result = engine.recommend(List.of(), UserBehaviorData.empty(),
                RecommendationContext.of(SeasonSuitability.SPRING, null, "home"),
                RecommendationWeights.DEFAULT, 10, 10);

        assertThat(result.items()).isEmpty();
        assertThat(result.coldStart()).isTrue();
    }

    private RecommendationCandidate product(long id, String name, String category, String meaning,
                                             List<String> occasions, List<String> festivals,
                                             SeasonSuitability season, String price, int sales,
                                             String rating, int ratingCount) {
        return RecommendationCandidate.builder()
                .id(id)
                .name(name)
                .category(category)
                .flowerMeaning(meaning)
                .occasionTags(occasions)
                .festivalTags(festivals)
                .season(season)
                .price(new BigDecimal(price))
                .salesCount(sales)
                .ratingAvg(new BigDecimal(rating))
                .ratingCount(ratingCount)
                .build();
    }

    private org.assertj.core.data.Offset<Double> within() {
        return org.assertj.core.data.Offset.offset(1e-6);
    }
}
