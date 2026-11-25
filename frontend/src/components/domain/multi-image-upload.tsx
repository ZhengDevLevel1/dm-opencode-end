import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { getErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { resolveImageUrl } from "@/lib/image";
import { fileService } from "@/lib/services";
import { toast } from "@/stores/toast";
import type { ImageCategory } from "@/types/api";
import { ImageCropDialog } from "@/components/domain/image-crop-dialog";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

interface CropItem {
  file: File;
  url: string;
}

interface MultiImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  category: ImageCategory;
  max?: number;
  className?: string;
  tileClassName?: string;
  label?: string;
  hint?: string;
  showPrimary?: boolean;
  cropAspect?: number;
}

export function MultiImageUpload({
  value,
  onChange,
  category,
  max = 8,
  className,
  tileClassName = "aspect-[4/5]",
  label = "上传图片",
  hint,
  showPrimary = true,
  cropAspect = 1,
}: MultiImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  const [uploading, setUploading] = useState(0);
  const [cropQueue, setCropQueue] = useState<CropItem[]>([]);
  const cropSource = cropQueue[0] ?? null;
  const full = value.length >= max;

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const commit = (urls: string[]) => {
    valueRef.current = urls;
    onChange(urls);
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading((count) => count + files.length);
    const uploaded: string[] = [];
    for (const file of files) {
      try {
        const result = await fileService.uploadImage(file, category);
        uploaded.push(result.url);
      } catch (error) {
        toast.error("图片上传失败", getErrorMessage(error));
      } finally {
        setUploading((count) => Math.max(0, count - 1));
      }
    }
    if (uploaded.length > 0) {
      commit([...valueRef.current, ...uploaded].slice(0, max));
    }
  };

  const handleFiles = (files: File[]) => {
    const remaining = max - valueRef.current.length;
    if (remaining <= 0) return;
    const queue = files.slice(0, remaining);
    const directUploads: File[] = [];
    const crops: CropItem[] = [];
    for (const file of queue) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        toast.error("图片格式不支持", `${file.name} 不是 JPG、PNG、WEBP 或 GIF 图片。`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error("图片过大", `${file.name} 超过 5MB。`);
        continue;
      }
      if (file.type === "image/gif") {
        directUploads.push(file);
      } else {
        crops.push({ file, url: URL.createObjectURL(file) });
      }
    }
    if (crops.length > 0) {
      setCropQueue((current) => [...current, ...crops]);
    }
    if (directUploads.length > 0) {
      void uploadFiles(directUploads);
    }
  };

  const shiftCrop = () => {
    setCropQueue((current) => {
      const [first, ...rest] = current;
      if (first) URL.revokeObjectURL(first.url);
      return rest;
    });
  };

  const cancelCrop = () => {
    setCropQueue((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
  };

  const removeAt = (index: number) => {
    commit(value.filter((_, current) => current !== index));
  };

  const makePrimary = (index: number) => {
    if (index === 0) return;
    const next = [...value];
    const [item] = next.splice(index, 1);
    commit([item, ...next]);
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((url, index) => {
          const resolved = resolveImageUrl(url);
          return (
            <div
              key={`${url}-${index}`}
              className={cn(
                "group relative overflow-hidden rounded-lg border border-border bg-muted/30",
                tileClassName,
              )}
            >
              {resolved ? (
                <img src={resolved} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ImagePlus className="h-5 w-5" />
                </div>
              )}
              {showPrimary && index === 0 ? (
                <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                  <Star className="h-2.5 w-2.5" />
                  主图
                </span>
              ) : showPrimary ? (
                <button
                  type="button"
                  onClick={() => makePrimary(index)}
                  className="absolute top-1.5 left-1.5 rounded-full bg-background/85 p-1 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  title="设为主图"
                >
                  <Star className="h-2.5 w-2.5" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute right-1.5 bottom-1.5 rounded-full bg-destructive/90 p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                title="移除图片"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          );
        })}
        {!full ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading > 0}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/20 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed",
              tileClassName,
            )}
          >
            {uploading > 0 ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            <span>{uploading > 0 ? "上传中" : label}</span>
          </button>
        ) : null}
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {hint ??
          (showPrimary
            ? `最多 ${max} 张，第一张作为主图；支持 JPG/PNG/WEBP/GIF，单张不超过 5MB。`
            : `最多 ${max} 张；支持 JPG/PNG/WEBP/GIF，单张不超过 5MB。`)}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length > 0) handleFiles(files);
        }}
      />
      <ImageCropDialog
        open={cropSource !== null}
        imageUrl={cropSource?.url ?? ""}
        fileName={cropSource?.file.name ?? ""}
        fileType={cropSource?.file.type ?? ""}
        aspect={cropAspect}
        shape="rect"
        onClose={cancelCrop}
        onUseOriginal={() => {
          if (!cropSource) return;
          const file = cropSource.file;
          shiftCrop();
          void uploadFiles([file]);
        }}
        onConfirm={(file) => {
          shiftCrop();
          void uploadFiles([file]);
        }}
      />
    </div>
  );
}
