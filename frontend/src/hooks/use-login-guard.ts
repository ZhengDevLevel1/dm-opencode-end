import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { toast } from "@/stores/toast";

export function useLoginGuard() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const location = useLocation();

  const requireLogin = useCallback(() => {
    if (user) return true;
    toast.info("请先登录", "登录后即可继续挑选与收藏花礼。");
    navigate(
      `/login?redirect=${encodeURIComponent(`${location.pathname}${location.search}`)}`,
    );
    return false;
  }, [user, navigate, location.pathname, location.search]);

  return { user, isLoggedIn: Boolean(user), requireLogin };
}
