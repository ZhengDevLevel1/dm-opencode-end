import { useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { getErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { resolveImageUrl } from "@/lib/image";
import { fileService } from "@/lib/services";
import { toast } from "@/stores/toast";
import type { ImageCategory } from "@/types/api";
import { Button } from "@/components/ui/button";
import { ImageCropDialog } from "@/components/domain/image-crop-dialog";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error("图片已上传，但公开地址无法访问，请检查 MinIO 的 public-url 与公开读配置。"));
    image.src = url;
  });
}

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void | Promise<void>;
  category: ImageCategory;
  shape?: "circle" | "rounded";
  className?: string;
  fallback?: ReactNode;
  disabled?: boolean;
  showActions?: boolean;
  actionLabel?: string;
  title?: string;
  /** 裁剪窗口的宽高比，默认 1（正方形） */
  cropAspect?: number;
}

export function ImageUpload({
  value,
  onChange,
  category,
  shape = "rounded",
  className,
  fallback,
  disabled = false,
  showActions = true,
  actionLabel = "选择本地图片",
  title,
  cropAspect = 1,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [broken, setBroken] = useState(false);
  const [cropSource, setCropSource] = useState<{ file: File; url: string } | null>(null);
  const resolved = resolveImageUrl(value);
  const showImage = Boolean(resolved) && !broken;
  const busy = uploading || disabled;

  useEffect(() => {
    setBroken(false);
  }, [value]);

  const openPicker = () => {
    if (!busy) inputRef.current?.click();
  };

  const handleClear = async () => {
    try {
      await onChange("");
    } catch (error) {
      toast.error("图片更新失败", getErrorMessage(error));
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const uploaded = await fileService.uploadImage(file, category);
      await preloadImage(uploaded.url);
      await onChange(uploaded.url);
    } catch (error) {
      toast.error("图片上传失败", getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const handleFile = (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      toast.error("图片格式不支持", "请选择 JPG、PNG、WEBP 或 GIF 图片。");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("图片过大", "单张图片不能超过 5MB。");
      return;
    }
    // GIF 是动图，canvas 裁剪会丢失动画，直接上传原图
    if (file.type === "image/gif") {
      void uploadFile(file);
      return;
    }
    const url = URL.createObjectURL(file);
    setCropSource({ file, url });
  };

  const closeCropDialog = () => {
    if (cropSource) URL.revokeObjectURL(cropSource.url);
    setCropSource(null);
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={openPicker}
        disabled={busy}
        title={title}
        aria-label={title ?? actionLabel}
        className={cn(
          "group relative flex w-full items-center justify-center overflow-hidden border border-border bg-muted/40 transition-colors hover:border-primary/40 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70",
          shape === "circle" ? "rounded-full" : "rounded-xl",
          className,
        )}
      >
        {showImage ? (
          <img
            src={resolved ?? undefined}
            alt=""
            onError={() => setBroken(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className={cn(
              "flex h-full w-full items-center justify-center",
              shape === "circle" ? "p-0" : "p-3",
            )}
          >
            {fallback ?? <ImagePlus className="h-8 w-8 text-muted-foreground/60" />}
          </span>
        )}
        <span
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center bg-foreground/45 text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
            uploading && "opacity-100",
          )}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Camera className="h-5 w-5" />
          )}
        </span>
      </button>

      {showActions ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openPicker}
            disabled={busy}
            loading={uploading}
          >
            <Upload className="h-3.5 w-3.5" />
            {actionLabel}
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => void handleClear()}
              disabled={busy}
            >
              <Trash2 className="h-3.5 w-3.5" />
              移除
            </Button>
          ) : null}
          <span className="text-[11px] text-muted-foreground">
            支持 JPG/PNG/WEBP/GIF，最大 5MB
          </span>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleFile(file);
        }}
      />

      <ImageCropDialog
        open={cropSource !== null}
        imageUrl={cropSource?.url ?? ""}
        fileName={cropSource?.file.name ?? ""}
        fileType={cropSource?.file.type ?? ""}
        aspect={cropAspect}
        onClose={closeCropDialog}
        onUseOriginal={() => {
          const file = cropSource?.file;
          closeCropDialog();
          if (file) void uploadFile(file);
        }}
        onConfirm={(file) => {
          closeCropDialog();
          void uploadFile(file);
        }}
      />
    </div>
  );
}
