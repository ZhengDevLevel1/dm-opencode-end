import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, UserPlus } from "lucide-react";
import { AuthLayout } from "./auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/lib/services";
import { ApiError } from "@/lib/api-client";
import { toast } from "@/stores/toast";

const optionalPhone = z
  .string()
  .trim()
  .refine((value) => value === "" || /^1[3-9]\d{9}$/.test(value), "请输入中国大陆手机号");

const optionalEmail = z
  .string()
  .trim()
  .refine((value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "邮箱格式不正确");

const schema = z
  .object({
    username: z
      .string()
      .min(3, "用户名至少 3 位")
      .max(30, "用户名最多 30 位")
      .regex(/^[a-zA-Z0-9_]+$/, "只允许字母、数字和下划线"),
    nickname: z.string().max(30, "昵称最多 30 位").optional(),
    phone: optionalPhone.optional(),
    email: optionalEmail.optional(),
    password: z.string().min(6, "密码至少 6 位").max(32, "密码最多 32 位"),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "两次输入的密码不一致",
  });

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState("");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      nickname: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setFormError("");
    try {
      await authService.register({
        username: values.username.trim(),
        password: values.password,
        nickname: values.nickname?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        email: values.email?.trim() || undefined,
      });
      toast.success("注册成功", "请使用刚创建的账号登录。");
      navigate("/login?registered=1", { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 1001) {
          setError("username", { message: "用户名已存在，请换一个" });
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("注册失败，请稍后重试。");
      }
    }
  };

  return (
    <AuthLayout
      title="注册花屿账号"
      description="注册后即可收藏花礼、下单与查看履约进度。"
      footer={
        <>
          已经有账号？
          <Link to="/login" className="ml-1 font-medium text-primary hover:underline">
            直接登录
          </Link>
        </>
      }
    >
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
          <Label htmlFor="username">用户名 *</Label>
          <Input
            id="username"
            autoComplete="username"
            placeholder="3-30 位字母、数字或下划线"
            data-autofocus
            aria-invalid={Boolean(errors.username)}
            {...register("username")}
          />
          {errors.username ? (
            <p className="text-xs text-destructive">{errors.username.message}</p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nickname">昵称</Label>
            <Input id="nickname" placeholder="选填，最长 30 位" {...register("nickname")} />
            {errors.nickname ? (
              <p className="text-xs text-destructive">{errors.nickname.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">手机号</Label>
            <Input
              id="phone"
              inputMode="tel"
              placeholder="选填"
              aria-invalid={Boolean(errors.phone)}
              {...register("phone")}
            />
            {errors.phone ? (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            ) : null}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="选填"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="password">密码 *</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="6-32 位"
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">确认密码 *</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="再次输入密码"
              aria-invalid={Boolean(errors.confirmPassword)}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword ? (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            ) : null}
          </div>
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          <UserPlus className="h-4 w-4" />
          创建账号
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          注册成功后需要返回登录页登录，注册不会自动登录。
        </p>
      </form>
    </AuthLayout>
  );
}
