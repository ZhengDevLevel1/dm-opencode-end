package com.flower.mall.security;

import com.flower.mall.module.user.entity.User;
import com.flower.mall.module.user.mapper.UserMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserDetailsServiceImplTest {

    @Mock
    private UserMapper userMapper;

    @Test
    void loadByIdCachesUserUntilEvicted() {
        User user = new User();
        user.setId(3L);
        user.setUsername("customer");
        user.setPassword("encoded");
        user.setNickname("小玫");
        user.setRole("CUSTOMER");
        user.setStatus("ENABLED");
        when(userMapper.selectById(3L)).thenReturn(user);

        UserDetailsServiceImpl service = new UserDetailsServiceImpl(userMapper);

        assertThat(service.loadById(3L).getUsername()).isEqualTo("customer");
        assertThat(service.loadById(3L).getUsername()).isEqualTo("customer");
        verify(userMapper, times(1)).selectById(3L);

        service.evict(3L);
        assertThat(service.loadById(3L).getUsername()).isEqualTo("customer");
        verify(userMapper, times(2)).selectById(3L);
    }
}
