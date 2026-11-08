package com.flower.mall.module.metric.service;

import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.module.metric.dto.MetricConfigRequest;
import com.flower.mall.module.metric.dto.MetricConfigVO;
import com.flower.mall.module.metric.entity.MetricConfig;
import com.flower.mall.module.metric.mapper.MetricConfigMapper;
import com.flower.mall.support.CacheKeys;
import com.flower.mall.support.CacheService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class MetricConfigService {

    private static final int CONFIG_ID = 1;
    private static final BigDecimal DEFAULT_PRICE_MID = new BigDecimal("100.00");
    private static final BigDecimal DEFAULT_PRICE_HIGH = new BigDecimal("300.00");
    private static final int DEFAULT_STOCK_LOW = 10;
    private static final int DEFAULT_STOCK_HIGH = 50;

    private final MetricConfigMapper configMapper;
    private final CacheService cacheService;
    private volatile MetricConfig cachedConfig;

    public MetricConfigVO get() {
        return MetricConfigVO.from(load());
    }

    @Transactional
    public MetricConfigVO update(MetricConfigRequest request) {
        if (request.getPriceHighThreshold().compareTo(request.getPriceMidThreshold()) <= 0) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "中端/高端分界必须大于平价/中端分界");
        }
        if (request.getStockHighThreshold() <= request.getStockLowThreshold()) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "过量库存阈值必须大于低库存阈值");
        }
        getOrCreate();
        MetricConfig config = new MetricConfig();
        config.setId(CONFIG_ID);
        config.setPriceMidThreshold(request.getPriceMidThreshold());
        config.setPriceHighThreshold(request.getPriceHighThreshold());
        config.setStockLowThreshold(request.getStockLowThreshold());
        config.setStockHighThreshold(request.getStockHighThreshold());
        configMapper.updateById(config);
        cachedConfig = config;
        cacheService.evict(CacheKeys.HOT_PRODUCTS);
        cacheService.evictByPrefix(CacheKeys.PRODUCT_DETAIL_PREFIX);
        return MetricConfigVO.from(config);
    }

    public String priceBand(BigDecimal price) {
        if (price == null) {
            return "未知";
        }
        MetricConfig config = load();
        if (price.compareTo(config.getPriceMidThreshold()) < 0) {
            return "平价";
        }
        if (price.compareTo(config.getPriceHighThreshold()) < 0) {
            return "中端";
        }
        return "高端";
    }

    public int lowStockThreshold() {
        return load().getStockLowThreshold();
    }

    public int highStockThreshold() {
        return load().getStockHighThreshold();
    }

    private MetricConfig load() {
        MetricConfig config = cachedConfig;
        if (config == null) {
            config = getOrCreate();
            cachedConfig = config;
        }
        return config;
    }

    private MetricConfig getOrCreate() {
        MetricConfig config = configMapper.selectById(CONFIG_ID);
        if (config != null) {
            return config;
        }
        config = new MetricConfig();
        config.setId(CONFIG_ID);
        config.setPriceMidThreshold(DEFAULT_PRICE_MID);
        config.setPriceHighThreshold(DEFAULT_PRICE_HIGH);
        config.setStockLowThreshold(DEFAULT_STOCK_LOW);
        config.setStockHighThreshold(DEFAULT_STOCK_HIGH);
        try {
            configMapper.insert(config);
        } catch (DuplicateKeyException ignored) {
            return configMapper.selectById(CONFIG_ID);
        }
        return config;
    }
}
