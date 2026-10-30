import type { CSSProperties } from 'react';

export type ImageRenderItem = {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ImageLayerRendererProps = {
  items: readonly ImageRenderItem[];
  width: number;
  height: number;
  className?: string;
};

/**
 * Draws already-positioned images in array order.
 * Coordinate conversion and draw-order decisions belong to the caller.
 */
export const ImageLayerRenderer = ({
  items,
  width,
  height,
  className,
}: ImageLayerRendererProps) => (
  <div
    className={className}
    data-testid="image-layer-renderer"
    style={{
      position: 'relative',
      width,
      height,
      overflow: 'hidden',
    }}
  >
    {items.map((item, index) => {
      const imageStyle: CSSProperties = {
        position: 'absolute',
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        maxWidth: 'none',
        pointerEvents: 'none',
        userSelect: 'none',
      };

      return (
        <img
          key={`${item.src}-${index}`}
          src={item.src}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={imageStyle}
        />
      );
    })}
  </div>
);
