package com.flower.mall.module.preference.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("user_theme_preference")
public class UserThemePreference {

    @TableId(value = "user_id", type = IdType.INPUT)
    private Long userId;

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

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
