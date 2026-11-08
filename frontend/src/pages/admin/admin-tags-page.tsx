import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutGroup, motion } from "framer-motion";
import {
  CalendarDays,
  Check,
  Flower2,
  Heart,
  Pencil,
  Plus,
  SlidersHorizontal,
  Tag,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { adminService } from "@/lib/services";
import { cn } from "@/lib/cn";
import { toast } from "@/stores/toast";
import type { TagOptionVO, TagType } from "@/types/api";

const TYPE_META: Record<
  TagType,
  {
    key: "occasions" | "festivals" | "flowerMeanings";
    label: string;
    hint: string;
    icon: LucideIcon;
  }
> = {
  OCCASION: {
    key: "occasions",
    label: "场景标签",
    hint: "商品适合的使用场景，例如表白、生日、乔迁。",
    icon: Heart,
  },
  FESTIVAL: {
    key: "festivals",
    label: "节日标签",
    hint: "商品适合的节日节点，例如情人节、母亲节、春节。",
    icon: CalendarDays,
  },
  MEANING: {
    key: "flowerMeanings",
    label: "花语标签",
    hint: "商品表达的花语短句，参与推荐内容相似度计算。",
    icon: Flower2,
  },
};

export function AdminTagsPage() {
  const queryClient = useQueryClient();
  const [activeType, setActiveType] = useState<TagType>("OCCASION");
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagOptionVO | null>(null);
  const [maxCount, setMaxCount] = useState("8");

  const meta = TYPE_META[activeType];
  const overview = useQuery({
    queryKey: queryKeys.adminTags,
    queryFn: adminService.tagOverview,
  });
  const tags = overview.data?.[meta.key] ?? [];
  const currentMax = overview.data?.maxCounts?.[meta.key] ?? 8;

  useEffect(() => {
    setMaxCount(String(currentMax));
  }, [currentMax, activeType]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminTags });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dict });
  };

  const addMutation = useMutation({
    mutationFn: () => adminService.createTag(activeType, newName.trim()),
    onSuccess: () => {
      setNewName("");
      toast.success("标签已添加", `已加入${meta.label}。`);
      refresh();
    },
    onError: (error) => toast.error("添加标签失败", getErrorMessage(error)),
  });

  const renameMutation = useMutation({
    mutationFn: () => adminService.renameTag(editing!.id, editing!.name.trim()),
    onSuccess: () => {
      setEditing(null);
      toast.success("标签已更新");
      refresh();
    },
    onError: (error) => toast.error("更新标签失败", getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminService.deleteTag(id),
    onSuccess: () => {
      setDeleteTarget(null);
      toast.success("标签已删除");
      refresh();
    },
    onError: (error) => toast.error("删除标签失败", getErrorMessage(error)),
  });

  const maxMutation = useMutation({
    mutationFn: () => adminService.updateTagMaxCount(activeType, Number(maxCount)),
    onSuccess: () => {
      toast.success("上限已保存", `${meta.label}最多可选 ${maxCount} 个。`);
      refresh();
    },
    onError: (error) => toast.error("保存上限失败", getErrorMessage(error)),
  });

  const counts = useMemo(
    () => ({
      OCCASION: overview.data?.occasions.length ?? 0,
      FESTIVAL: overview.data?.festivals.length ?? 0,
      MEANING: overview.data?.flowerMeanings.length ?? 0,
    }),
    [overview.data],
  );

  const sendAdd = () => {
    const name = newName.trim();
    if (!name) {
      toast.info("请输入标签名称");
      return;
    }
    if (name.length > 30) {
      toast.info("标签名称不能超过 30 个字符");
      return;
    }
    addMutation.mutate();
  };

  const sendRename = () => {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) {
      toast.info("标签名称不能为空");
      return;
    }
    if (name.length > 30) {
      toast.info("标签名称不能超过 30 个字符");
      return;
    }
    renameMutation.mutate();
  };

  const maxInvalid =
    !/^\d+$/.test(maxCount) || Number(maxCount) < 1 || Number(maxCount) > 30;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">标签管理</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            维护商品可选的场景、节日与花语标签，并限制商品编辑时每类标签最多选择的个数。
          </p>
        </div>
        <TagTypeSwitch value={activeType} counts={counts} onChange={setActiveType} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="ui-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <meta.icon className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">{meta.label}</h2>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  {meta.hint}
                </p>
              </div>
            </div>
            <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
              共 {tags.length} 个
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input
              value={newName}
              maxLength={30}
              aria-label={`新增${meta.label}`}
              placeholder={`新增${meta.label}`}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  sendAdd();
                }
              }}
            />
            <Button
              type="button"
              className="shrink-0"
              loading={addMutation.isPending}
              onClick={sendAdd}
            >
              <Plus className="h-4 w-4" />
              添加
            </Button>
          </div>

          <div className="mt-5 border-t border-border/70 pt-4">
            {overview.isLoading ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-20 rounded-lg" />
                ))}
              </div>
            ) : overview.isError ? (
              <ErrorState
                description={getErrorMessage(overview.error)}
                onRetry={() => void overview.refetch()}
              />
            ) : tags.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                还没有{meta.label}，在上方输入名称添加第一个。
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <TagChip
                    key={tag.id}
                    tag={tag}
                    editing={editing}
                    onStartEdit={(target) => setEditing({ id: target.id, name: target.name })}
                    onEditName={(name) =>
                      setEditing((current) => (current ? { ...current, name } : current))
                    }
                    onCancelEdit={() => setEditing(null)}
                    onSaveEdit={sendRename}
                    saving={renameMutation.isPending}
                    onDelete={() => setDeleteTarget(tag)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="ui-card p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">最大可选数量</h2>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              商品编辑时，{meta.label}最多可以选择多少个。设置后前端选择器会阻止继续添加，后端保存时也会再次校验。
            </p>
            <div className="mt-4 flex items-end gap-2">
              <div className="space-y-1.5">
                <label htmlFor="tag-max-count" className="text-[11px] font-medium text-muted-foreground">
                  最多可选
                </label>
                <Input
                  id="tag-max-count"
                  type="number"
                  min={1}
                  max={30}
                  value={maxCount}
                  onChange={(event) => setMaxCount(event.target.value)}
                  className="w-24"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="mb-0"
                disabled={maxInvalid}
                loading={maxMutation.isPending}
                onClick={() => maxMutation.mutate()}
              >
                保存
              </Button>
            </div>
            <div className="mt-4 rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
              当前上限：<span className="font-semibold text-foreground">{currentMax}</span> 个。
              已选超过上限的旧商品不会被自动修改，再次编辑保存时需要先删到上限以内。
            </div>
          </section>

          <section className="ui-card p-4 text-[11px] leading-relaxed text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground">
              <Tag className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold">使用说明</span>
            </div>
            <ul className="mt-2 space-y-1.5">
              <li>· 新增、重命名、删除会立即同步到商品编辑与搜索下拉。</li>
              <li>· 删除标签不会清空商品里已经保存的旧值。</li>
              <li>· 花语标签会以「，」拼接保存，并参与推荐内容相似度计算。</li>
              <li>· 场景、节日标签会以「,」拼接保存，参与推荐场景与节日匹配。</li>
            </ul>
          </section>
        </aside>
      </div>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="删除标签"
        description="删除后，已经使用该标签的商品仍会保留原值。"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              删除
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          确定删除「<span className="font-medium text-foreground">{deleteTarget?.name}</span>」吗？
        </p>
      </Dialog>
    </div>
  );
}

function TagChip({
  tag,
  editing,
  onStartEdit,
  onEditName,
  onCancelEdit,
  onSaveEdit,
  saving,
  onDelete,
}: {
  tag: TagOptionVO;
  editing: { id: number; name: string } | null;
  onStartEdit: (tag: TagOptionVO) => void;
  onEditName: (name: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  saving: boolean;
  onDelete: () => void;
}) {
  const isEditing = editing?.id === tag.id;
  return (
    <div className="inline-flex max-w-full items-center gap-1 rounded-lg border border-border bg-muted/30 py-1 pr-1 pl-2.5">
      {isEditing ? (
        <>
          <Input
            autoFocus
            value={editing?.name ?? ""}
            maxLength={30}
            className="h-7 w-36 border-border bg-background px-2 text-xs"
            onChange={(event) => onEditName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onSaveEdit();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                onCancelEdit();
              }
            }}
          />
          <button
            type="button"
            aria-label="保存重命名"
            disabled={saving}
            onClick={onSaveEdit}
            className="rounded-md p-1 text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="取消重命名"
            onClick={onCancelEdit}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <>
          <span className="max-w-44 truncate text-xs font-medium">{tag.name}</span>
          <button
            type="button"
            aria-label={`编辑 ${tag.name}`}
            onClick={() => onStartEdit(tag)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            aria-label={`删除 ${tag.name}`}
            onClick={onDelete}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );
}

function TagTypeSwitch({
  value,
  counts,
  onChange,
}: {
  value: TagType;
  counts: Record<TagType, number>;
  onChange: (type: TagType) => void;
}) {
  const options: Array<{ value: TagType; label: string; icon: LucideIcon }> = [
    { value: "OCCASION", label: "场景标签", icon: Heart },
    { value: "FESTIVAL", label: "节日标签", icon: CalendarDays },
    { value: "MEANING", label: "花语标签", icon: Flower2 },
  ];

  return (
    <LayoutGroup id="admin-tag-type">
      <div
        className="flex rounded-lg border border-border bg-muted/40 p-0.5"
        role="group"
        aria-label="标签类型"
      >
        {options.map((option) => {
          const active = value === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "relative flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="admin-tag-type-pill"
                  className="absolute inset-0 rounded-md bg-card shadow-sm"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              ) : null}
              <span className="relative z-10 inline-flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {option.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                    active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {counts[option.value]}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
