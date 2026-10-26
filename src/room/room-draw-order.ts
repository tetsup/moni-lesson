import type { FurnitureDefinition, FurniturePlacement, RoomState } from './room-types';

/**
 * Returns placements in back-to-front paint order.
 * Wall-mounted items are behind floor coverings, which are behind solid furniture.
 * Solid furniture is sorted by depth (smaller y first). Equal-depth items retain
 * their original order, so the output is deterministic for a given state.
 *
 * No overlap, bounds, or collision checks are performed.
 */
export const getFurnitureDrawOrder = (
  state: RoomState,
  definitions: readonly FurnitureDefinition[],
): FurniturePlacement[] => {
  const typeById = new Map(definitions.map((definition) => [definition.id, definition.type]));
  const layer = (placement: FurniturePlacement): number => {
    const type = typeById.get(placement.furnitureId);
    if (type === 'wall-mounted') return 0;
    if (type === 'floor-covering') return 1;
    return 2;
  };

  return state.furniture
    .map((placement, index) => ({ placement, index, layer: layer(placement) }))
    .sort((a, b) =>
      a.layer - b.layer
      || (a.layer === 2 ? a.placement.y - b.placement.y : 0)
      || a.index - b.index,
    )
    .map(({ placement }) => placement);
};
