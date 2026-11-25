package com.flower.mall.module.cart.dto;

import com.flower.mall.common.enums.ProductStatus;
import com.flower.mall.module.cart.entity.CartItem;
import com.flower.mall.module.catalog.entity.WrapColor;
import com.flower.mall.module.product.entity.Product;
import com.flower.mall.module.product.entity.ProductSpec;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItemVO {

    private Long id;
    private Long productId;
    private String productName;
    private String productImage;
    private Long specId;
    private String specName;
    private Long wrapId;
    private String wrapName;
    private BigDecimal price;
    private Integer quantity;
    private BigDecimal subtotal;
    private Integer stock;
    private String status;
    private String statusLabel;
    private boolean available;

    public static CartItemVO from(CartItem item, Product product) {
        return from(item, product, null, null);
    }

    public static CartItemVO from(CartItem item, Product product, ProductSpec spec, WrapColor wrap) {
        ProductStatus status = ProductStatus.valueOf(product.getStatus());
        boolean available = status == ProductStatus.ON_SALE && product.getStock() >= item.getQuantity();
        BigDecimal unitPrice = spec != null && spec.getPrice() != null
                ? spec.getPrice()
                : product.getPrice();
        return CartItemVO.builder()
                .id(item.getId())
                .productId(product.getId())
                .productName(product.getName())
                .productImage(product.getImageUrl())
                .specId(item.getSpecId() == null ? 0L : item.getSpecId())
                .specName(spec == null ? null : spec.getName())
                .wrapId(item.getWrapId() == null ? 0L : item.getWrapId())
                .wrapName(wrap == null ? null : wrap.getName())
                .price(unitPrice)
                .quantity(item.getQuantity())
                .subtotal(unitPrice.multiply(BigDecimal.valueOf(item.getQuantity())))
                .stock(product.getStock())
                .status(status.name())
                .statusLabel(status.getLabel())
                .available(available)
                .build();
    }
}
