package com.flower.mall.module.appearance.service;

import com.flower.mall.common.util.SecurityUtils;
import com.flower.mall.module.appearance.dto.AuthBackgroundRequest;
import com.flower.mall.module.appearance.dto.AuthBackgroundVO;
import com.flower.mall.module.appearance.entity.AppearanceSetting;
import com.flower.mall.module.appearance.mapper.AppearanceSettingMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AppearanceService {

    private static final long SETTING_ID = 1L;

    private final AppearanceSettingMapper settingMapper;

    public AuthBackgroundVO getAuthBackground() {
        return AuthBackgroundVO.from(getOrCreate());
    }

    @Transactional
    public AuthBackgroundVO updateAuthBackground(AuthBackgroundRequest request) {
        AppearanceSetting setting = getOrCreate();
        setting.setAuthBackgroundImage(normalize(request.getImageUrl()));
        // 未传类型时按图片地址推断，保证旧客户端仍能正确清空/设置图片
        setting.setBackgroundType(request.getBackgroundType() != null
                ? request.getBackgroundType().toUpperCase()
                : (StringUtils.hasText(request.getImageUrl()) ? "IMAGE" : "NONE"));
        // 未传的调节参数保持原值，避免旧客户端把样式重置
        setting.setBackgroundOpacity(request.getBackgroundOpacity() != null
                ? request.getBackgroundOpacity()
                : setting.getBackgroundOpacity());
        setting.setBackgroundBlur(request.getBackgroundBlur() != null
                ? request.getBackgroundBlur()
                : setting.getBackgroundBlur());
        setting.setComponentOpacity(request.getComponentOpacity() != null
                ? request.getComponentOpacity()
                : setting.getComponentOpacity());
        // 配色字段同样支持省略，旧客户端只更新背景时不会重置配色
        if (request.getPalette() != null) {
            setting.setAuthPalette(request.getPalette().toLowerCase(Locale.ROOT));
        }
        if (request.getAccent() != null) {
            setting.setAuthAccent(request.getAccent().toLowerCase(Locale.ROOT));
        }
        if (request.getCustomAccent() != null) {
            setting.setAuthCustomAccent(request.getCustomAccent().toLowerCase(Locale.ROOT));
        }
        setting.setUpdatedBy(SecurityUtils.currentUserId());
        setting.setUpdatedAt(null);
        settingMapper.updateById(setting);
        return AuthBackgroundVO.from(settingMapper.selectById(SETTING_ID));
    }

    private AppearanceSetting getOrCreate() {
        AppearanceSetting setting = settingMapper.selectById(SETTING_ID);
        if (setting != null) {
            return setting;
        }
        AppearanceSetting created = new AppearanceSetting();
        created.setId(SETTING_ID);
        try {
            settingMapper.insert(created);
        } catch (DuplicateKeyException ignored) {
            // Another request created the singleton row first.
        }
        return settingMapper.selectById(SETTING_ID);
    }

    private String normalize(String imageUrl) {
        return StringUtils.hasText(imageUrl) ? imageUrl.trim() : null;
    }
}
