package com.flower.mall.common.enums;

import lombok.Getter;

@Getter
public enum SeasonSuitability {

    SPRING("春季"),
    SUMMER("夏季"),
    AUTUMN("秋季"),
    WINTER("冬季"),
    ALL("四季");

    private final String label;

    SeasonSuitability(String label) {
        this.label = label;
    }

    public static SeasonSuitability ofMonth(int month) {
        if (month >= 3 && month <= 5) {
            return SPRING;
        }
        if (month >= 6 && month <= 8) {
            return SUMMER;
        }
        if (month >= 9 && month <= 11) {
            return AUTUMN;
        }
        return WINTER;
    }
}
