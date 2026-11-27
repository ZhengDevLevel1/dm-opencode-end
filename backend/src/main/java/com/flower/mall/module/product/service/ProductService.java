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
import com.flower.mall.module.catalog.dto.FlowerMaterialVO;
import com.flower.mall.module.catalog.entity.FlowerMaterial;
import com.flower.mall.module.catalog.mapper.FlowerMaterialMapper;
import com.flower.mall.module.inventory.service.InventoryService;
import com.flower.mall.module.product.dto.ProductAiCopyUpdate;
import com.flower.mall.module.product.dto.ProductQuery;
import com.flower.mall.module.product.dto.ProductSaveRequest;
import com.flower.mall.module.product.dto.ProductSpecFlowerSaveRequest;
import com.flower.mall.module.product.dto.ProductSpecFlowerVO;
import com.flower.mall.module.product.dto.ProductSpecSaveRequest;
import com.flower.mall.module.product.dto.ProductSpecVO;
import com.flower.mall.module.product.dto.ProductVO;
import com.flower.mall.module.product.entity.Product;
import com.flower.mall.module.product.entity.ProductFlowerMaterial;
import com.flower.mall.module.product.entity.ProductImage;
import com.flower.mall.module.product.entity.ProductSpec;
import com.flower.mall.module.product.entity.ProductSpecFlower;
import com.flower.mall.module.product.mapper.ProductFlowerMaterialMapper;
import com.flower.mall.module.product.mapper.ProductImageMapper;
import com.flower.mall.module.product.mapper.ProductSpecFlowerMapper;
import com.flower.mall.module.product.mapper.ProductSpecMapper;
import com.flower.mall.common.api.PageResult;
import com.flower.mall.module.metric.service.MetricConfigService;
import com.flower.mall.module.product.mapper.ProductMapper;
import com.flower.mall.module.recommendation.service.RecommendationCatalogCache;
import com.flower.mall.module.recommendation.service.RecommendationService;
import com.flower.mall.module.tag.service.TagService;
import com.flower.mall.support.CacheKeys;
import com.flower.mall.support.CacheService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductMapper productMapper;
    private final InventoryService inventoryService;
    private final CacheService cacheService;
    private final RecommendationCatalogCache catalogCache;
    private final RecommendationService recommendationService;
    private final AppProperties properties;
    private final TagService tagService;
    private final MetricConfigService metricConfigService;
    private final ProductImageMapper productImageMapper;
    private final ProductFlowerMaterialMapper productFlowerMaterialMapper;
    private final ProductSpecMapper productSpecMapper;
    private final ProductSpecFlowerMapper productSpecFlowerMapper;
    private final FlowerMaterialMapper flowerMaterialMapper;

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
        if (useRecommendSort(query, adminView)) {
            return recommendPage(query, wrapper);
        }
        applySort(wrapper, query.getSort());
        return productMapper.selectPage(new Page<>(page, size), wrapper);
    }

    private boolean useRecommendSort(ProductQuery query, boolean adminView) {
        return !adminView
                && !StringUtils.hasText(query.getKeyword())
                && (!StringUtils.hasText(query.getSort())
                || "recommend".equalsIgnoreCase(query.getSort()));
    }

    private IPage<Product> recommendPage(ProductQuery query, LambdaQueryWrapper<Product> wrapper) {
        long page = Math.max(query.getPage(), 1);
        long size = Math.min(Math.max(query.getSize(), 1), 100);
        long total = productMapper.selectCount(wrapper);
        int scanLimit = Math.max(properties.getRecommendation().getCatalogScanLimit(), 1);
        if (total > scanLimit) {
            wrapper.orderByDesc(Product::getSalesCount)
                    .orderByDesc(Product::getId)
                    .last("LIMIT " + scanLimit);
        }
        List<Product> filtered = productMapper.selectList(wrapper);
        Map<Long, Product> byId = filtered.stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));
        List<Product> ranked = new ArrayList<>();
        Set<Long> added = new HashSet<>();
        for (Long productId : recommendationService.rankCatalog(filtered)) {
            Product product = byId.get(productId);
            if (product != null && added.add(productId)) {
                ranked.add(product);
            }
        }
        for (Product product : filtered) {
            if (added.add(product.getId())) {
                ranked.add(product);
            }
        }
        int from = (int) Math.min((page - 1) * size, ranked.size());
        int to = (int) Math.min(from + size, ranked.size());
        Page<Product> result = new Page<>(page, size, total);
        result.setRecords(ranked.subList(from, to));
        return result;
    }

    public PageResult<ProductVO> pageVO(ProductQuery query, boolean adminView) {
        IPage<Product> page = page(query, adminView);
        if (adminView) {
            return PageResult.of(page, product -> toDetailVO(product, true));
        }
        return PageResult.of(page, this::toSummaryVO);
    }

    public ProductVO detail(Long productId, boolean adminView) {
        if (adminView) {
            return toDetailVO(getRequired(productId), true);
        }
        String cacheKey = CacheKeys.productDetail(productId);
        return cacheService.get(cacheKey, new TypeReference<ProductVO>() {
        }).orElseGet(() -> {
            Product product = getRequired(productId);
            if (!ProductStatus.ON_SALE.name().equals(product.getStatus())) {
                throw BusinessException.of(ErrorCode.PRODUCT_OFF_SHELF);
            }
            ProductVO vo = toDetailVO(product, false);
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
            List<ProductVO> result = products.stream().map(this::toSummaryVO).toList();
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
        saveProductDetails(product.getId(), request, true);
        inventoryService.recordInitialStock(product);
        evictCaches(product.getId());
        return toDetailVO(productMapper.selectById(product.getId()), true);
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
        saveProductDetails(productId, request, false);
        evictCaches(productId);
        return toDetailVO(productMapper.selectById(productId), true);
    }

    @Transactional
    public ProductVO applyAiCopy(Long productId, ProductAiCopyUpdate update) {
        Product existing = getRequired(productId);
        Product product = new Product();
        product.setId(productId);
        product.setVersion(existing.getVersion());
        boolean changed = false;
        if (update.applyTitle() && StringUtils.hasText(update.title())) {
            product.setName(truncate(update.title().trim(), 100));
            changed = true;
        }
        if (update.applyDescription() && StringUtils.hasText(update.description())) {
            product.setDescription(truncate(update.description().trim(), 2000));
            changed = true;
        }
        if (update.applyTags()) {
            String tags = joinLimited(update.tags(), 255);
            if (StringUtils.hasText(tags)) {
                product.setAiTags(tags);
                changed = true;
            }
        }
        if (update.applySellingPoints()) {
            String sellingPoints = joinLimited(update.sellingPoints(), 500);
            if (StringUtils.hasText(sellingPoints)) {
                product.setAiSellingPoints(sellingPoints);
                changed = true;
            }
        }
        if (!changed) {
            return toDetailVO(existing, true);
        }
        if (productMapper.updateById(product) == 0) {
            throw BusinessException.of(ErrorCode.CONFLICT, "商品已被其他操作修改，请刷新后重试");
        }
        evictCaches(productId);
        return toDetailVO(productMapper.selectById(productId), true);
    }

    private String truncate(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    private String joinLimited(List<String> values, int maxLength) {
        if (values == null || values.isEmpty()) {
            return "";
        }
        StringBuilder builder = new StringBuilder();
        Set<String> seen = new HashSet<>();
        for (String value : values) {
            if (!StringUtils.hasText(value)) {
                continue;
            }
            String normalized = value.trim();
            if (!seen.add(normalized)) {
                continue;
            }
            int extra = builder.length() == 0 ? normalized.length() : normalized.length() + 1;
            if (builder.length() + extra > maxLength) {
                break;
            }
            if (builder.length() > 0) {
                builder.append(',');
            }
            builder.append(normalized);
        }
        return builder.toString();
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
            return toDetailVO(existing, true);
        }
        Product update = new Product();
        update.setId(productId);
        update.setStatus(target.name());
        update.setVersion(existing.getVersion());
        if (productMapper.updateById(update) == 0) {
            throw BusinessException.of(ErrorCode.CONFLICT, "商品已被其他操作修改，请刷新后重试");
        }
        evictCaches(productId);
        return toDetailVO(productMapper.selectById(productId), true);
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
        String primaryImage = primaryImage(request);
        if (StringUtils.hasText(primaryImage)) {
            product.setImageUrl(primaryImage);
        } else if (product.getId() == null) {
            product.setImageUrl(null);
        }
        product.setDescription(request.getDescription());
        product.setGiftAccessories(request.getGiftAccessories() == null
                ? null : request.getGiftAccessories().trim());
        product.setCareGuide(request.getCareGuide() == null
                ? null : request.getCareGuide().trim());
        product.setSeasonSuitability(SeasonSuitability.valueOf(request.getSeasonSuitability()).name());
    }

    private String primaryImage(ProductSaveRequest request) {
        if (request.getImageUrls() != null) {
            return request.getImageUrls().stream()
                    .filter(StringUtils::hasText)
                    .map(String::trim)
                    .findFirst()
                    .orElse(null);
        }
        return StringUtils.hasText(request.getImageUrl()) ? request.getImageUrl().trim() : null;
    }

    private void saveProductDetails(Long productId, ProductSaveRequest request, boolean create) {
        saveImages(productId, request);
        saveFlowerMaterials(productId, request);
        saveSpecs(productId, request);
    }

    private void saveImages(Long productId, ProductSaveRequest request) {
        List<String> urls;
        if (request.getImageUrls() != null) {
            urls = normalizeImages(request.getImageUrls());
        } else if (StringUtils.hasText(request.getImageUrl())) {
            urls = List.of(request.getImageUrl().trim());
        } else {
            return;
        }
        productImageMapper.delete(Wrappers.<ProductImage>lambdaQuery()
                .eq(ProductImage::getProductId, productId));
        for (int index = 0; index < urls.size(); index++) {
            ProductImage image = new ProductImage();
            image.setProductId(productId);
            image.setImageUrl(urls.get(index));
            image.setSortOrder(index * 10);
            productImageMapper.insert(image);
        }
        if (urls.isEmpty()) {
            productMapper.update(null, Wrappers.<Product>lambdaUpdate()
                    .eq(Product::getId, productId)
                    .set(Product::getImageUrl, ""));
        }
    }

    private List<String> normalizeImages(List<String> values) {
        LinkedHashSet<String> urls = new LinkedHashSet<>();
        for (String value : values) {
            if (!StringUtils.hasText(value)) {
                continue;
            }
            urls.add(value.trim());
            if (urls.size() >= 8) {
                break;
            }
        }
        return List.copyOf(urls);
    }

    private void saveFlowerMaterials(Long productId, ProductSaveRequest request) {
        if (request.getFlowerMaterialIds() == null) {
            return;
        }
        List<Long> materialIds = request.getFlowerMaterialIds().stream()
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (!materialIds.isEmpty()) {
            List<FlowerMaterial> materials = flowerMaterialMapper.selectBatchIds(materialIds);
            if (materials.size() != materialIds.size()) {
                throw BusinessException.of(ErrorCode.BAD_REQUEST, "部分花材不存在，请刷新后重试");
            }
        }
        productFlowerMaterialMapper.delete(Wrappers.<ProductFlowerMaterial>lambdaQuery()
                .eq(ProductFlowerMaterial::getProductId, productId));
        for (int index = 0; index < materialIds.size(); index++) {
            ProductFlowerMaterial link = new ProductFlowerMaterial();
            link.setProductId(productId);
            link.setMaterialId(materialIds.get(index));
            link.setSortOrder(index * 10);
            productFlowerMaterialMapper.insert(link);
        }
    }

    private void saveSpecs(Long productId, ProductSaveRequest request) {
        if (request.getSpecs() == null) {
            return;
        }
        List<ProductSpec> existing = productSpecMapper.selectList(Wrappers.<ProductSpec>lambdaQuery()
                .eq(ProductSpec::getProductId, productId)
                .orderByAsc(ProductSpec::getSortOrder)
                .orderByAsc(ProductSpec::getId));
        Map<Long, ProductSpec> existingById = existing.stream()
                .collect(Collectors.toMap(ProductSpec::getId, Function.identity()));
        Set<Long> allowedMaterialIds = currentMaterialIds(productId);
        Product product = productMapper.selectById(productId);
        BigDecimal fallbackPrice = product == null ? BigDecimal.ZERO : product.getPrice();
        Set<String> names = new HashSet<>();
        Set<Long> keptIds = new HashSet<>();
        int order = 0;
        for (ProductSpecSaveRequest specRequest : request.getSpecs()) {
            String name = specRequest.getName() == null ? "" : specRequest.getName().trim();
            if (!StringUtils.hasText(name)) {
                throw BusinessException.of(ErrorCode.BAD_REQUEST, "规格名称不能为空");
            }
            if (!names.add(name)) {
                throw BusinessException.of(ErrorCode.BAD_REQUEST, "规格名称「" + name + "」重复");
            }
            ProductSpec spec;
            if (specRequest.getId() != null) {
                spec = existingById.get(specRequest.getId());
                if (spec == null) {
                    throw BusinessException.of(ErrorCode.BAD_REQUEST, "规格不存在或不属于当前商品");
                }
            } else {
                spec = new ProductSpec();
                spec.setProductId(productId);
            }
            spec.setName(name);
            spec.setDescription(StringUtils.hasText(specRequest.getDescription())
                    ? specRequest.getDescription().trim() : null);
            spec.setPrice(specRequest.getPrice());
            spec.setOriginalPrice(specRequest.getOriginalPrice());
            spec.setSortOrder(specRequest.getSortOrder() == null ? order * 10 : specRequest.getSortOrder());
            spec.setEnabled(specRequest.getEnabled() == null ? 1 : specRequest.getEnabled());
            if (spec.getId() == null) {
                productSpecMapper.insert(spec);
            } else {
                productSpecMapper.updateById(spec);
            }
            keptIds.add(spec.getId());
            productSpecFlowerMapper.delete(Wrappers.<ProductSpecFlower>lambdaQuery()
                    .eq(ProductSpecFlower::getSpecId, spec.getId()));
            Set<Long> specMaterialIds = new HashSet<>();
            if (specRequest.getFlowers() != null) {
                for (ProductSpecFlowerSaveRequest flower : specRequest.getFlowers()) {
                    if (!specMaterialIds.add(flower.getMaterialId())) {
                        throw BusinessException.of(ErrorCode.BAD_REQUEST, "同一规格中的花材不能重复");
                    }
                    if (!allowedMaterialIds.contains(flower.getMaterialId())) {
                        throw BusinessException.of(ErrorCode.BAD_REQUEST,
                                "规格中的花材必须先在商品花材中选择");
                    }
                    ProductSpecFlower entity = new ProductSpecFlower();
                    entity.setSpecId(spec.getId());
                    entity.setMaterialId(flower.getMaterialId());
                    entity.setQuantity(flower.getQuantity());
                    productSpecFlowerMapper.insert(entity);
                }
            }
            order++;
        }
        List<Long> removedIds = existing.stream()
                .map(ProductSpec::getId)
                .filter(id -> !keptIds.contains(id))
                .toList();
        if (!removedIds.isEmpty()) {
            productSpecFlowerMapper.delete(Wrappers.<ProductSpecFlower>lambdaQuery()
                    .in(ProductSpecFlower::getSpecId, removedIds));
            productSpecMapper.deleteBatchIds(removedIds);
        }
    }

    private Set<Long> currentMaterialIds(Long productId) {
        return productFlowerMaterialMapper.selectList(Wrappers.<ProductFlowerMaterial>lambdaQuery()
                        .eq(ProductFlowerMaterial::getProductId, productId))
                .stream()
                .map(ProductFlowerMaterial::getMaterialId)
                .collect(Collectors.toSet());
    }

    private ProductVO toSummaryVO(Product product) {
        ProductVO vo = ProductVO.from(product);
        vo.setPriceBand(metricConfigService.priceBand(product.getPrice()));
        vo.setImageUrls(StringUtils.hasText(product.getImageUrl())
                ? List.of(product.getImageUrl())
                : List.of());
        return vo;
    }

    private ProductVO toDetailVO(Product product, boolean adminView) {
        ProductVO vo = toSummaryVO(product);
        List<ProductImage> images = productImageMapper.selectList(Wrappers.<ProductImage>lambdaQuery()
                .eq(ProductImage::getProductId, product.getId())
                .orderByAsc(ProductImage::getSortOrder)
                .orderByAsc(ProductImage::getId));
        List<String> imageUrls = images.stream()
                .map(ProductImage::getImageUrl)
                .filter(StringUtils::hasText)
                .toList();
        if (imageUrls.isEmpty() && StringUtils.hasText(product.getImageUrl())) {
            imageUrls = List.of(product.getImageUrl());
        }
        vo.setImageUrls(imageUrls);

        List<ProductFlowerMaterial> links = productFlowerMaterialMapper.selectList(
                Wrappers.<ProductFlowerMaterial>lambdaQuery()
                        .eq(ProductFlowerMaterial::getProductId, product.getId())
                        .orderByAsc(ProductFlowerMaterial::getSortOrder)
                        .orderByAsc(ProductFlowerMaterial::getId));
        Map<Long, FlowerMaterial> materialMap = loadMaterials(
                links.stream().map(ProductFlowerMaterial::getMaterialId).toList());
        List<FlowerMaterialVO> materials = links.stream()
                .map(link -> materialMap.get(link.getMaterialId()))
                .filter(material -> material != null
                        && (adminView || (material.getEnabled() != null && material.getEnabled() == 1)))
                .map(FlowerMaterialVO::from)
                .toList();
        vo.setFlowerMaterials(materials);

        List<ProductSpec> specs = productSpecMapper.selectList(Wrappers.<ProductSpec>lambdaQuery()
                .eq(ProductSpec::getProductId, product.getId())
                .orderByAsc(ProductSpec::getSortOrder)
                .orderByAsc(ProductSpec::getId));
        if (!adminView) {
            specs = specs.stream()
                    .filter(spec -> spec.getEnabled() != null && spec.getEnabled() == 1)
                    .toList();
        }
        List<Long> specIds = specs.stream().map(ProductSpec::getId).toList();
        Map<Long, List<ProductSpecFlower>> specFlowers = specIds.isEmpty()
                ? Map.of()
                : productSpecFlowerMapper.selectList(Wrappers.<ProductSpecFlower>lambdaQuery()
                        .in(ProductSpecFlower::getSpecId, specIds)
                        .orderByAsc(ProductSpecFlower::getId))
                .stream()
                .collect(Collectors.groupingBy(ProductSpecFlower::getSpecId));
        Map<Long, FlowerMaterial> specMaterialMap = loadMaterials(specFlowers.values().stream()
                .flatMap(List::stream)
                .map(ProductSpecFlower::getMaterialId)
                .distinct()
                .toList());
        List<ProductSpecVO> specVOs = specs.stream()
                .map(spec -> toSpecVO(spec, specFlowers.getOrDefault(spec.getId(), List.of()),
                        specMaterialMap, product.getPrice(), adminView))
                .toList();
        vo.setSpecs(specVOs);
        return vo;
    }

    private Map<Long, FlowerMaterial> loadMaterials(List<Long> materialIds) {
        List<Long> ids = materialIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }
        return flowerMaterialMapper.selectBatchIds(ids).stream()
                .collect(Collectors.toMap(FlowerMaterial::getId, Function.identity()));
    }

    private ProductSpecVO toSpecVO(ProductSpec spec, List<ProductSpecFlower> flowers,
                                   Map<Long, FlowerMaterial> materialMap, BigDecimal fallbackPrice,
                                   boolean adminView) {
        List<ProductSpecFlowerVO> flowerVOs = flowers.stream()
                .map(flower -> {
                    FlowerMaterial material = materialMap.get(flower.getMaterialId());
                    if (material == null || (!adminView && (material.getEnabled() == null
                            || material.getEnabled() != 1))) {
                        return null;
                    }
                    return ProductSpecFlowerVO.builder()
                            .materialId(material.getId())
                            .name(material.getName())
                            .latinName(material.getLatinName())
                            .colorHex(material.getColorHex())
                            .imageUrl(material.getImageUrl())
                            .quantity(flower.getQuantity())
                            .build();
                })
                .filter(java.util.Objects::nonNull)
                .toList();
        int totalStems = flowerVOs.stream()
                .map(ProductSpecFlowerVO::getQuantity)
                .filter(java.util.Objects::nonNull)
                .mapToInt(Integer::intValue)
                .sum();
        BigDecimal effectivePrice = spec.getPrice() == null ? fallbackPrice : spec.getPrice();
        return ProductSpecVO.builder()
                .id(spec.getId())
                .name(spec.getName())
                .description(spec.getDescription())
                .price(spec.getPrice())
                .originalPrice(spec.getOriginalPrice())
                .effectivePrice(effectivePrice)
                .totalStems(totalStems)
                .enabled(spec.getEnabled() != null && spec.getEnabled() == 1)
                .sortOrder(spec.getSortOrder())
                .flowers(flowerVOs)
                .build();
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
        catalogCache.invalidate();
    }
}
