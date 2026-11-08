"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useAnimate } from "framer-motion";
import {
  AtSign,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  Send,
  User,
} from "lucide-react";
import { useToast } from "@/components/toast";

export type AuthPhase = "idle" | "success" | "blooming";

const REMEMBER_KEY = "bloom-remember-username";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEMO_ACCOUNTS = [
  { label: "顾客", username: "customer", password: "customer123" },
  { label: "花艺师", username: "staff", password: "staff123" },
  { label: "管理员", username: "admin", password: "admin123" },
];

/* ------------------------------------------------------------------ */
/*  Shared field row                                                   */
/* ------------------------------------------------------------------ */

function FieldRow({
  label,
  htmlFor,
  error,
  icon,
  right,
  ...inputProps
}: {
  label: string;
  htmlFor: string;
  error?: string;
  icon: ReactNode;
  right?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[13px] leading-none font-medium text-foreground"
      >
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/60">
          {icon}
        </span>
        <input
          id={htmlFor}
          aria-invalid={Boolean(error)}
          className={`flex h-10 w-full min-w-0 appearance-none rounded-md border border-border bg-transparent py-1 pr-3 pl-9 text-sm shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-destructive/20 ${
            right ? "pr-24" : ""
          }`}
          {...inputProps}
        />
        {right ? (
          <div className="absolute top-1/2 right-1.5 -translate-y-1/2">
            {right}
          </div>
        ) : null}
      </div>
      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            key={error}
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 2 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden text-xs text-destructive"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function FormError({ message }: { message: string | null }) {
  return (
    <AnimatePresence initial={false}>
      {message ? (
        <motion.p
          key={message}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          role="alert"
        >
          {message}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

function SubmitButton({
  phase,
  submitting,
  label,
  successLabel,
}: {
  phase: AuthPhase;
  submitting: boolean;
  label: string;
  successLabel: string;
}) {
  const busy = submitting || phase !== "idle";
  return (
    <motion.button
      type="submit"
      disabled={busy}
      whileTap={busy ? undefined : { scale: 0.975 }}
      className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground shadow-[var(--shadow-glow)] transition-[background-color,opacity,scale] duration-150 hover:bg-primary/90 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60"
    >
      {phase === "success" ? (
        <>
          <Check className="h-4 w-4" />
          {successLabel}
        </>
      ) : submitting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          登录中…
        </>
      ) : (
        <>
          <LogIn className="h-4 w-4" />
          {label}
        </>
      )}
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/*  Password login                                                     */
/* ------------------------------------------------------------------ */

export function PasswordForm({
  phase,
  onSuccess,
}: {
  phase: AuthPhase;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [scope, animate] = useAnimate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        setUsername(saved);
        setRemember(true);
      }
    } catch {
      /* noop */
    }
  }, []);

  const busy = submitting || phase !== "idle";

  function shake() {
    animate(
      scope.current,
      { x: [0, -10, 10, -7, 7, -3, 0] },
      { duration: 0.45, ease: "easeInOut" },
    );
  }

  function fillDemo(u: string, p: string) {
    setUsername(u);
    setPassword(p);
    setErrors({});
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const next: typeof errors = {};
    if (!username.trim()) next.username = "请输入用户名";
    if (!password) next.password = "请输入密码";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      shake();
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (res.ok && data.ok) {
        try {
          if (remember) localStorage.setItem(REMEMBER_KEY, username.trim());
          else localStorage.removeItem(REMEMBER_KEY);
        } catch {
          /* noop */
        }
        onSuccess();
      } else {
        setFormError(data.message ?? "登录失败，请稍后重试");
        shake();
      }
    } catch {
      setFormError("网络异常，请检查连接后重试");
      shake();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form ref={scope} onSubmit={handleSubmit} noValidate className="space-y-4">
      <FieldRow
        label="用户名"
        htmlFor="username"
        icon={<User className="h-4 w-4" />}
        name="username"
        autoComplete="username"
        placeholder="请输入用户名"
        autoFocus
        value={username}
        onChange={(e) => {
          setUsername(e.target.value);
          if (errors.username) setErrors((s) => ({ ...s, username: undefined }));
        }}
        error={errors.username}
      />
      <div className="space-y-1.5">
        <FieldRow
          label="密码"
          htmlFor="password"
          icon={<Lock className="h-4 w-4" />}
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="请输入密码"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password)
              setErrors((s) => ({ ...s, password: undefined }));
          }}
          onKeyUp={(e) =>
            setCapsLock(e.getModifierState?.("CapsLock") ?? false)
          }
          error={errors.password}
          right={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
              className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
          }
        />
        <AnimatePresence initial={false}>
          {capsLock ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[11px] text-flower-sun"
            >
              提示：大写锁定（Caps Lock）已开启
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none">
          <input
            type="checkbox"
            name="remember"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-[var(--primary)]"
          />
          记住用户名（不会保存密码）
        </label>
        <button
          type="button"
          onClick={() => toast("演示环境请联系店长重置密码")}
          className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          忘记密码？
        </button>
      </div>

      <FormError message={formError} />

      <SubmitButton
        phase={phase}
        submitting={submitting}
        label="登录"
        successLabel="欢迎回来"
      />

      <div className="space-y-2.5 pt-1">
        <div className="flex items-center gap-3">
          <span className="hairline flex-1" />
          <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            演示账号 · 一键填充
          </span>
          <span className="hairline flex-1" />
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.username}
              type="button"
              onClick={() => fillDemo(account.username, account.password)}
              className="cursor-pointer rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-[11px] text-muted-foreground transition-[border-color,background-color,color,scale] duration-150 hover:border-primary/40 hover:bg-accent hover:text-foreground active:scale-95"
            >
              {account.label} · {account.username}
            </button>
          ))}
        </div>
        <p className="text-center text-[10.5px] leading-relaxed text-muted-foreground/70">
          对应密码：customer123 · staff123 · admin123
        </p>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Email code login                                                   */
/* ------------------------------------------------------------------ */

export function CodeForm({
  phase,
  onSuccess,
}: {
  phase: AuthPhase;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [scope, animate] = useAnimate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; code?: string }>({});

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const busy = submitting || phase !== "idle";

  function shake() {
    animate(
      scope.current,
      { x: [0, -10, 10, -7, 7, -3, 0] },
      { duration: 0.45, ease: "easeInOut" },
    );
  }

  async function sendCode() {
    if (sending || countdown > 0) return;
    if (!EMAIL_RE.test(email.trim())) {
      setErrors({ email: "请输入正确的邮箱地址" });
      shake();
      return;
    }
    setErrors({});
    setSending(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        demoCode?: string;
      };
      if (res.ok && data.ok && data.demoCode) {
        setCountdown(60);
        toast(`验证码已发送——演示验证码：${data.demoCode}`, "success");
      } else {
        setErrors({ email: data.message ?? "发送失败，请稍后重试" });
        shake();
      }
    } catch {
      toast("网络异常，请稍后重试", "error");
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const next: typeof errors = {};
    if (!EMAIL_RE.test(email.trim())) next.email = "请输入正确的邮箱地址";
    if (!/^\d{6}$/.test(code.trim())) next.code = "请输入 6 位数字验证码";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      shake();
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/auth/login-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (res.ok && data.ok) {
        onSuccess();
      } else {
        setFormError(data.message ?? "登录失败，请稍后重试");
        shake();
      }
    } catch {
      setFormError("网络异常，请检查连接后重试");
      shake();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form ref={scope} onSubmit={handleSubmit} noValidate className="space-y-4">
      <FieldRow
        label="邮箱"
        htmlFor="email"
        icon={<AtSign className="h-4 w-4" />}
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        autoFocus
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (errors.email) setErrors((s) => ({ ...s, email: undefined }));
        }}
        error={errors.email}
      />
      <FieldRow
        label="验证码"
        htmlFor="code"
        icon={<KeyRound className="h-4 w-4" />}
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="6 位数字验证码"
        maxLength={6}
        value={code}
        onChange={(e) => {
          setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
          if (errors.code) setErrors((s) => ({ ...s, code: undefined }));
        }}
        error={errors.code}
        right={
          <button
            type="button"
            onClick={sendCode}
            disabled={sending || countdown > 0}
            className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-border/70 px-2.5 text-[11px] font-medium text-primary transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            {countdown > 0 ? `${countdown}s 后重发` : "发送验证码"}
          </button>
        }
      />

      <FormError message={formError} />

      <SubmitButton
        phase={phase}
        submitting={submitting}
        label="验证并登录"
        successLabel="验证成功"
      />

      <p className="pt-1 text-center text-[11px] leading-relaxed text-muted-foreground/80">
        未注册的邮箱将自动创建消费者账号；演示环境中验证码会直接显示在提示里。
      </p>
    </form>
  );
}
