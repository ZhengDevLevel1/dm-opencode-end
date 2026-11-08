package com.flower.mall.module.metric.dto;

import com.flower.mall.module.metric.entity.MetricConfig;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class MetricConfigVO {

    private BigDecimal priceMidThreshold;
    private BigDecimal priceHighThreshold;
    private Integer stockLowThreshold;
    private Integer stockHighThreshold;
    private LocalDateTime updatedAt;

    public static MetricConfigVO from(MetricConfig config) {
        return MetricConfigVO.builder()
                .priceMidThreshold(config.getPriceMidThreshold())
                .priceHighThreshold(config.getPriceHighThreshold())
                .stockLowThreshold(config.getStockLowThreshold())
                .stockHighThreshold(config.getStockHighThreshold())
                .updatedAt(config.getUpdatedAt())
                .build();
    }
}
