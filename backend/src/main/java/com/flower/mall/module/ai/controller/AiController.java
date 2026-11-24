package com.flower.mall.module.ai.controller;

import com.flower.mall.common.api.ApiResponse;
import com.flower.mall.common.enums.UserRole;
import com.flower.mall.common.util.SecurityUtils;
import com.flower.mall.config.AppProperties;
import com.flower.mall.module.ai.dto.AiChatRequest;
import com.flower.mall.module.ai.dto.AiConversationBatchRequest;
import com.flower.mall.module.ai.dto.AiConversationDetailVO;
import com.flower.mall.module.ai.dto.AiConversationRenameRequest;
import com.flower.mall.module.ai.dto.AiConversationVO;
import com.flower.mall.module.ai.dto.AiPromptTagBundleVO;
import com.flower.mall.module.ai.dto.AiStatusVO;
import com.flower.mall.module.ai.service.AiChatService;
import com.flower.mall.module.ai.service.AiConversationService;
import com.flower.mall.module.ai.service.AiHealthService;
import com.flower.mall.module.ai.service.AiPromptTagService;
import com.flower.mall.security.AuthUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@Tag(name = "AI 智能问答")
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiChatService chatService;
    private final AiConversationService conversationService;
    private final AiHealthService healthService;
    private final AiPromptTagService promptTagService;
    private final AppProperties properties;

    @Operation(summary = "AI 挑花顾问流式问答")
    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chat(@Valid @RequestBody AiChatRequest request,
                           @RequestHeader(value = "X-Session-Id", required = false) String sessionHeader,
                           HttpServletRequest httpRequest) {
        AuthUser user = SecurityUtils.currentUserOrNull();
        String sessionId = request.getSessionId();
        if (sessionId == null || sessionId.isBlank()) {
            sessionId = sessionKey(sessionHeader, httpRequest);
        }
        request.setSessionId(sessionId);
        String clientKey = httpRequest.getRemoteAddr();
        SseEmitter emitter = new SseEmitter((long) properties.getAi().getChatTimeoutMs() + 5_000);
        chatService.stream(request,
                user == null ? null : user.getId(),
                user == null ? "ANONYMOUS" : user.getRole().name(),
                clientKey,
                emitter);
        return emitter;
    }

    @Operation(summary = "AI 对话列表")
    @GetMapping("/conversations")
    public ApiResponse<List<AiConversationVO>> conversations(
            @RequestHeader(value = "X-Session-Id", required = false) String sessionHeader,
            HttpServletRequest httpRequest) {
        AuthUser user = SecurityUtils.currentUserOrNull();
        return ApiResponse.ok(conversationService.list(
                user == null ? null : user.getId(),
                sessionKey(sessionHeader, httpRequest)));
    }

    @Operation(summary = "新建 AI 对话")
    @PostMapping("/conversations")
    public ApiResponse<AiConversationVO> createConversation(
            @RequestHeader(value = "X-Session-Id", required = false) String sessionHeader,
            HttpServletRequest httpRequest) {
        AuthUser user = SecurityUtils.currentUserOrNull();
        return ApiResponse.ok(conversationService.create(
                user == null ? null : user.getId(),
                sessionKey(sessionHeader, httpRequest)));
    }

    @Operation(summary = "AI 对话详情")
    @GetMapping("/conversations/{id}")
    public ApiResponse<AiConversationDetailVO> conversation(
            @PathVariable Long id,
            @RequestHeader(value = "X-Session-Id", required = false) String sessionHeader,
            HttpServletRequest httpRequest) {
        AuthUser user = SecurityUtils.currentUserOrNull();
        boolean admin = user != null && user.getRole() == UserRole.ADMIN;
        return ApiResponse.ok(conversationService.detail(
                id,
                user == null ? null : user.getId(),
                sessionKey(sessionHeader, httpRequest),
                admin));
    }

    @Operation(summary = "重命名 AI 对话")
    @PutMapping("/conversations/{id}")
    public ApiResponse<AiConversationVO> renameConversation(
            @PathVariable Long id,
            @Valid @RequestBody AiConversationRenameRequest body,
            @RequestHeader(value = "X-Session-Id", required = false) String sessionHeader,
            HttpServletRequest httpRequest) {
        AuthUser user = SecurityUtils.currentUserOrNull();
        return ApiResponse.ok(conversationService.rename(
                id,
                user == null ? null : user.getId(),
                sessionKey(sessionHeader, httpRequest),
                body.getTitle()));
    }

    @Operation(summary = "删除 AI 对话")
    @DeleteMapping("/conversations/{id}")
    public ApiResponse<Void> deleteConversation(
            @PathVariable Long id,
            @RequestHeader(value = "X-Session-Id", required = false) String sessionHeader,
            HttpServletRequest httpRequest) {
        AuthUser user = SecurityUtils.currentUserOrNull();
        conversationService.delete(id,
                user == null ? null : user.getId(),
                sessionKey(sessionHeader, httpRequest));
        return ApiResponse.ok();
    }

    @Operation(summary = "批量删除 AI 对话")
    @PostMapping("/conversations/batch-delete")
    public ApiResponse<Map<String, Integer>> batchDeleteConversations(
            @Valid @RequestBody AiConversationBatchRequest body,
            @RequestHeader(value = "X-Session-Id", required = false) String sessionHeader,
            HttpServletRequest httpRequest) {
        AuthUser user = SecurityUtils.currentUserOrNull();
        int count = conversationService.batchDelete(body.getIds(),
                user == null ? null : user.getId(),
                sessionKey(sessionHeader, httpRequest));
        return ApiResponse.ok(Map.of("count", count));
    }

    @Operation(summary = "批量置顶 AI 对话")
    @PostMapping("/conversations/batch-pin")
    public ApiResponse<Map<String, Integer>> batchPinConversations(
            @Valid @RequestBody AiConversationBatchRequest body,
            @RequestHeader(value = "X-Session-Id", required = false) String sessionHeader,
            HttpServletRequest httpRequest) {
        AuthUser user = SecurityUtils.currentUserOrNull();
        boolean pinned = body.getPinned() == null || body.getPinned();
        int count = conversationService.batchPin(body.getIds(),
                user == null ? null : user.getId(),
                sessionKey(sessionHeader, httpRequest), pinned);
        return ApiResponse.ok(Map.of("count", count));
    }

    @Operation(summary = "AI 服务状态")
    @GetMapping("/status")
    public ApiResponse<AiStatusVO> status() {
        return ApiResponse.ok(healthService.status());
    }

    @Operation(summary = "快捷提问标签")
    @GetMapping("/prompt-tags")
    public ApiResponse<AiPromptTagBundleVO> promptTags() {
        return ApiResponse.ok(promptTagService.bundle());
    }

    private static String sessionKey(String header, HttpServletRequest request) {
        if (header != null && !header.isBlank()) {
            return header;
        }
        return "anon-" + Integer.toHexString(request.getRemoteAddr().hashCode());
    }
}
