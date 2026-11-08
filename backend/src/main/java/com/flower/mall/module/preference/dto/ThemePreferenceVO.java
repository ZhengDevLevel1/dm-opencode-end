package com.flower.mall.module.preference.dto;

import com.flower.mall.module.preference.entity.UserThemePreference;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ThemePreferenceVO {

    private String mode;
    private String palette;
    private String accent;
    private String customAccent;
    private String radius;
    private String density;
    private String sidebarStyle;
    private Double scale;
    private Boolean reduceMotion;
    private Boolean highContrast;
    private String background;
    private String backgroundImage;
    private Double backgroundOpacity;
    private Integer backgroundBlur;
    private Double componentOpacity;
    private Boolean sidebarPinned;
    private LocalDateTime updatedAt;

    public static ThemePreferenceVO from(UserThemePreference entity) {
        return ThemePreferenceVO.builder()
                .mode(valueOr(entity.getMode(), "system"))
                .palette(valueOr(entity.getPalette(), "default"))
                .accent(valueOr(entity.getAccent(), "sky"))
                .customAccent(valueOr(entity.getCustomAccent(), "#38bdf8"))
                .radius(valueOr(entity.getRadius(), "default"))
                .density(valueOr(entity.getDensity(), "comfortable"))
                .sidebarStyle(valueOr(entity.getSidebarStyle(), "follow"))
                .scale(entity.getScale() == null ? 1.0 : entity.getScale())
                .reduceMotion(Boolean.TRUE.equals(entity.getReduceMotion()))
                .highContrast(Boolean.TRUE.equals(entity.getHighContrast()))
                .background(valueOr(entity.getBackground(), "solid"))
                .backgroundImage(entity.getBackgroundImage())
                .backgroundOpacity(entity.getBackgroundOpacity() == null ? 0.82 : entity.getBackgroundOpacity())
                .backgroundBlur(entity.getBackgroundBlur() == null ? 0 : entity.getBackgroundBlur())
                .componentOpacity(entity.getComponentOpacity() == null ? 1.0 : entity.getComponentOpacity())
                .sidebarPinned(Boolean.TRUE.equals(entity.getSidebarPinned()))
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private static String valueOr(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
