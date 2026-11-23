package com.flower.mall.module.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class KnowledgeDocumentRequest {

    @NotBlank(message = "标题不能为空")
    @Size(max = 120, message = "标题不能超过120字")
    private String title;

    @NotBlank(message = "分类不能为空")
    @Size(max = 30, message = "分类不能超过30字")
    private String category;

    @NotBlank(message = "内容不能为空")
    private String content;

    @Size(max = 200, message = "来源不能超过200字")
    private String source;

    private Boolean enabled = true;
}
