import { Badge, type BadgeVariant } from "@/components/ui/badge";
import type {
  FulfillmentNode,
  InventoryChangeType,
  OrderStatus,
  PaymentStatus,
  ReviewStatus,
  UserStatus,
} from "@/types/api";

export const orderStatusVariant: Record<OrderStatus, BadgeVariant> = {
  PENDING_PAYMENT: "warning",
  PAID: "default",
  FULFILLING: "default",
  COMPLETED: "success",
  CANCELLED: "secondary",
  AFTER_SALE: "warning",
  REFUNDED: "destructive",
};

const paymentStatusVariant: Record<PaymentStatus, BadgeVariant> = {
  PENDING: "warning",
  SUCCESS: "success",
  FAILED: "destructive",
  REFUNDED: "secondary",
};

const reviewStatusVariant: Record<ReviewStatus, BadgeVariant> = {
  VISIBLE: "success",
  HIDDEN: "secondary",
};

const userStatusVariant: Record<UserStatus, BadgeVariant> = {
  ENABLED: "success",
  DISABLED: "destructive",
};

export function OrderStatusBadge({
  status,
  label,
}: {
  status: OrderStatus;
  label: string;
}) {
  return <Badge variant={orderStatusVariant[status]}>{label}</Badge>;
}

export function PaymentStatusBadge({
  status,
  label,
}: {
  status: PaymentStatus;
  label: string;
}) {
  return <Badge variant={paymentStatusVariant[status]}>{label}</Badge>;
}

export function ReviewStatusBadge({
  status,
  label,
}: {
  status: ReviewStatus;
  label: string;
}) {
  return <Badge variant={reviewStatusVariant[status]}>{label}</Badge>;
}

export function UserStatusBadge({ status, label }: { status: UserStatus; label: string }) {
  return <Badge variant={userStatusVariant[status]}>{label}</Badge>;
}

export const fulfillmentNodeLabel: Record<FulfillmentNode, string> = {
  ACCEPTED: "接单",
  PREPARING: "备花",
  DELIVERING: "配送",
  SIGNED: "签收",
};

export const inventoryChangeLabel: Record<InventoryChangeType, string> = {
  STOCK_IN: "入库",
  ORDER_DEDUCT: "下单扣减",
  ORDER_CANCEL: "取消订单回补",
  MANUAL_ADJUST: "人工调整",
  AFTER_SALE_RESTORE: "售后退款回补",
};

export const inventoryChangeVariant: Record<InventoryChangeType, BadgeVariant> = {
  STOCK_IN: "success",
  ORDER_DEDUCT: "destructive",
  ORDER_CANCEL: "warning",
  MANUAL_ADJUST: "default",
  AFTER_SALE_RESTORE: "success",
};
