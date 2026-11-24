package com.flower.mall.module.ai.support;

import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;

import java.util.Locale;

public enum AiPromptTagCategory {
    SCENE("场景/节日"),
    AUDIENCE("关系/人群"),
    NEED("诉求/痛点");

    private final String label;

    AiPromptTagCategory(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    public static AiPromptTagCategory fromValue(String value) {
        if (value == null || value.isBlank()) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "标签分类不能为空");
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if ("场景/节日".equals(value.trim())) {
            return SCENE;
        }
        if ("关系/人群".equals(value.trim())) {
            return AUDIENCE;
        }
        if ("诉求/痛点".equals(value.trim())) {
            return NEED;
        }
        try {
            return valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "标签分类不合法");
        }
    }
}
