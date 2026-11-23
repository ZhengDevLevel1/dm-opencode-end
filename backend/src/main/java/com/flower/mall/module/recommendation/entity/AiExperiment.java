package com.flower.mall.module.recommendation.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("ai_experiment")
public class AiExperiment {

    @TableId(type = IdType.INPUT)
    private String id;
    private String name;
    private String scene;
    private String mode;
    private Integer trafficPercent;
    private String status;
    private String primaryMetric;
    private String configJson;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
