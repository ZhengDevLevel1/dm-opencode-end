package com.flower.mall.security;

import com.flower.mall.common.enums.UserRole;
import com.flower.mall.common.enums.UserStatus;
import com.flower.mall.module.user.entity.User;
import com.flower.mall.module.user.mapper.UserMapper;
import com.flower.mall.support.TransactionCacheSupport;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private static final long CACHE_TTL_SECONDS = 30;

    private final UserMapper userMapper;
    private final Map<Long, CachedUser> cache = new ConcurrentHashMap<>();

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userMapper.selectOne(Wrappers.<User>lambdaQuery().eq(User::getUsername, username));
        if (user == null) {
            throw new UsernameNotFoundException("用户不存在");
        }
        return toAuthUser(user, null);
    }

    public AuthUser loadById(Long userId) {
        CachedUser cached = cache.get(userId);
        Instant now = Instant.now();
        if (cached != null && cached.expiresAt().isAfter(now)) {
            return toAuthUser(cached.user(), null);
        }
        User user = userMapper.selectById(userId);
        if (user != null) {
            cache.put(userId, new CachedUser(user, now.plusSeconds(CACHE_TTL_SECONDS)));
            TransactionCacheSupport.onRollback(() -> cache.remove(userId));
        }
        return user == null ? null : toAuthUser(user, null);
    }

    public void evict(Long userId) {
        if (userId != null) {
            cache.remove(userId);
        }
    }

    @Scheduled(fixedDelay = 10, timeUnit = TimeUnit.MINUTES)
    public void cleanupExpired() {
        Instant now = Instant.now();
        cache.entrySet().removeIf(entry -> !entry.getValue().expiresAt().isAfter(now));
    }

    public AuthUser toAuthUser(User user, String jti) {
        return AuthUser.builder()
                .id(user.getId())
                .username(user.getUsername())
                .password(user.getPassword())
                .nickname(user.getNickname())
                .role(UserRole.valueOf(user.getRole()))
                .status(UserStatus.valueOf(user.getStatus()))
                .jti(jti)
                .build();
    }

    private record CachedUser(User user, Instant expiresAt) {
    }
}
