package com.flower.ai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ai")
public class AiServiceProperties {

    private String internalToken = "flower-ai-internal-dev-token";
    private int chatContextMaxMessages = 40;
    private int chatContextMaxChars = 12000;
    private Qdrant qdrant = new Qdrant();
    private Siliconflow siliconflow = new Siliconflow();
    private Deepseek deepseek = new Deepseek();
    private Nacos nacos = new Nacos();

    public String getInternalToken() {
        return internalToken;
    }

    public void setInternalToken(String internalToken) {
        this.internalToken = internalToken;
    }

    public int getChatContextMaxMessages() {
        return chatContextMaxMessages;
    }

    public void setChatContextMaxMessages(int chatContextMaxMessages) {
        this.chatContextMaxMessages = chatContextMaxMessages;
    }

    public int getChatContextMaxChars() {
        return chatContextMaxChars;
    }

    public void setChatContextMaxChars(int chatContextMaxChars) {
        this.chatContextMaxChars = chatContextMaxChars;
    }

    public Qdrant getQdrant() {
        return qdrant;
    }

    public void setQdrant(Qdrant qdrant) {
        this.qdrant = qdrant;
    }

    public Siliconflow getSiliconflow() {
        return siliconflow;
    }

    public void setSiliconflow(Siliconflow siliconflow) {
        this.siliconflow = siliconflow;
    }

    public Deepseek getDeepseek() {
        return deepseek;
    }

    public void setDeepseek(Deepseek deepseek) {
        this.deepseek = deepseek;
    }

    public Nacos getNacos() {
        return nacos;
    }

    public void setNacos(Nacos nacos) {
        this.nacos = nacos;
    }

    public static class Qdrant {
        private String baseUrl = "http://127.0.0.1:6333";
        private String productCollection = "flower_products";
        private String knowledgeCollection = "flower_knowledge";
        private int vectorSize = 1024;

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getProductCollection() {
            return productCollection;
        }

        public void setProductCollection(String productCollection) {
            this.productCollection = productCollection;
        }

        public String getKnowledgeCollection() {
            return knowledgeCollection;
        }

        public void setKnowledgeCollection(String knowledgeCollection) {
            this.knowledgeCollection = knowledgeCollection;
        }

        public int getVectorSize() {
            return vectorSize;
        }

        public void setVectorSize(int vectorSize) {
            this.vectorSize = vectorSize;
        }
    }

    public static class Siliconflow {
        private String baseUrl = "https://api.siliconflow.cn/v1";
        private String apiKey = "";
        private String embeddingModel = "BAAI/bge-m3";
        private String rerankModel = "BAAI/bge-reranker-v2-m3";

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getEmbeddingModel() {
            return embeddingModel;
        }

        public void setEmbeddingModel(String embeddingModel) {
            this.embeddingModel = embeddingModel;
        }

        public String getRerankModel() {
            return rerankModel;
        }

        public void setRerankModel(String rerankModel) {
            this.rerankModel = rerankModel;
        }
    }

    public static class Deepseek {
        private String baseUrl = "https://api.deepseek.com";
        private String apiKey = "";
        private String chatModel = "deepseek-chat";

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getApiKey() {
            return apiKey;
        }

        public void setApiKey(String apiKey) {
            this.apiKey = apiKey;
        }

        public String getChatModel() {
            return chatModel;
        }

        public void setChatModel(String chatModel) {
            this.chatModel = chatModel;
        }
    }

    public static class Nacos {
        private boolean enabled = false;
        private String serverAddr = "127.0.0.1:8848";
        private String serviceName = "flower-ai-service";
        private String ip = "127.0.0.1";
        private int port = 8081;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getServerAddr() {
            return serverAddr;
        }

        public void setServerAddr(String serverAddr) {
            this.serverAddr = serverAddr;
        }

        public String getServiceName() {
            return serviceName;
        }

        public void setServiceName(String serviceName) {
            this.serviceName = serviceName;
        }

        public String getIp() {
            return ip;
        }

        public void setIp(String ip) {
            this.ip = ip;
        }

        public int getPort() {
            return port;
        }

        public void setPort(int port) {
            this.port = port;
        }
    }
}
