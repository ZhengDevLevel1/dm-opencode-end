package com.flower.mall.security;

import com.flower.mall.config.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class TokenStore {

    private static final String KEY_PREFIX = "auth:session:";

    private final StringRedisTemplate redisTemplate;
    private final boolean redisEnabled;
    private final ConcurrentHashMap<String, SessionEntry> fallbackStore = new ConcurrentHashMap<>();
    private volatile long lastRedisWarningAt = 0L;

    public TokenStore(StringRedisTemplate redisTemplate, AppProperties properties) {
        this.redisTemplate = redisTemplate;
        this.redisEnabled = properties.getRedis().isEnabled();
    }

    public void store(String jti, Long userId, Duration ttl) {
        if (!redisEnabled) {
            fallbackStore.put(jti, new SessionEntry(userId, Instant.now().plus(ttl)));
            return;
        }
        try {
            redisTemplate.opsForValue().set(KEY_PREFIX + jti, String.valueOf(userId), ttl);
        } catch (RuntimeException exception) {
            warnRedisUnavailable(exception);
            fallbackStore.put(jti, new SessionEntry(userId, Instant.now().plus(ttl)));
        }
    }

    public boolean isActive(String jti, Long userId) {
        SessionEntry entry = fallbackStore.get(jti);
        if (entry != null) {
            if (entry.expiresAt().isAfter(Instant.now())) {
                return entry.userId().equals(userId);
            }
            fallbackStore.remove(jti);
        }
        if (!redisEnabled) {
            return false;
        }
        try {
            String value = redisTemplate.opsForValue().get(KEY_PREFIX + jti);
            return value != null && value.equals(String.valueOf(userId));
        } catch (RuntimeException exception) {
            warnRedisUnavailable(exception);
            return true;
        }
    }

    public void revoke(String jti) {
        fallbackStore.remove(jti);
        if (!redisEnabled) {
            return;
        }
        try {
            redisTemplate.delete(KEY_PREFIX + jti);
        } catch (RuntimeException exception) {
            warnRedisUnavailable(exception);
        }
    }

    public void cleanupExpired() {
        Instant now = Instant.now();
        fallbackStore.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(now));
    }

    private void warnRedisUnavailable(RuntimeException exception) {
        long now = System.currentTimeMillis();
        if (now - lastRedisWarningAt > TimeUnit.MINUTES.toMillis(5)) {
            lastRedisWarningAt = now;
            log.warn("Redis 会话存储不可用，已降级为本地会话缓存: {}", exception.getMessage());
        }
    }

    private record SessionEntry(Long userId, Instant expiresAt) {
    }
}
