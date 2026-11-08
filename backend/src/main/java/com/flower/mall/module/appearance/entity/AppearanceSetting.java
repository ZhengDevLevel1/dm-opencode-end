package com.flower.mall.module.appearance.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("appearance_setting")
public class AppearanceSetting {

    @TableId(type = IdType.INPUT)
    private Long id;

    /** 允许更新为 null，用于清除登录页背景。 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String authBackgroundImage;

    /** NONE / GRADIENT / IMAGE */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String backgroundType;

    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private Double backgroundOpacity;

    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private Integer backgroundBlur;

    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private Double componentOpacity;

    /** 登录页表面配色：default / rose-pine-dawn / catppuccin-latte / everforest-light / rose-pine */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String authPalette;

    /** 登录页强调色：sky / blue / violet / rose / emerald / amber / orange / custom */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String authAccent;

    /** 自定义强调色，#RRGGBB */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String authCustomAccent;

    private Long updatedBy;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
