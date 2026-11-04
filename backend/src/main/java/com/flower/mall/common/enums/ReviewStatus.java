package com.flower.mall.common.enums;

import lombok.Getter;

@Getter
public enum ReviewStatus {

    VISIBLE("显示"),
    HIDDEN("隐藏");

    private final String label;

    ReviewStatus(String label) {
        this.label = label;
    }
}
