import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./shell/app-shell";
import { RequireAuth } from "./shell/require-auth";
import { RequireRole } from "./shell/require-role";
import { PageLoading } from "@/components/ui/page-loading";
import { ForbiddenPage } from "@/pages/forbidden";
import { NotFoundPage } from "@/pages/not-found";

const HomePage = lazy(() => import("@/pages/home-page").then((module) => ({ default: module.HomePage })));
const ProductsPage = lazy(() => import("@/pages/products-page").then((module) => ({ default: module.ProductsPage })));
const ProductDetailPage = lazy(() => import("@/pages/product-detail-page").then((module) => ({ default: module.ProductDetailPage })));
const RecommendationsPage = lazy(() => import("@/pages/recommendations-page").then((module) => ({ default: module.RecommendationsPage })));
const CartPage = lazy(() => import("@/pages/cart-page").then((module) => ({ default: module.CartPage })));
const CheckoutPage = lazy(() => import("@/pages/checkout-page").then((module) => ({ default: module.CheckoutPage })));
const OrdersPage = lazy(() => import("@/pages/orders-page").then((module) => ({ default: module.OrdersPage })));
const OrderDetailPage = lazy(() => import("@/pages/order-detail-page").then((module) => ({ default: module.OrderDetailPage })));
const MyReviewsPage = lazy(() => import("@/pages/my-reviews-page").then((module) => ({ default: module.MyReviewsPage })));
const FavoritesPage = lazy(() => import("@/pages/favorites-page").then((module) => ({ default: module.FavoritesPage })));
const ProfilePage = lazy(() => import("@/pages/profile-page").then((module) => ({ default: module.ProfilePage })));
const SettingsPage = lazy(() => import("@/pages/settings-page").then((module) => ({ default: module.SettingsPage })));
const LoginPage = lazy(() => import("@/pages/auth/login-page").then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("@/pages/auth/register-page").then((module) => ({ default: module.RegisterPage })));
const StaffOrdersPage = lazy(() => import("@/pages/staff/staff-orders-page").then((module) => ({ default: module.StaffOrdersPage })));
const StaffOrderDetailPage = lazy(() => import("@/pages/staff/staff-order-detail-page").then((module) => ({ default: module.StaffOrderDetailPage })));
const StaffInventoryPage = lazy(() => import("@/pages/staff/staff-inventory-page").then((module) => ({ default: module.StaffInventoryPage })));
const AdminDashboardPage = lazy(() => import("@/pages/admin/admin-dashboard-page").then((module) => ({ default: module.AdminDashboardPage })));
const AdminProductsPage = lazy(() => import("@/pages/admin/admin-products-page").then((module) => ({ default: module.AdminProductsPage })));
const AdminTagsPage = lazy(() => import("@/pages/admin/admin-tags-page").then((module) => ({ default: module.AdminTagsPage })));
const AdminMetricsPage = lazy(() => import("@/pages/admin/admin-metrics-page").then((module) => ({ default: module.AdminMetricsPage })));
const AdminUsersPage = lazy(() => import("@/pages/admin/admin-users-page").then((module) => ({ default: module.AdminUsersPage })));
const AdminReviewsPage = lazy(() => import("@/pages/admin/admin-reviews-page").then((module) => ({ default: module.AdminReviewsPage })));
const AdminRecommendationsPage = lazy(() => import("@/pages/admin/admin-recommendations-page").then((module) => ({ default: module.AdminRecommendationsPage })));
const AdminLogsPage = lazy(() => import("@/pages/admin/admin-logs-page").then((module) => ({ default: module.AdminLogsPage })));
const StoreBoardPage = lazy(() => import("@/pages/admin/store-board-page").then((module) => ({ default: module.StoreBoardPage })));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
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
