package com.flower.mall.module.recommendation.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("recommendation_log")
public class RecommendationLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;

    private String scene;

    private String festival;

    private String season;

    private Integer coldStart;

    private String weightsJson;

    private String productIds;

    private String detailJson;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
