import type { ImageRenderItem } from '../components/ImageLayerRenderer';
import { getFurnitureImagePosition, type IsometricProjection } from './room-coordinate';
import { getFurnitureDrawOrder } from './room-draw-order';
import type {
  FurnitureDefinition,
  FurniturePlacement,
  RoomSkinDefinition,
} from './room-types';

export type ImageSize = {
  width: number;
  height: number;
};

export type RoomRenderItemsInput = {
  skin: RoomSkinDefinition;
  skinSize: ImageSize;
  furniture: readonly FurniturePlacement[];
  definitions: readonly FurnitureDefinition[];
  projection: IsometricProjection;
  scale?: number;
};

/**
 * Converts the room background and furniture into positioned images.
 * The background is first so it is painted behind all furniture.
 */
export const getRoomRenderItems = ({
  skin,
  skinSize,
  furniture,
  definitions,
  projection,
  scale = 1,
}: RoomRenderItemsInput): ImageRenderItem[] => {
  const items: ImageRenderItem[] = [{
    src: skin.backgroundImage,
    x: projection.origin.x - skin.anchor.x * scale,
    y: projection.origin.y - skin.anchor.y * scale,
    width: skinSize.width * scale,
    height: skinSize.height * scale,
  }];

  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
  const orderedFurniture = getFurnitureDrawOrder(
    { skinId: skin.id, furniture: [...furniture] },
    definitions,
  );

  for (const placement of orderedFurniture) {
    const definition = definitionById.get(placement.furnitureId);
    if (!definition) continue;

    const position = getFurnitureImagePosition(placement, definition, projection);
    items.push({
      src: definition.image.src,
      x: position.x - definition.image.anchor.x * (scale - 1),
      y: position.y - definition.image.anchor.y * (scale - 1),
      width: definition.image.width * scale,
      height: definition.image.height * scale,
    });
  }

  return items;
};
