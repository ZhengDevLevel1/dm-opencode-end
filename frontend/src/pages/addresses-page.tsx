import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  MapPin,
  MapPinned,
  Navigation,
  Pencil,
  Phone,
  Plus,
  Search,
  Star,
  Trash2,
  UserRound,
} from "lucide-react";
import { useAddressesQuery } from "@/hooks/queries";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { getErrorMessage } from "@/lib/api-client";
import { PAGE_SIZE_OPTIONS } from "@/lib/page-size-options";
import { queryKeys } from "@/lib/query-keys";
import { addressService } from "@/lib/services";
import { toast } from "@/stores/toast";
import type { AddressVO } from "@/types/api";
import { AddressDialog } from "@/components/domain/address-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ListSearch } from "@/components/ui/list-search";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";

const MAX_ADDRESSES = 10;
const ADDRESSES_PAGE_SIZE = 6;

export function AddressesPage() {
  const queryClient = useQueryClient();
  const addresses = useAddressesQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AddressVO | null>(null);
  const [deleting, setDeleting] = useState<AddressVO | null>(null);
  const [defaultPendingId, setDefaultPendingId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.addresses });

  const setDefault = useMutation({
    mutationFn: (id: number) => addressService.setDefault(id),
    onSuccess: (address) => {
      toast.success("默认地址已更新", address.fullAddress);
      void invalidate();
    },
    onError: (error) => toast.error("设置默认地址失败", getErrorMessage(error)),
    onSettled: () => setDefaultPendingId(null),
  });

  const remove = useMutation({
    mutationFn: (id: number) => addressService.remove(id),
    onSuccess: () => {
      toast.success("地址已删除");
      setDeleting(null);
      void invalidate();
    },
    onError: (error) => toast.error("删除地址失败", getErrorMessage(error)),
  });

  const list = useMemo(() => addresses.data ?? [], [addresses.data]);
  const search = keyword.trim().toLowerCase();
  const filteredList = useMemo(() => {
    if (!search) return list;
    return list.filter((address) =>
      [
        address.label || "家",
        address.receiverName,
        address.receiverPhone,
        address.fullAddress,
      ].some((value) => value?.toLowerCase().includes(search)),
    );
  }, [list, search]);

  const { page, pages, total, pageSize, records, setPage, setPageSize, resetPage } =
    useClientPagination(filteredList, ADDRESSES_PAGE_SIZE);

  useEffect(() => {
    resetPage();
  }, [search, resetPage]);

  const atLimit = list.length >= MAX_ADDRESSES;

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (address: AddressVO) => {
    setEditing(address);
    setDialogOpen(true);
  };

  const handleDefault = (address: AddressVO) => {
    setDefaultPendingId(address.id);
    setDefault.mutate(address.id);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">收货地址</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            保存常用收花地址，结算时直接选择；最多保存 {MAX_ADDRESSES} 个。
            {list.length > 0
              ? search
                ? ` 当前已有 ${list.length} 个地址，筛选出 ${filteredList.length} 个。`
                : ` 当前已有 ${list.length} 个地址。`
              : ""}
          </p>
        </div>
        <Button size="sm" onClick={openCreate} disabled={atLimit}>
          <Plus className="h-3.5 w-3.5" />
          新增地址
        </Button>
      </div>

      {atLimit ? (
        <p className="rounded-lg border border-warning/30 bg-warning/[0.06] px-3 py-2 text-[11px] text-warning">
          地址簿已满，请删除不常用的地址后再新增。
        </p>
      ) : null}

      {!addresses.isLoading && !addresses.isError && list.length > 0 ? (
        <div className="ui-card p-3">
          <ListSearch
            value={keyword}
            onChange={setKeyword}
            placeholder="搜索收货人、电话、地址或标签"
            aria-label="搜索收货地址"
          />
        </div>
      ) : null}

      {addresses.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : addresses.isError ? (
        <ErrorState
          title="地址簿没送到"
          description={getErrorMessage(addresses.error)}
          onRetry={() => void addresses.refetch()}
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="还没有收货地址"
          description="新增一个常用地址，结算时就可以直接选择并在地图上标注送达位置。"
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              新增第一个地址
            </Button>
          }
          className="py-24"
        />
      ) : filteredList.length === 0 ? (
        <EmptyState
          icon={Search}
          title="没有匹配的收货地址"
          description={`没有匹配“${keyword.trim()}”的地址，换个收货人、电话、地址或标签试试。`}
          action={
            <Button variant="outline" onClick={() => setKeyword("")}>
              清空搜索
            </Button>
          }
          className="py-24"
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {records.map((address) => (
              <article
                key={address.id}
                className="ui-card group relative flex flex-col overflow-hidden p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">{address.label || "家"}</Badge>
                    {address.isDefault ? (
                      <Badge variant="default">
                        <Star className="h-3 w-3" />
                        默认
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="编辑地址"
                      onClick={() => openEdit(address)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="删除地址"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleting(address)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UserRound className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{address.receiverName}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {address.receiverPhone}
                    </p>
                  </div>
                </div>

                <p className="mt-3 flex items-start gap-1.5 text-sm leading-relaxed">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 break-words">{address.fullAddress}</span>
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  {typeof address.longitude === "number" &&
                  typeof address.latitude === "number" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-1">
                      <Navigation className="h-3 w-3" />
                      已标注地图 · {address.longitude.toFixed(4)}, {address.latitude.toFixed(4)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-1">
                      <MapPin className="h-3 w-3" />
                      未标注地图点
                    </span>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3.5">
                  {address.isDefault ? (
                    <span className="flex items-center gap-1 text-[11px] text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      结算优先使用
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDefault(address)}
                      loading={defaultPendingId === address.id}
                    >
                      <Star className="h-3.5 w-3.5" />
                      设为默认
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => openEdit(address)}>
                    编辑
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {total > 0 ? (
            <Pagination
              page={page}
              pages={pages}
              total={total}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS.address}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          ) : null}
        </div>
      )}

      <AddressDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        address={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setDeleting(null);
        }}
        title="删除这个地址？"
        description={
          deleting
            ? `将删除「${deleting.fullAddress}」，已创建的历史订单不受影响。`
            : ""
        }
        confirmText="删除地址"
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id);
        }}
      />
    </div>
  );
}
