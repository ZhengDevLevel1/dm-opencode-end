package com.flower.mall.module.appearance.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AuthBackgroundRequest {

    @Size(max = 500, message = "背景图片地址不能超过500个字符")
    private String imageUrl;

    @Pattern(regexp = "(?i)^(NONE|GRADIENT|IMAGE)$", message = "背景类型不合法")
    private String backgroundType;

    @DecimalMin(value = "0.4", message = "遮罩不透明度不能低于0.4")
    @DecimalMax(value = "0.98", message = "遮罩不透明度不能高于0.98")
    private Double backgroundOpacity;

    @Min(value = 0, message = "背景模糊不能小于0")
    @Max(value = 20, message = "背景模糊不能大于20")
    private Integer backgroundBlur;

    @DecimalMin(value = "0.4", message = "组件不透明度不能低于0.4")
    @DecimalMax(value = "1.0", message = "组件不透明度不能高于1")
    private Double componentOpacity;
}
