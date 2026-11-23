package com.flower.ai.support;

import com.flower.ai.config.AiServiceProperties;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class NacosRegistrar {

    private static final Logger log = LoggerFactory.getLogger(NacosRegistrar.class);

    private final AiServiceProperties properties;
    private final HttpJsonClient http;
    private volatile boolean registered;

    public NacosRegistrar(AiServiceProperties properties, HttpJsonClient http) {
        this.properties = properties;
        this.http = http;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void register() {
        AiServiceProperties.Nacos nacos = properties.getNacos();
        if (!nacos.isEnabled()) {
            return;
        }
        Map<String, String> form = new LinkedHashMap<>();
        form.put("serviceName", nacos.getServiceName());
        form.put("ip", nacos.getIp());
        form.put("port", String.valueOf(nacos.getPort()));
        form.put("weight", "1");
        form.put("enabled", "true");
        form.put("healthy", "true");
        form.put("ephemeral", "false");
        form.put("metadata", "{\"source\":\"flower-ai-service\"}");
        try {
            http.postForm(base() + "/nacos/v1/ns/instance", form, Duration.ofSeconds(5));
            registered = true;
            log.info("Registered {} to Nacos at {}:{}", nacos.getServiceName(), nacos.getIp(), nacos.getPort());
        } catch (Exception ex) {
            log.warn("Nacos registration failed: {}", ex.getMessage());
        }
    }

    @PreDestroy
    public void deregister() {
        AiServiceProperties.Nacos nacos = properties.getNacos();
        if (!registered || !nacos.isEnabled()) {
            return;
        }
        Map<String, String> form = new LinkedHashMap<>();
        form.put("serviceName", nacos.getServiceName());
        form.put("ip", nacos.getIp());
        form.put("port", String.valueOf(nacos.getPort()));
        form.put("ephemeral", "false");
        try {
            http.delete(base() + "/nacos/v1/ns/instance?" + query(form), Duration.ofSeconds(3));
            log.info("Deregistered {} from Nacos", nacos.getServiceName());
        } catch (Exception ex) {
            log.debug("Nacos deregistration failed: {}", ex.getMessage());
        }
    }

    private String base() {
        String value = properties.getNacos().getServerAddr();
        if (!value.startsWith("http://") && !value.startsWith("https://")) {
            value = "http://" + value;
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private static String query(Map<String, String> form) {
        return form.entrySet().stream()
                .map(entry -> java.net.URLEncoder.encode(entry.getKey(), java.nio.charset.StandardCharsets.UTF_8)
                        + "=" + java.net.URLEncoder.encode(entry.getValue(), java.nio.charset.StandardCharsets.UTF_8))
                .collect(java.util.stream.Collectors.joining("&"));
    }
}
