"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CropPoint } from "./types";

const DEFAULT_CROP_POLYGON: CropPoint[] = [
  { u: 0.02, v: 0.02 },
  { u: 0.98, v: 0.02 },
  { u: 0.98, v: 0.98 },
  { u: 0.02, v: 0.98 },
];

const cloneDefaultPolygon = () =>
  DEFAULT_CROP_POLYGON.map((point) => ({ ...point }));

const clonePolygon = (polygon?: CropPoint[]) =>
  polygon?.length ? polygon.map((point) => ({ ...point })) : cloneDefaultPolygon();

const clampUnit = (value: number) => Math.min(Math.max(value, 0), 1);
const MAX_EDGE = 2048;

type CropModalProps = {
  imageUrl: string;
  initialPolygon?: CropPoint[];
  onClose: () => void;
  onApply: (croppedFile: File) => void | Promise<void>;
};

type SelectionSize = {
  displayWidth: number;
  displayHeight: number;
  sourceWidth: number;
  sourceHeight: number;
};

const getPolygonBounds = (polygon: CropPoint[]) => {
  const us = polygon.map((point) => point.u);
  const vs = polygon.map((point) => point.v);

  return {
    minU: Math.min(...us),
    maxU: Math.max(...us),
    minV: Math.min(...vs),
    maxV: Math.max(...vs),
  };
};

const toSvgPoints = (polygon: CropPoint[], width: number, height: number) =>
  polygon.map((point) => `${point.u * width},${point.v * height}`).join(" ");

const toEvenOddPath = (polygon: CropPoint[], width: number, height: number) => {
  const points = polygon.map((point) => ({
    x: point.u * width,
    y: point.v * height,
  }));
  const innerPath = points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");

  return `M 0 0 H ${width} V ${height} H 0 Z ${innerPath} Z`;
};

const getCroppedFileName = (imageUrl: string) => {
  try {
    const pathName = new URL(imageUrl, window.location.href).pathname;
    const fileName = decodeURIComponent(pathName.split("/").pop() || "");
    const baseName = fileName.replace(/\.[^.]+$/, "") || "receipt";

    return `${baseName}-cropped.jpg`;
  } catch {
    return "receipt-cropped.jpg";
  }
};

export function CropModal({ imageUrl, initialPolygon, onClose, onApply }: CropModalProps) {
  const [cropPolygon, setCropPolygon] = useState<CropPoint[]>(() =>
    clonePolygon(initialPolygon)
  );
  const [activeHandle, setActiveHandle] = useState<number | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [cropAreaSize, setCropAreaSize] = useState({ width: 0, height: 0 });
  const [selectionSize, setSelectionSize] = useState<SelectionSize>({
    displayWidth: 0,
    displayHeight: 0,
    sourceWidth: 0,
    sourceHeight: 0,
  });
  const [applyError, setApplyError] = useState<string | null>(null);

  const cropAreaRef = useRef<HTMLDivElement>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);
  const polygonRef = useRef<CropPoint[]>(clonePolygon(initialPolygon));
  const handlesRef = useRef<Array<HTMLButtonElement | null>>([]);
  const polygonElRef = useRef<SVGPolygonElement>(null);
  const dimPathRef = useRef<SVGPathElement>(null);
  const rafRef = useRef<number | null>(null);
  const activePointerRef = useRef<{ index: number; pointerId: number } | null>(
    null
  );

  const writePolygonToDom = useCallback((polygon: CropPoint[]) => {
    const container = cropAreaRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;

    polygonElRef.current?.setAttribute(
      "points",
      toSvgPoints(polygon, width, height)
    );
    dimPathRef.current?.setAttribute("d", toEvenOddPath(polygon, width, height));

    polygon.forEach((point, index) => {
      const handle = handlesRef.current[index];
      if (!handle) return;

      handle.style.left = `${point.u * width}px`;
      handle.style.top = `${point.v * height}px`;
    });
  }, []);

  const scheduleDomUpdate = useCallback(() => {
    if (rafRef.current !== null) return;

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      writePolygonToDom(polygonRef.current);
    });
  }, [writePolygonToDom]);

  const updateSelectionSize = useCallback((polygon: CropPoint[]) => {
    const container = cropAreaRef.current;
    const image = cropImageRef.current;
    if (!container || !image) return;

    const bounds = getPolygonBounds(polygon);

    setSelectionSize({
      displayWidth: Math.round((bounds.maxU - bounds.minU) * container.clientWidth),
      displayHeight: Math.round(
        (bounds.maxV - bounds.minV) * container.clientHeight
      ),
      sourceWidth: Math.round((bounds.maxU - bounds.minU) * image.naturalWidth),
      sourceHeight: Math.round((bounds.maxV - bounds.minV) * image.naturalHeight),
    });
  }, []);

  const refreshCropAreaSize = useCallback(() => {
    const container = cropAreaRef.current;
    if (!container) return;

    setCropAreaSize({
      width: container.clientWidth,
      height: container.clientHeight,
    });
    writePolygonToDom(polygonRef.current);
    updateSelectionSize(polygonRef.current);
  }, [updateSelectionSize, writePolygonToDom]);

  const setPointFromPointer = useCallback(
    (index: number, clientX: number, clientY: number) => {
      const container = cropAreaRef.current;
      if (!container) return;

      const bounds = container.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;

      const nextPolygon = polygonRef.current.map((point) => ({ ...point }));
      nextPolygon[index] = {
        u: clampUnit((clientX - bounds.left) / bounds.width),
        v: clampUnit((clientY - bounds.top) / bounds.height),
      };
      polygonRef.current = nextPolygon;
      scheduleDomUpdate();
    },
    [scheduleDomUpdate]
  );

  const commitLivePolygon = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const nextPolygon = polygonRef.current.map((point) => ({ ...point }));
    writePolygonToDom(nextPolygon);
    setCropPolygon(nextPolygon);
    setActiveHandle(null);
    activePointerRef.current = null;
    updateSelectionSize(nextPolygon);
  }, [updateSelectionSize, writePolygonToDom]);

  const handleImageLoad = useCallback(() => {
    refreshCropAreaSize();
  }, [refreshCropAreaSize]);

  const handleHandlePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    index: number
  ) => {
    event.preventDefault();
    event.stopPropagation();

    polygonRef.current = cropPolygon.map((point) => ({ ...point }));
    activePointerRef.current = { index, pointerId: event.pointerId };
    setActiveHandle(index);
    setPointFromPointer(index, event.clientX, event.clientY);

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleHandlePointerMove = (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    const activePointer = activePointerRef.current;
    if (!activePointer || activePointer.pointerId !== event.pointerId) return;

    event.preventDefault();
    setPointFromPointer(activePointer.index, event.clientX, event.clientY);
  };

  const handleHandlePointerUp = (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    const activePointer = activePointerRef.current;
    if (!activePointer || activePointer.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    commitLivePolygon();
  };

  const handleHandlePointerCancel = (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    commitLivePolygon();
  };

  const handleResetHandles = () => {
    const nextPolygon = cloneDefaultPolygon();
    polygonRef.current = nextPolygon;
    setCropPolygon(nextPolygon);
    setActiveHandle(null);
    setApplyError(null);
    writePolygonToDom(nextPolygon);
    updateSelectionSize(nextPolygon);
  };

  const handleApply = async () => {
    if (isApplying) return;

    const imageElement = cropImageRef.current;
    if (!imageElement) {
      setApplyError("Image is still loading. Try again in a moment.");
      return;
    }

    setApplyError(null);
    setIsApplying(true);

    try {
      const polygon = polygonRef.current.length ? polygonRef.current : cropPolygon;
      const naturalWidth = imageElement.naturalWidth;
      const naturalHeight = imageElement.naturalHeight;
      const sourcePoints = polygon.map((point) => ({
        x: point.u * naturalWidth,
        y: point.v * naturalHeight,
      }));

      const minX = Math.max(0, Math.floor(Math.min(...sourcePoints.map((p) => p.x))));
      const maxX = Math.min(
        naturalWidth,
        Math.ceil(Math.max(...sourcePoints.map((p) => p.x)))
      );
      const minY = Math.max(0, Math.floor(Math.min(...sourcePoints.map((p) => p.y))));
      const maxY = Math.min(
        naturalHeight,
        Math.ceil(Math.max(...sourcePoints.map((p) => p.y)))
      );
      const sw = maxX - minX;
      const sh = maxY - minY;

      if (sw < 10 || sh < 10) {
        throw new Error("Crop selection must be at least 10px wide and tall.");
      }

      const scale = Math.min(1, MAX_EDGE / Math.max(sw, sh));
      const dw = Math.max(1, Math.round(sw * scale));
      const dh = Math.max(1, Math.round(sh * scale));
      const canvas = document.createElement("canvas");
      canvas.width = dw;
      canvas.height = dh;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create crop canvas.");

      ctx.save();
      ctx.beginPath();
      sourcePoints.forEach((point, index) => {
        const x = (point.x - minX) * scale;
        const y = (point.y - minY) * scale;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(imageElement, minX, minY, sw, sh, 0, 0, dw, dh);
      ctx.restore();

      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, dw, dh);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (nextBlob) => {
            if (nextBlob) {
              resolve(nextBlob);
            } else {
              reject(new Error("Could not encode cropped image."));
            }
          },
          "image/jpeg",
          0.92
        );
      });

      await onApply(
        new File([blob], getCroppedFileName(imageUrl), {
          type: "image/jpeg",
        })
      );
    } catch (error) {
      setApplyError(
        error instanceof Error ? error.message : "Could not crop the image."
      );
    } finally {
      setIsApplying(false);
    }
  };

  useEffect(() => {
    window.addEventListener("resize", refreshCropAreaSize);
    return () => {
      window.removeEventListener("resize", refreshCropAreaSize);
    };
  }, [refreshCropAreaSize]);

  useEffect(() => {
    writePolygonToDom(cropPolygon);
  }, [cropAreaSize, cropPolygon, writePolygonToDom]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const hasCropArea = cropAreaSize.width > 0 && cropAreaSize.height > 0;
  const initialPoints = hasCropArea
    ? toSvgPoints(cropPolygon, cropAreaSize.width, cropAreaSize.height)
    : "";
  const initialDimPath = hasCropArea
    ? toEvenOddPath(cropPolygon, cropAreaSize.width, cropAreaSize.height)
    : "";

  return (
    <div className="sb-modal-backdrop">
      <div
        className="sb-modal sb-modal-wide space-y-4"
        role="dialog"
        aria-labelledby="sb-crop-title"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 id="sb-crop-title" className="sb-heading text-lg">
            Crop receipt
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="sb-icon-btn"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-[var(--sb-slate)]">
          Drag each handle to outline the receipt edges. Everything outside the
          selection is trimmed before OCR.
        </p>
        <div className="mx-auto" style={{ maxWidth: "min(90vw, 900px)" }}>
          <div
            ref={cropAreaRef}
            className="relative inline-block touch-none select-none overflow-hidden rounded-xl border-2 border-[var(--sb-line)] bg-[var(--sb-paper)]"
            style={{ maxHeight: "70vh" }}
          >
            {/* The crop preview must render the exact object/data URL loaded by the user. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={cropImageRef}
              src={imageUrl}
              alt="Receipt crop preview"
              className="block max-h-[70vh] w-auto max-w-full select-none pointer-events-none"
              draggable={false}
              onLoad={handleImageLoad}
            />
            {hasCropArea && (
              <>
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width={cropAreaSize.width}
                  height={cropAreaSize.height}
                  viewBox={`0 0 ${cropAreaSize.width} ${cropAreaSize.height}`}
                >
                  <path
                    ref={dimPathRef}
                    d={initialDimPath}
                    fill="rgba(28,25,23,0.55)"
                    fillRule="evenodd"
                  />
                  <polygon
                    ref={polygonElRef}
                    points={initialPoints}
                    fill="rgba(196, 92, 38, 0.08)"
                    stroke="var(--sb-accent)"
                    strokeWidth={2}
                    strokeLinejoin="round"
                  />
                </svg>
                {cropPolygon.map((point, index) => (
                  <button
                    key={`handle-${index}`}
                    ref={(element) => {
                      handlesRef.current[index] = element;
                    }}
                    type="button"
                    onPointerDown={(event) => handleHandlePointerDown(event, index)}
                    onPointerMove={handleHandlePointerMove}
                    onPointerUp={handleHandlePointerUp}
                    onPointerCancel={handleHandlePointerCancel}
                    className={cn(
                      "absolute z-10 flex min-h-11 min-w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full pointer-events-auto touch-none",
                      "focus:outline-none focus:ring-2 focus:ring-[var(--sb-accent)] focus:ring-offset-2 focus:ring-offset-[var(--sb-card)]",
                      activeHandle === index
                        ? "cursor-grabbing"
                        : "cursor-grab"
                    )}
                    style={{
                      left: `${point.u * cropAreaSize.width}px`,
                      top: `${point.v * cropAreaSize.height}px`,
                    }}
                  >
                    <span
                      className={cn(
                        "block h-4 w-4 rounded-full border-2 border-[var(--sb-accent)] bg-[var(--sb-card)] shadow-lg transition-transform",
                        activeHandle === index && "scale-110 bg-[rgba(196,92,38,0.3)]"
                      )}
                    />
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
          <div className="space-y-1">
            <div className="sb-amount text-xs text-[var(--sb-slate)]">
              Selection: {selectionSize.displayWidth} × {selectionSize.displayHeight}px
              <span className="text-[var(--sb-slate)]/70">
                {" "}
                ({selectionSize.sourceWidth} × {selectionSize.sourceHeight}px source)
              </span>
            </div>
            {applyError && (
              <p className="text-xs font-medium text-destructive">{applyError}</p>
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

