import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle2, LogIn, Mail } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { useThemeStore } from "@/stores/theme";
import { ApiError } from "@/lib/api-client";
import { defaultLandingFor } from "@/lib/permissions";
import { getRememberedUsername, setRememberedUsername } from "@/lib/storage";
import { toast } from "@/stores/toast";
import { cn } from "@/lib/cn";
import { AuthLayout } from "./auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmailCodeField } from "@/components/domain/email-code-field";

const passwordSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
  remember: z.boolean(),
});

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "请输入邮箱")
    .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "邮箱格式不正确"),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "请输入 6 位数字验证码"),
});

type PasswordValues = z.infer<typeof passwordSchema>;
type EmailValues = z.infer<typeof emailSchema>;
type LoginMode = "password" | "email";

const LOGIN_MODES: { value: LoginMode; label: string; icon: typeof LogIn }[] = [
  { value: "password", label: "密码登录", icon: LogIn },
  { value: "email", label: "邮箱验证码", icon: Mail },
];

function safeRedirect(redirect: string | null, role?: string): string {
  if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) return redirect;
  return defaultLandingFor(role as "CUSTOMER" | "STAFF" | "ADMIN" | undefined);
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const loginByEmail = useAuthStore((state) => state.loginByEmail);
  const user = useAuthStore((state) => state.user);
  const [banner] = useState(
    searchParams.get("registered") === "1" ? "注册成功，请登录。" : "",
  );
  const [formError, setFormError] = useState("");
  const [mode, setMode] = useState<LoginMode>("password");
  const reduceMotionSetting = useThemeStore((state) => state.reduceMotion);
  const prefersReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(reduceMotionSetting || prefersReducedMotion);

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      username: getRememberedUsername(),
      password: "",
      remember: Boolean(getRememberedUsername()),
    },
  });

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
      code: "",
    },
  });

  useEffect(() => {
    if (user) {
      navigate(safeRedirect(searchParams.get("redirect"), user.role), { replace: true });
    }
  }, [user, navigate, searchParams]);

  const finishLogin = (result: Awaited<ReturnType<typeof login>>) => {
    toast.success("欢迎回来", `${result.user.nickname || result.user.username}，花礼正在等你。`);
    navigate(safeRedirect(searchParams.get("redirect"), result.user.role), {
      replace: true,
    });
  };

  const onPasswordSubmit = async (values: PasswordValues) => {
    setFormError("");
    try {
      const result = await login(values.username, values.password);
      setRememberedUsername(values.remember ? values.username : null);
      finishLogin(result);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 1003) {
          passwordForm.setError("password", { message: "用户名或密码错误" });
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

  const onEmailSubmit = async (values: EmailValues) => {
    setFormError("");
    try {
      const result = await loginByEmail(values.email.trim(), values.code.trim());
      finishLogin(result);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 1006) {
          emailForm.setError("code", { message: "验证码错误或已过期，请重新获取" });
        } else if (error.code === 1008) {
          emailForm.setError("email", { message: "该邮箱尚未注册，请先创建账号" });
        } else if (error.code === 1004) {
          setFormError("账号已被禁用，请联系管理员。");
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

      <LayoutGroup id="login-mode-tabs">
        <div
          role="tablist"
          aria-label="登录方式"
          className="mb-5 flex rounded-lg bg-muted/40 p-0.5"
        >
          {LOGIN_MODES.map((item) => {
            const Icon = item.icon;
            const active = mode === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setMode(item.value);
                  setFormError("");
                }}
                className={cn(
                  "relative flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active ? (
                  <motion.span
                    aria-hidden
                    layoutId="login-mode-pill"
                    className="absolute inset-0 rounded-md bg-card shadow-sm"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 380, damping: 32 }
                    }
                  />
                ) : null}
                <Icon className="relative z-10 h-3.5 w-3.5" />
                <span className="relative z-10">{item.label}</span>
              </button>
            );
          })}
        </div>
      </LayoutGroup>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
          }
        >
          {mode === "password" ? (
            <form
              onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
              className="space-y-4"
              noValidate
            >
              <div className="space-y-1.5">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  placeholder="请输入用户名"
                  data-autofocus
                  aria-invalid={Boolean(passwordForm.formState.errors.username)}
                  {...passwordForm.register("username")}
                />
                {passwordForm.formState.errors.username ? (
                  <p className="text-xs text-destructive" role="alert">
                    {passwordForm.formState.errors.username.message}
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
                  aria-invalid={Boolean(passwordForm.formState.errors.password)}
                  {...passwordForm.register("password")}
                />
                {passwordForm.formState.errors.password ? (
                  <p className="text-xs text-destructive" role="alert">
                    {passwordForm.formState.errors.password.message}
                  </p>
                ) : null}
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border accent-[var(--primary)]"
                  {...passwordForm.register("remember")}
                />
                记住用户名（不会保存密码）
              </label>
              <Button
                type="submit"
                className="w-full"
                loading={passwordForm.formState.isSubmitting}
              >
                <LogIn className="h-4 w-4" />
                登录
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                演示账号：customer / customer123 · staff / staff123 · admin / admin123
              </p>
            </form>
          ) : (
            <form
              onSubmit={emailForm.handleSubmit(onEmailSubmit)}
              className="space-y-4"
              noValidate
            >
              <div className="space-y-1.5">
                <Label htmlFor="login-email">邮箱</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="请输入注册邮箱"
                  data-autofocus
                  aria-invalid={Boolean(emailForm.formState.errors.email)}
                  {...emailForm.register("email")}
                />
                {emailForm.formState.errors.email ? (
                  <p className="text-xs text-destructive" role="alert">
                    {emailForm.formState.errors.email.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-code">验证码</Label>
                <EmailCodeField
                  id="login-code"
                  email={emailForm.watch("email")}
                  scene="LOGIN"
                  registration={emailForm.register("code")}
                  invalid={Boolean(emailForm.formState.errors.code)}
                  onEmailInvalid={() =>
                    emailForm.setError("email", { message: "请先填写正确的邮箱" })
                  }
                  onError={setFormError}
                />
                {emailForm.formState.errors.code ? (
                  <p className="text-xs text-destructive" role="alert">
                    {emailForm.formState.errors.code.message}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    验证码 5 分钟内有效，未注册的邮箱请先创建账号。
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                loading={emailForm.formState.isSubmitting}
              >
                <Mail className="h-4 w-4" />
                验证码登录
              </Button>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </AuthLayout>
  );
}
