package com.flower.mall.module.stats.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class SalesTrendRow {

    private LocalDate statDate;
    private BigDecimal amount;
    private long orderCount;
}
