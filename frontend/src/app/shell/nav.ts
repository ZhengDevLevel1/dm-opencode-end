import {
  Boxes,
  ClipboardList,
  Flower2,
  LayoutDashboard,
  MessageSquareText,
  MessagesSquare,
  PackageSearch,
  ReceiptText,
  ScrollText,
  Settings2,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Tags,
  UserRound,
  UsersRound,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/types/api";

export interface NavItem {
  label: string;
  description: string;
  to: string;
  icon: LucideIcon;
  roles?: UserRole[];
  auth?: boolean;
  match?: (pathname: string) => boolean;
  badge?: "cart" | "favorites" | "pending";
}

export type WorkbenchKey = "mall" | "staff" | "admin";

export interface NavGroup {
  label: string;
  items: NavItem[];
  workbench: WorkbenchKey;
  roles?: UserRole[];
  auth?: boolean;
}

export function resolveWorkbench(pathname: string): WorkbenchKey {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/staff")) return "staff";
  return "mall";
}

export interface WorkbenchLink {
  label: string;
  to: string;
  roles: UserRole[];
}

export const workbenches: WorkbenchLink[] = [
  { label: "商城", to: "/", roles: ["CUSTOMER", "STAFF", "ADMIN"] },
  { label: "履约", to: "/staff/orders", roles: ["STAFF", "ADMIN"] },
  { label: "管理", to: "/admin", roles: ["ADMIN"] },
];

export const navGroups: NavGroup[] = [
  {
    label: "花礼",
    workbench: "mall",
    items: [
      {
        label: "花礼首页",
        description: "当季花礼与推荐",
        to: "/",
        icon: Flower2,
      },
      {
        label: "全部花礼",
        description: "搜索、筛选与排序",
        to: "/products",
        icon: ShoppingBag,
        match: (path) => path === "/products",
      },
      {
        label: "智能推荐",
        description: "按当季与偏好推荐",
        to: "/recommendations",
        icon: Sparkles,
      },
    ],
  },
  {
    label: "我的账户",
    workbench: "mall",
    auth: true,
    items: [
      {
        label: "我的收藏",
        description: "遇到喜欢的花礼",
        to: "/favorites",
        icon: Flower2,
        badge: "favorites",
      },
      {
        label: "购物车",
        description: "待结算的花礼",
        to: "/cart",
        icon: ShoppingBag,
        badge: "cart",
      },
      {
        label: "我的订单",
        description: "支付、履约与售后",
        to: "/orders",
        icon: ReceiptText,
        match: (path) => path === "/orders" || /^\/orders\/\d+/.test(path) || path === "/checkout",
      },
      {
        label: "我的评价",
        description: "留下的花礼评价",
        to: "/reviews",
        icon: MessageSquareText,
      },
      {
        label: "个人中心",
        description: "资料与登录密码",
        to: "/profile",
        icon: UserRound,
      },
    ],
  },
  {
    label: "履约",
    workbench: "staff",
    roles: ["STAFF", "ADMIN"],
    items: [
      {
        label: "履约工作台",
        description: "接单、备花与配送",
        to: "/staff/orders",
        icon: ClipboardList,
        badge: "pending",
        match: (path) => path.startsWith("/staff/orders"),
      },
      {
        label: "库存管理",
        description: "库存流水与调整",
        to: "/staff/inventory",
        icon: Boxes,
      },
    ],
  },
  {
    label: "经营管理",
    workbench: "admin",
    roles: ["ADMIN"],
    items: [
      {
        label: "经营总览",
        description: "销售额与关键指标",
        to: "/admin",
        icon: LayoutDashboard,
        match: (path) => path === "/admin",
      },
      {
        label: "商品管理",
        description: "上架、编辑与库存",
        to: "/admin/products",
        icon: PackageSearch,
      },
      {
        label: "标签管理",
        description: "场景、节日与花语",
        to: "/admin/tags",
        icon: Tags,
      },
      {
        label: "指标配置",
        description: "价格带与库存分档",
        to: "/admin/metrics",
        icon: SlidersHorizontal,
      },
      {
        label: "用户管理",
        description: "账号、角色与状态",
        to: "/admin/users",
        icon: UsersRound,
      },
      {
        label: "评价管理",
        description: "显示、隐藏与回复",
        to: "/admin/reviews",
        icon: MessagesSquare,
      },
      {
        label: "推荐运营",
        description: "权重、日志与效果",
        to: "/admin/recommendations",
        icon: WandSparkles,
      },
      {
        label: "操作日志",
        description: "关键操作追溯",
        to: "/admin/logs",
        icon: ScrollText,
      },
    ],
  },
  {
    label: "偏好",
    workbench: "mall",
    auth: true,
    items: [
      {
        label: "外观与偏好",
        description: "主题、色板与密度",
        to: "/settings",
        icon: Settings2,
      },
    ],
  },
];

export function canSeeRole(role: UserRole | undefined, roles?: UserRole[]): boolean {
  if (!roles) return true;
  if (!role) return false;
  if (role === "ADMIN" && roles.includes("STAFF")) return true;
  return roles.includes(role);
}

export interface RouteMeta {
  title: string;
  description: string;
  icon: LucideIcon;
}

const staticMeta: Record<string, RouteMeta> = {
  "/": { title: "花礼首页", description: "清透的花艺工作室，挑一束当季花礼", icon: Flower2 },
  "/products": { title: "全部花礼", description: "按场景、节日与价格找到合适的花", icon: ShoppingBag },
  "/recommendations": { title: "智能推荐", description: "基于当季、热度与你的偏好", icon: Sparkles },
  "/favorites": { title: "我的收藏", description: "把喜欢的花礼留在这里", icon: Flower2 },
  "/cart": { title: "购物车", description: "核对花礼与数量后去结算", icon: ShoppingBag },
  "/checkout": { title: "结算", description: "填写收货信息并完成模拟支付", icon: ReceiptText },
  "/orders": { title: "我的订单", description: "查看支付、履约与售后进度", icon: ReceiptText },
  "/reviews": { title: "我的评价", description: "你留下的每一束花的故事", icon: MessageSquareText },
  "/profile": { title: "个人中心", description: "管理资料与登录密码", icon: UserRound },
  "/settings": { title: "外观与偏好", description: "主题、色板与界面密度", icon: Settings2 },
  "/staff/orders": { title: "履约工作台", description: "接单、备花、配送与售后处理", icon: ClipboardList },
  "/staff/inventory": { title: "库存管理", description: "查看流水并调整在售花礼库存", icon: Boxes },
  "/admin": { title: "经营总览", description: "销售额、订单与花礼经营状况", icon: LayoutDashboard },
  "/admin/products": { title: "商品管理", description: "维护花礼信息、状态与库存", icon: PackageSearch },
  "/admin/tags": { title: "标签管理", description: "维护品类、场景、节日与花语标签及首页展示", icon: Tags },
  "/admin/metrics": { title: "指标配置", description: "调整价格带与库存分档阈值", icon: SlidersHorizontal },
  "/admin/users": { title: "用户管理", description: "账号、角色与启用状态", icon: UsersRound },
  "/admin/reviews": { title: "评价管理", description: "可见性、回复与评分影响", icon: MessagesSquare },
  "/admin/recommendations": { title: "推荐运营", description: "权重配置、日志与效果评估", icon: WandSparkles },
  "/admin/logs": { title: "操作日志", description: "关键操作与异常追溯", icon: ScrollText },
};

export function getRouteMeta(pathname: string): RouteMeta {
  if (staticMeta[pathname]) return staticMeta[pathname];
  if (/^\/products\/\d+$/.test(pathname)) {
    return { title: "商品详情", description: "花材信息、公开评价与相似推荐", icon: Flower2 };
  }
  if (/^\/orders\/\d+$/.test(pathname)) {
    return { title: "订单详情", description: "支付、履约轨迹与售后", icon: ReceiptText };
  }
  if (/^\/staff\/orders\/\d+$/.test(pathname)) {
    return { title: "履约订单详情", description: "推进节点、取消与售后处理", icon: ClipboardList };
  }
  if (pathname.startsWith("/products")) {
    return staticMeta["/products"];
  }
  if (pathname.startsWith("/orders")) {
    return staticMeta["/orders"];
  }
  if (pathname.startsWith("/staff/orders")) {
    return staticMeta["/staff/orders"];
  }
  if (pathname.startsWith("/admin/products")) {
    return staticMeta["/admin/products"];
  }
  if (pathname.startsWith("/admin/tags")) {
    return staticMeta["/admin/tags"];
  }
  if (pathname.startsWith("/admin/metrics")) {
    return staticMeta["/admin/metrics"];
  }
  if (pathname.startsWith("/admin/users")) {
    return staticMeta["/admin/users"];
  }
  if (pathname.startsWith("/admin/reviews")) {
    return staticMeta["/admin/reviews"];
  }
  if (pathname.startsWith("/admin/recommendations")) {
    return staticMeta["/admin/recommendations"];
  }
  if (pathname.startsWith("/admin/logs")) {
    return staticMeta["/admin/logs"];
  }
  if (pathname.startsWith("/admin")) {
    return staticMeta["/admin"];
  }
  return { title: "花屿", description: "清透的花艺经营台", icon: Flower2 };
}
