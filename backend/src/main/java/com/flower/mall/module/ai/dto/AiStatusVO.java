package com.flower.mall.module.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiStatusVO {
    private boolean enabled;
    private boolean available;
    private boolean chatEnabled;
    private boolean merchantEnabled;
    private boolean anonymousAllowed;
    private String mode;
    private String message;
}
