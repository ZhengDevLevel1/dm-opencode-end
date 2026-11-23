package com.flower.mall.module.ai.monitor;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.ConcurrentMap;

@Component
public class AiRuntimeMetrics {

    private static final long WINDOW_MS = 5 * 60 * 1000L;
    private static final long QPS_WINDOW_MS = 60 * 1000L;

    private final ConcurrentMap<String, ConcurrentLinkedDeque<Sample>> samples = new ConcurrentHashMap<>();

    public void record(String path, long latencyMs, boolean success) {
        String key = normalize(path);
        long now = System.currentTimeMillis();
        ConcurrentLinkedDeque<Sample> deque = samples.computeIfAbsent(key, ignored -> new ConcurrentLinkedDeque<>());
        deque.addLast(new Sample(now, Math.max(0, latencyMs), success));
        purge(deque, now - WINDOW_MS);
    }

    public Snapshot snapshot() {
        long now = System.currentTimeMillis();
        List<EndpointSnapshot> endpoints = new ArrayList<>();
        List<Sample> all = new ArrayList<>();
        for (Map.Entry<String, ConcurrentLinkedDeque<Sample>> entry : samples.entrySet()) {
            ConcurrentLinkedDeque<Sample> deque = entry.getValue();
            purge(deque, now - WINDOW_MS);
            List<Sample> values = new ArrayList<>(deque);
            if (values.isEmpty()) {
                continue;
            }
            all.addAll(values);
            endpoints.add(endpoint(entry.getKey(), values, now));
        }
        endpoints.sort(Comparator.comparingLong(EndpointSnapshot::calls).reversed()
                .thenComparing(EndpointSnapshot::path));
        return new Snapshot(qps(all, now), average(all), percentile(all, 0.95), endpoints);
    }

    private EndpointSnapshot endpoint(String path, List<Sample> values, long now) {
        Sample last = values.get(values.size() - 1);
        return new EndpointSnapshot(path, values.size(), failures(values), qps(values, now),
                average(values), percentile(values, 0.95), last.success() ? "SUCCESS" : "FAILED",
                LocalDateTime.ofInstant(Instant.ofEpochMilli(last.timestamp()), ZoneId.systemDefault()));
    }

    private static void purge(ConcurrentLinkedDeque<Sample> deque, long cutoff) {
        Sample first;
        while ((first = deque.peekFirst()) != null && first.timestamp() < cutoff) {
            deque.pollFirst();
        }
    }

    private static long failures(List<Sample> values) {
        return values.stream().filter(sample -> !sample.success()).count();
    }

    private static double qps(List<Sample> values, long now) {
        long cutoff = now - QPS_WINDOW_MS;
        return values.stream().filter(sample -> sample.timestamp() >= cutoff).count() / 60.0;
    }

    private static double average(List<Sample> values) {
        return values.stream().mapToLong(Sample::latencyMs).average().orElse(0);
    }

    private static int percentile(List<Sample> values, double ratio) {
        if (values.isEmpty()) {
            return 0;
        }
        List<Long> sorted = values.stream().map(Sample::latencyMs).sorted().toList();
        int index = (int) Math.ceil(ratio * sorted.size()) - 1;
        return sorted.get(Math.max(0, Math.min(index, sorted.size() - 1))).intValue();
    }

    private static String normalize(String path) {
        if (path == null || path.isBlank()) {
            return "unknown";
        }
        int query = path.indexOf('?');
        String normalized = query < 0 ? path : path.substring(0, query);
        return normalized.endsWith("/") && normalized.length() > 1
                ? normalized.substring(0, normalized.length() - 1)
                : normalized;
    }

    private record Sample(long timestamp, long latencyMs, boolean success) {
    }

    public record EndpointSnapshot(String path, long calls, long failures, double qps,
                                   double avgLatencyMs, int p95LatencyMs, String lastStatus,
                                   LocalDateTime lastCalledAt) {
    }

    public record Snapshot(double qps, double avgLatencyMs, int p95LatencyMs,
                           List<EndpointSnapshot> endpoints) {
    }
}
