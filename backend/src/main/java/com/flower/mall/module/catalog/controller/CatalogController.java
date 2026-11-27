package com.flower.mall.module.catalog.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.module.catalog.dto.BusinessHourVO;
import com.flower.mall.module.catalog.dto.FlowerMaterialVO;
import com.flower.mall.module.catalog.dto.StoreProfileVO;
import com.flower.mall.module.catalog.dto.WrapColorVO;
import com.flower.mall.module.catalog.service.BusinessHourService;
import com.flower.mall.module.catalog.service.CatalogService;
import com.flower.mall.module.catalog.service.StoreProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "商品配置-公开数据")
@RestController
@RequestMapping("/api/catalog")
@RequiredArgsConstructor
public class CatalogController {

    private final CatalogService catalogService;
    private final BusinessHourService businessHourService;
    private final StoreProfileService storeProfileService;

    @Operation(summary = "启用的花材列表")
    @GetMapping("/flower-materials")
    public ApiResponse<List<FlowerMaterialVO>> flowerMaterials() {
        return ApiResponse.ok(catalogService.flowerMaterials(false));
    }

    @Operation(summary = "启用的包装色系列表")
    @GetMapping("/wrap-colors")
    public ApiResponse<List<WrapColorVO>> wrapColors() {
        return ApiResponse.ok(catalogService.wrapColors(false));
    }

    @Operation(summary = "门店营业时间")
    @GetMapping("/business-hours")
    public ApiResponse<List<BusinessHourVO>> businessHours() {
        return ApiResponse.ok(businessHourService.list());
    }

    @Operation(summary = "门店联系信息")
    @GetMapping("/store-profile")
    public ApiResponse<StoreProfileVO> storeProfile() {
        return ApiResponse.ok(storeProfileService.get());
    }
}
