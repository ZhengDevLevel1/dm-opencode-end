package com.flower.mall.module.metric.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class MetricConfigRequest {

    @NotNull(message = "平价/中端分界不能为空")
    @DecimalMin(value = "0.01", message = "平价/中端分界必须大于0")
    private BigDecimal priceMidThreshold;

    @NotNull(message = "中端/高端分界不能为空")
    @DecimalMin(value = "0.02", message = "中端/高端分界必须大于0")
    private BigDecimal priceHighThreshold;

    @NotNull(message = "低库存阈值不能为空")
    @Min(value = 1, message = "低库存阈值不能小于1")
    @Max(value = 10000, message = "低库存阈值不能大于10000")
    private Integer stockLowThreshold;

    @NotNull(message = "过量库存阈值不能为空")
    @Min(value = 2, message = "过量库存阈值不能小于2")
    @Max(value = 100000, message = "过量库存阈值不能大于100000")
    private Integer stockHighThreshold;
}
