import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CalendarDays,
  Flower2,
  KeyRound,
  Mail,
  MessageSquareQuote,
  Phone,
  Save,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { authService, orderService, reviewService } from "@/lib/services";
import { useAuthStore } from "@/stores/auth";
import { useFavoritesQuery } from "@/hooks/queries";
import { getErrorMessage } from "@/lib/api-client";
import { formatDate, formatNumber, maskPhone } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/stores/toast";
import { ImageUpload } from "@/components/domain/image-upload";
import { UserAvatar } from "@/components/domain/user-avatar";
import { StatCard } from "@/components/domain/stat-card";
import { UserStatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";

const schema = z.object({
  nickname: z.string().trim().max(30, "昵称最多 30 个字符").optional(),
  phone: z
    .string()
    .trim()
    .refine((value) => !value || /^1[3-9]\d{9}$/.test(value), "请输入正确的手机号"),
  email: z
    .string()
    .trim()
    .refine(
      (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "请输入正确的邮箱地址",
    ),
});

type FormValues = z.infer<typeof schema>;

export function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const storeUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: authService.me,
    staleTime: 60_000,
  });
  const profile = me.data ?? storeUser;

  const orders = useQuery({
    queryKey: queryKeys.orders({ page: 1, size: 1 }),
    queryFn: () => orderService.list({ page: 1, size: 1 }),
    staleTime: 60_000,
  });
  const favorites = useFavoritesQuery();
  const reviews = useQuery({
    queryKey: queryKeys.reviewsMy({ page: 1, size: 1 }),
    queryFn: () => reviewService.myReviews({ page: 1, size: 1 }),
    staleTime: 60_000,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nickname: profile?.nickname ?? "",
      phone: profile?.phone ?? "",
      email: profile?.email ?? "",
    },
  });

  useEffect(() => {
    if (!profile) return;
    reset({
      nickname: profile.nickname ?? "",
      phone: profile.phone ?? "",
      email: profile.email ?? "",
    });
  }, [profile, reset]);

  const updateProfile = useMutation({
    mutationFn: (values: FormValues) =>
      authService.updateProfile({
        nickname: values.nickname?.trim() || undefined,
        phone: values.phone.trim(),
        email: values.email.trim(),
      }),
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(queryKeys.me, user);
      reset({
        nickname: user.nickname ?? "",
        phone: user.phone ?? "",
        email: user.email ?? "",
      });
      toast.success("资料已更新", "新的联系方式已经保存。");
    },
    onError: (error) => toast.error("资料更新失败", getErrorMessage(error)),
  });

  const updateAvatar = useMutation({
    mutationFn: (avatarUrl: string) => authService.updateProfile({ avatarUrl }),
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(queryKeys.me, user);
      toast.success("头像已更新");
    },
  });

  if (me.isLoading && !profile) {
    return (
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (me.isError && !profile) {
    return (
      <ErrorState
        title="个人资料没送到"
        description={getErrorMessage(me.error)}
        onRetry={() => void me.refetch()}
      />
    );
  }

  if (!profile) return null;

  const orderValue = orders.data
    ? formatNumber(orders.data.total)
    : orders.isLoading
      ? "…"
      : "—";
  const favoriteValue = favorites.data
    ? formatNumber(favorites.data.length)
    : favorites.isLoading
      ? "…"
      : "—";
  const reviewValue = reviews.data
    ? formatNumber(reviews.data.total)
    : reviews.isLoading
      ? "…"
      : "—";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">个人中心</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          管理你的昵称与联系方式。账号、角色与状态由后端返回，不可在此修改。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={ShoppingBag}
          label="订单总数"
          value={orderValue}
          hint="查看我的订单"
          onClick={() => navigate("/orders")}
        />
        <StatCard
          icon={Flower2}
          label="收藏花礼"
          value={favoriteValue}
          hint="查看收藏夹"
          onClick={() => navigate("/favorites")}
        />
        <StatCard
          icon={MessageSquareQuote}
          label="我的评价"
          value={reviewValue}
          hint="查看评价记录"
          onClick={() => navigate("/reviews")}
        />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <section className="ui-card p-5">
            <div className="flex flex-col items-center text-center">
              <ImageUpload
                value={profile.avatarUrl}
                onChange={async (avatarUrl) => {
                  await updateAvatar.mutateAsync(avatarUrl);
                }}
                category="avatar"
                shape="circle"
                className="h-20 w-20"
                showActions={false}
                disabled={updateAvatar.isPending}
                title="点击更换头像"
                fallback={
                  <UserAvatar
                    name={profile.nickname || profile.username}
                    size="lg"
                    className="h-full w-full"
                  />
                }
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                点击头像更换，支持 JPG/PNG/WEBP/GIF，最大 5MB
              </p>
              {profile.avatarUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 px-2 text-[11px] text-muted-foreground"
                  loading={updateAvatar.isPending}
                  onClick={() =>
                    updateAvatar.mutate("", {
                      onError: (error) =>
                        toast.error("头像更新失败", getErrorMessage(error)),
                    })
                  }
                >
                  恢复默认头像
                </Button>
              ) : null}
              <h2 className="mt-3 text-base font-semibold tracking-tight">
                {profile.nickname || profile.username}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">@{profile.username}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <Badge variant="secondary">{profile.roleLabel}</Badge>
                <UserStatusBadge status={profile.status} label={profile.statusLabel} />
              </div>
            </div>
            <dl className="mt-5 space-y-3 border-t border-border/60 pt-4 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <UserRound className="h-3.5 w-3.5" />
                  用户 ID
                </dt>
                <dd className="font-mono-ui">#{profile.id}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  手机号
                </dt>
                <dd className="tabular">{maskPhone(profile.phone)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  邮箱
                </dt>
                <dd className="max-w-40 truncate">{profile.email || "未填写"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  注册时间
                </dt>
                <dd>{formatDate(profile.createdAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="ui-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              账户安全
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              修改密码后需要重新登录。登录凭证保存在本地，过期会自动清理。
            </p>
            <Button variant="outline" className="mt-3 w-full" asChild>
              <Link to="/settings">
                <KeyRound className="h-3.5 w-3.5" />
                前往账户设置
              </Link>
            </Button>
          </section>
        </div>

        <section className="ui-card p-5 md:p-6">
          <h2 className="text-base font-semibold tracking-tight">编辑资料</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            手机号与邮箱可以留空以清空；昵称留空不会提交变更。
          </p>
          <form
            onSubmit={handleSubmit((values) => updateProfile.mutate(values))}
            noValidate
            className="mt-5 space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="username">用户名</Label>
              <Input id="username" value={profile.username} disabled readOnly />
              <p className="text-[11px] text-muted-foreground">用户名创建后不可修改。</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nickname">昵称</Label>
              <Input
                id="nickname"
                placeholder="未填写时默认使用用户名"
                maxLength={30}
                aria-invalid={Boolean(errors.nickname)}
                {...register("nickname")}
              />
              {errors.nickname ? (
                <p className="text-xs text-destructive">{errors.nickname.message}</p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone">手机号</Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  placeholder="中国大陆手机号"
                  aria-invalid={Boolean(errors.phone)}
                  {...register("phone")}
                />
                {errors.phone ? (
                  <p className="text-xs text-destructive">{errors.phone.message}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  aria-invalid={Boolean(errors.email)}
                  {...register("email")}
                />
                {errors.email ? (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
              <p className="text-[11px] text-muted-foreground">
                修改成功后当前页面的昵称会立即更新。
              </p>
              <Button
                type="submit"
                loading={isSubmitting || updateProfile.isPending}
                disabled={!isDirty}
              >
                <Save className="h-4 w-4" />
                保存修改
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
