import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  RefreshCw,
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
  AiConversationDetail,
  AiConversationMessage,
  AiPromptTagBundle,
} from "@/types/api";
import { ChatOutlineNav, type ChatOutlineItem } from "@/components/domain/chat-outline-nav";
import { MarkdownMessage } from "@/components/domain/markdown-message";
import { ProductImage } from "@/components/domain/product-image";
import { Price } from "@/components/domain/price";
import { StemLoader } from "@/components/domain/stem-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import {
  DropdownItem,
  DropdownMenu,
  DropdownSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_PROMPTS = [
  "送女朋友纪念日，预算 200 元，推荐什么花？",
  "妈妈生日想送一束温柔一点的花？",
  "办公室桌面适合养什么绿植？",
  "玫瑰收到后怎么养护才能开得更久？",
];

const EMPTY_STATE_INTROS = [
  {
    title: "今天想挑什么花？",
    description:
      "告诉我收花人、场合和预算，我会结合真实在售花礼、花语和养护知识帮你挑选。",
  },
  {
    title: "想为谁送上一束心意？",
    description:
      "说说是送恋人、家人还是朋友，再告诉我预算和场合，我来帮你挑到合适的花。",
  },
  {
    title: "不知道送什么花？",
    description:
      "把收花人、想表达的心意和预算告诉我，我从真实在售的花礼里帮你选一束。",
  },
  {
    title: "想找一束刚刚好的花？",
    description:
      "告诉我送给谁、什么时候送、预算多少，我会兼顾花语、配色和养护给出建议。",
  },
  {
    title: "让花替你说话吧。",
    description:
      "说说收花人和想传达的情感，我会结合真实花材、花语与养护知识为你搭配。",
  },
  {
    title: "今天想用花表达什么？",
    description:
      "无论是生日、纪念日还是日常惊喜，告诉我对象和预算，我来帮你选花。",
  },
  {
    title: "从一束花开始心意。",
    description:
      "告诉我收花人、场合和预算，我会推荐正在售卖的花礼，并附上花语和养护小贴士。",
  },
  {
    title: "需要一束花，但还没头绪？",
    description:
      "把收花人、预算和想营造的氛围告诉我，我会从在售花礼中挑出几款给你参考。",
  },
  {
    title: "想送花，却不知道从哪挑？",
    description:
      "告诉我送给谁、什么场合、预算多少，我会结合真实在售花礼与花语帮你缩小选择。",
  },
  {
    title: "一束花的灵感，从这里开始。",
    description:
      "说说收花人和使用场景，再定一个预算，我来帮你找到合适的花礼。",
  },
];

function pickEmptyStateIntro(previous?: number) {
  if (EMPTY_STATE_INTROS.length <= 1) return 0;
  if (previous == null) {
    return Math.floor(Math.random() * EMPTY_STATE_INTROS.length);
  }
  const next = Math.floor(Math.random() * (EMPTY_STATE_INTROS.length - 1));
  return next >= previous ? next + 1 : next;
}

const NEW_CHAT_KEY = "new";
const EMPTY_CHAT_MESSAGES: ChatMessage[] = [];

function chatStoreKey(conversationId: number) {
  return `conversation:${conversationId}`;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: AiChatProduct[];
  citations?: AiChatCitation[];
  suggestedQuestions?: string[];
  usage?: AiChatUsage;
  model?: string;
  degraded?: boolean;
  error?: string;
  pending?: boolean;
  startedAt?: number;
  status?: string;
}

interface PromptCandidate {
  text: string;
  group: "scene" | "audience" | "need" | "fallback";
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number) {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (nth - 1) * 7);
}

function upcomingFestival(now = new Date()): string | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const events: Array<{ label: string; date: Date }> = [];
  for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
    events.push(
      { label: "情人节", date: new Date(year, 1, 14) },
      { label: "母亲节", date: nthWeekdayOfMonth(year, 4, 0, 2) },
      { label: "520", date: new Date(year, 4, 20) },
      { label: "教师节", date: new Date(year, 8, 10) },
      { label: "国庆节", date: new Date(year, 9, 1) },
      { label: "圣诞节", date: new Date(year, 11, 25) },
    );
  }
  for (const event of events) {
    const diff = Math.round(
      (event.date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (diff >= 0 && diff <= 7) {
      return event.label;
    }
  }
  return null;
}

function buildPromptCandidates(bundle?: AiPromptTagBundle): PromptCandidate[] {
  const festival = upcomingFestival();
  const scenes = [...(festival ? [festival] : []), ...(bundle?.scenes ?? [])];
  const audiences = bundle?.audiences ?? [];
  const needs = bundle?.needs ?? [];
  const candidates: PromptCandidate[] = [];
  scenes.forEach((scene) => {
    candidates.push({ text: `${scene}送什么花比较合适？`, group: "scene" });
    candidates.push({ text: `${scene}花束怎么搭配更有氛围？`, group: "scene" });
  });
  audiences.forEach((audience) => {
    candidates.push({ text: `${audience}，推荐什么花？`, group: "audience" });
    candidates.push({ text: `${audience}预算 200 元怎么搭配？`, group: "audience" });
  });
  needs.forEach((need) => {
    candidates.push({ text: `想要${need}的花，有什么推荐？`, group: "need" });
    candidates.push({ text: `预算 200 元，${need}怎么选？`, group: "need" });
  });
  return candidates;
}

function pickPromptTexts(candidates: PromptCandidate[]): string[] {
  const unique = new Map<string, PromptCandidate>();
  candidates.forEach((candidate) => unique.set(candidate.text, candidate));
  if (unique.size < 4) {
    return DEFAULT_PROMPTS;
  }
  const selected: string[] = [];
  const take = (group: PromptCandidate["group"], limit: number) => {
    let taken = 0;
    const pool = shuffle([...unique.values()].filter((item) => item.group === group));
    for (const item of pool) {
      if (selected.length >= 4 || taken >= limit) break;
      if (selected.includes(item.text)) continue;
      selected.push(item.text);
      taken += 1;
    }
  };
  take("scene", 2);
  take("audience", 1);
  take("need", 1);
  if (selected.length < 4) {
    const rest = shuffle([...unique.values()]);
    for (const item of rest) {
      if (selected.length >= 4) break;
      if (!selected.includes(item.text)) selected.push(item.text);
    }
  }
  return selected;
}

function buildNewPrompts(bundle?: AiPromptTagBundle): string[] {
  const prompts = pickPromptTexts(buildPromptCandidates(bundle));
  return prompts.length >= 4 ? prompts.slice(0, 4) : DEFAULT_PROMPTS;
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
    suggestedQuestions: message.suggestedQuestions,
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
  const [messageStores, setMessageStores] = useState<
    Record<string, ChatMessage[]>
  >({});
  const [streamingKeys, setStreamingKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [input, setInput] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<number[] | null>(null);
  const [renameTarget, setRenameTarget] = useState<AiConversation | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [activeOutlineId, setActiveOutlineId] = useState<string | null>(null);
  const [promptNonce, setPromptNonce] = useState(0);
  const [emptyStateIntroIndex, setEmptyStateIntroIndex] = useState(() =>
    pickEmptyStateIntro(),
  );
  const emptyStateIntro =
    EMPTY_STATE_INTROS[emptyStateIntroIndex] ?? EMPTY_STATE_INTROS[0];
  const activeKey = activeId == null ? NEW_CHAT_KEY : chatStoreKey(activeId);
  const messages = messageStores[activeKey] ?? EMPTY_CHAT_MESSAGES;
  const sending = streamingKeys.has(activeKey);
  const activeIdRef = useRef<number | null>(null);
  const streamsRef = useRef(new Map<string, AbortController>());
  const localKeysRef = useRef(new Set<string>());
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageRefs = useRef(new Map<string, HTMLDivElement>());

  const conversationDetailKey = (id: number) =>
    [...queryKeys.aiConversation(id), userKey] as const;

  const conversationsQuery = useQuery({
    queryKey: [...queryKeys.aiConversations, userKey],
    queryFn: aiService.conversations,
    staleTime: 15_000,
  });

  const promptTagsQuery = useQuery({
    queryKey: queryKeys.aiPromptTags,
    queryFn: aiService.promptTags,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const detailQuery = useQuery({
    queryKey: conversationDetailKey(activeId ?? 0),
    queryFn: () => aiService.conversation(activeId as number),
    enabled:
      activeId != null && !streamingKeys.has(chatStoreKey(activeId)),
  });

  const conversations = useMemo(
    () => conversationsQuery.data ?? [],
    [conversationsQuery.data],
  );
  const groups = useMemo(() => groupConversations(conversations), [conversations]);
  const outlineItems = useMemo<ChatOutlineItem[]>(
    () =>
      messages
        .filter((message) => message.role === "user")
        .map((message) => ({ id: message.id, content: message.content })),
    [messages],
  );
  const outlineKey = useMemo(
    () => outlineItems.map((item) => item.id).join("|"),
    [outlineItems],
  );
  const outlineRef = useRef<ChatOutlineItem[]>(outlineItems);
  const newPrompts = useMemo(() => {
    void promptNonce;
    return buildNewPrompts(promptTagsQuery.data);
  }, [promptTagsQuery.data, promptNonce]);
  const lastAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant"),
    [messages],
  );
  const followUpPrompts = lastAssistantMessage?.suggestedQuestions ?? [];
  const quickPrompts = followUpPrompts.length > 0 ? followUpPrompts : newPrompts;
  const canShufflePrompts = messages.length === 0;
  const showQuickPrompts =
    !sending && input.trim().length === 0 && quickPrompts.length > 0;

  useEffect(() => {
    outlineRef.current = outlineItems;
  }, [outlineItems]);

  useEffect(() => {
    const items = outlineRef.current;
    if (items.length === 0) {
      setActiveOutlineId(null);
      return;
    }
    setActiveOutlineId(items[items.length - 1].id);
  }, [outlineKey]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const items = outlineRef.current;
      if (items.length === 0) return;
      const containerTop = container.getBoundingClientRect().top;
      let current = items[0].id;
      for (const item of items) {
        const node = messageRefs.current.get(item.id);
        if (node && node.getBoundingClientRect().top - containerTop <= 64) {
          current = item.id;
        }
      }
      setActiveOutlineId(current);
    };
    const onScroll = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(update);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  useLayoutEffect(() => {
    if (activeId == null) return;
    const key = chatStoreKey(activeId);
    if (streamingKeys.has(key) || localKeysRef.current.has(key)) return;
    const detail = detailQuery.data;
    if (!detail || detail.conversation.id !== activeId) return;
    setMessageStores((previous) => ({
      ...previous,
      [key]: detail.messages.map(toChatMessage),
    }));
  }, [activeId, detailQuery.data, streamingKeys]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    const streams = streamsRef.current;
    return () => {
      streams.forEach((controller) => controller.abort());
      streams.clear();
    };
  }, []);

  const setActiveConversation = (id: number | null) => {
    activeIdRef.current = id;
    setActiveId(id);
  };

  const updateMessage = (
    key: string,
    id: string,
    updater: (message: ChatMessage) => ChatMessage,
  ) => {
    setMessageStores((previous) => {
      const current = previous[key];
      if (!current) return previous;
      let changed = false;
      const next = current.map((message) => {
        if (message.id !== id) return message;
        changed = true;
        return updater(message);
      });
      return changed ? { ...previous, [key]: next } : previous;
    });
  };

  const markStreaming = (key: string, active: boolean) => {
    setStreamingKeys((previous) => {
      if (active === previous.has(key)) return previous;
      const next = new Set(previous);
      if (active) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const cancelStream = (key: string) => {
    const controller = streamsRef.current.get(key);
    if (!controller) return;
    streamsRef.current.delete(key);
    controller.abort();
    markStreaming(key, false);
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
      startedAt: Date.now(),
    };
    let streamKey = activeKey;
    setMessageStores((previous) => ({
      ...previous,
      [streamKey]: [
        ...(previous[streamKey] ?? []),
        userMessage,
        assistantMessage,
      ],
    }));
    localKeysRef.current.add(streamKey);
    setInput("");

    const controller = new AbortController();
    streamsRef.current.set(streamKey, controller);
    markStreaming(streamKey, true);
    let conversationId = activeId;
    try {
      if (conversationId == null) {
        const created = await aiService.createConversation();
        conversationId = created.id;
        if (controller.signal.aborted) {
          throw new DOMException("已停止生成", "AbortError");
        }
        const createdKey = chatStoreKey(created.id);
        setMessageStores((previous) => {
          const current = previous[streamKey];
          if (!current) return previous;
          const next = { ...previous };
          delete next[streamKey];
          next[createdKey] = current;
          return next;
        });
        localKeysRef.current.delete(streamKey);
        localKeysRef.current.add(createdKey);
        const activeController = streamsRef.current.get(streamKey);
        if (activeController) {
          streamsRef.current.delete(streamKey);
          streamsRef.current.set(createdKey, activeController);
        }
        setStreamingKeys((previous) => {
          if (!previous.has(streamKey)) return previous;
          const next = new Set(previous);
          next.delete(streamKey);
          next.add(createdKey);
          return next;
        });
        streamKey = createdKey;
        if (activeIdRef.current === null) {
          setActiveConversation(created.id);
        }
        void queryClient.invalidateQueries({ queryKey: queryKeys.aiConversations });
      }
      await aiService.chat(
        { message: text, scene: "chat", conversationId },
        {
          onMeta: (meta) => {
            updateMessage(streamKey, assistantId, (message) => ({
              ...message,
              degraded: Boolean(meta.degraded),
              model: meta.model,
            }));
          },
          onDelta: (delta) => {
            updateMessage(streamKey, assistantId, (message) => ({
              ...message,
              content: message.content + delta,
              pending: false,
            }));
          },
          onProducts: (products) => {
            updateMessage(streamKey, assistantId, (message) => ({
              ...message,
              products,
            }));
          },
          onCitations: (citations) => {
            updateMessage(streamKey, assistantId, (message) => ({
              ...message,
              citations,
            }));
          },
          onSuggestions: (questions) => {
            updateMessage(streamKey, assistantId, (message) => ({
              ...message,
              suggestedQuestions: questions,
            }));
          },
          onUsage: (usage) => {
            updateMessage(streamKey, assistantId, (message) => ({
              ...message,
              usage,
              model: usage.model ?? message.model,
            }));
          },
          onError: (message) => {
            updateMessage(streamKey, assistantId, (current) => ({
              ...current,
              error: message,
              pending: false,
            }));
          },
          onDone: () => {
            updateMessage(streamKey, assistantId, (message) => ({
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
        updateMessage(streamKey, assistantId, (message) => ({
          ...message,
          pending: false,
          content: message.content || "已停止生成。",
        }));
        if (conversationId != null) invalidateConversations(conversationId);
      } else {
        updateMessage(streamKey, assistantId, (message) => ({
          ...message,
          pending: false,
          error: getErrorMessage(error),
        }));
      }
    } finally {
      if (streamsRef.current.get(streamKey) === controller) {
        streamsRef.current.delete(streamKey);
      }
      if (!streamsRef.current.has(streamKey)) {
        markStreaming(streamKey, false);
      }
    }
  };

  const stop = () => {
    cancelStream(activeKey);
  };

  const startNewChat = () => {
    if (activeId == null && sending) return;
    setActiveConversation(null);
    setInput("");
    setPromptNonce((value) => value + 1);
    setEmptyStateIntroIndex((previous) => pickEmptyStateIntro(previous));
    setSelectionMode(false);
    setSelectedIds(new Set());
    setMessageStores((previous) => {
      if (!(NEW_CHAT_KEY in previous)) return previous;
      const next = { ...previous };
      delete next[NEW_CHAT_KEY];
      return next;
    });
    localKeysRef.current.delete(NEW_CHAT_KEY);
  };

  const applyPrompt = (prompt: string) => {
    setInput(prompt);
    window.requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(prompt.length, prompt.length);
    });
  };

  const jumpToMessage = (id: string) => {
    setActiveOutlineId(id);
    const container = scrollContainerRef.current;
    const node = messageRefs.current.get(id);
    if (!container || !node) return;
    const top =
      node.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      16;
    container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  };

  const selectConversation = (id: number) => {
    if (selectionMode) {
      toggleSelected(id);
      return;
    }
    if (id === activeId) {
      if (
        !localKeysRef.current.has(chatStoreKey(id)) &&
        detailQuery.data?.conversation.id !== id &&
        !detailQuery.isFetching
      ) {
        void detailQuery.refetch();
      }
      return;
    }
    const cached = queryClient.getQueryData<AiConversationDetail>(
      conversationDetailKey(id),
    );
    setActiveConversation(id);
    const key = chatStoreKey(id);
    setMessageStores((previous) => {
      if (previous[key]) return previous;
      if (!cached || cached.conversation.id !== id) return previous;
      return { ...previous, [key]: cached.messages.map(toChatMessage) };
    });
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
    mutationFn: async (ids: number[]) => {
      ids.forEach((id) => cancelStream(chatStoreKey(id)));
      return ids.length === 1
        ? aiService.deleteConversation(ids[0])
        : aiService.batchDeleteConversations(ids);
    },
    onSuccess: (_data, ids) => {
      const keys = new Set(ids.map(chatStoreKey));
      setMessageStores((previous) => {
        const next = { ...previous };
        keys.forEach((key) => delete next[key]);
        return next;
      });
      keys.forEach((key) => localKeysRef.current.delete(key));
      if (activeId != null && ids.includes(activeId)) {
        setActiveConversation(null);
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

  const conversationReady =
    activeId == null ||
    messageStores[activeKey] != null ||
    detailQuery.data?.conversation.id === activeId ||
    streamingKeys.has(activeKey);
  const conversationLoading =
    activeId != null && !conversationReady && !detailQuery.isError;
  const conversationLoadError =
    activeId != null &&
    !conversationReady &&
    detailQuery.isError &&
    !detailQuery.isFetching;

  return (
    <div className="grid min-h-0 gap-4 lg:h-[calc(100dvh-7rem)] lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="ui-card flex min-h-0 flex-col overflow-hidden lg:h-full">
        <div className="space-y-2 border-b border-border/60 p-3">
          <Button
            className="w-full justify-start"
            onClick={startNewChat}
            disabled={activeId == null && sending}
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
                        onClick={(event) => {
                          if (selectionMode) return;
                          if (
                            (event.target as HTMLElement).closest(
                              "button, input, [role='menu']",
                            )
                          ) {
                            return;
                          }
                          selectConversation(conversation.id);
                        }}
                        className={cn(
                          "group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
                          !selectionMode && "cursor-pointer",
                          active
                            ? "bg-primary/10 text-primary hover:bg-primary/10"
                            : "hover:bg-accent/70",
                          selectionMode && checked && "bg-primary/10",
                        )}
                      >
                        {selectionMode ? (
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            aria-label={`选择对话：${conversation.title}`}
                            onClick={() => toggleSelected(conversation.id)}
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                              checked
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary/60",
                            )}
                          >
                            {checked ? (
                              <Check className="h-2.5 w-2.5" strokeWidth={3} />
                            ) : null}
                          </button>
                        ) : (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                            {conversation.pinned ? (
                              <Pin className="h-3 w-3 text-primary" />
                            ) : null}
                          </span>
                        )}
                        <button
                          type="button"
                          data-conversation-id={conversation.id}
                          onClick={() => selectConversation(conversation.id)}
                          className="min-w-0 flex-1 truncate text-left text-[13px]"
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
              {activeConversation?.title || "AI 花艺师"}
            </h1>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              选花、搭配、养护，一站式花艺解答
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

        <div className="relative min-h-0 flex-1 [container-type:size]">
          <div
            ref={scrollContainerRef}
            className={cn(
              "h-full overflow-y-auto px-4 py-5 md:pl-6",
              outlineItems.length > 0
                ? "md:pr-[calc(3.5rem_+_2px)]"
                : "md:pr-6",
            )}
          >
            {messages.length === 0 ? (
              conversationLoadError ? (
                <div className="flex h-full min-h-[380px] flex-col items-center justify-center gap-3 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                    <AlertCircle className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">对话加载失败</p>
                    <p className="mt-1 max-w-md text-xs text-muted-foreground">
                      {getErrorMessage(detailQuery.error)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void detailQuery.refetch()}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    重新加载
                  </Button>
                </div>
              ) : conversationLoading ? (
                <div
                  className="flex h-full min-h-[380px] flex-col items-center justify-center gap-3 text-center"
                  aria-busy="true"
                >
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                  <p className="text-xs text-muted-foreground">正在加载对话…</p>
                </div>
              ) : (
                <div className="flex h-full min-h-[380px] flex-col items-center justify-center text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Sparkles className="h-6 w-6" />
                  </span>
                  <h2 className="mt-4 text-xl font-semibold tracking-tight">
                    {emptyStateIntro.title}
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    {emptyStateIntro.description}
                  </p>
                  <p className="mt-4 text-[11px] text-muted-foreground/80">
                    从下方快捷提问开始，或直接输入你的需求。
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-5">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    ref={(node) => {
                      if (node) {
                        messageRefs.current.set(message.id, node);
                      } else {
                        messageRefs.current.delete(message.id);
                      }
                    }}
                  >
                    <ChatBubble message={message} isAdmin={isAdmin} />
                  </div>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <ChatOutlineNav
            items={outlineItems}
            activeId={activeOutlineId}
            onSelect={jumpToMessage}
          />
        </div>

        <div className="border-t border-border/60 bg-card/95 px-4 py-4 md:px-6">
          <div
            className={cn(
              "grid transition-all duration-200 ease-out",
              showQuickPrompts
                ? "grid-rows-[1fr] opacity-100"
                : "pointer-events-none grid-rows-[0fr] opacity-0",
            )}
            aria-hidden={!showQuickPrompts}
            inert={!showQuickPrompts}
          >
            <div className="overflow-hidden">
              <div className="mb-2 flex items-start gap-2">
                <span className="mt-1.5 shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  快捷提问
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => applyPrompt(prompt)}
                      className="max-w-full truncate rounded-full border border-border/70 bg-card px-3 py-1.5 text-left text-[11px] leading-relaxed text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                      title={prompt}
                    >
                      {prompt}
                    </button>
                  ))}
                  {canShufflePrompts ? (
                    <button
                      type="button"
                      onClick={() => setPromptNonce((value) => value + 1)}
                      className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/80 px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      aria-label="换一换"
                      title="换一换"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      换一换
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
          >
            <Textarea
              ref={textareaRef}
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
              aria-label="向 AI 花艺师提问"
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
    return <UserBubble message={message} />;
  }

  return <AssistantBubble message={message} isAdmin={isAdmin} />;
}

function UserBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("已复制");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("复制失败", "请手动选择文本复制。");
    }
  };

  return (
    <div className="group flex justify-end">
      <div className="flex max-w-[85%] flex-col items-end">
        <div className="rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground">
          {message.content}
        </div>
        <div className="pointer-events-none mt-2 flex h-5 translate-y-0.5 items-center gap-2 pr-0.5 opacity-0 transition-all duration-200 ease-out group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => void copy()}
            aria-label="复制这条消息"
            title="复制"
            className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
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
  const fallbackStartRef = useRef(Date.now());
  const waiting = Boolean(message.pending) && !message.content;
  const avatar = (
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Sparkles className="h-4 w-4" />
    </span>
  );

  const copy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("已复制");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("复制失败", "请手动选择文本复制。");
    }
  };

  if (waiting) {
    return (
      <div className="flex items-start gap-2.5">
        {avatar}
        <div className="min-w-0 flex-1">
          <StemLoader startedAt={message.startedAt ?? fallbackStartRef.current} />
        </div>
      </div>
    );
  }

  return (
    <div className="group/assistant flex items-start gap-2.5">
      {avatar}
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="rounded-2xl rounded-tl-md border border-border/60 bg-muted/35 px-4 py-3 text-sm leading-relaxed">
          {message.content ? (
            <MarkdownMessage content={message.content} />
          ) : (
            "已停止生成。"
          )}
          {message.pending && message.content ? (
            <span
              aria-hidden="true"
              className="mt-1.5 block h-1 w-6 animate-pulse rounded-full bg-primary/70"
            />
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
          {message.content ? (
            <button
              type="button"
              onClick={() => void copy()}
              aria-label="复制这条回复"
              title="复制"
              className="pointer-events-none flex h-5 w-5 shrink-0 translate-y-0.5 items-center justify-center rounded-md text-muted-foreground/70 opacity-0 transition-all duration-200 ease-out group-hover/assistant:pointer-events-auto group-hover/assistant:translate-y-0 group-hover/assistant:opacity-100 group-focus-within/assistant:pointer-events-auto group-focus-within/assistant:translate-y-0 group-focus-within/assistant:opacity-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          ) : null}
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
