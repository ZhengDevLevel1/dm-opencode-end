package com.flower.mall.module.recommendation.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("recommendation_scene_weight")
public class RecommendationSceneWeight {

    @TableId(type = IdType.INPUT)
    private String scene;

    private BigDecimal contentWeight;

    private BigDecimal popularityWeight;

    private BigDecimal festivalWeight;

    private BigDecimal ratingWeight;

    private Boolean enabled;

    private Long updatedBy;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
