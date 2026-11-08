package com.flower.mall.module.dict.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.common.enums.FulfillmentNode;
import com.flower.mall.common.enums.InventoryChangeType;
import com.flower.mall.common.enums.OrderStatus;
import com.flower.mall.common.enums.PaymentStatus;
import com.flower.mall.common.enums.ReviewStatus;
import com.flower.mall.common.enums.SeasonSuitability;
import com.flower.mall.common.enums.TagType;
import com.flower.mall.common.enums.UserRole;
import com.flower.mall.module.metric.service.MetricConfigService;
import com.flower.mall.module.tag.service.TagService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "数据字典")
@RestController
@RequestMapping("/api/dict")
@RequiredArgsConstructor
public class DictController {

    private static final List<String> CATEGORIES = List.of(
            "玫瑰", "百合", "康乃馨", "向日葵", "郁金香", "混合花束",
            "永生花", "绿植", "满天星", "礼盒");
    private static final List<String> PRICE_BANDS = List.of("平价", "中端", "高端");

    private final TagService tagService;
    private final MetricConfigService metricConfigService;

    @Operation(summary = "获取全部枚举字典")
    @GetMapping("/options")
    public ApiResponse<Map<String, Object>> options() {
        Map<String, Object> options = new LinkedHashMap<>();
        options.put("categories", CATEGORIES);
        options.put("occasions", tagService.names(TagType.OCCASION));
        options.put("festivals", tagService.names(TagType.FESTIVAL));
        options.put("flowerMeanings", tagService.names(TagType.MEANING));
        options.put("tagMaxCounts", Map.of(
                "occasions", tagService.maxCount(TagType.OCCASION),
                "festivals", tagService.maxCount(TagType.FESTIVAL),
                "flowerMeanings", tagService.maxCount(TagType.MEANING)));
        options.put("priceBands", PRICE_BANDS);
        options.put("metrics", metricConfigService.get());
        options.put("seasons", options(SeasonSuitability.values(),
                SeasonSuitability::name, SeasonSuitability::getLabel));
        options.put("roles", options(UserRole.values(), UserRole::name, UserRole::getLabel));
        options.put("orderStatuses", options(OrderStatus.values(), OrderStatus::name, OrderStatus::getLabel));
        options.put("paymentStatuses", options(PaymentStatus.values(), PaymentStatus::name, PaymentStatus::getLabel));
        options.put("reviewStatuses", options(ReviewStatus.values(), ReviewStatus::name, ReviewStatus::getLabel));
        options.put("fulfillmentNodes", options(FulfillmentNode.values(),
                FulfillmentNode::name, FulfillmentNode::getLabel));
        options.put("inventoryChangeTypes", options(InventoryChangeType.values(),
                InventoryChangeType::name, InventoryChangeType::getLabel));
        return ApiResponse.ok(options);
    }

    private <T> List<Map<String, String>> options(T[] values,
                                                  java.util.function.Function<T, String> valueMapper,
                                                  java.util.function.Function<T, String> labelMapper) {
        return Arrays.stream(values).map(value -> {
            Map<String, String> option = new LinkedHashMap<>();
            option.put("value", valueMapper.apply(value));
            option.put("label", labelMapper.apply(value));
            return option;
        }).toList();
    }
}
