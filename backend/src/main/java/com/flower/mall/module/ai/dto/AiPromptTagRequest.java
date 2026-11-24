package com.flower.mall.module.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AiPromptTagRequest {

    @NotBlank(message = "标签分类不能为空")
    private String category;

    @NotBlank(message = "标签词不能为空")
    @Size(max = 20, message = "标签词不能超过20字")
    private String word;

    private Integer sortOrder;
}
