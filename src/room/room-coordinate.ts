import type { FurnitureDefinition, FurniturePlacement } from './room-types';

export type ScreenPoint = {
  x: number;
  y: number;
};

export type IsometricProjection = {
  /** Screen-space position of logical room origin (0, 0, 0). */
  origin: ScreenPoint;
  /** Horizontal pixel distance between the projected floor-axis directions for one logical unit. */
  unitWidth: number;
  /** Vertical pixel component of either projected floor-axis direction for one logical unit. */
  unitDepth: number;
  /** Vertical pixels per logical unit of height. */
  unitHeight: number;
};

/**
 * Projects room coordinates into screen coordinates.
 * +X projects right and down; +Y projects left and down; +Z projects upward.
 */
export const projectRoomPosition = (
  position: Pick<FurniturePlacement, 'x' | 'y' | 'z'>,
  projection: IsometricProjection,
): ScreenPoint => ({
  x: projection.origin.x + (position.x - position.y) * projection.unitWidth / 2,
  y: projection.origin.y + (position.x + position.y) * projection.unitDepth / 2
    - position.z * projection.unitHeight,
});

/**
 * Returns the image's top-left screen coordinate when its pixel-space anchor
 * is aligned with the projected logical placement position.
 */
export const getFurnitureImagePosition = (
  placement: FurniturePlacement,
  definition: Pick<FurnitureDefinition, 'image'>,
  projection: IsometricProjection,
): ScreenPoint => {
  const anchorPosition = projectRoomPosition(placement, projection);
  return {
    x: anchorPosition.x - definition.image.anchor.x,
    y: anchorPosition.y - definition.image.anchor.y,
  };
};
