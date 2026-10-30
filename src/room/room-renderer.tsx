import { ImageLayerRenderer } from '../components/ImageLayerRenderer';
import { getRoomRenderItems, type ImageSize } from './room-render-items';
import type { IsometricProjection } from './room-coordinate';
import type {
  FurnitureDefinition,
  FurniturePlacement,
  RoomSkinDefinition,
} from './room-types';

export type RoomRendererProps = {
  skin: RoomSkinDefinition;
  skinSize: ImageSize;
  furniture: readonly FurniturePlacement[];
  definitions: readonly FurnitureDefinition[];
  projection: IsometricProjection;
  width: number;
  height: number;
  /** Uniform display scale applied to source images and their pixel anchors. */
  scale?: number;
  className?: string;
};

/**
 * Converts room-specific placement data to shared image render items.
 * The shared renderer only paints the already-positioned images in array order.
 */
export const RoomRenderer = ({
  skin,
  skinSize,
  furniture,
  definitions,
  projection,
  width,
  height,
  scale = 1,
  className,
}: RoomRendererProps) => {
  const items = getRoomRenderItems({
    skin,
    skinSize,
    furniture,
    definitions,
    projection,
    scale,
  });

  return (
    <ImageLayerRenderer
      items={items}
      width={width}
      height={height}
      className={className}
    />
  );
};
