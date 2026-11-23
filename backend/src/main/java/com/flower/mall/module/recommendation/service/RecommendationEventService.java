package com.flower.mall.module.recommendation.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.common.util.SecurityUtils;
import com.flower.mall.module.cart.entity.CartItem;
import com.flower.mall.module.order.entity.OrderItem;
import com.flower.mall.module.recommendation.dto.RecommendationEffectVO;
import com.flower.mall.module.recommendation.dto.RecommendationEventBatchRequest;
import com.flower.mall.module.recommendation.dto.RecommendationEventRequest;
import com.flower.mall.module.recommendation.entity.OrderItemAttribution;
import com.flower.mall.module.recommendation.entity.RecommendationEvent;
import com.flower.mall.module.recommendation.entity.UserProductInteraction;
import com.flower.mall.module.recommendation.mapper.OrderItemAttributionMapper;
import com.flower.mall.module.recommendation.mapper.RecommendationEventMapper;
import com.flower.mall.module.recommendation.mapper.UserProductInteractionMapper;
import com.flower.mall.security.AuthUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationEventService {

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "IMPRESSION", "VIEW", "CLICK", "ADD_TO_CART", "ORDER");

    private final RecommendationEventMapper eventMapper;
    private final OrderItemAttributionMapper attributionMapper;
    private final UserProductInteractionMapper interactionMapper;
    private final ObjectMapper objectMapper;

    @Transactional
    public int ingest(RecommendationEventBatchRequest request) {
        AuthUser user = SecurityUtils.currentUserOrNull();
        int accepted = 0;
        for (RecommendationEventRequest item : request.getEvents()) {
            String type = item.getEventType() == null ? "" : item.getEventType().toUpperCase();
            if (!ALLOWED_TYPES.contains(type)) {
                throw BusinessException.of(ErrorCode.RECOMMENDATION_EVENT_INVALID, "不支持的事件类型: " + type);
            }
            if (item.getProductId() == null) {
                throw BusinessException.of(ErrorCode.RECOMMENDATION_EVENT_INVALID, "商品ID不能为空");
            }
            if (item.getRequestId() == null || item.getRequestId().isBlank()) {
                if (!"VIEW".equals(type)) {
                    throw BusinessException.of(ErrorCode.RECOMMENDATION_EVENT_INVALID, "推荐请求ID不能为空");
                }
            }
            if (user == null && (item.getSessionId() == null || item.getSessionId().isBlank())) {
                throw BusinessException.of(ErrorCode.RECOMMENDATION_EVENT_INVALID, "匿名会话ID不能为空");
            }
            RecommendationEvent event = new RecommendationEvent();
            event.setEventId(item.getEventId());
            event.setRequestId(item.getRequestId());
            event.setEventType(type);
            event.setUserId(user == null ? null : user.getId());
            event.setSessionId(item.getSessionId());
            event.setProductId(item.getProductId());
            event.setPosition(item.getPosition());
            event.setScene(item.getScene());
            event.setStrategy(item.getStrategy());
            event.setExperimentId(item.getExperimentId());
            event.setVariant(item.getVariant());
            event.setOccurredAt(item.getOccurredAt() == null ? LocalDateTime.now() : item.getOccurredAt());
            boolean inserted = false;
            try {
                event.setMetadataJson(item.getMetadata() == null ? null : objectMapper.writeValueAsString(item.getMetadata()));
                eventMapper.insert(event);
                accepted++;
                inserted = true;
            } catch (DuplicateKeyException ex) {
                log.debug("Duplicate recommendation event ignored: {}", item.getEventId());
            } catch (Exception ex) {
                throw BusinessException.of(ErrorCode.RECOMMENDATION_EVENT_INVALID, "事件写入失败");
            }
            if (inserted && ("VIEW".equals(type) || "CLICK".equals(type))) {
                recordInteraction(event, item.getMetadata());
            }
        }
        return accepted;
    }

    @Transactional
    public void recordOrder(Long orderId, Long userId, List<OrderItem> orderItems, List<CartItem> cartItems) {
        Map<Long, CartItem> cartByProduct = new LinkedHashMap<>();
        for (CartItem cartItem : cartItems) {
            cartByProduct.put(cartItem.getProductId(), cartItem);
        }
        for (OrderItem orderItem : orderItems) {
            CartItem cartItem = cartByProduct.get(orderItem.getProductId());
            String requestId = cartItem == null ? null : cartItem.getSourceRequestId();
            String eventId = cartItem == null ? null : cartItem.getSourceEventId();
            if (requestId != null || eventId != null) {
                OrderItemAttribution attribution = new OrderItemAttribution();
                attribution.setOrderId(orderId);
                attribution.setOrderItemId(orderItem.getId());
                attribution.setProductId(orderItem.getProductId());
                attribution.setRequestId(requestId);
                attribution.setEventId(eventId);
                attribution.setScene(cartItem.getSourceScene());
                attribution.setStrategy(cartItem.getSourceStrategy());
                attribution.setExperimentId(cartItem.getSourceExperimentId());
                attribution.setVariant(cartItem.getSourceVariant());
                attribution.setAttributedAt(LocalDateTime.now());
                try {
                    attributionMapper.insert(attribution);
                } catch (DuplicateKeyException ignored) {
                    // idempotent order retry
                }
            }
            RecommendationEvent event = new RecommendationEvent();
            event.setEventId("order-" + orderId + "-" + orderItem.getId());
            event.setRequestId(requestId);
            event.setEventType("ORDER");
            event.setUserId(userId);
            event.setProductId(orderItem.getProductId());
            event.setOrderId(orderId);
            event.setScene(cartItem == null ? null : cartItem.getSourceScene());
            event.setStrategy(cartItem == null ? null : cartItem.getSourceStrategy());
            event.setExperimentId(cartItem == null ? null : cartItem.getSourceExperimentId());
            event.setVariant(cartItem == null ? null : cartItem.getSourceVariant());
            event.setOccurredAt(LocalDateTime.now());
            event.setMetadataJson("{\"orderItemId\":" + orderItem.getId() + "}");
            try {
                eventMapper.insert(event);
            } catch (DuplicateKeyException ignored) {
                // idempotent order retry
            }
        }
    }

    public RecommendationEffectVO stats(int days) {
        int safeDays = Math.max(1, Math.min(days, 90));
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(safeDays - 1L);
        List<RecommendationEvent> events = eventMapper.selectList(Wrappers.<RecommendationEvent>lambdaQuery()
                .ge(RecommendationEvent::getOccurredAt, start.atStartOfDay())
                .le(RecommendationEvent::getOccurredAt, end.atTime(23, 59, 59)));

        Counter total = new Counter();
        Map<String, Counter> byScene = new LinkedHashMap<>();
        Map<String, Counter> byVariant = new LinkedHashMap<>();
        Map<LocalDate, Counter> byDay = new LinkedHashMap<>();
        for (RecommendationEvent event : events) {
            total.add(event);
            String scene = event.getScene() == null ? "UNKNOWN" : event.getScene();
            byScene.computeIfAbsent(scene, key -> new Counter()).add(event);
            String variantKey = (event.getExperimentId() == null ? "" : event.getExperimentId())
                    + "|" + (event.getVariant() == null ? "" : event.getVariant());
            if (!variantKey.equals("|")) {
                byVariant.computeIfAbsent(variantKey, key -> new Counter()).add(event);
            }
            LocalDate date = event.getOccurredAt() == null ? end : event.getOccurredAt().toLocalDate();
            byDay.computeIfAbsent(date, key -> new Counter()).add(event);
        }

        List<RecommendationEffectVO.VariantEffect> variants = new ArrayList<>();
        byVariant.forEach((key, counter) -> {
            String[] parts = key.split("\\|", -1);
            variants.add(RecommendationEffectVO.VariantEffect.builder()
                    .experimentId(parts[0])
                    .variant(parts[1])
                    .impressions(counter.impressions.size())
                    .clicks(counter.clicks.size())
                    .orders(counter.orders.size())
                    .ctr(counter.ctr())
                    .cvr(counter.cvr())
                    .build());
        });
        Map<String, RecommendationEffectVO.SceneEffect> scenes = new LinkedHashMap<>();
        byScene.forEach((scene, counter) -> scenes.put(scene, RecommendationEffectVO.SceneEffect.builder()
                .impressions(counter.impressions.size())
                .clicks(counter.clicks.size())
                .addToCarts(counter.addToCarts.size())
                .orders(counter.orders.size())
                .ctr(counter.ctr())
                .cvr(counter.cvr())
                .build()));
        List<RecommendationEffectVO.DailyEffect> daily = new ArrayList<>();
        for (int i = 0; i < safeDays; i++) {
            LocalDate date = start.plusDays(i);
            Counter counter = byDay.getOrDefault(date, new Counter());
            daily.add(RecommendationEffectVO.DailyEffect.builder()
                    .date(date)
                    .impressions(counter.impressions.size())
                    .clicks(counter.clicks.size())
                    .orders(counter.orders.size())
                    .ctr(counter.ctr())
                    .cvr(counter.cvr())
                    .build());
        }
        return RecommendationEffectVO.builder()
                .startDate(start)
                .endDate(end)
                .impressions(total.impressions.size())
                .clicks(total.clicks.size())
                .addToCarts(total.addToCarts.size())
                .orders(total.orders.size())
                .ctr(total.ctr())
                .cvr(total.cvr())
                .addToCartRate(ratio(total.addToCarts.size(), total.clicks.size()))
                .orderRate(ratio(total.orders.size(), total.impressions.size()))
                .byScene(scenes)
                .byVariant(variants)
                .daily(daily)
                .build();
    }

    private void recordInteraction(RecommendationEvent event, Map<String, Object> metadata) {
        String subjectKey = event.getUserId() != null
                ? "u:" + event.getUserId()
                : "s:" + (event.getSessionId() == null ? "anon" : event.getSessionId());
        UserProductInteraction interaction = interactionMapper.selectOne(
                Wrappers.<UserProductInteraction>lambdaQuery()
                        .eq(UserProductInteraction::getSubjectKey, subjectKey)
                        .eq(UserProductInteraction::getProductId, event.getProductId()));
        if (interaction == null) {
            interaction = new UserProductInteraction();
            interaction.setSubjectKey(subjectKey);
            interaction.setUserId(event.getUserId());
            interaction.setSessionId(event.getSessionId());
            interaction.setProductId(event.getProductId());
            interaction.setViewCount(0);
            interaction.setClickCount(0);
            interaction.setTotalDwellMs(0L);
            interaction.setUpdatedAt(LocalDateTime.now());
        }
        if ("VIEW".equals(event.getEventType())) {
            interaction.setViewCount(interaction.getViewCount() + 1);
            interaction.setLastViewedAt(event.getOccurredAt());
            long dwell = metadata == null ? 0 : longValue(metadata.get("dwellMs"));
            interaction.setTotalDwellMs(interaction.getTotalDwellMs() + Math.max(0, dwell));
        } else {
            interaction.setClickCount(interaction.getClickCount() + 1);
            interaction.setLastClickedAt(event.getOccurredAt());
        }
        interaction.setUpdatedAt(LocalDateTime.now());
        if (interaction.getId() == null) {
            interactionMapper.insert(interaction);
        } else {
            interactionMapper.updateById(interaction);
        }
    }

    private static long longValue(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return value == null ? 0 : Long.parseLong(value.toString());
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    private static double ratio(long numerator, long denominator) {
        if (denominator <= 0) {
            return 0;
        }
        return Math.round(numerator * 10000.0 / denominator) / 10000.0;
    }

    private static String subject(RecommendationEvent event) {
        if (event.getUserId() != null) {
            return "u:" + event.getUserId();
        }
        return "s:" + (event.getSessionId() == null ? "anon" : event.getSessionId());
    }

    private static class Counter {
        private final Set<String> impressions = new LinkedHashSet<>();
        private final Set<String> clicks = new LinkedHashSet<>();
        private final Set<String> addToCarts = new LinkedHashSet<>();
        private final Set<String> orders = new LinkedHashSet<>();

        void add(RecommendationEvent event) {
            String key = subject(event) + ":" + event.getProductId();
            switch (event.getEventType()) {
                case "IMPRESSION" -> impressions.add(key);
                case "CLICK" -> clicks.add(key);
                case "ADD_TO_CART" -> addToCarts.add(key);
                case "ORDER" -> orders.add(key);
                default -> {
                }
            }
        }

        double ctr() {
            return ratio(clicks.size(), impressions.size());
        }

        double cvr() {
            return ratio(orders.size(), clicks.size());
        }
    }
}
