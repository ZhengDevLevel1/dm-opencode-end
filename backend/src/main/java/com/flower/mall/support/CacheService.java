package com.flower.mall.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flower.mall.config.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class CacheService {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final boolean enabled;
    private volatile long lastWarningAt = 0L;

    public CacheService(StringRedisTemplate redisTemplate, ObjectMapper objectMapper, AppProperties properties) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.enabled = properties.getRedis().isEnabled();
    }

    public <T> Optional<T> get(String key, TypeReference<T> typeReference) {
        if (!enabled) {
            return Optional.empty();
        }
        try {
            String value = redisTemplate.opsForValue().get(key);
            if (value == null) {
                return Optional.empty();
            }
            return Optional.ofNullable(objectMapper.readValue(value, typeReference));
        } catch (Exception exception) {
            warn(exception);
            return Optional.empty();
        }
    }

    public void put(String key, Object value, Duration ttl) {
        if (!enabled) {
            return;
        }
        try {
            redisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(value), ttl);
        } catch (Exception exception) {
            warn(exception);
        }
    }

    public void evict(String key) {
        if (!enabled) {
            return;
        }
        try {
            redisTemplate.delete(key);
        } catch (Exception exception) {
            warn(exception);
        }
    }

    public void evictByPrefix(String prefix) {
        if (!enabled) {
            return;
        }
        try {
            var keys = redisTemplate.keys(prefix + "*");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
        } catch (Exception exception) {
            warn(exception);
        }
    }

    private void warn(Exception exception) {
        long now = System.currentTimeMillis();
        if (now - lastWarningAt > TimeUnit.MINUTES.toMillis(5)) {
            lastWarningAt = now;
            log.warn("Redis 缓存不可用，已跳过缓存: {}", exception.getMessage());
        }
    }
}
