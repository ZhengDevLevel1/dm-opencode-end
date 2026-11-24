package com.flower.mall.module.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiPromptTagBundleVO {

    private List<String> scenes;
    private List<String> audiences;
    private List<String> needs;
}
