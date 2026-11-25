package com.flower.mall.module.catalog.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.module.catalog.dto.FlowerMaterialSaveRequest;
import com.flower.mall.module.catalog.dto.FlowerMaterialVO;
import com.flower.mall.module.catalog.dto.WrapColorSaveRequest;
import com.flower.mall.module.catalog.dto.WrapColorVO;
import com.flower.mall.module.catalog.entity.FlowerMaterial;
import com.flower.mall.module.catalog.entity.WrapColor;
import com.flower.mall.module.catalog.mapper.FlowerMaterialMapper;
import com.flower.mall.module.catalog.mapper.WrapColorMapper;
import com.flower.mall.support.CacheKeys;
import com.flower.mall.support.CacheService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CatalogService {

    private final FlowerMaterialMapper flowerMaterialMapper;
    private final WrapColorMapper wrapColorMapper;
    private final CacheService cacheService;

    public List<FlowerMaterialVO> flowerMaterials(boolean adminView) {
        return flowerMaterialMapper.selectList(Wrappers.<FlowerMaterial>lambdaQuery()
                        .eq(!adminView, FlowerMaterial::getEnabled, 1)
                        .orderByAsc(FlowerMaterial::getSortOrder)
                        .orderByAsc(FlowerMaterial::getId))
                .stream()
                .map(FlowerMaterialVO::from)
                .toList();
    }

    @Transactional
    public FlowerMaterialVO createFlowerMaterial(FlowerMaterialSaveRequest request) {
        String name = normalizeName(request.getName());
        ensureFlowerMaterialNameUnique(name, null);
        FlowerMaterial material = new FlowerMaterial();
        apply(material, request, name);
        if (request.getSortOrder() == null) {
            material.setSortOrder(nextFlowerSortOrder());
        }
        flowerMaterialMapper.insert(material);
        evictProductDetails();
        return FlowerMaterialVO.from(flowerMaterialMapper.selectById(material.getId()));
    }

    @Transactional
    public FlowerMaterialVO updateFlowerMaterial(Long id, FlowerMaterialSaveRequest request) {
        FlowerMaterial material = getFlowerMaterial(id);
        String name = normalizeName(request.getName());
        ensureFlowerMaterialNameUnique(name, id);
        apply(material, request, name);
        flowerMaterialMapper.updateById(material);
        evictProductDetails();
        return FlowerMaterialVO.from(flowerMaterialMapper.selectById(id));
    }

    @Transactional
    public void deleteFlowerMaterial(Long id) {
        getFlowerMaterial(id);
        try {
            flowerMaterialMapper.deleteById(id);
        } catch (DataIntegrityViolationException exception) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "该花材已被商品或规格使用，请先停用或移除关联");
        }
        evictProductDetails();
    }

    public List<WrapColorVO> wrapColors(boolean adminView) {
        return wrapColorMapper.selectList(Wrappers.<WrapColor>lambdaQuery()
                        .eq(!adminView, WrapColor::getEnabled, 1)
                        .orderByAsc(WrapColor::getSortOrder)
                        .orderByAsc(WrapColor::getId))
                .stream()
                .map(WrapColorVO::from)
                .toList();
    }

    @Transactional
    public WrapColorVO createWrapColor(WrapColorSaveRequest request) {
        String name = normalizeName(request.getName());
        ensureWrapColorNameUnique(name, null);
        WrapColor color = new WrapColor();
        apply(color, request, name);
        if (request.getSortOrder() == null) {
            color.setSortOrder(nextWrapSortOrder());
        }
        wrapColorMapper.insert(color);
        evictProductDetails();
        return WrapColorVO.from(wrapColorMapper.selectById(color.getId()));
    }

    @Transactional
    public WrapColorVO updateWrapColor(Long id, WrapColorSaveRequest request) {
        WrapColor color = getWrapColor(id);
        String name = normalizeName(request.getName());
        ensureWrapColorNameUnique(name, id);
        apply(color, request, name);
        wrapColorMapper.updateById(color);
        evictProductDetails();
        return WrapColorVO.from(wrapColorMapper.selectById(id));
    }

    @Transactional
    public void deleteWrapColor(Long id) {
        getWrapColor(id);
        try {
            wrapColorMapper.deleteById(id);
        } catch (DataIntegrityViolationException exception) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "该包装色系已被购物车或订单使用，请先停用");
        }
        evictProductDetails();
    }

    public FlowerMaterial getFlowerMaterial(Long id) {
        FlowerMaterial material = flowerMaterialMapper.selectById(id);
        if (material == null) {
            throw BusinessException.of(ErrorCode.NOT_FOUND, "花材不存在");
        }
        return material;
    }

    public WrapColor getWrapColor(Long id) {
        WrapColor color = wrapColorMapper.selectById(id);
        if (color == null) {
            throw BusinessException.of(ErrorCode.NOT_FOUND, "包装色系不存在");
        }
        return color;
    }

    private void apply(FlowerMaterial material, FlowerMaterialSaveRequest request, String name) {
        material.setName(name);
        material.setLatinName(trimToNull(request.getLatinName()));
        material.setNote(trimToNull(request.getNote()));
        material.setColorHex(trimToNull(request.getColorHex()));
        material.setImageUrl(trimToNull(request.getImageUrl()));
        material.setEnabled(request.getEnabled() == null ? 1 : request.getEnabled());
        material.setSortOrder(request.getSortOrder() == null ? 0 : request.getSortOrder());
    }

    private void apply(WrapColor color, WrapColorSaveRequest request, String name) {
        color.setName(name);
        color.setHex(request.getHex().trim().toUpperCase());
        color.setRingHex(trimToNull(request.getRingHex()));
        color.setDescription(trimToNull(request.getDescription()));
        color.setEnabled(request.getEnabled() == null ? 1 : request.getEnabled());
        color.setSortOrder(request.getSortOrder() == null ? 0 : request.getSortOrder());
    }

    private int nextFlowerSortOrder() {
        return flowerMaterialMapper.selectList(null).stream()
                .mapToInt(material -> material.getSortOrder() == null ? 0 : material.getSortOrder())
                .max()
                .orElse(0) + 10;
    }

    private int nextWrapSortOrder() {
        return wrapColorMapper.selectList(null).stream()
                .mapToInt(color -> color.getSortOrder() == null ? 0 : color.getSortOrder())
                .max()
                .orElse(0) + 10;
    }

    private void ensureFlowerMaterialNameUnique(String name, Long excludeId) {
        Long count = flowerMaterialMapper.selectCount(Wrappers.<FlowerMaterial>lambdaQuery()
                .eq(FlowerMaterial::getName, name)
                .ne(excludeId != null, FlowerMaterial::getId, excludeId));
        if (count > 0) {
            throw BusinessException.of(ErrorCode.CONFLICT, "花材名称已存在");
        }
    }

    private void ensureWrapColorNameUnique(String name, Long excludeId) {
        Long count = wrapColorMapper.selectCount(Wrappers.<WrapColor>lambdaQuery()
                .eq(WrapColor::getName, name)
                .ne(excludeId != null, WrapColor::getId, excludeId));
        if (count > 0) {
            throw BusinessException.of(ErrorCode.CONFLICT, "包装色系名称已存在");
        }
    }

    private String normalizeName(String value) {
        if (!StringUtils.hasText(value)) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "名称不能为空");
        }
        return value.trim();
    }

    private String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private void evictProductDetails() {
        cacheService.evictByPrefix(CacheKeys.PRODUCT_DETAIL_PREFIX);
    }
}
