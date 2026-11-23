package com.flower.mall.module.product.dto;

import java.util.List;

public record ProductAiCopyUpdate(
        String title,
        String description,
        List<String> tags,
        List<String> sellingPoints,
        boolean applyTitle,
        boolean applyDescription,
        boolean applyTags,
        boolean applySellingPoints
) {
}
