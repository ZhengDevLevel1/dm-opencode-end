package com.flower.ai.controller;

import com.flower.ai.client.DeepSeekClient;
import com.flower.ai.client.SiliconFlowClient;
import com.flower.ai.qdrant.QdrantService;
import com.flower.ai.service.AiIndexService;
import com.flower.ai.service.ChatService;
import com.flower.ai.service.MerchantService;
import com.flower.ai.service.PromptTagService;
import com.flower.ai.service.RetrievalService;
import com.flower.ai.service.TitleService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/internal/ai")
public class InternalAiController {

    private static final Logger log = LoggerFactory.getLogger(InternalAiController.class);

    private final RetrievalService retrievalService;
    private final ChatService chatService;
    private final MerchantService merchantService;
    private final PromptTagService promptTagService;
    private final TitleService titleService;
    private final AiIndexService indexService;
    private final QdrantService qdrantService;
    private final DeepSeekClient deepSeekClient;
    private final SiliconFlowClient siliconFlowClient;

    public InternalAiController(RetrievalService retrievalService,
                                ChatService chatService,
                                MerchantService merchantService,
                                PromptTagService promptTagService,
                                TitleService titleService,
                                AiIndexService indexService,
                                QdrantService qdrantService,
                                DeepSeekClient deepSeekClient,
                                SiliconFlowClient siliconFlowClient) {
        this.retrievalService = retrievalService;
        this.chatService = chatService;
        this.merchantService = merchantService;
        this.promptTagService = promptTagService;
        this.titleService = titleService;
        this.indexService = indexService;
        this.qdrantService = qdrantService;
        this.deepSeekClient = deepSeekClient;
        this.siliconFlowClient = siliconFlowClient;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        boolean qdrantReady = qdrantService.healthy();
        boolean llmReady = deepSeekClient.available();
        boolean embeddingReady = siliconFlowClient.available();
        String message;
        if (qdrantReady && llmReady && embeddingReady) {
            message = "AI 服务正常";
        } else if (qdrantReady) {
            message = "Qdrant 正常，LLM/Embedding 未完全配置，将使用降级能力";
        } else {
            message = "Qdrant 不可达，向量检索不可用，将使用数据库降级";
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "UP");
        body.put("qdrantReady", qdrantReady);
        body.put("llmReady", llmReady);
        body.put("embeddingReady", embeddingReady);
        body.put("message", message);
        return body;
    }

    @PostMapping("/reindex")
    public Map<String, Object> reindex(@RequestBody(required = false) ReindexRequest request) {
        boolean products = request == null || request.products() == null || request.products();
        boolean knowledge = request == null || request.knowledge() == null || request.knowledge();
        try {
            AiIndexService.IndexResult result = indexService.reindex(products, knowledge);
            return Map.of(
                    "accepted", result.accepted(),
                    "productCount", result.productCount(),
                    "knowledgeCount", result.knowledgeCount(),
                    "message", result.message());
        } catch (Exception ex) {
            log.warn("Reindex failed: {}", ex.getMessage());
            return Map.of(
                    "accepted", false,
                    "productCount", 0,
                    "knowledgeCount", 0,
                    "message", "索引重建失败: " + ex.getMessage());
        }
    }

    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chat(@RequestBody ChatService.ChatRequest request) {
        SseEmitter emitter = new SseEmitter(120_000L);
        chatService.stream(request, emitter);
        return emitter;
    }

    @PostMapping("/recommend")
    public Map<String, Object> recommend(@RequestBody RecommendRequest request) {
        List<Long> productIds = retrievalService.recommend(
                request.userId(), request.sessionId(), request.scene(),
                request.seedProductId(), request.limit() == null ? 20 : request.limit());
        return Map.of("productIds", productIds);
    }

    @PostMapping("/product-copy")
    public Map<String, Object> productCopy(@RequestBody MerchantService.ProductCopyRequest request) {
        return merchantService.productCopy(request);
    }

    @PostMapping("/recommendation-advice")
    public Map<String, Object> recommendationAdvice(@RequestBody MerchantService.AdviceRequest request) {
        return merchantService.recommendationAdvice(request);
    }

    @PostMapping("/prompt-tags")
    public Map<String, Object> promptTags(@RequestBody PromptTagService.PromptTagRequest request) {
        return promptTagService.generate(request);
    }

    @PostMapping("/title")
    public Map<String, Object> title(@RequestBody TitleService.TitleRequest request) {
        return titleService.generate(request);
    }

    public record ReindexRequest(Boolean products, Boolean knowledge) {
    }

    public record RecommendRequest(Long userId, String sessionId, String scene,
                                   Long seedProductId, Integer limit) {
    }
}
