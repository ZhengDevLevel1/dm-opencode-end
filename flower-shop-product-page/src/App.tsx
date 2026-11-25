import { useCallback, useState } from "react";
import Navbar from "@/components/Navbar";
import Gallery from "@/components/Gallery";
import PurchasePanel from "@/components/PurchasePanel";
import DetailTabs from "@/components/DetailTabs";
import FloristNote from "@/components/FloristNote";
import { RelatedProducts } from "@/components/RelatedProducts";
import { Footer, StickyBar, Toast } from "@/components/Chrome";
import { ProductProvider } from "@/state";
import { product } from "@/data/product";

function Page() {
  const [cartCount, setCartCount] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);
  const [toast, setToast] = useState<{ message: string; sub?: string } | null>(null);

  const addToCart = useCallback((payload: { qty: number; spec: string; total: number }) => {
    setCartCount((c) => c + payload.qty);
    setToast({
      message: "已加入购物车",
      sub: `${product.name} · ${payload.spec} · 共 ${payload.qty} 束，合计 ¥${payload.total.toLocaleString()}`,
    });
  }, []);

  const buyNow = useCallback(() => {
    setToast({
      message: "正在跳转至结算页…",
      sub: "已为你保留库存 15 分钟，请尽快完成支付",
    });
  }, []);

  const toggleWish = () => {
    setWishlisted(!wishlisted);
    setToast({
      message: wishlisted ? "已从收藏夹移除" : "已加入收藏夹",
      sub: wishlisted ? undefined : "降价或补货时我们会第一时间提醒你",
    });
  };

  return (
    <div className="min-h-screen bg-cream-50">
      <div aria-hidden className="grain-overlay pointer-events-none fixed inset-0 z-[60]" />
      <Navbar cartCount={cartCount} wishlisted={wishlisted} />

      <main className="pb-28">
        {/* Product hero */}
        <div className="hero-wash">
        <div className="mx-auto max-w-[1280px] px-4 pt-10 pb-16 sm:px-6 lg:px-10 lg:pt-14">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="animate-fade-up">
              <Gallery />
            </div>
            <div className="animate-fade-up [animation-delay:120ms]">
              <PurchasePanel
                onAddToCart={addToCart}
                onBuyNow={buyNow}
                wishlisted={wishlisted}
                onToggleWish={toggleWish}
              />
            </div>
          </div>
        </div>
        </div>

        {/* Trust strip */}
        <div className="border-y border-cream-200 bg-gradient-to-r from-cream-100/70 via-white/50 to-cream-100/70">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-5 sm:px-6 lg:px-10">
            {[
              "凌晨 4:30 花市直采",
              "冷链 18 小时直达",
              "非库存陈花",
              "到手可开 7–10 天",
              "不新鲜免费重做",
              "全城 3 小时送达",
            ].map((t) => (
              <span
                key={t}
                className="flex items-center gap-2.5 text-[11px] tracking-[0.16em] text-moss-600"
              >
                <span className="h-[3px] w-[3px] rotate-45 bg-brass-500" />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Detail sections */}
        <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 lg:px-10">
          <FloristNote />
          <div className="mt-16">
            <DetailTabs />
          </div>
          <div className="mt-20">
            <RelatedProducts />
          </div>
        </div>
      </main>

      <Footer />
      <StickyBar
        onAddToCart={addToCart}
        onBuyNow={buyNow}
        wishlisted={wishlisted}
        onToggleWish={toggleWish}
      />
      {toast && (
        <Toast message={toast.message} sub={toast.sub} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ProductProvider>
      <Page />
    </ProductProvider>
  );
}
