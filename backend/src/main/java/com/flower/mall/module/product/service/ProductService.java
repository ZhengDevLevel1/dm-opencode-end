package com.flower.mall.module.product.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.flower.mall.common.enums.ProductStatus;
import com.flower.mall.common.enums.SeasonSuitability;
import com.flower.mall.common.enums.TagType;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.config.AppProperties;
import com.flower.mall.module.inventory.service.InventoryService;
import com.flower.mall.module.product.dto.ProductQuery;
import com.flower.mall.module.product.dto.ProductSaveRequest;
import com.flower.mall.module.product.dto.ProductVO;
import com.flower.mall.module.product.entity.Product;
import com.flower.mall.common.api.PageResult;
import com.flower.mall.module.metric.service.MetricConfigService;
import com.flower.mall.module.product.mapper.ProductMapper;
import com.flower.mall.module.tag.service.TagService;
import com.flower.mall.support.CacheKeys;
import com.flower.mall.support.CacheService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductMapper productMapper;
    private final InventoryService inventoryService;
    private final CacheService cacheService;
    private final AppProperties properties;
    private final TagService tagService;
    private final MetricConfigService metricConfigService;

    public IPage<Product> page(ProductQuery query, boolean adminView) {
        long page = Math.max(query.getPage(), 1);
        long size = Math.min(Math.max(query.getSize(), 1), 100);
        LambdaQueryWrapper<Product> wrapper = Wrappers.<Product>lambdaQuery();
        if (adminView) {
            wrapper.eq(StringUtils.hasText(query.getStatus()), Product::getStatus, query.getStatus());
        } else {
            wrapper.eq(Product::getStatus, ProductStatus.ON_SALE.name());
        }
        if (Boolean.TRUE.equals(query.getLowStock())) {
            wrapper.eq(Product::getStatus, ProductStatus.ON_SALE.name())
                    .lt(Product::getStock, metricConfigService.lowStockThreshold());
        }
        if (StringUtils.hasText(query.getStockLevel())) {
            int low = metricConfigService.lowStockThreshold();
            int high = metricConfigService.highStockThreshold();
            switch (query.getStockLevel().toUpperCase(Locale.ROOT)) {
                case "LOW" -> wrapper.lt(Product::getStock, low);
                case "SUFFICIENT" -> wrapper.ge(Product::getStock, low)
                        .lt(Product::getStock, high);
                case "OVERSTOCK" -> wrapper.ge(Product::getStock, high);
                default -> {
                    // ALL 不增加库存条件。
                }
            }
        }
        if (StringUtils.hasText(query.getKeyword())) {
            String keyword = query.getKeyword().trim();
            wrapper.and(w -> w.like(Product::getName, keyword)
                    .or().like(Product::getFlowerMeaning, keyword)
                    .or().like(Product::getOccasionTags, keyword)
                    .or().like(Product::getFestivalTags, keyword));
        }
        wrapper.eq(StringUtils.hasText(query.getCategory()), Product::getCategory, query.getCategory());
        wrapper.like(StringUtils.hasText(query.getOccasion()), Product::getOccasionTags, query.getOccasion());
        wrapper.like(StringUtils.hasText(query.getFestival()), Product::getFestivalTags, query.getFestival());
        if (StringUtils.hasText(query.getSeason())) {
            SeasonSuitability season;
            try {
                season = SeasonSuitability.valueOf(query.getSeason().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException exception) {
                throw BusinessException.of(ErrorCode.BAD_REQUEST, "季节参数不合法");
            }
            wrapper.and(w -> w.eq(Product::getSeasonSuitability, season.name())
                    .or().eq(Product::getSeasonSuitability, SeasonSuitability.ALL.name()));
        }
        wrapper.ge(query.getMinPrice() != null, Product::getPrice, query.getMinPrice());
        wrapper.le(query.getMaxPrice() != null, Product::getPrice, query.getMaxPrice());
        applySort(wrapper, query.getSort());
        return productMapper.selectPage(new Page<>(page, size), wrapper);
    }

    public PageResult<ProductVO> pageVO(ProductQuery query, boolean adminView) {
        return PageResult.of(page(query, adminView), this::toVO);
    }

    public ProductVO detail(Long productId, boolean adminView) {
        if (adminView) {
            return toVO(getRequired(productId));
        }
        String cacheKey = CacheKeys.productDetail(productId);
        return cacheService.get(cacheKey, new TypeReference<ProductVO>() {
        }).orElseGet(() -> {
            Product product = getRequired(productId);
            if (!ProductStatus.ON_SALE.name().equals(product.getStatus())) {
                throw BusinessException.of(ErrorCode.PRODUCT_OFF_SHELF);
            }
            ProductVO vo = toVO(product);
            cacheService.put(cacheKey, vo,
                    Duration.ofSeconds(properties.getCache().getProductDetailSeconds()));
            return vo;
        });
    }

    public List<ProductVO> hotProducts() {
        return cacheService.get(CacheKeys.HOT_PRODUCTS, new TypeReference<List<ProductVO>>() {
        }).orElseGet(() -> {
            int limit = properties.getCache().getHotProductsLimit();
            List<Product> products = productMapper.selectList(Wrappers.<Product>lambdaQuery()
                    .eq(Product::getStatus, ProductStatus.ON_SALE.name())
                    .orderByDesc(Product::getSalesCount)
                    .last("LIMIT " + limit));
            List<ProductVO> result = products.stream().map(this::toVO).toList();
            cacheService.put(CacheKeys.HOT_PRODUCTS, result,
                    Duration.ofSeconds(properties.getCache().getHotProductsSeconds()));
            return result;
        });
    }

    public Product getRequired(Long productId) {
        Product product = productMapper.selectById(productId);
        if (product == null) {
            throw BusinessException.of(ErrorCode.PRODUCT_NOT_FOUND);
        }
        return product;
    }

    @Transactional
    public ProductVO create(ProductSaveRequest request) {
        Product product = new Product();
        applyRequest(product, request);
        product.setSalesCount(0);
        product.setRatingAvg(BigDecimal.ZERO);
        product.setRatingCount(0);
        product.setStatus(initialStatus(request));
        product.setVersion(0);
        productMapper.insert(product);
        inventoryService.recordInitialStock(product);
        evictCaches(product.getId());
        return toVO(productMapper.selectById(product.getId()));
    }

    @Transactional
    public ProductVO update(Long productId, ProductSaveRequest request) {
        Product existing = getRequired(productId);
        int stockBefore = existing.getStock();
        Integer targetStock = request.getStock();
        Product product = new Product();
        product.setId(productId);
        applyRequest(product, request);
        if (targetStock != null && targetStock <= 0) {
            // 库存为0的商品不允许保持上架，保存时自动下架。
            product.setStatus(ProductStatus.OFF_SHELF.name());
        } else if (StringUtils.hasText(request.getStatus())) {
            product.setStatus(ProductStatus.valueOf(request.getStatus()).name());
        }
        product.setStock(existing.getStock());
        product.setVersion(existing.getVersion());
        int updated = productMapper.updateById(product);
        if (updated == 0) {
            throw BusinessException.of(ErrorCode.CONFLICT, "商品已被其他操作修改，请刷新后重试");
        }
        if (targetStock != null && targetStock != stockBefore) {
            inventoryService.adjustStock(productId, targetStock - stockBefore, "商品编辑调整库存");
        }
        evictCaches(productId);
        return toVO(productMapper.selectById(productId));
    }

    @Transactional
    public ProductVO updateStatus(Long productId, String status) {
        ProductStatus target;
        try {
            target = ProductStatus.valueOf(status);
        } catch (IllegalArgumentException exception) {
            throw BusinessException.of(ErrorCode.PRODUCT_STATUS_INVALID);
        }
        Product existing = getRequired(productId);
        if (target == ProductStatus.ON_SALE && existing.getStock() != null && existing.getStock() <= 0) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "库存为0，无法上架，请先补充库存");
        }
        if (target.name().equals(existing.getStatus())) {
            return toVO(existing);
        }
        Product update = new Product();
        update.setId(productId);
        update.setStatus(target.name());
        update.setVersion(existing.getVersion());
        if (productMapper.updateById(update) == 0) {
            throw BusinessException.of(ErrorCode.CONFLICT, "商品已被其他操作修改，请刷新后重试");
        }
        evictCaches(productId);
        return toVO(productMapper.selectById(productId));
    }

    @Transactional
    public void delete(Long productId) {
        getRequired(productId);
        productMapper.deleteById(productId);
        evictCaches(productId);
    }

    private String initialStatus(ProductSaveRequest request) {
        if (request.getStock() != null && request.getStock() <= 0) {
            return ProductStatus.OFF_SHELF.name();
        }
        return StringUtils.hasText(request.getStatus())
                ? ProductStatus.valueOf(request.getStatus()).name()
                : ProductStatus.ON_SALE.name();
    }

    private void applyRequest(Product product, ProductSaveRequest request) {
        tagService.validateSelection(TagType.OCCASION, request.getOccasionTags());
        tagService.validateSelection(TagType.FESTIVAL, request.getFestivalTags());
        tagService.validateSelection(TagType.MEANING, request.getFlowerMeaning());
        product.setName(request.getName());
        product.setCategory(request.getCategory());
        product.setFlowerMeaning(request.getFlowerMeaning());
        product.setOccasionTags(request.getOccasionTags());
        product.setFestivalTags(request.getFestivalTags());
        product.setPrice(request.getPrice());
        product.setOriginalPrice(request.getOriginalPrice());
        product.setStock(request.getStock());
        product.setImageUrl(request.getImageUrl());
        product.setDescription(request.getDescription());
        product.setSeasonSuitability(SeasonSuitability.valueOf(request.getSeasonSuitability()).name());
    }

    private ProductVO toVO(Product product) {
        ProductVO vo = ProductVO.from(product);
        vo.setPriceBand(metricConfigService.priceBand(product.getPrice()));
        return vo;
    }

    private void applySort(LambdaQueryWrapper<Product> wrapper, String sort) {
        String value = StringUtils.hasText(sort) ? sort : "sales_desc";
        switch (value) {
            case "price_asc" -> wrapper.orderByAsc(Product::getPrice);
            case "price_desc" -> wrapper.orderByDesc(Product::getPrice);
            case "newest" -> wrapper.orderByDesc(Product::getCreatedAt);
            case "rating_desc" -> wrapper.orderByDesc(Product::getRatingAvg);
            case "stock_asc" -> wrapper.orderByAsc(Product::getStock);
            case "stock_desc" -> wrapper.orderByDesc(Product::getStock);
            default -> wrapper.orderByDesc(Product::getSalesCount);
        }
        wrapper.orderByDesc(Product::getId);
    }

    private void evictCaches(Long productId) {
        cacheService.evict(CacheKeys.productDetail(productId));
        cacheService.evict(CacheKeys.HOT_PRODUCTS);
    }
}
