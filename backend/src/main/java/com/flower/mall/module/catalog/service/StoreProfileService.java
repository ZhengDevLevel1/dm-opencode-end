package com.flower.mall.module.catalog.service;

import com.flower.mall.common.util.SecurityUtils;
import com.flower.mall.module.catalog.dto.StoreProfileRequest;
import com.flower.mall.module.catalog.dto.StoreProfileVO;
import com.flower.mall.module.catalog.entity.StoreProfile;
import com.flower.mall.module.catalog.mapper.StoreProfileMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StoreProfileService {

    private static final long PROFILE_ID = 1L;
    private static final String DEFAULT_BUSINESS_PHONE = "400-820-1024";

    private final StoreProfileMapper storeProfileMapper;

    public StoreProfileVO get() {
        return StoreProfileVO.from(storeProfileMapper.selectById(PROFILE_ID), DEFAULT_BUSINESS_PHONE);
    }

    @Transactional
    public StoreProfileVO update(StoreProfileRequest request) {
        StoreProfile profile = getOrCreate();
        profile.setBusinessPhone(request.getBusinessPhone().trim());
        profile.setUpdatedBy(SecurityUtils.currentUserId());
        profile.setUpdatedAt(null);
        storeProfileMapper.updateById(profile);
        return get();
    }

    private StoreProfile getOrCreate() {
        StoreProfile profile = storeProfileMapper.selectById(PROFILE_ID);
        if (profile != null) {
            return profile;
        }
        StoreProfile created = new StoreProfile();
        created.setId(PROFILE_ID);
        created.setBusinessPhone(DEFAULT_BUSINESS_PHONE);
        try {
            storeProfileMapper.insert(created);
        } catch (DuplicateKeyException ignored) {
            // Another request created the singleton row first.
        }
        return storeProfileMapper.selectById(PROFILE_ID);
    }
}
