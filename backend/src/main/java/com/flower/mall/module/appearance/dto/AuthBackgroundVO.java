package com.flower.mall.module.appearance.dto;

import com.flower.mall.module.appearance.entity.AppearanceSetting;
import lombok.Data;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.Locale;

@Data
public class AuthBackgroundVO {

    /** 默认遮罩不透明度 */
    public static final double DEFAULT_OPACITY = 0.78;
    /** 默认背景模糊（px） */
    public static final int DEFAULT_BLUR = 0;
    /** 默认组件不透明度 */
    public static final double DEFAULT_COMPONENT_OPACITY = 1.0;
    /** 默认表面配色 */
    public static final String DEFAULT_PALETTE = "default";
    /** 默认强调色 */
    public static final String DEFAULT_ACCENT = "sky";
    /** 默认自定义强调色 */
    public static final String DEFAULT_CUSTOM_ACCENT = "#38bdf8";
    /** 默认字体风格 */
    public static final String DEFAULT_FONT_FAMILY = "default";
    /** 默认字体大小（px） */
    public static final double DEFAULT_FONT_SIZE = 14.0;

    /** NONE / GRADIENT / IMAGE */
    private String backgroundType;

    private String imageUrl;

    private Double backgroundOpacity;

    private Integer backgroundBlur;

    private Double componentOpacity;

    /** 登录页表面配色 */
    private String palette;

    /** 登录页强调色 */
    private String accent;

    /** 自定义强调色，#RRGGBB */
    private String customAccent;

    /** 登录页字体风格 */
    private String fontFamily;

    /** 登录页字体大小（px） */
    private Double fontSize;

    private LocalDateTime updatedAt;

    public static AuthBackgroundVO from(AppearanceSetting setting) {
        AuthBackgroundVO vo = new AuthBackgroundVO();
        vo.setBackgroundType("NONE");
        vo.setBackgroundOpacity(DEFAULT_OPACITY);
        vo.setBackgroundBlur(DEFAULT_BLUR);
        vo.setComponentOpacity(DEFAULT_COMPONENT_OPACITY);
        vo.setPalette(DEFAULT_PALETTE);
        vo.setAccent(DEFAULT_ACCENT);
        vo.setCustomAccent(DEFAULT_CUSTOM_ACCENT);
        vo.setFontFamily(DEFAULT_FONT_FAMILY);
        vo.setFontSize(DEFAULT_FONT_SIZE);
        if (setting != null) {
            vo.setImageUrl(setting.getAuthBackgroundImage());
            vo.setUpdatedAt(setting.getUpdatedAt());
            vo.setBackgroundType(resolveType(setting.getBackgroundType(), setting.getAuthBackgroundImage()));
            if (setting.getBackgroundOpacity() != null) {
                vo.setBackgroundOpacity(setting.getBackgroundOpacity());
            }
            if (setting.getBackgroundBlur() != null) {
                vo.setBackgroundBlur(setting.getBackgroundBlur());
            }
            if (setting.getComponentOpacity() != null) {
                vo.setComponentOpacity(setting.getComponentOpacity());
            }
            if (StringUtils.hasText(setting.getAuthPalette())) {
                vo.setPalette(setting.getAuthPalette());
            }
            if (StringUtils.hasText(setting.getAuthAccent())) {
                vo.setAccent(setting.getAuthAccent());
            }
            if (StringUtils.hasText(setting.getAuthCustomAccent())) {
                vo.setCustomAccent(setting.getAuthCustomAccent());
            }
            if (StringUtils.hasText(setting.getAuthFontFamily())) {
                vo.setFontFamily(normalizeFontFamily(setting.getAuthFontFamily()));
            }
            if (setting.getAuthFontSize() != null) {
                vo.setFontSize(setting.getAuthFontSize());
            }
        }
        return vo;
    }

    /** 兼容早期没有类型字段的数据：有图片即视为 IMAGE。 */
    private static String resolveType(String type, String imageUrl) {
        if (StringUtils.hasText(type)) {
            return type.toUpperCase();
        }
        return StringUtils.hasText(imageUrl) ? "IMAGE" : "NONE";
    }

    /** 把历史六字体值归并到当前四种系统字体。 */
    private static String normalizeFontFamily(String value) {
        return switch (value.toLowerCase(Locale.ROOT)) {
            case "default" -> "default";
            case "serif" -> "serif";
            case "rounded", "round" -> "rounded";
            case "kai", "hand" -> "kai";
            case "decol" -> "serif";
            case "sans", "pixel" -> DEFAULT_FONT_FAMILY;
            default -> DEFAULT_FONT_FAMILY;
        };
    }
}
