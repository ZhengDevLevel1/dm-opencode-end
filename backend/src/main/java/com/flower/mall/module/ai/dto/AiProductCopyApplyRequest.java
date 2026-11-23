package com.flower.mall.module.ai.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class AiProductCopyApplyRequest {

    @NotNull(message = "商品ID不能为空")
    private Long productId;

    @Size(max = 100, message = "商品名称不能超过100个字符")
    private String title;

    @Size(max = 2000, message = "商品描述不能超过2000个字符")
    private String description;

    private List<String> tags = new ArrayList<>();

    private List<String> sellingPoints = new ArrayList<>();

    private Boolean applyTitle = true;

    private Boolean applyDescription = true;

    private Boolean applyTags = true;

    private Boolean applySellingPoints = true;
}
