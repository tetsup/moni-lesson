import type { FurnitureFacing, FurniturePlacement, RoomState } from './room-types';

export type RoomPosition = Pick<FurniturePlacement, 'x' | 'y' | 'z'>;

const updateFurniture = (
  state: RoomState,
  placementId: string,
  update: (placement: FurniturePlacement) => FurniturePlacement,
): RoomState => {
  let found = false;
  const furniture = state.furniture.map((placement) => {
    if (placement.placementId !== placementId) return placement;
    found = true;
    return update(placement);
  });

  return found ? { ...state, furniture } : state;
};

/** Adds a placement. Placement IDs must be unique within the room. */
export const placeFurniture = (
  state: RoomState,
  placement: FurniturePlacement,
): RoomState => {
  if (state.furniture.some((item) => item.placementId === placement.placementId)) {
    return state;
  }
  return { ...state, furniture: [...state.furniture, { ...placement }] };
};

/** Changes coordinates without applying bounds or overlap checks. */
export const moveFurniture = (
  state: RoomState,
  placementId: string,
  position: RoomPosition,
): RoomState =>
  updateFurniture(state, placementId, (placement) => ({ ...placement, ...position }));

export const rotateFurniture = (
  state: RoomState,
  placementId: string,
): RoomState =>
  updateFurniture(state, placementId, (placement) => ({
    ...placement,
    facing: placement.facing === 'front-left' ? 'front-right' : 'front-left',
  }));

export const setFurnitureFacing = (
  state: RoomState,
  placementId: string,
  facing: FurnitureFacing,
): RoomState =>
  updateFurniture(state, placementId, (placement) => ({ ...placement, facing }));

export const setFurnitureHeight = (
  state: RoomState,
  placementId: string,
  z: number,
): RoomState =>
  updateFurniture(state, placementId, (placement) => ({ ...placement, z }));

/** Removes a placement from the room; inventory ownership is managed elsewhere. */
export const removeFurniture = (
  state: RoomState,
  placementId: string,
): RoomState => {
  const furniture = state.furniture.filter((item) => item.placementId !== placementId);
  return furniture.length === state.furniture.length ? state : { ...state, furniture };
};

export const changeRoomSkin = (state: RoomState, skinId: string): RoomState =>
  state.skinId === skinId ? state : { ...state, skinId };
