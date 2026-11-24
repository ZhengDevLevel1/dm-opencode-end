package com.flower.mall.module.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AiPromptTagGenerateRequest {

    @NotBlank(message = "标签分类不能为空")
    private String category;

    @Size(max = 100, message = "主题不能超过100字")
    private String theme;
}
