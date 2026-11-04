package com.flower.mall.module.recommendation.model;

import java.util.Arrays;
import java.util.List;

public final class TagUtils {

    private TagUtils() {
    }

    public static List<String> splitTags(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split("[,，、;；/|\\s]+"))
                .map(String::trim)
                .filter(tag -> !tag.isBlank())
                .distinct()
                .toList();
    }
}
