package com.flower.mall.module.recommendation.dto;

import com.flower.mall.module.recommendation.entity.RecommendationLog;
import com.flower.mall.module.recommendation.model.RecommendationLogLabels;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationLogVO {

    private Long id;
    private Long userId;
    private String userNickname;
    private String scene;
    private String sceneLabel;
    private String festival;
    private String season;
    private String seasonLabel;
    private boolean coldStart;
    private String productIds;
    private String weightsJson;
    private String detailJson;
    private LocalDateTime createdAt;

    public static RecommendationLogVO from(RecommendationLog log) {
        return RecommendationLogVO.builder()
                .id(log.getId())
                .userId(log.getUserId())
                .scene(log.getScene())
                .sceneLabel(RecommendationLogLabels.sceneLabel(log.getScene()))
                .festival(log.getFestival())
                .season(log.getSeason())
                .seasonLabel(RecommendationLogLabels.seasonLabel(log.getSeason()))
                .coldStart(log.getColdStart() != null && log.getColdStart() == 1)
                .productIds(log.getProductIds())
                .weightsJson(log.getWeightsJson())
                .detailJson(log.getDetailJson())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
