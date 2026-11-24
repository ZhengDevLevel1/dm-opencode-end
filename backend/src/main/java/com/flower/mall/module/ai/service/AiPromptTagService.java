package com.flower.mall.module.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.config.AppProperties;
import com.flower.mall.module.ai.dto.AiPromptTagBundleVO;
import com.flower.mall.module.ai.dto.AiPromptTagBulkRequest;
import com.flower.mall.module.ai.dto.AiPromptTagGenerateRequest;
import com.flower.mall.module.ai.dto.AiPromptTagGenerateVO;
import com.flower.mall.module.ai.dto.AiPromptTagRequest;
import com.flower.mall.module.ai.dto.AiPromptTagVO;
import com.flower.mall.module.ai.entity.AiPromptTag;
import com.flower.mall.module.ai.mapper.AiPromptTagMapper;
import com.flower.mall.module.ai.support.AiPromptTagCategory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiPromptTagService {

    private static final Map<AiPromptTagCategory, List<String>> FALLBACK_WORDS = Map.of(
            AiPromptTagCategory.SCENE, List.of(
                    "生日惊喜", "浪漫告白", "纪念日", "母亲节", "毕业季",
                    "日常用花", "节日送礼", "新婚祝福"),
            AiPromptTagCategory.AUDIENCE, List.of(
                    "送女朋友", "送男朋友", "送妈妈", "送长辈",
                    "送朋友", "送同事", "送自己", "送爱人"),
            AiPromptTagCategory.NEED, List.of(
                    "预算友好", "高级感", "香味淡雅", "好打理",
                    "拍照出片", "寓意美好", "当天送达", "不易过敏")
    );

    private final AiPromptTagMapper promptTagMapper;
    private final AiClient aiClient;
    private final AppProperties properties;

    public AiPromptTagBundleVO bundle() {
        List<AiPromptTagVO> tags = listAll();
        return AiPromptTagBundleVO.builder()
                .scenes(wordsOf(tags, AiPromptTagCategory.SCENE))
                .audiences(wordsOf(tags, AiPromptTagCategory.AUDIENCE))
                .needs(wordsOf(tags, AiPromptTagCategory.NEED))
                .build();
    }

    public List<AiPromptTagVO> listAll() {
        return promptTagMapper.selectList(new LambdaQueryWrapper<AiPromptTag>()
                        .orderByAsc(AiPromptTag::getCategory)
                        .orderByAsc(AiPromptTag::getSortOrder)
                        .orderByAsc(AiPromptTag::getId))
                .stream()
                .map(this::toVO)
                .toList();
    }

    @Transactional
    public AiPromptTagVO create(AiPromptTagRequest request) {
        AiPromptTagCategory category = AiPromptTagCategory.fromValue(request.getCategory());
        String word = normalizeWord(request.getWord());
        ensureUnique(category, word, null);
        LocalDateTime now = LocalDateTime.now();
        AiPromptTag entity = new AiPromptTag();
        entity.setCategory(category.name());
        entity.setWord(word);
        entity.setSortOrder(request.getSortOrder() == null
                ? nextSortOrder(category) : request.getSortOrder());
        entity.setCreatedAt(now);
        entity.setUpdatedAt(now);
        promptTagMapper.insert(entity);
        return toVO(entity);
    }

    @Transactional
    public AiPromptTagVO update(Long id, AiPromptTagRequest request) {
        AiPromptTag entity = requireTag(id);
        AiPromptTagCategory category = AiPromptTagCategory.fromValue(request.getCategory());
        String word = normalizeWord(request.getWord());
        ensureUnique(category, word, id);
        entity.setCategory(category.name());
        entity.setWord(word);
        if (request.getSortOrder() != null) {
            entity.setSortOrder(request.getSortOrder());
        }
        entity.setUpdatedAt(LocalDateTime.now());
        promptTagMapper.updateById(entity);
        return toVO(entity);
    }

    @Transactional
    public void delete(Long id) {
        requireTag(id);
        promptTagMapper.deleteById(id);
    }

    @Transactional
    public List<AiPromptTagVO> bulk(AiPromptTagBulkRequest request) {
        AiPromptTagCategory category = AiPromptTagCategory.fromValue(request.getCategory());
        List<String> words = cleanWords(request.getWords());
        if (words.isEmpty()) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "请至少提交一个标签词");
        }
        String mode = StringUtils.hasText(request.getMode())
                ? request.getMode().trim().toUpperCase(Locale.ROOT) : "APPEND";
        if (!"APPEND".equals(mode) && !"REPLACE".equals(mode)) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "批量模式不合法");
        }
        if ("REPLACE".equals(mode)) {
            promptTagMapper.delete(new LambdaQueryWrapper<AiPromptTag>()
                    .eq(AiPromptTag::getCategory, category.name()));
        }
        List<AiPromptTag> existing = promptTagMapper.selectList(new LambdaQueryWrapper<AiPromptTag>()
                .eq(AiPromptTag::getCategory, category.name()));
        Map<String, AiPromptTag> byWord = new LinkedHashMap<>();
        existing.forEach(tag -> byWord.put(tag.getWord().toLowerCase(Locale.ROOT), tag));
        int order = existing.stream()
                .map(AiPromptTag::getSortOrder)
                .filter(value -> value != null)
                .max(Integer::compareTo)
                .orElse(0);
        LocalDateTime now = LocalDateTime.now();
        for (String word : words) {
            if (byWord.containsKey(word.toLowerCase(Locale.ROOT))) {
                continue;
            }
            AiPromptTag entity = new AiPromptTag();
            entity.setCategory(category.name());
            entity.setWord(word);
            entity.setSortOrder(++order);
            entity.setCreatedAt(now);
            entity.setUpdatedAt(now);
            promptTagMapper.insert(entity);
        }
        return listByCategory(category);
    }

    public AiPromptTagGenerateVO generate(AiPromptTagGenerateRequest request) {
        AiPromptTagCategory category = AiPromptTagCategory.fromValue(request.getCategory());
        String theme = StringUtils.hasText(request.getTheme()) ? request.getTheme().trim() : "";
        if (!properties.getAi().isEnabled()) {
            return fallbackGenerate(category, theme, "backend-fallback");
        }
        Map<String, Object> body = Map.of(
                "category", category.name(),
                "theme", theme);
        try {
            JsonNode response = aiClient.post("/internal/ai/prompt-tags", body,
                    properties.getAi().getTimeoutMs());
            List<String> words = cleanWords(textList(response.path("words")));
            if (words.size() < 3) {
                words = mergeFallback(category, theme, words);
            }
            int totalTokens = response.path("promptTokens").asInt(0)
                    + response.path("completionTokens").asInt(0);
            return AiPromptTagGenerateVO.builder()
                    .words(words)
                    .degraded(response.path("degraded").asBoolean(false))
                    .fallbackReason(response.path("fallbackReason").asText(null))
                    .totalTokens(totalTokens)
                    .build();
        } catch (BusinessException ex) {
            if (ex.getCode() != ErrorCode.AI_UNAVAILABLE.getCode()
                    && ex.getCode() != ErrorCode.AI_DISABLED.getCode()) {
                throw ex;
            }
            log.warn("Prompt tag generation fell back: {}", ex.getMessage());
            return fallbackGenerate(category, theme, "backend-fallback");
        }
    }

    private AiPromptTagGenerateVO fallbackGenerate(
            AiPromptTagCategory category, String theme, String reason) {
        return AiPromptTagGenerateVO.builder()
                .words(mergeFallback(category, theme, List.of()))
                .degraded(true)
                .fallbackReason(reason)
                .totalTokens(0)
                .build();
    }

    private List<String> mergeFallback(
            AiPromptTagCategory category, String theme, List<String> words) {
        Map<String, String> merged = new LinkedHashMap<>();
        if (StringUtils.hasText(theme) && theme.length() <= 20) {
            merged.put(theme.toLowerCase(Locale.ROOT), theme);
        }
        for (String word : words) {
            merged.putIfAbsent(word.toLowerCase(Locale.ROOT), word);
        }
        for (String word : FALLBACK_WORDS.get(category)) {
            merged.putIfAbsent(word.toLowerCase(Locale.ROOT), word);
            if (merged.size() >= 12) {
                break;
            }
        }
        return new ArrayList<>(merged.values());
    }

    private List<AiPromptTagVO> listByCategory(AiPromptTagCategory category) {
        return promptTagMapper.selectList(new LambdaQueryWrapper<AiPromptTag>()
                        .eq(AiPromptTag::getCategory, category.name())
                        .orderByAsc(AiPromptTag::getSortOrder)
                        .orderByAsc(AiPromptTag::getId))
                .stream()
                .map(this::toVO)
                .toList();
    }

    private AiPromptTag requireTag(Long id) {
        AiPromptTag entity = promptTagMapper.selectById(id);
        if (entity == null) {
            throw BusinessException.of(ErrorCode.NOT_FOUND, "标签不存在");
        }
        return entity;
    }

    private void ensureUnique(AiPromptTagCategory category, String word, Long excludeId) {
        LambdaQueryWrapper<AiPromptTag> query = new LambdaQueryWrapper<AiPromptTag>()
                .eq(AiPromptTag::getCategory, category.name())
                .eq(AiPromptTag::getWord, word);
        if (excludeId != null) {
            query.ne(AiPromptTag::getId, excludeId);
        }
        if (promptTagMapper.selectCount(query) > 0) {
            throw BusinessException.of(ErrorCode.CONFLICT, "该分类下已存在相同标签");
        }
    }

    private int nextSortOrder(AiPromptTagCategory category) {
        AiPromptTag last = promptTagMapper.selectOne(new LambdaQueryWrapper<AiPromptTag>()
                .eq(AiPromptTag::getCategory, category.name())
                .orderByDesc(AiPromptTag::getSortOrder)
                .last("limit 1"));
        return last == null || last.getSortOrder() == null ? 1 : last.getSortOrder() + 1;
    }

    private String normalizeWord(String value) {
        if (!StringUtils.hasText(value)) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "标签词不能为空");
        }
        String word = value.trim().replace('\n', ' ').replace('\r', ' ').trim();
        word = word.replaceAll("^[\"'“”‘’]+|[\"'“”‘’]+$", "");
        if (word.isBlank() || word.length() > 20) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "标签词需为1-20个字符");
        }
        return word;
    }

    private List<String> cleanWords(List<String> words) {
        if (words == null || words.isEmpty()) {
            return List.of();
        }
        Map<String, String> unique = new LinkedHashMap<>();
        for (String raw : words) {
            if (!StringUtils.hasText(raw)) {
                continue;
            }
            String word = raw.trim().replace('\n', ' ').replace('\r', ' ').trim();
            word = word.replaceAll("^[\"'“”‘’]+|[\"'“”‘’]+$", "");
            if (word.isBlank() || word.length() > 20) {
                continue;
            }
            unique.putIfAbsent(word.toLowerCase(Locale.ROOT), word);
        }
        return new ArrayList<>(unique.values());
    }

    private List<String> wordsOf(List<AiPromptTagVO> tags, AiPromptTagCategory category) {
        return tags.stream()
                .filter(tag -> category.name().equals(tag.getCategory()))
                .map(AiPromptTagVO::getWord)
                .toList();
    }

    private List<String> textList(JsonNode node) {
        List<String> texts = new ArrayList<>();
        if (node != null && node.isArray()) {
            node.forEach(item -> {
                String text = item.asText("");
                if (StringUtils.hasText(text)) {
                    texts.add(text);
                }
            });
        }
        return texts;
    }

    private AiPromptTagVO toVO(AiPromptTag entity) {
        return AiPromptTagVO.builder()
                .id(entity.getId())
                .category(entity.getCategory())
                .word(entity.getWord())
                .sortOrder(entity.getSortOrder())
                .build();
    }
}
