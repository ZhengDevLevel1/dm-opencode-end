import { api, ApiError } from "./api-client";
import { getToken } from "./storage";
import {
  getRecommendationSessionId,
  newRecommendationRequestId,
  recommendationAttribution,
  rememberRecommendation,
  trackRecommendationAddToCart,
} from "./recommendation-tracking";
import type {
  AiCallLogQuery,
  AiCallLogVO,
  AiChatHandlers,
  AiChatRequest,
  AiConversation,
  AiConversationDetail,
  AiHealthVO,
  AiKnowledgeDocument,
  AiMetricsVO,
  AiProductCopyApplyRequest,
  AiProductCopyRequest,
  AiProductCopyVO,
  AiPromptTag,
  AiPromptTagBulkRequest,
  AiPromptTagBundle,
  AiPromptTagGenerateRequest,
  AiPromptTagGenerateResult,
  AiPromptTagRequest,
  AiReindexVO,
  AiStatusVO,
  AiWeightAdviceApplyRequest,
  AiWeightAdviceRequest,
  AiWeightAdviceVO,
  KnowledgeDocumentRequest,
  RecommendationEffectVO,
  RecommendationExperimentRequest,
  RecommendationExperimentVO,
} from "@/types/api";
import type {
  AddressSaveRequest,
  AddressVO,
  AdminReviewQuery,
  AdminUserCreateRequest,
  AdminUserQuery,
  AdminUserUpdateRequest,
  AfterSaleHandleRequest,
  AfterSaleRequest,
  AuthBackgroundRequest,
  AuthBackgroundVO,
  BusinessHourBatchRequest,
  BusinessHourVO,
  CancelOrderRequest,
  CartAddRequest,
  CartItemVO,
  CartUpdateRequest,
  CategorySalesVO,
  ChangePasswordRequest,
  CreateOrderRequest,
  DictOptions,
  EmailCodeLoginRequest,
  EmailCodeRequest,
  FileUploadVO,
  FlowerMaterialSaveRequest,
  FlowerMaterialVO,
  FulfillmentRequest,
  FulfillmentVO,
  ImageCategory,
  InventoryQuery,
  InventoryRecord,
  LoginRequest,
  LoginResponse,
  MapPreference,
  OperationLog,
  OperationLogQuery,
  OrderQuery,
  OrderStatusVO,
  OrderVO,
  OverviewStatsVO,
  PageResult,
  PaymentVO,
  ProductQuery,
  ProductSaveRequest,
  ProductStatus,
  ProductVO,
  RecommendationEvaluationVO,
  RecommendationLogQuery,
  RecommendationLogVO,
  RecommendationQueryParams,
  RecommendationResponse,
  RecommendationSceneWeightVO,
  RecommendationSceneWeightsRequest,
  RecommendationStatsVO,
  RecommendationWeightRequest,
  RecommendationWeightsVO,
  RegisterRequest,
  ResetPasswordRequest,
  ReviewCreateRequest,
  ReviewPageQuery,
  ThemePreference,
  ThemePreferenceRequest,
  ReviewReplyRequest,
  ReviewStatus,
  MetricConfig,
  TagOptionVO,
  TagOverview,
  TagType,
  ReviewVO,
  SalesTrendVO,
  StaffOrderQuery,
  StockAdjustRequest,
  TopProductVO,
  UpdateProfileRequest,
  UserVO,
  WrapColorSaveRequest,
  WrapColorVO,
} from "@/types/api";

export const appearanceService = {
  authBackground: () => api.get<AuthBackgroundVO>("/appearance/auth-background"),
  updateAuthBackground: (body: AuthBackgroundRequest) =>
    api.put<AuthBackgroundVO>("/admin/appearance/auth-background", body),
};

export const authService = {
  login: (body: LoginRequest) =>
    api.post<LoginResponse>("/auth/login", body, { skipAuthRedirect: true }),
  loginByEmail: (body: EmailCodeLoginRequest) =>
    api.post<LoginResponse>("/auth/login/email", body, { skipAuthRedirect: true }),
  sendEmailCode: (body: EmailCodeRequest) =>
    api.post<void>("/auth/email-code", body, { skipAuthRedirect: true }),
  register: (body: RegisterRequest) =>
    api.post<UserVO>("/auth/register", body, { skipAuthRedirect: true }),
  logout: () => api.post<void>("/auth/logout", undefined, { skipAuthRedirect: true }),
  me: () => api.get<UserVO>("/auth/me", { skipAuthRedirect: true }),
  updateProfile: (body: UpdateProfileRequest) => api.put<UserVO>("/auth/me", body),
  changePassword: (body: ChangePasswordRequest) => api.put<void>("/auth/password", body),
};

export const fileService = {
  uploadImage: (file: File, category: ImageCategory) => {
    const form = new FormData();
    form.append("file", file);
    form.append("category", category);
    return api.post<FileUploadVO>("/files/images", form, { timeout: 30_000 });
  },
};

export const catalogService = {
  flowerMaterials: () => api.get<FlowerMaterialVO[]>("/catalog/flower-materials"),
  wrapColors: () => api.get<WrapColorVO[]>("/catalog/wrap-colors"),
  businessHours: () => api.get<BusinessHourVO[]>("/catalog/business-hours"),
};

export const dictService = {
  options: () => api.get<DictOptions>("/dict/options"),
};

export const preferenceService = {
  get: () => api.get<ThemePreference | null>("/auth/preferences"),
  save: (body: ThemePreferenceRequest) =>
    api.put<ThemePreference>("/auth/preferences", body),
  getMap: () => api.get<MapPreference>("/auth/preferences/map"),
  saveMap: (body: MapPreference) =>
    api.put<MapPreference>("/auth/preferences/map", body),
};

export const productService = {
  list: (query: ProductQuery) => api.get<PageResult<ProductVO>>("/products", { query }),
  hot: () => api.get<ProductVO[]>("/products/hot"),
  detail: (id: number) => api.get<ProductVO>(`/products/${id}`),
};

export const cartService = {
  list: () => api.get<CartItemVO[]>("/cart"),
  add: (body: CartAddRequest) => {
    const attribution = body.attribution ?? recommendationAttribution(body.productId);
    const payload = attribution ? { ...body, attribution } : body;
    return api.post<CartItemVO>("/cart/items", payload).then((item) => {
      trackRecommendationAddToCart(body.productId, body.quantity);
      return item;
    });
  },
  update: (id: number, body: CartUpdateRequest) =>
    api.put<CartItemVO>(`/cart/items/${id}`, body),
  remove: (id: number) => api.delete<void>(`/cart/items/${id}`),
  clear: () => api.delete<void>("/cart"),
};

export const addressService = {
  list: () => api.get<AddressVO[]>("/addresses"),
  detail: (id: number) => api.get<AddressVO>(`/addresses/${id}`),
  create: (body: AddressSaveRequest) => api.post<AddressVO>("/addresses", body),
  update: (id: number, body: AddressSaveRequest) =>
    api.put<AddressVO>(`/addresses/${id}`, body),
  setDefault: (id: number) => api.put<AddressVO>(`/addresses/${id}/default`, undefined),
  remove: (id: number) => api.delete<void>(`/addresses/${id}`),
};

export const favoriteService = {
  list: () => api.get<ProductVO[]>("/favorites"),
  add: (productId: number) => api.post<void>(`/favorites/${productId}`),
  remove: (productId: number) => api.delete<void>(`/favorites/${productId}`),
};

export const orderService = {
  create: (body: CreateOrderRequest) => api.post<OrderVO>("/orders", body),
  list: (query: OrderQuery) => api.get<PageResult<OrderVO>>("/orders", { query }),
  detail: (id: number) => api.get<OrderVO>(`/orders/${id}`),
  cancel: (id: number, body?: CancelOrderRequest) =>
    api.post<OrderVO>(`/orders/${id}/cancel`, body ?? {}),
  afterSale: (id: number, body: AfterSaleRequest) =>
    api.post<OrderVO>(`/orders/${id}/after-sale`, body),
  fulfillments: (id: number) => api.get<FulfillmentVO[]>(`/orders/${id}/fulfillments`),
};

export const paymentService = {
  create: (orderId: number) => api.post<PaymentVO>(`/payments/orders/${orderId}`, undefined),
  mockCallback: (paymentNo: string) =>
    api.post<PaymentVO>(`/payments/${paymentNo}/mock-callback`, undefined),
  byOrder: (orderId: number) => api.get<PaymentVO | undefined>(`/payments/orders/${orderId}`),
};

export const reviewService = {
  create: (body: ReviewCreateRequest) => api.post<ReviewVO>("/reviews", body),
  productReviews: (productId: number, query: ReviewPageQuery) =>
    api.get<PageResult<ReviewVO>>(`/reviews/products/${productId}`, { query }),
  myReviews: (query: ReviewPageQuery) =>
    api.get<PageResult<ReviewVO>>("/reviews/my", { query }),
};

export const recommendationService = {
  get: async (params: RecommendationQueryParams) => {
    const response = await api.get<RecommendationResponse>("/recommendations", {
      query: { ...params },
    });
    const requestId = response.requestId ?? newRecommendationRequestId();
    rememberRecommendation(response, requestId);
    return { ...response, requestId };
  },
};

export const staffService = {
  orders: (query: StaffOrderQuery) =>
    api.get<PageResult<OrderVO>>("/staff/orders", { query }),
  order: (id: number) => api.get<OrderVO>(`/staff/orders/${id}`),
  products: (query: ProductQuery) =>
    api.get<PageResult<ProductVO>>("/staff/products", { query }),
  product: (id: number) => api.get<ProductVO>(`/staff/products/${id}`),
  accept: (id: number) => api.post<FulfillmentVO[]>(`/staff/orders/${id}/accept`, undefined),
  advance: (id: number, body: FulfillmentRequest) =>
    api.post<FulfillmentVO[]>(`/staff/orders/${id}/fulfillment`, body),
  cancel: (id: number, body?: CancelOrderRequest) =>
    api.post<OrderVO>(`/staff/orders/${id}/cancel`, body ?? {}),
  afterSale: (id: number, body: AfterSaleHandleRequest) =>
    api.post<OrderVO>(`/staff/orders/${id}/after-sale`, body),
  fulfillments: (id: number) => api.get<FulfillmentVO[]>(`/staff/orders/${id}/fulfillments`),
  adjustStock: (productId: number, body: StockAdjustRequest) =>
    api.post<InventoryRecord>(`/staff/products/${productId}/stock`, body),
  inventory: (query: InventoryQuery) =>
    api.get<PageResult<InventoryRecord>>("/staff/inventory", { query }),
};

export const adminService = {
  users: (query: AdminUserQuery) =>
    api.get<PageResult<UserVO>>("/admin/users", { query }),
  user: (id: number) => api.get<UserVO>(`/admin/users/${id}`),
  createUser: (body: AdminUserCreateRequest) => api.post<UserVO>("/admin/users", body),
  updateUser: (id: number, body: AdminUserUpdateRequest) =>
    api.put<UserVO>(`/admin/users/${id}`, body),
  resetPassword: (id: number, body: ResetPasswordRequest) =>
    api.put<void>(`/admin/users/${id}/password`, body),

  products: (query: ProductQuery) =>
    api.get<PageResult<ProductVO>>("/admin/products", { query }),
  product: (id: number) => api.get<ProductVO>(`/admin/products/${id}`),
  createProduct: (body: ProductSaveRequest) =>
    api.post<ProductVO>("/admin/products", body),
  updateProduct: (id: number, body: ProductSaveRequest) =>
    api.put<ProductVO>(`/admin/products/${id}`, body),
  setProductStatus: (id: number, status: ProductStatus) =>
    api.put<ProductVO>(`/admin/products/${id}/status`, undefined, { query: { status } }),
  flowerMaterials: () => api.get<FlowerMaterialVO[]>("/admin/catalog/flower-materials"),
  createFlowerMaterial: (body: FlowerMaterialSaveRequest) =>
    api.post<FlowerMaterialVO>("/admin/catalog/flower-materials", body),
  updateFlowerMaterial: (id: number, body: FlowerMaterialSaveRequest) =>
    api.put<FlowerMaterialVO>(`/admin/catalog/flower-materials/${id}`, body),
  deleteFlowerMaterial: (id: number) =>
    api.delete<void>(`/admin/catalog/flower-materials/${id}`),
  wrapColors: () => api.get<WrapColorVO[]>("/admin/catalog/wrap-colors"),
  createWrapColor: (body: WrapColorSaveRequest) =>
    api.post<WrapColorVO>("/admin/catalog/wrap-colors", body),
  updateWrapColor: (id: number, body: WrapColorSaveRequest) =>
    api.put<WrapColorVO>(`/admin/catalog/wrap-colors/${id}`, body),
  deleteWrapColor: (id: number) => api.delete<void>(`/admin/catalog/wrap-colors/${id}`),
  businessHours: () => api.get<BusinessHourVO[]>("/admin/catalog/business-hours"),
  saveBusinessHours: (body: BusinessHourBatchRequest) =>
    api.put<BusinessHourVO[]>("/admin/catalog/business-hours", body),
  deleteProduct: (id: number) => api.delete<void>(`/admin/products/${id}`),

  reviews: (query: AdminReviewQuery) =>
    api.get<PageResult<ReviewVO>>("/admin/reviews", { query }),
  setReviewStatus: (id: number, status: ReviewStatus) =>
    api.put<ReviewVO>(`/admin/reviews/${id}/status`, undefined, { query: { status } }),
  replyReview: (id: number, body: ReviewReplyRequest) =>
    api.put<ReviewVO>(`/admin/reviews/${id}/reply`, body),

  logs: (query: OperationLogQuery) =>
    api.get<PageResult<OperationLog>>("/admin/operation-logs", { query }),

  weights: () => api.get<RecommendationWeightsVO>("/admin/recommendations/weights"),
  saveWeights: (body: RecommendationWeightRequest) =>
    api.put<RecommendationWeightsVO>("/admin/recommendations/weights", body),
  sceneWeights: () =>
    api.get<RecommendationSceneWeightVO[]>("/admin/recommendations/scene-weights"),
  saveSceneWeights: (body: RecommendationSceneWeightsRequest) =>
    api.put<RecommendationSceneWeightVO[]>("/admin/recommendations/scene-weights", body),
  recommendationLogs: (query: RecommendationLogQuery) =>
    api.get<PageResult<RecommendationLogVO>>("/admin/recommendations/logs", { query }),
  evaluation: () =>
    api.get<RecommendationEvaluationVO>("/admin/recommendations/evaluation"),
  recommendationStats: () =>
    api.get<RecommendationStatsVO>("/admin/recommendations/stats"),

  metricConfig: () => api.get<MetricConfig>("/admin/metrics"),
  updateMetricConfig: (body: Omit<MetricConfig, "updatedAt">) =>
    api.put<MetricConfig>("/admin/metrics", body),

  tagOverview: () => api.get<TagOverview>("/admin/tags"),
  createTag: (type: TagType, name: string) =>
    api.post<TagOptionVO>("/admin/tags", { type, name }),
  renameTag: (id: number, name: string) =>
    api.put<TagOptionVO>(`/admin/tags/${id}`, { name }),
  deleteTag: (id: number) => api.delete<void>(`/admin/tags/${id}`),
  updateTagMaxCount: (type: TagType, maxCount: number) =>
    api.put<{ maxCount: number }>("/admin/tags/max-count", { type, maxCount }),
  updateTagHomeDisplay: (
    type: TagType,
    items: Array<{ id: number; visible: boolean }>,
  ) => api.put<void>("/admin/tags/home-display", { type, items }),

  overview: () => api.get<OverviewStatsVO>("/admin/stats/overview"),
  salesTrend: (days: number) =>
    api.get<SalesTrendVO[]>("/admin/stats/sales-trend", { query: { days } }),
  categorySales: () => api.get<CategorySalesVO[]>("/admin/stats/category-sales"),
  orderStatus: () => api.get<OrderStatusVO[]>("/admin/stats/order-status"),
  topProducts: () => api.get<TopProductVO[]>("/admin/stats/top-products"),
};


const aiSessionHeaders = () => ({
  "X-Session-Id": getRecommendationSessionId(),
});

export const aiService = {
  status: () => api.get<AiStatusVO>("/ai/status"),

  promptTags: () => api.get<AiPromptTagBundle>("/ai/prompt-tags"),

  conversations: () =>
    api.get<AiConversation[]>("/ai/conversations", { headers: aiSessionHeaders() }),

  createConversation: () =>
    api.post<AiConversation>("/ai/conversations", undefined, {
      headers: aiSessionHeaders(),
    }),

  conversation: (id: number) =>
    api.get<AiConversationDetail>(`/ai/conversations/${id}`, {
      headers: aiSessionHeaders(),
    }),

  renameConversation: (id: number, title: string) =>
    api.put<AiConversation>(`/ai/conversations/${id}`, { title }, {
      headers: aiSessionHeaders(),
    }),

  deleteConversation: (id: number) =>
    api.delete<void>(`/ai/conversations/${id}`, { headers: aiSessionHeaders() }),

  batchDeleteConversations: (ids: number[]) =>
    api.post<{ count: number }>("/ai/conversations/batch-delete", { ids }, {
      headers: aiSessionHeaders(),
    }),

  batchPinConversations: (ids: number[], pinned = true) =>
    api.post<{ count: number }>("/ai/conversations/batch-pin", { ids, pinned }, {
      headers: aiSessionHeaders(),
    }),

  chat: async (
    body: AiChatRequest,
    handlers: AiChatHandlers = {},
    signal?: AbortSignal,
  ) => {
    const base = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");
    const sessionId = body.sessionId || getRecommendationSessionId();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "X-Session-Id": sessionId,
    };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${base}/ai/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, sessionId }),
      signal,
    });
    if (!response.ok) {
      let message = `AI ���񷵻� ${response.status}`;
      try {
        const payload = (await response.json()) as { message?: string };
        if (payload?.message) message = payload.message;
      } catch {
        // ignore non-JSON error body
      }
      throw new ApiError(message, response.status, response.status);
    }
    if (!response.body) {
      throw new ApiError("��ǰ�������֧����ʽ��Ӧ", 0, 0);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      handlers.onDone?.();
    };

    const dispatch = (block: string) => {
      let eventName = "message";
      const dataLines: string[] = [];
      block.split(/\r?\n/).forEach((line) => {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      });
      if (dataLines.length === 0) return;
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(dataLines.join("\n")) as Record<string, unknown>;
      } catch {
        return;
      }
      if (eventName === "meta") {
        handlers.onMeta?.(payload as never);
      } else if (eventName === "delta") {
        const content = typeof payload.content === "string" ? payload.content : "";
        if (content) handlers.onDelta?.(content);
      } else if (eventName === "products") {
        const items = Array.isArray(payload.items) ? payload.items : [];
        handlers.onProducts?.(items as never);
      } else if (eventName === "citations") {
        const items = Array.isArray(payload.items) ? payload.items : [];
        handlers.onCitations?.(items as never);
      } else if (eventName === "suggestions") {
        const items = Array.isArray(payload.items)
          ? payload.items.filter((item): item is string => typeof item === "string")
          : [];
        handlers.onSuggestions?.(items);
      } else if (eventName === "usage") {
        handlers.onUsage?.(payload as never);
      } else if (eventName === "error") {
        const message =
          typeof payload.message === "string" ? payload.message : "AI ������ʱ������";
        handlers.onError?.(message);
      } else if (eventName === "done") {
        finish();
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        if (block.trim()) dispatch(block);
        boundary = buffer.indexOf("\n\n");
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) dispatch(buffer);
    finish();
  },

  adminHealth: () => api.get<AiHealthVO>("/admin/ai/health"),
  adminMetrics: (days = 30) =>
    api.get<AiMetricsVO>("/admin/ai/metrics", { query: { days } }),
  adminCalls: (query: AiCallLogQuery) =>
    api.get<PageResult<AiCallLogVO>>("/admin/ai/calls", { query }),
  adminReindex: () => api.post<AiReindexVO>("/admin/ai/reindex", undefined, { timeout: 60_000 }),
  adminPromptTags: () => api.get<AiPromptTag[]>("/admin/ai/prompt-tags"),
  createPromptTag: (body: AiPromptTagRequest) =>
    api.post<AiPromptTag>("/admin/ai/prompt-tags", body),
  updatePromptTag: (id: number, body: AiPromptTagRequest) =>
    api.put<AiPromptTag>(`/admin/ai/prompt-tags/${id}`, body),
  deletePromptTag: (id: number) =>
    api.delete<void>(`/admin/ai/prompt-tags/${id}`),
  bulkPromptTags: (body: AiPromptTagBulkRequest) =>
    api.post<AiPromptTag[]>("/admin/ai/prompt-tags/bulk", body),
  generatePromptTags: (body: AiPromptTagGenerateRequest) =>
    api.post<AiPromptTagGenerateResult>("/admin/ai/prompt-tags/generate", body, {
      timeout: 30_000,
    }),
  adminKnowledge: (query: { keyword?: string; category?: string; enabled?: boolean } = {}) =>
    api.get<AiKnowledgeDocument[]>("/admin/ai/knowledge", { query }),
  createKnowledge: (body: KnowledgeDocumentRequest) =>
    api.post<AiKnowledgeDocument>("/admin/ai/knowledge", body),
  updateKnowledge: (id: number, body: KnowledgeDocumentRequest) =>
    api.put<AiKnowledgeDocument>(`/admin/ai/knowledge/${id}`, body),
  deleteKnowledge: (id: number) => api.delete<void>(`/admin/ai/knowledge/${id}`),
  productCopy: (body: AiProductCopyRequest) =>
    api.post<AiProductCopyVO>("/admin/ai/product-copy", body, { timeout: 30_000 }),
  applyProductCopy: (body: AiProductCopyApplyRequest) =>
    api.post<ProductVO>("/admin/ai/product-copy/apply", body),
  recommendationAdvice: (body: AiWeightAdviceRequest) =>
    api.post<AiWeightAdviceVO>("/admin/ai/recommendation-advice", body, { timeout: 30_000 }),
  applyRecommendationAdvice: (body: AiWeightAdviceApplyRequest) =>
    api.post<RecommendationSceneWeightVO[]>("/admin/ai/recommendation-advice/apply", body),
};

export const recommendationOpsService = {
  effects: (days = 30) =>
    api.get<RecommendationEffectVO>("/admin/recommendations/effects", { query: { days } }),
  experiments: () =>
    api.get<RecommendationExperimentVO[]>("/admin/recommendations/experiments"),
  saveExperiment: (body: RecommendationExperimentRequest) =>
    api.post<RecommendationExperimentVO>("/admin/recommendations/experiments", body),
  updateExperimentStatus: (id: string, status: string) =>
    api.put<RecommendationExperimentVO>(`/admin/recommendations/experiments/${id}/status`, {
      status,
    }),
};
