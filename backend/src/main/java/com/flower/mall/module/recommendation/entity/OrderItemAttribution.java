package com.flower.mall.module.recommendation.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("order_item_attribution")
public class OrderItemAttribution {

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long orderId;
    private Long orderItemId;
    private Long productId;
    private String requestId;
    private String eventId;
    private String scene;
    private String strategy;
    private String experimentId;
    private String variant;
    private LocalDateTime attributedAt;
}
