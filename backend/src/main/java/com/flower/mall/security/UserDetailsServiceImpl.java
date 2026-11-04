package com.flower.mall.security;

import com.flower.mall.common.enums.UserRole;
import com.flower.mall.common.enums.UserStatus;
import com.flower.mall.module.user.entity.User;
import com.flower.mall.module.user.mapper.UserMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserMapper userMapper;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userMapper.selectOne(Wrappers.<User>lambdaQuery().eq(User::getUsername, username));
        if (user == null) {
            throw new UsernameNotFoundException("用户不存在");
        }
        return toAuthUser(user, null);
    }

    public AuthUser loadById(Long userId) {
        User user = userMapper.selectById(userId);
        return user == null ? null : toAuthUser(user, null);
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
}
