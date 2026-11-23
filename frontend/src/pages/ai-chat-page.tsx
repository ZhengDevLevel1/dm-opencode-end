import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  Copy,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Send,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { aiService } from "@/lib/services";
import { getErrorMessage } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/cn";
import { toast } from "@/stores/toast";
import { useAuthStore } from "@/stores/auth";
import type {
  AiChatCitation,
  AiChatProduct,
  AiChatUsage,
  AiConversation,
  AiConversationMessage,
} from "@/types/api";
import { ProductImage } from "@/components/domain/product-image";
import { Price } from "@/components/domain/price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import {
  DropdownItem,
  DropdownMenu,
  DropdownSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const SUGGESTIONS = [
  "送女朋友纪念日，预算 200 元，推荐什么花？",
  "妈妈生日想送一束温柔一点的花。",
  "办公室桌面适合养什么绿植？",
  "玫瑰收到后怎么养护才能开得更久？",
];

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: AiChatProduct[];
  citations?: AiChatCitation[];
  usage?: AiChatUsage;
  model?: string;
  degraded?: boolean;
  error?: string;
  pending?: boolean;
  status?: string;
}

interface ConversationGroup {
  label: string;
  items: AiConversation[];
}

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function conversationTime(conversation: AiConversation) {
  const value = Date.parse(
    conversation.lastMessageAt ?? conversation.updatedAt ?? conversation.createdAt,
  );
  return Number.isFinite(value) ? value : 0;
}

function startOfDay(value: number) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function groupConversations(conversations: AiConversation[]): ConversationGroup[] {
  const pinned = conversations
    .filter((conversation) => conversation.pinned)
    .sort((a, b) => conversationTime(b) - conversationTime(a));
  const rest = conversations
    .filter((conversation) => !conversation.pinned)
    .sort((a, b) => conversationTime(b) - conversationTime(a));

  const today = startOfDay(Date.now());
  const buckets = new Map<string, AiConversation[]>();
  const day = 24 * 60 * 60 * 1000;

  rest.forEach((conversation) => {
    const value = conversationTime(conversation);
    const diff = Math.floor((today - startOfDay(value)) / day);
    let label: string;
    if (diff <= 0) {
      label = "今天";
    } else if (diff === 1) {
      label = "昨天";
    } else if (diff <= 7) {
      label = "过去 7 天";
    } else if (diff <= 30) {
      label = "过去 30 天";
    } else {
      const date = new Date(value);
      label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }
    const items = buckets.get(label) ?? [];
    items.push(conversation);
    buckets.set(label, items);
  });

  const groups: ConversationGroup[] = [];
  if (pinned.length > 0) {
    groups.push({ label: "置顶", items: pinned });
  }
  buckets.forEach((items, label) => groups.push({ label, items }));
  return groups;
}

function toChatMessage(message: AiConversationMessage): ChatMessage {
  return {
    id: `db-${message.id}`,
    role: message.role,
    content: message.content,
    products: message.products,
    citations: message.citations,
    usage: message.usage,
    model: message.model,
    degraded: message.degraded,
    status: message.status,
  };
}

export function AiChatPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "ADMIN";
  const userKey = user?.id ?? "guest";
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<number[] | null>(null);
  const [renameTarget, setRenameTarget] = useState<AiConversation | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const conversationsQuery = useQuery({
    queryKey: [...queryKeys.aiConversations, userKey],
    queryFn: aiService.conversations,
    staleTime: 15_000,
  });

  const detailQuery = useQuery({
    queryKey: [...queryKeys.aiConversation(activeId ?? 0), userKey],
    queryFn: () => aiService.conversation(activeId as number),
    enabled: activeId != null && !sending,
  });

  const conversations = useMemo(
    () => conversationsQuery.data ?? [],
    [conversationsQuery.data],
  );
  const groups = useMemo(() => groupConversations(conversations), [conversations]);

  useEffect(() => {
    if (activeId == null) {
      setMessages([]);
      return;
    }
    const detail = detailQuery.data;
    if (!detail || detail.conversation.id !== activeId) return;
    setMessages(detail.messages.map(toChatMessage));
  }, [activeId, detailQuery.data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const updateAssistant = (
    id: string,
    updater: (message: ChatMessage) => ChatMessage,
  ) => {
    setMessages((previous) =>
      previous.map((message) => (message.id === id ? updater(message) : message)),
    );
  };

  const invalidateConversations = (conversationId?: number) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.aiConversations });
    if (conversationId != null) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.aiConversation(conversationId),
      });
    }
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || sending) return;
    setSending(true);
    const userMessage: ChatMessage = {
      id: createId("user"),
      role: "user",
      content: text,
    };
    const assistantId = createId("assistant");
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      pending: true,
    };
    setMessages((previous) => [...previous, userMessage, assistantMessage]);
    setInput("");

    const controller = new AbortController();
    abortRef.current = controller;
    let conversationId = activeId;
    try {
      if (conversationId == null) {
        const created = await aiService.createConversation();
        conversationId = created.id;
        setActiveId(created.id);
        void queryClient.invalidateQueries({ queryKey: queryKeys.aiConversations });
      }
      await aiService.chat(
        { message: text, scene: "chat", conversationId },
        {
          onMeta: (meta) => {
            updateAssistant(assistantId, (message) => ({
              ...message,
              degraded: Boolean(meta.degraded),
              model: meta.model,
            }));
          },
          onDelta: (delta) => {
            updateAssistant(assistantId, (message) => ({
              ...message,
              content: message.content + delta,
              pending: false,
            }));
          },
          onProducts: (products) => {
            updateAssistant(assistantId, (message) => ({ ...message, products }));
          },
          onCitations: (citations) => {
            updateAssistant(assistantId, (message) => ({ ...message, citations }));
          },
          onUsage: (usage) => {
            updateAssistant(assistantId, (message) => ({
              ...message,
              usage,
              model: usage.model ?? message.model,
            }));
          },
          onError: (message) => {
            updateAssistant(assistantId, (current) => ({
              ...current,
              error: message,
              pending: false,
            }));
          },
          onDone: () => {
            updateAssistant(assistantId, (message) => ({
              ...message,
              pending: false,
            }));
          },
        },
        controller.signal,
      );
      if (conversationId != null) {
        const completedId = conversationId;
        invalidateConversations(completedId);
        window.setTimeout(() => invalidateConversations(completedId), 1500);
      } else {
        invalidateConversations();
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        updateAssistant(assistantId, (message) => ({
          ...message,
          pending: false,
          content: message.content || "已停止生成。",
        }));
      } else {
        updateAssistant(assistantId, (message) => ({
          ...message,
          pending: false,
          error: getErrorMessage(error),
        }));
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setSending(false);
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending(false);
  };

  const startNewChat = () => {
    if (sending) return;
    setActiveId(null);
    setMessages([]);
    setInput("");
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const selectConversation = (id: number) => {
    if (sending) return;
    if (selectionMode) {
      toggleSelected(id);
      return;
    }
    if (id === activeId) return;
    setActiveId(id);
    setMessages([]);
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) =>
      ids.length === 1
        ? aiService.deleteConversation(ids[0])
        : aiService.batchDeleteConversations(ids),
    onSuccess: (_data, ids) => {
      if (activeId != null && ids.includes(activeId)) {
        setActiveId(null);
        setMessages([]);
      }
      setPendingDelete(null);
      setSelectionMode(false);
      setSelectedIds(new Set());
      invalidateConversations();
      toast.success(ids.length > 1 ? "已删除所选对话" : "对话已删除");
    },
    onError: (error) => toast.error("删除失败", getErrorMessage(error)),
  });

  const pinMutation = useMutation({
    mutationFn: ({ ids, pinned }: { ids: number[]; pinned: boolean }) =>
      aiService.batchPinConversations(ids, pinned),
    onSuccess: (_data, { ids, pinned }) => {
      setSelectionMode(false);
      setSelectedIds(new Set());
      invalidateConversations();
      toast.success(pinned ? `已置顶 ${ids.length} 个对话` : "已取消置顶");
    },
    onError: (error) => toast.error("操作失败", getErrorMessage(error)),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: number; title: string }) =>
      aiService.renameConversation(id, title),
    onSuccess: (_data, { id }) => {
      setRenameTarget(null);
      invalidateConversations(id);
      toast.success("对话已重命名");
    },
    onError: (error) => toast.error("重命名失败", getErrorMessage(error)),
  });

  const openRename = (conversation: AiConversation) => {
    setRenameTarget(conversation);
    setRenameTitle(conversation.title);
  };

  const submitRename = () => {
    if (!renameTarget) return;
    const title = renameTitle.trim();
    if (!title) {
      toast.error("标题不能为空");
      return;
    }
    renameMutation.mutate({ id: renameTarget.id, title });
  };

  const confirmDelete = () => {
    if (pendingDelete) deleteMutation.mutate(pendingDelete);
  };

  const batchDelete = () => {
    if (selectedIds.size > 0) setPendingDelete([...selectedIds]);
  };

  const batchPin = () => {
    if (selectedIds.size > 0) {
      pinMutation.mutate({ ids: [...selectedIds], pinned: true });
    }
  };

  const togglePin = (conversation: AiConversation) => {
    pinMutation.mutate({ ids: [conversation.id], pinned: !conversation.pinned });
  };

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeId) ??
    (detailQuery.data?.conversation.id === activeId
      ? detailQuery.data.conversation
      : undefined);

  const loadingConversation =
    activeId != null && detailQuery.isLoading && messages.length === 0;

  return (
    <div className="grid min-h-0 gap-4 lg:h-[calc(100vh-9rem)] lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="ui-card flex min-h-0 flex-col overflow-hidden lg:h-full">
        <div className="space-y-2 border-b border-border/60 p-3">
          <Button
            className="w-full justify-start"
            onClick={startNewChat}
            disabled={sending}
          >
            <Plus className="h-4 w-4" />
            新建对话
          </Button>
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              历史对话
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectionMode((value) => !value);
                setSelectedIds(new Set());
              }}
              disabled={sending || conversations.length === 0}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40",
                selectionMode && "bg-accent text-foreground",
              )}
            >
              <ListChecks className="h-3.5 w-3.5" />
              多选
            </button>
          </div>
          {selectionMode ? (
            <div className="flex items-center justify-between gap-1 rounded-lg bg-muted/50 px-2 py-1.5">
              <span className="text-[11px] text-muted-foreground">
                已选 {selectedIds.size} 项
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  disabled={selectedIds.size === 0 || pinMutation.isPending}
                  onClick={batchPin}
                >
                  <Pin className="h-3 w-3" />
                  置顶
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                  disabled={selectedIds.size === 0 || deleteMutation.isPending}
                  onClick={batchDelete}
                >
                  <Trash2 className="h-3 w-3" />
                  删除
                </Button>
                <button
                  type="button"
                  aria-label="退出多选"
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedIds(new Set());
                  }}
                  className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {conversationsQuery.isLoading ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              正在加载对话…
            </p>
          ) : conversationsQuery.isError ? (
            <p className="px-2 py-6 text-center text-xs text-destructive">
              {getErrorMessage(conversationsQuery.error)}
            </p>
          ) : groups.length === 0 ? (
            <div className="px-3 py-10 text-center text-xs text-muted-foreground">
              还没有历史对话，问一个问题就会自动保存。
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="px-2 pb-1 text-[10px] font-medium tracking-wider text-muted-foreground/80">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((conversation) => {
                    const active =
                      !selectionMode && conversation.id === activeId;
                    const checked = selectedIds.has(conversation.id);
                    return (
                      <div
                        key={conversation.id}
                        className={cn(
                          "group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-accent/70",
                          selectionMode && checked && "bg-primary/10",
                        )}
                      >
                        {selectionMode ? (
                          <Checkbox
                            checked={checked}
                            onChange={() => toggleSelected(conversation.id)}
                            aria-label={`选择对话：${conversation.title}`}
                          />
                        ) : (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                            {conversation.pinned ? (
                              <Pin className="h-3 w-3 text-primary" />
                            ) : null}
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={sending && !selectionMode}
                          onClick={() => selectConversation(conversation.id)}
                          className="min-w-0 flex-1 truncate text-left text-[13px] disabled:cursor-not-allowed disabled:opacity-60"
                          title={conversation.title}
                        >
                          {conversation.title || "新的对话"}
                        </button>
                        {!selectionMode ? (
                          <DropdownMenu
                            trigger={<MoreHorizontal className="h-4 w-4" />}
                            triggerLabel={`对话操作：${conversation.title}`}
                            contentClassName="min-w-40"
                          >
                            <DropdownItem
                              disabled={sending || pinMutation.isPending}
                              onClick={() => togglePin(conversation)}
                            >
                              {conversation.pinned ? (
                                <PinOff className="h-3.5 w-3.5" />
                              ) : (
                                <Pin className="h-3.5 w-3.5" />
                              )}
                              {conversation.pinned ? "取消置顶" : "置顶"}
                            </DropdownItem>
                            <DropdownItem
                              disabled={sending || renameMutation.isPending}
                              onClick={() => openRename(conversation)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              重命名
                            </DropdownItem>
                            <DropdownSeparator />
                            <DropdownItem
                              destructive
                              disabled={sending || deleteMutation.isPending}
                              onClick={() => setPendingDelete([conversation.id])}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              删除
                            </DropdownItem>
                          </DropdownMenu>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      <section className="ui-card flex min-h-[560px] flex-col overflow-hidden lg:h-full lg:min-h-0">
        <header className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 md:px-6">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 truncate text-sm font-semibold">
              <Bot className="h-4 w-4 text-primary" />
              {activeConversation?.title || "AI 挑花顾问"}
            </h1>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              结合在售花礼、花语与养护知识回答，登录后会参考你的收藏与订单偏好。
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isAdmin ? (
              <Badge variant="outline" className="text-[10px]">
                管理员视图
              </Badge>
            ) : null}
            {sending ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                生成中
              </span>
            ) : null}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[380px] flex-col items-center justify-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-xl font-semibold tracking-tight">
                今天想挑什么花？
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                告诉我收花人、场合和预算，我会结合真实在售花礼、花语和养护知识帮你挑选。
              </p>
              <div className="mt-5 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={sending}
                    onClick={() => void send(suggestion)}
                    className="rounded-xl border border-border/70 bg-card px-3 py-2.5 text-left text-xs leading-relaxed text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {loadingConversation ? (
                <p className="text-center text-xs text-muted-foreground">
                  正在加载对话…
                </p>
              ) : null}
              {messages.map((message) => (
                <ChatBubble key={message.id} message={message} isAdmin={isAdmin} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border/60 bg-card/95 px-4 py-4 md:px-6">
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
          >
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
              rows={2}
              maxLength={500}
              placeholder="例如：送妈妈生日花束，预算 150 元，喜欢淡雅一点"
              className="min-h-[52px] resize-none text-sm"
              aria-label="向 AI 挑花顾问提问"
            />
            {sending ? (
              <Button type="button" variant="outline" onClick={stop} className="h-[52px]">
                <Square className="h-4 w-4" />
                停止
              </Button>
            ) : (
              <Button type="submit" disabled={!input.trim()} className="h-[52px]">
                <Send className="h-4 w-4" />
                发送
              </Button>
            )}
          </form>
          <p className="mt-2 text-[10px] text-muted-foreground">
            AI 推荐仅供挑选参考，库存与价格以商品详情页为准。
          </p>
        </div>
      </section>

      <ConfirmDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={pendingDelete && pendingDelete.length > 1 ? "删除所选对话" : "删除对话"}
        description={
          pendingDelete && pendingDelete.length > 1
            ? `将永久删除选中的 ${pendingDelete.length} 个对话及全部消息，删除后无法恢复。`
            : "将永久删除该对话及全部消息，删除后无法恢复。"
        }
        confirmText="删除"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />

      <Dialog
        open={renameTarget != null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        title="重命名对话"
        description="标题会显示在左侧历史对话中。"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setRenameTarget(null)}
              disabled={renameMutation.isPending}
            >
              取消
            </Button>
            <Button
              onClick={submitRename}
              loading={renameMutation.isPending}
              disabled={!renameTitle.trim()}
              data-autofocus
            >
              保存
            </Button>
          </>
        }
      >
        <Input
          value={renameTitle}
          onChange={(event) => setRenameTitle(event.target.value)}
          maxLength={60}
          placeholder="输入对话标题"
          aria-label="对话标题"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submitRename();
            }
          }}
        />
      </Dialog>
    </div>
  );
}

function ChatBubble({
  message,
  isAdmin,
}: {
  message: ChatMessage;
  isAdmin: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return <AssistantBubble message={message} isAdmin={isAdmin} />;
}

function AssistantBubble({
  message,
  isAdmin,
}: {
  message: ChatMessage;
  isAdmin: boolean;
}) {
  const [showProducts, setShowProducts] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("已复制回复");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("复制失败", "请手动选择文本复制。");
    }
  };

  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="rounded-2xl rounded-tl-md border border-border/60 bg-muted/35 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
          {message.content ||
            (message.pending ? "正在翻花谱、找合适的搭配…" : "已停止生成。")}
          {message.pending && message.content ? (
            <span className="ml-1 inline-block h-3.5 w-1.5 animate-pulse rounded-full bg-primary align-middle" />
          ) : null}
        </div>

        {message.error ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/[0.05] px-3 py-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {message.error}
          </div>
        ) : null}

        {message.products && message.products.length > 0 ? (
          <div className="rounded-xl border border-border/60 bg-card">
            <button
              type="button"
              onClick={() => setShowProducts((value) => !value)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              aria-expanded={showProducts}
            >
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                推荐商品 {message.products.length} 件
              </span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  showProducts && "rotate-180",
                )}
              />
            </button>
            {showProducts ? (
              <div className="grid gap-2 border-t border-border/60 p-2 sm:grid-cols-2">
                {message.products.slice(0, 6).map((product) => (
                  <Link
                    key={product.productId}
                    to={`/products/${product.productId}`}
                    className="group flex gap-3 rounded-xl border border-border/60 bg-card p-2.5 transition-colors hover:border-primary/40"
                  >
                    <ProductImage
                      alt={product.name}
                      seed={product.name}
                      className="h-20 w-20 shrink-0 rounded-lg"
                      iconClassName="h-7 w-7"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium group-hover:text-primary">
                        {product.name}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
                        {product.reason || product.category}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <Price amount={product.price} size="sm" />
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {isAdmin && message.citations && message.citations.length > 0 ? (
          <details className="rounded-lg border border-border/60 bg-card px-3 py-2">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              参考知识库 {message.citations.length} 条
            </summary>
            <div className="mt-2 space-y-2">
              {message.citations.map((citation) => (
                <div
                  key={citation.documentId}
                  className="rounded-md bg-muted/40 px-2.5 py-2 text-[11px]"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{citation.title}</span>
                    <Badge variant="outline" className="text-[9px]">
                      {citation.category}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-3 text-muted-foreground">
                    {citation.snippet}
                  </p>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void copy()}
            disabled={!message.content}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "已复制" : "复制"}
          </button>
          {message.degraded ? (
            <Badge variant="warning" className="text-[9px]">
              降级回答
            </Badge>
          ) : null}
          {message.status === "ABORTED" ? (
            <Badge variant="outline" className="text-[9px]">
              已停止
            </Badge>
          ) : null}
          {isAdmin && message.usage && message.usage.totalTokens > 0 ? (
            <span className="text-[10px] text-muted-foreground">
              {message.usage.totalTokens} tokens ·{" "}
              {formatCurrency(message.usage.estimatedCost)}
            </span>
          ) : null}
          {isAdmin && message.model ? (
            <span className="text-[10px] text-muted-foreground">{message.model}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
