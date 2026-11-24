package com.flower.mall.module.ai.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.common.api.PageResult;
import com.flower.mall.module.ai.dto.AiCallLogVO;
import com.flower.mall.module.ai.dto.AiHealthVO;
import com.flower.mall.module.ai.dto.AiMetricsVO;
import com.flower.mall.module.ai.dto.AiProductCopyApplyRequest;
import com.flower.mall.module.ai.dto.AiProductCopyRequest;
import com.flower.mall.module.ai.dto.AiProductCopyVO;
import com.flower.mall.module.ai.dto.AiPromptTagBulkRequest;
import com.flower.mall.module.ai.dto.AiPromptTagGenerateRequest;
import com.flower.mall.module.ai.dto.AiPromptTagGenerateVO;
import com.flower.mall.module.ai.dto.AiPromptTagRequest;
import com.flower.mall.module.ai.dto.AiPromptTagVO;
import com.flower.mall.module.ai.dto.AiReindexVO;
import com.flower.mall.module.ai.dto.AiWeightAdviceApplyRequest;
import com.flower.mall.module.ai.dto.AiWeightAdviceRequest;
import com.flower.mall.module.ai.dto.AiWeightAdviceVO;
import com.flower.mall.module.ai.dto.KnowledgeDocumentRequest;
import com.flower.mall.module.ai.entity.AiKnowledgeDocument;
import com.flower.mall.module.ai.service.AiCallLogService;
import com.flower.mall.module.ai.service.AiHealthService;
import com.flower.mall.module.ai.service.AiKnowledgeService;
import com.flower.mall.module.ai.service.AiMerchantService;
import com.flower.mall.module.ai.service.AiPromptTagService;
import com.flower.mall.module.log.annotation.OperationLogRecord;
import com.flower.mall.module.product.dto.ProductVO;
import com.flower.mall.module.recommendation.dto.RecommendationSceneWeightVO;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "管理端 AI 运营")
@RestController
@RequestMapping("/api/admin/ai")
@RequiredArgsConstructor
public class AdminAiController {

    private final AiMerchantService merchantService;
    private final AiCallLogService callLogService;
    private final AiKnowledgeService knowledgeService;
    private final AiHealthService healthService;
    private final AiPromptTagService promptTagService;

    @Operation(summary = "AI 生成商品文案")
    @PostMapping("/product-copy")
    public ApiResponse<AiProductCopyVO> productCopy(@Valid @RequestBody AiProductCopyRequest request) {
        return ApiResponse.ok(merchantService.productCopy(request));
    }

    @Operation(summary = "应用 AI 商品文案与智能标签")
    @OperationLogRecord(module = "AI 运营", operation = "应用商品文案")
    @PostMapping("/product-copy/apply")
    public ApiResponse<ProductVO> applyProductCopy(@Valid @RequestBody AiProductCopyApplyRequest request) {
        return ApiResponse.ok(merchantService.applyProductCopy(request));
    }

    @Operation(summary = "AI 推荐权重调参建议（仅草稿）")
    @PostMapping("/recommendation-advice")
    public ApiResponse<AiWeightAdviceVO> recommendationAdvice(@Valid @RequestBody AiWeightAdviceRequest request) {
        return ApiResponse.ok(merchantService.recommendationAdvice(request));
    }

    @Operation(summary = "应用 AI 推荐权重建议")
    @OperationLogRecord(module = "AI 运营", operation = "应用推荐权重建议")
    @PostMapping("/recommendation-advice/apply")
    public ApiResponse<List<RecommendationSceneWeightVO>> applyRecommendationAdvice(
            @Valid @RequestBody AiWeightAdviceApplyRequest request) {
        return ApiResponse.ok(merchantService.applyRecommendationAdvice(request));
    }

    @Operation(summary = "AI 调用指标")
    @GetMapping("/metrics")
    public ApiResponse<AiMetricsVO> metrics(@RequestParam(defaultValue = "30") int days) {
        return ApiResponse.ok(callLogService.metrics(days));
    }

    @Operation(summary = "AI 调用日志")
    @GetMapping("/calls")
    public ApiResponse<PageResult<AiCallLogVO>> calls(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "20") long size,
            @RequestParam(required = false) String scene,
            @RequestParam(required = false) String status) {
        return ApiResponse.ok(callLogService.page(page, size, scene, status));
    }

    @Operation(summary = "AI 服务健康检查")
    @GetMapping("/health")
    public ApiResponse<AiHealthVO> health() {
        return ApiResponse.ok(healthService.health());
    }

    @Operation(summary = "重建商品与知识库索引")
    @PostMapping("/reindex")
    public ApiResponse<AiReindexVO> reindex() {
        return ApiResponse.ok(healthService.reindex());
    }

    @Operation(summary = "知识库文档列表")
    @GetMapping("/knowledge")
    public ApiResponse<List<AiKnowledgeDocument>> knowledge(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean enabled) {
        return ApiResponse.ok(knowledgeService.list(keyword, category, enabled));
    }

    @Operation(summary = "新增知识库文档")
    @PostMapping("/knowledge")
    public ApiResponse<AiKnowledgeDocument> createKnowledge(
            @Valid @RequestBody KnowledgeDocumentRequest request) {
        return ApiResponse.ok(knowledgeService.create(request));
    }

    @Operation(summary = "更新知识库文档")
    @PutMapping("/knowledge/{id}")
    public ApiResponse<AiKnowledgeDocument> updateKnowledge(
            @PathVariable Long id,
            @Valid @RequestBody KnowledgeDocumentRequest request) {
        return ApiResponse.ok(knowledgeService.update(id, request));
    }

    @Operation(summary = "删除知识库文档")
    @DeleteMapping("/knowledge/{id}")
    public ApiResponse<Void> deleteKnowledge(@PathVariable Long id) {
        knowledgeService.delete(id);
        return ApiResponse.ok();
    }

    @Operation(summary = "快捷提问标签列表")
    @GetMapping("/prompt-tags")
    public ApiResponse<List<AiPromptTagVO>> promptTags() {
        return ApiResponse.ok(promptTagService.listAll());
    }

    @Operation(summary = "新增快捷提问标签")
    @OperationLogRecord(module = "AI 运营", operation = "新增快捷提问标签")
    @PostMapping("/prompt-tags")
    public ApiResponse<AiPromptTagVO> createPromptTag(@Valid @RequestBody AiPromptTagRequest request) {
        return ApiResponse.ok(promptTagService.create(request));
    }

    @Operation(summary = "更新快捷提问标签")
    @OperationLogRecord(module = "AI 运营", operation = "更新快捷提问标签")
    @PutMapping("/prompt-tags/{id}")
    public ApiResponse<AiPromptTagVO> updatePromptTag(
            @PathVariable Long id,
            @Valid @RequestBody AiPromptTagRequest request) {
        return ApiResponse.ok(promptTagService.update(id, request));
    }

    @Operation(summary = "删除快捷提问标签")
    @OperationLogRecord(module = "AI 运营", operation = "删除快捷提问标签")
    @DeleteMapping("/prompt-tags/{id}")
    public ApiResponse<Void> deletePromptTag(@PathVariable Long id) {
        promptTagService.delete(id);
        return ApiResponse.ok();
    }

    @Operation(summary = "批量保存快捷提问标签")
    @OperationLogRecord(module = "AI 运营", operation = "批量保存快捷提问标签")
    @PostMapping("/prompt-tags/bulk")
    public ApiResponse<List<AiPromptTagVO>> bulkPromptTags(
            @Valid @RequestBody AiPromptTagBulkRequest request) {
        return ApiResponse.ok(promptTagService.bulk(request));
    }

    @Operation(summary = "AI 生成快捷提问标签")
    @PostMapping("/prompt-tags/generate")
    public ApiResponse<AiPromptTagGenerateVO> generatePromptTags(
            @Valid @RequestBody AiPromptTagGenerateRequest request) {
        return ApiResponse.ok(promptTagService.generate(request));
    }
}
