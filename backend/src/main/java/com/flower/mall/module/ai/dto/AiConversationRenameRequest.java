package com.flower.mall.module.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AiConversationRenameRequest {

    @NotBlank(message = "对话标题不能为空")
    @Size(max = 120, message = "对话标题不能超过120字")
    private String title;
}
