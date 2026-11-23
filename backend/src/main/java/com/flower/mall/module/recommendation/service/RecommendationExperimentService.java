package com.flower.mall.module.recommendation.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.config.AppProperties;
import com.flower.mall.module.recommendation.dto.RecommendationExperimentRequest;
import com.flower.mall.module.recommendation.dto.RecommendationExperimentVO;
import com.flower.mall.module.recommendation.entity.AiExperiment;
import com.flower.mall.module.recommendation.mapper.AiExperimentMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class RecommendationExperimentService {

    public static final String CONTROL = "CONTROL";
    public static final String TREATMENT = "TREATMENT";
    public static final String STRATEGY_TFIDF = "CONTENT_TFIDF_MULTI_FACTOR";
    public static final String STRATEGY_VECTOR = "VECTOR_HYBRID";

    private final AiExperimentMapper mapper;
    private final AppProperties properties;

    public List<RecommendationExperimentVO> list() {
        return mapper.selectList(Wrappers.<AiExperiment>lambdaQuery()
                        .orderByDesc(AiExperiment::getUpdatedAt))
                .stream()
                .map(RecommendationExperimentVO::from)
                .toList();
    }

    public RecommendationExperimentVO save(RecommendationExperimentRequest request) {
        AiExperiment experiment = mapper.selectById(request.getId());
        boolean creating = experiment == null;
        if (creating) {
            experiment = new AiExperiment();
            experiment.setId(request.getId());
            experiment.setCreatedAt(LocalDateTime.now());
        }
        experiment.setName(request.getName());
        experiment.setScene(request.getScene());
        experiment.setMode(request.getMode() == null ? "AB" : request.getMode().toUpperCase(Locale.ROOT));
        experiment.setTrafficPercent(request.getTrafficPercent() == null ? 10 : request.getTrafficPercent());
        experiment.setStatus(request.getStatus() == null ? "PAUSED" : request.getStatus().toUpperCase(Locale.ROOT));
        experiment.setPrimaryMetric(request.getPrimaryMetric() == null ? "CTR" : request.getPrimaryMetric());
        experiment.setConfigJson(request.getConfigJson());
        experiment.setUpdatedAt(LocalDateTime.now());
        if (creating) {
            mapper.insert(experiment);
        } else {
            mapper.updateById(experiment);
        }
        return RecommendationExperimentVO.from(experiment);
    }

    public RecommendationExperimentVO updateStatus(String id, String status) {
        AiExperiment experiment = mapper.selectById(id);
        if (experiment == null) {
            throw BusinessException.of(ErrorCode.EXPERIMENT_NOT_FOUND);
        }
        experiment.setStatus(status == null ? "PAUSED" : status.toUpperCase(Locale.ROOT));
        if ("RUNNING".equals(experiment.getStatus()) && experiment.getStartAt() == null) {
            experiment.setStartAt(LocalDateTime.now());
        }
        if ("STOPPED".equals(experiment.getStatus())) {
            experiment.setEndAt(LocalDateTime.now());
        }
        experiment.setUpdatedAt(LocalDateTime.now());
        mapper.updateById(experiment);
        return RecommendationExperimentVO.from(experiment);
    }

    public Assignment assign(String scene, String subject) {
        LocalDateTime now = LocalDateTime.now();
        List<AiExperiment> experiments = mapper.selectList(Wrappers.<AiExperiment>lambdaQuery()
                .eq(AiExperiment::getStatus, "RUNNING")
                .and(wrapper -> wrapper.isNull(AiExperiment::getScene)
                        .or().eq(AiExperiment::getScene, scene))
                .and(wrapper -> wrapper.isNull(AiExperiment::getStartAt)
                        .or().le(AiExperiment::getStartAt, now))
                .and(wrapper -> wrapper.isNull(AiExperiment::getEndAt)
                        .or().ge(AiExperiment::getEndAt, now)));
        for (AiExperiment experiment : experiments) {
            int bucket = bucket(subject + ":" + experiment.getId());
            boolean treatment = bucket < Math.max(0, Math.min(100, experiment.getTrafficPercent()));
            if ("SHADOW".equalsIgnoreCase(experiment.getMode())) {
                return new Assignment(experiment.getId(), CONTROL, STRATEGY_TFIDF, false, true);
            }
            if (treatment) {
                return new Assignment(experiment.getId(), TREATMENT, STRATEGY_VECTOR, true, false);
            }
            return new Assignment(experiment.getId(), CONTROL, STRATEGY_TFIDF, false, false);
        }
        String mode = properties.getAi().getRecommendationMode();
        if ("VECTOR".equalsIgnoreCase(mode)) {
            int percent = Math.max(0, Math.min(100, properties.getAi().getVectorTrafficPercent()));
            boolean treatment = percent >= 100 || bucket(subject + ":vector") < percent;
            return new Assignment(null, treatment ? TREATMENT : CONTROL,
                    treatment ? STRATEGY_VECTOR : STRATEGY_TFIDF, treatment, false);
        }
        return new Assignment(null, CONTROL, STRATEGY_TFIDF, false, false);
    }

    private static int bucket(String value) {
        return Math.floorMod(value.hashCode(), 100);
    }

    public record Assignment(String experimentId, String variant, String strategy,
                             boolean treatment, boolean shadow) {
    }
}
