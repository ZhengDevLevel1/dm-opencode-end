package com.flower.mall.module.stats.dto;

import lombok.Data;

@Data
public class OrderStatusRow {

    private String status;
    private long orderCount;
}
