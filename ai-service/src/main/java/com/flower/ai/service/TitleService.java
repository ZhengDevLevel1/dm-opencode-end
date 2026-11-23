package com.flower.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flower.ai.client.DeepSeekClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class TitleService {

    private static final Logger log = LoggerFactory.getLogger(TitleService.class);

    private final DeepSeekClient deepSeekClient;
    private final ObjectMapper objectMapper;

    public TitleService(DeepSeekClient deepSeekClient, ObjectMapper objectMapper) {
        this.deepSeekClient = deepSeekClient;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> generate(TitleRequest request) {
        String userMessage = trim(request == null ? null : request.userMessage());
        String assistantMessage = trim(request == null ? null : request.assistantMessage());
        if (userMessage.isBlank()) {
            return fallback("新的对话", "没有可用的用户问题");
        }
        if (!deepSeekClient.available()) {
            return fallback(userMessage, "DeepSeek API Key 未配置");
        }
        try {
            String prompt = "请根据下面的对话生成一个简洁的中文对话标题。"
                    + "要求：不超过 16 个字，不要引号，不要句号，不要解释，只输出 JSON：{\"title\":\"\"}。\n"
                    + "用户：" + userMessage + "\n"
                    + "助手：" + (assistantMessage.isBlank() ? "（暂无回答）" : assistantMessage);
            DeepSeekClient.Completion completion = deepSeekClient.complete(List.of(
                    Map.of("role", "system", "content", "你只输出合法 JSON，不要输出 markdown。"),
                    Map.of("role", "user", "content", prompt)), 0.3, 200);
            JsonNode node = parseJson(completion.content());
            String title = node == null ? "" : node.path("title").asText("").trim();
            if (title.isBlank()) {
                return fallback(userMessage, "AI 返回标题为空");
            }
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("title", title);
            result.put("degraded", false);
            result.put("model", completion.model());
            result.put("fallbackReason", null);
            return result;
        } catch (Exception ex) {
            log.warn("Conversation title generation failed: {}", ex.getMessage());
            return fallback(userMessage, "AI 服务暂不可用，已使用问题摘要");
        }
    }

    private JsonNode parseJson(String content) {
        if (content == null || content.isBlank()) {
            return null;
        }
        String text = content.trim();
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start < 0 || end <= start) {
            return null;
        }
        try {
            return objectMapper.readTree(text.substring(start, end + 1));
        } catch (Exception ex) {
            return null;
        }
    }

    private static Map<String, Object> fallback(String userMessage, String reason) {
        String normalized = userMessage.replace('\n', ' ').replace('\r', ' ').trim();
        String title = normalized.length() <= 16 ? normalized : normalized.substring(0, 16) + "…";
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("title", title.isBlank() ? "新的对话" : title);
        result.put("degraded", true);
        result.put("model", "fallback");
        result.put("fallbackReason", reason);
        return result;
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }

    public record TitleRequest(String userMessage, String assistantMessage) {
    }
}
