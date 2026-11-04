package com.flower.mall.module.user.dto;

import com.flower.mall.common.enums.UserRole;
import com.flower.mall.common.enums.UserStatus;
import com.flower.mall.module.user.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserVO {

    private Long id;
    private String username;
    private String nickname;
    private String phone;
    private String email;
    private String avatarUrl;
    private String role;
    private String roleLabel;
    private String status;
    private String statusLabel;
    private LocalDateTime createdAt;

    public static UserVO from(User user) {
        UserRole role = UserRole.valueOf(user.getRole());
        UserStatus status = UserStatus.valueOf(user.getStatus());
        return UserVO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .phone(user.getPhone())
                .email(user.getEmail())
                .avatarUrl(StringUtils.hasText(user.getAvatarUrl()) ? user.getAvatarUrl() : null)
                .role(role.name())
                .roleLabel(role.getLabel())
                .status(status.name())
                .statusLabel(status.getLabel())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
