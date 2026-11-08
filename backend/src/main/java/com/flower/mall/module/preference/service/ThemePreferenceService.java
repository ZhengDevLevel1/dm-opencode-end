package com.flower.mall.module.preference.service;

import com.flower.mall.common.util.SecurityUtils;
import com.flower.mall.module.preference.dto.ThemePreferenceRequest;
import com.flower.mall.module.preference.dto.ThemePreferenceVO;
import com.flower.mall.module.preference.entity.UserThemePreference;
import com.flower.mall.module.preference.mapper.UserThemePreferenceMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ThemePreferenceService {

    private final UserThemePreferenceMapper preferenceMapper;

    public ThemePreferenceVO get() {
        UserThemePreference preference = preferenceMapper.selectById(SecurityUtils.currentUserId());
        return preference == null ? null : ThemePreferenceVO.from(preference);
    }

    @Transactional
    public ThemePreferenceVO update(ThemePreferenceRequest request) {
        Long userId = SecurityUtils.currentUserId();
        UserThemePreference preference = preferenceMapper.selectById(userId);
        boolean create = preference == null;
        if (create) {
            preference = new UserThemePreference();
            preference.setUserId(userId);
        }
        apply(preference, request);
        if (create) {
            try {
                preferenceMapper.insert(preference);
            } catch (DuplicateKeyException ignored) {
                preferenceMapper.updateById(preference);
            }
        } else {
            preferenceMapper.updateById(preference);
        }
        return ThemePreferenceVO.from(preferenceMapper.selectById(userId));
    }

    private void apply(UserThemePreference target, ThemePreferenceRequest source) {
        target.setMode(source.getMode());
        target.setPalette(source.getPalette());
        target.setAccent(source.getAccent());
        target.setCustomAccent(source.getCustomAccent());
        target.setRadius(source.getRadius());
        target.setDensity(source.getDensity());
        target.setSidebarStyle(source.getSidebarStyle());
        target.setScale(source.getScale());
        target.setReduceMotion(source.getReduceMotion());
        target.setHighContrast(source.getHighContrast());
        target.setBackground(source.getBackground());
        target.setBackgroundImage(source.getBackgroundImage());
        target.setBackgroundOpacity(source.getBackgroundOpacity());
        target.setBackgroundBlur(source.getBackgroundBlur());
        target.setComponentOpacity(source.getComponentOpacity());
    }
}
