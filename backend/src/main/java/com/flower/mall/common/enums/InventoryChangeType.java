package com.flower.mall.common.enums;

import lombok.Getter;

@Getter
public enum InventoryChangeType {

    STOCK_IN("入库"),
    ORDER_DEDUCT("下单扣减"),
    ORDER_CANCEL("取消订单回补"),
    MANUAL_ADJUST("人工调整"),
    AFTER_SALE_RESTORE("售后退款回补");

    private final String label;

    InventoryChangeType(String label) {
        this.label = label;
    }
}
