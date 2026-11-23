package com.flower.mall.module.cart.dto;

import lombok.Data;

@Data
public class CartAttribution {
    private String requestId;
    private String eventId;
    private String scene;
    private Integer position;
    private String strategy;
    private String experimentId;
    private String variant;
}
