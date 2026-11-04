package com.flower.mall.common.enums;

import lombok.Getter;

@Getter
public enum OrderStatus {

    PENDING_PAYMENT("待支付"),
    PAID("已支付"),
    FULFILLING("履约中"),
    COMPLETED("已完成"),
    CANCELLED("已取消"),
    AFTER_SALE("售后中"),
    REFUNDED("已退款");

    private final String label;

    OrderStatus(String label) {
        this.label = label;
    }

    public boolean isPaid() {
        return this == PAID || this == FULFILLING || this == COMPLETED || this == AFTER_SALE;
    }
}
