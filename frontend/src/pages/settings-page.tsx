import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useShallow } from "zustand/react/shallow";
import {
  Check,
  Download,
  Image as ImageIcon,
  KeyRound,
  LogIn,
  LogOut,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Upload,
  type LucideIcon,
} from "lucide-react";
import {
  DEFAULT_BACKGROUND_BLUR,
  DEFAULT_BACKGROUND_OPACITY,
  DEFAULT_COMPONENT_OPACITY,
  useThemeStore,
  type AccentId,
  type BackgroundId,
  type DensityId,
  type PaletteId,
  type RadiusId,
  type SidebarStyleId,
  type ThemeMode,
} from "@/stores/theme";
import { useAuthStore } from "@/stores/auth";
import { appearanceService, authService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import { useAuthBackgroundQuery } from "@/hooks/queries";
import { ApiError, getErrorMessage } from "@/lib/api-client";
import { resolveImageUrl } from "@/lib/image";
import { AUTH_GRADIENT_BACKGROUND } from "@/lib/auth-background";
import { runWithThemeTransition } from "@/lib/theme-transition";
import { toast } from "@/stores/toast";
import { cn } from "@/lib/cn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBloomTransition } from "@/components/domain/bloom-transition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RangeSlider } from "@/components/ui/range-slider";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ImageUpload } from "@/components/domain/image-upload";
import { AuthThemeScope } from "@/components/domain/auth-theme-scope";
import { EmailCodeField } from "@/components/domain/email-code-field";

const modes: Array<{ value: ThemeMode; label: string; icon: LucideIcon }> = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
  { value: "system", label: "跟随系统", icon: Monitor },
];

const palettes: Array<{
  value: PaletteId;
  label: string;
  description: string;
  background: string;
  surface: string;
  primary: string;
}> = [
  {
    value: "default",
    label: "清透晴空",
    description: "明亮、轻盈的默认主题",
    background: "#fbfdff",
    surface: "#ffffff",
    primary: "#38bdf8",
  },
  {
    value: "rose-pine-dawn",
    label: "玫瑰黎明",
    description: "温柔米白与灰粉",
    background: "#faf4ed",
    surface: "#fffaf3",
    primary: "#b4637a",
  },
  {
    value: "catppuccin-latte",
    label: "猫娘拿铁",
    description: "柔和冷调的奶油灰",
    background: "#eff1f5",
    surface: "#ffffff",
    primary: "#1e66f5",
  },
  {
    value: "everforest-light",
    label: "常青森林",
    description: "低饱和的草木气息",
    background: "#efebd4",
    surface: "#fdf6e3",
    primary: "#8da101",
  },
  {
    value: "rose-pine",
    label: "玫瑰松林",
    description: "深色浪漫的暗夜花园",
    background: "#191724",
    surface: "#1f1d2e",
    primary: "#ebbcba",
  },
];

const accents: Array<{ value: AccentId; label: string; color: string }> = [
  { value: "sky", label: "天空蓝", color: "#38bdf8" },
  { value: "blue", label: "群青", color: "#3b82f6" },
  { value: "violet", label: "紫罗兰", color: "#8b5cf6" },
  { value: "rose", label: "玫瑰", color: "#f43f5e" },
  { value: "emerald", label: "翡翠", color: "#10b981" },
  { value: "amber", label: "琥珀", color: "#f59e0b" },
  { value: "orange", label: "暖橙", color: "#f97316" },
];

const radii: Array<{ value: RadiusId; label: string }> = [
  { value: "compact", label: "紧凑" },
  { value: "default", label: "默认" },
  { value: "comfortable", label: "舒展" },
  { value: "round", label: "圆润" },
];

const densities: Array<{ value: DensityId; label: string; hint: string }> = [
  { value: "compact", label: "紧凑", hint: "更多信息，更少留白" },
  { value: "comfortable", label: "舒适", hint: "默认间距与行高" },
];

const sidebars: Array<{ value: SidebarStyleId; label: string; hint: string }> = [
  { value: "follow", label: "跟随主题", hint: "与画布同色系" },
  { value: "panel", label: "独立面板", hint: "与卡片同色" },
  { value: "accent", label: "强调色", hint: "更醒目的侧栏" },
];

const backgrounds: Array<{ value: BackgroundId; label: string }> = [
  { value: "solid", label: "纯色" },
  { value: "gradient", label: "渐变光晕" },
  { value: "image", label: "自定义图片" },
];

const passwordSchema = z
  .object({
    oldPassword: z.string().optional(),
    emailCode: z.string().optional(),
    newPassword: z.string().min(6, "新密码至少 6 位").max(32, "新密码最多 32 位"),
    confirmPassword: z.string().min(1, "请再次输入新密码"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "两次输入的新密码不一致",
  });

type PasswordValues = z.infer<typeof passwordSchema>;
type PasswordMode = "password" | "email";

export function SettingsPage() {
  // 仅订阅页面渲染需要的字段；缩放、遮罩、模糊由各自小组件独立订阅，
  // 拖拽滑动条时不会重渲染整个设置页，保证跟手不卡顿。
  const theme = useThemeStore(
    useShallow((state) => ({
      mode: state.mode,
      palette: state.palette,
      accent: state.accent,
      customAccent: state.customAccent,
      radius: state.radius,
      density: state.density,
      sidebarStyle: state.sidebarStyle,
      reduceMotion: state.reduceMotion,
      highContrast: state.highContrast,
      background: state.background,
      backgroundImage: state.backgroundImage,
      set: state.set,
      reset: state.reset,
      exportTheme: state.exportTheme,
      importTheme: state.importTheme,
    })),
  );
  const isAdmin = useAuthStore((state) => state.user?.role === "ADMIN");
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState("appearance");
  const [resetOpen, setResetOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState(theme.customAccent);

  useEffect(() => {
    setHexDraft(theme.customAccent);
  }, [theme.customAccent]);

  const handleHexChange = (value: string) => {
    setHexDraft(value);
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      theme.set({ accent: "custom", customAccent: value });
    }
  };

  const handleModeChange = (mode: ThemeMode) => {
    if (theme.mode === mode) return;
    runWithThemeTransition(() => theme.set({ mode }));
  };

  const handlePaletteChange = (palette: PaletteId) => {
    if (theme.palette === palette) return;
    runWithThemeTransition(() => theme.set({ palette }));
  };

  const handleExport = () => {
    const blob = new Blob([theme.exportTheme()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "flower-theme.json";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("主题已导出", "可以随时导入恢复。");
  };

  const handleImport = async (file: File) => {
    const text = await file.text().catch(() => "");
    if (theme.importTheme(text)) toast.success("主题已导入");
    else toast.error("导入失败", "文件不是有效的主题 JSON。");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">设置</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          个人外观偏好会同步到当前账号；登录页外观由管理员单独配置。
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="appearance">
            <span className="inline-flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              外观风格
            </span>
          </TabsTrigger>
          {isAdmin ? (
            <TabsTrigger value="auth-appearance">
              <span className="inline-flex items-center gap-1.5">
                <LogIn className="h-3.5 w-3.5" />
                登录页外观风格
              </span>
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="account">
            <span className="inline-flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" />
              账户安全
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="mt-4">
          <p className="mb-4 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            登录后外观偏好会保存到当前账号，换设备自动恢复；未登录时仅保存在本机浏览器。
          </p>
          <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
            <div className="space-y-5">
              <section className="ui-card p-5">
                <SectionTitle
                  icon={Sun}
                  title="显示模式"
                  description="选择界面明暗，或跟随操作系统。"
                />
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {modes.map((mode) => {
                    const Icon = mode.icon;
                    const active = theme.mode === mode.value;
                    return (
                      <button
                        key={mode.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => handleModeChange(mode.value)}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-xl border px-2 py-4 text-xs font-medium transition-colors",
                          active
                            ? "border-primary/40 bg-primary/[0.06] text-primary"
                            : "border-border text-muted-foreground hover:bg-muted/50",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="ui-card p-5">
                <SectionTitle
                  icon={Palette}
                  title="表面配色"
                  description="切换整体色彩气质。深色模式会使用对应暗色版本。"
                />
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {palettes.map((palette) => {
                    const active = theme.palette === palette.value;
                    return (
                      <button
                        key={palette.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => handlePaletteChange(palette.value)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                          active
                            ? "border-primary/40 bg-primary/[0.04]"
                            : "border-border hover:bg-muted/40",
                        )}
                      >
                        <span
                          className="flex h-12 w-14 shrink-0 items-end gap-1 rounded-lg p-1.5 ring-1 ring-black/5"
                          style={{ background: palette.background }}
                        >
                          <span
                            className="h-6 w-4 rounded-sm shadow-sm"
                            style={{ background: palette.surface }}
                          />
                          <span
                            className="h-8 w-4 rounded-sm shadow-sm"
                            style={{ background: palette.primary }}
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-xs font-medium">
                            {palette.label}
                            {active ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-muted-foreground">
                            {palette.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="ui-card p-5">
                <SectionTitle
                  icon={Palette}
                  title="强调色"
                  description="用于按钮、链接与选中状态。"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {accents.map((accent) => {
                    const active = theme.accent === accent.value;
                    return (
                      <button
                        key={accent.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => theme.set({ accent: accent.value })}
                        className={cn(
                          "flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors",
                          active
                            ? "border-primary/40 bg-primary/[0.06]"
                            : "border-border hover:bg-muted/40",
                        )}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full"
                          style={{ background: accent.color }}
                        />
                        {accent.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    aria-pressed={theme.accent === "custom"}
                    onClick={() => theme.set({ accent: "custom" })}
                    className={cn(
                      "flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors",
                      theme.accent === "custom"
                        ? "border-primary/40 bg-primary/[0.06]"
                        : "border-border hover:bg-muted/40",
                    )}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full ring-1 ring-border"
                      style={{ background: theme.customAccent }}
                    />
                    自定义
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="custom-accent">自定义颜色</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="custom-accent"
                        type="color"
                        value={theme.customAccent}
                        onChange={(event) => handleHexChange(event.target.value)}
                        className="h-9 w-12 cursor-pointer rounded-md border border-border bg-card p-1"
                      />
                      <Input
                        value={hexDraft}
                        onChange={(event) => handleHexChange(event.target.value.trim())}
                        onBlur={() => {
                          if (!/^#[0-9a-fA-F]{6}$/.test(hexDraft)) setHexDraft(theme.customAccent);
                        }}
                        className="w-32 font-mono-ui"
                        aria-label="自定义强调色十六进制值"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    输入 6 位十六进制颜色后立即生效。
                  </p>
                </div>
              </section>

              <section className="ui-card p-5">
                <SectionTitle
                  icon={SlidersHorizontal}
                  title="布局细节"
                  description="圆角、密度、侧栏样式与界面缩放。"
                />
                <div className="mt-4 space-y-4">
                  <OptionRow label="圆角">
                    {radii.map((radius) => (
                      <Pill
                        key={radius.value}
                        active={theme.radius === radius.value}
                        onClick={() => theme.set({ radius: radius.value })}
                      >
                        {radius.label}
                      </Pill>
                    ))}
                  </OptionRow>
                  <OptionRow label="信息密度">
                    {densities.map((density) => (
                      <Pill
                        key={density.value}
                        active={theme.density === density.value}
                        onClick={() => theme.set({ density: density.value })}
                        title={density.hint}
                      >
                        {density.label}
                      </Pill>
                    ))}
                  </OptionRow>
                  <OptionRow label="侧栏风格">
                    {sidebars.map((sidebar) => (
                      <Pill
                        key={sidebar.value}
                        active={theme.sidebarStyle === sidebar.value}
                        onClick={() => theme.set({ sidebarStyle: sidebar.value })}
                        title={sidebar.hint}
                      >
                        {sidebar.label}
                      </Pill>
                    ))}
                  </OptionRow>
                  <ScaleControl />
                </div>
              </section>

              <section className="ui-card p-5">
                <SectionTitle
                  icon={ImageIcon}
                  title="背景"
                  description="为画布添加纯色、渐变光晕，或使用图片。"
                />
                <div className="mt-4 space-y-4">
                  <BackgroundPreview
                    background={theme.background}
                    image={theme.backgroundImage}
                  />
                  <OptionRow label="背景类型">
                    {backgrounds.map((background) => (
                      <Pill
                        key={background.value}
                        active={theme.background === background.value}
                        onClick={() => theme.set({ background: background.value })}
                      >
                        {background.label}
                      </Pill>
                    ))}
                  </OptionRow>
                  {theme.background === "image" ? (
                    <>
                      <ImageUpload
                        value={theme.backgroundImage}
                        onChange={(backgroundImage) => theme.set({ backgroundImage })}
                        category="background"
                        className="h-40 w-full"
                        actionLabel="上传背景图片"
                        cropAspect={16 / 9}
                        preview={false}
                      />
                      <BackgroundSliders />
                    </>
                  ) : null}
                  <ComponentOpacitySlider />
                  <p className="text-[11px] text-muted-foreground">
                    建议使用 16:9 横图（至少 1920×1080）；组件不透明度作用于卡片、面板与浮层。
                  </p>
                </div>
              </section>

              <section className="ui-card p-5">
                <SectionTitle
                  icon={SlidersHorizontal}
                  title="可访问性"
                  description="减少动效并提高文字与边框对比度。"
                />
                <div className="mt-4 space-y-3">
                  <SwitchRow
                    id="reduce-motion"
                    label="减少动效"
                    description="几乎关闭过渡与动画，适合对动效敏感的用户。"
                    checked={theme.reduceMotion}
                    onCheckedChange={(checked) => theme.set({ reduceMotion: checked })}
                  />
                  <SwitchRow
                    id="high-contrast"
                    label="高对比度"
                    description="加深边框与次要文字，提升可读性。"
                    checked={theme.highContrast}
                    onCheckedChange={(checked) => theme.set({ highContrast: checked })}
                  />
                </div>
              </section>
            </div>

            <aside className="space-y-4 xl:sticky xl:top-20">
              <section className="ui-card p-4">
                <h2 className="text-sm font-semibold tracking-tight">效果预览</h2>
                <div className="mt-3 rounded-lg border border-border/60 bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">花屿 Bloom Isle</span>
                    <Badge variant="secondary">预览</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="h-2 w-3/4 rounded-full bg-muted" />
                    <div className="h-2 w-1/2 rounded-full bg-muted" />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <span className="rounded-md bg-primary-solid px-2.5 py-1.5 text-[11px] font-medium text-primary-solid-foreground">
                      主按钮
                    </span>
                    <span className="rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px]">
                      次按钮
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                  外观只影响当前浏览器，不会写入后端。
                </p>
              </section>

              <section className="ui-card p-4">
                <h2 className="text-sm font-semibold tracking-tight">主题方案</h2>
                <div className="mt-3 space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={handleExport}>
                    <Download className="h-3.5 w-3.5" />
                    导出主题 JSON
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    导入主题 JSON
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleImport(file);
                    }}
                  />
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground"
                    onClick={() => setResetOpen(true)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    恢复默认外观
                  </Button>
                </div>
              </section>
            </aside>
          </div>

          <ConfirmDialog
            open={resetOpen}
            onOpenChange={setResetOpen}
            title="恢复默认外观？"
            description="当前的颜色、圆角、密度、背景与可访问性设置都会被重置为默认值。"
            confirmText="恢复默认"
            onConfirm={() => {
              theme.reset();
              setResetOpen(false);
              toast.success("已恢复默认外观");
            }}
          />
        </TabsContent>

        {isAdmin ? (
          <TabsContent value="auth-appearance" className="mt-4">
            <p className="mb-4 rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              登录页外观仅管理员可见和可编辑，统一作用于登录与注册页，对所有访客生效；修改后自动保存。
            </p>
            <AuthBackgroundSection />
          </TabsContent>
        ) : null}

        <TabsContent value="account" className="mt-4">
          <AccountSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AccountSettings() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const bloom = useBloomTransition();
  const [loggingOut, setLoggingOut] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { oldPassword: "", emailCode: "", newPassword: "", confirmPassword: "" },
  });
  const [mode, setMode] = useState<PasswordMode>("password");
  const email = user?.email ?? "";

  const switchMode = (next: PasswordMode) => {
    setMode(next);
    clearErrors(["oldPassword", "emailCode"]);
  };

  const changePassword = async (values: PasswordValues) => {
    if (mode === "password" && !values.oldPassword?.trim()) {
      setError("oldPassword", { type: "manual", message: "请输入原密码" });
      return;
    }
    if (mode === "email") {
      if (!email) {
        toast.error("当前账号未绑定邮箱", "请先在个人中心绑定邮箱后再使用验证码修改密码。");
        return;
      }
      if (!/^\d{6}$/.test(values.emailCode ?? "")) {
        setError("emailCode", { type: "manual", message: "请输入 6 位数字验证码" });
        return;
      }
    }
    try {
      await authService.changePassword({
        oldPassword: mode === "password" ? values.oldPassword : undefined,
        emailCode: mode === "email" ? values.emailCode : undefined,
        newPassword: values.newPassword,
      });
      toast.success("密码已更新", "请使用新密码重新登录。");
      reset();
      bloom.play({
        run: async () => {
          await logout();
          navigate("/login", { replace: true });
        },
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === 1005) {
        setError("oldPassword", { type: "server", message: "原密码不正确" });
        return;
      }
      if (error instanceof ApiError && error.code === 1006) {
        setError("emailCode", { type: "server", message: "验证码错误或已过期，请重新获取" });
        return;
      }
      toast.error("密码修改失败", getErrorMessage(error));
    }
  };

  const handleLogout = () => {
    setLoggingOut(true);
    bloom.play({
      run: async () => {
        await logout();
        navigate("/login", { replace: true });
      },
      onComplete: () => setLoggingOut(false),
    });
  };

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
      <section className="ui-card p-5 md:p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <KeyRound className="h-4 w-4 text-primary" />
          修改密码
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          可使用原密码，或通过绑定邮箱的验证码修改密码。修改成功后当前登录会失效，需要重新登录。
        </p>
        <form
          onSubmit={handleSubmit(changePassword)}
          noValidate
          className="mt-5 max-w-md space-y-4"
        >
          <OptionRow label="验证方式">
            <Pill active={mode === "password"} onClick={() => switchMode("password")}>
              原密码
            </Pill>
            <Pill active={mode === "email"} onClick={() => switchMode("email")}>
              邮箱验证码
            </Pill>
          </OptionRow>
          {mode === "password" ? (
            <div className="space-y-1.5">
              <Label htmlFor="oldPassword">原密码 *</Label>
              <Input
                id="oldPassword"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.oldPassword)}
                {...register("oldPassword")}
              />
              {errors.oldPassword ? (
                <p className="text-xs text-destructive">{errors.oldPassword.message}</p>
              ) : null}
            </div>
          ) : email ? (
            <>
              <div className="space-y-1.5">
                <Label>绑定邮箱</Label>
                <div className="flex h-10 items-center rounded-lg border border-border bg-muted/30 px-3 text-xs text-muted-foreground">
                  {email}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emailCode">邮箱验证码 *</Label>
                <EmailCodeField
                  id="emailCode"
                  email={email}
                  scene="CHANGE_PASSWORD"
                  registration={register("emailCode")}
                  invalid={Boolean(errors.emailCode)}
                  onEmailInvalid={() => setError("emailCode", { message: "当前邮箱不可用" })}
                  onError={(message) => toast.error("验证码发送失败", message)}
                />
                {errors.emailCode ? (
                  <p className="text-xs text-destructive">{errors.emailCode.message}</p>
                ) : null}
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                验证码将发送到当前账号绑定的邮箱，5 分钟内有效。
              </p>
            </>
          ) : (
            <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[11px] leading-relaxed text-warning">
              当前账号未绑定邮箱，请先在个人中心绑定邮箱后再使用验证码修改密码。
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">新密码 *</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.newPassword)}
              {...register("newPassword")}
            />
            {errors.newPassword ? (
              <p className="text-xs text-destructive">{errors.newPassword.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">确认新密码 *</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword ? (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            ) : null}
          </div>
          <Button type="submit" loading={isSubmitting}>
            保存新密码
          </Button>
        </form>
      </section>

      <aside className="space-y-4">
        <section className="ui-card p-5">
          <h2 className="text-sm font-semibold tracking-tight">当前账号</h2>
          <dl className="mt-3 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">用户名</dt>
              <dd className="font-medium">{user?.username ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">角色</dt>
              <dd>{user?.roleLabel ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">状态</dt>
              <dd>{user?.statusLabel ?? "—"}</dd>
            </div>
          </dl>
          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={handleLogout}
            loading={loggingOut}
          >
            <LogOut className="h-3.5 w-3.5" />
            退出登录
          </Button>
        </section>
        <section className="ui-card p-5">
          <h2 className="text-sm font-semibold tracking-tight">登录凭证</h2>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            JWT 保存在 localStorage，到期前页面会自动登出；接口返回 401 时会立即清理本地状态。
          </p>
        </section>
      </aside>
    </div>
  );
}

function ScaleControl() {
  const scale = useThemeStore((state) => state.scale);
  const set = useThemeStore((state) => state.set);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium">界面缩放</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground tabular">{Math.round(scale * 100)}%</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[11px] text-muted-foreground"
            onClick={() => set({ scale: 1 })}
            disabled={scale === 1}
            title="重置为 100%"
          >
            <RotateCcw className="h-3 w-3" />
            重置
          </Button>
        </div>
      </div>
      <RangeSlider
        min={0.9}
        max={1.1}
        step={0.001}
        value={scale}
        onChange={(next) => set({ scale: next })}
        className="mt-2 w-full"
        aria-label="界面缩放"
      />
      <p className="mt-1 text-[11px] text-muted-foreground">建议保持在 90% - 110% 之间。</p>
    </div>
  );
}

function BackgroundSliders() {
  const backgroundOpacity = useThemeStore((state) => state.backgroundOpacity);
  const backgroundBlur = useThemeStore((state) => state.backgroundBlur);
  const set = useThemeStore((state) => state.set);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">遮罩不透明度</span>
            <span className="text-muted-foreground tabular">
              {Math.round(backgroundOpacity * 100)}%
            </span>
          </div>
          <RangeSlider
            min={0.4}
            max={0.98}
            step={0.001}
            value={backgroundOpacity}
            onChange={(next) => set({ backgroundOpacity: next })}
            className="mt-2 w-full"
            aria-label="背景遮罩不透明度"
          />
        </div>
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">背景模糊</span>
            <span className="text-muted-foreground tabular">
              {Math.round(backgroundBlur)}px
            </span>
          </div>
          <RangeSlider
            min={0}
            max={20}
            step={0.1}
            value={backgroundBlur}
            onChange={(next) => set({ backgroundBlur: next })}
            className="mt-2 w-full"
            aria-label="背景模糊"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] text-muted-foreground"
          onClick={() =>
            set({
              backgroundOpacity: DEFAULT_BACKGROUND_OPACITY,
              backgroundBlur: DEFAULT_BACKGROUND_BLUR,
            })
          }
          disabled={
            backgroundOpacity === DEFAULT_BACKGROUND_OPACITY &&
            backgroundBlur === DEFAULT_BACKGROUND_BLUR
          }
        >
          <RotateCcw className="h-3 w-3" />
          重置遮罩与模糊
        </Button>
      </div>
    </>
  );
}

function ComponentOpacitySlider() {
  const componentOpacity = useThemeStore((state) => state.componentOpacity);
  const set = useThemeStore((state) => state.set);

  return (
    <div className="rounded-xl border border-border/60 bg-muted/25 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">组件不透明度</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground tabular">
            {Math.round(componentOpacity * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px] text-muted-foreground"
            onClick={() => set({ componentOpacity: DEFAULT_COMPONENT_OPACITY })}
            disabled={componentOpacity === DEFAULT_COMPONENT_OPACITY}
          >
            <RotateCcw className="h-3 w-3" />
            重置
          </Button>
        </div>
      </div>
      <RangeSlider
        min={0.4}
        max={1}
        step={0.001}
        value={componentOpacity}
        onChange={(next) => set({ componentOpacity: next })}
        className="mt-2 w-full"
        aria-label="组件不透明度"
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        调整卡片、面板与浮层背景的透明度，文字保持不透明；建议不低于 60%。
      </p>
    </div>
  );
}

type AuthBackgroundType = "none" | "gradient" | "image";

interface AuthBackgroundDraft {
  image: string;
  opacity: number;
  blur: number;
  component: number;
  palette: PaletteId;
  accent: AccentId;
  customAccent: string;
}

const AUTH_BG_DEFAULTS: AuthBackgroundDraft = {
  image: "",
  opacity: 0.78,
  blur: 0,
  component: 1,
  palette: "default",
  accent: "sky",
  customAccent: "#38bdf8",
};

const AUTH_CUSTOM_ACCENT_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** 服务端只接受整数模糊值，比较与提交前统一归一化，避免滑块反复触发保存。 */
function serializeAuthDraft(draft: AuthBackgroundDraft, type: AuthBackgroundType) {
  return JSON.stringify({
    type,
    image: draft.image,
    opacity: Number(draft.opacity.toFixed(3)),
    blur: Math.round(draft.blur),
    component: Number(draft.component.toFixed(3)),
    palette: draft.palette,
    accent: draft.accent,
    customAccent: draft.accent === "custom" ? draft.customAccent.toLowerCase() : "",
  });
}

function AuthBackgroundSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useAuthBackgroundQuery();
  const [draft, setDraft] = useState<AuthBackgroundDraft>(AUTH_BG_DEFAULTS);
  const [type, setType] = useState<AuthBackgroundType>("none");
  const [hexDraft, setHexDraft] = useState(AUTH_BG_DEFAULTS.customAccent);
  const hydratedRef = useRef(false);
  const savedRef = useRef(serializeAuthDraft(AUTH_BG_DEFAULTS, "none"));

  useEffect(() => {
    setHexDraft(draft.customAccent);
  }, [draft.customAccent]);

  useEffect(() => {
    if (hydratedRef.current || !data) return;
    const next: AuthBackgroundDraft = {
      image: data.imageUrl ?? "",
      opacity: data.backgroundOpacity ?? AUTH_BG_DEFAULTS.opacity,
      blur: data.backgroundBlur ?? AUTH_BG_DEFAULTS.blur,
      component: data.componentOpacity ?? AUTH_BG_DEFAULTS.component,
      palette: data.palette ?? AUTH_BG_DEFAULTS.palette,
      accent: data.accent ?? AUTH_BG_DEFAULTS.accent,
      customAccent: data.customAccent ?? AUTH_BG_DEFAULTS.customAccent,
    };
    const storedType = (data.backgroundType ?? (next.image ? "IMAGE" : "NONE")).toLowerCase();
    const nextType: AuthBackgroundType =
      storedType === "gradient" ? "gradient" : storedType === "image" ? "image" : "none";
    setDraft(next);
    setType(nextType);
    savedRef.current = serializeAuthDraft(next, nextType);
    hydratedRef.current = true;
  }, [data]);

  const save = useMutation({
    mutationFn: ({ next, mode }: { next: AuthBackgroundDraft; mode: AuthBackgroundType }) =>
      appearanceService.updateAuthBackground({
        backgroundType: mode === "none" ? "NONE" : mode === "gradient" ? "GRADIENT" : "IMAGE",
        imageUrl: mode === "none" ? "" : next.image,
        backgroundOpacity: next.opacity,
        backgroundBlur: Math.round(next.blur),
        componentOpacity: next.component,
        palette: next.palette,
        accent: next.accent,
        customAccent: AUTH_CUSTOM_ACCENT_PATTERN.test(next.customAccent)
          ? next.customAccent.toLowerCase()
          : undefined,
      }),
    onSuccess: (result, variables) => {
      queryClient.setQueryData(queryKeys.authBackground, result);
      savedRef.current = serializeAuthDraft(
        {
          image: result.imageUrl ?? "",
          opacity: result.backgroundOpacity ?? AUTH_BG_DEFAULTS.opacity,
          blur: result.backgroundBlur ?? AUTH_BG_DEFAULTS.blur,
          component: result.componentOpacity ?? AUTH_BG_DEFAULTS.component,
          palette: result.palette ?? AUTH_BG_DEFAULTS.palette,
          accent: result.accent ?? AUTH_BG_DEFAULTS.accent,
          customAccent: result.customAccent ?? AUTH_BG_DEFAULTS.customAccent,
        },
        variables.mode,
      );
    },
    onError: (error) => toast.error("登录页外观保存失败", getErrorMessage(error)),
  });
  const { mutate } = save;

  // 滑块拖动时只更新本地预览，停顿 600ms 后整体同步到服务端。
  useEffect(() => {
    if (!hydratedRef.current) return;
    // 自定义强调色尚未输入完整时不提交，避免服务端校验失败。
    if (draft.accent === "custom" && !AUTH_CUSTOM_ACCENT_PATTERN.test(draft.customAccent)) return;
    const payload = serializeAuthDraft(draft, type);
    if (payload === savedRef.current) return;
    const timer = setTimeout(() => mutate({ next: draft, mode: type }), 600);
    return () => clearTimeout(timer);
  }, [draft, type, mutate]);

  const patchDraft = (patch: Partial<AuthBackgroundDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const handleHexChange = (value: string) => {
    setHexDraft(value);
    if (AUTH_CUSTOM_ACCENT_PATTERN.test(value)) {
      patchDraft({ accent: "custom", customAccent: value });
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
      <div className="space-y-5">
        <section className="ui-card p-5">
          <SectionTitle
            icon={Palette}
            title="表面配色"
            description="登录页与注册页共用的整体色彩气质，不影响访客个人偏好。"
          />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {palettes.map((palette) => {
              const active = draft.palette === palette.value;
              return (
                <button
                  key={palette.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => patchDraft({ palette: palette.value })}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors",
                    active
                      ? "border-primary/40 bg-primary/[0.04]"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <span
                    className="flex h-12 w-14 shrink-0 items-end gap-1 rounded-lg p-1.5 ring-1 ring-black/5"
                    style={{ background: palette.background }}
                  >
                    <span
                      className="h-6 w-4 rounded-sm shadow-sm"
                      style={{ background: palette.surface }}
                    />
                    <span
                      className="h-8 w-4 rounded-sm shadow-sm"
                      style={{ background: palette.primary }}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      {palette.label}
                      {active ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {palette.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="ui-card p-5">
          <SectionTitle
            icon={Palette}
            title="强调色"
            description="用于登录页的按钮、链接与选中状态。"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {accents.map((accent) => {
              const active = draft.accent === accent.value;
              return (
                <button
                  key={accent.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => patchDraft({ accent: accent.value })}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors",
                    active
                      ? "border-primary/40 bg-primary/[0.06]"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full"
                    style={{ background: accent.color }}
                  />
                  {accent.label}
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={draft.accent === "custom"}
              onClick={() => patchDraft({ accent: "custom" })}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors",
                draft.accent === "custom"
                  ? "border-primary/40 bg-primary/[0.06]"
                  : "border-border hover:bg-muted/40",
              )}
            >
              <span
                className="h-3.5 w-3.5 rounded-full ring-1 ring-border"
                style={{ background: draft.customAccent }}
              />
              自定义
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="auth-custom-accent">自定义颜色</Label>
              <div className="flex items-center gap-2">
                <input
                  id="auth-custom-accent"
                  type="color"
                  value={AUTH_CUSTOM_ACCENT_PATTERN.test(draft.customAccent) ? draft.customAccent : "#38bdf8"}
                  onChange={(event) =>
                    patchDraft({ accent: "custom", customAccent: event.target.value })
                  }
                  className="h-9 w-12 cursor-pointer rounded-md border border-border bg-card p-1"
                />
                <Input
                  value={hexDraft}
                  onChange={(event) => handleHexChange(event.target.value.trim())}
                  onBlur={() => {
                    if (!AUTH_CUSTOM_ACCENT_PATTERN.test(hexDraft)) setHexDraft(draft.customAccent);
                  }}
                  className="w-32 font-mono-ui"
                  aria-label="登录页自定义强调色十六进制值"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              输入 6 位十六进制颜色后立即生效。
            </p>
          </div>
        </section>

        <section className="ui-card p-5">
          <SectionTitle
            icon={LogIn}
            title="登录页背景"
            description="登录与注册页共用，对所有访客生效。"
          />
          <div className="mt-4 space-y-4">
            <OptionRow label="背景类型">
              <Pill active={type === "none"} onClick={() => setType("none")}>
                纯色
              </Pill>
              <Pill active={type === "gradient"} onClick={() => setType("gradient")}>
                渐变光晕
              </Pill>
              <Pill active={type === "image"} onClick={() => setType("image")}>
                自定义图片
              </Pill>
            </OptionRow>
            {type === "image" ? (
              <>
                <ImageUpload
                  value={draft.image}
                  onChange={(image) => patchDraft({ image })}
                  category="background"
                  className="h-40 w-full"
                  actionLabel="上传背景图片"
                  cropAspect={16 / 9}
                  preview={false}
                  disabled={isLoading}
                />
                <AuthBackgroundSliders draft={draft} onChange={patchDraft} />
              </>
            ) : null}
            <AuthComponentOpacitySlider draft={draft} onChange={patchDraft} />
            <p className="text-[11px] text-muted-foreground">
              建议使用 16:9 横图（至少 1920×1080）；组件不透明度作用于登录卡片与左侧介绍栏。
            </p>
          </div>
        </section>

        <section className="ui-card p-5">
          <SectionTitle
            icon={Monitor}
            title="生效说明"
            description="登录页外观是全局配置，仅管理员可以修改。"
          />
          <ul className="mt-4 space-y-2 text-xs leading-relaxed text-muted-foreground">
            <li>· 表面配色与强调色只作用于登录 / 注册页，不会改变已登录用户自己的外观偏好。</li>
            <li>· 同时作用于登录页与注册页的背景区域，所有访客共享。</li>
            <li>· 自定义图片会先上传到图床，再作为背景地址保存。</li>
            <li>· 拖动滑块后约 0.6 秒自动保存，无需手动提交。</li>
          </ul>
        </section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-20">
        <section className="ui-card p-4">
          <h2 className="text-sm font-semibold tracking-tight">效果预览</h2>
          <div className="mt-3">
            <AuthBackgroundPreview draft={draft} type={type} />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            预览与登录页使用同一套配色、背景、遮罩与模糊参数。
          </p>
        </section>
      </aside>
    </div>
  );
}

function AuthBackgroundPreview({
  draft,
  type,
}: {
  draft: AuthBackgroundDraft;
  type: AuthBackgroundType;
}) {
  const image = resolveImageUrl(draft.image) ?? "";
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const hasImage = type === "image" && image.length > 0 && image !== brokenUrl;
  const label =
    type === "none"
      ? "纯色"
      : type === "gradient"
        ? "渐变光晕"
        : hasImage
          ? "自定义图片"
          : "等待上传图片";

  return (
    <AuthThemeScope
      palette={draft.palette}
      accent={draft.accent}
      customAccent={draft.customAccent}
      className="relative h-40 overflow-hidden rounded-xl border border-border/60 bg-background"
    >
      {type === "gradient" ? (
        <div
          className="absolute inset-0"
          style={{ backgroundImage: AUTH_GRADIENT_BACKGROUND }}
        />
      ) : null}
      {hasImage ? (
        <img
          src={image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            filter: `blur(${draft.blur}px)`,
            transform: draft.blur > 0 ? "scale(1.08)" : undefined,
          }}
          onError={() => setBrokenUrl(image)}
        />
      ) : null}
      {type === "image" ? (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "var(--background)", opacity: draft.opacity }}
        />
      ) : null}
      <div className="relative z-10 flex h-full flex-col justify-between p-3">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="overlay" className="text-[10px]">
            登录页背景
          </Badge>
          <Badge variant="overlay" className="text-[10px]">
            {label}
          </Badge>
        </div>
        <div
          className="max-w-[72%] rounded-lg border border-border/60 p-2.5 shadow-sm backdrop-blur-sm"
          style={{
            backgroundColor: `color-mix(in oklab, var(--card) ${Math.round(
              draft.component * 100,
            )}%, transparent)`,
          }}
        >
          <p className="text-[11px] font-semibold">登录页效果实时预览</p>
          <div className="mt-1.5 h-1.5 w-24 rounded-full bg-muted" />
          <div className="mt-1 h-1.5 w-16 rounded-full bg-muted" />
          <span className="mt-2 inline-flex rounded-md bg-primary-solid px-2 py-1 text-[10px] font-medium text-primary-solid-foreground">
            主按钮
          </span>
          {type === "image" ? (
            <p className="mt-1.5 text-[10px] text-muted-foreground tabular">
              遮罩 {Math.round(draft.opacity * 100)}% · 模糊 {Math.round(draft.blur)}px ·
              组件 {Math.round(draft.component * 100)}%
            </p>
          ) : null}
        </div>
      </div>
    </AuthThemeScope>
  );
}

function AuthBackgroundSliders({
  draft,
  onChange,
}: {
  draft: AuthBackgroundDraft;
  onChange: (patch: Partial<AuthBackgroundDraft>) => void;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">遮罩不透明度</span>
            <span className="text-muted-foreground tabular">
              {Math.round(draft.opacity * 100)}%
            </span>
          </div>
          <RangeSlider
            min={0.4}
            max={0.98}
            step={0.001}
            value={draft.opacity}
            onChange={(opacity) => onChange({ opacity })}
            className="mt-2 w-full"
            aria-label="登录页遮罩不透明度"
          />
        </div>
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">背景模糊</span>
            <span className="text-muted-foreground tabular">{Math.round(draft.blur)}px</span>
          </div>
          <RangeSlider
            min={0}
            max={20}
            step={0.1}
            value={draft.blur}
            onChange={(blur) => onChange({ blur })}
            className="mt-2 w-full"
            aria-label="登录页背景模糊"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] text-muted-foreground"
          onClick={() => onChange({ opacity: AUTH_BG_DEFAULTS.opacity, blur: AUTH_BG_DEFAULTS.blur })}
          disabled={
            draft.opacity === AUTH_BG_DEFAULTS.opacity && draft.blur === AUTH_BG_DEFAULTS.blur
          }
        >
          <RotateCcw className="h-3 w-3" />
          重置遮罩与模糊
        </Button>
      </div>
    </>
  );
}

function AuthComponentOpacitySlider({
  draft,
  onChange,
}: {
  draft: AuthBackgroundDraft;
  onChange: (patch: Partial<AuthBackgroundDraft>) => void;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/25 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">组件不透明度</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground tabular">
            {Math.round(draft.component * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px] text-muted-foreground"
            onClick={() => onChange({ component: AUTH_BG_DEFAULTS.component })}
            disabled={draft.component === AUTH_BG_DEFAULTS.component}
          >
            <RotateCcw className="h-3 w-3" />
            重置
          </Button>
        </div>
      </div>
      <RangeSlider
        min={0.4}
        max={1}
        step={0.001}
        value={draft.component}
        onChange={(component) => onChange({ component })}
        className="mt-2 w-full"
        aria-label="登录页组件不透明度"
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        调整登录卡片与左侧介绍栏的透明度，文字保持不透明；改动会自动保存。
      </p>
    </div>
  );
}

function BackgroundPreview({
  background,
  image,
}: {
  background: BackgroundId;
  image: string;
}) {
  const opacity = useThemeStore((state) => state.backgroundOpacity);
  const blur = useThemeStore((state) => state.backgroundBlur);
  const hasImage = background === "image" && image.trim().length > 0;
  const label =
    background === "solid"
      ? "纯色"
      : background === "gradient"
        ? "渐变光晕"
        : hasImage
          ? "自定义图片"
          : "等待上传图片";

  return (
    <div className="relative h-40 overflow-hidden rounded-xl border border-border/60 bg-background">
      <div className="app-background pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative z-10 flex h-full flex-col justify-between p-3">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="overlay" className="text-[10px]">
            页面背景
          </Badge>
          <Badge variant="overlay" className="text-[10px]">
            {label}
          </Badge>
        </div>
        <div className="max-w-[72%] rounded-lg border border-border/60 bg-card/88 p-2.5 shadow-sm backdrop-blur-sm">
          <p className="text-[11px] font-semibold">背景效果实时预览</p>
          <div className="mt-1.5 h-1.5 w-24 rounded-full bg-muted" />
          <div className="mt-1 h-1.5 w-16 rounded-full bg-muted" />
          {background === "image" ? (
            <p className="mt-1.5 text-[10px] text-muted-foreground tabular">
              遮罩 {Math.round(opacity * 100)}% · 模糊 {Math.round(blur)}px
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function OptionRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs font-medium">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      title={title}
      className={cn(
        "h-8 rounded-full border px-3 text-[11px] font-medium transition-colors",
        active
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-muted/50",
      )}
    >
      {children}
    </button>
  );
}

function SwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 px-3.5 py-3">
      <div>
        <label htmlFor={id} className="cursor-pointer text-xs font-medium">
          {label}
        </label>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} label={label} />
    </div>
  );
}
