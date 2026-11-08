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
import { EmailCodeField } from "@/components/domain/email-code-field";
import { authService } from "@/lib/services";
import { ApiError } from "@/lib/api-client";
import { toast } from "@/stores/toast";

const optionalPhone = z
  .string()
  .trim()
  .refine((value) => value === "" || /^1[3-9]\d{9}$/.test(value), "请输入中国大陆手机号");

const emailSchema = z
  .string()
  .trim()
  .min(1, "请输入邮箱")
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "邮箱格式不正确");

const schema = z
  .object({
    username: z
      .string()
      .min(3, "用户名至少 3 位")
      .max(30, "用户名最多 30 位")
      .regex(/^[a-zA-Z0-9_]+$/, "只允许字母、数字和下划线"),
    nickname: z.string().max(30, "昵称最多 30 位").optional(),
    phone: optionalPhone.optional(),
    email: emailSchema,
    emailCode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "请输入 6 位数字验证码"),
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      nickname: "",
      phone: "",
      email: "",
      emailCode: "",
      password: "",
      confirmPassword: "",
    },
  });

  const email = watch("email");

  const onSubmit = async (values: FormValues) => {
    setFormError("");
    try {
      await authService.register({
        username: values.username.trim(),
        password: values.password,
        nickname: values.nickname?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        email: values.email.trim(),
        emailCode: values.emailCode.trim(),
      });
      toast.success("注册成功", "请使用刚创建的账号登录。");
      navigate("/login?registered=1", { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 1001) {
          setError("username", { message: "用户名已存在，请换一个" });
        } else if (error.code === 1009) {
          setError("email", { message: "该邮箱已被注册，请直接登录" });
        } else if (error.code === 1006) {
          setError("emailCode", { message: "验证码错误或已过期，请重新获取" });
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
          <Label htmlFor="email">邮箱 *</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="用于接收验证码，注册后可用邮箱登录"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="emailCode">邮箱验证码 *</Label>
          <EmailCodeField
            id="emailCode"
            email={email}
            scene="REGISTER"
            registration={register("emailCode")}
            invalid={Boolean(errors.emailCode)}
            onEmailInvalid={() => setError("email", { message: "请先填写正确的邮箱" })}
            onError={setFormError}
          />
          {errors.emailCode ? (
            <p className="text-xs text-destructive">{errors.emailCode.message}</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              验证码 5 分钟内有效，若未收到请检查垃圾邮件。
            </p>
          )}
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
