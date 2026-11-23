package com.flower.mall.module.recommendation.dto;

import com.flower.mall.module.recommendation.entity.AiExperiment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationExperimentVO {
    private String id;
    private String name;
    private String scene;
    private String mode;
    private Integer trafficPercent;
    private String status;
    private String primaryMetric;
    private String configJson;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static RecommendationExperimentVO from(AiExperiment experiment) {
        return RecommendationExperimentVO.builder()
                .id(experiment.getId())
                .name(experiment.getName())
                .scene(experiment.getScene())
                .mode(experiment.getMode())
                .trafficPercent(experiment.getTrafficPercent())
                .status(experiment.getStatus())
                .primaryMetric(experiment.getPrimaryMetric())
                .configJson(experiment.getConfigJson())
                .startAt(experiment.getStartAt())
                .endAt(experiment.getEndAt())
                .createdAt(experiment.getCreatedAt())
                .updatedAt(experiment.getUpdatedAt())
                .build();
    }
}
