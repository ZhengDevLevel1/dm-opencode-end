package com.flower.mall.module.cart.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.flower.mall.common.enums.ProductStatus;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.common.util.SecurityUtils;
import com.flower.mall.module.cart.dto.CartAddRequest;
import com.flower.mall.module.cart.dto.CartItemVO;
import com.flower.mall.module.cart.dto.CartUpdateRequest;
import com.flower.mall.module.cart.entity.CartItem;
import com.flower.mall.module.cart.mapper.CartItemMapper;
import com.flower.mall.module.catalog.entity.WrapColor;
import com.flower.mall.module.catalog.mapper.WrapColorMapper;
import com.flower.mall.module.product.entity.Product;
import com.flower.mall.module.product.entity.ProductSpec;
import com.flower.mall.module.product.mapper.ProductMapper;
import com.flower.mall.module.product.mapper.ProductSpecMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CartService {

    private static final int MAX_QUANTITY_PER_PRODUCT = 99;

    private final CartItemMapper cartItemMapper;
    private final ProductMapper productMapper;
    private final ProductSpecMapper productSpecMapper;
    private final WrapColorMapper wrapColorMapper;

    public List<CartItemVO> list() {
        Long userId = SecurityUtils.currentUserId();
        List<CartItem> items = cartItemMapper.selectList(Wrappers.<CartItem>lambdaQuery()
                .eq(CartItem::getUserId, userId)
                .orderByDesc(CartItem::getId));
        return toVOList(items);
    }

    @Transactional
    public CartItemVO add(CartAddRequest request) {
        Long userId = SecurityUtils.currentUserId();

        Product product = productMapper.selectById(request.getProductId());

        validateProduct(product, request.getQuantity());
        ProductSpec spec = resolveSpec(product, request.getSpecId());
        WrapColor wrap = resolveWrap(request.getWrapId());
        Long specId = spec == null ? 0L : spec.getId();
        Long wrapId = wrap == null ? 0L : wrap.getId();

        CartItem existing = cartItemMapper.selectOne(Wrappers.<CartItem>lambdaQuery()
                .eq(CartItem::getUserId, userId)
                .eq(CartItem::getProductId, request.getProductId())
                .eq(CartItem::getSpecId, specId)
                .eq(CartItem::getWrapId, wrapId));

        int targetQuantity = request.getQuantity();

        if (existing != null) {
            targetQuantity = existing.getQuantity() + request.getQuantity();
            validateStock(product, targetQuantity);
            existing.setQuantity(targetQuantity);
            applyAttribution(existing, request.getAttribution());
            cartItemMapper.updateById(existing);
            return CartItemVO.from(existing, product, spec, wrap);
        }

        CartItem item = new CartItem();
        item.setUserId(userId);
        item.setProductId(request.getProductId());
        item.setSpecId(specId);
        item.setWrapId(wrapId);
        item.setQuantity(request.getQuantity());
        applyAttribution(item, request.getAttribution());
        cartItemMapper.insert(item);
        return CartItemVO.from(item, product, spec, wrap);
    }

    private ProductSpec resolveSpec(Product product, Long specId) {
        if (specId == null || specId <= 0) {
            return null;
        }
        ProductSpec spec = productSpecMapper.selectById(specId);
        if (spec == null || !product.getId().equals(spec.getProductId())
                || spec.getEnabled() == null || spec.getEnabled() != 1) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "所选规格不存在或已停用");
        }
        return spec;
    }

    private WrapColor resolveWrap(Long wrapId) {
        if (wrapId == null || wrapId <= 0) {
            return null;
        }
        WrapColor wrap = wrapColorMapper.selectById(wrapId);
        if (wrap == null || wrap.getEnabled() == null || wrap.getEnabled() != 1) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "所选包装色系不存在或已停用");
        }
        return wrap;
    }

    private void applyAttribution(CartItem item, com.flower.mall.module.cart.dto.CartAttribution attribution) {
        if (attribution == null) {
            return;
        }
        item.setSourceRequestId(attribution.getRequestId());
        item.setSourceEventId(attribution.getEventId());
        item.setSourceScene(attribution.getScene());
        item.setSourcePosition(attribution.getPosition());
        item.setSourceStrategy(attribution.getStrategy());
        item.setSourceExperimentId(attribution.getExperimentId());
        item.setSourceVariant(attribution.getVariant());
        item.setAttributedAt(java.time.LocalDateTime.now());
    }

    @Transactional
    public CartItemVO update(Long cartItemId, CartUpdateRequest request) {
        Long userId = SecurityUtils.currentUserId();
        CartItem item = getOwnedItem(cartItemId, userId);
        Product product = productMapper.selectById(item.getProductId());
        validateProduct(product, request.getQuantity());
        item.setQuantity(request.getQuantity());
        cartItemMapper.updateById(item);
        ProductSpec spec = item.getSpecId() == null || item.getSpecId() <= 0
                ? null : productSpecMapper.selectById(item.getSpecId());
        WrapColor wrap = item.getWrapId() == null || item.getWrapId() <= 0
                ? null : wrapColorMapper.selectById(item.getWrapId());
        return CartItemVO.from(item, product, spec, wrap);
    }

    @Transactional
    public void remove(Long cartItemId) {
        Long userId = SecurityUtils.currentUserId();
        CartItem item = getOwnedItem(cartItemId, userId);
        cartItemMapper.deleteById(item.getId());
    }

    @Transactional
    public void clear() {
        Long userId = SecurityUtils.currentUserId();
        cartItemMapper.delete(Wrappers.<CartItem>lambdaQuery().eq(CartItem::getUserId, userId));
    }

    public List<CartItem> selectOwnedItems(Long userId, Collection<Long> cartItemIds) {
        if (cartItemIds == null || cartItemIds.isEmpty()) {
            return cartItemMapper.selectList(Wrappers.<CartItem>lambdaQuery()
                    .eq(CartItem::getUserId, userId)
                    .orderByAsc(CartItem::getId));
        }
        return cartItemMapper.selectList(Wrappers.<CartItem>lambdaQuery()
                .eq(CartItem::getUserId, userId)
                .in(CartItem::getId, cartItemIds)
                .orderByAsc(CartItem::getId));
    }

    public void removeItems(List<CartItem> items) {
        if (items.isEmpty()) {
            return;
        }
        cartItemMapper.deleteBatchIds(items.stream().map(CartItem::getId).toList());
    }

    public List<CartItemVO> toVOList(List<CartItem> items) {
        if (items.isEmpty()) {
            return List.of();
        }
        List<Long> productIds = items.stream().map(CartItem::getProductId).distinct().toList();
        Map<Long, Product> products = productMapper.selectBatchIds(productIds).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));
        List<Long> specIds = items.stream()
                .map(CartItem::getSpecId)
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();
        Map<Long, ProductSpec> specs = specIds.isEmpty()
                ? Map.of()
                : productSpecMapper.selectBatchIds(specIds).stream()
                .collect(Collectors.toMap(ProductSpec::getId, Function.identity()));
        List<Long> wrapIds = items.stream()
                .map(CartItem::getWrapId)
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();
        Map<Long, WrapColor> wraps = wrapIds.isEmpty()
                ? Map.of()
                : wrapColorMapper.selectBatchIds(wrapIds).stream()
                .collect(Collectors.toMap(WrapColor::getId, Function.identity()));
        return items.stream()
                .filter(item -> products.containsKey(item.getProductId()))
                .map(item -> CartItemVO.from(item, products.get(item.getProductId()),
                        item.getSpecId() == null ? null : specs.get(item.getSpecId()),
                        item.getWrapId() == null ? null : wraps.get(item.getWrapId())))
                .toList();
    }

    private CartItem getOwnedItem(Long cartItemId, Long userId) {
        CartItem item = cartItemMapper.selectOne(Wrappers.<CartItem>lambdaQuery()
                .eq(CartItem::getId, cartItemId)
                .eq(CartItem::getUserId, userId));
        if (item == null) {
            throw BusinessException.of(ErrorCode.CART_ITEM_NOT_FOUND);
        }
        return item;
    }

    private void validateProduct(Product product, int quantity) {
        if (product == null) {
            throw BusinessException.of(ErrorCode.PRODUCT_NOT_FOUND);
        }
        if (!ProductStatus.ON_SALE.name().equals(product.getStatus())) {
            throw BusinessException.of(ErrorCode.PRODUCT_OFF_SHELF);
        }
        validateStock(product, quantity);
    }

    private void validateStock(Product product, int quantity) {
        if (quantity <= 0 || quantity > MAX_QUANTITY_PER_PRODUCT) {
            throw BusinessException.of(ErrorCode.CART_QUANTITY_INVALID,
                    "单件商品购买数量需在1-" + MAX_QUANTITY_PER_PRODUCT + "之间");
        }
        if (quantity > product.getStock()) {
            throw BusinessException.of(ErrorCode.STOCK_INSUFFICIENT,
                    "商品「" + product.getName() + "」库存不足，当前库存 " + product.getStock());
        }
    }
}
