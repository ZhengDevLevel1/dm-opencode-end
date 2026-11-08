export interface ApiResponse<T> {
  code: number;
  message: string;
  data?: T;
  timestamp: number;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export type UserRole = "CUSTOMER" | "STAFF" | "ADMIN";
export type UserStatus = "ENABLED" | "DISABLED";
export type ProductStatus = "ON_SALE" | "OFF_SHELF";
export type SeasonSuitability = "SPRING" | "SUMMER" | "AUTUMN" | "WINTER" | "ALL";
export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "FULFILLING"
  | "COMPLETED"
  | "CANCELLED"
  | "AFTER_SALE"
  | "REFUNDED";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
export type FulfillmentNode = "ACCEPTED" | "PREPARING" | "DELIVERING" | "SIGNED";
export type ReviewStatus = "VISIBLE" | "HIDDEN";
export type InventoryChangeType =
  | "STOCK_IN"
  | "ORDER_DEDUCT"
  | "ORDER_CANCEL"
  | "MANUAL_ADJUST"
  | "AFTER_SALE_RESTORE";

export type ProductSort =
  | "sales_desc"
  | "price_asc"
  | "price_desc"
  | "newest"
  | "rating_desc"
  | "stock_asc"
  | "stock_desc";

export type StockLevel = "ALL" | "LOW" | "SUFFICIENT" | "OVERSTOCK";

export interface MetricConfig {
  priceMidThreshold: number;
  priceHighThreshold: number;
  stockLowThreshold: number;
  stockHighThreshold: number;
  updatedAt?: string;
}

export interface UserVO {
  id: number;
  username: string;
  nickname?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  role: UserRole;
  roleLabel: string;
  status: UserStatus;
  statusLabel: string;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  user: UserVO;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export type EmailCodeScene = "LOGIN" | "REGISTER";

export interface EmailCodeRequest {
  email: string;
  scene: EmailCodeScene;
}

export interface EmailCodeLoginRequest {
  email: string;
  code: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  nickname?: string;
  phone?: string;
  email: string;
  emailCode: string;
}

export interface UpdateProfileRequest {
  nickname?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
}

export type ImageCategory = "avatar" | "product" | "background";

export interface FileUploadVO {
  url: string;
  objectName: string;
  originalName?: string;
  contentType: string;
  size: number;
}

export type AuthBackgroundType = "NONE" | "GRADIENT" | "IMAGE";

export interface AuthBackgroundVO {
  backgroundType?: AuthBackgroundType;
  imageUrl?: string;
  backgroundOpacity?: number;
  backgroundBlur?: number;
  componentOpacity?: number;
  updatedAt?: string;
}

export interface AuthBackgroundRequest {
  backgroundType?: AuthBackgroundType;
  imageUrl: string;
  backgroundOpacity?: number;
  backgroundBlur?: number;
  componentOpacity?: number;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface AdminUserCreateRequest {
  username: string;
  password: string;
  nickname?: string;
  phone?: string;
  email?: string;
  role: UserRole;
}

export interface AdminUserUpdateRequest {
  nickname?: string;
  phone?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

export interface OptionItem {
  value: string;
  label: string;
}

export type TagType = "OCCASION" | "FESTIVAL" | "MEANING";

export interface TagOptionVO {
  id: number;
  name: string;
}

export interface TagOverview {
  occasions: TagOptionVO[];
  festivals: TagOptionVO[];
  flowerMeanings: TagOptionVO[];
  maxCounts: {
    occasions: number;
    festivals: number;
    flowerMeanings: number;
  };
}

export interface DictOptions {
  categories: string[];
  occasions: string[];
  festivals: string[];
  flowerMeanings: string[];
  tagMaxCounts: {
    occasions: number;
    festivals: number;
    flowerMeanings: number;
  };
  metrics: MetricConfig;
  priceBands: string[];
  seasons: OptionItem[];
  roles: OptionItem[];
  orderStatuses: OptionItem[];
  paymentStatuses: OptionItem[];
  reviewStatuses: OptionItem[];
  fulfillmentNodes: OptionItem[];
  inventoryChangeTypes: OptionItem[];
}

export interface ThemePreference {
  mode: "light" | "dark" | "system";
  palette: "default" | "rose-pine-dawn" | "catppuccin-latte" | "everforest-light" | "rose-pine";
  accent: "sky" | "blue" | "violet" | "rose" | "emerald" | "amber" | "orange" | "custom";
  customAccent: string;
  radius: "compact" | "default" | "comfortable" | "round";
  density: "compact" | "comfortable";
  sidebarStyle: "follow" | "panel" | "accent";
  scale: number;
  reduceMotion: boolean;
  highContrast: boolean;
  background: "solid" | "gradient" | "image";
  backgroundImage?: string | null;
  backgroundOpacity: number;
  backgroundBlur: number;
  componentOpacity: number;
  sidebarPinned: boolean;
  updatedAt?: string;
}

export type ThemePreferenceRequest = Omit<ThemePreference, "updatedAt">;

export interface ProductVO {
  id: number;
  name: string;
  category: string;
  flowerMeaning?: string;
  occasionTags?: string;
  festivalTags?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  imageUrl?: string;
  description?: string;
  seasonSuitability: SeasonSuitability;
  seasonLabel: string;
  priceBand: string;
  salesCount: number;
  ratingAvg: number;
  ratingCount: number;
  status: ProductStatus;
  statusLabel: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductQuery {
  page?: number;
  size?: number;
  keyword?: string;
  category?: string;
  occasion?: string;
  festival?: string;
  season?: SeasonSuitability;
  status?: ProductStatus;
  lowStock?: boolean;
  stockLevel?: StockLevel;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
}

export interface ProductSaveRequest {
  name: string;
  category: string;
  flowerMeaning?: string;
  occasionTags?: string;
  festivalTags?: string;
  price: number;
  originalPrice?: number;
  stock: number;
  imageUrl?: string;
  description?: string;
  seasonSuitability: SeasonSuitability;
  status?: ProductStatus;
}

export interface CartItemVO {
  id: number;
  productId: number;
  productName: string;
  productImage?: string;
  price: number;
  quantity: number;
  subtotal: number;
  stock: number;
  status: ProductStatus;
  statusLabel: string;
  available: boolean;
}

export interface CartAddRequest {
  productId: number;
  quantity: number;
}

export interface CartUpdateRequest {
  quantity: number;
}

export interface OrderItemVO {
  id: number;
  productId: number;
  productName: string;
  productImage?: string;
  category: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  reviewed: boolean;
}

export interface OrderVO {
  id: number;
  orderNo: string;
  userId: number;
  buyerUsername?: string;
  buyerNickname?: string;
  totalAmount: number;
  payAmount: number;
  status: OrderStatus;
  statusLabel: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  remark?: string;
  cancelReason?: string;
  afterSaleReason?: string;
  paidAt?: string;
  completedAt?: string;
  createdAt: string;
  items: OrderItemVO[];
}

export interface CreateOrderRequest {
  cartItemIds?: number[];
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  remark?: string;
}

export interface CancelOrderRequest {
  reason?: string;
}

export interface AfterSaleRequest {
  reason: string;
}

export interface AfterSaleHandleRequest {
  approved: boolean;
  remark?: string;
}

export interface PaymentVO {
  id: number;
  paymentNo: string;
  orderId: number;
  orderNo: string;
  amount: number;
  channel: string;
  status: PaymentStatus;
  statusLabel: string;
  paidAt?: string;
  createdAt: string;
}

export interface FulfillmentVO {
  id: number;
  orderId: number;
  orderNo: string;
  node: FulfillmentNode;
  nodeLabel: string;
  operatorName: string;
  remark?: string;
  createdAt: string;
}

export interface FulfillmentRequest {
  node: FulfillmentNode;
  remark?: string;
}

export interface ReviewCreateRequest {
  orderItemId: number;
  rating: number;
  content?: string;
}

export interface ReviewReplyRequest {
  reply: string;
}

export interface ReviewVO {
  id: number;
  orderId: number;
  orderItemId: number;
  productId: number;
  productName?: string;
  userId: number;
  nickname?: string;
  rating: number;
  content?: string;
  reply?: string;
  status: ReviewStatus;
  statusLabel: string;
  createdAt: string;
}

export interface StockAdjustRequest {
  delta: number;
  remark?: string;
}

export interface InventoryRecord {
  id: number;
  productId: number;
  productName: string;
  changeType: InventoryChangeType;
  changeQuantity: number;
  stockBefore: number;
  stockAfter: number;
  orderNo?: string;
  operatorId?: number;
  operatorName: string;
  remark?: string;
  createdAt: string;
}

export interface InventoryQuery {
  page?: number;
  size?: number;
  productId?: number;
  changeType?: InventoryChangeType;
  orderNo?: string;
  keyword?: string;
  start?: string;
  end?: string;
}

export interface OperationLog {
  id: number;
  userId?: number;
  username: string;
  module: string;
  operation: string;
  method: string;
  requestUri: string;
  requestMethod: string;
  requestParams?: string;
  success: number;
  errorMessage?: string;
  ip: string;
  durationMs: number;
  createdAt: string;
}

export interface OperationLogQuery {
  page?: number;
  size?: number;
  module?: string;
  username?: string;
  start?: string;
  end?: string;
}

export interface RecommendationQueryParams {
  limit?: number;
  festival?: string;
  season?: SeasonSuitability;
  scene?: string;
}

export interface RecommendationWeightsVO {
  contentWeight: number;
  popularityWeight: number;
  festivalWeight: number;
  ratingWeight: number;
  updatedBy?: number;
  updatedAt?: string;
}

export interface RecommendationWeightRequest {
  contentWeight: number;
  popularityWeight: number;
  festivalWeight: number;
  ratingWeight: number;
}

export interface RecommendationItemVO {
  productId: number;
  name: string;
  imageUrl?: string;
  category: string;
  price: number;
  originalPrice?: number;
  priceBand: string;
  occasionTags: string[];
  festivalTags: string[];
  seasonLabel?: string;
  salesCount: number;
  ratingAvg: number;
  ratingCount: number;
  score: number;
  contentSimilarity: number;
  popularityScore: number;
  festivalSeasonScore: number;
  ratingScore: number;
  reason: string;
  matchedTags: string[];
}

export interface RecommendationResponse {
  strategy: string;
  coldStart: boolean;
  season: SeasonSuitability;
  seasonLabel: string;
  festival?: string;
  scene: string;
  generatedAt: string;
  weights: RecommendationWeightsVO;
  items: RecommendationItemVO[];
}

export interface RecommendationLogVO {
  id: number;
  userId?: number;
  userNickname?: string;
  scene: string;
  sceneLabel: string;
  festival?: string;
  season: SeasonSuitability;
  seasonLabel: string;
  coldStart: boolean;
  productIds: string;
  weightsJson?: string;
  detailJson?: string;
  createdAt: string;
}

export interface RecommendationLogQuery {
  page?: number;
  size?: number;
  userId?: number;
  keyword?: string;
  start?: string;
  end?: string;
}

export interface PersonaResult {
  name: string;
  description: string;
  coldStart: boolean;
  itemCount: number;
  relevantCount: number;
  hitRate: number;
  precisionAt10: number;
  coverage: number;
  sampleReason?: string;
}

export interface RecommendationEvaluationVO {
  generatedAt: string;
  totalProducts: number;
  overallCoverage: number;
  personas: PersonaResult[];
}

export interface RecommendationStatsVO {
  totalRequests: number;
  distinctUsers: number;
  distinctRecommendedProducts: number;
  onSaleProducts: number;
  coverage: number;
  topRecommendedProductIds: string[];
}

export interface OverviewStatsVO {
  totalSales: number;
  todaySales: number;
  totalOrders: number;
  todayOrders: number;
  pendingFulfillment: number;
  lowStockProducts: number;
  onSaleProducts: number;
  customerCount: number;
  totalReviews: number;
  averageRating: number;
}

export interface SalesTrendVO {
  date: string;
  amount: number;
  orderCount: number;
}

export interface CategorySalesVO {
  category: string;
  amount: number;
  quantity: number;
}

export interface OrderStatusVO {
  status: OrderStatus;
  statusLabel: string;
  count: number;
}

export interface TopProductVO {
  productId: number;
  productName: string;
  quantity: number;
  amount: number;
}

export interface OrderQuery {
  page?: number;
  size?: number;
  status?: OrderStatus;
}

export interface StaffOrderQuery {
  page?: number;
  size?: number;
  status?: OrderStatus;
  keyword?: string;
  start?: string;
  end?: string;
}

export interface AdminUserQuery {
  page?: number;
  size?: number;
  keyword?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface AdminReviewQuery {
  page?: number;
  size?: number;
  productId?: number;
  status?: ReviewStatus;
  keyword?: string;
}

export interface ReviewPageQuery {
  page?: number;
  size?: number;
}
