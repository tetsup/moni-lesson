export type FurnitureFacing = 'front-left' | 'front-right';

export type FurnitureType = 'solid' | 'floor-covering' | 'wall-mounted';

export type FurnitureDefinition = {
  id: string;
  name: string;
  type: FurnitureType;
  image: string;
};

export type FurniturePlacement = {
  placementId: string;
  furnitureId: string;
  /** Horizontal position in the room's logical coordinate system. */
  x: number;
  /** Depth position; larger values are closer to the viewer. */
  y: number;
  /** Height above the floor. Floor coverings and wall-mounted items have no thickness. */
  z: number;
  facing: FurnitureFacing;
};

export type RoomSkinDefinition = {
  id: string;
  name: string;
  backgroundImage: string;
  layoutId: string;
};

export type RoomState = {
  skinId: string;
  furniture: FurniturePlacement[];
};

export const createInitialRoomState = (skinId: string): RoomState => ({
  skinId,
  furniture: [],
});
