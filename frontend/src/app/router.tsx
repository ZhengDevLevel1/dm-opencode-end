import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./shell/app-shell";
import { RequireAuth } from "./shell/require-auth";
import { RequireRole } from "./shell/require-role";
import { PageLoading } from "@/components/ui/page-loading";
import { ForbiddenPage } from "@/pages/forbidden";
import { NotFoundPage } from "@/pages/not-found";
import { routeLoaders } from "./route-loaders";

const HomePage = lazy(routeLoaders.home);
const ProductsPage = lazy(routeLoaders.products);
const ProductDetailPage = lazy(routeLoaders.productDetail);
const RecommendationsPage = lazy(routeLoaders.recommendations);
const AiChatPage = lazy(routeLoaders.ai);
const CartPage = lazy(routeLoaders.cart);
const CheckoutPage = lazy(routeLoaders.checkout);
const OrdersPage = lazy(routeLoaders.orders);
const OrderDetailPage = lazy(routeLoaders.orderDetail);
const AddressesPage = lazy(routeLoaders.addresses);
const MyReviewsPage = lazy(routeLoaders.myReviews);
const FavoritesPage = lazy(routeLoaders.favorites);
const ProfilePage = lazy(routeLoaders.profile);
const SettingsPage = lazy(routeLoaders.settings);
const LoginPage = lazy(routeLoaders.login);
const RegisterPage = lazy(routeLoaders.register);
const StaffOrdersPage = lazy(routeLoaders.staffOrders);
const StaffOrderDetailPage = lazy(routeLoaders.staffOrderDetail);
const StaffInventoryPage = lazy(routeLoaders.staffInventory);
const AdminDashboardPage = lazy(routeLoaders.adminDashboard);
const AdminProductsPage = lazy(routeLoaders.adminProducts);
const AdminCatalogPage = lazy(routeLoaders.adminCatalog);
const AdminTagsPage = lazy(routeLoaders.adminTags);
const AdminMetricsPage = lazy(routeLoaders.adminMetrics);
const AdminUsersPage = lazy(routeLoaders.adminUsers);
const AdminReviewsPage = lazy(routeLoaders.adminReviews);
const AdminRecommendationsPage = lazy(routeLoaders.adminRecommendations);
const AdminAiPage = lazy(routeLoaders.adminAi);
const AdminMerchantAiPage = lazy(routeLoaders.adminMerchantAi);
const AdminLogsPage = lazy(routeLoaders.adminLogs);
const StoreBoardPage = lazy(routeLoaders.storeBoard);

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    const main = document.getElementById("main-content");
    if (main) main.scrollTo({ top: 0, behavior: "auto" });
    else window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}

export function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoading />}>
        <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="recommendations" element={<RecommendationsPage />} />
          <Route path="ai" element={<AiChatPage />} />

          <Route
            path="cart"
            element={
              <RequireAuth>
                <CartPage />
              </RequireAuth>
            }
          />
          <Route
            path="checkout"
            element={
              <RequireAuth>
                <CheckoutPage />
              </RequireAuth>
            }
          />
          <Route
            path="orders"
            element={
              <RequireAuth>
                <OrdersPage />
              </RequireAuth>
            }
          />
          <Route
            path="orders/:id"
            element={
              <RequireAuth>
                <OrderDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="addresses"
            element={
              <RequireAuth>
                <AddressesPage />
              </RequireAuth>
            }
          />
          <Route
            path="reviews"
            element={
              <RequireAuth>
                <MyReviewsPage />
              </RequireAuth>
            }
          />
          <Route
            path="favorites"
            element={
              <RequireAuth>
                <FavoritesPage />
              </RequireAuth>
            }
          />
          <Route
            path="profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />

          <Route
            path="staff/orders"
            element={
              <RequireRole roles={["STAFF", "ADMIN"]}>
                <StaffOrdersPage />
              </RequireRole>
            }
          />
          <Route
            path="staff/orders/:id"
            element={
              <RequireRole roles={["STAFF", "ADMIN"]}>
                <StaffOrderDetailPage />
              </RequireRole>
            }
          />
          <Route
            path="staff/inventory"
            element={
              <RequireRole roles={["STAFF", "ADMIN"]}>
                <StaffInventoryPage />
              </RequireRole>
            }
          />

          <Route
            path="admin"
            element={
              <RequireRole roles={["ADMIN"]}>
                <AdminDashboardPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/products"
            element={
              <RequireRole roles={["ADMIN"]}>
                <AdminProductsPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/catalog"
            element={
              <RequireRole roles={["ADMIN"]}>
                <AdminCatalogPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/tags"
            element={
              <RequireRole roles={["ADMIN"]}>
                <AdminTagsPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/metrics"
            element={
              <RequireRole roles={["ADMIN"]}>
                <AdminMetricsPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/users"
            element={
              <RequireRole roles={["ADMIN"]}>
                <AdminUsersPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/reviews"
            element={
              <RequireRole roles={["ADMIN"]}>
                <AdminReviewsPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/recommendations"
            element={
              <RequireRole roles={["ADMIN"]}>
                <AdminRecommendationsPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/merchant-ai"
            element={
              <RequireRole roles={["ADMIN"]}>
                <AdminMerchantAiPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/ai"
            element={
              <RequireRole roles={["ADMIN"]}>
                <AdminAiPage />
              </RequireRole>
            }
          />
          <Route
            path="admin/logs"
            element={
              <RequireRole roles={["ADMIN"]}>
                <AdminLogsPage />
              </RequireRole>
            }
          />

          <Route path="forbidden" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route
          path="/board"
          element={
            <RequireRole roles={["ADMIN"]}>
              <StoreBoardPage />
            </RequireRole>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
