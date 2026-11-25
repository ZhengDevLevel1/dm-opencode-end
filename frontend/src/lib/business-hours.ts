import type { BusinessHourVO } from "@/types/api";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})$/;

export const WEEKDAY_OPTIONS = [
  { dayOfWeek: 1, label: "周一" },
  { dayOfWeek: 2, label: "周二" },
  { dayOfWeek: 3, label: "周三" },
  { dayOfWeek: 4, label: "周四" },
  { dayOfWeek: 5, label: "周五" },
  { dayOfWeek: 6, label: "周六" },
  { dayOfWeek: 7, label: "周日" },
];

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseDateKey(value: string): Date | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null;
  }
  return date;
}

export function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

export function isoDayOfWeek(date: Date): number {
  return date.getDay() === 0 ? 7 : date.getDay();
}

export function timeToMinutes(value: string): number {
  const match = TIME_PATTERN.exec(value);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesToTime(total: number): string {
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

export function businessHourFor(date: Date, hours: BusinessHourVO[]): BusinessHourVO | null {
  const target = isoDayOfWeek(date);
  return hours.find((hour) => hour.dayOfWeek === target) ?? null;
}

export function deliveryWindowError(
  dateKey: string,
  time: string,
  hours: BusinessHourVO[],
  now = new Date(),
): string | null {
  const date = parseDateKey(dateKey);
  if (!date) return "请选择送达日期";
  if (!TIME_PATTERN.test(time)) return "请选择送达时间";
  const [hourPart, minutePart] = time.split(":").map(Number);
  const deliveryAt = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hourPart,
    minutePart,
  );
  if (deliveryAt.getTime() < now.getTime() + 60 * 60 * 1000) {
    return "请至少提前 1 小时预约送达时间";
  }
  if (deliveryAt.getTime() > now.getTime() + 30 * 24 * 60 * 60 * 1000) {
    return "最多支持预约 30 天内的送达时间";
  }
  const businessHour = businessHourFor(date, hours);
  if (!businessHour || !businessHour.enabled) {
    return "所选日期门店休息，请选择其他送达日期";
  }
  const minutes = hourPart * 60 + minutePart;
  if (
    minutes < timeToMinutes(businessHour.openTime) ||
    minutes > timeToMinutes(businessHour.closeTime)
  ) {
    return `送达时间需在营业时间 ${businessHour.openTime}-${businessHour.closeTime} 内`;
  }
  return null;
}

export function deliverySlotOptions(
  dateKey: string,
  hours: BusinessHourVO[],
  now = new Date(),
  stepMinutes = 30,
): string[] {
  const date = parseDateKey(dateKey);
  if (!date) return [];
  const businessHour = businessHourFor(date, hours);
  if (!businessHour || !businessHour.enabled) return [];
  const start = timeToMinutes(businessHour.openTime);
  const end = timeToMinutes(businessHour.closeTime);
  const slots: string[] = [];
  for (let minutes = start; minutes <= end; minutes += Math.max(1, stepMinutes)) {
    const slot = minutesToTime(minutes);
    if (!deliveryWindowError(dateKey, slot, hours, now)) {
      slots.push(slot);
    }
  }
  return slots;
}

export function defaultDeliverySelection(
  hours: BusinessHourVO[],
  now = new Date(),
): { date: string; time: string } {
  for (let offset = 0; offset <= 30; offset += 1) {
    const date = addDays(now, offset);
    const dateKey = formatDateKey(date);
    const first = deliverySlotOptions(dateKey, hours, now)[0];
    if (first) return { date: dateKey, time: first };
  }
  return { date: formatDateKey(now), time: "" };
}

export function toDeliveryAt(dateKey: string, time: string): string {
  return `${dateKey}T${time}:00`;
}

export function formatDeliveryAt(value?: string): string {
  if (!value) return "";
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) return value;
  const [year, month, day] = datePart.split("-");
  return `${year}年${Number(month)}月${Number(day)}日 ${timePart.slice(0, 5)}`;
}
