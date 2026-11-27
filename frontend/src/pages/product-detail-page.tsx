import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Flower2,
  Leaf,
  Loader2,
  Mail,
  MessageCircle,
  Minus,
  Plus,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";
import { queryKeys, queryPolicy } from "@/lib/query-keys";
import {
  adminService,
  cartService,
  favoriteService,
  productService,
  recommendationService,
} from "@/lib/services";
import {
  useBusinessHoursQuery,
  useDict,
  useFavoritesQuery,
  useStoreProfileQuery,
  useWrapColorsQuery,
} from "@/hooks/queries";
import { useLoginGuard } from "@/hooks/use-login-guard";
import { ApiError, getErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { formatMoney, formatNumber, splitTags } from "@/lib/format";
import { resolveImageUrl } from "@/lib/image";
import {
  businessHourFor,
  defaultDeliverySelection,
  deliveryWindowError,
  toDeliveryAt,
} from "@/lib/business-hours";
import { trackRecommendationView } from "@/lib/recommendation-tracking";
import { toast } from "@/stores/toast";
import { useAuthStore } from "@/stores/auth";
import type { CartItemVO } from "@/types/api";
import { ProductImage } from "@/components/domain/product-image";
import { ZoomImage } from "@/components/domain/zoom-image";
import { Rating } from "@/components/domain/rating";
import { TagList } from "@/components/domain/tag-list";
import { SectionHeading } from "@/components/domain/section-heading";
import { DeliveryTimePicker } from "@/components/domain/delivery-time-picker";
import { GreetingCardEditor } from "@/components/domain/greeting-card-editor";
import { FloristNote } from "@/components/domain/florist-note";
import { ProductReviews } from "@/components/domain/product-reviews";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip } from "@/components/ui/tooltip";

const GREETING_STORAGE_KEY = "flower.greetingCard";
const DELIVERY_STORAGE_KEY = "flower.deliveryAt";
const IMAGE_LABELS = ["花束全貌", "花材特写", "包装细节", "随赠配件", "现场制作"];

function imageLabel(index: number): string {
  const label = IMAGE_LABELS[index];
  if (label) return label;
  return `细节图${index + 1}`;
}

const CARE_STEPS = [
  {
    step: "01",
    title: "45° 斜剪根",
    text: "收到花束后，在根部以上 2cm 处以 45° 斜剪，扩大吸水面积，避免平剪导致吸水面贴住瓶底。",
  },
  {
    step: "02",
    title: "去叶入水",
    text: "摘除所有会浸入水中的叶片，避免叶片在水中腐烂滋生细菌，每两天清洗花瓶并更换清水。",
  },
  {
    step: "03",
    title: "浅水养护",
    text: "水位控制在花瓶的 1/3，深水反而会加速茎秆腐烂。加入附赠保鲜剂，可延长 2–3 天花期。",
  },
  {
    step: "04",
    title: "避开风口",
    text: "远离空调直吹、暖气与成熟水果（乙烯会催谢）。夜间可移至阴凉处，玫瑰会缓慢恢复挺立。",
  },
];

function parseCareGuide(value?: string): Array<{ step: string; title: string; text: string }> {
  const text = value?.trim();
  if (!text) return [];
  return text.split(/\n\s*\n/).flatMap((block, index) => {
    const [firstLine, ...rest] = block.split("\n");
    const title = (firstLine ?? "").replace(/^\s*\d{1,2}[.、\s-]*/, "").trim();
    if (!title) return [];
    return [{
      step: String(index + 1).padStart(2, "0"),
      title,
      text: rest.join("\n").trim(),
    }];
  });
}

const TABS = [
  { id: "detail", label: "设计详情" },
  { id: "care", label: "养护指南" },
  { id: "delivery", label: "配送与售后" },
  { id: "reviews", label: "用户评价" },
];

function OptionHeading({
  index,
  title,
  note,
}: {
  index: string;
  title: string;
  note?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/50 pb-2.5">
      <p className="flex items-center gap-2 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
        <span className="font-display text-[10px] tracking-[0.2em] text-primary">{index}</span>
        <span className="h-px w-5 bg-border" />
        <span className="text-foreground/85">{title}</span>
      </p>
      {note ? <span className="text-[11px] text-muted-foreground tabular">{note}</span> : null}
    </div>
  );
}

export function ProductDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const validId = Number.isInteger(id) && id > 0;
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const role = useAuthStore((state) => state.user?.role);
  const standalonePreview = /^\/products\/\d+\/preview\/?$/.test(location.pathname);
  const previewMode =
    (searchParams.get("preview") === "1" || standalonePreview) && role === "ADMIN";
  const blockPreviewNavigation = previewMode
    ? (event: ReactMouseEvent<HTMLElement>) => {
        if ((event.target as HTMLElement).closest("a")) event.preventDefault();
      }
    : undefined;
  const queryClient = useQueryClient();
  const { requireLogin, isLoggedIn } = useLoginGuard();
  const favorites = useFavoritesQuery();
  const dict = useDict();
  const wrapsQuery = useWrapColorsQuery();
  const hoursQuery = useBusinessHoursQuery();
  const storeProfileQuery = useStoreProfileQuery();
  const todayBusinessHour = useMemo(() => {
    if (!hoursQuery.data) return null;
    const hour = businessHourFor(new Date(), hoursQuery.data);
    return hour?.enabled ? hour : null;
  }, [hoursQuery.data]);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [specId, setSpecId] = useState<number | null>(null);
  const [wrapId, setWrapId] = useState<number | null>(null);
  const [showFlowers, setShowFlowers] = useState(false);
  const [tab, setTab] = useState("detail");
  const [greeting, setGreeting] = useState(() => {
    try {
      return sessionStorage.getItem(GREETING_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const heroRef = useRef<HTMLDivElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [mainFrame, setMainFrame] = useState<{ left: number; width: number } | null>(null);

  const product = useQuery({
    queryKey: previewMode ? queryKeys.adminProduct(id) : queryKeys.product(id),
    queryFn: () => (previewMode ? adminService.product(id) : productService.detail(id)),
    enabled: validId,
    staleTime: 60 * 1000,
    retry: false,
  });

  const recommendations = useQuery({
    queryKey: queryKeys.recommendations({ limit: 6, scene: "product", productId: id }),
    queryFn: () =>
      recommendationService.get({ limit: 6, scene: "product", productId: id }),
    enabled: validId && !previewMode,
    staleTime: queryPolicy.recommendations.staleTime,
  });

  const data = product.data;
  const customCareSections = useMemo(() => parseCareGuide(data?.careGuide), [data?.careGuide]);
  const hasCustomCare = customCareSections.length > 0;
  const careSections = hasCustomCare ? customCareSections : CARE_STEPS;
  const specs = useMemo(() => data?.specs ?? [], [data?.specs]);
  const wraps = useMemo(() => wrapsQuery.data ?? [], [wrapsQuery.data]);
  const hours = useMemo(() => hoursQuery.data ?? [], [hoursQuery.data]);
  const images = useMemo(() => {
    if (!data) return [];
    if (data.imageUrls && data.imageUrls.length > 0) return data.imageUrls;
    return data.imageUrl ? [data.imageUrl] : [];
  }, [data]);
  const selectedSpec = useMemo(
    () => specs.find((spec) => spec.id === specId) ?? null,
    [specs, specId],
  );
  const selectedWrap = useMemo(
    () => wraps.find((wrap) => wrap.id === wrapId) ?? null,
    [wraps, wrapId],
  );
  const materialNotes = new Map(
    (data?.flowerMaterials ?? []).map((material) => [material.id, material.note]),
  );
  const flowerLines = selectedSpec?.flowers?.length
    ? selectedSpec.flowers.map((flower) => ({
        ...flower,
        note: materialNotes.get(flower.materialId),
      }))
    : (data?.flowerMaterials ?? []).map((material) => ({
        materialId: material.id,
        name: material.name,
        latinName: material.latinName,
        colorHex: material.colorHex,
        imageUrl: material.imageUrl,
        quantity: 0,
        note: material.note,
      }));
  const totalStems = selectedSpec?.totalStems ?? 0;
  const unitPrice = selectedSpec?.effectivePrice ?? data?.price ?? 0;
  const deliveryError =
    deliveryDate && deliveryTime ? deliveryWindowError(deliveryDate, deliveryTime, hours) : null;
  const favoriteIds = useMemo(
    () => new Set(favorites.data?.map((item) => item.id) ?? []),
    [favorites.data],
  );
  const isFavorite = validId && favoriteIds.has(id);
  const maxQuantity = Math.min(99, data?.stock ?? 1);

  useEffect(() => {
    setQuantity(1);
    setActiveImage(0);
    setTab("detail");
    setSpecId(null);
    setWrapId(null);
  }, [id]);

  useEffect(() => {
    if (!data) return;
    if (data.specs && data.specs.length > 0) {
      setSpecId((current) =>
        current && data.specs?.some((spec) => spec.id === current) ? current : data.specs![0].id,
      );
    } else {
      setSpecId(null);
    }
  }, [data]);

  useEffect(() => {
    if (wraps.length === 0) {
      setWrapId(null);
      return;
    }
    setWrapId((current) =>
      current && wraps.some((wrap) => wrap.id === current) ? current : wraps[0].id,
    );
  }, [wraps]);

  useEffect(() => {
    setQuantity((value) => Math.min(value, Math.max(1, maxQuantity)));
  }, [maxQuantity]);

  useEffect(() => {
    if (hours.length === 0) return;
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(DELIVERY_STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (stored) {
      const [date, time] = stored.split("T");
      if (date && time && !deliveryWindowError(date, time.slice(0, 5), hours)) {
        setDeliveryDate(date);
        setDeliveryTime(time.slice(0, 5));
        return;
      }
    }
    const fallback = defaultDeliverySelection(hours);
    setDeliveryDate(fallback.date);
    setDeliveryTime(fallback.time);
  }, [hours]);

  useEffect(() => {
    if (!deliveryDate || !deliveryTime || deliveryError) return;
    try {
      sessionStorage.setItem(DELIVERY_STORAGE_KEY, toDeliveryAt(deliveryDate, deliveryTime));
    } catch {
      /* storage unavailable */
    }
  }, [deliveryDate, deliveryTime, deliveryError]);

  useEffect(() => {
    try {
      if (greeting.trim()) sessionStorage.setItem(GREETING_STORAGE_KEY, greeting);
      else sessionStorage.removeItem(GREETING_STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
  }, [greeting]);

  useEffect(() => {
    if (!validId || !product.isSuccess) return;
    const startedAt = Date.now();
    let tracked = false;
    const track = () => {
      if (tracked) return;
      tracked = true;
      const dwellMs = Date.now() - startedAt;
      if (dwellMs >= 1000) {
        trackRecommendationView(id, dwellMs);
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") track();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      track();
    };
  }, [id, product.isSuccess, validId]);

  useEffect(() => {
    const main = document.getElementById("main-content");
    if (!main) return;
    const update = () => {
      const rect = main.getBoundingClientRect();
      setMainFrame({ left: rect.left, width: rect.width });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(main);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (!product.isSuccess) return;
    const main = document.getElementById("main-content");
    if (!main) return;
    const onScroll = () => {
      const hero = heroRef.current;
      if (!hero) return;
      setShowStickyBar(hero.getBoundingClientRect().bottom < 96);
    };
    onScroll();
    main.addEventListener("scroll", onScroll, { passive: true });
    return () => main.removeEventListener("scroll", onScroll);
  }, [product.isSuccess]);

  useEffect(() => {
    setShowStickyBar(false);
  }, [id]);

  const buildCartPayload = () => ({
    productId: id,
    quantity,
    specId: selectedSpec?.id,
    wrapId: selectedWrap?.id,
  });

  const addMutation = useMutation({
    mutationFn: () => cartService.add(buildCartPayload()),
    onSuccess: () => {
      toast.success("已加入购物车", `${data?.name ?? "花礼"} 正在购物车里等你。`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
    },
    onError: (error) => toast.error("加入购物车失败", getErrorMessage(error)),
  });

  const buyNowMutation = useMutation({
    mutationFn: () => cartService.add(buildCartPayload()),
    onSuccess: (item) => {
      queryClient.setQueryData<CartItemVO[]>(queryKeys.cart, (items) => {
        if (!items) return [item];
        if (!items.some((existing) => existing.id === item.id)) {
          return [item, ...items];
        }
        return items.map((existing) => (existing.id === item.id ? item : existing));
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
      navigate(`/checkout?items=${item.id}`);
    },
    onError: (error) => toast.error("无法立即购买", getErrorMessage(error)),
  });

  const favoriteMutation = useMutation({
    mutationFn: (favorite: boolean) =>
      favorite ? favoriteService.add(id) : favoriteService.remove(id),
    onSuccess: (_, favorite) => {
      toast.success(favorite ? "已收藏" : "已取消收藏");
      void queryClient.invalidateQueries({ queryKey: queryKeys.favorites });
    },
    onError: (error) => toast.error("收藏操作失败", getErrorMessage(error)),
  });

  const handleAdd = async () => {
    if (previewMode || !requireLogin() || !data) return;
    await addMutation.mutateAsync().catch(() => undefined);
  };

  const handleBuyNow = async () => {
    if (previewMode || !requireLogin() || !data) return;
    await buyNowMutation.mutateAsync().catch(() => undefined);
  };

  const handleFavorite = async () => {
    if (previewMode || !requireLogin()) return;
    await favoriteMutation.mutateAsync(!isFavorite).catch(() => undefined);
  };

  if (!validId) {
    return (
      <EmptyState
        title="商品不存在"
        description="这件花礼可能已经被移除。"
        action={<Button onClick={() => navigate("/products")}>返回商品列表</Button>}
      />
    );
  }

  if (product.isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
        <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-40" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (product.isError) {
    const error = product.error;
    const code = error instanceof ApiError ? error.code : 0;
    if (code === 2001 || code === 404) {
      return (
        <EmptyState
          title="商品不存在"
          description="这件花礼可能已经被移除，去看看其他当季花礼吧。"
          action={<Button onClick={() => navigate("/products")}>返回全部花礼</Button>}
        />
      );
    }
    if (code === 2002) {
      return (
        <EmptyState
          title="这件花礼已下架"
          description="花艺师正在调整，先看看其他花礼。"
          action={<Button onClick={() => navigate("/products")}>返回全部花礼</Button>}
        />
      );
    }
    return (
      <ErrorState
        description={getErrorMessage(error)}
        onRetry={() => void product.refetch()}
      />
    );
  }

  if (!data) {
    return <EmptyState title="商品不存在" />;
  }

  const soldOut = data.stock <= 0;
  const stockLow = dict.data?.metrics?.stockLowThreshold ?? 10;
  const lowStock = data.stock > 0 && data.stock < stockLow;
  const tags = splitTags(data.occasionTags);
  const festivalTags = splitTags(data.festivalTags);
  const related = recommendations.data?.items.filter((item) => item.productId !== id).slice(0, 4) ?? [];
  const activeSrc = images[activeImage] ? resolveImageUrl(images[activeImage]) : undefined;
  const detailImageSrc = resolveImageUrl(images[1] ?? images[0] ?? data.imageUrl);
  const canAdd = !soldOut && Boolean(deliveryTime) && !deliveryError;
  const salePrice = unitPrice;
  const strikePrice =
    selectedSpec?.originalPrice ?? (salePrice === data.price ? data.originalPrice : undefined);
  const hasDiscount = strikePrice !== undefined && strikePrice > salePrice;
  const priceText = Number.isInteger(salePrice) ? formatNumber(salePrice) : formatMoney(salePrice);
  const originalText = hasDiscount
    ? Number.isInteger(strikePrice)
      ? formatNumber(strikePrice)
      : formatMoney(strikePrice)
    : null;
  const discountLabel = hasDiscount
    ? `限时 ${((salePrice / strikePrice) * 10).toFixed(1).replace(/\.0$/, "")} 折`
    : null;
  const savedAmount = hasDiscount ? (strikePrice - salePrice) * quantity : 0;
  const selectedSpecName = selectedSpec?.name ?? "基础款";
  const selectedWrapName = selectedWrap?.name ?? "花艺师搭配";
  const deliveryLabel = deliveryDate
    ? `${deliveryDate.slice(5).replace("-", "/")} ${deliveryTime}`
    : "待选择送达时间";
  const sku = `NO. BLM-${String(data.id).padStart(4, "0")}`;
  const designFlowerTags = flowerLines.map((flower) =>
    flower.quantity > 0 ? `${flower.name} ×${flower.quantity}` : flower.name,
  );
  const giftAccessories =
    data.giftAccessories == null
      ? "手写贺卡 ×1 · 保鲜剂 ×2 · 养护卡 ×1"
      : data.giftAccessories.trim() || "无";
  const attrRows: [string, string][] = [
    ["主花材", flowerLines.slice(0, 3).map((flower) => flower.name).join("、") || "花艺师当季搭配"],
    ["花束规格", selectedSpec?.description || (totalStems > 0 ? `${totalStems} 枝` : "按规格搭配")],
    ["包装方式", selectedWrap ? `${selectedWrap.name} · 手工包装` : "由花艺师现场搭配"],
    ["适用场合", tags.join(" · ") || data.category],
    ["保存时长", "正确养护下 7–10 天"],
    ["随赠配件", giftAccessories],
  ];
  const designHighlight = data.flowerMeaning
    ? `${data.flowerMeaning} 这也是花艺师在配色和花材选择时最想保留的情绪。`
    : "花不是商品，是替你说出口的那句话。每一束都按当日花材状态重新调整，保留自然生长的姿态。";
  const imageTotal = Math.max(images.length, 1);
  const galleryOverlay = (
    <>
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <div className="flex flex-col items-start gap-1.5">
          {!soldOut ? (
            <Badge variant="overlay" className="bg-white/90 text-neutral-900 ring-1 ring-black/5">
              今日现货
            </Badge>
          ) : null}
          <Badge variant="overlay" className="bg-white/90 text-neutral-900 ring-1 ring-black/5">
            花市直采
          </Badge>
          {lowStock ? <Badge variant="warning">仅剩 {data.stock} 件</Badge> : null}
        </div>
        {soldOut ? <Badge variant="destructive">售罄</Badge> : null}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/50 to-transparent p-4 pt-16 text-white">
        <span className="rounded-full bg-background/75 px-3 py-1 text-[11px] tracking-[0.14em] text-foreground backdrop-blur">
          {imageLabel(activeImage)}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 font-display text-[10px] tracking-[0.18em] text-foreground backdrop-blur tabular">
          <Sparkles className="h-3 w-3 text-primary" />
          {String(activeImage + 1).padStart(2, "0")} / {String(imageTotal).padStart(2, "0")}
        </span>
      </div>
    </>
  );

  const goImage = (direction: number) => {
    if (images.length === 0) return;
    setActiveImage((current) => (current + direction + images.length) % images.length);
  };

  return (
    <div className="space-y-10 pb-28 [--ui-surface-opacity:1]">
      {!previewMode ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8">
            <ArrowLeft className="h-3.5 w-3.5" />
            返回
          </Button>
          <span className="text-border">/</span>
          <Link to="/products" className="hover:text-foreground">
            全部花礼
          </Link>
          <span className="text-border">/</span>
          <span className="text-muted-foreground">{data.category}</span>
          <span className="text-border">/</span>
          <span className="truncate text-foreground">{data.name}</span>
        </div>
      ) : null}

      {previewMode ? (
        <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-3 text-xs text-primary">
          <Eye className="h-4 w-4 shrink-0" />
          <span className="font-medium">预览模式</span>
          <span className="text-primary/80">
            当前商品状态：{data.statusLabel} · 购买、收藏与数量调整不会生效，仅用于检查详情页展示效果。
          </span>
        </div>
      ) : null}

      <div ref={heroRef} className="grid gap-8 lg:grid-cols-[1fr_1.02fr] lg:gap-12">
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            {images.length > 1 ? (
              <div className="no-scrollbar flex gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
                {images.map((image, index) => {
                  return (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setActiveImage(index)}
                      className={cn(
                        "relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border transition-all sm:h-[84px] sm:w-[68px]",
                        index === activeImage
                          ? "border-primary ring-1 ring-primary/25"
                          : "border-border/60 opacity-70 hover:opacity-100",
                      )}
                      aria-label={imageLabel(index)}
                    >
                      <ProductImage
                        src={image}
                        alt=""
                        seed={data.name}
                        className="h-full w-full"
                        iconClassName="h-4 w-4"
                      />
                      {index === activeImage ? (
                        <span className="absolute inset-x-0 bottom-0 bg-primary/85 py-0.5 text-center text-[9px] text-primary-foreground">
                          {imageLabel(index)}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="relative min-w-0 flex-1">
              {activeSrc ? (
                <ZoomImage
                  src={activeSrc}
                  alt={data.name}
                  seed={data.name}
                  iconClassName="h-14 w-14"
                  wrapperClassName="aspect-[4/5] w-full rounded-2xl border border-border/60 bg-muted/30"
                  zoom={1.7}
                >
                  {galleryOverlay}
                </ZoomImage>
              ) : (
                <ProductImage
                  src={data.imageUrl}
                  alt={data.name}
                  seed={data.name}
                  className="aspect-[4/5] w-full rounded-2xl border border-border/60"
                  iconClassName="h-16 w-16"
                  overlay={galleryOverlay}
                />
              )}
              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => goImage(-1)}
                    className="absolute top-1/2 left-3 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background sm:flex"
                    aria-label="上一张"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goImage(1)}
                    className="absolute top-1/2 right-3 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background sm:flex"
                    aria-label="下一张"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              ) : null}
            </div>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            悬停图片可查看细节；实际花材受季节影响，可能以同等价位花材替换。
          </p>
        </div>

        <div className="space-y-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-[10.5px] tracking-[0.14em] text-muted-foreground">
                <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                Bloom Isle · 花艺工作室
              </span>
              <span className="font-display text-[10px] tracking-[0.24em] text-muted-foreground">
                {sku}
              </span>
            </div>

            <h1 className="mt-5 font-display text-[32px] leading-[1.16] font-semibold tracking-[-0.02em] text-balance text-foreground sm:text-[40px] lg:text-[44px]">
              {data.name}
            </h1>
            <p className="mt-3 font-display text-[11px] tracking-[0.18em] text-muted-foreground uppercase sm:text-[12px]">
              {data.category} · {data.seasonLabel} · {data.priceBand}
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground/75">
              {data.flowerMeaning || "把当季的花，交给在意的人。"}
            </p>
            {tags.length > 0 || festivalTags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.length > 0 ? <TagList tags={tags} max={8} tone="flower" /> : null}
                {festivalTags.length > 0 ? <TagList tags={festivalTags} max={6} /> : null}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-border/60 py-3.5 text-xs text-muted-foreground">
              <Rating value={data.ratingAvg} count={data.ratingCount} />
              <span className="tabular">已售 {formatNumber(data.salesCount)} 件</span>
              <span className="tabular">库存 {data.stock} 件</span>
              <span
                className={cn(
                  "ml-auto flex items-center gap-1.5",
                  soldOut ? "text-destructive" : lowStock ? "text-warning" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    soldOut
                      ? "bg-destructive"
                      : lowStock
                        ? "animate-pulse bg-warning"
                        : "bg-flower-leaf",
                  )}
                />
                {soldOut ? "暂时售罄" : lowStock ? `仅剩 ${data.stock} 份现货` : "现货充足"}
              </span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.08] via-card to-card p-5 sm:p-6">
            <div className="relative flex flex-wrap items-end gap-x-3 gap-y-2">
              <span className="font-display text-[20px] leading-none text-flower-rose">¥</span>
              <span className="font-display text-[54px] leading-[0.82] font-semibold tracking-[-0.04em] tabular text-foreground sm:text-[60px]">
                {priceText}
              </span>
              {originalText ? (
                <span className="pb-1.5 text-sm text-muted-foreground line-through tabular">
                  ¥{originalText}
                </span>
              ) : null}
              {discountLabel ? (
                <span className="ml-auto rounded-full bg-primary-solid px-3 py-1 text-[10.5px] tracking-[0.14em] text-primary-solid-foreground">
                  {discountLabel}
                </span>
              ) : null}
            </div>
            <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
              <span>
                已选：{selectedSpecName} / {selectedWrapName} / ×{quantity}
              </span>
              <span className="text-foreground/75 tabular">
                合计 ¥{formatMoney(unitPrice * quantity)}
                {savedAmount > 0 ? ` · 省 ¥${formatMoney(savedAmount)}` : ""}
              </span>
            </div>
          </div>

          {specs.length > 0 ? (
            <section>
              <OptionHeading
                index="01"
                title="选择规格"
                note={totalStems > 0 ? `共 ${totalStems} 枝花材` : "按规格搭配"}
              />
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {specs.map((spec) => {
                  const active = spec.id === specId;
                  return (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={() => setSpecId(spec.id)}
                      className={cn(
                        "relative flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-all duration-300",
                        active
                          ? "border-primary-solid bg-primary-solid text-primary-solid-foreground shadow-sm ring-1 ring-primary-solid/20"
                          : "border-border/60 bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm",
                      )}
                    >
                      {active ? (
                        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      ) : null}
                      <span className="text-[13px] font-medium">{spec.name}</span>
                      <span
                        className={cn(
                          "line-clamp-1 text-[11px]",
                          active ? "text-primary-solid-foreground/70" : "text-muted-foreground",
                        )}
                      >
                        {spec.description || (spec.totalStems ? `${spec.totalStems} 枝` : "精选搭配")}
                      </span>
                      <span className="mt-1 flex items-baseline gap-1.5">
                        <span
                          className={cn(
                            "font-display text-[15px] font-semibold tracking-wide tabular",
                            active ? "text-primary-solid-foreground" : "text-flower-rose",
                          )}
                        >
                          ¥{formatMoney(spec.effectivePrice)}
                        </span>
                        {spec.originalPrice ? (
                          <span
                            className={cn(
                              "text-[10px] line-through tabular",
                              active ? "text-primary-solid-foreground/60" : "text-muted-foreground",
                            )}
                          >
                            ¥{formatMoney(spec.originalPrice)}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {wraps.length > 0 ? (
            <section>
              <OptionHeading
                index="02"
                title="包装色系"
                note={
                  selectedWrap
                    ? `${selectedWrap.name}${selectedWrap.description ? ` · ${selectedWrap.description}` : ""}`
                    : "请选择"
                }
              />
              <div className="mt-3 flex flex-wrap gap-2.5">
                {wraps.map((wrap) => {
                  const active = wrap.id === wrapId;
                  return (
                    <button
                      key={wrap.id}
                      type="button"
                      onClick={() => setWrapId(wrap.id)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-full border py-1.5 pr-4 pl-1.5 text-sm transition-all",
                        active
                          ? "border-primary bg-card shadow-sm"
                          : "border-border/60 hover:border-primary/40",
                      )}
                    >
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full"
                        style={{
                          background: wrap.hex,
                          boxShadow: `inset 0 0 0 1px ${wrap.ringHex || wrap.hex}`,
                        }}
                      >
                        {active ? (
                          <Check
                            className={cn(
                              "h-3.5 w-3.5",
                              wrap.hex.toLowerCase() === "#2c2c30" ||
                                wrap.hex.toLowerCase() === "#111114"
                                ? "text-white"
                                : "text-foreground",
                            )}
                          />
                        ) : null}
                      </span>
                      <span>{wrap.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {flowerLines.length > 0 ? (
            <section className="overflow-hidden rounded-xl border border-border/60 bg-card">
              <button
                type="button"
                onClick={() => setShowFlowers((value) => !value)}
                aria-expanded={showFlowers}
                aria-controls="flower-materials-panel"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  花材清单
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {flowerLines.length} 种{totalStems > 0 ? ` · ${totalStems} 枝` : ""} · 因季节可能等价替换
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out motion-reduce:transition-none",
                    showFlowers && "rotate-180",
                  )}
                />
              </button>
              <div
                id="flower-materials-panel"
                aria-hidden={!showFlowers}
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
                  showFlowers ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <ul className="divide-y divide-border/60 border-t border-border/60">
                    {flowerLines.map((flower) => (
                      <li key={flower.materialId} className="flex items-start gap-3 px-4 py-3">
                        <span
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border border-border/60"
                          style={{ background: flower.colorHex || "#d8c7b8" }}
                        />
                        {flower.quantity > 0 ? (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground tabular">
                            ×{flower.quantity}
                          </span>
                        ) : null}
                        <div className="min-w-0">
                          <p className="text-sm">
                            {flower.name}
                            {flower.latinName ? (
                              <span className="ml-2 text-[11px] text-muted-foreground italic">
                                {flower.latinName}
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          ) : null}

          <section>
            <OptionHeading
              index="03"
              title="选择具体的送达时间"
              note={`已选 ${deliveryLabel}`}
            />
            <DeliveryTimePicker
              variant="editorial"
              hideDateHeading
              className="mt-4"
              value={{ date: deliveryDate, time: deliveryTime }}
              hours={hours}
              onChange={(next) => {
                setDeliveryDate(next.date);
                setDeliveryTime(next.time);
              }}
            />
            {deliveryError ? (
              <p className="mt-2 text-[11px] text-destructive">{deliveryError}</p>
            ) : null}
          </section>

          <GreetingCardEditor
            variant="editorial"
            maxLength={40}
            value={greeting}
            onChange={setGreeting}
          />

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                  <span className="font-display text-[10px] tracking-[0.2em] text-primary">04</span>
                  <span className="h-px w-5 bg-border" />
                  <span className="text-foreground/85">数量</span>
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  单次最多 {maxQuantity} 件，库存会随下单实时扣减
                </p>
              </div>
              <div className="flex h-11 items-center rounded-full border border-border/70 bg-card p-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="减少数量"
                  className="h-8 w-8 rounded-full"
                  disabled={previewMode || quantity <= 1 || soldOut}
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-9 text-center font-display text-base font-semibold tabular" aria-live="polite">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="增加数量"
                  className="h-8 w-8 rounded-full"
                  disabled={previewMode || quantity >= maxQuantity || soldOut}
                  onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-2.5">
              <Tooltip content={isFavorite ? "取消收藏" : "收藏花礼"}>
                <Button
                  variant="outline"
                  className={cn(
                    "h-14 w-[3.25rem] rounded-xl px-0",
                    isFavorite
                      ? "border-flower-rose/45 bg-flower-rose/10 text-flower-rose"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-label={isFavorite ? "取消收藏" : "收藏"}
                  aria-pressed={isFavorite}
                  disabled={favoriteMutation.isPending}
                  onClick={handleFavorite}
                >
                  {favoriteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Flower2
                      className={cn("h-5 w-5", isFavorite && "fill-flower-rose/15 text-flower-rose")}
                    />
                  )}
                </Button>
              </Tooltip>
              <Button
                variant="outline"
                className="group h-14 rounded-xl px-4 font-display text-[14px] font-semibold tracking-[0.12em] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-transparent hover:text-current hover:shadow-lg active:translate-y-0"
                disabled={!canAdd || addMutation.isPending}
                onClick={handleAdd}
              >
                {addMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingBag className="h-4 w-4 transition-transform group-hover:-rotate-6" />
                )}
                加入购物车
              </Button>
              <Button
                className="group h-14 rounded-xl px-4 font-display text-[14px] font-semibold tracking-[0.12em] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
                disabled={!canAdd || buyNowMutation.isPending}
                onClick={handleBuyNow}
              >
                {buyNowMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Flower2 className="h-4 w-4 transition-transform group-hover:rotate-12" />
                )}
                立即购买
              </Button>
            </div>
            {soldOut ? (
              <p className="text-xs text-destructive">这件花礼暂时售罄，补货后即可购买。</p>
            ) : !deliveryTime ? (
              <p className="text-xs text-muted-foreground">请选择可预约的送达时间后再下单。</p>
            ) : !isLoggedIn ? (
              <p className="text-xs text-muted-foreground">
                登录后可以收藏花礼、加入购物车并跟踪履约进度。
              </p>
            ) : null}
          </section>

          <section className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-border/60 pt-5">
            {[
              { icon: Leaf, title: "当日鲜切", desc: "清晨到店，修剪后制作" },
              { icon: Scissors, title: "手工包装", desc: "按所选色系现场搭配" },
              { icon: ShieldCheck, title: "花材保障", desc: "不新鲜可申请售后" },
              { icon: Clock3, title: "准时送达", desc: "按预约时间前完成打包" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-2.5">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-flower-leaf" />
                  <div>
                    <p className="text-[12px] font-medium">{item.title}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              );
            })}
            <p className="col-span-2 flex items-center gap-2 rounded-xl bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground">
              <Truck className="h-4 w-4 shrink-0 text-primary" />
              支持匿名配送 · 收花人不会看到价格 · 可指定「不要提前联系」
            </p>
          </section>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/50 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: ShieldCheck, title: "7 天售后", desc: "不新鲜可重做" },
          { icon: Truck, title: "全国配送", desc: "全程冷链跟踪" },
          { icon: Leaf, title: "花材溯源", desc: "当季产地直采" },
          { icon: Scissors, title: "当日鲜切", desc: "清晨修剪制作" },
          { icon: Mail, title: "手写贺卡", desc: "免费代写祝福" },
          { icon: MessageCircle, title: "专属客服", desc: "花艺师在线答疑" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex flex-col items-center bg-card px-3 py-4 text-center">
              <Icon className="h-5 w-5 text-primary" strokeWidth={1.7} />
              <p className="mt-2 text-[12px] font-medium">{item.title}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{item.desc}</p>
            </div>
          );
        })}
      </section>

      <FloristNote productName={data.name} description={data.description} />

      <section id="detail">
        <div className="sticky top-0 z-20 -mx-4 border-y border-border/60 bg-background/95 px-4 backdrop-blur-lg md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            {TABS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "relative shrink-0 px-4 py-4 font-display text-[14px] tracking-[0.12em] transition-colors sm:px-6",
                  tab === item.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="mr-1.5 font-display text-[10px] tracking-[0.16em] text-primary/70 tabular">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {item.label}
                {tab === item.id ? (
                  <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-primary" />
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="pop-in pt-6">
          {tab === "detail" ? (
            <div className="space-y-12">
              <div className="grid gap-8 lg:grid-cols-[1.06fr_0.94fr] lg:gap-14">
                <div>
                  <p className="font-display text-[10px] tracking-[0.3em] text-primary uppercase">
                    Design Notes
                  </p>
                  <h2 className="mt-3 font-display text-[28px] leading-[1.3] font-semibold tracking-tight text-balance sm:text-[32px]">
                    关于「{data.name}」的设计自述
                  </h2>
                  <p className="mt-6 text-[14px] leading-[2.1] whitespace-pre-line text-foreground/75">
                    {data.description || "花艺师会根据当季花材状态进行搭配，实际花材可能略有调整。"}
                  </p>
                  <p className="mt-4 text-[14px] leading-[2.1] text-foreground/75">
                    为了让花束在收到时保持最好的姿态，我们会提前修剪、醒花，并根据当天花材的开放程度调整层次与疏密。每一束都不会完全相同，但都会保留手作的温度。
                  </p>
                  <p className="mt-6 border-l-2 border-primary/40 bg-gradient-to-r from-primary/[0.06] to-transparent py-3 pl-4 font-display text-[13.5px] leading-[1.95] text-foreground/80">
                    {designHighlight}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {(designFlowerTags.length > 0 ? designFlowerTags : ["当季花材", "手工包装"]).map(
                      (tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 text-[11px] text-muted-foreground"
                        >
                          <Flower2 className="h-3 w-3 text-primary" />
                          {tag}
                        </span>
                      ),
                    )}
                  </div>
                </div>

                {detailImageSrc ? (
                  <ZoomImage
                    src={detailImageSrc}
                    alt={`${data.name} 花艺师制作`}
                    seed={data.name}
                    zoom={1.7}
                    className="object-contain"
                    wrapperClassName="relative mx-auto aspect-[4/5] w-full max-w-[380px] overflow-hidden rounded-2xl border border-border/60 bg-muted/20"
                    iconClassName="h-14 w-14"
                  >
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 sm:p-6">
                      <p className="font-display text-[10px] tracking-[0.3em] text-white/70">
                        IN-STUDIO · 每一束皆为当日现制
                      </p>
                      <p className="mt-2 font-display text-lg text-white">
                        下单后 90 分钟内，由驻店花艺师亲手完成
                      </p>
                    </div>
                  </ZoomImage>
                ) : (
                  <ProductImage
                    src={images[1] ?? images[0] ?? data.imageUrl}
                    alt={`${data.name} 花艺师制作`}
                    seed={data.name}
                    fit="contain"
                    className="mx-auto aspect-[4/5] w-full max-w-[380px] rounded-2xl border border-border/60 bg-muted/20"
                    iconClassName="h-14 w-14"
                  />
                )}
              </div>

              <div>
                <OptionHeading index="01" title="规格参数" note="Measured & specified" />
                <dl className="grid gap-x-10 sm:grid-cols-2">
                  {attrRows.map(([key, value]) => (
                    <div key={key} className="flex gap-4 border-b border-border/60 py-3.5 text-[13px]">
                      <dt className="w-20 shrink-0 text-muted-foreground">{key}</dt>
                      <dd className="flex-1 text-foreground/85">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/50 pb-3">
                  <span className="font-display text-[10px] tracking-[0.2em] text-primary">02</span>
                  <h3 className="font-display text-[22px] font-semibold tracking-tight">花材构成</h3>
                  <span className="text-[11px] text-muted-foreground">Stem by stem</span>
                  <span className="h-px min-w-8 flex-1 bg-border/70" />
                </div>
                {flowerLines.length === 0 ? (
                  <EmptyState title="花材信息整理中" bare />
                ) : (
                  <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    {flowerLines.map((flower) => (
                      <div
                        key={flower.materialId}
                        className="flex min-h-[116px] items-start gap-4 rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/35 sm:p-5"
                      >
                        <ProductImage
                          src={flower.imageUrl}
                          alt={flower.name}
                          seed={flower.name}
                          className="h-11 w-11 shrink-0 rounded-full border border-border/60"
                          iconClassName="h-4 w-4"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold tracking-tight">{flower.name}</p>
                          {flower.latinName ? (
                            <p className="mt-1 font-display text-[10px] tracking-[0.18em] text-muted-foreground/60 uppercase">
                              {flower.latinName}
                            </p>
                          ) : null}
                          <p className="mt-4 text-[12px] leading-5 text-muted-foreground">
                            {flower.quantity > 0 ? `${flower.quantity} 枝 · ` : ""}
                            {flower.note || "当日鲜切花材，保留自然姿态与香气。"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                  * 部分花材受季节与产地影响，若缺货将以同等价位的近似花材替换，并在发货前以短信告知。
                </p>
              </div>
            </div>
          ) : null}

          {tab === "care" ? (
            <div className={cn("grid gap-8", !hasCustomCare && "lg:grid-cols-[1fr_320px]")}>
              <div>
                <SectionHeading
                  title="让它们开得更久一点"
                  description={
                    hasCustomCare
                      ? "按下面的步骤打理，花束会用更久的盛放回报你。"
                      : "遵守下面四件小事，花束会用整整一周的盛放回报你。"
                  }
                />
                <ol className="mt-6 space-y-4">
                  {careSections.map((step) => (
                    <li key={step.step} className="flex gap-4">
                      <span className="text-2xl leading-none text-primary/40 tabular">
                        {step.step}
                      </span>
                      <div className="border-l border-border/60 pl-4">
                        <p className="text-base font-semibold">{step.title}</p>
                        {step.text ? (
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                            {step.text}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              {!hasCustomCare ? (
                <aside className="h-fit rounded-2xl border border-border/60 bg-card p-5">
                  <p className="text-[10px] tracking-[0.3em] text-primary uppercase">
                    Troubleshooting
                  </p>
                  <p className="mt-2 text-base font-semibold">常见小状况</p>
                  <ul className="mt-3 space-y-3 text-xs leading-6 text-muted-foreground">
                    <li>
                      <span className="font-medium text-foreground">花头下垂：</span>
                      剪根后深水浸泡 1 小时（水位到花头下），多数可在 2 小时内恢复挺立。
                    </li>
                    <li>
                      <span className="font-medium text-foreground">外层花瓣发软：</span>
                      玫瑰外层为保护瓣，属正常现象，请勿摘除。
                    </li>
                    <li>
                      <span className="font-medium text-foreground">水质发浑：</span>
                      立即洗瓶换水并再次斜剪 1cm，避免细菌堵塞导管。
                    </li>
                  </ul>
                </aside>
              ) : null}
            </div>
          ) : null}

          {tab === "delivery" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-card p-5">
                <p className="text-base font-semibold">门店营业时间</p>
                {hoursQuery.isLoading ? (
                  <div className="mt-3 space-y-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-4 w-full" />
                    ))}
                  </div>
                ) : hours.length === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">暂未配置营业时间。</p>
                ) : (
                  <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    {hours.map((hour) => (
                      <li key={hour.dayOfWeek} className="flex justify-between gap-3">
                        <span>{hour.dayLabel}</span>
                        <span className="tabular">
                          {hour.enabled ? `${hour.openTime} - ${hour.closeTime}` : "休息"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-2xl border border-border/60 bg-card p-5">
                <p className="text-base font-semibold">预约与配送</p>
                <ul className="mt-3 space-y-2 text-xs leading-6 text-muted-foreground">
                  <li>· 支持提前 1 小时至 6 天内预约送达。</li>
                  <li>· 花艺师会在所选时间前完成打包。</li>
                  <li>· 配送前会电话确认收花人是否在址。</li>
                  <li>· 支持匿名配送，收花人不会看到价格。</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card p-5">
                <p className="text-base font-semibold">售后保障</p>
                <ul className="mt-3 space-y-2 text-xs leading-6 text-muted-foreground">
                  <li>· 花材不新鲜：照片反馈后免费重做。</li>
                  <li>· 配送损坏：全额退款或当日补发。</li>
                  <li>· 已完成订单可发起售后，由门店审核。</li>
                  <li>· 贺卡内容可在结算前随时修改。</li>
                </ul>
              </div>
            </div>
          ) : null}

          {tab === "reviews" ? (
            <ProductReviews
              key={id}
              productId={id}
              ratingAvg={data.ratingAvg}
              ratingCount={data.ratingCount}
            />
          ) : null}
        </div>
      </section>

      <section
        onClickCapture={blockPreviewNavigation}
        onAuxClickCapture={blockPreviewNavigation}
      >
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <p className="font-display text-[10px] tracking-[0.3em] text-primary uppercase">
              You may also love
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
              常被一起带走的它们
            </h2>
            <p className="mt-1.5 text-xs text-muted-foreground">
              以当前花礼为种子，结合品类、花语、场景与价位推荐。
            </p>
          </div>
          <Link
            to="/products"
            className="group inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-4 py-2 text-xs font-medium transition-colors hover:border-primary/40 hover:text-primary"
          >
            浏览全部花礼
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
        {recommendations.isLoading ? (
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="aspect-[4/5] w-full" />
            ))}
          </div>
        ) : related.length === 0 ? (
          <EmptyState className="mt-5" title="暂时没有更多推荐" />
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((item) => (
              <Link
                key={item.productId}
                to={`/products/${item.productId}`}
                className="group flex h-full flex-col"
              >
                <ProductImage
                  src={item.imageUrl}
                  alt={item.name}
                  seed={item.name}
                  className="aspect-[4/5] w-full rounded-2xl border border-border/50 transition-shadow duration-300 group-hover:shadow-md"
                  iconClassName="h-10 w-10"
                  overlay={
                    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
                      <Badge variant="overlay" className="text-[10px]">
                        {item.priceBand}
                      </Badge>
                      <Badge variant="solid" className="text-[10px]">
                        <Sparkles className="h-3 w-3" />
                        相似推荐
                      </Badge>
                    </div>
                  }
                />
                <div className="mt-3 flex items-start justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-medium transition-colors group-hover:text-primary">
                    {item.name}
                  </p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{item.seasonLabel}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                  {item.reason}
                </p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <p className="font-display text-base font-semibold tabular">
                    ¥{formatMoney(item.price)}
                  </p>
                  <span className="text-[10px] text-muted-foreground tabular">
                    已售 {formatNumber(item.salesCount)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section
        className="rounded-3xl border border-border/60 bg-muted/20 px-5 py-8 sm:px-8"
        onClickCapture={blockPreviewNavigation}
        onAuxClickCapture={blockPreviewNavigation}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionHeading
            eyebrow="Keep exploring"
            title="继续逛花店"
            description="挑一束花，或者让花艺师帮你做决定。"
          />
          <Link
            to="/products"
            className="group inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            浏览全部花礼
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              to: "/products",
              label: "全部花礼",
              desc: "按品类、色系与场景挑选",
              icon: Flower2,
            },
            {
              to: "/recommendations",
              label: "智能推荐",
              desc: "根据你的喜好生成花单",
              icon: Sparkles,
            },
            {
              to: "/ai",
              label: "花艺师 AI",
              desc: "说说场合，帮你搭一束花",
              icon: Sparkles,
            },
            {
              to: "/orders",
              label: "我的订单",
              desc: "查看进度、评价与售后",
              icon: ShoppingBag,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                className="group rounded-2xl border border-border/60 bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="mt-3 flex items-center gap-1 text-sm font-medium">
                  {item.label}
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </p>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{item.desc}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <footer
        className="-mx-4 mt-4 border-t border-border/60 bg-muted/20 px-4 pt-10 pb-6 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8"
        onClickCapture={blockPreviewNavigation}
        onAuxClickCapture={blockPreviewNavigation}
      >
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/25 text-primary">
                <Flower2 className="h-5 w-5" strokeWidth={1.7} />
              </span>
              <span>
                <span className="block font-display text-lg font-semibold tracking-[0.16em] text-foreground">
                  Bloom Isle
                </span>
                <span className="mt-0.5 block font-display text-[9px] tracking-[0.3em] text-muted-foreground">
                  PETALS &amp; POEMS
                </span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-[12px] leading-6 text-muted-foreground">
              一家相信花能替人说话的花店。我们按当季花材与收花人的心情搭配，让每一束都保留手工的温度。
            </p>
            <p className="mt-4 font-display text-[13px] tracking-[0.12em] text-foreground/80">
              {storeProfileQuery.data?.businessPhone ?? "400-820-1024"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {hoursQuery.isLoading
                ? "营业时间加载中"
                : hoursQuery.isError
                  ? "营业时间 请电话咨询"
                  : todayBusinessHour
                    ? `营业时间 ${todayBusinessHour.openTime} – ${todayBusinessHour.closeTime}`
                    : "营业时间 今日休息"}
            </p>
          </div>

          {[
            {
              title: "花礼选购",
              links: [
                { label: "全部花礼", to: "/products" },
                { label: "智能推荐", to: "/recommendations" },
                { label: "花艺师 AI", to: "/ai" },
                { label: "我的收藏", to: "/favorites" },
              ],
            },
            {
              title: "服务支持",
              links: [
                { label: "我的订单", to: "/orders" },
                { label: "购物车", to: "/cart" },
                { label: "账户设置", to: "/settings" },
                { label: "继续逛花店", to: "/products" },
              ],
            },
            {
              title: "关于 Bloom Isle",
              links: [
                { label: "花艺师手记", to: "/recommendations" },
                { label: "与 AI 聊聊", to: "/ai" },
                { label: "售后与帮助", to: "/orders" },
                { label: "回到首页", to: "/" },
              ],
            },
          ].map((column) => (
            <div key={column.title}>
              <p className="font-display text-[13px] font-semibold tracking-wide">{column.title}</p>
              <ul className="mt-3.5 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-[12px] text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-9 flex flex-col items-center justify-between gap-2 border-t border-border/60 pt-5 text-[10px] text-muted-foreground sm:flex-row">
          <p>© 2026 Bloom Isle 花艺工作室 · 让花替你说出口</p>
          <p className="flex items-center gap-3">
            <span>隐私说明</span>
            <span className="h-3 w-px bg-border" />
            <span>服务条款</span>
            <span className="h-3 w-px bg-border" />
            <span className="font-display tracking-[0.2em]">MADE WITH BLOOM</span>
          </p>
        </div>
      </footer>

      {mainFrame
        ? createPortal(
            <div
              className={cn(
                "fixed bottom-0 z-40 border-t border-border/60 bg-background/95 shadow-[0_-10px_30px_-22px_rgb(0_0_0/0.45)] backdrop-blur-xl transition-all duration-300",
                showStickyBar
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-full opacity-0",
              )}
              style={{ left: mainFrame.left, width: mainFrame.width }}
            >
              <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 md:px-6 lg:px-8">
                <ProductImage
                  src={images[0] ?? data.imageUrl}
                  alt={data.name}
                  seed={data.name}
                  className="hidden h-11 w-11 shrink-0 rounded-lg border border-border/60 sm:block"
                  iconClassName="h-4 w-4"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[13px] font-medium">{data.name}</p>
                  <p className="mt-0.5 flex min-w-0 items-baseline gap-2 text-[10px] text-muted-foreground">
                    <span className="shrink-0 font-display text-[13px] font-semibold text-foreground sm:hidden">
                      ¥{priceText}
                    </span>
                    <span className="truncate">
                      {selectedSpecName} · {selectedWrapName} · ×{quantity} · {deliveryLabel}
                    </span>
                  </p>
                </div>
                <div className="hidden items-baseline gap-1.5 sm:flex">
                  <span className="font-display text-xs text-flower-rose">¥</span>
                  <span className="font-display text-xl font-semibold tabular">{priceText}</span>
                  {quantity > 1 ? (
                    <span className="text-[10px] text-muted-foreground tabular">
                      ×{quantity} = ¥{formatMoney(unitPrice * quantity)}
                    </span>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "h-11 w-11 shrink-0 rounded-full",
                    isFavorite && "border-flower-rose/45 bg-flower-rose/10 text-flower-rose",
                  )}
                  aria-label={isFavorite ? "取消收藏" : "收藏"}
                  aria-pressed={isFavorite}
                  disabled={favoriteMutation.isPending}
                  onClick={handleFavorite}
                >
                  {favoriteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Flower2 className={cn("h-4 w-4", isFavorite && "fill-flower-rose/15")} />
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="h-11 shrink-0 rounded-full px-3 sm:px-5"
                  aria-label="加入购物车"
                  disabled={!canAdd || addMutation.isPending}
                  onClick={handleAdd}
                >
                  {addMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingBag className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">加入购物车</span>
                </Button>
                <Button
                  className="h-11 shrink-0 rounded-full px-4 font-display tracking-[0.1em] sm:px-6"
                  disabled={!canAdd || buyNowMutation.isPending}
                  onClick={handleBuyNow}
                >
                  {buyNowMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Flower2 className="h-4 w-4" />
                  )}
                  立即购买
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
