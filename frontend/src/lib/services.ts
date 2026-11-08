import { api } from "./api-client";
import type {
  AdminReviewQuery,
  AdminUserCreateRequest,
  AdminUserQuery,
  AdminUserUpdateRequest,
  AfterSaleHandleRequest,
  AfterSaleRequest,
  AuthBackgroundRequest,
  AuthBackgroundVO,
  CancelOrderRequest,
  CartAddRequest,
  CartItemVO,
  CartUpdateRequest,
  CategorySalesVO,
  ChangePasswordRequest,
  CreateOrderRequest,
  DictOptions,
  FileUploadVO,
  FulfillmentRequest,
  FulfillmentVO,
  ImageCategory,
  InventoryQuery,
  InventoryRecord,
  LoginRequest,
  LoginResponse,
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
} from "@/types/api";

export const appearanceService = {
  authBackground: () => api.get<AuthBackgroundVO>("/appearance/auth-background"),
  updateAuthBackground: (body: AuthBackgroundRequest) =>
    api.put<AuthBackgroundVO>("/admin/appearance/auth-background", body),
};

export const authService = {
  login: (body: LoginRequest) =>
    api.post<LoginResponse>("/auth/login", body, { skipAuthRedirect: true }),
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

export const dictService = {
  options: () => api.get<DictOptions>("/dict/options"),
};

export const preferenceService = {
  get: () => api.get<ThemePreference | null>("/auth/preferences"),
  save: (body: ThemePreferenceRequest) =>
    api.put<ThemePreference>("/auth/preferences", body),
};

export const productService = {
  list: (query: ProductQuery) => api.get<PageResult<ProductVO>>("/products", { query }),
  hot: () => api.get<ProductVO[]>("/products/hot"),
  detail: (id: number) => api.get<ProductVO>(`/products/${id}`),
};

export const cartService = {
  list: () => api.get<CartItemVO[]>("/cart"),
  add: (body: CartAddRequest) => api.post<CartItemVO>("/cart/items", body),
  update: (id: number, body: CartUpdateRequest) =>
    api.put<CartItemVO>(`/cart/items/${id}`, body),
  remove: (id: number) => api.delete<void>(`/cart/items/${id}`),
  clear: () => api.delete<void>("/cart"),
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
  get: (params: RecommendationQueryParams) =>
    api.get<RecommendationResponse>("/recommendations", { query: { ...params } }),
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

  overview: () => api.get<OverviewStatsVO>("/admin/stats/overview"),
  salesTrend: (days: number) =>
    api.get<SalesTrendVO[]>("/admin/stats/sales-trend", { query: { days } }),
  categorySales: () => api.get<CategorySalesVO[]>("/admin/stats/category-sales"),
  orderStatus: () => api.get<OrderStatusVO[]>("/admin/stats/order-status"),
  topProducts: () => api.get<TopProductVO[]>("/admin/stats/top-products"),
};
