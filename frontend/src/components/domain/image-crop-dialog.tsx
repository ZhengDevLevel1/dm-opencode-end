import { useCallback, useEffect, useRef, useState } from "react";
import { Check, RotateCcw, SkipForward, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { RangeSlider } from "@/components/ui/range-slider";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const MAX_OUTPUT_EDGE = 1600;

interface ImageCropDialogProps {
  open: boolean;
  imageUrl: string;
  fileName: string;
  fileType: string;
  aspect: number;
  onClose: () => void;
  onUseOriginal: () => void;
  onConfirm: (file: File) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function ImageCropDialog({
  open,
  imageUrl,
  fileName,
  fileType,
  aspect,
  onClose,
  onUseOriginal,
  onConfirm,
}: ImageCropDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(MIN_ZOOM);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [imageReady, setImageReady] = useState(false);

  // 每次打开新图片时重置缩放与位置
  useEffect(() => {
    if (!open) return;
    zoomRef.current = MIN_ZOOM;
    setZoom(MIN_ZOOM);
    panRef.current = { x: 0, y: 0 };
    setImageReady(false);
  }, [open, imageUrl]);

  // 根据可用空间与目标宽高比计算裁剪窗口尺寸，保证比例精确
  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;
    const update = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      let w = width;
      let h = width / aspect;
      if (h > height) {
        h = height;
        w = height * aspect;
      }
      setViewport({ width: Math.round(w), height: Math.round(h) });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [open, aspect]);

  const coverScale = useCallback((): number => {
    const image = imageRef.current;
    const win = windowRef.current;
    if (!image || !win || !image.naturalWidth || !image.naturalHeight) return 1;
    return Math.max(
      win.clientWidth / image.naturalWidth,
      win.clientHeight / image.naturalHeight,
    );
  }, []);

  const applyTransform = useCallback((): void => {
    const image = imageRef.current;
    const win = windowRef.current;
    if (!image || !win || !image.naturalWidth || !image.naturalHeight) return;
    const cw = win.clientWidth;
    const ch = win.clientHeight;
    if (!cw || !ch) return;
    const scale = coverScale() * zoomRef.current;
    const dw = image.naturalWidth * scale;
    const dh = image.naturalHeight * scale;
    const tx = clamp((cw - dw) / 2 + panRef.current.x, cw - dw, 0);
    const ty = clamp((ch - dh) / 2 + panRef.current.y, ch - dh, 0);
    image.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
  }, [coverScale]);

  // 窗口尺寸变化后重新夹取位置
  useEffect(() => {
    if (imageReady) applyTransform();
  }, [viewport, imageReady, applyTransform]);

  // 非被动滚轮缩放：监听裁剪区域容器，滚轮实时缩放
  useEffect(() => {
    if (!open) return;
    const area = containerRef.current;
    if (!area) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.08 : 0.92;
      const next = clamp(zoomRef.current * factor, MIN_ZOOM, MAX_ZOOM);
      if (next !== zoomRef.current) {
        zoomRef.current = next;
        setZoom(next);
        applyTransform();
      }
    };
    area.addEventListener("wheel", handleWheel, { passive: false });
    return () => area.removeEventListener("wheel", handleWheel);
  }, [open, applyTransform]);

  const handleZoom = (next: number) => {
    zoomRef.current = next;
    setZoom(next);
    applyTransform();
  };

  const resetCrop = () => {
    zoomRef.current = MIN_ZOOM;
    setZoom(MIN_ZOOM);
    panRef.current = { x: 0, y: 0 };
    applyTransform();
  };

  const confirmCrop = () => {
    const win = windowRef.current;
    const image = imageRef.current;
    if (!win || !image || !image.naturalWidth || !image.naturalHeight) return;
    const cw = win.clientWidth;
    const ch = win.clientHeight;
    const scale = coverScale() * zoomRef.current;
    const dw = image.naturalWidth * scale;
    const dh = image.naturalHeight * scale;
    const tx = clamp((cw - dw) / 2 + panRef.current.x, cw - dw, 0);
    const ty = clamp((ch - dh) / 2 + panRef.current.y, ch - dh, 0);
    const srcW = cw / scale;
    const srcH = ch / scale;
    const srcX = clamp(-tx / scale, 0, image.naturalWidth - srcW);
    const srcY = clamp(-ty / scale, 0, image.naturalHeight - srcH);

    const outScale = Math.min(1, MAX_OUTPUT_EDGE / Math.max(cw, ch));
    const outW = Math.max(1, Math.round(cw * outScale));
    const outH = Math.max(1, Math.round(ch * outScale));
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

    const supported = ["image/png", "image/jpeg", "image/webp"];
    const mime = supported.includes(fileType) ? fileType : "image/jpeg";
    const extension = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const baseName = fileName.replace(/\.[^.]+$/, "") || "image";
        onConfirm(new File([blob], `${baseName}-cropped.${extension}`, { type: mime }));
      },
      mime,
      0.92,
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="裁剪图片"
      description="拖动图片调整位置，滑块或滚轮缩放，裁剪后点击完成即可上传。"
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" size="sm" onClick={onUseOriginal}>
            <SkipForward className="h-3.5 w-3.5" />
            跳过裁剪，使用原图
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={confirmCrop}
            disabled={!imageReady || viewport.width === 0}
          >
            <Check className="h-3.5 w-3.5" />
            完成裁剪
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div
          ref={containerRef}
          className="flex h-64 w-full items-center justify-center sm:h-80"
        >
          {viewport.width > 0 ? (
            <div
              ref={windowRef}
              style={{ width: viewport.width, height: viewport.height }}
              className="relative cursor-grab touch-none overflow-hidden rounded-lg bg-foreground/[0.06] select-none active:cursor-grabbing"
              onPointerDown={(event) => {
                if (!imageReady) return;
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                dragRef.current = {
                  pointerId: event.pointerId,
                  startX: event.clientX,
                  startY: event.clientY,
                  panX: panRef.current.x,
                  panY: panRef.current.y,
                };
              }}
              onPointerMove={(event) => {
                const drag = dragRef.current;
                if (!drag || event.pointerId !== drag.pointerId) return;
                panRef.current = {
                  x: drag.panX + (event.clientX - drag.startX),
                  y: drag.panY + (event.clientY - drag.startY),
                };
                applyTransform();
              }}
              onPointerUp={(event) => {
                if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
              }}
              onPointerCancel={(event) => {
                if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
              }}
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt=""
                draggable={false}
                onLoad={() => {
                  setImageReady(true);
                  applyTransform();
                }}
                className="absolute top-0 left-0 max-w-none select-none"
                style={{ transformOrigin: "0 0" }}
              />
              {/* 网格参考线 */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-1/3 right-0 left-0 h-px bg-white/30" />
                <div className="absolute top-2/3 right-0 left-0 h-px bg-white/30" />
                <div className="absolute top-0 bottom-0 left-1/3 w-px bg-white/30" />
                <div className="absolute top-0 bottom-0 left-2/3 w-px bg-white/30" />
              </div>
              {/* 裁剪框描边 */}
              <div className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-white/80" />
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">正在加载图片…</div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
            <ZoomIn className="h-3.5 w-3.5" />
            缩放
          </span>
          <RangeSlider
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.05}
            value={zoom}
            onChange={handleZoom}
            className="flex-1"
            aria-label="裁剪缩放"
            disabled={!imageReady}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-[11px] text-muted-foreground"
            onClick={resetCrop}
            disabled={!imageReady}
          >
            <RotateCcw className="h-3 w-3" />
            重置
          </Button>
        </div>
      </div>
    </Dialog>
  );
}