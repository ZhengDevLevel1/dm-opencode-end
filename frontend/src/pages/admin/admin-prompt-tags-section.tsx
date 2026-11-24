import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus, Sparkles, X } from "lucide-react";
import { aiService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { toast } from "@/stores/toast";
import type {
  AiPromptTag,
  AiPromptTagBulkRequest,
  AiPromptTagCategory,
} from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const GROUPS: Array<{
  category: AiPromptTagCategory;
  label: string;
  description: string;
}> = [
  {
    category: "SCENE",
    label: "场景 / 节日",
    description: "生日、纪念日、季节与节日触发词",
  },
  {
    category: "AUDIENCE",
    label: "关系 / 人群",
    description: "送给谁，以及收花人的身份关系",
  },
  {
    category: "NEED",
    label: "诉求 / 痛点",
    description: "预算、风格、养护与使用诉求",
  },
];

type Drafts = Record<AiPromptTagCategory, string>;

const EMPTY_DRAFTS: Drafts = { SCENE: "", AUDIENCE: "", NEED: "" };

export function AdminPromptTagsSection() {
  const queryClient = useQueryClient();
  const tagsQuery = useQuery({
    queryKey: queryKeys.adminAiPromptTags,
    queryFn: aiService.adminPromptTags,
    staleTime: 30_000,
  });
  const [drafts, setDrafts] = useState<Drafts>(EMPTY_DRAFTS);
  const [editing, setEditing] = useState<AiPromptTag | null>(null);
  const [editWord, setEditWord] = useState("");
  const [deleting, setDeleting] = useState<AiPromptTag | null>(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [generateCategory, setGenerateCategory] = useState<AiPromptTagCategory>("SCENE");
  const [theme, setTheme] = useState("");
  const [generated, setGenerated] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [pendingReplace, setPendingReplace] = useState(false);

  const tags = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data]);
  const grouped = useMemo(() => {
    const map: Record<AiPromptTagCategory, AiPromptTag[]> = {
      SCENE: [],
      AUDIENCE: [],
      NEED: [],
    };
    tags.forEach((tag) => {
      if (map[tag.category]) {
        map[tag.category].push(tag);
      }
    });
    return map;
  }, [tags]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminAiPromptTags });
    void queryClient.invalidateQueries({ queryKey: queryKeys.aiPromptTags });
  };

  const createMutation = useMutation({
    mutationFn: aiService.createPromptTag,
    onSuccess: (_tag, body) => {
      setDrafts((previous) => ({ ...previous, [body.category]: "" }));
      invalidate();
      toast.success("标签已添加");
    },
    onError: (error) => toast.error("添加失败", getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, word }: { id: number; word: string }) =>
      aiService.updatePromptTag(id, {
        category: editing?.category ?? "SCENE",
        word,
      }),
    onSuccess: () => {
      setEditing(null);
      setEditWord("");
      invalidate();
      toast.success("标签已更新");
    },
    onError: (error) => toast.error("更新失败", getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: aiService.deletePromptTag,
    onSuccess: () => {
      setDeleting(null);
      invalidate();
      toast.success("标签已删除");
    },
    onError: (error) => toast.error("删除失败", getErrorMessage(error)),
  });

  const bulkMutation = useMutation({
    mutationFn: (body: AiPromptTagBulkRequest) => aiService.bulkPromptTags(body),
    onSuccess: () => {
      setGeneratorOpen(false);
      setGenerated([]);
      setSelectedWords(new Set());
      setPendingReplace(false);
      invalidate();
      toast.success("快捷提问标签已保存");
    },
    onError: (error) => toast.error("保存失败", getErrorMessage(error)),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      aiService.generatePromptTags({
        category: generateCategory,
        theme: theme.trim(),
      }),
    onSuccess: (result) => {
      setGenerated(result.words);
      setSelectedWords(new Set(result.words));
      setPendingReplace(false);
      if (result.degraded) {
        toast.info(
          "已使用内置候选词",
          result.fallbackReason ? "AI 服务暂不可用，可以继续手动勾选。" : undefined,
        );
      }
    },
    onError: (error) => toast.error("生成失败", getErrorMessage(error)),
  });

  const submitAdd = (category: AiPromptTagCategory) => {
    const word = drafts[category].trim();
    if (!word) return;
    createMutation.mutate({ category, word });
  };

  const openEditor = (tag: AiPromptTag) => {
    setEditing(tag);
    setEditWord(tag.word);
  };

  const openGenerator = (category?: AiPromptTagCategory) => {
    if (category) setGenerateCategory(category);
    setGenerated([]);
    setSelectedWords(new Set());
    setPendingReplace(false);
    setGeneratorOpen(true);
  };

  const toggleGenerated = (word: string) => {
    setSelectedWords((previous) => {
      const next = new Set(previous);
      if (next.has(word)) {
        next.delete(word);
      } else {
        next.add(word);
      }
      return next;
    });
    setPendingReplace(false);
  };

  const saveGenerated = (mode: "APPEND" | "REPLACE") => {
    const words = generated.filter((word) => selectedWords.has(word));
    if (words.length === 0) {
      toast.error("请至少选择一个标签");
      return;
    }
    if (mode === "REPLACE" && !pendingReplace) {
      setPendingReplace(true);
      return;
    }
    bulkMutation.mutate({ category: generateCategory, words, mode });
  };

  const changeGenerateCategory = (category: AiPromptTagCategory) => {
    setGenerateCategory(category);
    setGenerated([]);
    setSelectedWords(new Set());
    setPendingReplace(false);
  };

  return (
    <div className="space-y-4">
      <section className="ui-card p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">快捷提问标签</h2>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
              新对话会从三类标签中随机组合 4 条可编辑提示词；用户点击后只填入输入框，不会直接发送。
            </p>
          </div>
          <Button size="sm" onClick={() => openGenerator()}>
            <Sparkles className="h-3.5 w-3.5" />
            AI 生成标签
          </Button>
        </div>

        {tagsQuery.isLoading ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {GROUPS.map((group) => (
              <Skeleton key={group.category} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : tagsQuery.isError ? (
          <ErrorState
            className="mt-4"
            compact
            title="快捷提问标签加载失败"
            description={getErrorMessage(tagsQuery.error)}
            onRetry={() => void tagsQuery.refetch()}
          />
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {GROUPS.map((group) => {
              const groupTags = grouped[group.category];
              const adding =
                createMutation.isPending &&
                createMutation.variables?.category === group.category;
              return (
                <div
                  key={group.category}
                  className="flex min-h-56 flex-col rounded-xl border border-border/70 bg-card/50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-semibold">{group.label}</h3>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                        {group.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {groupTags.length}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-1 flex-wrap content-start gap-1.5">
                    {groupTags.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">
                        还没有标签，可在下方添加或使用 AI 生成。
                      </p>
                    ) : (
                      groupTags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-0.5 rounded-full border border-border/70 bg-background/70 py-1 pl-2.5 pr-1 text-[11px]"
                        >
                          <button
                            type="button"
                            onClick={() => openEditor(tag)}
                            className="max-w-36 truncate text-left transition-colors hover:text-primary"
                            title={`编辑 ${tag.word}`}
                          >
                            {tag.word}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(tag)}
                            className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`删除 ${tag.word}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  <form
                    className="mt-3 flex gap-1.5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitAdd(group.category);
                    }}
                  >
                    <Input
                      value={drafts[group.category]}
                      onChange={(event) =>
                        setDrafts((previous) => ({
                          ...previous,
                          [group.category]: event.target.value,
                        }))
                      }
                      placeholder="新增标签词"
                      maxLength={20}
                      className="h-8 text-xs"
                      aria-label={`${group.label}新增标签`}
                    />
                    <Button
                      type="submit"
                      size="icon-sm"
                      variant="outline"
                      loading={adding}
                      disabled={!drafts[group.category].trim()}
                      aria-label={`添加${group.label}标签`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Dialog
        open={editing != null}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setEditWord("");
          }
        }}
        title="编辑快捷提问标签"
        description="标签词会参与新对话提示词的随机组合。"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={updateMutation.isPending}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                if (editing) updateMutation.mutate({ id: editing.id, word: editWord.trim() });
              }}
              loading={updateMutation.isPending}
              disabled={!editWord.trim()}
            >
              保存
            </Button>
          </>
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="prompt-tag-edit">标签词</Label>
          <Input
            id="prompt-tag-edit"
            value={editWord}
            maxLength={20}
            data-autofocus
            onChange={(event) => setEditWord(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && editWord.trim()) {
                event.preventDefault();
                if (editing) updateMutation.mutate({ id: editing.id, word: editWord.trim() });
              }
            }}
          />
        </div>
      </Dialog>

      <Dialog
        open={generatorOpen}
        onOpenChange={(open) => {
          setGeneratorOpen(open);
          if (!open) {
            setGenerated([]);
            setSelectedWords(new Set());
            setPendingReplace(false);
          }
        }}
        title="AI 生成快捷提问标签"
        description="生成结果不会自动保存，确认勾选后再追加或替换对应分类。"
        size="md"
        footer={
          generated.length > 0 ? (
            <>
              <Button
                variant="ghost"
                onClick={() => setGeneratorOpen(false)}
                disabled={bulkMutation.isPending}
              >
                取消
              </Button>
              <Button
                variant="outline"
                onClick={() => saveGenerated("APPEND")}
                loading={bulkMutation.isPending}
              >
                追加选中
              </Button>
              <Button
                variant={pendingReplace ? "destructive" : "secondary"}
                onClick={() => saveGenerated("REPLACE")}
                loading={bulkMutation.isPending}
              >
                {pendingReplace ? "确认替换该分类" : "替换该分类"}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setGeneratorOpen(false)}>
              关闭
            </Button>
          )
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>标签分类</Label>
            <div className="flex flex-wrap gap-1.5">
              {GROUPS.map((group) => (
                <button
                  key={group.category}
                  type="button"
                  onClick={() => changeGenerateCategory(group.category)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors",
                    generateCategory === group.category
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/70 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                  )}
                >
                  {group.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prompt-tag-theme">主题或方向（可选）</Label>
            <div className="flex gap-2">
              <Input
                id="prompt-tag-theme"
                value={theme}
                maxLength={100}
                placeholder="例如：母亲节、学生党、预算 200 元"
                data-autofocus
                onChange={(event) => setTheme(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    generateMutation.mutate();
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={() => generateMutation.mutate()}
                loading={generateMutation.isPending}
              >
                <Sparkles className="h-3.5 w-3.5" />
                生成
              </Button>
            </div>
          </div>

          {generateMutation.isError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {getErrorMessage(generateMutation.error)}
            </p>
          ) : null}

          {generated.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>候选标签（{selectedWords.size}/{generated.length}）</Label>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedWords(new Set(generated))}
                  >
                    全选
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedWords(new Set())}>
                    清空
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {generated.map((word, index) => {
                  const selected = selectedWords.has(word);
                  return (
                    <button
                      key={`${word}-${index}`}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleGenerated(word)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                        selected
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/70 text-muted-foreground hover:border-primary/30",
                      )}
                    >
                      {word}
                    </button>
                  );
                })}
              </div>
              {pendingReplace ? (
                <p className="flex items-start gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[11px] text-warning">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  再次点击“确认替换该分类”会删除该分类现有
                  {grouped[generateCategory].length} 个标签，仅保留当前选中的词。
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              可按主题生成候选词，也可以关闭后在上方直接手动添加。
            </p>
          )}
        </div>
      </Dialog>

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="删除快捷提问标签"
        description={
          deleting
            ? `确定删除“${deleting.word}”吗？删除后将不再参与新对话提示词组合。`
            : "确定删除该标签吗？"
        }
        confirmText="删除"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id);
        }}
      />
    </div>
  );
}
