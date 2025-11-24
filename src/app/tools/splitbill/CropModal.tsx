import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CropPoint } from "./types";

interface CropModalProps {
  imageUrl: string;
  initialPolygon: CropPoint[];
  onClose: () => void;
  onApply: (croppedFile: File) => Promise<void>;
}

const DEFAULT_CROP_POLYGON: CropPoint[] = [
  { u: 0.02, v: 0.02 },
  { u: 0.98, v: 0.02 },
  { u: 0.98, v: 0.98 },
  { u: 0.02, v: 0.98 },
];

const cloneDefaultPolygon = () =>
  DEFAULT_CROP_POLYGON.map((point) => ({ ...point }));

export function CropModal({ imageUrl, initialPolygon, onClose, onApply }: CropModalProps) {
  const [cropPolygon, setCropPolygon] = useState<CropPoint[]>(
    initialPolygon.length ? initialPolygon : cloneDefaultPolygon()
  );
  const [activeHandle, setActiveHandle] = useState<number | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [cropAreaSize, setCropAreaSize] = useState({ width: 0, height: 0 });
  
  const cropAreaRef = useRef<HTMLDivElement>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);

  const refreshCropAreaSize = useCallback(() => {
    const container = cropAreaRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    setCropAreaSize({
      width: bounds.width,
      height: bounds.height,
    });
  }, []);

  useEffect(() => {
    refreshCropAreaSize();
    window.addEventListener("resize", refreshCropAreaSize);
    return () => window.removeEventListener("resize", refreshCropAreaSize);
  }, [refreshCropAreaSize]);

  // Update crop area size when image loads
  const handleImageLoad = () => {
    refreshCropAreaSize();
  };

  const updateHandlePosition = useCallback(
    (index: number, clientX: number, clientY: number) => {
      const container = cropAreaRef.current;
      if (!container) return;
      const bounds = container.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;

      const clamp = (value: number) => Math.min(Math.max(value, 0), 1);
      const u = clamp((clientX - bounds.left) / bounds.width);
      const v = clamp((clientY - bounds.top) / bounds.height);

      setCropPolygon((prev) => {
        const next = [...prev];
        next[index] = { u, v };
        return next;
      });
    },
    []
  );

  const handleHandlePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    index: number
  ) => {
    event.preventDefault();
    event.stopPropagation();
    updateHandlePosition(index, event.clientX, event.clientY);
    setActiveHandle(index);
    // Capture pointer for better touch/mouse handling
    try {
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
    } catch (error) {
      // Fallback for browsers that don't support pointer capture
      console.warn('Pointer capture not supported');
    }
  };

  useEffect(() => {
    if (activeHandle === null) return;
    
    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      updateHandlePosition(activeHandle, event.clientX, event.clientY);
    };

    const stopDragging = () => setActiveHandle(null);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [activeHandle, updateHandlePosition]);

  const handleResetHandles = () => {
    setCropPolygon(cloneDefaultPolygon());
  };

  const handleApply = async () => {
    if (isApplying) return;
    setIsApplying(true);
    
    try {
        const imageElement = cropImageRef.current;
        if (!imageElement) throw new Error("Image not loaded");

        const polygon = cropPolygon;
        const naturalWidth = imageElement.naturalWidth;
        const naturalHeight = imageElement.naturalHeight;

        const scaledPoints = polygon.map((point) => ({
            x: point.u * naturalWidth,
            y: point.v * naturalHeight,
        }));

        const xs = scaledPoints.map((p) => p.x);
        const ys = scaledPoints.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const sw = Math.round(maxX - minX);
        const sh = Math.round(maxY - minY);

        if (sw < 10 || sh < 10) {
            throw new Error("Crop selection is too small.");
        }

        const canvas = document.createElement("canvas");
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get canvas context");

        ctx.save();
        ctx.beginPath();
        scaledPoints.forEach((point, index) => {
            const dx = point.x - minX;
            const dy = point.y - minY;
            if (index === 0) ctx.moveTo(dx, dy);
            else ctx.lineTo(dx, dy);
        });
        ctx.closePath();
        ctx.clip();
        
        ctx.drawImage(imageElement, minX, minY, sw, sh, 0, 0, sw, sh);
        ctx.restore();
        
        // Fill background (in case of transparency)
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, sw, sh);

        // Use toBlob instead of toDataURL for better performance
        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], "cropped-receipt.png", { type: "image/png" });
                onApply(file).finally(() => setIsApplying(false));
            } else {
                setIsApplying(false);
            }
        }, "image/png", 1.0);

    } catch (error) {
        console.error(error);
        setIsApplying(false);
    }
  };

  // Render helpers
  const polygonForRendering = cropPolygon;
  const displayPolygonPoints =
    cropAreaSize.width > 0 && cropAreaSize.height > 0
      ? polygonForRendering.map((point) => ({
          x: point.u * cropAreaSize.width,
          y: point.v * cropAreaSize.height,
        }))
      : [];

  const polygonBounds = {
        minU: Math.min(...polygonForRendering.map((point) => point.u)),
        maxU: Math.max(...polygonForRendering.map((point) => point.u)),
        minV: Math.min(...polygonForRendering.map((point) => point.v)),
        maxV: Math.max(...polygonForRendering.map((point) => point.v)),
  };
  
  const selectionDisplayInfo = {
      width: Math.round((polygonBounds.maxU - polygonBounds.minU) * cropAreaSize.width),
      height: Math.round((polygonBounds.maxV - polygonBounds.minV) * cropAreaSize.height),
  };
  
  const selectionNaturalInfo = cropImageRef.current ? {
      width: Math.round((polygonBounds.maxU - polygonBounds.minU) * cropImageRef.current.naturalWidth),
      height: Math.round((polygonBounds.maxV - polygonBounds.minV) * cropImageRef.current.naturalHeight),
  } : null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl p-6 space-y-4 border-2 border-pink-200 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-2">
            ✂️ Crop receipt
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <p className="text-sm text-gray-500">
          Drag each handle to outline the receipt edges. Kirby will trim
          everything outside of your pink polygon.
        </p>
        <div className="mx-auto" style={{ maxWidth: "min(90vw, 900px)" }}>
          <div
            ref={cropAreaRef}
            className="relative inline-block overflow-hidden rounded-2xl bg-gray-100 shadow-inner touch-none select-none"
            style={{ maxHeight: "70vh" }}
          >
            <img
              ref={cropImageRef}
              src={imageUrl}
              alt="Receipt crop preview"
              className="block max-h-[70vh] w-auto max-w-full select-none pointer-events-none"
              draggable={false}
              onLoad={handleImageLoad}
            />
            {displayPolygonPoints.length === 4 && (
              <>
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width={cropAreaSize.width}
                  height={cropAreaSize.height}
                  viewBox={`0 0 ${cropAreaSize.width} ${cropAreaSize.height}`}
                >
                  <polygon
                    points={displayPolygonPoints
                      .map((point) => `${point.x},${point.y}`)
                      .join(" ")}
                    fill="rgba(236, 72, 153, 0.2)"
                    stroke="#ec4899"
                    strokeWidth={2}
                    strokeLinejoin="round"
                  />
                </svg>
                {displayPolygonPoints.map((point, index) => (
                  <button
                    key={`handle-${index}`}
                    type="button"
                    onPointerDown={(event) => handleHandlePointerDown(event, index)}
                    className={cn(
                      "absolute w-6 h-6 -mt-3 -ml-3 rounded-full border-2 shadow-lg pointer-events-auto transition-all duration-150 z-10",
                      "hover:scale-110 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2",
                      activeHandle === index
                        ? "border-pink-600 bg-pink-100 shadow-xl scale-110 cursor-grabbing"
                        : "border-pink-500 bg-white cursor-grab hover:border-pink-600"
                    )}
                    style={{
                      left: `${point.x}px`,
                      top: `${point.y}px`,
                      // Add subtle animation for better UX
                      transform: activeHandle === index ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    <span className="sr-only">
                      Move crop handle {index + 1}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            Selection: {selectionDisplayInfo.width} × {selectionDisplayInfo.height}px
            {selectionNaturalInfo && (
              <span className="text-gray-400">
                {" "}
                ({selectionNaturalInfo.width} × {selectionNaturalInfo.height}px source)
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={handleResetHandles}>
              Reset handles
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={isApplying}>
              {isApplying ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cropping…
                </span>
              ) : (
                "Apply crop"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

