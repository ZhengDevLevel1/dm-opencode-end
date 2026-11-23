package com.flower.mall.module.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.flower.mall.common.api.PageResult;
import com.flower.mall.module.ai.dto.AiCallLogVO;
import com.flower.mall.module.ai.dto.AiMetricsVO;
import com.flower.mall.module.ai.entity.AiCallLog;
import com.flower.mall.module.ai.mapper.AiCallLogMapper;
import com.flower.mall.module.ai.monitor.AiRuntimeMetrics;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiCallLogService {

    private final AiCallLogMapper mapper;
    private final AiRuntimeMetrics runtimeMetrics;

    public void save(AiCallLog log) {
        if (log.getCreatedAt() == null) {
            log.setCreatedAt(LocalDateTime.now());
        }
        mapper.insert(log);
    }

    public long countTodayChat(Long userId, String sessionId) {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LambdaQueryWrapper<AiCallLog> wrapper = new LambdaQueryWrapper<AiCallLog>()
                .ge(AiCallLog::getCreatedAt, start)
                .eq(AiCallLog::getScene, "CHAT");
        if (userId != null) {
            wrapper.eq(AiCallLog::getUserId, userId);
        } else if (sessionId != null && !sessionId.isBlank()) {
            wrapper.eq(AiCallLog::getSessionId, sessionId);
        }
        return mapper.selectCount(wrapper);
    }

    public BigDecimal todayCost() {
        return costSince(LocalDate.now().atStartOfDay());
    }

    public BigDecimal monthCost() {
        return costSince(LocalDate.now().withDayOfMonth(1).atStartOfDay());
    }

    private BigDecimal costSince(LocalDateTime start) {
        List<AiCallLog> logs = mapper.selectList(new LambdaQueryWrapper<AiCallLog>()
                .ge(AiCallLog::getCreatedAt, start));
        return logs.stream()
                .map(AiCallLog::getEstimatedCost)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public AiMetricsVO metrics(int days) {
        int safeDays = Math.max(1, Math.min(days, 90));
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(safeDays - 1L);
        List<AiCallLog> logs = mapper.selectList(new LambdaQueryWrapper<AiCallLog>()
                .ge(AiCallLog::getCreatedAt, start.atStartOfDay())
                .le(AiCallLog::getCreatedAt, end.atTime(23, 59, 59)));
        long success = logs.stream().filter(log -> "SUCCESS".equals(log.getStatus())).count();
        long fallback = logs.stream().filter(log -> "FALLBACK".equals(log.getStatus())).count();
        long failed = logs.stream().filter(log -> "FAILED".equals(log.getStatus())).count();
        long total = logs.size();
        long tokens = logs.stream().mapToLong(log -> log.getTotalTokens() == null ? 0 : log.getTotalTokens()).sum();
        long promptTokens = logs.stream().mapToLong(log -> log.getPromptTokens() == null ? 0 : log.getPromptTokens()).sum();
        long completionTokens = logs.stream()
                .mapToLong(log -> log.getCompletionTokens() == null ? 0 : log.getCompletionTokens()).sum();
        BigDecimal cost = logs.stream()
                .map(AiCallLog::getEstimatedCost)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        List<Integer> latencies = logs.stream()
                .map(AiCallLog::getLatencyMs)
                .filter(java.util.Objects::nonNull)
                .sorted()
                .toList();
        List<Integer> firstTokens = logs.stream()
                .map(AiCallLog::getFirstTokenMs)
                .filter(java.util.Objects::nonNull)
                .sorted()
                .toList();
        double avgLatency = latencies.stream().mapToInt(Integer::intValue).average().orElse(0);
        int p95 = percentile(latencies, 0.95);
        int firstTokenP95 = percentile(firstTokens, 0.95);

        Map<String, Long> byScene = new LinkedHashMap<>();
        Map<String, AiMetricsVO.SceneCost> costByScene = new LinkedHashMap<>();
        Map<String, Long> degradedStages = new LinkedHashMap<>();
        Map<LocalDate, List<AiCallLog>> byDay = new LinkedHashMap<>();
        for (AiCallLog log : logs) {
            String scene = log.getScene() == null ? "UNKNOWN" : log.getScene();
            byScene.merge(scene, 1L, Long::sum);
            AiMetricsVO.SceneCost sceneCost = costByScene.computeIfAbsent(scene,
                    key -> AiMetricsVO.SceneCost.builder().scene(key).cost(BigDecimal.ZERO).build());
            sceneCost.setCalls(sceneCost.getCalls() + 1);
            sceneCost.setPromptTokens(sceneCost.getPromptTokens()
                    + (log.getPromptTokens() == null ? 0 : log.getPromptTokens()));
            sceneCost.setCompletionTokens(sceneCost.getCompletionTokens()
                    + (log.getCompletionTokens() == null ? 0 : log.getCompletionTokens()));
            sceneCost.setTotalTokens(sceneCost.getTotalTokens()
                    + (log.getTotalTokens() == null ? 0 : log.getTotalTokens()));
            if (log.getEstimatedCost() != null) {
                sceneCost.setCost(sceneCost.getCost().add(log.getEstimatedCost()));
            }
            if (log.getDegradedStage() != null && !log.getDegradedStage().isBlank()) {
                degradedStages.merge(log.getDegradedStage(), 1L, Long::sum);
            }
            LocalDate date = log.getCreatedAt() == null ? end : log.getCreatedAt().toLocalDate();
            byDay.computeIfAbsent(date, key -> new ArrayList<>()).add(log);
        }

        List<AiMetricsVO.DailyPoint> daily = new ArrayList<>();
        for (int i = 0; i < safeDays; i++) {
            LocalDate date = start.plusDays(i);
            List<AiCallLog> dayLogs = byDay.getOrDefault(date, List.of());
            long dayFallback = dayLogs.stream().filter(log -> "FALLBACK".equals(log.getStatus())).count();
            long dayFailed = dayLogs.stream().filter(log -> "FAILED".equals(log.getStatus())).count();
            long dayTokens = dayLogs.stream().mapToLong(log -> log.getTotalTokens() == null ? 0 : log.getTotalTokens()).sum();
            long dayPrompt = dayLogs.stream().mapToLong(log -> log.getPromptTokens() == null ? 0 : log.getPromptTokens()).sum();
            long dayCompletion = dayLogs.stream()
                    .mapToLong(log -> log.getCompletionTokens() == null ? 0 : log.getCompletionTokens()).sum();
            BigDecimal dayCost = dayLogs.stream()
                    .map(AiCallLog::getEstimatedCost)
                    .filter(java.util.Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            daily.add(AiMetricsVO.DailyPoint.builder()
                    .date(date)
                    .calls(dayLogs.size())
                    .fallback(dayFallback)
                    .failed(dayFailed)
                    .tokens(dayTokens)
                    .promptTokens(dayPrompt)
                    .completionTokens(dayCompletion)
                    .cost(dayCost)
                    .build());
        }

        LocalDateTime currentHour = LocalDateTime.now().truncatedTo(ChronoUnit.HOURS);
        LocalDateTime hourlyStart = currentHour.minusHours(23);
        List<AiCallLog> hourlyLogs = mapper.selectList(new LambdaQueryWrapper<AiCallLog>()
                .ge(AiCallLog::getCreatedAt, hourlyStart)
                .le(AiCallLog::getCreatedAt, currentHour.plusHours(1).minusNanos(1)));
        Map<LocalDateTime, List<AiCallLog>> byHour = new LinkedHashMap<>();
        for (AiCallLog log : hourlyLogs) {
            LocalDateTime hour = log.getCreatedAt() == null
                    ? currentHour
                    : log.getCreatedAt().truncatedTo(ChronoUnit.HOURS);
            byHour.computeIfAbsent(hour, key -> new ArrayList<>()).add(log);
        }
        List<AiMetricsVO.HourlyPoint> hourly = new ArrayList<>();
        for (int i = 0; i < 24; i++) {
            LocalDateTime hour = hourlyStart.plusHours(i);
            List<AiCallLog> hourLogs = byHour.getOrDefault(hour, List.of());
            List<Integer> hourLatencies = hourLogs.stream()
                    .map(AiCallLog::getLatencyMs)
                    .filter(java.util.Objects::nonNull)
                    .sorted()
                    .toList();
            hourly.add(AiMetricsVO.HourlyPoint.builder()
                    .hour(hour)
                    .calls(hourLogs.size())
                    .fallback(hourLogs.stream().filter(log -> "FALLBACK".equals(log.getStatus())).count())
                    .failed(hourLogs.stream().filter(log -> "FAILED".equals(log.getStatus())).count())
                    .tokens(hourLogs.stream().mapToLong(log -> log.getTotalTokens() == null ? 0 : log.getTotalTokens()).sum())
                    .cost(hourLogs.stream()
                            .map(AiCallLog::getEstimatedCost)
                            .filter(java.util.Objects::nonNull)
                            .reduce(BigDecimal.ZERO, BigDecimal::add))
                    .avgLatencyMs(round(hourLatencies.stream().mapToInt(Integer::intValue).average().orElse(0)))
                    .p95LatencyMs(percentile(hourLatencies, 0.95))
                    .build());
        }

        AiRuntimeMetrics.Snapshot runtime = runtimeMetrics.snapshot();
        List<AiMetricsVO.EndpointPoint> endpoints = runtime.endpoints().stream()
                .map(item -> AiMetricsVO.EndpointPoint.builder()
                        .path(item.path())
                        .calls(item.calls())
                        .failures(item.failures())
                        .qps(round(item.qps()))
                        .avgLatencyMs(round(item.avgLatencyMs()))
                        .p95LatencyMs(item.p95LatencyMs())
                        .lastStatus(item.lastStatus())
                        .lastCalledAt(item.lastCalledAt())
                        .build())
                .toList();

        return AiMetricsVO.builder()
                .startDate(start)
                .endDate(end)
                .totalCalls(total)
                .successCalls(success)
                .fallbackCalls(fallback)
                .failedCalls(failed)
                .successRate(total == 0 ? 0 : round((double) success / total))
                .fallbackRate(total == 0 ? 0 : round((double) fallback / total))
                .totalTokens(tokens)
                .promptTokens(promptTokens)
                .completionTokens(completionTokens)
                .estimatedCost(cost.setScale(6, RoundingMode.HALF_UP))
                .todayCost(todayCost().setScale(6, RoundingMode.HALF_UP))
                .monthCost(monthCost().setScale(6, RoundingMode.HALF_UP))
                .avgLatencyMs(round(avgLatency))
                .p95LatencyMs(p95)
                .firstTokenP95Ms(firstTokenP95)
                .qps(round(runtime.qps()))
                .avgLatencyMs5m(round(runtime.avgLatencyMs()))
                .p95LatencyMs5m(runtime.p95LatencyMs())
                .callsByScene(byScene)
                .costByScene(costByScene)
                .degradedStages(degradedStages)
                .daily(daily)
                .hourly(hourly)
                .endpoints(endpoints)
                .build();
    }

    public PageResult<AiCallLogVO> page(long page, long size, String scene, String status) {
        LambdaQueryWrapper<AiCallLog> wrapper = new LambdaQueryWrapper<AiCallLog>()
                .eq(scene != null && !scene.isBlank(), AiCallLog::getScene, scene)
                .eq(status != null && !status.isBlank(), AiCallLog::getStatus, status)
                .orderByDesc(AiCallLog::getId);
        Page<AiCallLog> result = mapper.selectPage(new Page<>(page, size), wrapper);
        return PageResult.of(result, AiCallLogVO::from);
    }

    private static double round(double value) {
        return BigDecimal.valueOf(value).setScale(4, RoundingMode.HALF_UP).doubleValue();
    }

    private static int percentile(List<Integer> sorted, double ratio) {
        if (sorted.isEmpty()) {
            return 0;
        }
        int index = (int) Math.ceil(ratio * sorted.size()) - 1;
        return sorted.get(Math.max(0, Math.min(index, sorted.size() - 1)));
    }
}
