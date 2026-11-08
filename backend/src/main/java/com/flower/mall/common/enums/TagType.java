package com.flower.mall.common.enums;

public enum TagType {

    CATEGORY("categories", "品类标签"),
    OCCASION("occasions", "场景标签"),
    FESTIVAL("festivals", "节日标签"),
    MEANING("flowerMeanings", "花语标签");

    private final String key;
    private final String label;

    TagType(String key, String label) {
        this.key = key;
        this.label = label;
    }

    public String getKey() {
        return key;
    }

    public String getLabel() {
        return label;
    }

    public static TagType fromValue(String value) {
        for (TagType type : values()) {
            if (type.name().equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("标签类型不合法");
    }
}
