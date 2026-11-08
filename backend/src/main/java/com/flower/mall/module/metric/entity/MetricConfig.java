package com.flower.mall.module.metric.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("metric_config")
public class MetricConfig {

    @TableId(value = "id", type = IdType.INPUT)
    private Integer id;

    private BigDecimal priceMidThreshold;

    private BigDecimal priceHighThreshold;

    private Integer stockLowThreshold;

    private Integer stockHighThreshold;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
