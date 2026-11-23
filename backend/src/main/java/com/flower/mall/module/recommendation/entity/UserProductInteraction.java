package com.flower.mall.module.recommendation.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("user_product_interaction")
public class UserProductInteraction {

    @TableId(type = IdType.AUTO)
    private Long id;
    private String subjectKey;
    private Long userId;
    private String sessionId;
    private Long productId;
    private Integer viewCount;
    private Integer clickCount;
    private Long totalDwellMs;
    private LocalDateTime lastViewedAt;
    private LocalDateTime lastClickedAt;
    private LocalDateTime updatedAt;
}
