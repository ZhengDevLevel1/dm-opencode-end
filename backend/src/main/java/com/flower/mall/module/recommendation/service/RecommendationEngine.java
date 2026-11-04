package com.flower.mall.module.recommendation.service;

import com.flower.mall.common.enums.SeasonSuitability;
import com.flower.mall.module.recommendation.model.RecommendationCandidate;
import com.flower.mall.module.recommendation.model.RecommendationContext;
import com.flower.mall.module.recommendation.model.RecommendationResult;
import com.flower.mall.module.recommendation.model.RecommendationWeights;
import com.flower.mall.module.recommendation.model.ScoredProduct;
import com.flower.mall.module.recommendation.model.UserBehaviorData;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 基于内容匹配与多因素加权的混合推荐引擎。
 * 该组件不依赖数据库，便于对推荐相关性、覆盖率和冷启动边界进行单元测试。
 */
@Component
public class RecommendationEngine {

    private static final double FESTIVAL_WEIGHT_IN_FIT = 0.65;
    private static final double SEASON_WEIGHT_IN_FIT = 0.35;

    public RecommendationResult recommend(List<RecommendationCandidate> products,
                                          UserBehaviorData behavior,
                                          RecommendationContext context,
                                          RecommendationWeights rawWeights,
                                          int candidateLimit,
                                          int limit) {
        RecommendationWeights weights = rawWeights == null ? RecommendationWeights.DEFAULT : rawWeights.normalized();
        int resultLimit = Math.max(limit, 1);
        if (products == null || products.isEmpty()) {
            return new RecommendationResult(context, weights, true, List.of());
        }
        boolean coldStart = behavior == null || behavior.isEmpty();

        Map<Long, RecommendationCandidate> documentCandidates = new LinkedHashMap<>();
        products.forEach(product -> documentCandidates.put(product.getId(), product));
        if (behavior != null) {
            if (behavior.getPurchases() != null) {
                behavior.getPurchases().forEach(purchase ->
                        documentCandidates.putIfAbsent(purchase.product().getId(), purchase.product()));
            }
            if (behavior.getFavorites() != null) {
                behavior.getFavorites().forEach(product ->
                        documentCandidates.putIfAbsent(product.getId(), product));
            }
            if (behavior.getReviews() != null) {
                behavior.getReviews().forEach(review ->
                        documentCandidates.putIfAbsent(review.product().getId(), review.product()));
            }
        }

        Map<Long, Map<String, Integer>> termCounts = new LinkedHashMap<>();
        documentCandidates.forEach((id, candidate) -> termCounts.put(id, buildTermCounts(candidate)));
        Map<String, Double> idf = computeIdf(termCounts);
        Map<Long, Map<String, Double>> vectors = new LinkedHashMap<>();
        termCounts.forEach((id, counts) -> vectors.put(id, toTfIdfVector(counts, idf)));

        Map<String, Double> contextProfile = buildContextVector(context, idf);
        Map<String, Double> profile;
        if (coldStart) {
            profile = contextProfile;
        } else {
            Map<String, Double> behaviorProfile = buildBehaviorVector(behavior, vectors);
            if (behaviorProfile.isEmpty()) {
                profile = contextProfile;
                coldStart = true;
            } else {
                profile = blendBehaviorWithContext(behaviorProfile, contextProfile, behavior);
            }
        }
        Map<String, Double> normalizedProfile = normalize(profile);

        Map<Long, Double> similarities = new LinkedHashMap<>();
        for (RecommendationCandidate product : products) {
            similarities.put(product.getId(), cosine(normalizedProfile,
                    vectors.getOrDefault(product.getId(), Map.of())));
        }

        List<RecommendationCandidate> candidatePool = selectCandidates(
                products, similarities, candidateLimit, resultLimit);
        int maxSales = products.stream().mapToInt(RecommendationCandidate::getSalesCount).max().orElse(0);
        List<ScoredProduct> scored = new ArrayList<>();
        for (RecommendationCandidate product : candidatePool) {
            double contentScore = similarities.getOrDefault(product.getId(), 0.0);
            double popularityScore = popularity(product.getSalesCount(), maxSales);
            double festivalSeasonScore = festivalSeasonFit(product, context);
            double ratingScore = ratingScore(product);
            double finalScore = weights.content() * contentScore
                    + weights.popularity() * popularityScore
                    + weights.festival() * festivalSeasonScore
                    + weights.rating() * ratingScore;
            List<String> matchedTags = matchedTags(normalizedProfile, termCounts.get(product.getId()));
            String reason = buildReason(product, context, coldStart, matchedTags, popularityScore, ratingScore);
            scored.add(new ScoredProduct(product, round4(contentScore), round4(popularityScore),
                    round4(festivalSeasonScore), round4(ratingScore), round4(finalScore),
                    reason, matchedTags));
        }
        scored.sort(Comparator.comparingDouble(ScoredProduct::finalScore).reversed()
                .thenComparing(Comparator.comparingInt((ScoredProduct item) -> item.product().getSalesCount()).reversed())
                .thenComparing(item -> item.product().getId()));
        if (scored.size() > resultLimit) {
            scored = new ArrayList<>(scored.subList(0, resultLimit));
        }
        return new RecommendationResult(context, weights, coldStart, scored);
    }

    private Map<String, Integer> buildTermCounts(RecommendationCandidate product) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        addTerm(counts, "cat:" + product.getCategory(), 3);
        addTerm(counts, "price:" + product.priceBand(), 1);
        if (product.getSeason() != null) {
            if (product.getSeason() == SeasonSuitability.ALL) {
                for (SeasonSuitability season : SeasonSuitability.values()) {
                    if (season != SeasonSuitability.ALL) {
                        addTerm(counts, "season:" + season.name(), 1);
                    }
                }
            } else {
                addTerm(counts, "season:" + product.getSeason().name(), 1);
            }
        }
        for (String occasion : product.getOccasionTags()) {
            addTerm(counts, "occ:" + occasion, 2);
        }
        for (String festival : product.getFestivalTags()) {
            addTerm(counts, "fest:" + festival, 2);
        }
        for (String segment : TagUtilsCompat.splitMeaning(product.getFlowerMeaning())) {
            addTerm(counts, "mean:" + segment, 1);
            if (segment.length() > 2) {
                for (int i = 0; i + 2 <= segment.length(); i++) {
                    String bigram = segment.substring(i, i + 2);
                    if (!bigram.isBlank()) {
                        addTerm(counts, "mean:" + bigram, 1);
                    }
                }
            }
        }
        return counts;
    }

    private void addTerm(Map<String, Integer> counts, String term, int weight) {
        counts.merge(term, weight, Integer::sum);
    }

    private Map<String, Double> computeIdf(Map<Long, Map<String, Integer>> documents) {
        int documentCount = documents.size();
        Map<String, Integer> documentFrequency = new LinkedHashMap<>();
        for (Map<String, Integer> document : documents.values()) {
            for (String term : document.keySet()) {
                documentFrequency.merge(term, 1, Integer::sum);
            }
        }
        Map<String, Double> idf = new LinkedHashMap<>();
        documentFrequency.forEach((term, frequency) ->
                idf.put(term, Math.log((documentCount + 1.0) / (frequency + 1.0)) + 1.0));
        return idf;
    }

    private Map<String, Double> toTfIdfVector(Map<String, Integer> counts, Map<String, Double> idf) {
        Map<String, Double> vector = new LinkedHashMap<>();
        counts.forEach((term, count) -> {
            double tf = 1.0 + Math.log(count);
            vector.put(term, tf * idf.getOrDefault(term, 1.0));
        });
        return normalize(vector);
    }

    private Map<String, Double> buildBehaviorVector(UserBehaviorData behavior,
                                                    Map<Long, Map<String, Double>> vectors) {
        Map<String, Double> profile = new LinkedHashMap<>();
        if (behavior == null) {
            return profile;
        }
        if (behavior.getPurchases() != null) {
            for (UserBehaviorData.PurchasedProduct purchase : behavior.getPurchases()) {
                double weight = 2.0 * Math.min(Math.max(purchase.quantity(), 1), 5);
                mergeVector(profile, vectors.get(purchase.product().getId()), weight);
            }
        }
        if (behavior.getFavorites() != null) {
            for (RecommendationCandidate favorite : behavior.getFavorites()) {
                mergeVector(profile, vectors.get(favorite.getId()), 1.5);
            }
        }
        if (behavior.getReviews() != null) {
            for (UserBehaviorData.ReviewedProduct review : behavior.getReviews()) {
                double weight = 1.2 * (Math.max(Math.min(review.rating(), 5), 1) / 5.0);
                mergeVector(profile, vectors.get(review.product().getId()), weight);
            }
        }
        if (behavior.getCategoryDistribution() != null) {
            behavior.getCategoryDistribution().forEach((category, share) ->
                    profile.merge("cat:" + category, 4.0 * Math.max(share, 0), Double::sum));
        }
        if (behavior.getFavoriteTags() != null) {
            behavior.getFavoriteTags().forEach(tag -> profile.merge(tag, 1.5, Double::sum));
        }
        return normalize(profile);
    }

    private Map<String, Double> blendBehaviorWithContext(Map<String, Double> behaviorProfile,
                                                         Map<String, Double> contextProfile,
                                                         UserBehaviorData behavior) {
        double frequency = Math.min(Math.max(behavior.getPurchaseFrequency(), 0), 10) / 10.0;
        double rating = behavior.getAverageRating() > 0
                ? Math.min(behavior.getAverageRating(), 5.0) / 5.0
                : 0.5;
        double confidence = Math.max(0.55, Math.min(0.90, 0.55 + 0.20 * frequency + 0.15 * rating));
        Map<String, Double> combined = new LinkedHashMap<>();
        mergeVector(combined, behaviorProfile, confidence);
        mergeVector(combined, contextProfile, 1.0 - confidence);
        return normalize(combined);
    }

    private void mergeVector(Map<String, Double> target, Map<String, Double> source, double weight) {
        if (source == null) {
            return;
        }
        source.forEach((term, value) -> target.merge(term, value * weight, Double::sum));
    }

    private Map<String, Double> buildContextVector(RecommendationContext context, Map<String, Double> idf) {
        Map<String, Double> vector = new LinkedHashMap<>();
        if (context.season() != null) {
            String seasonTerm = "season:" + context.season().name();
            vector.merge(seasonTerm, idf.getOrDefault(seasonTerm, 1.0), Double::sum);
        }
        if (context.festival() != null) {
            String festivalTerm = "fest:" + context.festival();
            vector.merge(festivalTerm, idf.getOrDefault(festivalTerm, 1.0) * 1.5, Double::sum);
        }
        return normalize(vector);
    }

    private Map<String, Double> normalize(Map<String, Double> vector) {
        double norm = Math.sqrt(vector.values().stream().mapToDouble(value -> value * value).sum());
        if (norm == 0) {
            return Map.of();
        }
        Map<String, Double> normalized = new LinkedHashMap<>();
        vector.forEach((term, value) -> normalized.put(term, value / norm));
        return normalized;
    }

    private double cosine(Map<String, Double> left, Map<String, Double> right) {
        if (left.isEmpty() || right.isEmpty()) {
            return 0;
        }
        Map<String, Double> smaller = left.size() <= right.size() ? left : right;
        Map<String, Double> larger = left.size() <= right.size() ? right : left;
        double dot = 0;
        for (Map.Entry<String, Double> entry : smaller.entrySet()) {
            Double value = larger.get(entry.getKey());
            if (value != null) {
                dot += entry.getValue() * value;
            }
        }
        return Math.max(0, Math.min(1, dot));
    }

    private List<RecommendationCandidate> selectCandidates(List<RecommendationCandidate> products,
                                                            Map<Long, Double> similarities,
                                                            int candidateLimit,
                                                            int resultLimit) {
        List<RecommendationCandidate> bySimilarity = products.stream()
                .sorted(Comparator.comparingDouble((RecommendationCandidate product) ->
                                similarities.getOrDefault(product.getId(), 0.0)).reversed()
                        .thenComparing(Comparator.comparingInt(RecommendationCandidate::getSalesCount).reversed()))
                .filter(product -> similarities.getOrDefault(product.getId(), 0.0) > 0)
                .limit(Math.max(candidateLimit, resultLimit))
                .toList();
        List<RecommendationCandidate> selected = new ArrayList<>(bySimilarity);
        if (selected.size() < Math.min(resultLimit, products.size())) {
            Set<Long> selectedIds = selected.stream().map(RecommendationCandidate::getId)
                    .collect(Collectors.toCollection(LinkedHashSet::new));
            products.stream()
                    .sorted(Comparator.comparingInt(RecommendationCandidate::getSalesCount).reversed()
                            .thenComparing(RecommendationCandidate::getId))
                    .filter(product -> !selectedIds.contains(product.getId()))
                    .limit((long) Math.max(candidateLimit, resultLimit) - selected.size())
                    .forEach(selected::add);
        }
        return selected;
    }

    private double popularity(int salesCount, int maxSales) {
        if (salesCount <= 0 || maxSales <= 0) {
            return 0;
        }
        return Math.min(1, Math.log1p(salesCount) / Math.log1p(maxSales));
    }

    private double festivalSeasonFit(RecommendationCandidate product, RecommendationContext context) {
        double festivalFit;
        if (context.festival() == null) {
            festivalFit = 0.5;
        } else {
            festivalFit = product.matchesFestival(context.festival()) ? 1.0 : 0.2;
        }
        double seasonFit = seasonFit(product.getSeason(), context.season());
        return FESTIVAL_WEIGHT_IN_FIT * festivalFit + SEASON_WEIGHT_IN_FIT * seasonFit;
    }

    private double seasonFit(SeasonSuitability productSeason, SeasonSuitability currentSeason) {
        if (productSeason == null || currentSeason == null) {
            return 0.5;
        }
        if (productSeason == SeasonSuitability.ALL || productSeason == currentSeason) {
            return 1.0;
        }
        int productIndex = productSeason.ordinal();
        int currentIndex = currentSeason.ordinal();
        int distance = Math.abs(productIndex - currentIndex);
        return distance == 1 || distance == 3 ? 0.6 : 0.3;
    }

    private double ratingScore(RecommendationCandidate product) {
        if (product.getRatingCount() <= 0 || product.getRatingAvg() == null) {
            return 0.5;
        }
        return Math.max(0, Math.min(1, product.getRatingAvg().doubleValue() / 5.0));
    }

    private List<String> matchedTags(Map<String, Double> profile, Map<String, Integer> productTerms) {
        if (productTerms == null || productTerms.isEmpty()) {
            return List.of();
        }
        Set<String> labels = new LinkedHashSet<>();
        profile.entrySet().stream()
                .filter(entry -> productTerms.containsKey(entry.getKey()))
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .forEach(entry -> {
                    String label = displayLabel(entry.getKey());
                    if (label != null) {
                        labels.add(label);
                    }
                });
        return labels.stream().limit(3).toList();
    }

    private String displayLabel(String term) {
        int separator = term.indexOf(':');
        if (separator <= 0 || separator == term.length() - 1) {
            return null;
        }
        String type = term.substring(0, separator);
        String value = term.substring(separator + 1);
        return switch (type) {
            case "cat", "occ", "fest" -> value;
            case "price" -> value + "价位";
            default -> null;
        };
    }

    private String buildReason(RecommendationCandidate product, RecommendationContext context,
                               boolean coldStart, List<String> matchedTags,
                               double popularityScore, double ratingScore) {
        List<String> parts = new ArrayList<>();
        if (coldStart) {
            if (context.festival() != null) {
                parts.add("新用户冷启动：结合" + context.festival() + "节日与"
                        + context.season().getLabel() + "时令推荐");
            } else {
                parts.add("新用户冷启动：优先推荐" + context.season().getLabel() + "热销鲜花");
            }
            if (popularityScore >= 0.75) {
                parts.add("热销商品，已售" + product.getSalesCount() + "件");
            }
            if (product.getRatingCount() > 0 && ratingScore >= 0.9) {
                parts.add("综合评分" + product.getRatingAvg().setScale(1, java.math.RoundingMode.HALF_UP) + "分");
            }
        } else {
            if (!matchedTags.isEmpty()) {
                parts.add("与你近期偏好的「" + String.join("、", matchedTags) + "」相符");
            }
            if (context.festival() != null && product.matchesFestival(context.festival())) {
                parts.add("契合" + context.festival() + "节日场景");
            }
            if (product.getSeason() == SeasonSuitability.ALL || product.getSeason() == context.season()) {
                parts.add("适合" + context.season().getLabel() + "观赏");
            }
            if (popularityScore >= 0.75) {
                parts.add("热销商品，已售" + product.getSalesCount() + "件");
            }
            if (product.getRatingCount() > 0 && ratingScore >= 0.9) {
                parts.add("综合评分" + product.getRatingAvg().setScale(1, java.math.RoundingMode.HALF_UP) + "分");
            }
            if (parts.isEmpty()) {
                parts.add("综合内容相似度、销量与评分推荐");
            }
        }
        return parts.stream().limit(3).collect(Collectors.joining("；"));
    }

    private double round4(double value) {
        return Math.round(value * 10000.0) / 10000.0;
    }

    private static final class TagUtilsCompat {
        private TagUtilsCompat() {
        }

        static List<String> splitMeaning(String meaning) {
            if (meaning == null || meaning.isBlank()) {
                return List.of();
            }
            List<String> segments = new ArrayList<>();
            for (String part : meaning.split("[,，、;；/|\\s]+")) {
                String trimmed = part.trim();
                if (!trimmed.isBlank()) {
                    segments.add(trimmed);
                }
            }
            return segments;
        }
    }
}
