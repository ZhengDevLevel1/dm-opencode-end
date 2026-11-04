package com.flower.mall.common.util;

import com.flower.mall.common.enums.UserRole;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.security.AuthUser;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static AuthUser currentUserOrNull() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthUser authUser)) {
            return null;
        }
        return authUser;
    }

    public static AuthUser currentUser() {
        AuthUser authUser = currentUserOrNull();
        if (authUser == null) {
            throw BusinessException.of(ErrorCode.UNAUTHORIZED);
        }
        return authUser;
    }

    public static Long currentUserId() {
        return currentUser().getId();
    }

    public static String currentUsername() {
        AuthUser authUser = currentUserOrNull();
        return authUser == null ? "anonymous" : authUser.getUsername();
    }

    public static boolean hasRole(UserRole role) {
        AuthUser authUser = currentUserOrNull();
        return authUser != null && authUser.getRole() == role;
    }

    public static boolean isStaffOrAdmin() {
        AuthUser authUser = currentUserOrNull();
        return authUser != null && (authUser.getRole() == UserRole.STAFF || authUser.getRole() == UserRole.ADMIN);
    }
}
