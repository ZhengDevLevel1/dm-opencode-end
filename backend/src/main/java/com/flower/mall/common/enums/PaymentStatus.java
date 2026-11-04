package com.flower.mall.common.enums;

import lombok.Getter;

@Getter
public enum PaymentStatus {

    PENDING("待支付"),
    SUCCESS("支付成功"),
    FAILED("支付失败"),
    REFUNDED("已退款");

    private final String label;

    PaymentStatus(String label) {
        this.label = label;
    }
}
