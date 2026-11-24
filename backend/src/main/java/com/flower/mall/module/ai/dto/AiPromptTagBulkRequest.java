package com.flower.mall.module.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class AiPromptTagBulkRequest {

    @NotBlank(message = "标签分类不能为空")
    private String category;

    @NotNull(message = "标签词不能为空")
    @Size(max = 30, message = "一次最多提交30个标签")
    private List<String> words;

    private String mode = "APPEND";
}
