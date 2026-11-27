package com.flower.mall.module.catalog.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.module.catalog.dto.BusinessHourBatchRequest;
import com.flower.mall.module.catalog.dto.BusinessHourVO;
import com.flower.mall.module.catalog.dto.FlowerMaterialSaveRequest;
import com.flower.mall.module.catalog.dto.FlowerMaterialVO;
import com.flower.mall.module.catalog.dto.StoreProfileRequest;
import com.flower.mall.module.catalog.dto.StoreProfileVO;
import com.flower.mall.module.catalog.dto.WrapColorSaveRequest;
import com.flower.mall.module.catalog.dto.WrapColorVO;
import com.flower.mall.module.catalog.service.BusinessHourService;
import com.flower.mall.module.catalog.service.CatalogService;
import com.flower.mall.module.catalog.service.StoreProfileService;
import com.flower.mall.module.log.annotation.OperationLogRecord;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "管理员-商品配置")
@RestController
@RequestMapping("/api/admin/catalog")
@RequiredArgsConstructor
public class AdminCatalogController {

    private final CatalogService catalogService;
    private final BusinessHourService businessHourService;
    private final StoreProfileService storeProfileService;

    @Operation(summary = "花材列表（含停用）")
    @GetMapping("/flower-materials")
    public ApiResponse<List<FlowerMaterialVO>> flowerMaterials() {
        return ApiResponse.ok(catalogService.flowerMaterials(true));
    }

    @Operation(summary = "新增花材")
    @PostMapping("/flower-materials")
    @OperationLogRecord(module = "商品配置", operation = "新增花材")
    public ApiResponse<FlowerMaterialVO> createFlowerMaterial(
            @Valid @RequestBody FlowerMaterialSaveRequest request) {
        return ApiResponse.ok(catalogService.createFlowerMaterial(request));
    }

    @Operation(summary = "编辑花材")
    @PutMapping("/flower-materials/{id}")
    @OperationLogRecord(module = "商品配置", operation = "编辑花材")
    public ApiResponse<FlowerMaterialVO> updateFlowerMaterial(
            @PathVariable Long id, @Valid @RequestBody FlowerMaterialSaveRequest request) {
        return ApiResponse.ok(catalogService.updateFlowerMaterial(id, request));
    }

    @Operation(summary = "删除花材")
    @DeleteMapping("/flower-materials/{id}")
    @OperationLogRecord(module = "商品配置", operation = "删除花材")
    public ApiResponse<Void> deleteFlowerMaterial(@PathVariable Long id) {
        catalogService.deleteFlowerMaterial(id);
        return ApiResponse.ok();
    }

    @Operation(summary = "包装色系列表（含停用）")
    @GetMapping("/wrap-colors")
    public ApiResponse<List<WrapColorVO>> wrapColors() {
        return ApiResponse.ok(catalogService.wrapColors(true));
    }

    @Operation(summary = "新增包装色系")
    @PostMapping("/wrap-colors")
    @OperationLogRecord(module = "商品配置", operation = "新增包装色系")
    public ApiResponse<WrapColorVO> createWrapColor(@Valid @RequestBody WrapColorSaveRequest request) {
        return ApiResponse.ok(catalogService.createWrapColor(request));
    }

    @Operation(summary = "编辑包装色系")
    @PutMapping("/wrap-colors/{id}")
    @OperationLogRecord(module = "商品配置", operation = "编辑包装色系")
    public ApiResponse<WrapColorVO> updateWrapColor(
            @PathVariable Long id, @Valid @RequestBody WrapColorSaveRequest request) {
        return ApiResponse.ok(catalogService.updateWrapColor(id, request));
    }

    @Operation(summary = "删除包装色系")
    @DeleteMapping("/wrap-colors/{id}")
    @OperationLogRecord(module = "商品配置", operation = "删除包装色系")
    public ApiResponse<Void> deleteWrapColor(@PathVariable Long id) {
        catalogService.deleteWrapColor(id);
        return ApiResponse.ok();
    }

    @Operation(summary = "营业时间列表")
    @GetMapping("/business-hours")
    public ApiResponse<List<BusinessHourVO>> businessHours() {
        return ApiResponse.ok(businessHourService.list());
    }

    @Operation(summary = "保存营业时间")
    @PutMapping("/business-hours")
    @OperationLogRecord(module = "商品配置", operation = "保存营业时间")
    public ApiResponse<List<BusinessHourVO>> saveBusinessHours(
            @Valid @RequestBody BusinessHourBatchRequest request) {
        return ApiResponse.ok(businessHourService.save(request));
    }

    @Operation(summary = "门店联系信息")
    @GetMapping("/store-profile")
    public ApiResponse<StoreProfileVO> storeProfile() {
        return ApiResponse.ok(storeProfileService.get());
    }

    @Operation(summary = "保存营业电话")
    @PutMapping("/store-profile")
    @OperationLogRecord(module = "商品配置", operation = "保存营业电话")
    public ApiResponse<StoreProfileVO> saveStoreProfile(
            @Valid @RequestBody StoreProfileRequest request) {
        return ApiResponse.ok(storeProfileService.update(request));
    }
}
