package com.flower.mall.module.favorite.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.flower.mall.common.enums.ProductStatus;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.common.util.SecurityUtils;
import com.flower.mall.module.favorite.entity.UserFavorite;
import com.flower.mall.module.favorite.mapper.UserFavoriteMapper;
import com.flower.mall.module.product.dto.ProductVO;
import com.flower.mall.module.product.entity.Product;
import com.flower.mall.module.product.mapper.ProductMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final UserFavoriteMapper favoriteMapper;
    private final ProductMapper productMapper;

    public List<ProductVO> list() {
        Long userId = SecurityUtils.currentUserId();
        List<UserFavorite> favorites = favoriteMapper.selectList(Wrappers.<UserFavorite>lambdaQuery()
                .eq(UserFavorite::getUserId, userId)
                .orderByDesc(UserFavorite::getId));
        if (favorites.isEmpty()) {
            return List.of();
        }
        List<Long> productIds = favorites.stream().map(UserFavorite::getProductId).distinct().toList();
        Map<Long, Product> products = productMapper.selectBatchIds(productIds).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));
        return favorites.stream()
                .map(favorite -> products.get(favorite.getProductId()))
                .filter(product -> product != null && ProductStatus.ON_SALE.name().equals(product.getStatus()))
                .map(ProductVO::from)
                .toList();
    }

    @Transactional
    public void add(Long productId) {
        Long userId = SecurityUtils.currentUserId();
        Product product = productMapper.selectById(productId);
        if (product == null) {
            throw BusinessException.of(ErrorCode.PRODUCT_NOT_FOUND);
        }
        if (!ProductStatus.ON_SALE.name().equals(product.getStatus())) {
            throw BusinessException.of(ErrorCode.PRODUCT_OFF_SHELF);
        }
        Long count = favoriteMapper.selectCount(Wrappers.<UserFavorite>lambdaQuery()
                .eq(UserFavorite::getUserId, userId)
                .eq(UserFavorite::getProductId, productId));
        if (count > 0) {
            return;
        }
        UserFavorite favorite = new UserFavorite();
        favorite.setUserId(userId);
        favorite.setProductId(productId);
        favoriteMapper.insert(favorite);
    }

    @Transactional
    public void remove(Long productId) {
        Long userId = SecurityUtils.currentUserId();
        favoriteMapper.delete(Wrappers.<UserFavorite>lambdaQuery()
                .eq(UserFavorite::getUserId, userId)
                .eq(UserFavorite::getProductId, productId));
    }
}
