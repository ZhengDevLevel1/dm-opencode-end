package com.flower.mall.common.enums;

import lombok.Getter;

@Getter
public enum UserStatus {

    ENABLED("正常"),
    DISABLED("禁用");

    private final String label;

    UserStatus(String label) {
        this.label = label;
    }
}
