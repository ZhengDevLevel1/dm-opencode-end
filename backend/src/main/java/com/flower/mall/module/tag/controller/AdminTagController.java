package com.flower.mall.module.tag.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.module.tag.dto.TagCreateRequest;
import com.flower.mall.module.tag.dto.TagHomeDisplayRequest;
import com.flower.mall.module.tag.dto.TagMaxCountRequest;
import com.flower.mall.module.tag.dto.TagOptionVO;
import com.flower.mall.module.tag.dto.TagOverviewVO;
import com.flower.mall.module.tag.dto.TagUpdateRequest;
import com.flower.mall.module.tag.service.TagService;
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

import java.util.Map;

@Tag(name = "标签管理")
@RestController
@RequestMapping("/api/admin/tags")
@RequiredArgsConstructor
public class AdminTagController {

    private final TagService tagService;

    @Operation(summary = "获取标签总览与最大可选数量")
    @GetMapping
    public ApiResponse<TagOverviewVO> overview() {
        return ApiResponse.ok(tagService.overview());
    }

    @Operation(summary = "新增标签")
    @PostMapping
    public ApiResponse<TagOptionVO> create(@Valid @RequestBody TagCreateRequest request) {
        return ApiResponse.ok(tagService.create(request));
    }

    @Operation(summary = "重命名标签")
    @PutMapping("/{id}")
    public ApiResponse<TagOptionVO> rename(@PathVariable Long id,
                                           @Valid @RequestBody TagUpdateRequest request) {
        return ApiResponse.ok(tagService.rename(id, request));
    }

    @Operation(summary = "删除标签")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        tagService.delete(id);
        return ApiResponse.ok(null);
    }

    @Operation(summary = "设置某类标签的最大可选数量")
    @PutMapping("/max-count")
    public ApiResponse<Map<String, Integer>> updateMaxCount(
            @Valid @RequestBody TagMaxCountRequest request) {
        return ApiResponse.ok(Map.of("maxCount", tagService.updateMaxCount(request)));
    }

    @Operation(summary = "保存首页品类或场景展示配置")
    @PutMapping("/home-display")
    public ApiResponse<Void> updateHomeDisplay(@Valid @RequestBody TagHomeDisplayRequest request) {
        tagService.updateHomeDisplay(request);
        return ApiResponse.ok(null);
    }
}
