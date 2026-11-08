package com.flower.mall.module.preference.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ThemePreferenceRequest {

    @NotBlank(message = "显示模式不能为空")
    @Pattern(regexp = "light|dark|system", message = "显示模式不合法")
    private String mode;

    @NotBlank(message = "配色不能为空")
    @Pattern(regexp = "default|rose-pine-dawn|catppuccin-latte|everforest-light|rose-pine",
            message = "配色不合法")
    private String palette;

    @NotBlank(message = "强调色不能为空")
    @Pattern(regexp = "sky|blue|violet|rose|emerald|amber|orange|custom",
            message = "强调色不合法")
    private String accent;

    @NotBlank(message = "自定义强调色不能为空")
    @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "自定义强调色格式不正确")
    private String customAccent;

    @NotBlank(message = "圆角不能为空")
    @Pattern(regexp = "compact|default|comfortable|round", message = "圆角不合法")
    private String radius;

    @NotBlank(message = "密度不能为空")
    @Pattern(regexp = "compact|comfortable", message = "密度不合法")
    private String density;

    @NotBlank(message = "侧栏样式不能为空")
    @Pattern(regexp = "follow|panel|accent", message = "侧栏样式不合法")
    private String sidebarStyle;

    @NotNull(message = "界面缩放不能为空")
    @DecimalMin(value = "0.8", message = "界面缩放不能小于0.8")
    @DecimalMax(value = "1.2", message = "界面缩放不能大于1.2")
    private Double scale;

    @NotNull(message = "减少动效不能为空")
    private Boolean reduceMotion;

    @NotNull(message = "高对比度不能为空")
    private Boolean highContrast;

    @NotBlank(message = "背景类型不能为空")
    @Pattern(regexp = "solid|gradient|image", message = "背景类型不合法")
    private String background;

    @Size(max = 500, message = "背景图片地址不能超过500个字符")
    private String backgroundImage;

    @NotNull(message = "背景遮罩不透明度不能为空")
    @DecimalMin(value = "0", message = "背景遮罩不透明度不能小于0")
    @DecimalMax(value = "1", message = "背景遮罩不透明度不能大于1")
    private Double backgroundOpacity;

    @NotNull(message = "背景模糊不能为空")
    @Min(value = 0, message = "背景模糊不能小于0")
    @Max(value = 30, message = "背景模糊不能大于30")
    private Integer backgroundBlur;

    @NotNull(message = "组件不透明度不能为空")
    @DecimalMin(value = "0", message = "组件不透明度不能小于0")
    @DecimalMax(value = "1", message = "组件不透明度不能大于1")
    private Double componentOpacity;
}
