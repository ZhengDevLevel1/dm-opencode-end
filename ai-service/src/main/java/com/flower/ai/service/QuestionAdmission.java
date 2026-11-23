package com.flower.ai.service;

import java.util.Locale;
import java.util.regex.Pattern;

public final class QuestionAdmission {

    private static final int MAX_TAG_LEADING_CHARS = 12;
    private static final int MAX_TAG_PREFIX_CHARS = 64;
    private static final Pattern SIMPLE_ARITHMETIC = Pattern.compile(
            "^\\s*\\d+(?:\\.\\d+)?\\s*[+\\-*/×÷]\\s*\\d+(?:\\.\\d+)?\\s*(?:=|等于|是)?\\s*(?:几|多少)?\\s*[?？]?\\s*$");
    private static final String[] LARGE_OFF_TOPIC_MARKERS = {
            "快速排序", "冒泡排序", "二分查找", "排序算法", "查找算法", "时间复杂度", "空间复杂度",
            "写代码", "代码", "编程", "程序代码", "写程序", "算法题", "python代码", "python程序",
            "java代码", "java程序", "javascript", "typescript", "sql语句", "html代码", "css样式",
            "react组件", "spring boot", "bug", "编译错误",
            "写论文", "写文章", "写报告", "写作业", "论文选题", "论文辅导",
            "翻译成英文", "翻译成英语", "翻译成日文", "长文翻译",
            "法律咨询", "医疗诊断", "投资建议", "股票", "基金", "合同", "税务",
            "数学题", "微积分", "线性代数", "物理题", "化学题", "证明题"
    };

    private QuestionAdmission() {
    }

    public enum Category {
        FLOWER,
        OFF_TOPIC_SMALL,
        OFF_TOPIC_LARGE
    }

    public record Parsed(Category category, String content) {
    }

    public static Parsed parseLeading(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String trimmed = text.stripLeading();
        int tagStart = trimmed.indexOf("[[");
        if (tagStart < 0) {
            return new Parsed(Category.FLOWER, text);
        }
        if (tagStart > MAX_TAG_LEADING_CHARS) {
            return new Parsed(Category.FLOWER, text);
        }
        int tagEnd = trimmed.indexOf("]]", tagStart + 2);
        if (tagEnd < 0) {
            return trimmed.length() <= MAX_TAG_PREFIX_CHARS ? null : new Parsed(Category.FLOWER, text);
        }
        Category category = categoryOf(trimmed.substring(tagStart + 2, tagEnd));
        String content = trimmed.substring(tagEnd + 2).stripLeading();
        return new Parsed(category == null ? Category.FLOWER : category, content);
    }

    public static Category fallbackCategory(String message) {
        if (message == null || message.isBlank()) {
            return Category.FLOWER;
        }
        String trimmed = message.trim();
        if (SIMPLE_ARITHMETIC.matcher(trimmed).matches()) {
            return Category.OFF_TOPIC_SMALL;
        }
        String normalized = trimmed.toLowerCase(Locale.ROOT);
        for (String marker : LARGE_OFF_TOPIC_MARKERS) {
            if (normalized.contains(marker)) {
                return Category.OFF_TOPIC_LARGE;
            }
        }
        return Category.FLOWER;
    }

    private static Category categoryOf(String tag) {
        String normalized = tag.trim().toUpperCase(Locale.ROOT)
                .replace('-', '_')
                .replace(' ', '_');
        while (normalized.contains("__")) {
            normalized = normalized.replace("__", "_");
        }
        return switch (normalized) {
            case "FLOWER", "花店", "花店相关" -> Category.FLOWER;
            case "OFF_TOPIC_SMALL", "OFFTOPIC_SMALL", "OFF_TOPIC_LIGHT", "无关但简单" ->
                    Category.OFF_TOPIC_SMALL;
            case "OFF_TOPIC_LARGE", "OFFTOPIC_LARGE", "OFF_TOPIC_HEAVY", "无关且复杂" ->
                    Category.OFF_TOPIC_LARGE;
            default -> null;
        };
    }
}
