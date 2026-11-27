import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  Clock3,
  Flower2,
  Palette,
  Pencil,
  Phone,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { adminService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/api-client";
import { useLongPressSort } from "@/hooks/use-long-press-sort";
import { toast } from "@/stores/toast";
import { cn } from "@/lib/cn";
import { resolveImageUrl } from "@/lib/image";
import type {
  BusinessHourSaveRequest,
  BusinessHourVO,
  FlowerMaterialSaveRequest,
  FlowerMaterialVO,
  StoreProfileVO,
  WrapColorSaveRequest,
  WrapColorVO,
} from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TimeWheelPicker } from "@/components/ui/time-wheel-picker";
import { ImageUpload } from "@/components/domain/image-upload";

const WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

interface FlowerFormState {
  name: string;
  latinName: string;
  note: string;
  colorHex: string;
  imageUrl: string;
  enabled: boolean;
  sortOrder: string;
}

interface WrapFormState {
  name: string;
  hex: string;
  ringHex: string;
  description: string;
  enabled: boolean;
  sortOrder: string;
}

const emptyFlowerForm: FlowerFormState = {
  name: "",
  latinName: "",
  note: "",
  colorHex: "#c96b7a",
  imageUrl: "",
  enabled: true,
  sortOrder: "0",
};

const emptyWrapForm: WrapFormState = {
  name: "",
  hex: "#ece7db",
  ringHex: "#cbc2ae",
  description: "",
  enabled: true,
  sortOrder: "0",
};

export function AdminCatalogPage() {
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState("flower");
  const [flowerEditor, setFlowerEditor] = useState<{
    open: boolean;
    material: FlowerMaterialVO | null;
  }>({ open: false, material: null });
  const [wrapEditor, setWrapEditor] = useState<{
    open: boolean;
    color: WrapColorVO | null;
  }>({ open: false, color: null });
  const [deletingFlower, setDeletingFlower] = useState<FlowerMaterialVO | null>(null);
  const [deletingWrap, setDeletingWrap] = useState<WrapColorVO | null>(null);

  const flowers = useQuery({
    queryKey: queryKeys.adminFlowerMaterials,
    queryFn: adminService.flowerMaterials,
  });
  const wraps = useQuery({
    queryKey: queryKeys.adminWrapColors,
    queryFn: adminService.wrapColors,
  });
  const hours = useQuery({
    queryKey: queryKeys.adminBusinessHours,
    queryFn: adminService.businessHours,
  });
  const storeProfile = useQuery({
    queryKey: queryKeys.adminStoreProfile,
    queryFn: adminService.storeProfile,
  });

  const invalidateCatalog = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminFlowerMaterials });
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminWrapColors });
    void queryClient.invalidateQueries({ queryKey: queryKeys.flowerMaterials });
    void queryClient.invalidateQueries({ queryKey: queryKeys.wrapColors });
    void queryClient.invalidateQueries({ queryKey: ["product"] });
    void queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const deleteFlowerMutation = useMutation({
    mutationFn: adminService.deleteFlowerMaterial,
    onSuccess: () => {
      toast.success("花材已删除");
      invalidateCatalog();
      setDeletingFlower(null);
    },
    onError: (error) => toast.error("删除花材失败", getErrorMessage(error)),
  });

  const deleteWrapMutation = useMutation({
    mutationFn: adminService.deleteWrapColor,
    onSuccess: () => {
      toast.success("包装色系已删除");
      invalidateCatalog();
      setDeletingWrap(null);
    },
    onError: (error) => toast.error("删除包装色系失败", getErrorMessage(error)),
  });

  const reorderFlowers = useMutation({
    mutationFn: async (ordered: FlowerMaterialVO[]) => {
      await Promise.all(
        ordered.map((material, index) =>
          adminService.updateFlowerMaterial(material.id, {
            name: material.name,
            latinName: material.latinName,
            note: material.note,
            colorHex: material.colorHex,
            imageUrl: material.imageUrl,
            enabled: material.enabled ? 1 : 0,
            sortOrder: (index + 1) * 10,
          }),
        ),
      );
    },
    onMutate: async (ordered) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.adminFlowerMaterials });
      const previous = queryClient.getQueryData<FlowerMaterialVO[]>(queryKeys.adminFlowerMaterials);
      queryClient.setQueryData(queryKeys.adminFlowerMaterials, ordered);
      return { previous };
    },
    onSuccess: () => {
      toast.success("花材顺序已更新");
      invalidateCatalog();
    },
    onError: (error, _ordered, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.adminFlowerMaterials, context.previous);
      }
      toast.error("调整花材顺序失败", getErrorMessage(error));
    },
  });

  const reorderWraps = useMutation({
    mutationFn: async (ordered: WrapColorVO[]) => {
      await Promise.all(
        ordered.map((color, index) =>
          adminService.updateWrapColor(color.id, {
            name: color.name,
            hex: color.hex,
            ringHex: color.ringHex,
            description: color.description,
            enabled: color.enabled ? 1 : 0,
            sortOrder: (index + 1) * 10,
          }),
        ),
      );
    },
    onMutate: async (ordered) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.adminWrapColors });
      const previous = queryClient.getQueryData<WrapColorVO[]>(queryKeys.adminWrapColors);
      queryClient.setQueryData(queryKeys.adminWrapColors, ordered);
      return { previous };
    },
    onSuccess: () => {
      toast.success("包装色系顺序已更新");
      invalidateCatalog();
    },
    onError: (error, _ordered, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.adminWrapColors, context.previous);
      }
      toast.error("调整包装色系顺序失败", getErrorMessage(error));
    },
  });

  const flowerSort = useLongPressSort({
    items: flowers.data ?? [],
    group: "flower",
    disabled: reorderFlowers.isPending,
    onCommit: (ordered) => reorderFlowers.mutate(ordered),
  });

  const wrapSort = useLongPressSort({
    items: wraps.data ?? [],
    group: "wrap",
    disabled: reorderWraps.isPending,
    onCommit: (ordered) => reorderWraps.mutate(ordered),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">商品配置</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            维护全局花材库、包装色系、门店营业时间与营业电话，商品详情与结算页会实时读取。
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto">
          <TabsTrigger value="flower">
            <Flower2 className="mr-1.5 inline h-3.5 w-3.5" />
            花材库
          </TabsTrigger>
          <TabsTrigger value="wrap">
            <Palette className="mr-1.5 inline h-3.5 w-3.5" />
            包装色系
          </TabsTrigger>
          <TabsTrigger value="hour">
            <Clock3 className="mr-1.5 inline h-3.5 w-3.5" />
            营业时间
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flower" className="mt-4">
          <section className="ui-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
              <div>
                <h2 className="text-base font-semibold tracking-tight">花材库</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  商品详情会展示已选花材，规格中可填写每种花材的枝数；长按花材行即可拖动排序。
                </p>
              </div>
              <Button size="sm" onClick={() => setFlowerEditor({ open: true, material: null })}>
                <Plus className="h-3.5 w-3.5" />
                新增花材
              </Button>
            </div>
            {flowers.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : flowers.isError ? (
              <ErrorState
                compact
                className="m-4"
                description="花材列表加载失败。"
                onRetry={() => void flowers.refetch()}
              />
            ) : (flowers.data?.length ?? 0) === 0 ? (
              <EmptyState
                className="m-4"
                icon={Flower2}
                title="还没有花材"
                description="先添加玫瑰、尤加利等常用花材。"
                bare
              />
            ) : (
              <ul data-sortable-group="flower" className="divide-y divide-border/60">
                {flowerSort.items.map((material) => {
                  const image = resolveImageUrl(material.imageUrl);
                  return (
                    <motion.li
                      key={material.id}
                      layout="position"
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 520, damping: 38, mass: 0.6 }
                      }
                      data-sortable-id={material.id}
                      {...flowerSort.getItemProps(material.id)}
                      title="长按整行拖动排序；聚焦后可用方向键调整"
                      className={cn(
                        "flex cursor-grab touch-none flex-wrap items-center gap-3 px-5 py-3.5 outline-none transition-[background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-primary/30",
                        flowerSort.pressingId === material.id && "bg-accent/40",
                        flowerSort.draggingId === material.id &&
                          "relative z-10 cursor-grabbing bg-primary/[0.06] shadow-md ring-1 ring-primary/20",
                      )}
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={material.name}
                          className="h-11 w-11 shrink-0 rounded-xl border border-border/60 object-cover"
                        />
                      ) : (
                        <span
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60"
                          style={{ background: material.colorHex || "#d8c7b8" }}
                        >
                          <Flower2 className="h-4 w-4 text-white/70" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{material.name}</span>
                          {material.latinName ? (
                            <span className="text-[11px] text-muted-foreground italic">
                              {material.latinName}
                            </span>
                          ) : null}
                          {!material.enabled ? <Badge variant="secondary">已停用</Badge> : null}
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {material.note || "暂无说明"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="编辑花材"
                          onClick={() => setFlowerEditor({ open: true, material })}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="删除花材"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeletingFlower(material)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </section>
        </TabsContent>

        <TabsContent value="wrap" className="mt-4">
          <section className="ui-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
              <div>
                <h2 className="text-base font-semibold tracking-tight">包装色系</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  商品详情展示所有启用色系，下单时随商品写入规格快照；长按色系卡片即可拖动排序。
                </p>
              </div>
              <Button size="sm" onClick={() => setWrapEditor({ open: true, color: null })}>
                <Plus className="h-3.5 w-3.5" />
                新增色系
              </Button>
            </div>
            {wraps.isLoading ? (
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full" />
                ))}
              </div>
            ) : wraps.isError ? (
              <ErrorState
                compact
                className="m-4"
                description="包装色系列表加载失败。"
                onRetry={() => void wraps.refetch()}
              />
            ) : (wraps.data?.length ?? 0) === 0 ? (
              <EmptyState
                className="m-4"
                icon={Palette}
                title="还没有包装色系"
                description="添加雾面米白、墨黑等常用包装色。"
                bare
              />
            ) : (
              <div data-sortable-group="wrap" className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {wrapSort.items.map((color) => (
                  <motion.article
                    key={color.id}
                    layout="position"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 520, damping: 38, mass: 0.6 }
                    }
                    data-sortable-id={color.id}
                    {...wrapSort.getItemProps(color.id)}
                    title="长按整张卡片拖动排序；聚焦后可用方向键调整"
                    className={cn(
                      "flex cursor-grab touch-none items-start gap-3 rounded-xl border border-border/60 p-4 outline-none transition-[border-color,background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-primary/30",
                      wrapSort.pressingId === color.id && "border-primary/30 bg-accent/40",
                      wrapSort.draggingId === color.id &&
                        "relative z-10 cursor-grabbing border-primary/40 bg-primary/[0.06] shadow-md ring-1 ring-primary/20",
                    )}
                  >
                    <span
                      className="h-12 w-12 shrink-0 rounded-full"
                      style={{
                        background: color.hex,
                        boxShadow: `inset 0 0 0 1px ${color.ringHex || color.hex}`,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{color.name}</span>
                        {!color.enabled ? <Badge variant="secondary">已停用</Badge> : null}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {color.description || "暂无说明"}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground tabular">
                        {color.hex}
                        {color.ringHex ? ` / ${color.ringHex}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="编辑包装色系"
                        onClick={() => setWrapEditor({ open: true, color })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="删除包装色系"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletingWrap(color)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="hour" className="mt-4">
          <div className="space-y-4">
            <StorePhoneEditor
              profile={storeProfile.data}
              loading={storeProfile.isLoading}
              error={storeProfile.isError}
              onRetry={() => void storeProfile.refetch()}
            />
            <BusinessHoursEditor
              hours={hours.data}
              loading={hours.isLoading}
              error={hours.isError}
              onRetry={() => void hours.refetch()}
            />
          </div>
        </TabsContent>
      </Tabs>

      <FlowerMaterialDialog
        open={flowerEditor.open}
        material={flowerEditor.material}
        onOpenChange={(open) => setFlowerEditor({ open, material: open ? flowerEditor.material : null })}
        onSaved={invalidateCatalog}
      />
      <WrapColorDialog
        open={wrapEditor.open}
        color={wrapEditor.color}
        onOpenChange={(open) => setWrapEditor({ open, color: open ? wrapEditor.color : null })}
        onSaved={invalidateCatalog}
      />
      <ConfirmDialog
        open={Boolean(deletingFlower)}
        title="删除花材"
        description={`确定删除「${deletingFlower?.name ?? ""}」吗？已被商品使用的花材无法删除。`}
        confirmText="删除"
        destructive
        loading={deleteFlowerMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setDeletingFlower(null);
        }}
        onConfirm={() => {
          if (deletingFlower) deleteFlowerMutation.mutate(deletingFlower.id);
        }}
      />
      <ConfirmDialog
        open={Boolean(deletingWrap)}
        title="删除包装色系"
        description={`确定删除「${deletingWrap?.name ?? ""}」吗？已被购物车或订单使用的色系无法删除。`}
        confirmText="删除"
        destructive
        loading={deleteWrapMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setDeletingWrap(null);
        }}
        onConfirm={() => {
          if (deletingWrap) deleteWrapMutation.mutate(deletingWrap.id);
        }}
      />
    </div>
  );
}

function FlowerMaterialDialog({
  open,
  material,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  material: FlowerMaterialVO | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FlowerFormState>(emptyFlowerForm);

  useEffect(() => {
    if (!open) return;
    setForm(
      material
        ? {
            name: material.name,
            latinName: material.latinName ?? "",
            note: material.note ?? "",
            colorHex: material.colorHex ?? "#c96b7a",
            imageUrl: material.imageUrl ?? "",
            enabled: material.enabled,
            sortOrder: String(material.sortOrder ?? 0),
          }
        : emptyFlowerForm,
    );
  }, [open, material]);

  const mutation = useMutation({
    mutationFn: () => {
      const body: FlowerMaterialSaveRequest = {
        name: form.name.trim(),
        latinName: form.latinName.trim() || undefined,
        note: form.note.trim() || undefined,
        colorHex: /^#[0-9a-fA-F]{6}$/.test(form.colorHex) ? form.colorHex : undefined,
        imageUrl: form.imageUrl || undefined,
        enabled: form.enabled ? 1 : 0,
        sortOrder: material?.sortOrder,
      };
      return material
        ? adminService.updateFlowerMaterial(material.id, body)
        : adminService.createFlowerMaterial(body);
    },
    onSuccess: () => {
      toast.success(material ? "花材已更新" : "花材已创建");
      onSaved();
      onOpenChange(false);
    },
    onError: (error) => toast.error("保存花材失败", getErrorMessage(error)),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={material ? "编辑花材" : "新增花材"}
      description="花材名称需保持唯一，停用后不影响历史订单与规格。"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            size="sm"
            loading={mutation.isPending}
            disabled={!form.name.trim()}
            onClick={() => mutation.mutate()}
          >
            保存
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>花材图片</Label>
          <div className="flex flex-wrap items-center gap-4">
            <ImageUpload
              value={form.imageUrl}
              onChange={(url) => setForm((current) => ({ ...current, imageUrl: url }))}
              category="flower"
              cropAspect={1}
              className="h-28 w-28"
              actionLabel="上传花材图片"
              title="上传并裁剪花材图片"
            />
            <div className="max-w-xs text-[11px] leading-5 text-muted-foreground">
              <p>上传后会进入正方形裁剪，可拖动和缩放。</p>
              <p className="mt-1">建议使用干净背景的单枝花材特写，商品详情会按规格展示。</p>
            </div>
          </div>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="flower-name">花材名称 *</Label>
          <Input
            id="flower-name"
            value={form.name}
            maxLength={50}
            placeholder="例如：粉荔枝玫瑰"
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="flower-latin">拉丁学名</Label>
          <Input
            id="flower-latin"
            value={form.latinName}
            maxLength={80}
            placeholder="Rosa 'Lychee'"
            onChange={(event) =>
              setForm((current) => ({ ...current, latinName: event.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="flower-color">代表色</Label>
          <div className="flex gap-2">
            <input
              id="flower-color-picker"
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(form.colorHex) ? form.colorHex : "#c96b7a"}
              onChange={(event) =>
                setForm((current) => ({ ...current, colorHex: event.target.value }))
              }
              className="h-9 w-10 cursor-pointer rounded-md border border-border bg-transparent p-1"
              aria-label="选择花材代表色"
            />
            <Input
              id="flower-color"
              value={form.colorHex}
              maxLength={7}
              onChange={(event) =>
                setForm((current) => ({ ...current, colorHex: event.target.value }))
              }
            />
          </div>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="flower-note">花材说明</Label>
          <Textarea
            id="flower-note"
            value={form.note}
            maxLength={200}
            rows={3}
            placeholder="花头尺寸、香气、开放度等"
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
          />
        </div>
        <div className="flex items-end justify-between gap-3 pb-1 sm:col-span-2">
          <div>
            <Label>启用</Label>
            <p className="mt-1 text-[11px] text-muted-foreground">停用后商品详情不再展示</p>
          </div>
          <Switch
            checked={form.enabled}
            onCheckedChange={(enabled) => setForm((current) => ({ ...current, enabled }))}
            label="启用花材"
          />
        </div>
      </div>
    </Dialog>
  );
}

function WrapColorDialog({
  open,
  color,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  color: WrapColorVO | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<WrapFormState>(emptyWrapForm);

  useEffect(() => {
    if (!open) return;
    setForm(
      color
        ? {
            name: color.name,
            hex: color.hex,
            ringHex: color.ringHex ?? "",
            description: color.description ?? "",
            enabled: color.enabled,
            sortOrder: String(color.sortOrder ?? 0),
          }
        : emptyWrapForm,
    );
  }, [open, color]);

  const mutation = useMutation({
    mutationFn: () => {
      const body: WrapColorSaveRequest = {
        name: form.name.trim(),
        hex: form.hex,
        ringHex: form.ringHex || undefined,
        description: form.description.trim() || undefined,
        enabled: form.enabled ? 1 : 0,
        sortOrder: color?.sortOrder,
      };
      return color
        ? adminService.updateWrapColor(color.id, body)
        : adminService.createWrapColor(body);
    },
    onSuccess: () => {
      toast.success(color ? "包装色系已更新" : "包装色系已创建");
      onSaved();
      onOpenChange(false);
    },
    onError: (error) => toast.error("保存包装色系失败", getErrorMessage(error)),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={color ? "编辑包装色系" : "新增包装色系"}
      description="主色与描边色用于商品详情色板展示，名称需保持唯一。"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            size="sm"
            loading={mutation.isPending}
            disabled={!form.name.trim() || !/^#[0-9a-fA-F]{6}$/.test(form.hex)}
            onClick={() => mutation.mutate()}
          >
            保存
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="wrap-name">色系名称 *</Label>
          <Input
            id="wrap-name"
            value={form.name}
            maxLength={50}
            placeholder="例如：雾面米白"
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>主色 *</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(form.hex) ? form.hex : "#ece7db"}
              onChange={(event) => setForm((current) => ({ ...current, hex: event.target.value }))}
              className="h-9 w-10 cursor-pointer rounded-md border border-border bg-transparent p-1"
              aria-label="选择包装主色"
            />
            <Input
              value={form.hex}
              maxLength={7}
              onChange={(event) => setForm((current) => ({ ...current, hex: event.target.value }))}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>描边色</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(form.ringHex) ? form.ringHex : "#cbc2ae"}
              onChange={(event) =>
                setForm((current) => ({ ...current, ringHex: event.target.value }))
              }
              className="h-9 w-10 cursor-pointer rounded-md border border-border bg-transparent p-1"
              aria-label="选择包装描边色"
            />
            <Input
              value={form.ringHex}
              maxLength={7}
              placeholder="可选"
              onChange={(event) =>
                setForm((current) => ({ ...current, ringHex: event.target.value }))
              }
            />
          </div>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="wrap-description">包装说明</Label>
          <Textarea
            id="wrap-description"
            value={form.description}
            maxLength={200}
            rows={3}
            placeholder="哑光、缎带、质感等"
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
          />
        </div>
        <div className="flex items-end justify-between gap-3 pb-1 sm:col-span-2">
          <div>
            <Label>启用</Label>
            <p className="mt-1 text-[11px] text-muted-foreground">停用后商品详情不再展示</p>
          </div>
          <Switch
            checked={form.enabled}
            onCheckedChange={(enabled) => setForm((current) => ({ ...current, enabled }))}
            label="启用包装色系"
          />
        </div>
      </div>
    </Dialog>
  );
}

function StorePhoneEditor({
  profile,
  loading,
  error,
  onRetry,
}: {
  profile?: StoreProfileVO;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (profile) setPhone(profile.businessPhone);
  }, [profile]);

  const trimmed = phone.trim();
  const valid = /^[0-9+()\-\s]{5,30}$/.test(trimmed);
  const dirty = Boolean(profile) && trimmed !== profile?.businessPhone;

  const mutation = useMutation({
    mutationFn: () => adminService.saveStoreProfile({ businessPhone: trimmed }),
    onSuccess: (saved) => {
      setPhone(saved.businessPhone);
      toast.success("营业电话已保存");
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminStoreProfile });
      void queryClient.invalidateQueries({ queryKey: queryKeys.storeProfile });
    },
    onError: (error) => toast.error("保存营业电话失败", getErrorMessage(error)),
  });

  if (loading) {
    return (
      <div className="ui-card space-y-3 p-5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-full max-w-sm" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        className="ui-card p-4"
        description="营业电话加载失败。"
        onRetry={onRetry}
      />
    );
  }

  return (
    <section className="ui-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <Phone className="h-4 w-4 text-primary" />
            门店营业电话
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            营业电话会展示在商品详情页脚，方便顾客咨询花礼与配送。
          </p>
        </div>
        <Button
          size="sm"
          loading={mutation.isPending}
          disabled={!dirty || !valid}
          onClick={() => mutation.mutate()}
        >
          <Save className="h-3.5 w-3.5" />
          保存营业电话
        </Button>
      </div>
      <div className="max-w-md px-5 py-4">
        <div className="space-y-1.5">
          <Label htmlFor="business-phone">营业电话</Label>
          <Input
            id="business-phone"
            value={phone}
            maxLength={30}
            inputMode="tel"
            placeholder="400-820-1024"
            aria-invalid={!valid && phone.length > 0}
            onChange={(event) => setPhone(event.target.value)}
          />
          <p
            className={cn(
              "text-[11px]",
              valid ? "text-muted-foreground" : "text-destructive",
            )}
          >
            支持数字、空格、+、-、括号，5–30 个字符。
          </p>
        </div>
      </div>
    </section>
  );
}

function BusinessHoursEditor({
  hours,
  loading,
  error,
  onRetry,
}: {
  hours?: BusinessHourVO[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<BusinessHourVO[]>([]);
  const [editingHour, setEditingHour] = useState<BusinessHourVO | null>(null);

  useEffect(() => {
    if (!hours) return;
    const sorted = [...hours].sort((left, right) => left.dayOfWeek - right.dayOfWeek);
    setDraft(sorted);
  }, [hours]);

  const dirty = useMemo(() => {
    if (!hours) return false;
    return JSON.stringify(draft) !== JSON.stringify([...hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek));
  }, [draft, hours]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload: BusinessHourSaveRequest[] = draft.map((hour) => ({
        dayOfWeek: hour.dayOfWeek,
        openTime: hour.openTime,
        closeTime: hour.closeTime,
        enabled: hour.enabled ? 1 : 0,
        note: hour.note?.trim() || undefined,
      }));
      return adminService.saveBusinessHours({ hours: payload });
    },
    onSuccess: () => {
      toast.success("营业时间已保存");
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminBusinessHours });
      void queryClient.invalidateQueries({ queryKey: queryKeys.businessHours });
    },
    onError: (error) => toast.error("保存营业时间失败", getErrorMessage(error)),
  });

  const updateRow = (dayOfWeek: number, patch: Partial<BusinessHourVO>) => {
    setDraft((current) =>
      current.map((hour) => (hour.dayOfWeek === dayOfWeek ? { ...hour, ...patch } : hour)),
    );
  };

  if (loading) {
    return (
      <div className="ui-card space-y-2 p-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        className="ui-card p-4"
        description="营业时间加载失败。"
        onRetry={onRetry}
      />
    );
  }

  return (
    <section className="ui-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
        <div>
          <h2 className="text-base font-semibold tracking-tight">门店营业时间</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            结算页按营业时间生成可选送达时刻，至少提前 1 小时、最多 6 天内预约。
          </p>
        </div>
        <Button
          size="sm"
          loading={mutation.isPending}
          disabled={!dirty || draft.length === 0}
          onClick={() => mutation.mutate()}
        >
          <Save className="h-3.5 w-3.5" />
          保存营业时间
        </Button>
      </div>
      <div className="divide-y divide-border/60">
        {draft.map((hour) => (
          <div
            key={hour.dayOfWeek}
            className={cn(
              "grid items-center gap-3 px-5 py-3 sm:grid-cols-[80px_auto_1.3fr_0.8fr_1.4fr]",
              !hour.enabled && "opacity-60",
            )}
          >
            <span className="text-sm font-medium">{WEEKDAY_LABELS[hour.dayOfWeek - 1]}</span>
            <Switch
              checked={hour.enabled}
              onCheckedChange={(enabled) => updateRow(hour.dayOfWeek, { enabled })}
              label={`${WEEKDAY_LABELS[hour.dayOfWeek - 1]}营业`}
            />
            <button
              type="button"
              onClick={() => setEditingHour(hour)}
              aria-label={`${WEEKDAY_LABELS[hour.dayOfWeek - 1]}营业时间`}
              className="flex min-h-9 items-center gap-2 rounded-lg border border-border/70 bg-card px-3 text-sm tabular transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
              {hour.openTime}
              <span className="text-muted-foreground">至</span>
              {hour.closeTime}
            </button>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className={cn("h-1.5 w-1.5 rounded-full", hour.enabled ? "bg-success" : "bg-muted-foreground/40")} />
              {hour.enabled ? "营业中" : "休息日"}
            </div>
            <Input
              value={hour.note ?? ""}
              maxLength={100}
              placeholder="备注，例如：节假日延长营业"
              onChange={(event) => updateRow(hour.dayOfWeek, { note: event.target.value })}
            />
          </div>
        ))}
      </div>

      <BusinessHourTimeDialog
        hour={editingHour}
        onOpenChange={(open) => {
          if (!open) setEditingHour(null);
        }}
        onSave={(openTime, closeTime) => {
          if (!editingHour) return;
          updateRow(editingHour.dayOfWeek, { openTime, closeTime });
          setEditingHour(null);
        }}
      />
    </section>
  );
}

function parseTimeParts(value: string): { hour: number; minute: number } {
  const [hourPart, minutePart] = value.split(":").map(Number);
  return {
    hour: Number.isFinite(hourPart) ? Math.min(23, Math.max(0, hourPart)) : 9,
    minute: Number.isFinite(minutePart) ? Math.min(59, Math.max(0, minutePart)) : 0,
  };
}

function formatTimeParts(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => index);
const MINUTE_OPTIONS = [0, 15, 30, 45];

function BusinessHourTimeDialog({
  hour,
  onOpenChange,
  onSave,
}: {
  hour: BusinessHourVO | null;
  onOpenChange: (open: boolean) => void;
  onSave: (openTime: string, closeTime: string) => void;
}) {
  const open = parseTimeParts(hour?.openTime ?? "09:00");
  const close = parseTimeParts(hour?.closeTime ?? "21:00");
  const [openHour, setOpenHour] = useState(open.hour);
  const [openMinute, setOpenMinute] = useState(open.minute);
  const [closeHour, setCloseHour] = useState(close.hour);
  const [closeMinute, setCloseMinute] = useState(close.minute);

  useEffect(() => {
    if (!hour) return;
    const nextOpen = parseTimeParts(hour.openTime);
    const nextClose = parseTimeParts(hour.closeTime);
    setOpenHour(nextOpen.hour);
    setOpenMinute(nextOpen.minute);
    setCloseHour(nextClose.hour);
    setCloseMinute(nextClose.minute);
  }, [hour]);

  const openTotal = openHour * 60 + openMinute;
  const closeTotal = closeHour * 60 + closeMinute;
  const invalid = closeTotal <= openTotal;

  return (
    <Dialog
      open={Boolean(hour)}
      onOpenChange={onOpenChange}
      title={hour ? `${WEEKDAY_LABELS[hour.dayOfWeek - 1]}营业时间` : "营业时间"}
      description="使用滚轮选择开门与关门时间，保存后应用到送达时段。"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            size="sm"
            disabled={invalid}
            onClick={() =>
              onSave(formatTimeParts(openHour, openMinute), formatTimeParts(closeHour, closeMinute))
            }
          >
            应用
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>开门时间</Label>
            <span className="text-sm font-semibold tabular">
              {formatTimeParts(openHour, openMinute)}
            </span>
          </div>
          <TimeWheelPicker
            hour={openHour}
            minute={openMinute}
            hours={HOUR_OPTIONS}
            minutes={MINUTE_OPTIONS}
            onHourChange={setOpenHour}
            onMinuteChange={setOpenMinute}
            hourLabel="开门小时"
            minuteLabel="开门分钟"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>关门时间</Label>
            <span className="text-sm font-semibold tabular">
              {formatTimeParts(closeHour, closeMinute)}
            </span>
          </div>
          <TimeWheelPicker
            hour={closeHour}
            minute={closeMinute}
            hours={HOUR_OPTIONS}
            minutes={MINUTE_OPTIONS}
            onHourChange={setCloseHour}
            onMinuteChange={setCloseMinute}
            hourLabel="关门小时"
            minuteLabel="关门分钟"
          />
        </div>
      </div>
      {invalid ? (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          关门时间需要晚于开门时间。
        </p>
      ) : (
        <p className="mt-3 text-[11px] text-muted-foreground">
          当前营业时段：{formatTimeParts(openHour, openMinute)} - {formatTimeParts(closeHour, closeMinute)}
        </p>
      )}
    </Dialog>
  );
}
