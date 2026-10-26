import type { CSSProperties } from 'react';
import { getFurnitureDrawOrder } from './room-draw-order';
import { getFurnitureImagePosition, type IsometricProjection } from './room-coordinate';
import type {
  FurnitureDefinition,
  FurniturePlacement,
  RoomSkinDefinition,
} from './room-types';

export type RoomRendererProps = {
  skin: RoomSkinDefinition;
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
 * Renders one room-skin image and every known furniture placement.
 *
 * The projection origin is expressed in display pixels relative to this
 * component's top-left corner. Image URLs and their pixel anchors are supplied
 * by the caller/catalog; no asset-specific values are embedded in the renderer.
 */
export const RoomRenderer = ({
  skin,
  furniture,
  definitions,
  projection,
  width,
  height,
  scale = 1,
  className,
}: RoomRendererProps) => {
  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
  const orderedFurniture = getFurnitureDrawOrder(
    { skinId: skin.id, furniture: [...furniture] },
    definitions,
  );

  const backgroundStyle: CSSProperties = {
    position: 'absolute',
    left: projection.origin.x - skin.anchor.x * scale,
    top: projection.origin.y - skin.anchor.y * scale,
    width: 1792 * scale,
    height: 1344 * scale,
    maxWidth: 'none',
    pointerEvents: 'none',
    userSelect: 'none',
  };

  return (
    <div
      className={className}
      data-testid="room-renderer"
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
      }}
    >
      <img
        src={skin.backgroundImage}
        alt=""
        aria-hidden="true"
        draggable={false}
        data-testid="room-background"
        style={backgroundStyle}
      />
      {orderedFurniture.map((placement) => {
        const definition = definitionById.get(placement.furnitureId);
        if (!definition) return null;

        const position = getFurnitureImagePosition(placement, definition, projection);
        return (
          <img
            key={placement.placementId}
            src={definition.image.src}
            alt=""
            aria-hidden="true"
            draggable={false}
            data-placement-id={placement.placementId}
            data-furniture-id={placement.furnitureId}
            data-facing={placement.facing}
            style={{
              position: 'absolute',
              left: position.x + definition.image.anchor.x * (1 - scale),
              top: position.y + definition.image.anchor.y * (1 - scale),
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              maxWidth: 'none',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        );
      })}
    </div>
  );
};
