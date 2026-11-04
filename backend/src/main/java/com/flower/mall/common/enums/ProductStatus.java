package com.flower.mall.common.enums;

import lombok.Getter;

@Getter
public enum ProductStatus {

    ON_SALE("已上架"),
    OFF_SHELF("已下架");

    private final String label;

    ProductStatus(String label) {
        this.label = label;
    }
}
