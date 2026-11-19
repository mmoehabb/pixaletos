import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Clipboard,
  FlipHorizontal2,
  Grid,
  Image as ImageIcon,
  Maximize2,
  Minus,
  Pipette,
  RotateCcw,
  Scan,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useAppStore } from "../../store";
import {
  clampOverlayRect,
  computeCameraViewportRect,
  REFERENCE_VIEW_HEADER_HEIGHT,
  useReferenceViewStore,
} from "../../store/referenceView";
import { compositeLayersToCanvas } from "../../utils/compositeLayers";

type ResizeDir = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0"))
      .join("")
  );
}

const ReferenceImageBody: React.FC = () => {
  const {
    imageUrl,
    imageName,
    imageNaturalSize,
    imageZoom,
    imagePan,
    imagePixelated,
    imageFlipX,
    isPickingColor,
    setImage,
    setImageNaturalSize,
    clearImage,
    setImageZoom,
    setImagePan,
    resetImageView,
    setImagePixelated,
    setImageFlipX,
    setIsPickingColor,
  } = useReferenceViewStore();

  const currentTool = useAppStore((s) => s.currentTool);
  const setForegroundColor = useAppStore((s) => s.setForegroundColor);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const panDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originPanX: number;
    originPanY: number;
  } | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      imgRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImageNaturalSize({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      setImgLoaded((v) => v + 1);
    };
    img.src = imageUrl;
    return () => {
      img.onload = null;
    };
  }, [imageUrl, setImageNaturalSize]);

  const drawImageCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const img = imgRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    const dpr = window.devicePixelRatio || 1;

    if (
      canvas.width !== Math.floor(w * dpr) ||
      canvas.height !== Math.floor(h * dpr)
    ) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (!img || !img.complete || img.naturalWidth === 0) return;

    const baseScale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const scale = baseScale * imageZoom;
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;

    ctx.save();
    ctx.imageSmoothingEnabled = !imagePixelated;
    ctx.translate(w / 2 + imagePan.x, h / 2 + imagePan.y);
    if (imageFlipX) {
      ctx.scale(-1, 1);
    }
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [imageZoom, imagePan, imagePixelated, imageFlipX, imgLoaded]);

  useEffect(() => {
    drawImageCanvas();
  }, [drawImageCanvas]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => drawImageCanvas());
    observer.observe(container);
    return () => observer.disconnect();
  }, [drawImageCanvas]);

  const handleFileList = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type.startsWith("image/")) {
      setImage(file, file.name);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.read) return;
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          setImage(blob, "Pasted reference");
          return;
        }
      }
    } catch {
      /* Clipboard permission denied or empty. */
    }
  };

  const pickColorAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / Math.max(1, rect.width);
    const px = Math.floor((clientX - rect.left) * dpr);
    const py = Math.floor((clientY - rect.top) * dpr);
    if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const data = ctx.getImageData(px, py, 1, 1).data;
    if (data[3] === 0) return;
    setForegroundColor(rgbToHex(data[0], data[1], data[2]));
  };

  const effectiveEyedropper = isPickingColor || currentTool === "eyedropper";

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFileList(e.target.files);
          e.target.value = "";
        }}
      />

      <div
        ref={containerRef}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFileList(e.dataTransfer.files);
        }}
        onWheel={(e) => {
          if (!imageUrl) return;
          e.preventDefault();
          const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
          setImageZoom(imageZoom * factor);
        }}
        onPointerDown={(e) => {
          if (!imageUrl) return;
          if (effectiveEyedropper || e.altKey) {
            e.preventDefault();
            pickColorAt(e.clientX, e.clientY);
            if (isPickingColor) setIsPickingColor(false);
            return;
          }
          if (e.button !== 0 && e.button !== 1) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          panDragRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            originPanX: imagePan.x,
            originPanY: imagePan.y,
          };
        }}
        onPointerMove={(e) => {
          const drag = panDragRef.current;
          if (!drag || drag.pointerId !== e.pointerId) return;
          setImagePan({
            x: drag.originPanX + (e.clientX - drag.startX),
            y: drag.originPanY + (e.clientY - drag.startY),
          });
        }}
        onPointerUp={(e) => {
          if (panDragRef.current?.pointerId === e.pointerId) {
            panDragRef.current = null;
          }
        }}
        onPointerCancel={(e) => {
          if (panDragRef.current?.pointerId === e.pointerId) {
            panDragRef.current = null;
          }
        }}
        className={`relative flex-1 min-h-0 overflow-hidden bg-[#111318] select-none touch-none ${
          isDragOver ? "ring-2 ring-inset ring-indigo-400 bg-indigo-500/10" : ""
        } ${
          imageUrl
            ? effectiveEyedropper
              ? "cursor-crosshair"
              : "cursor-grab active:cursor-grabbing"
            : ""
        }`}
      >
        {imageUrl ? (
          <canvas
            ref={canvasRef}
            aria-label={imageName || "Reference image"}
            className="h-full w-full block"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 p-4 text-center text-xs text-neutral-400">
            <ImageIcon size={24} className="text-neutral-500" />
            <p className="max-w-[190px] leading-relaxed">
              Drop a reference image here, or open one from disk or clipboard.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded bg-indigo-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-400 transition-colors"
              >
                <Upload size={12} />
                Open Image
              </button>
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-neutral-200 hover:bg-white/10 transition-colors"
                title="Paste image from clipboard"
              >
                <Clipboard size={12} />
                Paste
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Image Mode Footer Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 border-t border-white/8 bg-[#20242c] px-2 py-1 text-[11px] text-neutral-300">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Open reference image"
            className="rounded p-1 hover:bg-white/10 hover:text-white"
          >
            <Upload size={13} />
          </button>
          <button
            type="button"
            disabled={!imageUrl}
            onClick={() => setImageZoom(imageZoom * 1.25)}
            title="Zoom in"
            className="rounded p-1 hover:bg-white/10 hover:text-white disabled:opacity-35"
          >
            <ZoomIn size={13} />
          </button>
          <button
            type="button"
            disabled={!imageUrl}
            onClick={() => setImageZoom(imageZoom / 1.25)}
            title="Zoom out"
            className="rounded p-1 hover:bg-white/10 hover:text-white disabled:opacity-35"
          >
            <ZoomOut size={13} />
          </button>
          <button
            type="button"
            disabled={!imageUrl}
            onClick={resetImageView}
            title="Fit / Reset view"
            className="rounded p-1 hover:bg-white/10 hover:text-white disabled:opacity-35"
          >
            <RotateCcw size={13} />
          </button>
          <button
            type="button"
            disabled={!imageUrl}
            onClick={() => setImageFlipX(!imageFlipX)}
            title="Flip horizontal"
            className={`rounded p-1 transition-colors disabled:opacity-35 ${
              imageFlipX
                ? "bg-indigo-500/25 text-indigo-300"
                : "hover:bg-white/10 hover:text-white"
            }`}
          >
            <FlipHorizontal2 size={13} />
          </button>
          <button
            type="button"
            disabled={!imageUrl}
            onClick={() => setImagePixelated(!imagePixelated)}
            title={
              imagePixelated
                ? "Pixelated rendering (click for smooth)"
                : "Smooth rendering (click for pixelated)"
            }
            className={`rounded p-1 transition-colors disabled:opacity-35 ${
              imagePixelated
                ? "bg-indigo-500/25 text-indigo-300"
                : "hover:bg-white/10 hover:text-white"
            }`}
          >
            <Grid size={13} />
          </button>
          <button
            type="button"
            disabled={!imageUrl}
            onClick={() => setIsPickingColor(!isPickingColor)}
            title="Pick color from reference (or Alt+Click)"
            className={`rounded p-1 transition-colors disabled:opacity-35 ${
              isPickingColor
                ? "bg-indigo-500/25 text-indigo-300"
                : "hover:bg-white/10 hover:text-white"
            }`}
          >
            <Pipette size={13} />
          </button>
          {imageUrl && (
            <button
              type="button"
              onClick={clearImage}
              title="Clear reference image"
              className="rounded p-1 text-neutral-400 hover:bg-red-500/20 hover:text-red-300"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>

        <span className="truncate max-w-[90px] text-[10px] text-neutral-400">
          {imageNaturalSize
            ? `${imageNaturalSize.width}×${imageNaturalSize.height}`
            : `${Math.round(imageZoom * 100)}%`}
        </span>
      </div>
    </div>
  );
};

const CanvasCameraBody: React.FC = () => {
  const layers = useAppStore((s) => s.layers);
  const dimensions = useAppStore((s) => s.dimensions);
  const pan = useAppStore((s) => s.pan);
  const zoom = useAppStore((s) => s.zoom);
  const setPan = useAppStore((s) => s.setPan);

  const {
    cameraScaleMode,
    showViewportRect,
    canvasViewportSize,
    setCameraScaleMode,
    setShowViewportRect,
  } = useReferenceViewStore();

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const isPanningCameraRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      if (
        canvas.width !== dimensions.width ||
        canvas.height !== dimensions.height
      ) {
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      if (!scratchCanvasRef.current) {
        scratchCanvasRef.current = document.createElement("canvas");
      }
      compositeLayersToCanvas(
        ctx,
        scratchCanvasRef.current,
        layers,
        dimensions.width,
        dimensions.height,
      );
    });

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [layers, dimensions]);

  const viewportRect = showViewportRect
    ? computeCameraViewportRect(pan, zoom, dimensions, canvasViewportSize)
    : null;

  const isViewportSmallerThanCanvas =
    viewportRect !== null &&
    (viewportRect.width < dimensions.width ||
      viewportRect.height < dimensions.height ||
      viewportRect.x > 0 ||
      viewportRect.y > 0);

  const panMainCanvasToClientPoint = (clientX: number, clientY: number) => {
    const canvas = previewCanvasRef.current;
    if (
      !canvas ||
      canvasViewportSize.width <= 0 ||
      canvasViewportSize.height <= 0
    )
      return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const normX = (clientX - rect.left) / rect.width;
    const normY = (clientY - rect.top) / rect.height;
    const targetPixelX = Math.max(
      0,
      Math.min(dimensions.width, normX * dimensions.width),
    );
    const targetPixelY = Math.max(
      0,
      Math.min(dimensions.height, normY * dimensions.height),
    );

    // Center the main canvas viewport on (targetPixelX, targetPixelY)
    const newCanvasLeft = canvasViewportSize.width / 2 - targetPixelX * zoom;
    const newCanvasTop = canvasViewportSize.height / 2 - targetPixelY * zoom;

    setPan({
      x: newCanvasLeft - (dimensions.width * (1 - zoom)) / 2,
      y: newCanvasTop - (dimensions.height * (1 - zoom)) / 2,
    });
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="relative flex flex-1 min-h-0 items-center justify-center overflow-auto bg-[#111318] p-2 select-none touch-none">
        <div
          className="relative shadow-md"
          style={{
            width: cameraScaleMode === "1:1" ? `${dimensions.width}px` : "100%",
            height:
              cameraScaleMode === "1:1" ? `${dimensions.height}px` : "100%",
            maxWidth: "100%",
            maxHeight: "100%",
            aspectRatio: `${dimensions.width} / ${dimensions.height}`,
          }}
        >
          <canvas
            ref={previewCanvasRef}
            aria-label="Canvas camera preview"
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              isPanningCameraRef.current = e.pointerId;
              panMainCanvasToClientPoint(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (isPanningCameraRef.current !== e.pointerId) return;
              panMainCanvasToClientPoint(e.clientX, e.clientY);
            }}
            onPointerUp={(e) => {
              if (isPanningCameraRef.current === e.pointerId) {
                isPanningCameraRef.current = null;
              }
            }}
            onPointerCancel={(e) => {
              if (isPanningCameraRef.current === e.pointerId) {
                isPanningCameraRef.current = null;
              }
            }}
            className="h-full w-full block cursor-crosshair rounded-[2px]"
            style={{
              imageRendering: "pixelated",
              backgroundColor: "#cbd3df",
              backgroundSize: "8px 8px",
              backgroundImage:
                "conic-gradient(#eef2f7 25%, #cbd3df 0 50%, #eef2f7 0 75%, #cbd3df 0)",
            }}
          />

          {viewportRect && isViewportSmallerThanCanvas && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute border border-indigo-400 bg-indigo-400/15 shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
              style={{
                left: `${(viewportRect.x / dimensions.width) * 100}%`,
                top: `${(viewportRect.y / dimensions.height) * 100}%`,
                width: `${(viewportRect.width / dimensions.width) * 100}%`,
                height: `${(viewportRect.height / dimensions.height) * 100}%`,
              }}
            />
          )}
        </div>
      </div>

      {/* Camera Mode Footer Toolbar */}
      <div className="flex items-center justify-between gap-1 border-t border-white/8 bg-[#20242c] px-2 py-1 text-[11px] text-neutral-300">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              setCameraScaleMode(cameraScaleMode === "fit" ? "1:1" : "fit")
            }
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
              cameraScaleMode === "1:1"
                ? "bg-indigo-500/25 text-indigo-300"
                : "bg-white/5 text-neutral-300 hover:bg-white/10"
            }`}
            title="Toggle between Fit and 1:1 native pixel size"
          >
            {cameraScaleMode === "1:1" ? "1:1" : "Fit"}
          </button>
          <button
            type="button"
            onClick={() => setShowViewportRect(!showViewportRect)}
            className={`rounded p-1 transition-colors ${
              showViewportRect
                ? "bg-indigo-500/25 text-indigo-300"
                : "hover:bg-white/10 hover:text-white"
            }`}
            title="Toggle viewport indicator box"
          >
            <Scan size={13} />
          </button>
        </div>

        <span className="text-[10px] text-neutral-400">
          {dimensions.width}×{dimensions.height}
        </span>
      </div>
    </div>
  );
};

export const ReferenceView: React.FC = () => {
  const {
    isOpen,
    isMinimized,
    mode,
    position,
    size,
    opacity,
    setOpen,
    toggleMinimized,
    setMode,
    setPosition,
    setRect,
    setOpacity,
  } = useReferenceViewStore();

  const overlayRef = useRef<HTMLDivElement>(null);

  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const resizeStateRef = useRef<{
    pointerId: number;
    dir: ResizeDir;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    originW: number;
    originH: number;
  } | null>(null);

  const getParentBounds = useCallback(() => {
    const parent = overlayRef.current?.parentElement;
    if (!parent)
      return { width: window.innerWidth, height: window.innerHeight };
    const rect = parent.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }, []);

  // Re-clamp overlay when workspace container resizes
  useEffect(() => {
    if (!isOpen) return;
    const parent = overlayRef.current?.parentElement;
    if (!parent) return;

    const observer = new ResizeObserver(() => {
      const bounds = getParentBounds();
      const state = useReferenceViewStore.getState();
      const clamped = clampOverlayRect(
        state.position,
        state.size,
        bounds,
        state.isMinimized,
      );
      if (
        clamped.position.x !== state.position.x ||
        clamped.position.y !== state.position.y ||
        clamped.size.width !== state.size.width ||
        clamped.size.height !== state.size.height
      ) {
        state.setRect(clamped.position, clamped.size);
      }
    });

    observer.observe(parent);
    return () => observer.disconnect();
  }, [isOpen, getParentBounds]);

  if (!isOpen) return null;

  const startResize = (dir: ResizeDir) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeStateRef.current = {
      pointerId: e.pointerId,
      dir,
      startX: e.clientX,
      startY: e.clientY,
      originX: position.x,
      originY: position.y,
      originW: size.width,
      originH: size.height,
    };
  };

  const handleResizeMove = (e: React.PointerEvent) => {
    const rs = resizeStateRef.current;
    if (!rs || rs.pointerId !== e.pointerId) return;
    e.stopPropagation();

    const dx = e.clientX - rs.startX;
    const dy = e.clientY - rs.startY;

    let nextX = rs.originX;
    let nextY = rs.originY;
    let nextW = rs.originW;
    let nextH = rs.originH;

    if (rs.dir.includes("e")) nextW = rs.originW + dx;
    if (rs.dir.includes("s")) nextH = rs.originH + dy;
    if (rs.dir.includes("w")) {
      nextW = rs.originW - dx;
      nextX = rs.originX + dx;
    }
    if (rs.dir.includes("n")) {
      nextH = rs.originH - dy;
      nextY = rs.originY + dy;
    }

    const bounds = getParentBounds();
    const clamped = clampOverlayRect(
      { x: nextX, y: nextY },
      { width: nextW, height: nextH },
      bounds,
      false,
    );
    setRect(clamped.position, clamped.size);
  };

  const endResize = (e: React.PointerEvent) => {
    if (resizeStateRef.current?.pointerId === e.pointerId) {
      resizeStateRef.current = null;
    }
  };

  return (
    <div
      ref={overlayRef}
      data-reference-view
      role="region"
      aria-label="Reference View"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: isMinimized
          ? `${REFERENCE_VIEW_HEADER_HEIGHT}px`
          : `${size.height}px`,
        opacity,
      }}
      className="absolute z-30 flex flex-col overflow-hidden rounded-lg border border-white/12 bg-[#191c23] text-neutral-200 shadow-2xl"
    >
      {/* Title Bar / Drag Handle */}
      <div
        data-reference-header
        onDoubleClick={toggleMinimized}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          dragStateRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            originX: position.x,
            originY: position.y,
          };
        }}
        onPointerMove={(e) => {
          const drag = dragStateRef.current;
          if (!drag || drag.pointerId !== e.pointerId) return;
          const bounds = getParentBounds();
          const clamped = clampOverlayRect(
            {
              x: drag.originX + (e.clientX - drag.startX),
              y: drag.originY + (e.clientY - drag.startY),
            },
            size,
            bounds,
            isMinimized,
          );
          setPosition(clamped.position);
        }}
        onPointerUp={(e) => {
          if (dragStateRef.current?.pointerId === e.pointerId) {
            dragStateRef.current = null;
          }
        }}
        onPointerCancel={(e) => {
          if (dragStateRef.current?.pointerId === e.pointerId) {
            dragStateRef.current = null;
          }
        }}
        className="flex h-[34px] flex-shrink-0 cursor-move items-center justify-between gap-2 border-b border-white/8 bg-[#232730] px-2 select-none touch-none"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-semibold tracking-wide text-neutral-300 truncate">
            Reference
          </span>
          <div className="flex items-center rounded bg-[#14171d] p-0.5">
            <button
              type="button"
              onClick={() => setMode("image")}
              className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                mode === "image"
                  ? "bg-indigo-500 text-white"
                  : "text-neutral-400 hover:text-white"
              }`}
              title="External Reference Image"
            >
              <ImageIcon size={11} />
              Image
            </button>
            <button
              type="button"
              onClick={() => setMode("canvas")}
              className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                mode === "canvas"
                  ? "bg-indigo-500 text-white"
                  : "text-neutral-400 hover:text-white"
              }`}
              title="Whole Canvas Camera"
            >
              <Camera size={11} />
              Canvas
            </button>
          </div>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            type="button"
            aria-label={
              isMinimized ? "Restore reference view" : "Minimize reference view"
            }
            onClick={toggleMinimized}
            className="rounded p-1 text-neutral-400 hover:bg-white/10 hover:text-white"
            title={isMinimized ? "Restore" : "Minimize"}
          >
            {isMinimized ? <Maximize2 size={12} /> : <Minus size={12} />}
          </button>
          <button
            type="button"
            aria-label="Close reference view"
            onClick={() => setOpen(false)}
            className="rounded p-1 text-neutral-400 hover:bg-red-500/20 hover:text-red-300"
            title="Close"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Body */}
      {!isMinimized && (
        <>
          {mode === "image" ? <ReferenceImageBody /> : <CanvasCameraBody />}

          {/* Opacity Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-white/8 bg-[#191c23] px-2 py-1 text-[10px] text-neutral-400">
            <span>Opacity</span>
            <input
              type="range"
              aria-label="Reference view opacity"
              min={0.3}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="h-1 w-24 accent-indigo-500 cursor-pointer"
            />
            <span className="w-7 text-right tabular-nums">
              {Math.round(opacity * 100)}%
            </span>
          </div>

          {/* Resize Handles */}
          <div
            onPointerDown={startResize("n")}
            onPointerMove={handleResizeMove}
            onPointerUp={endResize}
            onPointerCancel={endResize}
            className="absolute top-0 left-2 right-2 h-1 cursor-ns-resize"
          />
          <div
            onPointerDown={startResize("s")}
            onPointerMove={handleResizeMove}
            onPointerUp={endResize}
            onPointerCancel={endResize}
            className="absolute bottom-0 left-2 right-2 h-1 cursor-ns-resize"
          />
          <div
            onPointerDown={startResize("w")}
            onPointerMove={handleResizeMove}
            onPointerUp={endResize}
            onPointerCancel={endResize}
            className="absolute top-2 bottom-2 left-0 w-1 cursor-ew-resize"
          />
          <div
            onPointerDown={startResize("e")}
            onPointerMove={handleResizeMove}
            onPointerUp={endResize}
            onPointerCancel={endResize}
            className="absolute top-2 bottom-2 right-0 w-1 cursor-ew-resize"
          />
          <div
            onPointerDown={startResize("nw")}
            onPointerMove={handleResizeMove}
            onPointerUp={endResize}
            onPointerCancel={endResize}
            className="absolute top-0 left-0 h-2.5 w-2.5 cursor-nwse-resize"
          />
          <div
            onPointerDown={startResize("ne")}
            onPointerMove={handleResizeMove}
            onPointerUp={endResize}
            onPointerCancel={endResize}
            className="absolute top-0 right-0 h-2.5 w-2.5 cursor-nesw-resize"
          />
          <div
            onPointerDown={startResize("sw")}
            onPointerMove={handleResizeMove}
            onPointerUp={endResize}
            onPointerCancel={endResize}
            className="absolute bottom-0 left-0 h-2.5 w-2.5 cursor-nesw-resize"
          />
          <div
            data-resize-handle="se"
            onPointerDown={startResize("se")}
            onPointerMove={handleResizeMove}
            onPointerUp={endResize}
            onPointerCancel={endResize}
            className="absolute bottom-0 right-0 h-3 w-3 cursor-nwse-resize"
            title="Resize"
          />
        </>
      )}
    </div>
  );
};
