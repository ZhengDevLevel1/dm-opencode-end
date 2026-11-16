package com.flower.mall.module.address.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.module.address.dto.AddressSaveRequest;
import com.flower.mall.module.address.dto.AddressVO;
import com.flower.mall.module.address.service.AddressService;
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

@Tag(name = "地址簿")
@RestController
@RequestMapping("/api/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;

    @Operation(summary = "地址簿列表")
    @GetMapping
    public ApiResponse<List<AddressVO>> list() {
        return ApiResponse.ok(addressService.list());
    }

    @Operation(summary = "地址簿详情")
    @GetMapping("/{id}")
    public ApiResponse<AddressVO> detail(@PathVariable Long id) {
        return ApiResponse.ok(addressService.detail(id));
    }

    @Operation(summary = "新增地址")
    @PostMapping
    public ApiResponse<AddressVO> create(@Valid @RequestBody AddressSaveRequest request) {
        return ApiResponse.ok(addressService.create(request));
    }

    @Operation(summary = "更新地址")
    @PutMapping("/{id}")
    public ApiResponse<AddressVO> update(@PathVariable Long id,
                                         @Valid @RequestBody AddressSaveRequest request) {
        return ApiResponse.ok(addressService.update(id, request));
    }

    @Operation(summary = "设为默认地址")
    @PutMapping("/{id}/default")
    public ApiResponse<AddressVO> setDefault(@PathVariable Long id) {
        return ApiResponse.ok(addressService.setDefault(id));
    }

    @Operation(summary = "删除地址")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        addressService.delete(id);
        return ApiResponse.ok();
    }
}
