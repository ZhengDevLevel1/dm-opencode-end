package com.flower.mall.module.ai.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class AiConversationBatchRequest {

    @NotEmpty(message = "请选择对话")
    private List<Long> ids = new ArrayList<>();

    private Boolean pinned;
}
