package com.flower.mall.common.enums;

import lombok.Getter;

@Getter
public enum UserRole {

    CUSTOMER("消费者/会员"),
    STAFF("店员"),
    ADMIN("运营管理员");

    private final String label;

    UserRole(String label) {
        this.label = label;
    }
}
