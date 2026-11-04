import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";

export function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTime(value?: string | null): string {
  const date = toDate(value);
  return date ? format(date, "yyyy-MM-dd HH:mm") : "—";
}

export function formatDateTimeFull(value?: string | null): string {
  const date = toDate(value);
  return date ? format(date, "yyyy-MM-dd HH:mm:ss") : "—";
}

export function formatDate(value?: string | null): string {
  const date = toDate(value);
  return date ? format(date, "yyyy-MM-dd") : "—";
}

export function formatDateFriendly(value?: string | null): string {
  const date = toDate(value);
  return date ? format(date, "M月d日 EEEE", { locale: zhCN }) : "—";
}

export function formatRelative(value?: string | null): string {
  const date = toDate(value);
  if (!date) return "—";
  return `${formatDistanceToNowStrict(date, { locale: zhCN, addSuffix: true })}`;
}

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "¥0.00";
  return currencyFormatter.format(value);
}

export function formatMoney(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "0.00";
  return Number(value).toFixed(2);
}

export function formatNumber(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "0";
  return new Intl.NumberFormat("zh-CN").format(value);
}

export function formatPercent(value?: number | null, digits = 1): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "0%";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatRating(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "0.0";
  return Number(value).toFixed(1);
}

export function maskPhone(phone?: string | null): string {
  if (!phone) return "—";
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
}

export function splitTags(tags?: string | null): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function shortOrderNo(orderNo?: string | null): string {
  if (!orderNo) return "—";
  return orderNo;
}

export function toIsoDateTime(value: string): string {
  if (!value) return "";
  return value.length === 16 ? `${value}:00` : value;
}

export function normalizePercentInput(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

export function formatScore(value?: number | null): string {
  if (value === undefined || value === null) return "0%";
  return `${Math.round(value * 100)}%`;
}
