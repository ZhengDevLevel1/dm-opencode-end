export const routeLoaders = {
  home: () =>
    import("@/pages/home-page").then((module) => ({ default: module.HomePage })),
  products: () =>
    import("@/pages/products-page").then((module) => ({ default: module.ProductsPage })),
  productDetail: () =>
    import("@/pages/product-detail-page").then((module) => ({
      default: module.ProductDetailPage,
    })),
  recommendations: () =>
    import("@/pages/recommendations-page").then((module) => ({
      default: module.RecommendationsPage,
    })),
  ai: () => import("@/pages/ai-chat-page").then((module) => ({ default: module.AiChatPage })),
  cart: () => import("@/pages/cart-page").then((module) => ({ default: module.CartPage })),
  checkout: () =>
    import("@/pages/checkout-page").then((module) => ({ default: module.CheckoutPage })),
  orders: () =>
    import("@/pages/orders-page").then((module) => ({ default: module.OrdersPage })),
  orderDetail: () =>
    import("@/pages/order-detail-page").then((module) => ({
      default: module.OrderDetailPage,
    })),
  addresses: () =>
    import("@/pages/addresses-page").then((module) => ({ default: module.AddressesPage })),
  myReviews: () =>
    import("@/pages/my-reviews-page").then((module) => ({ default: module.MyReviewsPage })),
  favorites: () =>
    import("@/pages/favorites-page").then((module) => ({ default: module.FavoritesPage })),
  profile: () =>
    import("@/pages/profile-page").then((module) => ({ default: module.ProfilePage })),
  settings: () =>
    import("@/pages/settings-page").then((module) => ({ default: module.SettingsPage })),
  login: () =>
    import("@/pages/auth/login-page").then((module) => ({ default: module.LoginPage })),
  register: () =>
    import("@/pages/auth/register-page").then((module) => ({ default: module.RegisterPage })),
  staffOrders: () =>
    import("@/pages/staff/staff-orders-page").then((module) => ({
      default: module.StaffOrdersPage,
    })),
  staffOrderDetail: () =>
    import("@/pages/staff/staff-order-detail-page").then((module) => ({
      default: module.StaffOrderDetailPage,
    })),
  staffInventory: () =>
    import("@/pages/staff/staff-inventory-page").then((module) => ({
      default: module.StaffInventoryPage,
    })),
  adminDashboard: () =>
    import("@/pages/admin/admin-dashboard-page").then((module) => ({
      default: module.AdminDashboardPage,
    })),
  adminProducts: () =>
    import("@/pages/admin/admin-products-page").then((module) => ({
      default: module.AdminProductsPage,
    })),
  adminCatalog: () =>
    import("@/pages/admin/admin-catalog-page").then((module) => ({
      default: module.AdminCatalogPage,
    })),
  adminTags: () =>
    import("@/pages/admin/admin-tags-page").then((module) => ({
      default: module.AdminTagsPage,
    })),
  adminMetrics: () =>
    import("@/pages/admin/admin-metrics-page").then((module) => ({
      default: module.AdminMetricsPage,
    })),
  adminUsers: () =>
    import("@/pages/admin/admin-users-page").then((module) => ({
      default: module.AdminUsersPage,
    })),
  adminReviews: () =>
    import("@/pages/admin/admin-reviews-page").then((module) => ({
      default: module.AdminReviewsPage,
    })),
  adminRecommendations: () =>
    import("@/pages/admin/admin-recommendations-page").then((module) => ({
      default: module.AdminRecommendationsPage,
    })),
  adminAi: () => import("@/pages/admin/admin-ai-page").then((module) => ({ default: module.AdminAiPage })),
  adminMerchantAi: () =>
    import("@/pages/admin/admin-merchant-ai-page").then((module) => ({
      default: module.AdminMerchantAiPage,
    })),
  adminLogs: () =>
    import("@/pages/admin/admin-logs-page").then((module) => ({
      default: module.AdminLogsPage,
    })),
  storeBoard: () =>
    import("@/pages/admin/store-board-page").then((module) => ({
      default: module.StoreBoardPage,
    })),
};

const exactRoutes: Record<string, () => Promise<unknown>> = {
  "/": routeLoaders.home,
  "/products": routeLoaders.products,
  "/recommendations": routeLoaders.recommendations,
  "/ai": routeLoaders.ai,
  "/cart": routeLoaders.cart,
  "/checkout": routeLoaders.checkout,
  "/orders": routeLoaders.orders,
  "/addresses": routeLoaders.addresses,
  "/reviews": routeLoaders.myReviews,
  "/favorites": routeLoaders.favorites,
  "/profile": routeLoaders.profile,
  "/settings": routeLoaders.settings,
  "/staff/orders": routeLoaders.staffOrders,
  "/staff/inventory": routeLoaders.staffInventory,
  "/admin": routeLoaders.adminDashboard,
  "/admin/products": routeLoaders.adminProducts,
  "/admin/catalog": routeLoaders.adminCatalog,
  "/admin/tags": routeLoaders.adminTags,
  "/admin/metrics": routeLoaders.adminMetrics,
  "/admin/users": routeLoaders.adminUsers,
  "/admin/reviews": routeLoaders.adminReviews,
  "/admin/recommendations": routeLoaders.adminRecommendations,
  "/admin/ai": routeLoaders.adminAi,
  "/admin/merchant-ai": routeLoaders.adminMerchantAi,
  "/admin/logs": routeLoaders.adminLogs,
  "/board": routeLoaders.storeBoard,
  "/login": routeLoaders.login,
  "/register": routeLoaders.register,
};

const dynamicRoutes: Array<[RegExp, () => Promise<unknown>]> = [
  [/^\/products\/\d+\/preview$/, routeLoaders.productDetail],
  [/^\/products\/\d+$/, routeLoaders.productDetail],
  [/^\/orders\/\d+$/, routeLoaders.orderDetail],
  [/^\/staff\/orders\/\d+$/, routeLoaders.staffOrderDetail],
];

const preloaded = new Set<() => Promise<unknown>>();

export function preloadRoute(pathname: string) {
  const loader =
    exactRoutes[pathname] ?? dynamicRoutes.find(([pattern]) => pattern.test(pathname))?.[1];
  if (!loader || preloaded.has(loader)) return;
  preloaded.add(loader);
  void loader().catch(() => {
    preloaded.delete(loader);
  });
}
