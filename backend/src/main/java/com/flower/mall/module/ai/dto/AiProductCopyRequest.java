package com.flower.mall.module.ai.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class AiProductCopyRequest {

    private Long productId;

    @Size(max = 100, message = "商品名称不能超过100个字符")
    private String name;

    @Size(max = 30, message = "商品品类不能超过30个字符")
    private String category;

    @Size(max = 30, message = "花材等级不能超过30个字符")
    private String grade;

    @Size(max = 60, message = "产地不能超过60个字符")
    private String origin;

    @Size(max = 200, message = "花语不能超过200个字符")
    private String flowerMeaning;

    @Size(max = 200, message = "场景标签不能超过200个字符")
    private String occasionTags;

    @Size(max = 200, message = "节日标签不能超过200个字符")
    private String festivalTags;

    @Size(max = 2000, message = "商品描述不能超过2000个字符")
    private String description;

    @DecimalMin(value = "0.01", message = "价格必须大于0")
    private BigDecimal price;

    private String tone = "温暖";

    private String length = "medium";
}
