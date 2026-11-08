import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/api-client";
import { authService } from "@/lib/services";
import { toast } from "@/stores/toast";
import type { EmailCodeScene } from "@/types/api";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOLDOWN_SECONDS = 60;

interface EmailCodeFieldProps {
  id: string;
  email: string;
  scene: EmailCodeScene;
  registration: UseFormRegisterReturn;
  invalid?: boolean;
  onEmailInvalid: () => void;
  onError: (message: string) => void;
}

export function EmailCodeField({
  id,
  email,
  scene,
  registration,
  invalid,
  onEmailInvalid,
  onError,
}: EmailCodeFieldProps) {
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const handleSend = async () => {
    const target = email.trim();
    if (!EMAIL_PATTERN.test(target)) {
      onEmailInvalid();
      return;
    }
    setSending(true);
    try {
      await authService.sendEmailCode({ email: target, scene });
      setCooldown(COOLDOWN_SECONDS);
      toast.success("验证码已发送", `请查收 ${target} 的邮件，5 分钟内有效。`);
    } catch (error) {
      onError(getErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-start gap-2">
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="6 位数字验证码"
        className="tracking-[0.35em]"
        aria-invalid={invalid}
        {...registration}
      />
      <Button
        type="button"
        variant="outline"
        className="h-10 shrink-0 px-3 text-xs tabular-nums"
        loading={sending}
        disabled={cooldown > 0}
        onClick={handleSend}
      >
        {cooldown > 0 ? (
          `${cooldown}s 后重发`
        ) : (
          <>
            <Mail className="h-4 w-4" />
            获取验证码
          </>
        )}
      </Button>
    </div>
  );
}
