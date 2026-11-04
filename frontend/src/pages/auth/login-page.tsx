import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle2, LogIn } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { ApiError } from "@/lib/api-client";
import { defaultLandingFor } from "@/lib/permissions";
import { getRememberedUsername, setRememberedUsername } from "@/lib/storage";
import { toast } from "@/stores/toast";
import { AuthLayout } from "./auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
  remember: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function safeRedirect(redirect: string | null, role?: string): string {
  if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) return redirect;
  return defaultLandingFor(role as "CUSTOMER" | "STAFF" | "ADMIN" | undefined);
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const user = useAuthStore((state) => state.user);
  const [banner] = useState(
    searchParams.get("registered") === "1" ? "注册成功，请登录。" : "",
  );
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: getRememberedUsername(),
      password: "",
      remember: Boolean(getRememberedUsername()),
    },
  });

  useEffect(() => {
    if (user) {
      navigate(safeRedirect(searchParams.get("redirect"), user.role), { replace: true });
    }
  }, [user, navigate, searchParams]);

  const onSubmit = async (values: FormValues) => {
    setFormError("");
    try {
      const result = await login(values.username, values.password);
      setRememberedUsername(values.remember ? values.username : null);
      toast.success("欢迎回来", `${result.user.nickname || result.user.username}，花礼正在等你。`);
      navigate(safeRedirect(searchParams.get("redirect"), result.user.role), {
        replace: true,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 1003) {
          setError("password", { message: "用户名或密码错误" });
        } else if (error.code === 1004) {
          setFormError("账号已被禁用，请联系管理员。");
        } else if (error.status === 401) {
          setFormError("用户名或密码错误，请重新输入。");
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("登录失败，请稍后重试。");
      }
    }
  };

  return (
    <AuthLayout
      title="欢迎回来"
      description="登录后继续挑选花礼、查看订单与履约进度。"
      footer={
        <>
          还没有账号？
          <Link to="/register" className="ml-1 font-medium text-primary hover:underline">
            注册消费者账号
          </Link>
        </>
      }
    >
      {banner ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
          <CheckCircle2 className="h-4 w-4" />
          {banner}
        </div>
      ) : null}
      {formError ? (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="username">用户名</Label>
          <Input
            id="username"
            autoComplete="username"
            placeholder="请输入用户名"
            data-autofocus
            aria-invalid={Boolean(errors.username)}
            {...register("username")}
          />
          {errors.username ? (
            <p className="text-xs text-destructive" role="alert">
              {errors.username.message}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="请输入密码"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          {errors.password ? (
            <p className="text-xs text-destructive" role="alert">
              {errors.password.message}
            </p>
          ) : null}
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border accent-[var(--primary)]"
            {...register("remember")}
          />
          记住用户名（不会保存密码）
        </label>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          <LogIn className="h-4 w-4" />
          登录
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          演示账号：customer / customer123 · staff / staff123 · admin / admin123
        </p>
      </form>
    </AuthLayout>
  );
}
