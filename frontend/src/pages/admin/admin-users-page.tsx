import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  KeyRound,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Search,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { adminService } from "@/lib/services";
import { queryKeys } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/api-client";
import { formatDate, formatNumber, maskPhone } from "@/lib/format";
import { toast } from "@/stores/toast";
import { useAuthStore } from "@/stores/auth";
import type {
  AdminUserCreateRequest,
  AdminUserQuery,
  AdminUserUpdateRequest,
  UserRole,
  UserStatus,
  UserVO,
} from "@/types/api";
import { UserAvatar } from "@/components/domain/user-avatar";
import { UserStatusBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Dialog } from "@/components/ui/dialog";
import {
  DropdownItem,
  DropdownMenu,
  DropdownSeparator,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";

const PAGE_SIZE = 10;

const roleOptions: Array<{ value: UserRole; label: string }> = [
  { value: "CUSTOMER", label: "消费者" },
  { value: "STAFF", label: "店员" },
  { value: "ADMIN", label: "管理员" },
];

const userStatusOptions: Array<{ value: UserStatus; label: string }> = [
  { value: "ENABLED", label: "启用" },
  { value: "DISABLED", label: "禁用" },
];

const roleLabels: Record<UserRole, string> = {
  CUSTOMER: "消费者",
  STAFF: "店员",
  ADMIN: "管理员",
};

const phoneField = z
  .string()
  .trim()
  .refine((value) => !value || /^1[3-9]\d{9}$/.test(value), "请输入正确的手机号");

const emailField = z
  .string()
  .trim()
  .refine(
    (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    "请输入正确的邮箱地址",
  );

const createSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_]{3,30}$/, "用户名为 3-30 位字母、数字或下划线"),
  password: z.string().min(6, "密码至少 6 位").max(32, "密码最多 32 位"),
  nickname: z.string().trim().max(30, "昵称最多 30 个字符").optional(),
  phone: phoneField,
  email: emailField,
  role: z.enum(["CUSTOMER", "STAFF", "ADMIN"]),
});

type CreateValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  nickname: z.string().trim().max(30, "昵称最多 30 个字符").optional(),
  phone: phoneField,
  email: emailField,
  role: z.enum(["CUSTOMER", "STAFF", "ADMIN"]),
  status: z.enum(["ENABLED", "DISABLED"]),
});

type EditValues = z.infer<typeof editSchema>;

const resetSchema = z
  .object({
    newPassword: z.string().min(6, "密码至少 6 位").max(32, "密码最多 32 位"),
    confirmPassword: z.string().min(1, "请再次输入新密码"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "两次输入的新密码不一致",
  });

type ResetValues = z.infer<typeof resetSchema>;

export function AdminUsersPage() {
  const [searchParams] = useSearchParams();
  const urlKeyword = searchParams.get("keyword") ?? "";
  const [draftKeyword, setDraftKeyword] = useState(urlKeyword);
  const [keyword, setKeyword] = useState(urlKeyword);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserVO | null>(null);
  const [resetting, setResetting] = useState<UserVO | null>(null);

  useEffect(() => {
    setDraftKeyword(urlKeyword);
    setKeyword(urlKeyword);
    setPage(1);
  }, [urlKeyword]);

  const params = useMemo<AdminUserQuery>(
    () => ({
      page,
      size: PAGE_SIZE,
      keyword: keyword.trim() || undefined,
      role: role ? (role as UserRole) : undefined,
      status: status ? (status as UserStatus) : undefined,
    }),
    [page, keyword, role, status],
  );

  const query = useQuery({
    queryKey: queryKeys.adminUsers(params),
    queryFn: () => adminService.users(params),
    placeholderData: (previous) => previous,
  });

  const activeFilters = [keyword, role, status].filter(Boolean).length;
  const records = query.data?.records ?? [];

  const clearFilters = () => {
    setDraftKeyword("");
    setKeyword("");
    setRole("");
    setStatus("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">用户管理</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            创建账号、调整角色与启用状态，或重置用户密码。用户名创建后不可修改。
          </p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <UserPlus className="h-3.5 w-3.5" />
          新建用户
        </Button>
      </div>

      <div className="ui-card p-4">
        <form
          className="grid gap-2 sm:grid-cols-2 xl:grid-cols-10"
          onSubmit={(event) => {
            event.preventDefault();
            setKeyword(draftKeyword);
            setPage(1);
          }}
        >
          <div className="relative xl:col-span-4">
            <Label htmlFor="admin-user-keyword" className="sr-only">
              搜索用户
            </Label>
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="admin-user-keyword"
              value={draftKeyword}
              onChange={(event) => setDraftKeyword(event.target.value)}
              placeholder="搜索用户名、昵称或手机号"
              className="h-9 pl-8 text-xs"
            />
          </div>
          <div className="xl:col-span-2">
            <Label htmlFor="admin-user-role" className="sr-only">
              角色
            </Label>
            <CustomSelect
              id="admin-user-role"
              value={role}
              onChange={(next) => {
                setRole(next);
                setPage(1);
              }}
              options={roleOptions}
              placeholder="全部角色"
              className="h-9 text-xs"
            />
          </div>
          <div className="xl:col-span-2">
            <Label htmlFor="admin-user-status" className="sr-only">
              状态
            </Label>
            <CustomSelect
              id="admin-user-status"
              value={status}
              onChange={(next) => {
                setStatus(next);
                setPage(1);
              }}
              options={userStatusOptions}
              placeholder="全部状态"
              className="h-9 text-xs"
            />
          </div>
          <div className="flex gap-2 xl:col-span-2">
            <Button type="submit" className="h-9 w-full px-6 sm:w-auto">
              搜索
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-9 shrink-0 px-4"
              onClick={clearFilters}
            >
              <RotateCcw className="h-4 w-4" />
              重置
            </Button>
          </div>
        </form>
      </div>

      <div className="ui-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UsersRound className="h-3.5 w-3.5" />
            共 {formatNumber(query.data?.total)} 个账号
          </div>
          <p className="text-[11px] text-muted-foreground">没有删除用户接口，只能禁用账号</p>
        </div>

        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            title="用户列表没送到"
            description={getErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : records.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title={activeFilters > 0 ? "没有符合筛选条件的用户" : "还没有用户"}
            description={
              activeFilters > 0
                ? "试试清除筛选条件，或换一个关键词。"
                : "创建一个账号后，它会出现在这里。"
            }
            bare
            action={
              activeFilters > 0 ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  清除筛选
                </Button>
              ) : (
                <Button size="sm" onClick={() => setCreating(true)}>
                  <UserPlus className="h-3.5 w-3.5" />
                  新建用户
                </Button>
              )
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>用户</TH>
                  <TH>角色</TH>
                  <TH>状态</TH>
                  <TH>联系方式</TH>
                  <TH>注册时间</TH>
                  <TH className="text-right">操作</TH>
                </TR>
              </THead>
              <TBody>
                {records.map((user) => (
                  <TR key={user.id}>
                    <TD className="min-w-52 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar
                          name={user.nickname || user.username}
                          src={user.avatarUrl}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">
                            {user.nickname || user.username}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            @{user.username} · #{user.id}
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                        {user.roleLabel || roleLabels[user.role]}
                      </Badge>
                    </TD>
                    <TD>
                      <UserStatusBadge status={user.status} label={user.statusLabel} />
                    </TD>
                    <TD>
                      <p className="text-xs tabular">{maskPhone(user.phone)}</p>
                      <p className="max-w-44 truncate text-[10px] text-muted-foreground">
                        {user.email || "未填写邮箱"}
                      </p>
                    </TD>
                    <TD className="whitespace-nowrap text-[11px] text-muted-foreground tabular">
                      {formatDate(user.createdAt)}
                    </TD>
                    <TD className="text-right">
                      <DropdownMenu
                        triggerLabel={`${user.username} 操作`}
                        trigger={
                          <span className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4" />
                          </span>
                        }
                      >
                        <DropdownItem onClick={() => setEditing(user)}>
                          <Pencil className="h-3.5 w-3.5" />
                          编辑账号
                        </DropdownItem>
                        <DropdownItem onClick={() => setResetting(user)}>
                          <KeyRound className="h-3.5 w-3.5" />
                          重置密码
                        </DropdownItem>
                        <DropdownSeparator />
                        <DropdownItem onClick={() => setEditing(user)}>
                          <UsersRound className="h-3.5 w-3.5" />
                          查看角色与状态
                        </DropdownItem>
                      </DropdownMenu>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}

        {records.length > 0 ? (
          <div className="border-t border-border/60 px-4 py-3">
            <Pagination
              page={page}
              pages={query.data?.pages ?? 1}
              total={query.data?.total ?? 0}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        ) : null}
      </div>

      <CreateUserDialog open={creating} onOpenChange={setCreating} />
      <EditUserDialog user={editing} onOpenChange={(open) => !open && setEditing(null)} />
      <ResetPasswordDialog user={resetting} onOpenChange={(open) => !open && setResetting(null)} />
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      username: "",
      password: "",
      nickname: "",
      phone: "",
      email: "",
      role: "CUSTOMER",
    },
  });

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: CreateValues) => {
      const body: AdminUserCreateRequest = {
        username: values.username.trim(),
        password: values.password,
        nickname: values.nickname?.trim() || undefined,
        phone: values.phone.trim() || undefined,
        email: values.email.trim() || undefined,
        role: values.role,
      };
      return adminService.createUser(body);
    },
    onSuccess: (user) => {
      toast.success("用户已创建", `@${user.username} 可以立即登录。`);
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onOpenChange(false);
    },
    onError: (error) => toast.error("创建用户失败", getErrorMessage(error)),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="新建用户"
      description="管理员可以创建消费者、店员或管理员账号。注册接口不会自动登录新账号。"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="submit" form="admin-create-user-form" size="sm" loading={mutation.isPending}>
            创建用户
          </Button>
        </div>
      }
    >
      <form
        id="admin-create-user-form"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="create-username">用户名 *</Label>
            <Input
              id="create-username"
              placeholder="3-30 位字母 / 数字 / 下划线"
              autoComplete="off"
              aria-invalid={Boolean(errors.username)}
              {...register("username")}
            />
            <FieldError message={errors.username?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-password">初始密码 *</Label>
            <Input
              id="create-password"
              type="password"
              placeholder="6-32 位"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
            <FieldError message={errors.password?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-nickname">昵称</Label>
            <Input id="create-nickname" maxLength={30} {...register("nickname")} />
            <FieldError message={errors.nickname?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-role">角色 *</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <CustomSelect
                  id="create-role"
                  value={field.value}
                  onChange={field.onChange}
                  options={roleOptions}
                />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-phone">手机号</Label>
            <Input
              id="create-phone"
              inputMode="tel"
              placeholder="可选"
              aria-invalid={Boolean(errors.phone)}
              {...register("phone")}
            />
            <FieldError message={errors.phone?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-email">邮箱</Label>
            <Input
              id="create-email"
              type="email"
              placeholder="可选"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
            <FieldError message={errors.email?.message} />
          </div>
        </div>
      </form>
    </Dialog>
  );
}

function EditUserDialog({
  user,
  onOpenChange,
}: {
  user: UserVO | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const setUser = useAuthStore((state) => state.setUser);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      nickname: "",
      phone: "",
      email: "",
      role: "CUSTOMER",
      status: "ENABLED",
    },
  });

  useEffect(() => {
    if (!user) return;
    reset({
      nickname: user.nickname ?? "",
      phone: user.phone ?? "",
      email: user.email ?? "",
      role: user.role,
      status: user.status,
    });
  }, [user, reset]);

  const isSelf = user?.id === currentUserId;

  const mutation = useMutation({
    mutationFn: (values: EditValues) => {
      if (!user) throw new Error("缺少用户信息");
      const body: AdminUserUpdateRequest = {
        nickname: values.nickname?.trim() || undefined,
        phone: values.phone.trim(),
        email: values.email.trim(),
        role: values.role,
      };
      if (!isSelf) body.status = values.status;
      return adminService.updateUser(user.id, body);
    },
    onSuccess: (saved) => {
      toast.success("用户已更新", `@${saved.username} 的资料已保存。`);
      if (saved.id === currentUserId) {
        setUser(saved);
      }
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onOpenChange(false);
    },
    onError: (error) => toast.error("更新用户失败", getErrorMessage(error)),
  });

  return (
    <Dialog
      open={Boolean(user)}
      onOpenChange={onOpenChange}
      title={user ? `编辑 @${user.username}` : "编辑用户"}
      description="用户名不可修改。手机号与邮箱传空字符串会清空；当前登录账号不能禁用自己。"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="submit" form="admin-edit-user-form" size="sm" loading={mutation.isPending}>
            保存修改
          </Button>
        </div>
      }
    >
      <form
        id="admin-edit-user-form"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-nickname">昵称</Label>
            <Input id="edit-nickname" maxLength={30} {...register("nickname")} />
            <FieldError message={errors.nickname?.message} />
          </div>
          <div className="space-y-1.5">
            <Label>用户 ID</Label>
            <Input value={user ? `#${user.id}` : ""} disabled readOnly />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-phone">手机号</Label>
            <Input
              id="edit-phone"
              inputMode="tel"
              placeholder="留空表示清空"
              aria-invalid={Boolean(errors.phone)}
              {...register("phone")}
            />
            <FieldError message={errors.phone?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-email">邮箱</Label>
            <Input
              id="edit-email"
              type="email"
              placeholder="留空表示清空"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
            <FieldError message={errors.email?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-role">角色</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <CustomSelect
                  id="edit-role"
                  value={field.value}
                  onChange={field.onChange}
                  options={roleOptions}
                />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-status">状态</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <CustomSelect
                  id="edit-status"
                  disabled={isSelf}
                  value={field.value}
                  onChange={field.onChange}
                  options={userStatusOptions}
                />
              )}
            />
            {isSelf ? (
              <p className="text-[11px] text-muted-foreground">当前登录账号不能禁用自己。</p>
            ) : null}
          </div>
        </div>
      </form>
    </Dialog>
  );
}

function ResetPasswordDialog({
  user,
  onOpenChange,
}: {
  user: UserVO | null;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (user) reset();
  }, [user, reset]);

  const mutation = useMutation({
    mutationFn: (values: ResetValues) => {
      if (!user) throw new Error("缺少用户信息");
      return adminService.resetPassword(user.id, { newPassword: values.newPassword });
    },
    onSuccess: () => {
      toast.success("密码已重置", `@${user?.username ?? ""} 需要使用新密码登录。`);
      onOpenChange(false);
    },
    onError: (error) => toast.error("重置密码失败", getErrorMessage(error)),
  });

  return (
    <Dialog
      open={Boolean(user)}
      onOpenChange={onOpenChange}
      title={user ? `重置 @${user.username} 的密码` : "重置密码"}
      description="重置密码不会自动吊销该用户已有的 JWT 令牌。新密码长度为 6-32 位。"
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="submit"
            form="admin-reset-password-form"
            size="sm"
            loading={mutation.isPending}
          >
            确认重置
          </Button>
        </div>
      }
    >
      <form
        id="admin-reset-password-form"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="reset-new-password">新密码 *</Label>
          <Input
            id="reset-new-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.newPassword)}
            {...register("newPassword")}
          />
          <FieldError message={errors.newPassword?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reset-confirm-password">确认新密码 *</Label>
          <Input
            id="reset-confirm-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register("confirmPassword")}
          />
          <FieldError message={errors.confirmPassword?.message} />
        </div>
      </form>
    </Dialog>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}
