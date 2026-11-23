package com.flower.ai.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

@Component
public class HttpJsonClient {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public HttpJsonClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public JsonNode get(String url, Map<String, String> headers, Duration timeout) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url)).timeout(timeout).GET();
            headers.forEach(builder::header);
            HttpResponse<String> response = httpClient.send(builder.build(),
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 400) {
                throw new AiServiceException("HTTP " + response.statusCode() + ": " + abbreviate(response.body()));
            }
            return objectMapper.readTree(response.body());
        } catch (AiServiceException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AiServiceException("请求失败: " + ex.getMessage(), ex);
        }
    }

    public JsonNode post(String url, Map<String, String> headers, Object body, Duration timeout) {
        try {
            String json = objectMapper.writeValueAsString(body);
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
                    .timeout(timeout)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8));
            headers.forEach(builder::header);
            HttpResponse<String> response = httpClient.send(builder.build(),
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 400) {
                throw new AiServiceException("HTTP " + response.statusCode() + ": " + abbreviate(response.body()));
            }
            return objectMapper.readTree(response.body());
        } catch (AiServiceException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AiServiceException("请求失败: " + ex.getMessage(), ex);
        }
    }

    public JsonNode put(String url, Map<String, String> headers, Object body, Duration timeout) {
        try {
            String json = objectMapper.writeValueAsString(body);
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
                    .timeout(timeout)
                    .header("Content-Type", "application/json")
                    .PUT(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8));
            headers.forEach(builder::header);
            HttpResponse<String> response = httpClient.send(builder.build(),
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 400) {
                throw new AiServiceException("HTTP " + response.statusCode() + ": " + abbreviate(response.body()));
            }
            return objectMapper.readTree(response.body());
        } catch (AiServiceException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AiServiceException("请求失败: " + ex.getMessage(), ex);
        }
    }

    public JsonNode postForm(String url, Map<String, String> form, Duration timeout) {
        try {
            String body = form.entrySet().stream()
                    .map(entry -> urlEncode(entry.getKey()) + "=" + urlEncode(entry.getValue()))
                    .collect(java.util.stream.Collectors.joining("&"));
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(timeout)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 400) {
                throw new AiServiceException("HTTP " + response.statusCode() + ": " + abbreviate(response.body()));
            }
            String text = response.body();
            if (text == null || text.isBlank()) {
                return objectMapper.nullNode();
            }
            try {
                return objectMapper.readTree(text);
            } catch (Exception ignored) {
                return objectMapper.getNodeFactory().textNode(text);
            }
        } catch (AiServiceException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AiServiceException("请求失败: " + ex.getMessage(), ex);
        }
    }

    public JsonNode delete(String url, Duration timeout) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(timeout)
                    .DELETE()
                    .build();
            HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 400) {
                throw new AiServiceException("HTTP " + response.statusCode() + ": " + abbreviate(response.body()));
            }
            String text = response.body();
            return text == null || text.isBlank() ? objectMapper.nullNode() : objectMapper.readTree(text);
        } catch (AiServiceException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AiServiceException("请求失败: " + ex.getMessage(), ex);
        }
    }

    public HttpResponse<InputStream> postStream(String url, Map<String, String> headers, Object body, Duration timeout) {
        try {
            String json = objectMapper.writeValueAsString(body);
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
                    .timeout(timeout)
                    .header("Content-Type", "application/json")
                    .header("Accept", "text/event-stream")
                    .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8));
            headers.forEach(builder::header);
            HttpResponse<InputStream> response = httpClient.send(builder.build(),
                    HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() >= 400) {
                String bodyText;
                try (InputStream stream = response.body()) {
                    bodyText = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
                }
                throw new AiServiceException("HTTP " + response.statusCode() + ": " + abbreviate(bodyText));
            }
            return response;
        } catch (AiServiceException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new AiServiceException("请求失败: " + ex.getMessage(), ex);
        }
    }

    public ObjectMapper mapper() {
        return objectMapper;
    }

    private static String urlEncode(String value) {
        return java.net.URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private static String abbreviate(String value) {
        if (value == null) {
            return "";
        }
        return value.length() > 300 ? value.substring(0, 300) : value;
    }
}
