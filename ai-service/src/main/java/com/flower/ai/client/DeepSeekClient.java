package com.flower.ai.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.flower.ai.config.AiServiceProperties;
import com.flower.ai.support.AiServiceException;
import com.flower.ai.support.HttpJsonClient;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

@Component
public class DeepSeekClient {

    private final AiServiceProperties properties;
    private final HttpJsonClient http;

    public DeepSeekClient(AiServiceProperties properties, HttpJsonClient http) {
        this.properties = properties;
        this.http = http;
    }

    public boolean available() {
        String key = properties.getDeepseek().getApiKey();
        return key != null && !key.isBlank();
    }

    public Completion complete(List<Map<String, String>> messages, double temperature, int maxTokens) {
        if (!available()) {
            throw new AiServiceException("DeepSeek API Key 未配置");
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", properties.getDeepseek().getChatModel());
        body.put("messages", messages);
        body.put("temperature", temperature);
        body.put("max_tokens", maxTokens);
        body.put("stream", false);
        body.put("response_format", Map.of("type", "json_object"));
        JsonNode response = http.post(base() + "/chat/completions", headers(), body, Duration.ofSeconds(60));
        String content = response.path("choices").path(0).path("message").path("content").asText("");
        JsonNode usage = response.path("usage");
        return new Completion(content,
                usage.path("prompt_tokens").asInt(0),
                usage.path("completion_tokens").asInt(0),
                response.path("model").asText(properties.getDeepseek().getChatModel()));
    }

    public Completion stream(List<Map<String, String>> messages, double temperature, int maxTokens,
                             Consumer<String> onDelta) {
        if (!available()) {
            throw new AiServiceException("DeepSeek API Key 未配置");
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", properties.getDeepseek().getChatModel());
        body.put("messages", messages);
        body.put("temperature", temperature);
        body.put("max_tokens", maxTokens);
        body.put("stream", true);
        body.put("stream_options", Map.of("include_usage", true));
        HttpResponse<InputStream> response = http.postStream(base() + "/chat/completions", headers(), body,
                Duration.ofSeconds(90));
        StringBuilder content = new StringBuilder();
        int promptTokens = 0;
        int completionTokens = 0;
        String model = properties.getDeepseek().getChatModel();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.startsWith("data:")) {
                    continue;
                }
                String payload = line.substring(5).trim();
                if (payload.isEmpty() || "[DONE]".equals(payload)) {
                    continue;
                }
                JsonNode node = http.mapper().readTree(payload);
                if (!node.path("model").asText("").isBlank()) {
                    model = node.path("model").asText(model);
                }
                JsonNode usage = node.path("usage");
                if (!usage.isMissingNode() && !usage.isNull()) {
                    promptTokens = usage.path("prompt_tokens").asInt(promptTokens);
                    completionTokens = usage.path("completion_tokens").asInt(completionTokens);
                }
                JsonNode choices = node.path("choices");
                if (choices.isArray() && !choices.isEmpty()) {
                    String delta = choices.get(0).path("delta").path("content").asText("");
                    if (!delta.isEmpty()) {
                        content.append(delta);
                        onDelta.accept(delta);
                    }
                }
            }
        } catch (Exception ex) {
            throw new AiServiceException("DeepSeek 流式响应解析失败: " + ex.getMessage(), ex);
        }
        return new Completion(content.toString(), promptTokens, completionTokens, model);
    }

    private Map<String, String> headers() {
        return Map.of("Authorization", "Bearer " + properties.getDeepseek().getApiKey());
    }

    private String base() {
        String value = properties.getDeepseek().getBaseUrl();
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    public record Completion(String content, int promptTokens, int completionTokens, String model) {
    }
}
