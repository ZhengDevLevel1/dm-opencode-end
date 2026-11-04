package com.flower.mall.module.inventory.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.flower.mall.common.enums.InventoryChangeType;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.common.util.SecurityUtils;
import com.flower.mall.module.inventory.entity.InventoryRecord;
import com.flower.mall.module.inventory.mapper.InventoryRecordMapper;
import com.flower.mall.module.product.entity.Product;
import com.flower.mall.module.product.mapper.ProductMapper;
import com.flower.mall.security.AuthUser;
import com.flower.mall.support.CacheKeys;
import com.flower.mall.support.CacheService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final ProductMapper productMapper;
    private final InventoryRecordMapper inventoryRecordMapper;
    private final CacheService cacheService;

    @Transactional
    public InventoryRecord adjustStock(Long productId, int delta, String remark) {
        if (delta == 0) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "库存调整数量不能为0");
        }
        Product product = productMapper.selectById(productId);
        if (product == null) {
            throw BusinessException.of(ErrorCode.PRODUCT_NOT_FOUND);
        }
        int stockBefore = product.getStock();
        int stockAfter = stockBefore + delta;
        if (stockAfter < 0) {
            throw BusinessException.of(ErrorCode.STOCK_INSUFFICIENT,
                    "调整后库存不能小于0，当前库存为" + stockBefore);
        }
        int updated = productMapper.adjustStock(productId, delta);
        if (updated == 0) {
            throw BusinessException.of(ErrorCode.CONFLICT, "库存已被其他操作修改，请刷新后重试");
        }
        InventoryRecord record = recordMovement(productId, product.getName(), InventoryChangeType.MANUAL_ADJUST,
                delta, stockBefore, stockAfter, null,
                StringUtils.hasText(remark) ? remark : "人工库存调整");
        cacheService.evict(CacheKeys.productDetail(productId));
        cacheService.evict(CacheKeys.HOT_PRODUCTS);
        return record;
    }

    public void recordInitialStock(Product product) {
        if (product.getStock() != null && product.getStock() > 0) {
            recordMovement(product.getId(), product.getName(), InventoryChangeType.STOCK_IN,
                    product.getStock(), 0, product.getStock(), null, "商品建档初始入库");
        }
    }

    public InventoryRecord recordMovement(Long productId, String productName, InventoryChangeType changeType,
                                          int signedChange, int stockBefore, int stockAfter,
                                          String orderNo, String remark) {
        InventoryRecord record = new InventoryRecord();
        record.setProductId(productId);
        record.setProductName(productName);
        record.setChangeType(changeType.name());
        record.setChangeQuantity(signedChange);
        record.setStockBefore(stockBefore);
        record.setStockAfter(stockAfter);
        record.setOrderNo(orderNo);
        record.setRemark(remark);
        AuthUser authUser = SecurityUtils.currentUserOrNull();
        if (authUser != null) {
            record.setOperatorId(authUser.getId());
            record.setOperatorName(authUser.getUsername());
        } else {
            record.setOperatorName("system");
        }
        inventoryRecordMapper.insert(record);
        return record;
    }

    public IPage<InventoryRecord> page(long page, long size, Long productId, String changeType,
                                       String orderNo, LocalDateTime start, LocalDateTime end) {
        return inventoryRecordMapper.selectPage(new Page<>(page, size),
                Wrappers.<InventoryRecord>lambdaQuery()
                        .eq(productId != null, InventoryRecord::getProductId, productId)
                        .eq(StringUtils.hasText(changeType), InventoryRecord::getChangeType, changeType)
                        .eq(StringUtils.hasText(orderNo), InventoryRecord::getOrderNo, orderNo)
                        .ge(start != null, InventoryRecord::getCreatedAt, start)
                        .le(end != null, InventoryRecord::getCreatedAt, end)
                        .orderByDesc(InventoryRecord::getId));
    }
}
