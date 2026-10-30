import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent, ReactNode, WheelEvent } from 'react';

export type ViewportPoint = { x: number; y: number };
export type ViewportSize = { width: number; height: number };
export type ImageViewportTransform = {
  width: number;
  height: number;
  zoom: number;
  scale: number;
  baseScale: number;
  pan: ViewportPoint;
  centeredOffset: ViewportPoint;
  zoomAt: (zoom: number, focus?: ViewportPoint) => void;
  resetView: () => void;
};

type PointerPoint = ViewportPoint & { pointerId: number };
type Gesture = {
  pointers: PointerPoint[];
  zoom: number;
  pan: ViewportPoint;
  distance: number;
  midpoint: ViewportPoint;
};

export type ImageViewportProps = {
  contentWidth: number;
  contentHeight: number;
  anchor?: ViewportPoint;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  height?: CSSProperties['height'];
  minHeight?: CSSProperties['minHeight'];
  className?: string;
  ariaLabel?: string;
  backgroundColor?: string;
  children: (transform: ImageViewportTransform) => ReactNode;
  onPanRequest?: (nextPan: ViewportPoint, applyDefault: () => void) => void;
  onZoomRequest?: (nextZoom: number, focus: ViewportPoint, applyDefault: () => void) => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const distanceBetween = (a: ViewportPoint, b: ViewportPoint) => Math.hypot(b.x - a.x, b.y - a.y);
const midpointOf = (a: ViewportPoint, b: ViewportPoint): ViewportPoint => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

/** Shared fit-to-view, pan, wheel zoom, and pinch zoom behavior for image canvases. */
export default function ImageViewport({
  contentWidth,
  contentHeight,
  anchor = { x: contentWidth / 2, y: contentHeight / 2 },
  minZoom = 0.5,
  maxZoom = 3,
  zoomStep = 1.2,
  height = 'min(65vh, 560px)',
  minHeight = 320,
  className,
  ariaLabel = 'ホイールまたはピンチで拡大縮小、ドラッグで移動できます',
  backgroundColor = '#faf8fb',
  children,
  onPanRequest,
  onZoomRequest,
}: ImageViewportProps) {
  const [size, setSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<ViewportPoint>({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef<PointerPoint[]>([]);
  const gestureRef = useRef<Gesture | null>(null);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const baseScale = size.width > 0 && size.height > 0 && contentWidth > 0 && contentHeight > 0
    ? Math.min(size.width / contentWidth, size.height / contentHeight)
    : 1;
  const scale = baseScale * zoom;
  const centeredOffset = {
    x: (size.width - contentWidth * baseScale) / 2,
    y: (size.height - contentHeight * baseScale) / 2,
  };

  const getLocalPoint = (clientX: number, clientY: number): ViewportPoint => {
    const rect = viewportRef.current?.getBoundingClientRect();
    return rect ? { x: clientX - rect.left, y: clientY - rect.top } : { x: 0, y: 0 };
  };

  const applyZoom = (nextZoom: number, focus: ViewportPoint) => {
    const next = clamp(nextZoom, minZoom, maxZoom);
    const ratio = next / zoom;
    setPan((current) => ({
      x: focus.x - (focus.x - centeredOffset.x - current.x - anchor.x * baseScale * zoom) * ratio
        - centeredOffset.x - anchor.x * baseScale * next,
      y: focus.y - (focus.y - centeredOffset.y - current.y - anchor.y * baseScale * zoom) * ratio
        - centeredOffset.y - anchor.y * baseScale * next,
    }));
    setZoom(next);
  };

  const zoomAt = (nextZoom: number, focus = { x: size.width / 2, y: size.height / 2 }) => {
    const applyDefault = () => applyZoom(nextZoom, focus);
    if (onZoomRequest) onZoomRequest(nextZoom, focus, applyDefault);
    else applyDefault();
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    pointersRef.current = [];
    gestureRef.current = null;
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    zoomAt(zoom * (event.deltaY < 0 ? zoomStep : 1 / zoomStep), getLocalPoint(event.clientX, event.clientY));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = { pointerId: event.pointerId, ...getLocalPoint(event.clientX, event.clientY) };
    const pointers = [...pointersRef.current.filter((item) => item.pointerId !== event.pointerId), point];
    pointersRef.current = pointers;
    gestureRef.current = {
      pointers,
      zoom,
      pan,
      distance: pointers.length >= 2 ? distanceBetween(pointers[0], pointers[1]) : 0,
      midpoint: pointers.length >= 2 ? midpointOf(pointers[0], pointers[1]) : point,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = pointersRef.current;
    if (!current.some((item) => item.pointerId === event.pointerId)) return;
    const point = { pointerId: event.pointerId, ...getLocalPoint(event.clientX, event.clientY) };
    const pointers = current.map((item) => item.pointerId === event.pointerId ? point : item);
    pointersRef.current = pointers;
    const gesture = gestureRef.current;
    if (!gesture) return;

    if (pointers.length >= 2 && gesture.pointers.length >= 2 && gesture.distance > 0) {
      const midpoint = midpointOf(pointers[0], pointers[1]);
      const nextZoom = clamp(gesture.zoom * distanceBetween(pointers[0], pointers[1]) / gesture.distance, minZoom, maxZoom);
      const ratio = nextZoom / gesture.zoom;
      setZoom(nextZoom);
      setPan({
        x: midpoint.x - (gesture.midpoint.x - centeredOffset.x - gesture.pan.x - anchor.x * baseScale * gesture.zoom) * ratio
          - centeredOffset.x - anchor.x * baseScale * nextZoom,
        y: midpoint.y - (gesture.midpoint.y - centeredOffset.y - gesture.pan.y - anchor.y * baseScale * gesture.zoom) * ratio
          - centeredOffset.y - anchor.y * baseScale * nextZoom,
      });
    } else if (pointers.length === 1 && gesture.pointers.length === 1) {
      const nextPan = {
        x: gesture.pan.x + point.x - gesture.pointers[0].x,
        y: gesture.pan.y + point.y - gesture.pointers[0].y,
      };
      const applyDefault = () => setPan(nextPan);
      if (onPanRequest) onPanRequest(nextPan, applyDefault);
      else applyDefault();
    }
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    pointersRef.current = pointersRef.current.filter((item) => item.pointerId !== event.pointerId);
    const remaining = pointersRef.current;
    gestureRef.current = remaining.length ? {
      pointers: remaining,
      zoom,
      pan,
      distance: remaining.length >= 2 ? distanceBetween(remaining[0], remaining[1]) : 0,
      midpoint: remaining.length >= 2 ? midpointOf(remaining[0], remaining[1]) : remaining[0],
    } : null;
  };

  return (
    <div
      ref={viewportRef}
      className={className}
      role="application"
      aria-label={ariaLabel}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        width: '100%',
        height,
        minHeight,
        overflow: 'hidden',
        position: 'relative',
        touchAction: 'none',
        cursor: pointersRef.current.length ? 'grabbing' : 'grab',
        borderRadius: 4,
        backgroundColor,
        userSelect: 'none',
      }}
    >
      {children({
        width: size.width,
        height: size.height,
        zoom,
        scale,
        baseScale,
        pan,
        centeredOffset,
        zoomAt,
        resetView,
      })}
    </div>
  );
}
