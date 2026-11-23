package com.flower.mall.module.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flower.mall.common.exception.BusinessException;
import com.flower.mall.common.exception.ErrorCode;
import com.flower.mall.config.AppProperties;
import com.flower.mall.module.ai.dto.AiChatCitationVO;
import com.flower.mall.module.ai.dto.AiChatMessage;
import com.flower.mall.module.ai.dto.AiChatProductVO;
import com.flower.mall.module.ai.dto.AiChatUsageVO;
import com.flower.mall.module.ai.dto.AiConversationDetailVO;
import com.flower.mall.module.ai.dto.AiConversationMessageVO;
import com.flower.mall.module.ai.dto.AiConversationVO;
import com.flower.mall.module.ai.entity.AiChatConversation;
import com.flower.mall.module.ai.entity.AiChatMessageEntity;
import com.flower.mall.module.ai.mapper.AiChatConversationMapper;
import com.flower.mall.module.ai.mapper.AiChatMessageMapper;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiConversationService {

    private static final String ACTIVE = "ACTIVE";
    private static final String DELETED = "DELETED";
    private static final String DEFAULT_TITLE = "新的对话";
    private static final String COMPLETE = "COMPLETE";

    private final AiChatConversationMapper conversationMapper;
    private final AiChatMessageMapper messageMapper;
    private final ObjectMapper objectMapper;
    private final AiClient aiClient;
    private final AppProperties properties;
    private final ExecutorService titleExecutor = Executors.newFixedThreadPool(2);

    @PreDestroy
    public void shutdown() {
        titleExecutor.shutdownNow();
    }

    public List<AiConversationVO> list(Long userId, String sessionKey) {
        LambdaQueryWrapper<AiChatConversation> wrapper = new LambdaQueryWrapper<AiChatConversation>()
                .eq(AiChatConversation::getStatus, ACTIVE)
                .orderByDesc(AiChatConversation::getPinned)
                .orderByDesc(AiChatConversation::getUpdatedAt)
                .orderByDesc(AiChatConversation::getId);
        if (userId != null) {
            wrapper.eq(AiChatConversation::getUserId, userId);
        } else {
            wrapper.eq(AiChatConversation::getSessionKey, requireSessionKey(sessionKey));
        }
        return conversationMapper.selectList(wrapper).stream()
                .map(AiConversationVO::from)
                .toList();
    }

    @Transactional
    public AiConversationVO create(Long userId, String sessionKey) {
        AiChatConversation conversation = new AiChatConversation();
        conversation.setUserId(userId);
        conversation.setSessionKey(userId == null ? requireSessionKey(sessionKey) : null);
        conversation.setTitle(DEFAULT_TITLE);
        conversation.setPinned(false);
        conversation.setStatus(ACTIVE);
        conversation.setCreatedAt(LocalDateTime.now());
        conversation.setUpdatedAt(LocalDateTime.now());
        conversationMapper.insert(conversation);
        return AiConversationVO.from(conversation);
    }

    public Long resolveForChat(Long conversationId, Long userId, String sessionKey) {
        if (conversationId != null) {
            return owned(conversationId, userId, sessionKey).getId();
        }
        return create(userId, sessionKey).getId();
    }

    public AiConversationDetailVO detail(Long conversationId, Long userId, String sessionKey, boolean admin) {
        AiChatConversation conversation = owned(conversationId, userId, sessionKey);
        List<AiChatMessageEntity> rows = messageMapper.selectList(
                new LambdaQueryWrapper<AiChatMessageEntity>()
                        .eq(AiChatMessageEntity::getConversationId, conversationId)
                        .orderByAsc(AiChatMessageEntity::getId));
        List<AiConversationMessageVO> messages = rows.stream()
                .map(row -> toMessageVO(row, admin))
                .toList();
        return AiConversationDetailVO.builder()
                .conversation(AiConversationVO.from(conversation))
                .messages(messages)
                .build();
    }

    @Transactional
    public AiConversationVO rename(Long conversationId, Long userId, String sessionKey, String title) {
        AiChatConversation conversation = owned(conversationId, userId, sessionKey);
        String normalized = title == null ? "" : title.trim();
        if (normalized.isEmpty()) {
            throw BusinessException.of(ErrorCode.BAD_REQUEST, "对话标题不能为空");
        }
        conversation.setTitle(normalized.length() > 120 ? normalized.substring(0, 120) : normalized);
        conversationMapper.updateById(conversation);
        return AiConversationVO.from(conversation);
    }

    @Transactional
    public void delete(Long conversationId, Long userId, String sessionKey) {
        AiChatConversation conversation = owned(conversationId, userId, sessionKey);
        conversation.setStatus(DELETED);
        conversationMapper.updateById(conversation);
    }

    @Transactional
    public int batchDelete(List<Long> ids, Long userId, String sessionKey) {
        int removed = 0;
        for (Long id : ids) {
            AiChatConversation conversation = owned(id, userId, sessionKey);
            conversation.setStatus(DELETED);
            conversationMapper.updateById(conversation);
            removed++;
        }
        return removed;
    }

    @Transactional
    public int batchPin(List<Long> ids, Long userId, String sessionKey, boolean pinned) {
        int changed = 0;
        LocalDateTime now = LocalDateTime.now();
        for (Long id : ids) {
            owned(id, userId, sessionKey);
            conversationMapper.update(null, new LambdaUpdateWrapper<AiChatConversation>()
                    .eq(AiChatConversation::getId, id)
                    .set(AiChatConversation::getPinned, pinned)
                    .set(AiChatConversation::getPinnedAt, pinned ? now : null)
                    .set(AiChatConversation::getUpdatedAt, now));
            changed++;
        }
        return changed;
    }

    public List<AiChatMessage> history(Long conversationId) {
        List<AiChatMessageEntity> rows = messageMapper.selectList(
                new LambdaQueryWrapper<AiChatMessageEntity>()
                        .eq(AiChatMessageEntity::getConversationId, conversationId)
                        .eq(AiChatMessageEntity::getStatus, COMPLETE)
                        .orderByAsc(AiChatMessageEntity::getId));
        int maxMessages = Math.max(1, properties.getAi().getChatContextMaxMessages());
        int maxChars = Math.max(1000, properties.getAi().getChatContextMaxChars());
        Deque<AiChatMessage> selected = new ArrayDeque<>();
        int chars = 0;
        for (int i = rows.size() - 1; i >= 0; i--) {
            AiChatMessageEntity row = rows.get(i);
            if (selected.size() >= maxMessages) {
                break;
            }
            String content = row.getContent();
            if (content == null || content.isBlank()) {
                continue;
            }
            if (!selected.isEmpty() && chars + content.length() > maxChars) {
                break;
            }
            selected.addFirst(new AiChatMessage(row.getRole(), content));
            chars += content.length();
        }
        return new ArrayList<>(selected);
    }

    @Transactional
    public void saveUserMessage(Long conversationId, String content) {
        saveMessage(conversationId, "user", content, null, null, null, null,
                false, COMPLETE);
    }

    @Transactional
    public void saveAssistantMessage(Long conversationId, String content, String productsJson,
                                     String citationsJson, String usageJson, String model,
                                     boolean degraded, String status) {
        saveMessage(conversationId, "assistant", content, productsJson, citationsJson,
                usageJson, model, degraded, status);
    }

    private void saveMessage(Long conversationId, String role, String content,
                             String productsJson, String citationsJson, String usageJson,
                             String model, boolean degraded, String status) {
        if (content == null || content.isBlank()) {
            return;
        }
        AiChatMessageEntity message = new AiChatMessageEntity();
        message.setConversationId(conversationId);
        message.setRole(role);
        message.setContent(content);
        message.setProductsJson(productsJson);
        message.setCitationsJson(citationsJson);
        message.setUsageJson(usageJson);
        message.setModel(model);
        message.setDegraded(degraded);
        message.setStatus(status);
        message.setCreatedAt(LocalDateTime.now());
        messageMapper.insert(message);

        AiChatConversation conversation = conversationMapper.selectById(conversationId);
        if (conversation != null) {
            LocalDateTime now = LocalDateTime.now();
            conversation.setLastMessageAt(now);
            conversation.setUpdatedAt(now);
            conversationMapper.updateById(conversation);
        }
    }

    public void scheduleTitle(Long conversationId) {
        titleExecutor.submit(() -> {
            try {
                generateTitle(conversationId);
            } catch (Exception ex) {
                log.debug("AI conversation title generation failed: {}", ex.getMessage());
            }
        });
    }

    private void generateTitle(Long conversationId) {
        AiChatConversation conversation = conversationMapper.selectById(conversationId);
        if (conversation == null || !ACTIVE.equals(conversation.getStatus())
                || !isDefaultTitle(conversation.getTitle())) {
            return;
        }
        List<AiChatMessageEntity> rows = messageMapper.selectList(
                new LambdaQueryWrapper<AiChatMessageEntity>()
                        .eq(AiChatMessageEntity::getConversationId, conversationId)
                        .orderByAsc(AiChatMessageEntity::getId));
        String userMessage = null;
        String assistantMessage = null;
        for (AiChatMessageEntity row : rows) {
            if (userMessage == null && "user".equals(row.getRole())) {
                userMessage = row.getContent();
            }
            if (userMessage != null && "assistant".equals(row.getRole())) {
                assistantMessage = row.getContent();
                break;
            }
        }
        if (userMessage == null || userMessage.isBlank()) {
            return;
        }

        String title = fallbackTitle(userMessage);
        if (properties.getAi().isEnabled()) {
            try {
                JsonNode response = aiClient.post("/internal/ai/title", Map.of(
                        "userMessage", userMessage,
                        "assistantMessage", assistantMessage == null ? "" : assistantMessage
                ), 15000);
                String candidate = response.path("title").asText("").trim();
                if (!candidate.isBlank()) {
                    title = candidate;
                }
            } catch (Exception ex) {
                log.debug("AI title request failed, using fallback: {}", ex.getMessage());
            }
        }

        title = sanitizeTitle(title);
        AiChatConversation latest = conversationMapper.selectById(conversationId);
        if (latest == null || !ACTIVE.equals(latest.getStatus())
                || !isDefaultTitle(latest.getTitle())) {
            return;
        }
        latest.setTitle(title);
        conversationMapper.updateById(latest);
    }

    private AiChatConversation owned(Long conversationId, Long userId, String sessionKey) {
        AiChatConversation conversation = conversationMapper.selectById(conversationId);
        if (conversation == null || !ACTIVE.equals(conversation.getStatus())) {
            throw BusinessException.of(ErrorCode.NOT_FOUND, "对话不存在");
        }
        boolean owner = userId != null
                ? userId.equals(conversation.getUserId())
                : conversation.getSessionKey() != null
                && conversation.getSessionKey().equals(sessionKey);
        if (!owner) {
            throw BusinessException.of(ErrorCode.FORBIDDEN, "无权访问该对话");
        }
        return conversation;
    }

    private AiConversationMessageVO toMessageVO(AiChatMessageEntity row, boolean admin) {
        return AiConversationMessageVO.builder()
                .id(row.getId())
                .role(row.getRole())
                .content(row.getContent())
                .products(parseList(row.getProductsJson(), new TypeReference<List<AiChatProductVO>>() {
                }))
                .citations(admin ? parseList(row.getCitationsJson(),
                        new TypeReference<List<AiChatCitationVO>>() {
                        }) : null)
                .usage(admin ? parseUsage(row.getUsageJson()) : null)
                .model(admin ? row.getModel() : null)
                .degraded(Boolean.TRUE.equals(row.getDegraded()))
                .status(row.getStatus())
                .createdAt(row.getCreatedAt())
                .build();
    }

    private <T> List<T> parseList(String json, TypeReference<List<T>> type) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode items = root.path("items");
            JsonNode target = items.isArray() ? items : root;
            if (!target.isArray()) {
                return null;
            }
            return objectMapper.convertValue(target, type);
        } catch (Exception ex) {
            return null;
        }
    }

    private AiChatUsageVO parseUsage(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, AiChatUsageVO.class);
        } catch (Exception ex) {
            return null;
        }
    }

    private static boolean isDefaultTitle(String title) {
        return title == null || title.isBlank() || DEFAULT_TITLE.equals(title.trim());
    }

    private static String fallbackTitle(String message) {
        String normalized = message.replace('\n', ' ').replace('\r', ' ').trim();
        if (normalized.isEmpty()) {
            return DEFAULT_TITLE;
        }
        return normalized.length() <= 20 ? normalized : normalized.substring(0, 20) + "…";
    }

    private static String sanitizeTitle(String title) {
        String normalized = title == null ? "" : title
                .replace('\n', ' ')
                .replace('\r', ' ')
                .replace("\"", "")
                .replace("“", "")
                .replace("”", "")
                .trim();
        if (normalized.isEmpty()) {
            return DEFAULT_TITLE;
        }
        return normalized.length() <= 30 ? normalized : normalized.substring(0, 30);
    }

    private static String requireSessionKey(String sessionKey) {
        if (sessionKey == null || sessionKey.isBlank()) {
            throw BusinessException.of(ErrorCode.UNAUTHORIZED);
        }
        return sessionKey;
    }
}
