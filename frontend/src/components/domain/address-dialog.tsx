import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { MapPinned } from "lucide-react";
import { getErrorMessage } from "@/lib/api-client";
import {
  getCityOptions,
  getDistrictOptions,
  normalizeMunicipalityCity,
  PROVINCE_OPTIONS,
  withCurrentOption,
} from "@/lib/china-regions";
import { queryKeys } from "@/lib/query-keys";
import { addressService } from "@/lib/services";
import { toast } from "@/stores/toast";
import { useAuthStore } from "@/stores/auth";
import type { AddressSaveRequest, AddressVO } from "@/types/api";
import type { PickedLocation } from "@/lib/amap";
import { AMapLocationPicker } from "@/components/domain/amap-location-picker";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  receiverName: z.string().trim().min(1, "请填写收货人").max(50, "收货人最多 50 个字符"),
  receiverPhone: z
    .string()
    .trim()
    .regex(/^1[3-9]\d{9}$/, "请输入中国大陆手机号"),
  label: z.string().trim().max(10, "地址标签最多 10 个字符"),
  province: z.string().trim().max(30, "省份最多 30 个字符"),
  city: z.string().trim().max(30, "城市最多 30 个字符"),
  district: z.string().trim().max(30, "区县最多 30 个字符"),
  detailAddress: z
    .string()
    .trim()
    .min(1, "请填写详细地址")
    .max(100, "详细地址最多 100 个字符"),
  formattedAddress: z.string().trim().max(150, "地图地址最多 150 个字符"),
  longitude: z.number().optional(),
  latitude: z.number().optional(),
  isDefault: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface AddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address?: AddressVO | null;
  onSaved?: (address: AddressVO) => void;
}

export function AddressDialog({ open, onOpenChange, address, onSaved }: AddressDialogProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    control,
    getValues,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      receiverName: "",
      receiverPhone: "",
      label: "家",
      province: "",
      city: "",
      district: "",
      detailAddress: "",
      formattedAddress: "",
      isDefault: false,
    },
  });

  const longitude = watch("longitude");
  const latitude = watch("latitude");
  const province = watch("province");
  const city = watch("city");
  const district = watch("district");
  const detailAddress = watch("detailAddress");
  const formattedAddress = watch("formattedAddress");
  const provinceOptions = useMemo(
    () => withCurrentOption(PROVINCE_OPTIONS, province),
    [province],
  );
  const cityOptions = useMemo(
    () => withCurrentOption(getCityOptions(province), city),
    [city, province],
  );
  const districtOptions = useMemo(
    () => withCurrentOption(getDistrictOptions(province, city), district),
    [city, district, province],
  );
  const hasCoordinate = typeof longitude === "number" && typeof latitude === "number";
  const hasAddressText = Boolean(
    province?.trim() ||
      city?.trim() ||
      district?.trim() ||
      detailAddress?.trim() ||
      formattedAddress?.trim(),
  );

  useEffect(() => {
    if (!open) return;
    const nextProvince = address?.province ?? "";
    reset({
      receiverName: address?.receiverName ?? user?.nickname ?? user?.username ?? "",
      receiverPhone: address?.receiverPhone ?? user?.phone ?? "",
      label: address?.label ?? "家",
      province: nextProvince,
      city: normalizeMunicipalityCity(nextProvince, address?.city),
      district: address?.district ?? "",
      detailAddress: address?.detailAddress ?? "",
      formattedAddress: address?.formattedAddress ?? "",
      longitude: address?.longitude,
      latitude: address?.latitude,
      isDefault: address?.isDefault ?? false,
    });
  }, [address, open, reset, user?.nickname, user?.phone, user?.username]);

  const clearLocation = () => {
    setValue("longitude", undefined, { shouldDirty: true });
    setValue("latitude", undefined, { shouldDirty: true });
    setValue("province", "", { shouldDirty: true });
    setValue("city", "", { shouldDirty: true });
    setValue("district", "", { shouldDirty: true });
    setValue("detailAddress", "", { shouldDirty: true });
    setValue("formattedAddress", "", { shouldDirty: true });
  };

  const handlePick = (picked: PickedLocation) => {
    const currentProvince = getValues("province");
    const currentCity = getValues("city");
    const nextProvince = picked.province ?? currentProvince;
    if (picked.province && picked.province !== currentProvince) {
      setValue("city", "", { shouldDirty: true });
      setValue("district", "", { shouldDirty: true });
    }
    if (picked.province) {
      setValue("province", picked.province, { shouldDirty: true });
    }
    if (picked.city) {
      const nextCity = normalizeMunicipalityCity(nextProvince, picked.city);
      if (nextCity !== currentCity) {
        setValue("district", "", { shouldDirty: true });
      }
      setValue("city", nextCity, { shouldDirty: true });
    }
    if (picked.district) setValue("district", picked.district, { shouldDirty: true });
    if (picked.detailAddress) {
      setValue("detailAddress", picked.detailAddress, { shouldDirty: true });
    }
    if (picked.formattedAddress) {
      setValue("formattedAddress", picked.formattedAddress, { shouldDirty: true });
    }
    setValue("longitude", picked.longitude, { shouldDirty: true });
    setValue("latitude", picked.latitude, { shouldDirty: true });
  };

  const onSubmit = async (values: FormValues) => {
    const payload: AddressSaveRequest = {
      receiverName: values.receiverName.trim(),
      receiverPhone: values.receiverPhone.trim(),
      label: values.label.trim() || "家",
      province: values.province.trim() || undefined,
      city: values.city.trim() || undefined,
      district: values.district.trim() || undefined,
      detailAddress: values.detailAddress.trim(),
      formattedAddress: values.formattedAddress.trim() || undefined,
      longitude: values.longitude,
      latitude: values.latitude,
      isDefault: values.isDefault,
    };
    setSubmitting(true);
    try {
      const saved = address
        ? await addressService.update(address.id, payload)
        : await addressService.create(payload);
      toast.success(address ? "地址已更新" : "地址已保存", saved.fullAddress);
      await queryClient.invalidateQueries({ queryKey: queryKeys.addresses });
      onSaved?.(saved);
      onOpenChange(false);
    } catch (error) {
      toast.error("保存地址失败", getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) onOpenChange(next);
      }}
      title={address ? "编辑收货地址" : "新增收货地址"}
      description="保存常用收花地址，下单时直接选择；地图选点会同步记录配送坐标。"
      size="xl"
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={submitting}>
            {address ? "保存修改" : "保存地址"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,1.08fr)]">
        <div className="space-y-4">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold tracking-tight">联系人</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="address-receiver-name">收货人 *</Label>
                <Input
                  id="address-receiver-name"
                  placeholder="收货人姓名"
                  aria-invalid={Boolean(errors.receiverName)}
                  data-autofocus
                  {...register("receiverName")}
                />
                {errors.receiverName ? (
                  <p className="text-xs text-destructive">{errors.receiverName.message}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address-receiver-phone">联系电话 *</Label>
                <Input
                  id="address-receiver-phone"
                  inputMode="tel"
                  placeholder="11 位手机号"
                  aria-invalid={Boolean(errors.receiverPhone)}
                  {...register("receiverPhone")}
                />
                {errors.receiverPhone ? (
                  <p className="text-xs text-destructive">{errors.receiverPhone.message}</p>
                ) : null}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address-label">地址标签</Label>
              <Input
                id="address-label"
                placeholder="例如：家、公司、学校"
                maxLength={10}
                aria-invalid={Boolean(errors.label)}
                {...register("label")}
              />
              {errors.label ? (
                <p className="text-xs text-destructive">{errors.label.message}</p>
              ) : null}
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">送达地址</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                地图选点会自动回填省市区和详细地址，也可以按省、市、区县逐级选择或输入搜索。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="address-province">省份</Label>
                <Controller
                  control={control}
                  name="province"
                  render={({ field }) => (
                    <CustomSelect
                      id="address-province"
                      options={provinceOptions}
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        setValue("city", "", { shouldDirty: true });
                        setValue("district", "", { shouldDirty: true });
                      }}
                      placeholder="请选择省份"
                      searchable
                      searchPlaceholder="搜索省份"
                    />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address-city">城市</Label>
                <Controller
                  control={control}
                  name="city"
                  render={({ field }) => (
                    <CustomSelect
                      id="address-city"
                      options={cityOptions}
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        setValue("district", "", { shouldDirty: true });
                      }}
                      placeholder={province ? "请选择城市" : "请先选择省份"}
                      searchable
                      searchPlaceholder="搜索城市"
                      disabled={!province}
                    />
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address-district">区县</Label>
                <Controller
                  control={control}
                  name="district"
                  render={({ field }) => (
                    <CustomSelect
                      id="address-district"
                      options={districtOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={city ? "请选择区县" : "请先选择城市"}
                      searchable
                      searchPlaceholder="搜索区县"
                      disabled={!city}
                    />
                  )}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address-detail">详细地址 *</Label>
              <Textarea
                id="address-detail"
                placeholder="街道、门牌号、楼栋与房间号"
                className="min-h-20"
                aria-invalid={Boolean(errors.detailAddress)}
                {...register("detailAddress")}
              />
              {errors.detailAddress ? (
                <p className="text-xs text-destructive">{errors.detailAddress.message}</p>
              ) : null}
            </div>
            {formattedAddress ? (
              <p className="rounded-lg bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                地图地址：{formattedAddress}
              </p>
            ) : null}
            <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 px-3 py-3">
              <div>
                <p className="text-sm font-medium">设为默认地址</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {address?.isDefault
                    ? "当前地址已是默认地址，可在地址簿中切换其他默认地址。"
                    : "结算时会优先选中默认地址。"}
                </p>
              </div>
              <Controller
                control={control}
                name="isDefault"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={Boolean(address?.isDefault)}
                    label="设为默认地址"
                  />
                )}
              />
            </div>
          </section>
        </div>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MapPinned className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">地图选点</h3>
              <p className="text-[11px] text-muted-foreground">
                点击地图或拖动标记，记录送达位置。
              </p>
            </div>
          </div>
          <AMapLocationPicker
            longitude={longitude}
            latitude={latitude}
            province={province}
            city={city}
            district={district}
            detailAddress={detailAddress}
            onPick={handlePick}
            height={360}
          />
          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>
              {hasCoordinate
                ? `坐标 ${longitude!.toFixed(6)}, ${latitude!.toFixed(6)}`
                : "尚未选择地图坐标"}
            </span>
            {hasCoordinate || hasAddressText ? (
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={clearLocation}
              >
                清除选点与地址
              </button>
            ) : null}
          </div>
        </section>
      </form>
    </Dialog>
  );
}
