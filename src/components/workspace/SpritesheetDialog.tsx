import { useState, useRef, useEffect, useMemo } from "react";
import {
  Upload,
  X,
  Download,
  AlertCircle,
  MoveHorizontal,
  MoveVertical,
} from "lucide-react";

interface SpritesheetDialogProps {
  onClose: () => void;
}

interface LoadedImage {
  id: string;
  name: string;
  image: HTMLImageElement;
  width: number;
  height: number;
}

type LayoutDirection = "row" | "column";

export function SpritesheetDialog({ onClose }: SpritesheetDialogProps) {
  const [images, setImages] = useState<LoadedImage[]>([]);
  const [gap, setGap] = useState(0);
  const [padding, setPadding] = useState(0);
  const [direction, setDirection] = useState<LayoutDirection>("row");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const MAX_SIZE = 2048;

  // Calculate layout dimensions
  const layout = useMemo(() => {
    const result = {
      width: 0,
      height: 0,
      exceedMax: false,
      frames: [] as {
        name: string;
        x: number;
        y: number;
        w: number;
        h: number;
      }[],
    };

    if (images.length > 0) {
      let currentX = padding;
      let currentY = padding;
      let maxWidth = padding;
      let maxHeight = padding;

      images.forEach((img) => {
        result.frames.push({
          name: img.name,
          x: currentX,
          y: currentY,
          w: img.width,
          h: img.height,
        });

        if (direction === "row") {
          maxWidth = currentX + img.width + padding;
          maxHeight = Math.max(maxHeight, currentY + img.height + padding);
          currentX += img.width + gap;
        } else {
          maxWidth = Math.max(maxWidth, currentX + img.width + padding);
          maxHeight = currentY + img.height + padding;
          currentY += img.height + gap;
        }
      });

      result.width = direction === "row" ? maxWidth : maxWidth;
      result.height = direction === "column" ? maxHeight : maxHeight;
      result.exceedMax = result.width > MAX_SIZE || result.height > MAX_SIZE;
    }

    return result;
  }, [images, padding, direction, gap]);

  // Draw preview
  useEffect(() => {
    if (!canvasRef.current || images.length === 0 || layout.exceedMax) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // We can scale down for preview if it's too big, but let's draw full size and let css handle it for now
    canvasRef.current.width = layout.width;
    canvasRef.current.height = layout.height;

    // Clear canvas (transparent)
    ctx.clearRect(0, 0, layout.width, layout.height);

    // Draw images
    layout.frames.forEach((frame, i) => {
      const img = images[i];
      if (img) ctx.drawImage(img.image, frame.x, frame.y, frame.w, frame.h);
    });
  }, [images, layout, gap, padding, direction]);

  const loadFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/"),
    );

    const newImages = await Promise.all(
      validFiles.map((file) => {
        return new Promise<LoadedImage>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            resolve({
              id: Math.random().toString(36).substring(7),
              name: file.name,
              image: img,
              width: img.width,
              height: img.height,
            });
          };
          img.onerror = reject;
          img.src = URL.createObjectURL(file);
        });
      }),
    );

    setImages((prev) => [...prev, ...newImages]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      loadFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      loadFiles(e.target.files);
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleExport = () => {
    if (layout.exceedMax || images.length === 0 || !canvasRef.current) return;

    // 1. Export PNG
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "spritesheet.png";
    a.click();

    // 2. Export JSON Metadata
    const framesData: Record<string, unknown> = {};
    layout.frames.forEach((frame) => {
      framesData[frame.name] = {
        frame: { x: frame.x, y: frame.y, w: frame.w, h: frame.h },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: frame.w, h: frame.h },
        sourceSize: { w: frame.w, h: frame.h },
      };
    });

    const metaData = {
      frames: framesData,
      meta: {
        app: "Pixalitos AI Pixel Art Editor",
        version: "1.0",
        image: "spritesheet.png",
        format: "RGBA8888",
        size: { w: layout.width, h: layout.height },
        scale: "1",
      },
    };

    const jsonStr = JSON.stringify(metaData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const jsonUrl = URL.createObjectURL(blob);

    const aJson = document.createElement("a");
    aJson.href = jsonUrl;
    aJson.download = "spritesheet.json";
    aJson.click();

    URL.revokeObjectURL(jsonUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1e2128] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-medium text-white">
            Spritesheet Generator
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel: Config and Input */}
          <div className="flex w-72 flex-col gap-6 overflow-y-auto border-r border-white/10 bg-[#191c23] p-4">
            {/* Layout Settings */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Layout Options
              </h3>

              <div className="flex rounded bg-black/20 p-1">
                <button
                  className={`flex flex-1 items-center justify-center gap-2 rounded px-2 py-1.5 text-xs font-medium transition-colors ${direction === "row" ? "bg-indigo-500 text-white" : "text-neutral-400 hover:text-white"}`}
                  onClick={() => setDirection("row")}
                >
                  <MoveHorizontal className="h-3 w-3" /> Row
                </button>
                <button
                  className={`flex flex-1 items-center justify-center gap-2 rounded px-2 py-1.5 text-xs font-medium transition-colors ${direction === "column" ? "bg-indigo-500 text-white" : "text-neutral-400 hover:text-white"}`}
                  onClick={() => setDirection("column")}
                >
                  <MoveVertical className="h-3 w-3" /> Column
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-neutral-300">Gap (px)</label>
                <input
                  type="number"
                  min="0"
                  value={gap}
                  onChange={(e) =>
                    setGap(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  className="w-full rounded border border-white/10 bg-black/20 px-2.5 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-neutral-300">Padding (px)</label>
                <input
                  type="number"
                  min="0"
                  value={padding}
                  onChange={(e) =>
                    setPadding(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  className="w-full rounded border border-white/10 bg-black/20 px-2.5 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Assets list & Upload */}
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Assets ({images.length})
                </h3>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Add Files
                </button>
              </div>

              <div
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors ${
                  isDragging
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-white/10 bg-black/10 hover:border-white/20"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() =>
                  images.length === 0 && fileInputRef.current?.click()
                }
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleFileInput}
                />

                {images.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 text-center text-neutral-400 cursor-pointer">
                    <Upload className="h-6 w-6 opacity-50" />
                    <span className="text-xs">
                      Drag & drop images here
                      <br />
                      or click to browse
                    </span>
                  </div>
                ) : (
                  <div className="flex max-h-[200px] w-full flex-col gap-2 overflow-y-auto pr-1">
                    {images.map((img) => (
                      <div
                        key={img.id}
                        className="flex items-center gap-2 rounded bg-white/5 p-1.5 text-xs text-white"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded bg-black/40">
                          <img
                            src={img.image.src}
                            alt={img.name}
                            className="max-h-full max-w-full object-contain [image-rendering:pixelated]"
                          />
                        </div>
                        <span className="flex-1 truncate" title={img.name}>
                          {img.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(img.id);
                          }}
                          className="shrink-0 p-1 text-neutral-500 hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right panel: Preview */}
          <div className="flex flex-1 flex-col bg-[#1e2128]">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
              <span className="text-xs text-neutral-400">
                {images.length > 0
                  ? `Output: ${layout.width} × ${layout.height}px`
                  : "Preview"}
              </span>

              {layout.exceedMax && (
                <span className="flex items-center gap-1.5 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Max size {MAX_SIZE}px exceeded
                </span>
              )}
            </div>

            <div
              ref={containerRef}
              className="relative flex flex-1 items-center justify-center overflow-auto bg-black/20 p-8"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h8v8H0zM8 8h8v8H8z' fill='%232a2d36' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E\")",
                backgroundSize: "16px 16px",
              }}
            >
              {images.length > 0 ? (
                <canvas
                  ref={canvasRef}
                  className="max-w-full object-contain [image-rendering:pixelated] shadow-lg"
                  style={{
                    maxHeight: "100%",
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.1)",
                  }}
                />
              ) : (
                <span className="text-sm text-neutral-500">
                  Add images to see preview
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/10 bg-[#191c23] p-4">
              <button
                onClick={onClose}
                className="rounded px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={images.length === 0 || layout.exceedMax}
                className="flex items-center gap-2 rounded bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                Export Assets
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
