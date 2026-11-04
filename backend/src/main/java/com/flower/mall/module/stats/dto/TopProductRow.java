package com.flower.mall.module.stats.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class TopProductRow {

    private Long productId;
    private String productName;
    private long quantity;
    private BigDecimal amount;
}
