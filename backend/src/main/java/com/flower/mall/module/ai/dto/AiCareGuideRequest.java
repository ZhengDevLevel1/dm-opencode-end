package com.flower.mall.module.ai.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AiCareGuideRequest {

    private Long productId;

    @Size(max = 100, message = "商品名称不能超过100个字符")
    private String name;

    @Size(max = 30, message = "商品品类不能超过30个字符")
    private String category;

    @Size(max = 2000, message = "商品描述不能超过2000个字符")
    private String description;

    @Size(max = 200, message = "花语不能超过200个字符")
    private String flowerMeaning;

    @Size(max = 2000, message = "现有养护指南不能超过2000个字符")
    private String currentCareGuide;
}
