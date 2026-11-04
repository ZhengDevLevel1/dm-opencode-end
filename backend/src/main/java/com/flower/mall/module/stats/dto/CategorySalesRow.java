package com.flower.mall.module.stats.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class CategorySalesRow {

    private String category;
    private BigDecimal amount;
    private long quantity;
}
