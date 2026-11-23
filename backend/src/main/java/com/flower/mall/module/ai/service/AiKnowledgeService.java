package com.flower.mall.module.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.module.ai.dto.KnowledgeDocumentRequest;
import com.flower.mall.module.ai.entity.AiKnowledgeDocument;
import com.flower.mall.module.ai.mapper.AiKnowledgeDocumentMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiKnowledgeService {

    private final AiKnowledgeDocumentMapper mapper;
    private final AiClient aiClient;

    public List<AiKnowledgeDocument> list(String keyword, String category, Boolean enabled) {
        LambdaQueryWrapper<AiKnowledgeDocument> wrapper = new LambdaQueryWrapper<AiKnowledgeDocument>()
                .like(keyword != null && !keyword.isBlank(), AiKnowledgeDocument::getTitle, keyword)
                .eq(category != null && !category.isBlank(), AiKnowledgeDocument::getCategory, category)
                .eq(enabled != null, AiKnowledgeDocument::getEnabled, enabled)
                .orderByDesc(AiKnowledgeDocument::getId);
        return mapper.selectList(wrapper);
    }

    public AiKnowledgeDocument create(KnowledgeDocumentRequest request) {
        AiKnowledgeDocument document = new AiKnowledgeDocument();
        apply(document, request);
        document.setCreatedAt(LocalDateTime.now());
        document.setUpdatedAt(LocalDateTime.now());
        mapper.insert(document);
        reindexBestEffort();
        return document;
    }

    public AiKnowledgeDocument update(Long id, KnowledgeDocumentRequest request) {
        AiKnowledgeDocument document = mapper.selectById(id);
        if (document == null) {
            throw BusinessException.of(ErrorCode.NOT_FOUND, "知识库文档不存在");
        }
        apply(document, request);
        document.setUpdatedAt(LocalDateTime.now());
        mapper.updateById(document);
        reindexBestEffort();
        return document;
    }

    public void delete(Long id) {
        if (mapper.selectById(id) == null) {
            throw BusinessException.of(ErrorCode.NOT_FOUND, "知识库文档不存在");
        }
        mapper.deleteById(id);
        reindexBestEffort();
    }

    public int reindex() {
        var response = aiClient.post("/internal/ai/reindex", Map.of("products", true, "knowledge", true), 60_000);
        return response.path("knowledgeCount").asInt(0);
    }

    public List<AiKnowledgeDocument> enabledDocuments() {
        return mapper.selectList(new LambdaQueryWrapper<AiKnowledgeDocument>()
                .eq(AiKnowledgeDocument::getEnabled, true)
                .orderByAsc(AiKnowledgeDocument::getId));
    }

    private void apply(AiKnowledgeDocument document, KnowledgeDocumentRequest request) {
        document.setTitle(request.getTitle().trim());
        document.setCategory(request.getCategory().trim());
        document.setContent(request.getContent().trim());
        document.setSource(request.getSource());
        document.setEnabled(request.getEnabled() == null || request.getEnabled());
    }

    private void reindexBestEffort() {
        try {
            aiClient.post("/internal/ai/reindex", Map.of("products", false, "knowledge", true), 5_000);
        } catch (Exception ex) {
            log.debug("AI knowledge reindex skipped: {}", ex.getMessage());
        }
    }
}
